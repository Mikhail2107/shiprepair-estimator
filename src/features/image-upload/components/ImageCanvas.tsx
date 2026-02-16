// src/features/image-upload/components/ImageCanvas.tsx
import React, { useEffect, useRef, useState } from 'react';
import { fabric } from 'fabric';
import { Slider, Space, Tooltip, Button, message, Modal } from 'antd';
import { 
  ZoomInOutlined, 
  ZoomOutOutlined, 
  ReloadOutlined, 
  UserOutlined,
  SaveOutlined 
} from '@ant-design/icons';
import MeasurementTools from './MeasurementTools';

interface ImageCanvasProps {
  imageUrl: string;
  onCalibrate?: (pxPerMm: number) => void;
  onSave?: () => void;
}

const ImageCanvas: React.FC<ImageCanvasProps> = ({ imageUrl, onCalibrate, onSave }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  const [zoom, setZoom] = useState(1);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationPoints, setCalibrationPoints] = useState<fabric.Object[]>([]);
  const [pxPerMm, setPxPerMm] = useState<number | null>(null);
  const [showCalibrationHelp, setShowCalibrationHelp] = useState(false);

  useEffect(() => {
    if (canvasRef.current) {
      // Инициализация Fabric canvas
      const fabricCanvas = new fabric.Canvas(canvasRef.current, {
        width: 900,
        height: 600,
        backgroundColor: '#f5f5f5',
      });
      
      setCanvas(fabricCanvas);

      // Загрузка изображения
      fabric.Image.fromURL(imageUrl, (img) => {
        // Масштабируем изображение под размер canvas
        const scale = Math.min(
          (fabricCanvas.width! - 40) / img.width!,
          (fabricCanvas.height! - 40) / img.height!,
          1
        );
        
        img.scale(scale);
        img.set({
          left: (fabricCanvas.width! - img.width! * scale) / 2,
          top: (fabricCanvas.height! - img.height! * scale) / 2,
          hasControls: false,
          hasBorders: false,
          selectable: false,
          evented: false,
        });
        
        fabricCanvas.add(img);
        fabricCanvas.sendToBack(img);
        fabricCanvas.renderAll();

        // Показываем подсказку по калибровке
        setShowCalibrationHelp(true);
      });

      return () => {
        fabricCanvas.dispose();
      };
    }
  }, [imageUrl]);

  const handleZoomIn = () => {
    if (canvas) {
      const newZoom = zoom * 1.2;
      canvas.setZoom(newZoom);
      setZoom(newZoom);
      canvas.renderAll();
    }
  };

  const handleZoomOut = () => {
    if (canvas) {
      const newZoom = zoom * 0.8;
      canvas.setZoom(newZoom);
      setZoom(newZoom);
      canvas.renderAll();
    }
  };

  const handleReset = () => {
    if (canvas) {
      canvas.setZoom(1);
      setZoom(1);
      canvas.renderAll();
    }
  };

  // Калибровка по линейке
  const startCalibration = () => {
    if (!canvas) return;
    
    setIsCalibrating(true);
    message.info('Нажмите на начало и конец линейки (10 см)');
    
    // Очищаем предыдущие точки калибровки
    calibrationPoints.forEach(point => canvas.remove(point));
    setCalibrationPoints([]);
    
    const points: { x: number; y: number }[] = [];
    
    const handleMouseDown = (opt: fabric.IEvent) => {
      if (!isCalibrating) return;
      
      const pointer = canvas.getPointer(opt.e);
      const x = pointer.x;
      const y = pointer.y;
      
      // Рисуем точку
      const circle = new fabric.Circle({
        left: x - 5,
        top: y - 5,
        radius: 5,
        fill: '#2563eb',
        stroke: 'white',
        strokeWidth: 2,
        selectable: false,
        evented: false,
      });
      
      canvas.add(circle);
      points.push({ x, y });
      setCalibrationPoints([...calibrationPoints, circle]);
      
      // Если выбраны две точки - рисуем линию и вычисляем масштаб
      if (points.length === 2) {
        const line = new fabric.Line([points[0].x, points[0].y, points[1].x, points[1].y], {
          stroke: '#16a34a',
          strokeWidth: 3,
          strokeDashArray: [5, 5],
          selectable: false,
          evented: false,
        });
        
        canvas.add(line);
        
        // Вычисляем расстояние в пикселях
        const distance = Math.sqrt(
          Math.pow(points[1].x - points[0].x, 2) + 
          Math.pow(points[1].y - points[0].y, 2)
        );
        
        // Предполагаем, что линейка 10 см = 100 мм
        const calculatedPxPerMm = distance / 100;
        setPxPerMm(calculatedPxPerMm);
        
        // Добавляем текст с результатом
        const text = new fabric.Text(`Масштаб: ${calculatedPxPerMm.toFixed(2)} px/мм`, {
          left: points[1].x + 10,
          top: points[1].y - 30,
          fontSize: 16,
          fill: '#16a34a',
          backgroundColor: 'white',
          padding: 4,
          selectable: false,
          evented: false,
        });
        
        canvas.add(text);
        setCalibrationPoints([...calibrationPoints, line, text]);
        
        // Вызываем callback с результатом
        if (onCalibrate) {
          onCalibrate(calculatedPxPerMm);
        }
        
        message.success(`Калибровка выполнена: ${calculatedPxPerMm.toFixed(2)} px/мм`);
        
        // Завершаем режим калибровки
        setIsCalibrating(false);
        
        // Удаляем временные обработчики
        canvas.off('mouse:down', handleMouseDown);
      }
    };
    
    canvas.on('mouse:down', handleMouseDown);
  };

  const cancelCalibration = () => {
    if (!canvas) return;
    
    setIsCalibrating(false);
    
    // Удаляем все точки калибровки
    calibrationPoints.forEach(point => canvas.remove(point));
    setCalibrationPoints([]);
    
    message.info('Калибровка отменена');
  };

  const handleSave = () => {
    if (onSave) {
      onSave();
    } else {
      message.success('Измерения сохранены');
    }
  };

  return (
    <div className="space-y-4">
      {/* Модальное окно с подсказкой */}
      <Modal
        title="Калибровка изображения"
        open={showCalibrationHelp}
        onOk={() => setShowCalibrationHelp(false)}
        onCancel={() => setShowCalibrationHelp(false)}
        okText="Понятно"
        cancelText="Закрыть"
      >
        <div className="space-y-3">
          <p>Для точных измерений необходимо откалибровать изображение:</p>
          <ol className="list-decimal list-inside space-y-2">
            <li>Нажмите кнопку <strong>"Калибровка по линейке"</strong></li>
            <li>Кликните на <strong>начало</strong> линейки (0 см)</li>
            <li>Кликните на <strong>конец</strong> линейки (10 см)</li>
            <li>Система автоматически рассчитает масштаб</li>
          </ol>
          <div className="bg-yellow-50 p-3 rounded mt-3">
            <p className="text-yellow-800 text-sm">
              ⚡ Важно: Используйте линейку длиной 10 см для наилучшей точности
            </p>
          </div>
        </div>
      </Modal>

      <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
        <canvas ref={canvasRef} />
      </div>

      <div className="flex items-center justify-between">
        <Space>
          <Tooltip title="Приблизить">
            <Button
              icon={<ZoomInOutlined />}
              onClick={handleZoomIn}
              disabled={zoom >= 3}
            />
          </Tooltip>
          <Tooltip title="Отдалить">
            <Button
              icon={<ZoomOutOutlined />}
              onClick={handleZoomOut}
              disabled={zoom <= 0.5}
            />
          </Tooltip>
          <Tooltip title="Сбросить масштаб">
            <Button
              icon={<ReloadOutlined />}
              onClick={handleReset}
            />
          </Tooltip>
          <span className="text-sm text-gray-500 ml-2">
            {Math.round(zoom * 100)}%
          </span>
        </Space>

        <Space>
          {isCalibrating ? (
            <>
              <Button
                type="primary"
                danger
                onClick={cancelCalibration}
              >
                Отменить калибровку
              </Button>
              <span className="text-blue-600">
                Выберите начало и конец линейки (10 см)
              </span>
            </>
          ) : (
            <Button
              type={pxPerMm ? 'default' : 'primary'}
              icon={<UserOutlined />}
              onClick={startCalibration}
            >
              {pxPerMm ? 'Перекалибровать' : 'Калибровка по линейке'}
            </Button>
          )}
          
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
            disabled={!pxPerMm}
          >
            Сохранить измерения
          </Button>
        </Space>
      </div>

      <div className="w-64">
        <Slider
          min={0.5}
          max={3}
          step={0.1}
          value={zoom}
          onChange={(value) => {
            if (canvas) {
              canvas.setZoom(value);
              setZoom(value);
              canvas.renderAll();
            }
          }}
        />
      </div>

      {/* Инструменты измерения (появляются после калибровки) */}
      {pxPerMm && canvas && (
        <MeasurementTools
          canvas={canvas}
          pxPerMm={pxPerMm}
          onMeasurementsChange={(measurements) => {
            console.log('Measurements updated:', measurements);
          }}
        />
      )}
    </div>
  );
};

export default ImageCanvas;