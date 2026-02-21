// src/features/database/hooks/useDatabase.ts
import { useState, useCallback } from 'react';
import FileStorageService, { DefectData } from '../../../services/db/FileStorageService';

export const useDatabase = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveDefect = useCallback(async (
    imageBase64: string, 
    fileName: string, 
    metadata: Omit<DefectData, 'id' | 'imagePath' | 'thumbnailPath' | 'createdAt'>
  ): Promise<number> => {
    setLoading(true);
    setError(null);
    
    try {
      const storage = FileStorageService.getInstance();
      
      // Сохраняем изображение и получаем пути
      const { fullPath, thumbnailPath } = await storage.saveImage(imageBase64, fileName);
      
      // Создаем запись о дефекте
      const defectData = {
        ...metadata,
        imagePath: fullPath,
        thumbnailPath,
        fileName,
        createdAt: new Date().toISOString()
      };
      
      const result = await storage.saveDefect(defectData);
      return result.id;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка сохранения';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getAllDefects = useCallback(async (): Promise<DefectData[]> => {
    setLoading(true);
    setError(null);
    
    try {
      const storage = FileStorageService.getInstance();
      const defects = await storage.loadDefects();
      return defects.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка загрузки';
      setError(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getDefectById = useCallback(async (id: number): Promise<DefectData | null> => {
    try {
      const storage = FileStorageService.getInstance();
      return await storage.getDefectById(id);
    } catch (err) {
      console.error('Ошибка получения дефекта:', err);
      return null;
    }
  }, []);

  const deleteDefect = useCallback(async (id: number): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      const storage = FileStorageService.getInstance();
      return await storage.deleteDefect(id);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка удаления';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const getStats = useCallback(async () => {
    try {
      const storage = FileStorageService.getInstance();
      return await storage.getStats();
    } catch (err) {
      console.error('Ошибка получения статистики:', err);
      return { total: 0, withFrameNumber: 0, averagePxPerMm: 0 };
    }
  }, []);

  const getStoragePath = useCallback(() => {
    const storage = FileStorageService.getInstance();
    return storage.getStoragePath();
  }, []);

  return {
    saveDefect,
    getAllDefects,
    getDefectById,
    deleteDefect,
    getStats,
    getStoragePath,
    loading,
    error,
  };
};