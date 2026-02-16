// src/features/image-upload/components/MeasurementTools.tsx
import React, { useState, useEffect } from 'react';
import { fabric } from 'fabric';
import { Card, Button, Space, Tooltip, Badge, message } from 'antd';
import {
  UserOutlined,
  BorderOutlined,
  BgColorsOutlined,
  DeleteOutlined,
  CheckOutlined,
  CloseOutlined,
  LineOutlined
} from '@ant-design/icons';
import { MeasurementService, MeasurementPoint } from '../../../services/measurement/MeasurementService';

interface MeasurementToolsProps {
  canvas: fabric.Canvas | null;
  pxPerMm: number;
  onMeasurementsChange?: (measurements: unknown[]) => void;
}

type ToolType = 'ruler' | 'rectangle' | 'polygon' | 'circle' | 'none';

const MeasurementTools: React.FC<MeasurementToolsProps> = ({
  canvas,
  pxPerMm,
  onMeasurementsChange
}) => {
  const [activeTool, setActiveTool] = useState<ToolType>('none');
  const [measurements, setMeasurements] = useState<fabric.Object[]>([]);
  const [tempPoints, setTempPoints] = useState<fabric.Circle[]>([]);
  const [tempLine, setTempLine] = useState<fabric.Line | null>(null);
  const [measurementMode, setMeasurementMode] = useState(false);

  // Цвета для разных типов измерений
  const toolColors = {
    ruler: '#2563eb', // синий
    rectangle: '#16a34a', // зеленый
    polygon: '#dc2626', // красный
    circle: '#9333ea' // фиолетовый
  };

  // Очистка обработчиков событий
  const cleanupRulerHandlers = () => {
    if (canvas && (canvas as any).__rulerMouseMoveHandler) {
      canvas.off('mouse:move', (canvas as any).__rulerMouseMoveHandler);
      delete (canvas as any).__rulerMouseMoveHandler;
    }
  };

// Инструмент "Многоугольник" (для сложных дефектов)
  const handlePolygonTool = (x: number, y: number) => {
    if (!canvas) return;

    const point = new fabric.Circle({
      left: x - 3,
      top: y - 3,
      radius: 3,
      fill: toolColors.polygon,
      stroke: 'white',
      strokeWidth: 1,
      selectable: false,
      evented: false,
      data: { type: 'polygon-point', tool: 'polygon' }
    });

    canvas.add(point);
    
    // Если есть предыдущая точка, рисуем линию
    if (tempPoints.length > 0) {
      const prevPoint = tempPoints[tempPoints.length - 1];
      const line = new fabric.Line([
        prevPoint.left! + 3, prevPoint.top! + 3,
        x, y
      ], {
        stroke: toolColors.polygon,
        strokeWidth: 2,
        strokeDashArray: [3, 3],
        selectable: false,
        evented: false,
        data: { type: 'temp-line', tool: 'polygon' }
      });
      canvas.add(line);
      setTempLine(line);
    }
    
    setTempPoints([...tempPoints, point]);
  };
  
  // Инструмент "Круг"
  const handleCircleTool = (x: number, y: number) => {
    if (!canvas) return;

    // Создаем круг с радиусом 50px по умолчанию
    const circle = new fabric.Circle({
      left: x - 50,
      top: y - 50,
      radius: 50,
      fill: 'transparent',
      stroke: toolColors.circle,
      strokeWidth: 2,
      strokeDashArray: [5, 5],
      selectable: true,
      hasControls: true,
      hasBorders: true,
      cornerColor: toolColors.circle,
      cornerSize: 8,
      data: { type: 'measurement', tool: 'circle' }
    });

    canvas.add(circle);

    // Вычисляем характеристики круга
    const diameterPx = 100; // 2 * radius
    const diameterMm = MeasurementService.pxToMm(diameterPx, pxPerMm);
    const areaPx = Math.PI * 50 * 50;
    const areaMm2 = areaPx / (pxPerMm * pxPerMm);

    // Добавляем информацию
    const text = new fabric.Text(
      `⌀ ${diameterMm.toFixed(0)} мм | S: ${areaMm2.toFixed(0)} мм²`,
      {
        left: x + 20,
        top: y - 30,
        fontSize: 12,
        fill: toolColors.circle,
        backgroundColor: 'white',
        padding: 4,
        selectable: true,
        data: { type: 'measurement-label', tool: 'circle' }
      }
    );

    canvas.add(text);
    setMeasurements([...measurements, circle, text]);

    if (onMeasurementsChange) {
      onMeasurementsChange([...measurements, circle, text]);
    }
    
    message.success(`Круг создан: диаметр ${diameterMm.toFixed(0)} мм, площадь ${areaMm2.toFixed(0)} мм²`);
  };

  // Инструмент "Прямоугольник"
  const handleRectangleTool = (x: number, y: number) => {
    if (!canvas) return;

    const rect = new fabric.Rect({
      left: x - 50,
      top: y - 30,
      width: 100,
      height: 60,
      fill: 'transparent',
      stroke: toolColors.rectangle,
      strokeWidth: 2,
      strokeDashArray: [5, 5],
      selectable: true,
      hasControls: true,
      hasBorders: true,
      cornerColor: toolColors.rectangle,
      cornerSize: 8,
      data: { type: 'measurement', tool: 'rectangle' }
    });

    canvas.add(rect);

    // Вычисляем размеры
    const widthInMm = MeasurementService.pxToMm(100, pxPerMm);
    const heightInMm = MeasurementService.pxToMm(60, pxPerMm);
    const areaMm2 = widthInMm * heightInMm;
    
    // Добавляем информацию
    const text = new fabric.Text(
      `${widthInMm.toFixed(0)}×${heightInMm.toFixed(0)} мм  |  S: ${areaMm2.toFixed(0)} мм²`,
      {
        left: x - 40,
        top: y - 40,
        fontSize: 12,
        fill: toolColors.rectangle,
        backgroundColor: 'white',
        padding: 4,
        selectable: true,
        data: { type: 'measurement-label', tool: 'rectangle' }
      }
    );

    canvas.add(text);
    setMeasurements([...measurements, rect, text]);

    if (onMeasurementsChange) {
      onMeasurementsChange([...measurements, rect, text]);
    }
    
    message.success(`Прямоугольник создан: ${widthInMm.toFixed(0)}×${heightInMm.toFixed(0)} мм`);
  };

  // Инструмент "Линейка" (исправленная версия)
  function handleRulerTool (x: number, y: number) {
    if (!canvas) return;

    if (tempPoints.length === 0) {
      // Первая точка - создаем и сохраняем
      const point = new fabric.Circle({
        left: x - 4,
        top: y - 4,
        radius: 4,
        fill: toolColors.ruler,
        stroke: 'white',
        strokeWidth: 2,
        selectable: false,
        evented: false,
        data: { type: 'point', tool: 'ruler' }
      });

      canvas.add(point);
      setTempPoints([point]);
      
      // Создаем временную линию, которая будет следовать за курсором
      const handleMouseMove = (moveOpt: fabric.IEvent) => {
        if (!canvas || tempPoints.length !== 1) return;
        
        const movePointer = canvas.getPointer(moveOpt.e);
        const startPoint = tempPoints[0];
        
        // Удаляем предыдущую временную линию
        if (tempLine) {
          canvas.remove(tempLine);
        }
        
        // Создаем новую временную линию
        const newTempLine = new fabric.Line([
          startPoint.left! + 4, startPoint.top! + 4,
          movePointer.x, movePointer.y
        ], {
          stroke: toolColors.ruler,
          strokeWidth: 2,
          strokeDashArray: [5, 5],
          selectable: false,
          evented: false,
          data: { type: 'temp-line', tool: 'ruler' }
        });
        
        canvas.add(newTempLine);
        setTempLine(newTempLine);
        canvas.renderAll();
      };
      
      canvas.on('mouse:move', handleMouseMove);
      
      // Сохраняем обработчик для последующего удаления
      (canvas as any).__rulerMouseMoveHandler = handleMouseMove;
      
    } else if (tempPoints.length === 1) {
      // Вторая точка - завершаем измерение
      const startPoint = tempPoints[0];
      
      // Удаляем обработчик движения мыши
      cleanupRulerHandlers();
      
      // Удаляем временную линию
      if (tempLine) {
        canvas.remove(tempLine);
        setTempLine(null);
      }
      
      // Создаем точку конца
      const endPoint = new fabric.Circle({
        left: x - 4,
        top: y - 4,
        radius: 4,
        fill: toolColors.ruler,
        stroke: 'white',
        strokeWidth: 2,
        selectable: false,
        evented: false,
        data: { type: 'point', tool: 'ruler' }
      });
      
      canvas.add(endPoint);

      // Вычисляем расстояние
      const distancePx = MeasurementService.calculateDistance(
        { x: startPoint.left! + 4, y: startPoint.top! + 4 },
        { x: endPoint.left! + 4, y: endPoint.top! + 4 }
      );
      const distanceMm = MeasurementService.pxToMm(distancePx, pxPerMm);

      // Создаем постоянную линию
      const finalLine = new fabric.Line([
        startPoint.left! + 4, startPoint.top! + 4,
        endPoint.left! + 4, endPoint.top! + 4
      ], {
        stroke: toolColors.ruler,
        strokeWidth: 3,
        selectable: true,
        hasControls: false,
        data: { 
          type: 'measurement', 
          tool: 'ruler',
          distancePx,
          distanceMm
        }
      });

      // Добавляем текст с расстоянием
      const midX = (startPoint.left! + endPoint.left!) / 2 + 8;
      const midY = (startPoint.top! + endPoint.top!) / 2 - 10;
      
      const text = new fabric.Text(`${distanceMm.toFixed(1)} мм`, {
        left: midX,
        top: midY,
        fontSize: 14,
        fill: toolColors.ruler,
        backgroundColor: 'white',
        padding: 4,
        selectable: true,
        data: { type: 'measurement-label', tool: 'ruler' }
      });

      canvas.add(finalLine);
      canvas.add(text);
      
      // Удаляем начальную и конечную точки
      canvas.remove(startPoint);
      canvas.remove(endPoint);
      
      setMeasurements([...measurements, finalLine, text]);
      setTempPoints([]);
      
      if (onMeasurementsChange) {
        onMeasurementsChange([...measurements, finalLine, text]);
      }
      
      message.success(`Расстояние: ${distanceMm.toFixed(1)} мм`);
    }
  };
  
  useEffect(() => {
    if (!canvas) return;

    // Обработчик кликов для измерения
    const handleMouseDown = (opt: fabric.IEvent) => {
      if (!measurementMode || activeTool === 'none') return;

      const pointer = canvas.getPointer(opt.e);
      const x = pointer.x;
      const y = pointer.y;

      switch (activeTool) {
        case 'ruler':
          handleRulerTool(x, y);
          break;
        case 'rectangle':
          handleRectangleTool(x, y);
          break;
        case 'polygon':
          handlePolygonTool(x, y);
          break;
        case 'circle':
          handleCircleTool(x, y);
          break;
      }
    };

    canvas.on('mouse:down', handleMouseDown);
    
    return () => {
      canvas.off('mouse:down', handleMouseDown);
      cleanupRulerHandlers();
    };
  }, [canvas, measurementMode, activeTool, tempPoints, tempLine]);

  


  

  // Завершение многоугольника
  const completePolygon = () => {
    if (!canvas || tempPoints.length < 3) {
      message.warning('Для создания контура нужно минимум 3 точки');
      return;
    }

    // Удаляем временные линии
    if (tempLine) {
      canvas.remove(tempLine);
    }

    const points = tempPoints.map(p => ({
      x: p.left! + 3,
      y: p.top! + 3
    }));

    // Замыкаем многоугольник (добавляем линию от последней точки к первой)
    const closingLine = new fabric.Line([
      points[points.length - 1].x, points[points.length - 1].y,
      points[0].x, points[0].y
    ], {
      stroke: toolColors.polygon,
      strokeWidth: 2,
      strokeDashArray: [3, 3],
      selectable: false,
      evented: false,
      data: { type: 'closing-line', tool: 'polygon' }
    });
    canvas.add(closingLine);

    // Создаем многоугольник
    const polygon = new fabric.Polygon(points, {
      fill: 'transparent',
      stroke: toolColors.polygon,
      strokeWidth: 2,
      selectable: true,
      hasControls: true,
      hasBorders: true,
      cornerColor: toolColors.polygon,
      cornerSize: 8,
      data: { type: 'measurement', tool: 'polygon' }
    });

    canvas.add(polygon);

    // Вычисляем площадь
    const areaMm2 = MeasurementService.calculateArea(points, pxPerMm);
    const perimeterMm = MeasurementService.calculatePerimeter(points, pxPerMm);
    const bbox = MeasurementService.getBoundingBox(points);

    // Добавляем информацию
    const infoText = new fabric.Text(
      `S: ${areaMm2.toFixed(0)} мм²  P: ${perimeterMm.toFixed(0)} мм`,
      {
        left: bbox.maxX + 10,
        top: bbox.minY,
        fontSize: 12,
        fill: toolColors.polygon,
        backgroundColor: 'white',
        padding: 4,
        selectable: true,
        data: { type: 'measurement-label', tool: 'polygon' }
      }
    );

    canvas.add(infoText);

    // Удаляем временные точки и линии
    tempPoints.forEach(p => canvas.remove(p));
    canvas.remove(closingLine);

    setTempPoints([]);
    setTempLine(null);
    setMeasurements([...measurements, polygon, infoText]);

    if (onMeasurementsChange) {
      onMeasurementsChange([...measurements, polygon, infoText]);
    }
    
    message.success(`Контур создан: площадь ${areaMm2.toFixed(0)} мм², периметр ${perimeterMm.toFixed(0)} мм`);
  };

  // Очистка всех измерений
  const clearAllMeasurements = () => {
    if (!canvas) return;

    measurements.forEach(m => canvas.remove(m));
    tempPoints.forEach(p => canvas.remove(p));
    if (tempLine) canvas.remove(tempLine);
    
    // Очищаем обработчики линейки
    cleanupRulerHandlers();

    setMeasurements([]);
    setTempPoints([]);
    setTempLine(null);
    
    message.success('Все измерения очищены');
  };

  // Отмена текущего измерения (для многоугольника)
  const cancelPolygon = () => {
    if (!canvas) return;
    
    tempPoints.forEach(p => canvas.remove(p));
    if (tempLine) canvas.remove(tempLine);
    
    setTempPoints([]);
    setTempLine(null);
    
    message.info('Построение контура отменено');
  };

  // Переключение режима измерения
  const toggleMeasurementMode = (tool: ToolType) => {
    // Очищаем обработчик линейки при смене инструмента
    cleanupRulerHandlers();
    
    if (activeTool === tool) {
      // Если выключили инструмент и это многоугольник с точками - завершаем его
      if (tool === 'polygon' && tempPoints.length >= 3) {
        completePolygon();
      } else if (tool === 'polygon' && tempPoints.length > 0) {
        // Если точек меньше 3 - отменяем
        cancelPolygon();
      }
      
      setActiveTool('none');
      setMeasurementMode(false);
      
      // Очищаем временные точки для других инструментов
      if (tool !== 'polygon' && canvas) {
        tempPoints.forEach(p => canvas.remove(p));
        if (tempLine) canvas.remove(tempLine);
        setTempPoints([]);
        setTempLine(null);
      }
    } else {
      // Если переключились на другой инструмент и был многоугольник - завершаем его
      if (activeTool === 'polygon' && tempPoints.length >= 3) {
        completePolygon();
      } else if (activeTool === 'polygon' && tempPoints.length > 0) {
        cancelPolygon();
      }
      
      setActiveTool(tool);
      setMeasurementMode(true);
    }
  };

  return (
    <Card size="small" title="Инструменты измерения" className="shadow-sm">
      <Space direction="vertical" className="w-full" size="middle">
        <div className="flex flex-wrap gap-2">
          <Tooltip title="Линейка (измерение расстояния) - кликните два раза">
            <Button
              type={activeTool === 'ruler' ? 'primary' : 'default'}
              icon={<UserOutlined />}
              onClick={() => toggleMeasurementMode('ruler')}
              style={activeTool === 'ruler' ? { backgroundColor: toolColors.ruler, borderColor: toolColors.ruler } : {}}
            >
              Линейка
            </Button>
          </Tooltip>

          <Tooltip title="Прямоугольник - создает прямоугольник 100×60 мм">
            <Button
              type={activeTool === 'rectangle' ? 'primary' : 'default'}
              icon={<BorderOutlined />}
              onClick={() => toggleMeasurementMode('rectangle')}
              style={activeTool === 'rectangle' ? { backgroundColor: toolColors.rectangle, borderColor: toolColors.rectangle } : {}}
            >
              Прямоугольник
            </Button>
          </Tooltip>

          <Tooltip title="Круг - создает круг диаметром 100 мм">
            <Button
              type={activeTool === 'circle' ? 'primary' : 'default'}
              icon={<LineOutlined />}
              onClick={() => toggleMeasurementMode('circle')}
              style={activeTool === 'circle' ? { backgroundColor: toolColors.circle, borderColor: toolColors.circle } : {}}
            >
              Круг
            </Button>
          </Tooltip>

          <Tooltip title="Контур - создайте минимум 3 точки, затем нажмите 'Завершить'">
            <Button
              type={activeTool === 'polygon' ? 'primary' : 'default'}
              icon={<BgColorsOutlined />}
              onClick={() => toggleMeasurementMode('polygon')}
              style={activeTool === 'polygon' ? { backgroundColor: toolColors.polygon, borderColor: toolColors.polygon } : {}}
            >
              Контур
            </Button>
          </Tooltip>

          <Tooltip title="Очистить все измерения">
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={clearAllMeasurements}
            >
              Очистить всё
            </Button>
          </Tooltip>
        </div>

        {activeTool === 'polygon' && tempPoints.length > 0 && (
          <div className="bg-blue-50 p-2 rounded flex justify-between items-center">
            <span className="text-blue-700">
              Точек: {tempPoints.length} {tempPoints.length < 3 ? '(нужно еще ' + (3 - tempPoints.length) + ')' : '(достаточно)'}
            </span>
            <Space>
              <Button 
                size="small" 
                type="primary"
                icon={<CheckOutlined />}
                onClick={completePolygon}
                disabled={tempPoints.length < 3}
              >
                Завершить
              </Button>
              <Button 
                size="small" 
                danger
                icon={<CloseOutlined />}
                onClick={cancelPolygon}
              >
                Отмена
              </Button>
            </Space>
          </div>
        )}

        <div className="text-sm text-gray-500">
          <Badge status="processing" text={`Масштаб: ${pxPerMm.toFixed(2)} px/мм`} />
        </div>

        <div className="bg-gray-50 p-2 rounded">
          <div className="text-xs text-gray-600 mb-1">📏 Справка по инструментам:</div>
          <ul className="text-xs text-gray-500 list-disc list-inside space-y-1">
            <li><span style={{ color: toolColors.ruler }}>●</span> Линейка: 2 клика для измерения расстояния</li>
            <li><span style={{ color: toolColors.rectangle }}>●</span> Прямоугольник: клик для создания (100×60 мм)</li>
            <li><span style={{ color: toolColors.circle }}>●</span> Круг: клик для создания (⌀100 мм)</li>
            <li><span style={{ color: toolColors.polygon }}>●</span> Контур: кликайте для добавления точек, затем "Завершить"</li>
            <li>✨ Все объекты можно перемещать и изменять размер</li>
          </ul>
        </div>
      </Space>
    </Card>
  );
};

export default MeasurementTools;