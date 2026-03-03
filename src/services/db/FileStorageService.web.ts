// src/services/db/FileStorageService.web.ts
import { IFileStorage, SaveResult, DefectData } from './IFileStorage';

export class WebFileStorage implements IFileStorage {
  private storageKey = 'shiprepair_defects';
  private basePath = 'browser-storage';

  async saveImage(base64Data: string, fileName: string): Promise<{ fullPath: string; thumbnailPath: string }> {
    // В браузере сохраняем в localStorage как base64
    const timestamp = Date.now();
    const imageKey = `img_${timestamp}_${fileName}`;
    localStorage.setItem(imageKey, base64Data);
    
    return {
      fullPath: imageKey,
      thumbnailPath: `thumb_${imageKey}`
    };
  }

  async loadDefects(): Promise<DefectData[]> {
    const data = localStorage.getItem(this.storageKey);
    return data ? JSON.parse(data) : [];
  }

  async saveDefect(defect: Omit<DefectData, 'id'>): Promise<SaveResult> {
    const defects = await this.loadDefects();
    
    const newId = defects.length > 0 
      ? Math.max(...defects.map(d => d.id || 0)) + 1 
      : 1;
    
    const newDefect: DefectData = {
      ...defect,
      id: newId
    };
    
    defects.push(newDefect);
    localStorage.setItem(this.storageKey, JSON.stringify(defects));
    
    return {
      id: newId,
      imagePath: defect.imagePath,
      thumbnailPath: defect.thumbnailPath,
      dataPath: this.storageKey
    };
  }

  async getDefectById(id: number): Promise<DefectData | null> {
    const defects = await this.loadDefects();
    return defects.find(d => d.id === id) || null;
  }

  async deleteDefect(id: number): Promise<boolean> {
    const defects = await this.loadDefects();
    const defectToDelete = defects.find(d => d.id === id);
    
    if (!defectToDelete) return false;
    
    // Удаляем изображения из localStorage
    localStorage.removeItem(defectToDelete.imagePath);
    localStorage.removeItem(defectToDelete.thumbnailPath);
    
    const filteredDefects = defects.filter(d => d.id !== id);
    localStorage.setItem(this.storageKey, JSON.stringify(filteredDefects));
    
    return true;
  }

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

  getStoragePath(): string {
    return 'браузерное хранилище (localStorage)';
  }
}