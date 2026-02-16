import React, { useCallback, useRef, useState } from 'react';
import { Upload, Button, message, Card, Space, Progress, Alert } from 'antd';
import { 
  UploadOutlined, 
  CameraOutlined, 
  DeleteOutlined,
  CheckCircleOutlined,
  FileImageOutlined 
} from '@ant-design/icons';
import { useImageUpload } from '../hooks/useImageUpload';
import { useAppSelector, useAppDispatch } from '../../../app/store';
import { clearError, setCalibration } from '../store/imageSlice';
import ImageCanvas from './ImageCanvas';

const { Dragger } = Upload;

const ImageUpload: React.FC = () => {
  const dispatch = useAppDispatch();
  const { uploadImage, clearPreview, previewUrl } = useImageUpload();
  const { currentImage, isLoading, error } = useAppSelector(state => state.image);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileUpload = useCallback(async (file: File) => {
    try {
      // Имитация прогресса загрузки
      setUploadProgress(0);
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(interval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      await uploadImage(file);
      
      clearInterval(interval);
      setUploadProgress(100);
      message.success('Изображение успешно загружено');
      
      setTimeout(() => setUploadProgress(0), 1000);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Ошибка загрузки');
    }
    return false; 
  }, [uploadImage]);

  const handleCalibration = useCallback((pxPerMm: number) => {
    dispatch(setCalibration({
      pxPerMm,
      rulerDetected: true,
      confidence: 0.95
    }));
    message.success(`Калибровка выполнена: ${pxPerMm.toFixed(2)} px/мм`);
  }, [dispatch]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (items) {
      for (const item of items) {
        if (item.type.indexOf('image') === 0) {
          const file = item.getAsFile();
          if (file) {
            handleFileUpload(file);
          }
        }
      }
    }
  }, [handleFileUpload]);

  React.useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  // Если есть загруженное изображение - показываем редактор
  if (currentImage && previewUrl) {
    return (
      <div className="space-y-4">
        <Card 
          title={
            <div className="flex items-center">
              <FileImageOutlined className="mr-2" />
              <span>Редактор изображения: {currentImage.fileName}</span>
            </div>
          }
          extra={
            <Button 
              icon={<DeleteOutlined />} 
              onClick={clearPreview}
              danger
            >
              Удалить
            </Button>
          }
          className="shadow-sm"
        >
          <ImageCanvas 
            imageUrl={previewUrl} 
            onCalibrate={handleCalibration}
          />
        </Card>

        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-500">
            <CheckCircleOutlined className="text-green-500 mr-1" />
            Размер: {currentImage.width}×{currentImage.height} px
            {currentImage.calibration && (
              <span className="ml-4">
                Масштаб: {currentImage.calibration.pxPerMm.toFixed(2)} px/мм
              </span>
            )}
          </div>
          
          <Space>
            <Button 
              icon={<CameraOutlined />} 
              onClick={() => {
                // TODO: Сделать новое фото
              }}
            >
              Новое фото
            </Button>
            <Button 
              type="primary"
              onClick={() => {
                // TODO: Перейти к следующему шагу
              }}
              disabled={!currentImage.calibration}
            >
              {currentImage.calibration ? 'Далее: Анализ дефекта' : 'Сначала выполните калибровку'}
            </Button>
          </Space>
        </div>
      </div>
    );
  }

  // Иначе показываем зону загрузки
  return (
    <div className="space-y-4">
      {error && (
        <Alert
          message="Ошибка"
          description={error}
          type="error"
          showIcon
          closable
          onClose={() => dispatch(clearError())}
        />
      )}

      <Card className="border-2 border-dashed border-gray-300 hover:border-blue-500 transition-colors">
        <Dragger
          name="file"
          multiple={false}
          showUploadList={false}
          beforeUpload={handleFileUpload}
          accept="image/*"
          className="bg-transparent"
        >
          <div className="p-8 text-center">
            <CameraOutlined className="text-6xl text-gray-400 mb-4" />
            <p className="text-xl mb-2">Загрузите фото дефекта</p>
            <p className="text-gray-500 mb-4">
              Перетащите файл сюда, нажмите для выбора или вставьте из буфера (Ctrl+V)
            </p>
            <div className="flex justify-center gap-4">
              <Button 
                // type="primary" 
                icon={<UploadOutlined />}
                size="large"
              >
                Выбрать файл
              </Button>
              <Button 
                icon={<CameraOutlined />}
                size="large"
              >
                Сделать фото
              </Button>
            </div>
            <div className="mt-4 text-xs text-gray-400">
              Поддерживаемые форматы: JPEG, PNG, WebP. Максимальный размер: 10MB
            </div>
          </div>
        </Dragger>
      </Card>

      {isLoading && uploadProgress > 0 && (
        <Card className="mt-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Загрузка изображения...</span>
              <span>{uploadProgress}%</span>
            </div>
            <Progress percent={uploadProgress} status="active" />
          </div>
        </Card>
      )}

      {/* Недавние изображения */}
      <Card title="Недавние загрузки" className="mt-6">
        <div className="grid grid-cols-5 gap-4">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="relative group cursor-pointer">
              <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                <FileImageOutlined className="text-2xl text-gray-400" />
              </div>
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all rounded-lg flex items-center justify-center">
                <Button size="small" className="opacity-0 group-hover:opacity-100">
                  Загрузить
                </Button>
              </div>
              <div className="mt-1 text-xs text-gray-500 truncate">
                Дефект-{i}.jpg
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
        <div className="flex items-start">
          <CheckCircleOutlined className="text-blue-500 mt-0.5 mr-2" />
          <div>
            <h4 className="font-medium text-blue-800">Рекомендации по съемке:</h4>
            <ul className="text-sm text-blue-700 mt-1 space-y-1">
              <li>• Расположите калибровочную линейку рядом с дефектом</li>
              <li>• Обеспечьте хорошее освещение</li>
              <li>• Держите камеру параллельно поверхности</li>
              <li>• Избегайте бликов и теней на дефекте</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageUpload;