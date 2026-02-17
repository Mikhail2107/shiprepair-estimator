import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Space, Tag, Modal, message, Statistic, Row, Col } from 'antd';
import { 
  DeleteOutlined, 
  EyeOutlined, 
  FileImageOutlined,
  BarChartOutlined 
} from '@ant-design/icons';
import { useDatabase } from '../hooks/useDatabase';
import { DefectMeasurement } from '../../../services/db/DatabaseService';

const DefectList: React.FC = () => {
  const { getAllDefects, deleteDefect, getStats, loading } = useDatabase();
  const [defects, setDefects] = useState<DefectMeasurement[]>([]);
  const [stats, setStats] = useState({ total: 0, withFrameNumber: 0, averagePxPerMm: 0 });
  const [previewImage, setPreviewImage] = useState<string | null>(null);

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
      content: 'Вы уверены, что хотите удалить этот дефект?',
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

  const handlePreview = (imagePath: string) => {
    setPreviewImage(imagePath);
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
      width: 80,
      render: (_: unknown, record: DefectMeasurement) => (
        <Button 
          icon={<FileImageOutlined />} 
          onClick={() => handlePreview(record.imagePath)}
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
      render: (_: unknown, record: DefectMeasurement) => (
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
          <img 
            src={previewImage} 
            alt="Дефект" 
            style={{ width: '100%', height: 'auto' }} 
          />
        )}
      </Modal>
    </div>
  );
};

export default DefectList;