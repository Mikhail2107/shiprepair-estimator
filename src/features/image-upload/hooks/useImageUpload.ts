// src/features/image-upload/hooks/useImageUpload.ts
import { useState, useCallback } from 'react';
import { useAppDispatch } from '../../../app/store';
import { 
  setCurrentImage, 
  setLoading, 
  setError,
  UploadedImage, 
  clearCurrentImage
} from '../store/imageSlice';
import { ImageService } from '../../../services/image-service/ImageService';

export const useImageUpload = () => {
  const dispatch = useAppDispatch();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const uploadImage = useCallback(async (file: File) => {
    try {
      dispatch(setLoading(true));
      dispatch(setError(null)); // Теперь null допустим

      // Валидация
      if (!ImageService.validateFileType(file)) {
        throw new Error('Неподдерживаемый формат файла. Используйте JPEG, PNG или WebP');
      }

      if (!ImageService.validateFileSize(file)) {
        throw new Error('Файл слишком большой. Максимальный размер 10MB');
      }

      // Получаем данные изображения
      const dataUrl = await ImageService.fileToDataUrl(file);
      const dimensions = await ImageService.getImageDimensions(file);
      
      // Создаем объект изображения
      const uploadedImage: UploadedImage = {
        id: `${Date.now()}-${file.name}`,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        dataUrl,
        width: dimensions.width,
        height: dimensions.height,
        uploadDate: new Date().toISOString(),
      };

      // Сохраняем в хранилище
      dispatch(setCurrentImage(uploadedImage));
      setPreviewUrl(dataUrl);

      return uploadedImage;
    } catch (error) {
      // Правильная обработка ошибки
      const errorMessage = error instanceof Error ? error.message : 'Ошибка загрузки файла';
      dispatch(setError(errorMessage));
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch]);

  const clearPreview = useCallback(() => {
    setPreviewUrl(null);
    dispatch(clearCurrentImage());
  }, [dispatch]);

  return {
    uploadImage,
    clearPreview,
    previewUrl,
  };
};