export interface MeasurementPoint {
  x: number;
  y: number;
}

export interface MeasurementResult {
  distancePx: number;
  distanceMm: number;
  startPoint: MeasurementPoint;
  endPoint: MeasurementPoint;
}

export class MeasurementService {
  // Вычисление расстояния между двумя точками
  static calculateDistance(point1: MeasurementPoint, point2: MeasurementPoint): number {
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // Конвертация пикселей в миллиметры
  static pxToMm(px: number, pxPerMm: number): number {
    return px / pxPerMm;
  }

  // Конвертация миллиметров в пиксели
  static mmToPx(mm: number, pxPerMm: number): number {
    return mm * pxPerMm;
  }

  // Вычисление площади по контуру (алгоритм Гаусса)
  static calculateArea(points: MeasurementPoint[], pxPerMm: number): number {
    if (points.length < 3) return 0;
    
    // Площадь в пикселях
    let areaPx = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      areaPx += points[i].x * points[j].y;
      areaPx -= points[j].x * points[i].y;
    }
    areaPx = Math.abs(areaPx) / 2;
    
    // Конвертация в мм²
    return areaPx / (pxPerMm * pxPerMm);
  }

  // Вычисление периметра
  static calculatePerimeter(points: MeasurementPoint[], pxPerMm: number): number {
    let perimeterPx = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      perimeterPx += this.calculateDistance(points[i], points[j]);
    }
    return perimeterPx / pxPerMm;
  }

  // Поиск минимального ограничивающего прямоугольника
  static getBoundingBox(points: MeasurementPoint[]): {
    minX: number, minY: number, maxX: number, maxY: number,
    width: number, height: number
  } {
    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);
    
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);
    
    return {
      minX, minY, maxX, maxY,
      width: maxX - minX,
      height: maxY - minY
    };
  }
}