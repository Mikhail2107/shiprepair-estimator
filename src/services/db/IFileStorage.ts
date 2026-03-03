// src/services/db/IFileStorage.ts
export interface SaveResult {
  id: number;
  imagePath: string;
  thumbnailPath: string;
  dataPath: string;
}

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

export interface IFileStorage {
  saveImage(base64Data: string, fileName: string): Promise<{ fullPath: string; thumbnailPath: string }>;
  loadDefects(): Promise<DefectData[]>;
  saveDefect(defect: Omit<DefectData, 'id'>): Promise<SaveResult>;
  getDefectById(id: number): Promise<DefectData | null>;
  deleteDefect(id: number): Promise<boolean>;
  getStats(): Promise<{ total: number; withFrameNumber: number; averagePxPerMm: number }>;
  getStoragePath(): string;
}