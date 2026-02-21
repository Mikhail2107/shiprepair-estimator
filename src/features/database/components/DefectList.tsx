// src/features/database/components/DefectList.tsx
import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Space, Tag, Modal, message, Statistic, Row, Col, Image } from 'antd';
import { 
  DeleteOutlined, 
  EyeOutlined, 
  FileImageOutlined,
  BarChartOutlined,
  FolderOpenOutlined 
} from '@ant-design/icons';
import { useDatabase } from '../hooks/useDatabase';
import { DefectData } from '../../../services/db/FileStorageService';
// import fs from 'fs';

const DefectList: React.FC = () => {
  const { getAllDefects, deleteDefect, getStats, loading } = useDatabase();
  const [defects, setDefects] = useState<DefectData[]>([]);
  const [stats, setStats] = useState({ total: 0, withFrameNumber: 0, averagePxPerMm: 0 });
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);

  const loadData = async () => {
    const data = await getAllDefects();
    setDefects(data);
    const statsData = await getStats();
    setStats(statsData);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (id: number) => {
    Modal.confirm({
      title: 'Удаление записи',
      content: 'Вы уверены, что хотите удалить этот дефект? Файлы будут удалены безвозвратно.',
      okText: 'Удалить',
      cancelText: 'Отмена',
      okButtonProps: { danger: true },
      onOk: async () => {
        const success = await deleteDefect(id);
        if (success) {
          message.success('Запись удалена');
          loadData();
        } else {
          message.error('Ошибка при удалении');
        }
      },
    });
  };

  const handlePreview = async (imagePath: string) => {
    setImageLoading(true);
    try {
      // В реальном приложении здесь нужно читать файл
      // Для демонстрации используем путь как есть
      setPreviewImage(`file://${imagePath}`);
    } catch (error) {
      message.error('Не удалось загрузить изображение', error);
    } finally {
      setImageLoading(false);
    }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: 'Изображение',
      key: 'image',
      width: 100,
      render: (_, record: DefectData) => (
        <Button 
          icon={<FileImageOutlined />} 
          onClick={() => handlePreview(record.imagePath)}
          loading={imageLoading}
        >
          Просмотр
        </Button>
      ),
    },
    {
      title: 'Файл',
      dataIndex: 'fileName',
      key: 'fileName',
      ellipsis: true,
    },
    {
      title: 'Масштаб',
      dataIndex: 'pxPerMm',
      key: 'pxPerMm',
      render: (value: number) => `${value.toFixed(2)} px/мм`,
    },
    {
      title: 'Шпангоут',
      dataIndex: 'frameNumber',
      key: 'frameNumber',
      render: (value: string) => value || '—',
    },
    {
      title: 'Борт',
      dataIndex: 'side',
      key: 'side',
      render: (value: string) => {
        if (!value) return '—';
        return <Tag color={value === 'ЛБ' ? 'blue' : 'green'}>{value}</Tag>;
      },
    },
    {
      title: 'Дата',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (value: string) => new Date(value).toLocaleString('ru-RU'),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 120,
      render: (_, record: DefectData) => (
        <Space>
          <Button 
            icon={<EyeOutlined />} 
            size="small"
            onClick={() => {
              // TODO: Открыть детальный просмотр
              message.info('Просмотр в разработке');
            }}
          />
          <Button 
            icon={<DeleteOutlined />} 
            size="small" 
            danger
            onClick={() => handleDelete(record.id!)}
          />
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Статистика */}
      <Row gutter={16}>
        <Col span={8}>
          <Card>
            <Statistic
              title="Всего анализов"
              value={stats.total}
              prefix={<BarChartOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="С привязкой к шпангоуту"
              value={stats.withFrameNumber}
              suffix={`из ${stats.total}`}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Средний масштаб"
              value={stats.averagePxPerMm}
              suffix="px/мм"
              precision={2}
            />
          </Card>
        </Col>
      </Row>

      {/* Информация о хранилище */}
      <Card>
        <div className="flex items-center text-gray-600">
          <FolderOpenOutlined className="mr-2" />
          <span>Файлы сохранены в локальной файловой системе</span>
        </div>
      </Card>

      {/* Таблица дефектов */}
      <Card title="Сохраненные дефекты">
        <Table
          columns={columns}
          dataSource={defects}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 1000 }}
        />
      </Card>

      {/* Модальное окно просмотра изображения */}
      <Modal
        title="Просмотр изображения"
        open={!!previewImage}
        onCancel={() => setPreviewImage(null)}
        footer={null}
        width={800}
      >
        {previewImage && (
          <Image
            src={previewImage}
            alt="Дефект"
            style={{ width: '100%', height: 'auto' }}
            preview={false}
            fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
          />
        )}
      </Modal>
    </div>
  );
};

export default DefectList;