import React, { useState } from 'react';
import { Layout, Menu } from 'antd';
import {
  DashboardOutlined,
  AppstoreOutlined,
  HistoryOutlined,
  FileTextOutlined,
  WarningOutlined,
  UserOutlined,
  ShoppingOutlined,
  SafetyOutlined
} from '@ant-design/icons';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import Vessels from './pages/Vessels.jsx';
import Voyages from './pages/Voyages.jsx';
import CatchLogs from './pages/CatchLogs.jsx';
import NoFishing from './pages/NoFishing.jsx';
import Violations from './pages/Violations.jsx';
import Buyers from './pages/Buyers.jsx';

const { Header, Sider, Content, Footer } = Layout;

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
    { key: '/', icon: <DashboardOutlined />, label: '数据概览' },
    { key: '/vessels', icon: <AppstoreOutlined />, label: '渔船管理' },
    { key: '/voyages', icon: <HistoryOutlined />, label: '航次管理' },
    { key: '/catch-logs', icon: <FileTextOutlined />, label: '捕捞日志' },
    { key: '/no-fishing', icon: <SafetyOutlined />, label: '禁渔管理' },
    { key: '/violations', icon: <WarningOutlined />, label: '违规记录' },
    { key: '/buyers', icon: <ShoppingOutlined />, label: '买家管理' }
  ];

  return (
    <Layout className="app-layout" style={{ minHeight: '100vh' }}>
      <Header className="app-header" style={{ padding: '0 24px', background: '#001529' }}>
        <h1 style={{ color: 'white', margin: 0, fontSize: '20px' }}>
          🚢 渔船捕捞作业电子日志系统
        </h1>
      </Header>
      <Layout>
        <Sider
          width={200}
          theme="dark"
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          style={{ background: '#001529' }}
        >
          <Menu
            mode="inline"
            theme="dark"
            selectedKeys={[location.pathname]}
            items={menuItems}
            onClick={({ key }) => navigate(key)}
            style={{ height: '100%', borderRight: 0 }}
          />
        </Sider>
        <Layout>
          <Content className="app-content" style={{ padding: '24px', background: '#f0f2f5' }}>
            <div style={{ background: 'white', padding: '24px', borderRadius: '8px', minHeight: '100%' }}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/vessels" element={<Vessels />} />
                <Route path="/voyages" element={<Voyages />} />
                <Route path="/catch-logs" element={<CatchLogs />} />
                <Route path="/no-fishing" element={<NoFishing />} />
                <Route path="/violations" element={<Violations />} />
                <Route path="/buyers" element={<Buyers />} />
              </Routes>
            </div>
          </Content>
          <Footer className="app-footer" style={{ textAlign: 'center', background: '#001529', color: 'rgba(255,255,255,0.65)' }}>
            渔船捕捞作业电子日志系统 ©2026 Created with Node.js + React
          </Footer>
        </Layout>
      </Layout>
    </Layout>
  );
}

export default App;
