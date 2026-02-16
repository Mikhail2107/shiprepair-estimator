import React, { useEffect, useRef, useState } from 'react';
import { fabric } from 'fabric';
import { Slider, Space, Tooltip, Button, message } from 'antd';
import { ZoomInOutlined, ZoomOutOutlined, ReloadOutlined, UserOutlined } from '@ant-design/icons';

interface ImageCanvasProps {
  imageUrl: string;
  onCalibrate?: (pxPerMm: number) => void;
}

const ImageCanvas: React.FC<ImageCanvasProps> = ({ imageUrl, onCalibrate }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  const [zoom, setZoom] = useState(1);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationPoints, setCalibrationPoints] = useState<fabric.Line[]>([]);

  useEffect(() => {
    if (canvasRef.current) {
      // Инициализация Fabric canvas
      const fabricCanvas = new fabric.Canvas(canvasRef.current, {
        width: 800,
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

  // Функция для калибровки по линейке
  const startCalibration = () => {
    if (!canvas) return;
    
    setIsCalibrating(true);
    message.info('Нажмите на начало и конец линейки (10 см)');
    
    // Очищаем предыдущие точки калибровки
    calibrationPoints.forEach(point => canvas.remove(point));
    setCalibrationPoints([]);
    
    let points: { x: number; y: number }[] = [];
    
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
        fill: 'red',
        stroke: 'white',
        strokeWidth: 2,
        selectable: false,
        evented: false,
      });
      
      canvas.add(circle);
      points.push({ x, y });
      
      // Если выбраны две точки - рисуем линию и вычисляем масштаб
      if (points.length === 2) {
        const line = new fabric.Line([points[0].x, points[0].y, points[1].x, points[1].y], {
          stroke: 'green',
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
        const pxPerMm = distance / 100;
        
        // Добавляем текст с результатом
        const text = new fabric.Text(`Масштаб: ${pxPerMm.toFixed(2)} px/мм`, {
          left: points[1].x + 10,
          top: points[1].y - 30,
          fontSize: 14,
          fill: 'green',
          backgroundColor: 'white',
          selectable: false,
          evented: false,
        });
        
        canvas.add(text);
        
        setCalibrationPoints([...calibrationPoints, line, text as never]);
        
        // Вызываем callback с результатом
        if (onCalibrate) {
          onCalibrate(pxPerMm);
        }
        
        message.success(`Калибровка выполнена: ${pxPerMm.toFixed(2)} px/мм`);
        
        // Завершаем режим калибровки
        setIsCalibrating(false);
        points = [];
        
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

  return (
    <div className="space-y-4">
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
                // type="primary"
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
              // type="primary"
              icon={<UserOutlined />}
              onClick={startCalibration}
            >
              Калибровка по линейке
            </Button>
          )}
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
      
      {/* Инструкция по калибровке */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-800 mb-2">Как калибровать:</h4>
        <ol className="text-sm text-blue-700 list-decimal list-inside space-y-1">
          <li>Нажмите кнопку "Калибровка по линейке"</li>
          <li>Кликните на начало линейки (0 см)</li>
          <li>Кликните на конец линейки (10 см)</li>
          <li>Система автоматически рассчитает масштаб</li>
        </ol>
      </div>
    </div>
  );
};

export default ImageCanvas;