import { useState, useCallback } from 'react';
import
//  DatabaseService, 
{ DefectMeasurement } 
from '../../../services/db/DatabaseService';

// В браузерной среде we'll использовать IndexedDB или localStorage
// Но для Electron мы можем использовать IPC
export const useDatabase = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Временно используем localStorage для демонстрации
  // В финальной версии заменим на IPC вызовы к Electron

  const saveDefect = useCallback(async (defect: Omit<DefectMeasurement, 'id'>): Promise<number> => {
    setLoading(true);
    setError(null);
    
    try {
      // Получаем существующие дефекты
      const existing = localStorage.getItem('defects');
      const defects: DefectMeasurement[] = existing ? JSON.parse(existing) : [];
      
      // Создаем новый дефект с ID
      const newDefect: DefectMeasurement = {
        ...defect,
        id: Date.now(), // временно используем timestamp как ID
      };
      
      defects.push(newDefect);
      localStorage.setItem('defects', JSON.stringify(defects));
      
      console.log('✅ Дефект сохранен в localStorage:', newDefect.id);
      return newDefect.id;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка сохранения';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getAllDefects = useCallback(async (): Promise<DefectMeasurement[]> => {
    setLoading(true);
    setError(null);
    
    try {
      const existing = localStorage.getItem('defects');
      const defects: DefectMeasurement[] = existing ? JSON.parse(existing) : [];
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

  const getDefectById = useCallback(async (id: number): Promise<DefectMeasurement | null> => {
    try {
      const defects = await getAllDefects();
      return defects.find(d => d.id === id) || null;
    } catch (err) {
      console.error('Ошибка получения дефекта:', err);
      return null;
    }
  }, [getAllDefects]);

  const deleteDefect = useCallback(async (id: number): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      const defects = await getAllDefects();
      const filtered = defects.filter(d => d.id !== id);
      localStorage.setItem('defects', JSON.stringify(filtered));
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка удаления';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [getAllDefects]);

  const getStats = useCallback(async () => {
    try {
      const defects = await getAllDefects();
      const total = defects.length;
      const withFrameNumber = defects.filter(d => d.frameNumber).length;
      const avgPxPerMm = defects.reduce((sum, d) => sum + d.pxPerMm, 0) / total || 0;
      
      return {
        total,
        withFrameNumber,
        averagePxPerMm: Number(avgPxPerMm.toFixed(2)),
      };
    } catch (err) {
      console.error('Ошибка получения статистики:', err);
      return { total: 0, withFrameNumber: 0, averagePxPerMm: 0 };
    }
  }, [getAllDefects]);

  return {
    saveDefect,
    getAllDefects,
    getDefectById,
    deleteDefect,
    getStats,
    loading,
    error,
  };
};