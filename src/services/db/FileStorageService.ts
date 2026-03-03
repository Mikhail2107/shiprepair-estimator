// src/services/db/FileStorageService.ts
import { IFileStorage, SaveResult, DefectData } from './IFileStorage';

// Определяем тип окружения
const isNode = typeof process !== 'undefined' && 
               process.versions != null && 
               process.versions.node != null;

const isElectron = typeof window !== 'undefined' && 
                   window.navigator.userAgent.toLowerCase().indexOf(' electron/') > -1;

// Синглтон для доступа к хранилищу
class FileStorageService {
  private static instance: IFileStorage | null = null;

  static async getInstance(): Promise<IFileStorage> {
    if (!FileStorageService.instance) {
      if (isNode || isElectron) {
        try {
          // Динамический импорт для Node.js версии
          const module = await import('./FileStorageService.node');
          FileStorageService.instance = new module.NodeFileStorage();
        } catch (error) {
          console.error('Failed to load Node.js storage:', error);
          // Fallback на браузерную версию
          const module = await import('./FileStorageService.web');
          FileStorageService.instance = new module.WebFileStorage();
        }
      } else {
        // Браузерная версия
        const module = await import('./FileStorageService.web');
        FileStorageService.instance = new module.WebFileStorage();
      }
    }
    return FileStorageService.instance;
  }

  // Для синхронного доступа (если нужно получить путь без ожидания)
  static getStoragePathSync(): string {
    if (isNode || isElectron) {
      return 'файловая система';
    } else {
      return 'браузерное хранилище';
    }
  }
}

export default FileStorageService;
export type { IFileStorage, SaveResult, DefectData } from './IFileStorage';