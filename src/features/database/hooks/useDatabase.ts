// src/features/database/hooks/useDatabase.ts
import { useState, useCallback } from 'react';
import FileStorageService from '../../../services/db/FileStorageService'
import  { IFileStorage, DefectData } from '../../../services/db/IFileStorage';

export const useDatabase = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storage, setStorage] = useState<IFileStorage | null>(null);

  // Инициализируем хранилище
  useState(() => {
    FileStorageService.getInstance().then(setStorage);
  }, []);

  const saveDefect = useCallback(async (
    imageBase64: string, 
    fileName: string, 
    metadata: Omit<DefectData, 'id' | 'imagePath' | 'thumbnailPath' | 'createdAt'>
  ): Promise<number> => {
    if (!storage) throw new Error('Хранилище не инициализировано');
    
    setLoading(true);
    setError(null);
    
    try {
      const { fullPath, thumbnailPath } = await storage.saveImage(imageBase64, fileName);
      
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
  }, [storage]);

  const getAllDefects = useCallback(async (): Promise<DefectData[]> => {
    if (!storage) return [];
    
    setLoading(true);
    setError(null);
    
    try {
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
  }, [storage]);

  const getDefectById = useCallback(async (id: number): Promise<DefectData | null> => {
    if (!storage) return null;
    return storage.getDefectById(id);
  }, [storage]);

  const deleteDefect = useCallback(async (id: number): Promise<boolean> => {
    if (!storage) return false;
    
    setLoading(true);
    setError(null);
    
    try {
      return await storage.deleteDefect(id);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка удаления';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [storage]);

  const getStats = useCallback(async () => {
    if (!storage) return { total: 0, withFrameNumber: 0, averagePxPerMm: 0 };
    return storage.getStats();
  }, [storage]);

  const getStoragePath = useCallback(() => {
    return storage?.getStoragePath() || 'Загрузка...';
  }, [storage]);

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