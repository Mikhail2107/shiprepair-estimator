// src/features/dashboard/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Button, Tabs } from 'antd';
import {
  FileImageOutlined,
  LineChartOutlined,
  SafetyOutlined,
  ClockCircleOutlined,
  CameraOutlined,
  DatabaseOutlined
} from '@ant-design/icons';
import ImageUpload from '../image-upload/components/ImageUpload';
import DefectList from '../database/components/DefectList';
import { useDatabase } from '../database/hooks/useDatabase';

const { TabPane } = Tabs;

const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('1');
  const { getStats } = useDatabase();
  const [stats, setStats] = useState({ total: 0, withFrameNumber: 0, averagePxPerMm: 0 });

  useEffect(() => {
    loadStats();
  }, [activeTab]);

  const loadStats = async () => {
    const statsData = await getStats();
    setStats(statsData);
  };

  return (
    <div className="space-y-6">
      <Tabs activeKey={activeTab} onChange={setActiveTab} size="large">
        <TabPane 
          tab={<span><FileImageOutlined />Главная</span>} 
          key="1"
        >
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold">Главная панель</h1>
            </div>

            {/* Статистика */}
            <Row gutter={16}>
              <Col span={8}>
                <Card>
                  <Statistic
                    title="Всего анализов"
                    value={stats.total}
                    prefix={<FileImageOutlined />}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card>
                  <Statistic
                    title="Средняя точность"
                    value={86.5}
                    suffix="%"
                    prefix={<LineChartOutlined />}
                    styles={{ content: { color: '#1890ff' } }}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card>
                  <Statistic
                    title="Экономия времени"
                    value={3.2}
                    suffix="ч/смена"
                    prefix={<ClockCircleOutlined />}
                    styles={{ content: { color: '#722ed1' } }}
                  />
                </Card>
              </Col>
            </Row>

            {/* Быстрый старт */}
            <Row gutter={16} className="mt-6">
              <Col span={12}>
                <Card title="Быстрые действия" className="h-full">
                  <div className="space-y-3">
                    <Button 
                      block 
                      icon={<CameraOutlined />} 
                      size="large"
                      onClick={() => setActiveTab('2')}
                    >
                      Новый анализ дефекта
                    </Button>
                    <Button 
                      block 
                      icon={<DatabaseOutlined />} 
                      size="large"
                      onClick={() => setActiveTab('3')}
                    >
                      Просмотр базы данных
                    </Button>
                  </div>
                </Card>
              </Col>
              <Col span={12}>
                <Card title="Технологический процесс" className="h-full">
                  <div className="flex items-center justify-around">
                    {[
                      { step: 1, title: 'Фотосъемка', desc: 'Дефект + линейка' },
                      { step: 2, title: 'Загрузка', desc: 'В приложение' },
                      { step: 3, title: 'Анализ', desc: 'Измерения' },
                      { step: 4, title: 'Сохранение', desc: 'В базу данных' },
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
              </Col>
            </Row>
          </div>
        </TabPane>

        <TabPane 
          tab={<span><CameraOutlined />Новый анализ</span>} 
          key="2"
        >
          <ImageUpload />
        </TabPane>

        <TabPane 
          tab={<span><DatabaseOutlined />База данных</span>} 
          key="3"
        >
          <DefectList />
        </TabPane>
      </Tabs>
    </div>
  );
};

export default Dashboard;