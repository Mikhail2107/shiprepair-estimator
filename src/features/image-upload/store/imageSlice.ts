// src/features/image-upload/store/imageSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface UploadedImage {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  dataUrl: string;
  width: number;
  height: number;
  uploadDate: string;
  calibration?: {
    pxPerMm: number;
    rulerDetected: boolean;
    confidence: number;
  };
}

interface ImageState {
  currentImage: UploadedImage | null;
  recentImages: UploadedImage[];
  isLoading: boolean;
  error: string | null;  // Изменено с string на string | null
}

const initialState: ImageState = {
  currentImage: null,
  recentImages: [],
  isLoading: false,
  error: null,  // Теперь null допустим
};

const imageSlice = createSlice({
  name: 'image',
  initialState,
  reducers: {
    setCurrentImage: (state, action: PayloadAction<UploadedImage>) => {
      state.currentImage = action.payload;
      
      // Добавляем в недавние, если еще нет
      const exists = state.recentImages.some(img => img.id === action.payload.id);
      if (!exists) {
        state.recentImages = [action.payload, ...state.recentImages].slice(0, 10);
      }
    },
    clearCurrentImage: (state) => {
      state.currentImage = null;
    },
    setCalibration: (state, action: PayloadAction<{ pxPerMm: number; rulerDetected: boolean; confidence: number }>) => {
      if (state.currentImage) {
        state.currentImage.calibration = action.payload;
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {  // Изменено на string | null
      state.error = action.payload;
      state.isLoading = false;
    },
    clearError: (state) => {
      state.error = null;  // Устанавливаем null, а не пустую строку
    },
  },
});

export const {
  setCurrentImage,
  clearCurrentImage,
  setCalibration,
  setLoading,
  setError,
  clearError,
} = imageSlice.actions;

export default imageSlice.reducer;