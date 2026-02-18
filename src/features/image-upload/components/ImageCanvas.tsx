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
  onMeasurementsChange?: (measurements: fabric.Object[]) => void; // ✅ Добавляем проп
}

const ImageCanvas: React.FC<ImageCanvasProps> = ({ 
  imageUrl, 
  onCalibrate, 
  onSave,
  onMeasurementsChange  // ✅ Получаем проп из родителя
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  const [zoom, setZoom] = useState(1);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const isCalibratingRef = useRef(false);
  const [calibrationPoints, setCalibrationPoints] = useState<fabric.Object[]>([]);
  const [pxPerMm, setPxPerMm] = useState<number | null>(null);
  const [showCalibrationHelp, setShowCalibrationHelp] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  
  // Используем refs для хранения данных
  const calibrationPointsRef = useRef<{ x: number; y: number }[]>([]);
  const calibrationHandlerRef = useRef<((opt: fabric.IEvent) => void) | null>(null);

  useEffect(() => {
    console.log('🖼️ ImageCanvas: инициализация с imageUrl:', imageUrl.substring(0, 50) + '...');
    
    if (!canvasRef.current) {
      console.error('❌ canvasRef.current is null');
      return;
    }

    const fabricCanvas = new fabric.Canvas(canvasRef.current, {
      width: 900,
      height: 600,
      backgroundColor: '#f5f5f5',
    });
    
    console.log('✅ fabricCanvas создан');
    setCanvas(fabricCanvas);
    setIsImageLoaded(false);

    console.log('🔄 Загрузка изображения...');
    fabric.Image.fromURL(
      imageUrl, 
      (img) => {
        console.log('✅ Изображение загружено успешно');
        
        if (!fabricCanvas) {
          console.error('❌ fabricCanvas не существует в момент загрузки');
          return;
        }
        
        console.log('📐 Размеры изображения:', img.width, 'x', img.height);
        console.log('📐 Размеры canvas:', fabricCanvas.width, 'x', fabricCanvas.height);
        
        const scale = Math.min(
          (fabricCanvas.width! - 40) / img.width!,
          (fabricCanvas.height! - 40) / img.height!,
          1
        );
        
        console.log('📏 Масштаб изображения:', scale.toFixed(2));
        
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
        
        console.log('✅ Изображение отрисовано на canvas');
        
        setIsImageLoaded(true);
        setShowCalibrationHelp(true);
      },
      { 
        crossOrigin: 'anonymous',
      }
    );

    return () => {
      console.log('🧹 Очистка canvas');
      fabricCanvas.dispose();
    };
  }, [imageUrl]);

  // Эффект для рендера при изменении zoom
  useEffect(() => {
    if (canvas && isImageLoaded) {
      console.log('🔄 Рендер с zoom:', zoom);
      canvas.renderAll();
    }
  }, [zoom, canvas, isImageLoaded]);

  const handleZoomIn = () => {
    if (canvas) {
      const newZoom = zoom * 1.2;
      console.log('🔍 Zoom in:', newZoom);
      canvas.setZoom(newZoom);
      setZoom(newZoom);
      canvas.renderAll();
    }
  };

  const handleZoomOut = () => {
    if (canvas) {
      const newZoom = zoom * 0.8;
      console.log('🔍 Zoom out:', newZoom);
      canvas.setZoom(newZoom);
      setZoom(newZoom);
      canvas.renderAll();
    }
  };

  const handleReset = () => {
    if (canvas) {
      console.log('🔄 Сброс zoom');
      canvas.setZoom(1);
      setZoom(1);
      canvas.renderAll();
    }
  };

  // Калибровка по линейке
  const startCalibration = () => {
    console.log('🎯 startCalibration вызвана');
    
    if (!canvas) {
      console.error('❌ canvas не существует');
      message.error('Холст не инициализирован');
      return;
    }
    
    if (!isImageLoaded) {
      console.error('❌ изображение не загружено');
      message.error('Изображение еще не загружено');
      return;
    }
    
    console.log('🎯 Начинаем калибровку');
    setIsCalibrating(true);
    isCalibratingRef.current = true;
    
    calibrationPointsRef.current = [];
    
    message.info('Нажмите на начало и конец линейки (10 см)');
    
    // Очищаем предыдущие точки калибровки
    calibrationPoints.forEach(point => canvas.remove(point));
    setCalibrationPoints([]);
    
    const handleMouseDown = (opt: fabric.IEvent) => {
      console.log('🖱️ Клик в режиме калибровки');
      console.log('  isCalibratingRef.current:', isCalibratingRef.current);
      console.log('  canvas exists:', !!canvas);
      
      if (!isCalibratingRef.current || !canvas) {
        console.log('  ⚠️ Игнорируем клик - не в режиме калибровки или нет canvas');
        return;
      }
      
      const pointer = canvas.getPointer(opt.e);
      const point = { x: pointer.x, y: pointer.y };
      
      console.log(`  📍 Точка ${calibrationPointsRef.current.length + 1}: (${point.x.toFixed(1)}, ${point.y.toFixed(1)})`);
      
      // Добавляем точку в ref
      calibrationPointsRef.current = [...calibrationPointsRef.current, point];
      
      // Рисуем точку
      const circle = new fabric.Circle({
        left: point.x - 5,
        top: point.y - 5,
        radius: 5,
        fill: '#2563eb',
        stroke: 'white',
        strokeWidth: 2,
        selectable: false,
        evented: false,
      });
      
      canvas.add(circle);
      setCalibrationPoints(prev => [...prev, circle]);
      canvas.renderAll();
      
      // Если выбраны две точки - завершаем калибровку
      if (calibrationPointsRef.current.length === 2) {
        console.log('✅ Получены две точки, завершаем калибровку');
        
        const points = calibrationPointsRef.current;
        
        // Рисуем линию между точками
        const line = new fabric.Line([points[0].x, points[0].y, points[1].x, points[1].y], {
          stroke: '#16a34a',
          strokeWidth: 3,
          strokeDashArray: [5, 5],
          selectable: false,
          evented: false,
        });
        
        canvas.add(line);
        
        // Вычисляем расстояние
        const distance = Math.sqrt(
          Math.pow(points[1].x - points[0].x, 2) + 
          Math.pow(points[1].y - points[0].y, 2)
        );
        
        console.log(`📏 Расстояние между точками: ${distance.toFixed(1)} px`);
        
        // Предполагаем, что линейка 10 см = 100 мм
        const calculatedPxPerMm = distance / 100;
        console.log(`📏 Масштаб: ${calculatedPxPerMm.toFixed(2)} px/мм`);
        
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
        setCalibrationPoints(prev => [...prev, line, text]);
        canvas.renderAll();
        
        // Вызываем callback
        console.log('📞 Вызываем onCalibrate');
        onCalibrate?.(calculatedPxPerMm);
        
        message.success(`Калибровка выполнена: ${calculatedPxPerMm.toFixed(2)} px/мм`);
        
        // Завершаем режим калибровки
        setIsCalibrating(false);
        isCalibratingRef.current = false;
        
        // Удаляем обработчик
        if (calibrationHandlerRef.current) {
          console.log('🧹 Удаляем обработчик');
          canvas.off('mouse:down', calibrationHandlerRef.current);
          calibrationHandlerRef.current = null;
        }
      }
    };
    
    // Сохраняем в ref и привязываем обработчик
    console.log('🔗 Привязываем обработчик mouse:down');
    calibrationHandlerRef.current = handleMouseDown;
    canvas.on('mouse:down', handleMouseDown);
  };

  const cancelCalibration = () => {
    console.log('❌ Отмена калибровки');
    
    if (!canvas) return;
    
    setIsCalibrating(false);
    isCalibratingRef.current = false;
    calibrationPointsRef.current = [];
    
    // Удаляем все точки калибровки
    calibrationPoints.forEach(point => canvas.remove(point));
    setCalibrationPoints([]);
    canvas.renderAll();
    
    // Удаляем обработчик используя ref
    if (calibrationHandlerRef.current) {
      console.log('🧹 Удаляем обработчик');
      canvas.off('mouse:down', calibrationHandlerRef.current);
      calibrationHandlerRef.current = null;
    }
    
    message.info('Калибровка отменена');
  };

  const handleSave = () => {
    console.log('💾 Сохранение измерений');
    if (onSave) {
      onSave();
    } else {
      message.success('Измерения сохранены');
    }
  };

  // Обработчик изменений измерений
  const handleMeasurementsChange = (measurements: fabric.Object[]) => {
    console.log('📊 Измерения обновлены:', measurements.length);
    // Передаем изменения наверх, если есть callback
    if (onMeasurementsChange) {
      onMeasurementsChange(measurements);
    }
  };

  return (
    <div className="space-y-4">
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

      <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50 relative">
        <canvas ref={canvasRef} />
        {!isImageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75">
            <div className="text-gray-500">Загрузка изображения...</div>
          </div>
        )}
        {isCalibrating && (
          <div className="absolute top-2 left-2 bg-blue-500 text-white px-3 py-1 rounded-full text-sm">
            ⚡ Режим калибровки
          </div>
        )}
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
                Кликните на начало и конец линейки
              </span>
            </>
          ) : (
            <Button
              type={pxPerMm ? 'default' : 'primary'}
              icon={<UserOutlined />}
              onClick={startCalibration}
              disabled={!isImageLoaded}
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

      {/* Инструменты измерения появляются после калибровки */}
      {pxPerMm && canvas && isImageLoaded && (
        <MeasurementTools
          canvas={canvas}
          pxPerMm={pxPerMm}
          onMeasurementsChange={handleMeasurementsChange} // ✅ Передаем наш обработчик
        />
      )}
    </div>
  );
};

export default ImageCanvas;