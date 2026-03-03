// src/services/db/FileStorageService.node.ts
/* eslint-disable @typescript-eslint/no-var-requires */
import { IFileStorage, SaveResult, DefectData } from './IFileStorage';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';

export class NodeFileStorage implements IFileStorage {
  private basePath: string;
  private imagesPath: string;
  private thumbnailsPath: string;
  private dataPath: string;
  private defectsJsonPath: string;

  constructor() {
    // Определяем путь для сохранения
    try {
      this.basePath = path.join(app.getPath('documents'), 'ShipRepairEstimator');
    } catch {
      this.basePath = path.join(process.cwd(), 'shiprepair_data');
    }

    this.imagesPath = path.join(this.basePath, 'images');
    this.thumbnailsPath = path.join(this.basePath, 'thumbnails');
    this.dataPath = path.join(this.basePath, 'data');
    this.defectsJsonPath = path.join(this.dataPath, 'defects.json');

    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    [this.basePath, this.imagesPath, this.thumbnailsPath, this.dataPath].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });

    if (!fs.existsSync(this.defectsJsonPath)) {
      fs.writeFileSync(this.defectsJsonPath, JSON.stringify([]));
    }
  }

  async saveImage(base64Data: string, fileName: string): Promise<{ fullPath: string; thumbnailPath: string }> {
    const matches = base64Data.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new Error('Неверный формат base64');
    }

    const imageBuffer = Buffer.from(matches[2], 'base64');
    
    const timestamp = Date.now();
    const safeFileName = fileName.replace(/[^a-zA-Z0-9.]/g, '_');
    const imageFileName = `${timestamp}_${safeFileName}`;
    const thumbnailFileName = `thumb_${timestamp}_${safeFileName}`;
    
    const fullImagePath = path.join(this.imagesPath, imageFileName);
    const fullThumbnailPath = path.join(this.thumbnailsPath, thumbnailFileName);
    
    await fs.promises.writeFile(fullImagePath, imageBuffer);
    await fs.promises.writeFile(fullThumbnailPath, imageBuffer);
    
    return {
      fullPath: fullImagePath,
      thumbnailPath: fullThumbnailPath
    };
  }

  async loadDefects(): Promise<DefectData[]> {
    try {
      const data = await fs.promises.readFile(this.defectsJsonPath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return [];
    }
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
    await fs.promises.writeFile(this.defectsJsonPath, JSON.stringify(defects, null, 2));
    
    return {
      id: newId,
      imagePath: defect.imagePath,
      thumbnailPath: defect.thumbnailPath,
      dataPath: this.defectsJsonPath
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
    
    if (fs.existsSync(defectToDelete.imagePath)) {
      await fs.promises.unlink(defectToDelete.imagePath);
    }
    
    if (fs.existsSync(defectToDelete.thumbnailPath)) {
      await fs.promises.unlink(defectToDelete.thumbnailPath);
    }
    
    const filteredDefects = defects.filter(d => d.id !== id);
    await fs.promises.writeFile(this.defectsJsonPath, JSON.stringify(filteredDefects, null, 2));
    
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
    return this.basePath;
  }
}