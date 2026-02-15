import React from 'react';
import { Layout, Menu } from 'antd';
import {
  HomeOutlined,
  CameraOutlined,
  CompassOutlined,
  DatabaseOutlined,
  SettingOutlined
} from '@ant-design/icons';

const { Header, Sider, Content } = Layout;

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const menuItems = [
    {
      key: '1',
      icon: <HomeOutlined />,
      label: 'Главная',
    },
    {
      key: '2',
      icon: <CameraOutlined />,
      label: 'Новый анализ',
    },
    {
      key: '3',
      icon: <CompassOutlined />,
      label: 'Архив дефектов',
    },
    {
      key: '4',
      icon: <DatabaseOutlined />,
      label: 'Дообучение',
    },
    {
      key: '5',
      icon: <SettingOutlined />,
      label: 'Настройки',
    },
  ];

  return (
    <Layout className="h-screen">
      <Header className="bg-blue-800 px-4">
        <div className="flex items-center h-full">
          <div className="text-white text-xl font-bold">
            🚢 ShipRepair Estimator AI
          </div>
          <div className="ml-4 text-gray-300 text-sm">
            Версия 0.1.0 | Локальный режим
          </div>
        </div>
      </Header>
      <Layout>
        <Sider width={200} className="bg-gray-100">
          <Menu
            mode="inline"
            defaultSelectedKeys={['1']}
            items={menuItems}
            className="h-full border-r-0"
          />
        </Sider>
        <Content className="p-6 bg-white overflow-auto">
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;