// src/features/image-upload/components/ImageUpload.tsx
import React, { useCallback, useState, useEffect } from 'react';
import { 
  // Upload, 
  Button, message, Card, Space, Progress, Alert, Modal, Input, Select } from 'antd';
import { 
  UploadOutlined, 
  CameraOutlined, 
  DeleteOutlined,
  CheckCircleOutlined,
  FileImageOutlined,
  SaveOutlined,
  FolderOpenOutlined
} from '@ant-design/icons';
import { useImageUpload } from '../hooks/useImageUpload';
import { useAppSelector, useAppDispatch } from '../../../app/store';
import { clearError, setCalibration } from '../store/imageSlice';
import ImageCanvas from './ImageCanvas';
import { useDatabase } from '../../database/hooks/useDatabase';
import Dragger from 'antd/es/upload/Dragger';

const { Option } = Select;

// Интерфейс для измерения
interface MeasurementData {
  type: string;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  radius?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  points?: Array<{ x: number; y: number }>;
}

const ImageUpload: React.FC = () => {
  const dispatch = useAppDispatch();
  const { uploadImage, clearPreview, previewUrl } = useImageUpload();
  const { currentImage, isLoading, error } = useAppSelector(state => state.image);
  const { saveDefect, loading: dbLoading, getStoragePath } = useDatabase();
  
  const [uploadProgress, setUploadProgress] = useState(0);
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [measurements, setMeasurements] = useState<fabric.Object[]>([]);
  
  // Используем ref для хранения пути (не вызывает рендер)
  // const storagePathRef = useRef<string>('');
  
  // Поля для ввода дополнительной информации
  const [frameNumber, setFrameNumber] = useState<string>('');
  const [side, setSide] = useState<'ЛБ' | 'ПБ' | undefined>(undefined);
  const [heightFromKeel, setHeightFromKeel] = useState<number | undefined>();
  const [defectType, setDefectType] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [storagePath, setStoragePath] = useState<string>('');

  useEffect(() => {
  setStoragePath(getStoragePath());
}, [getStoragePath]); // Оставляем зависимость, так как это нужно для UI

  // Получаем путь к хранилищу один раз при монтировании
  // useEffect(() => {
  //   storagePathRef.current = getStoragePath();
  //   console.log('📁 Путь к хранилищу:', storagePathRef.current);
  // }, []); // Пустой массив - выполняется один раз

  const handleFileUpload = useCallback(async (file: File) => {
    try {
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

  const handleMeasurementsChange = useCallback((newMeasurements: fabric.Object[]) => {
    setMeasurements(newMeasurements);
  }, []);

  const handleSave = useCallback(() => {
    if (!currentImage?.calibration) {
      message.warning('Сначала выполните калибровку');
      return;
    }
    setSaveModalVisible(true);
  }, [currentImage]);

  // Функция для безопасного преобразования измерений
  const serializeMeasurements = useCallback((measurements: fabric.Object[]): MeasurementData[] => {
    return measurements.map(m => {
      const baseData: MeasurementData = {
        type: m.type || 'unknown',
        left: m.left,
        top: m.top,
      };

      // В зависимости от типа объекта добавляем специфичные поля
      if (m.type === 'rect') {
        const rect = m as fabric.Rect;
        return {
          ...baseData,
          width: rect.width,
          height: rect.height,
        };
      } else if (m.type === 'circle') {
        const circle = m as fabric.Circle;
        return {
          ...baseData,
          radius: circle.radius,
        };
      } else if (m.type === 'line') {
        const line = m as fabric.Line;
        // Пробуем разные способы получения координат линии
        const x1 = line.get('x1') ?? line.x1;
        const y1 = line.get('y1') ?? line.y1;
        const x2 = line.get('x2') ?? line.x2;
        const y2 = line.get('y2') ?? line.y2;
        
        return {
          ...baseData,
          x1,
          y1,
          x2,
          y2,
        };
      } else if (m.type === 'polygon') {
        const polygon = m as fabric.Polygon;
        return {
          ...baseData,
          points: polygon.points?.map(p => ({ x: p.x, y: p.y })),
        };
      }

      return baseData;
    });
  }, []);

  const handleConfirmSave = useCallback(async () => {
    if (!currentImage || !previewUrl) return;

    try {
      // Сохраняем калибровочные точки (временно заглушка)
      const calibrationPoints = JSON.stringify([
        { x: 0, y: 0 },
        { x: 100, y: 0 }
      ]);

      // Сохраняем измерения с правильной типизацией
      const measurementsData = serializeMeasurements(measurements);

      // Сохраняем в файловую систему
      const id = await saveDefect(
        previewUrl,
        currentImage.fileName,
        {
          imageWidth: currentImage.width,
          imageHeight: currentImage.height,
          pxPerMm: currentImage.calibration.pxPerMm,
          calibrationPoints,
          measurements: JSON.stringify(measurementsData),
          defectType: defectType || undefined,
          frameNumber: frameNumber || undefined,
          side: side,
          heightFromKeel: heightFromKeel,
          notes: notes || undefined,
          fileName: currentImage.fileName
        }
      );
      
      message.success(`Дефект сохранен в файловую систему (ID: ${id})`);
      
      // Показываем путь к сохраненным файлам
      message.info(`Файлы сохранены в: ${storagePath}`);
      
      setSaveModalVisible(false);
      
      // Сбрасываем форму
      setFrameNumber('');
      setSide(undefined);
      setHeightFromKeel(undefined);
      setDefectType('');
      setNotes('');
      setMeasurements([]);
      
      // Очищаем предпросмотр
      clearPreview();
    } catch (error) {
      message.error('Ошибка при сохранении в файловую систему');
      console.error(error);
    }
  }, [currentImage, previewUrl, measurements, serializeMeasurements, defectType, frameNumber, side, heightFromKeel, notes, saveDefect, clearPreview]);

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

  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  // Если есть загруженное изображение - показываем редактор
  if (currentImage && previewUrl) {
    return (
      <div className="space-y-4">
        {/* Модальное окно сохранения с дополнительными полями */}
        <Modal
          title="Сохранение измерений"
          open={saveModalVisible}
          onOk={handleConfirmSave}
          onCancel={() => setSaveModalVisible(false)}
          okText="Сохранить"
          cancelText="Отмена"
          confirmLoading={dbLoading}
          width={600}
        >
          <div className="space-y-4">
            <div>
              <label className="block mb-1 font-medium">Тип дефекта</label>
              <Select
                placeholder="Выберите тип дефекта"
                className="w-full"
                value={defectType}
                onChange={setDefectType}
                allowClear
              >
                <Option value="corrosion">Коррозия</Option>
                <Option value="crack">Трещина</Option>
                <Option value="deformation">Деформация</Option>
                <Option value="coating">Повреждение покрытия</Option>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-1 font-medium">Номер шпангоута</label>
                <Input
                  placeholder="например: 42"
                  value={frameNumber}
                  onChange={(e) => setFrameNumber(e.target.value)}
                />
              </div>
              <div>
                <label className="block mb-1 font-medium">Борт</label>
                <Select
                  placeholder="Выберите борт"
                  className="w-full"
                  value={side}
                  onChange={setSide}
                  allowClear
                >
                  <Option value="ЛБ">Левый борт (ЛБ)</Option>
                  <Option value="ПБ">Правый борт (ПБ)</Option>
                </Select>
              </div>
            </div>

            <div>
              <label className="block mb-1 font-medium">Высота от КВЛ (м)</label>
              <Input
                type="number"
                placeholder="опционально"
                value={heightFromKeel}
                onChange={(e) => setHeightFromKeel(e.target.value ? Number(e.target.value) : undefined)}
                step={0.1}
              />
            </div>

            <div>
              <label className="block mb-1 font-medium">Примечания</label>
              <Input.TextArea
                rows={3}
                placeholder="дополнительная информация о дефекте"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="bg-blue-50 p-3 rounded">
              <p className="text-blue-800 text-sm flex items-center">
                <FolderOpenOutlined className="mr-2" />
                Файлы будут сохранены в: {storagePath}
              </p>
            </div>

            <div className="bg-green-50 p-3 rounded">
              <p className="text-green-800 text-sm">
                ⚡ Будет сохранено: изображение, миниатюра, {measurements.length} измерений
              </p>
            </div>
          </div>
        </Modal>

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
            onSave={handleSave}
            onMeasurementsChange={handleMeasurementsChange}
          />
        </Card>

        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-500">
            <CheckCircleOutlined className="text-green-500 mr-1" />
            Размер: {currentImage.width}×{currentImage.height} px
            {currentImage.calibration && (
              <span className="ml-4">
                ✅ Масштаб: {currentImage.calibration.pxPerMm.toFixed(2)} px/мм
                {measurements.length > 0 && (
                  <span className="ml-2">
                    📊 Измерений: {measurements.length}
                  </span>
                )}
              </span>
            )}
          </div>
          
          <Space>
            <Button 
              icon={<CameraOutlined />} 
              onClick={() => {
                clearPreview();
                message.info('Сделайте новое фото');
              }}
            >
              Новое фото
            </Button>
            <Button 
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSave}
              disabled={!currentImage.calibration}
              loading={dbLoading}
            >
              {currentImage.calibration ? 'Сохранить анализ' : 'Сначала выполните калибровку'}
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
                type="primary" 
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

      {/* Информация о хранилище */}
      <Card className="mt-6">
        <div className="flex items-start">
          <FolderOpenOutlined className="text-blue-500 mt-0.5 mr-2" />
          <div>
            <h4 className="font-medium">Файловое хранилище:</h4>
            <p className="text-sm text-gray-600 mt-1">{storagePath || 'Загрузка...'}</p>
          </div>
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
              <li>• Линейка должна быть четко видна на фото</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageUpload;