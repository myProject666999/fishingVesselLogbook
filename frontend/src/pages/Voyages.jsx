import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Select, Input, DatePicker, message, Tag, Space, Card, Row, Col, Statistic } from 'antd';
import { PlusOutlined, InfoCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { voyageAPI, vesselAPI, trackAPI } from '../api';
import dayjs from 'dayjs';

function Voyages() {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [vessels, setVessels] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [currentVoyage, setCurrentVoyage] = useState(null);
  const [trackPoints, setTrackPoints] = useState([]);
  const [trackStats, setTrackStats] = useState({});
  const [form] = Form.useForm();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    loadData();
    loadVessels();
  }, [page, pageSize]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await voyageAPI.list({ page, pageSize });
      setData(res.data || []);
      setTotal(res.total || 0);
    } catch (err) {
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const loadVessels = async () => {
    try {
      const res = await vesselAPI.list();
      setVessels(res.data || []);
    } catch (err) {
      console.error('加载渔船列表失败');
    }
  };

  const handleAdd = () => {
    form.resetFields();
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      await voyageAPI.create({
        ...values,
        departure_time: values.departure_time?.toISOString()
      });
      message.success('创建成功');
      setModalVisible(false);
      loadData();
    } catch (err) {
      if (err.errorFields) return;
      message.error('操作失败');
    }
  };

  const handleViewDetail = async (record) => {
    setCurrentVoyage(record);
    setDetailVisible(true);
    try {
      const res = await trackAPI.getByVoyage(record.id, true);
      setTrackPoints(res.data || []);
      setTrackStats({
        point_count: res.point_count || 0,
        total_distance: res.total_distance || 0
      });
    } catch (err) {
      console.error('加载轨迹失败');
    }
  };

  const handleFinish = async (record) => {
    try {
      await voyageAPI.finish(record.id, {
        arrival_port: record.departure_port,
        arrival_time: new Date().toISOString()
      });
      message.success('航次已结束');
      loadData();
    } catch (err) {
      message.error('操作失败');
    }
  };

  const getStatus = (status) => {
    const statusMap = {
      0: { color: 'processing', text: '进行中' },
      1: { color: 'success', text: '已完成' },
      2: { color: 'default', text: '已取消' }
    };
    return statusMap[status] || { color: 'default', text: '未知' };
  };

  const renderTrackMap = () => {
    if (trackPoints.length === 0) {
      return <div className="map-placeholder">暂无轨迹数据</div>;
    }

    const minLng = Math.min(...trackPoints.map(p => p.longitude || p.lng));
    const maxLng = Math.max(...trackPoints.map(p => p.longitude || p.lng));
    const minLat = Math.min(...trackPoints.map(p => p.latitude || p.lat));
    const maxLat = Math.max(...trackPoints.map(p => p.latitude || p.lat));

    const width = 100;
    const height = 100;
    const padding = 10;

    const scaleX = (width - 2 * padding) / (maxLng - minLng || 1);
    const scaleY = (height - 2 * padding) / (maxLat - minLat || 1);
    const scale = Math.min(scaleX, scaleY);

    const points = trackPoints.map(p => {
      const lng = p.longitude || p.lng;
      const lat = p.latitude || p.lat;
      const x = padding + (lng - minLng) * scale;
      const y = height - padding - (lat - minLat) * scale;
      return { x, y };
    });

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    return (
      <div className="track-visualization">
        <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
          <path d={pathD} className="track-line" />
          {points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="1" fill="#1890ff" />
          ))}
          {points.length > 0 && (
            <>
              <circle cx={points[0].x} cy={points[0].y} r="2" fill="#52c41a" />
              <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="2" fill="#ff4d4f" />
            </>
          )}
        </svg>
        <div style={{
          position: 'absolute',
          bottom: '10px',
          left: '10px',
          background: 'rgba(255,255,255,0.8)',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '12px'
        }}>
          <span style={{ color: '#52c41a' }}>●起点</span>
          <span style={{ marginLeft: '10px', color: '#ff4d4f' }}>●终点</span>
        </div>
      </div>
    );
  };

  const columns = [
    { title: '航次编号', dataIndex: 'voyage_no', key: 'voyage_no' },
    { title: '渔船', dataIndex: 'vessel_name', key: 'vessel_name' },
    { title: '出发港', dataIndex: 'departure_port', key: 'departure_port' },
    { title: '抵达港', dataIndex: 'arrival_port', key: 'arrival_port' },
    {
      title: '开航时间',
      dataIndex: 'departure_time',
      key: 'departure_time',
      render: t => t ? dayjs(t).format('YYYY-MM-DD HH:mm') : '-'
    },
    {
      title: '返港时间',
      dataIndex: 'arrival_time',
      key: 'arrival_time',
      render: t => t ? dayjs(t).format('YYYY-MM-DD HH:mm') : '-'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: s => <Tag color={getStatus(s).color}>{getStatus(s).text}</Tag>
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<InfoCircleOutlined />} onClick={() => handleViewDetail(record)}>详情</Button>
          {record.status === 0 && (
            <Button type="link" danger icon={<CloseCircleOutlined />} onClick={() => handleFinish(record)}>结束航次</Button>
          )}
        </Space>
      )
    }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h2 className="page-title" style={{ marginBottom: 0 }}>航次管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增航次</Button>
      </div>

      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          pageSize,
          total,
          onChange: (p, ps) => { setPage(p); setPageSize(ps); }
        }}
      />

      <Modal
        title="新增航次"
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="vessel_id" label="选择渔船" rules={[{ required: true, message: '请选择渔船' }]}>
            <Select placeholder="请选择渔船">
              {vessels.map(v => (
                <Select.Option key={v.id} value={v.id}>{v.vessel_name} ({v.vessel_no})</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="departure_port" label="出发港口" rules={[{ required: true, message: '请输入出发港口' }]}>
            <Input placeholder="请输入出发港口" />
          </Form.Item>
          <Form.Item name="departure_time" label="开航时间">
            <DatePicker showTime style={{ width: '100%' }} placeholder="请选择开航时间" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="航次详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={800}
      >
        {currentVoyage && (
          <div>
            <Card title="基本信息" style={{ marginBottom: '16px' }}>
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic title="航次编号" value={currentVoyage.voyage_no} />
                </Col>
                <Col span={8}>
                  <Statistic title="渔船" value={currentVoyage.vessel_name} />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="状态"
                    value={getStatus(currentVoyage.status).text}
                    valueStyle={{ color: getStatus(currentVoyage.status).color === 'processing' ? '#1890ff' : '#52c41a' }}
                  />
                </Col>
              </Row>
              <Row gutter={16} style={{ marginTop: '16px' }}>
                <Col span={8}>
                  <p style={{ color: '#666', margin: 0 }}>出发港: {currentVoyage.departure_port || '-'}</p>
                </Col>
                <Col span={8}>
                  <p style={{ color: '#666', margin: 0 }}>抵达港: {currentVoyage.arrival_port || '-'}</p>
                </Col>
                <Col span={8}>
                  <p style={{ color: '#666', margin: 0 }}>
                    总航程: {trackStats.total_distance?.toFixed(2) || 0} 海里
                  </p>
                </Col>
              </Row>
            </Card>

            <Card title="轨迹图 (抽稀后)">
              {renderTrackMap()}
              <div style={{ marginTop: '16px', textAlign: 'center', color: '#666' }}>
                轨迹点数: {trackStats.point_count || 0} 个
                {trackPoints.length > 0 && (
                  <span style={{ marginLeft: '20px' }}>
                    总航程: {trackStats.total_distance?.toFixed(2) || 0} 海里
                  </span>
                )}
              </div>
            </Card>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default Voyages;
