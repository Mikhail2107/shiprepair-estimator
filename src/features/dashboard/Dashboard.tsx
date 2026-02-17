// src/features/dashboard/Dashboard.tsx
import React, { useState } from 'react';
import { Card, Row, Col, Statistic, Button } from 'antd';
import {
  FileImageOutlined,
  LineChartOutlined,
  SafetyOutlined,
  ClockCircleOutlined,
  CameraOutlined
} from '@ant-design/icons';
import ImageUpload from '../image-upload/components/ImageUpload';

const Dashboard: React.FC = () => {
  const [showUpload, setShowUpload] = useState(false);

  if (showUpload) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Новый анализ дефекта</h1>
          <Button onClick={() => setShowUpload(false)}>
            Вернуться на главную
          </Button>
        </div>
        <ImageUpload />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Главная панель</h1>
        <Button 
          type="primary" 
          size="large" 
          className="bg-blue-600"
          onClick={() => setShowUpload(true)}
        >
          Начать новый анализ
        </Button>
      </div>

      {/* Статистика */}
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Всего анализов"
              value={127}
              prefix={<FileImageOutlined />}
              styles={{ content: { color: '#3f8600' } }} // Вместо valueStyle
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Средняя точность"
              value={86.5}
              suffix="%"
              prefix={<LineChartOutlined />}
              styles={{ content: { color: '#1890ff' } }} // Вместо valueStyle
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Дефектов в работе"
              value={12}
              prefix={<SafetyOutlined />}
              styles={{ content: { color: '#fa8c16' } }} // Вместо valueStyle
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Экономия времени"
              value={3.2}
              suffix="ч/смена"
              prefix={<ClockCircleOutlined />}
              styles={{ content: { color: '#722ed1' } }} // Вместо valueStyle
            />
          </Card>
        </Col>
      </Row>

      {/* Быстрый старт */}
      <Row gutter={16} className="mt-6">
        <Col span={12}>
          <Card title="Быстрые действия" className="h-full">
            <div className="space-y-3">
              <Button block icon={<CameraOutlined />} size="large">
                Сфотографировать дефект
              </Button>
              <Button block icon={<FileImageOutlined />} size="large">
                Загрузить с компьютера
              </Button>
              <Button block icon={<LineChartOutlined />} size="large">
                Просмотр статистики
              </Button>
            </div>
          </Card>
        </Col>
        <Col span={12}>
          <Card title="Недавние анализы" className="h-full">
            <div className="space-y-2">
              {[
                { id: 1, date: '2024-01-15', defect: 'Коррозия язвенная', ship: 'Судно-01' },
                { id: 2, date: '2024-01-14', defect: 'Трещина поверхностная', ship: 'Судно-02' },
                { id: 3, date: '2024-01-13', defect: 'Деформация вмятина', ship: 'Судно-01' },
              ].map(item => (
                <div key={item.id} className="flex justify-between p-2 hover:bg-gray-50 rounded">
                  <div>
                    <div className="font-medium">{item.defect}</div>
                    <div className="text-gray-500 text-sm">{item.ship}</div>
                  </div>
                  <div className="text-gray-500">{item.date}</div>
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>

      {/* Технологическая карта */}
      <Card title="Технологический процесс" className="mt-6">
        <div className="flex items-center justify-around">
          {[
            { step: 1, title: 'Фотосъемка', desc: 'Дефект + линейка' },
            { step: 2, title: 'Загрузка', desc: 'В приложение' },
            { step: 3, title: 'Анализ', desc: 'AI определение' },
            { step: 4, title: 'Координаты', desc: 'Шпангоут + борт' },
            { step: 5, title: 'Отчет', desc: 'PDF/Excel' }
          ].map(item => (
            <div key={item.step} className="text-center">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                {item.step}
              </div>
              <div className="font-medium">{item.title}</div>
              <div className="text-gray-500 text-sm">{item.desc}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default Dashboard;