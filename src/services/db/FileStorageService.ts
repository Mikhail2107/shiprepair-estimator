// src/services/db/FileStorageService.ts
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */

import type { PathLike } from 'fs';

// Расширяем интерфейс Window для Electron
declare global {
  interface Window {
    electron?: {
      getPath?: (name: string) => string;
      [key: string]: unknown;
    }
  }
}

// Определяем интерфейс для результата сохранения
export interface SaveResult {
  id: number;
  imagePath: string;
  thumbnailPath: string;
  dataPath: string;
}

// Определяем интерфейс для дефекта
export interface DefectData {
  id?: number;
  imagePath: string;
  thumbnailPath: string;
  fileName: string;
  imageWidth: number;
  imageHeight: number;
  pxPerMm: number;
  calibrationPoints: string;
  measurements: string;
  defectType?: string;
  frameNumber?: string;
  side?: 'ЛБ' | 'ПБ';
  heightFromKeel?: number;
  notes?: string;
  createdAt: string;
}

// Определяем типы для модулей Node.js
interface PathModule {
  join: (...paths: string[]) => string;
  dirname: (path: string) => string;
  basename: (path: string, ext?: string) => string;
  extname: (path: string) => string;
  resolve: (...paths: string[]) => string;
}

interface FsModule {
  existsSync: (path: PathLike) => boolean;
  mkdirSync: (path: PathLike, options?: { recursive?: boolean }) => void;
  promises: {
    writeFile: (path: PathLike, data: string | Buffer) => Promise<void>;
    readFile: (path: PathLike, encoding?: string) => Promise<string>;
    unlink: (path: PathLike) => Promise<void>;
  };
}

// Создаем заглушки для браузера с правильными типами
const createPathStub = (): PathModule => ({
  join: (...paths: string[]): string => paths.join('/'),
  dirname: (path: string): string => path.split('/').slice(0, -1).join('/'),
  basename: (path: string, ext?: string): string => {
    const base = path.split('/').pop() || '';
    if (ext && base.endsWith(ext)) {
      return base.slice(0, -ext.length);
    }
    return base;
  },
  extname: (path: string): string => {
    const match = path.match(/\.[^./]+$/);
    return match ? match[0] : '';
  },
  resolve: (...paths: string[]): string => paths.join('/')
});

const createFsStub = (): FsModule => ({
  existsSync: (): boolean => false,
  mkdirSync: (): void => {},
  promises: {
    writeFile: async (): Promise<void> => {},
    readFile: async (): Promise<string> => '[]',
    unlink: async (): Promise<void> => {}
  }
});

// Проверяем, запущены ли мы в Node.js
const isNode = typeof process !== 'undefined' && 
               process.versions != null && 
               process.versions.node != null;

// Инициализируем модули с правильными типами
let path: PathModule;
let fs: FsModule;

if (isNode) {
  // Используем require с разрешением ESLint
  path = require('path');
  fs = require('fs');
} else {
  path = createPathStub();
  fs = createFsStub();
}

// Функция для проверки наличия Electron
const isElectron = (): boolean => {
  return typeof window !== 'undefined' && 
         window.electron !== undefined;
};

// Функция для получения пути документов в Electron
const getElectronDocsPath = async (): Promise<string | null> => {
  try {
    if (isElectron() && isNode) {
      // Динамический импорт electron
      const electron = await import('electron');
      return electron.app.getPath('documents');
    }
  } catch (error) {
    console.log('Electron not available:', error);
  }
  return null;
};

class FileStorageService {
  private static instance: FileStorageService;
  private basePath: string;
  private imagesPath: string;
  private thumbnailsPath: string;
  private dataPath: string;
  private defectsJsonPath: string;
  private isInitialized: boolean = false;

  private constructor() {
    // Временный путь по умолчанию
    this.basePath = path.join(process.cwd?.() || '', 'shiprepair_data');
    this.imagesPath = path.join(this.basePath, 'images');
    this.thumbnailsPath = path.join(this.basePath, 'thumbnails');
    this.dataPath = path.join(this.basePath, 'data');
    this.defectsJsonPath = path.join(this.dataPath, 'defects.json');
    
    // Асинхронно инициализируем с Electron
    this.initializeWithElectron();
  }

  static getInstance(): FileStorageService {
    if (!FileStorageService.instance) {
      FileStorageService.instance = new FileStorageService();
    }
    return FileStorageService.instance;
  }

  private async initializeWithElectron(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const docsPath = await getElectronDocsPath();
      if (docsPath) {
        this.basePath = path.join(docsPath, 'ShipRepairEstimator');
        this.imagesPath = path.join(this.basePath, 'images');
        this.thumbnailsPath = path.join(this.basePath, 'thumbnails');
        this.dataPath = path.join(this.basePath, 'data');
        this.defectsJsonPath = path.join(this.dataPath, 'defects.json');
      }
    } catch (error) {
      console.log('Failed to initialize Electron path:', error);
    }

    this.isInitialized = true;
    this.ensureDirectories();
    console.log('📁 Файловое хранилище инициализировано:', this.basePath);
  }

  // Создание директорий если их нет
  private ensureDirectories(): void {
    // В браузере эта функция ничего не делает
    if (!isNode) return;
    
    [this.basePath, this.imagesPath, this.thumbnailsPath, this.dataPath].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log('📁 Создана директория:', dir);
      }
    });

    // Создаем файл defects.json если его нет
    if (!fs.existsSync(this.defectsJsonPath)) {
      fs.promises.writeFile(this.defectsJsonPath, JSON.stringify([]))
        .then(() => console.log('📄 Создан файл defects.json'))
        .catch(err => console.error('❌ Ошибка создания defects.json:', err));
    }
  }

  // Сохранение изображения
  async saveImage(base64Data: string, fileName: string): Promise<{ fullPath: string; thumbnailPath: string }> {
    try {
      // В браузере возвращаем заглушку
      if (!isNode) {
        return {
          fullPath: `memory://${fileName}`,
          thumbnailPath: `memory://thumb_${fileName}`
        };
      }

      const matches = base64Data.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
      
      if (!matches || matches.length !== 3) {
        throw new Error('Неверный формат base64');
      }

      const imageBuffer = Buffer.from(matches[2], 'base64');
      
      // Генерируем уникальное имя файла
      const timestamp = Date.now();
      const safeFileName = fileName.replace(/[^a-zA-Z0-9.]/g, '_');
      const imageFileName = `${timestamp}_${safeFileName}`;
      const thumbnailFileName = `thumb_${timestamp}_${safeFileName}`;
      
      // Полные пути к файлам
      const fullImagePath = path.join(this.imagesPath, imageFileName);
      const fullThumbnailPath = path.join(this.thumbnailsPath, thumbnailFileName);
      
      // Сохраняем оригинальное изображение
      await fs.promises.writeFile(fullImagePath, imageBuffer);
      console.log('✅ Изображение сохранено:', fullImagePath);
      
      // Создаем миниатюру
      await this.createThumbnail(imageBuffer, fullThumbnailPath);
      console.log('✅ Миниатюра сохранена:', fullThumbnailPath);
      
      return {
        fullPath: fullImagePath,
        thumbnailPath: fullThumbnailPath
      };
    } catch (error) {
      console.error('❌ Ошибка сохранения изображения:', error);
      throw error;
    }
  }

  // Создание миниатюры
  private async createThumbnail(imageBuffer: Buffer, outputPath: string): Promise<void> {
    if (!isNode) return;
    // В реальном приложении здесь нужно использовать sharp
    // Для простоты просто копируем оригинал
    await fs.promises.writeFile(outputPath, imageBuffer);
  }

  // Загрузка всех дефектов из JSON
  async loadDefects(): Promise<DefectData[]> {
    try {
      if (!isNode) {
        // В браузере читаем из localStorage
        const data = localStorage.getItem('defects');
        return data ? JSON.parse(data) : [];
      }

      await this.initializeWithElectron();
      const data = await fs.promises.readFile(this.defectsJsonPath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('❌ Ошибка загрузки дефектов:', error);
      return [];
    }
  }

  // Сохранение дефекта
  async saveDefect(defect: Omit<DefectData, 'id'>): Promise<SaveResult> {
    try {
      // Загружаем существующие дефекты
      const defects = await this.loadDefects();
      
      // Генерируем новый ID
      const newId = defects.length > 0 
        ? Math.max(...defects.map(d => d.id || 0)) + 1 
        : 1;
      
      // Создаем запись о дефекте
      const newDefect: DefectData = {
        ...defect,
        id: newId
      };
      
      // Добавляем в массив и сохраняем
      defects.push(newDefect);
      
      if (isNode) {
        await this.initializeWithElectron();
        await fs.promises.writeFile(this.defectsJsonPath, JSON.stringify(defects, null, 2));
      } else {
        // В браузере сохраняем в localStorage
        localStorage.setItem('defects', JSON.stringify(defects));
      }
      
      console.log('✅ Дефект сохранен, ID:', newId);
      
      return {
        id: newId,
        imagePath: defect.imagePath,
        thumbnailPath: defect.thumbnailPath,
        dataPath: this.defectsJsonPath
      };
    } catch (error) {
      console.error('❌ Ошибка сохранения дефекта:', error);
      throw error;
    }
  }

  // Получение дефекта по ID
  async getDefectById(id: number): Promise<DefectData | null> {
    const defects = await this.loadDefects();
    return defects.find(d => d.id === id) || null;
  }

  // Удаление дефекта
  async deleteDefect(id: number): Promise<boolean> {
    try {
      const defects = await this.loadDefects();
      const defectToDelete = defects.find(d => d.id === id);
      
      if (!defectToDelete) {
        return false;
      }
      
      // Удаляем файлы изображений (только в Node.js)
      if (isNode) {
        await this.initializeWithElectron();
        
        if (fs.existsSync(defectToDelete.imagePath)) {
          await fs.promises.unlink(defectToDelete.imagePath);
          console.log('🗑️ Удалено изображение:', defectToDelete.imagePath);
        }
        
        if (fs.existsSync(defectToDelete.thumbnailPath)) {
          await fs.promises.unlink(defectToDelete.thumbnailPath);
          console.log('🗑️ Удалена миниатюра:', defectToDelete.thumbnailPath);
        }
      }
      
      // Удаляем запись из JSON
      const filteredDefects = defects.filter(d => d.id !== id);
      
      if (isNode) {
        await fs.promises.writeFile(this.defectsJsonPath, JSON.stringify(filteredDefects, null, 2));
      } else {
        localStorage.setItem('defects', JSON.stringify(filteredDefects));
      }
      
      console.log('✅ Дефект удален, ID:', id);
      return true;
    } catch (error) {
      console.error('❌ Ошибка удаления дефекта:', error);
      return false;
    }
  }

  // Получение статистики
  async getStats(): Promise<{ total: number; withFrameNumber: number; averagePxPerMm: number }> {
    const defects = await this.loadDefects();
    
    const total = defects.length;
    const withFrameNumber = defects.filter(d => d.frameNumber).length;
    const avgPxPerMm = defects.reduce((sum, d) => sum + d.pxPerMm, 0) / total || 0;
    
    return {
      total,
      withFrameNumber,
      averagePxPerMm: Number(avgPxPerMm.toFixed(2))
    };
  }

  // Получение пути к хранилищу
  getStoragePath(): string {
    return this.basePath;
  }
}

export default FileStorageService;