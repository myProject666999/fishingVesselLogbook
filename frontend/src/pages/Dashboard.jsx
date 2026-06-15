import React, { useState, useEffect } from 'react';
import { Row, Col, Card, List, Tag, Statistic } from 'antd';
import { AppstoreOutlined, HistoryOutlined, WarningOutlined, FileTextOutlined } from '@ant-design/icons';
import { vesselAPI, voyageAPI, violationAPI, catchLogAPI } from '../api';

function Dashboard() {
  const [stats, setStats] = useState({
    vessels: 0,
    activeVoyages: 0,
    violations: 0,
    catchLogs: 0
  });
  const [recentViolations, setRecentViolations] = useState([]);
  const [recentVoyages, setRecentVoyages] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [vesselsRes, voyagesRes, violationsRes, catchLogsRes] = await Promise.all([
        vesselAPI.list(),
        voyageAPI.list({ pageSize: 5 }),
        violationAPI.list({ pageSize: 5, status: 0 }),
        catchLogAPI.list({ pageSize: 1 })
      ]);

      setStats({
        vessels: vesselsRes.data?.length || 0,
        activeVoyages: (voyagesRes.data || []).filter(v => v.status === 0).length || 0,
        violations: violationsRes.total || 0,
        catchLogs: catchLogsRes.total || 0
      });

      setRecentViolations(violationsRes.data || []);
      setRecentVoyages(voyagesRes.data || []);
    } catch (err) {
      console.error('加载数据失败:', err);
    }
  };

  const getVoyageStatus = (status) => {
    const statusMap = {
      0: { color: 'processing', text: '进行中' },
      1: { color: 'success', text: '已完成' },
      2: { color: 'default', text: '已取消' }
    };
    return statusMap[status] || { color: 'default', text: '未知' };
  };

  const getViolationType = (type) => {
    const typeMap = {
      1: { color: 'error', text: '禁渔区' },
      2: { color: 'warning', text: '禁渔期' }
    };
    return typeMap[type] || { color: 'default', text: '未知' };
  };

  return (
    <div>
      <h2 className="page-title">数据概览</h2>

      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="渔船总数"
              value={stats.vessels}
              prefix={<AppstoreOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="进行中航次"
              value={stats.activeVoyages}
              prefix={<HistoryOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="待处理违规"
              value={stats.violations}
              prefix={<WarningOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="捕捞日志"
              value={stats.catchLogs}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Card title="最近航次" style={{ marginBottom: '16px' }}>
            <List
              dataSource={recentVoyages}
              renderItem={item => (
                <List.Item key={item.id}>
                  <List.Item.Meta
                    title={
                      <span>
                        {item.voyage_no}
                        <Tag style={{ marginLeft: '8px' }} color={getVoyageStatus(item.status).color}>
                          {getVoyageStatus(item.status).text}
                        </Tag>
                      </span>
                    }
                    description={`${item.vessel_name} · ${item.departure_port || '待定'} → ${item.arrival_port || '待定'}`}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="最近违规" style={{ marginBottom: '16px' }}>
            <List
              dataSource={recentViolations}
              renderItem={item => (
                <List.Item key={item.id}>
                  <List.Item.Meta
                    title={
                      <span>
                        {item.vessel_name || '未知船只'}
                        <Tag style={{ marginLeft: '8px' }} color={getViolationType(item.violation_type).color}>
                          {getViolationType(item.violation_type).text}
                        </Tag>
                      </span>
                    }
                    description={`${item.zone_name || item.period_name || '未知'} · ${new Date(item.violation_time).toLocaleString()}`}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      <Card title="系统说明" style={{ marginTop: '16px' }}>
        <p>🚢 <strong>渔船捕捞作业电子日志系统</strong> 主要功能包括：</p>
        <ul style={{ paddingLeft: '20px', lineHeight: '2' }}>
          <li><strong>GPS轨迹记录</strong>：自动记录渔船航行轨迹，支持离线补传</li>
          <li><strong>Douglas-Peucker 抽稀算法</strong>：对轨迹点进行抽稀，减轻数据库压力</li>
          <li><strong>射线法多边形判断</strong>：精准判断船只是否进入禁渔区</li>
          <li><strong>禁渔期校验</strong>：捕捞日志录入时自动检测禁渔期</li>
          <li><strong>违规记录</strong>：自动记录违规行为，保留证据</li>
          <li><strong>捕捞日志</strong>：记录每趟渔获的鱼种、重量、价值和买家</li>
        </ul>
      </Card>
    </div>
  );
}

export default Dashboard;
