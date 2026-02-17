import Database from 'better-sqlite3';
// import { app } from 'electron';
import path from 'path';

export interface DefectMeasurement {
  id?: number;
  imagePath: string;
  fileName: string;
  imageWidth: number;
  imageHeight: number;
  pxPerMm: number;
  calibrationPoints: string; // JSON строка с точками калибровки
  measurements: string; // JSON строка со всеми измерениями
  defectType?: string;
  frameNumber?: string;
  side?: 'ЛБ' | 'ПБ';
  heightFromKeel?: number;
  notes?: string;
  createdAt: string;
}

class DatabaseService {
  private db: Database.Database;
  private static instance: DatabaseService;

  private constructor() {
    // Определяем путь к файлу БД
    const dbPath = path.join(process.cwd(), 'data', 'shiprepair.db');
    console.log('📁 База данных будет создана по пути:', dbPath);
    
    this.db = new Database(dbPath);
    this.initTables();
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  private initTables() {
    // Создаем таблицу для дефектов
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS defects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        imagePath TEXT NOT NULL,
        fileName TEXT NOT NULL,
        imageWidth INTEGER NOT NULL,
        imageHeight INTEGER NOT NULL,
        pxPerMm REAL NOT NULL,
        calibrationPoints TEXT NOT NULL,
        measurements TEXT NOT NULL,
        defectType TEXT,
        frameNumber TEXT,
        side TEXT CHECK(side IN ('ЛБ', 'ПБ')),
        heightFromKeel REAL,
        notes TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_defects_createdAt ON defects(createdAt);
      CREATE INDEX IF NOT EXISTS idx_defects_frameNumber ON defects(frameNumber);
    `);

    console.log('✅ Таблицы базы данных инициализированы');
  }

  // Сохранение нового дефекта
  public saveDefect(defect: Omit<DefectMeasurement, 'id'>): number {
    const stmt = this.db.prepare(`
      INSERT INTO defects (
        imagePath, fileName, imageWidth, imageHeight, pxPerMm,
        calibrationPoints, measurements, defectType, frameNumber,
        side, heightFromKeel, notes, createdAt
      ) VALUES (
        @imagePath, @fileName, @imageWidth, @imageHeight, @pxPerMm,
        @calibrationPoints, @measurements, @defectType, @frameNumber,
        @side, @heightFromKeel, @notes, @createdAt
      )
    `);

    const result = stmt.run(defect);
    console.log('✅ Дефект сохранен в БД, ID:', result.lastInsertRowid);
    return result.lastInsertRowid as number;
  }

  // Получение всех дефектов
  public getAllDefects(): DefectMeasurement[] {
    const stmt = this.db.prepare('SELECT * FROM defects ORDER BY createdAt DESC');
    return stmt.all() as DefectMeasurement[];
  }

  // Получение дефекта по ID
  public getDefectById(id: number): DefectMeasurement | null {
    const stmt = this.db.prepare('SELECT * FROM defects WHERE id = ?');
    const result = stmt.get(id);
    return result ? (result as DefectMeasurement) : null;
  }

  // Обновление дефекта
  public updateDefect(id: number, defect: Partial<DefectMeasurement>): boolean {
    const fields = Object.keys(defect)
      .filter(key => key !== 'id')
      .map(key => `${key} = @${key}`)
      .join(', ');

    const stmt = this.db.prepare(`
      UPDATE defects 
      SET ${fields}, updatedAt = datetime('now')
      WHERE id = @id
    `);

    const result = stmt.run({ ...defect, id });
    return result.changes > 0;
  }

  // Удаление дефекта
  public deleteDefect(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM defects WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  // Поиск дефектов по номеру шпангоута
  public searchByFrameNumber(frameNumber: string): DefectMeasurement[] {
    const stmt = this.db.prepare('SELECT * FROM defects WHERE frameNumber LIKE ? ORDER BY createdAt DESC');
    return stmt.all(`%${frameNumber}%`) as DefectMeasurement[];
  }

  // Получение статистики
  public getStats(): {
    total: number;
    withFrameNumber: number;
    averagePxPerMm: number;
  } {
    const total = this.db.prepare('SELECT COUNT(*) as count FROM defects').get() as { count: number };
    const withFrameNumber = this.db.prepare('SELECT COUNT(*) as count FROM defects WHERE frameNumber IS NOT NULL').get() as { count: number };
    const avgPxPerMm = this.db.prepare('SELECT AVG(pxPerMm) as avg FROM defects').get() as { avg: number | null };

    return {
      total: total.count,
      withFrameNumber: withFrameNumber.count,
      averagePxPerMm: avgPxPerMm.avg || 0,
    };
  }

  // Закрытие соединения с БД
  public close() {
    this.db.close();
    console.log('🔒 Соединение с БД закрыто');
  }
}

export default DatabaseService;