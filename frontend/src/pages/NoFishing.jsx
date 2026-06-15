import React, { useState, useEffect } from 'react';
import { Tabs, Table, Button, Modal, Form, Input, InputNumber, DatePicker, message, Popconfirm, Space, Card, Row, Col } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SafetyOutlined } from '@ant-design/icons';
import { noFishingAPI } from '../api';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

function NoFishing() {
  const [zones, setZones] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [zoneModalVisible, setZoneModalVisible] = useState(false);
  const [periodModalVisible, setPeriodModalVisible] = useState(false);
  const [editingZone, setEditingZone] = useState(null);
  const [editingPeriod, setEditingPeriod] = useState(null);
  const [zoneForm] = Form.useForm();
  const [periodForm] = Form.useForm();

  useEffect(() => {
    loadZones();
    loadPeriods();
  }, []);

  const loadZones = async () => {
    try {
      const res = await noFishingAPI.getZones();
      setZones(res.data || []);
    } catch (err) {
      message.error('加载禁渔区失败');
    }
  };

  const loadPeriods = async () => {
    try {
      const res = await noFishingAPI.getPeriods();
      setPeriods(res.data || []);
    } catch (err) {
      message.error('加载禁渔期失败');
    }
  };

  const handleAddZone = () => {
    setEditingZone(null);
    zoneForm.resetFields();
    setZoneModalVisible(true);
  };

  const handleEditZone = (record) => {
    setEditingZone(record);
    zoneForm.setFieldsValue({
      ...record,
      polygon_str: JSON.stringify(record.polygon, null, 2)
    });
    setZoneModalVisible(true);
  };

  const handleDeleteZone = async (id) => {
    try {
      await noFishingAPI.deleteZone(id);
      message.success('删除成功');
      loadZones();
    } catch (err) {
      message.error('删除失败');
    }
  };

  const handleSubmitZone = async () => {
    try {
      const values = await zoneForm.validateFields();
      let polygon;
      try {
        polygon = JSON.parse(values.polygon_str);
      } catch (e) {
        message.error('多边形坐标格式错误');
        return;
      }

      if (!Array.isArray(polygon) || polygon.length < 3) {
        message.error('多边形至少需要3个点');
        return;
      }

      const data = {
        zone_name: values.zone_name,
        zone_type: values.zone_type,
        description: values.description,
        polygon: polygon,
        is_active: values.is_active ?? 1
      };

      if (editingZone) {
        await noFishingAPI.updateZone(editingZone.id, data);
        message.success('更新成功');
      } else {
        await noFishingAPI.createZone(data);
        message.success('添加成功');
      }
      setZoneModalVisible(false);
      loadZones();
    } catch (err) {
      if (err.errorFields) return;
      message.error('操作失败');
    }
  };

  const handleAddPeriod = () => {
    setEditingPeriod(null);
    periodForm.resetFields();
    setPeriodModalVisible(true);
  };

  const handleEditPeriod = (record) => {
    setEditingPeriod(record);
    periodForm.setFieldsValue({
      ...record,
      date_range: [dayjs(record.start_date), dayjs(record.end_date)]
    });
    setPeriodModalVisible(true);
  };

  const handleDeletePeriod = async (id) => {
    try {
      await noFishingAPI.deletePeriod(id);
      message.success('删除成功');
      loadPeriods();
    } catch (err) {
      message.error('删除失败');
    }
  };

  const handleSubmitPeriod = async () => {
    try {
      const values = await periodForm.validateFields();
      const data = {
        period_name: values.period_name,
        start_date: values.date_range[0].format('YYYY-MM-DD'),
        end_date: values.date_range[1].format('YYYY-MM-DD'),
        description: values.description,
        is_active: values.is_active ?? 1
      };

      if (editingPeriod) {
        await noFishingAPI.updatePeriod(editingPeriod.id, data);
        message.success('更新成功');
      } else {
        await noFishingAPI.createPeriod(data);
        message.success('添加成功');
      }
      setPeriodModalVisible(false);
      loadPeriods();
    } catch (err) {
      if (err.errorFields) return;
      message.error('操作失败');
    }
  };

  const zoneColumns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
    { title: '禁渔区名称', dataIndex: 'zone_name', key: 'zone_name' },
    { title: '类型', dataIndex: 'zone_type', key: 'zone_type' },
    { title: '描述', dataIndex: 'description', key: 'description' },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      render: active => active ? '启用' : '禁用'
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEditZone(record)}>编辑</Button>
          <Popconfirm title="确定删除？" onConfirm={() => handleDeleteZone(record.id)}>
            <Button type="link" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  const periodColumns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
    { title: '禁渔期名称', dataIndex: 'period_name', key: 'period_name' },
    { title: '开始日期', dataIndex: 'start_date', key: 'start_date' },
    { title: '结束日期', dataIndex: 'end_date', key: 'end_date' },
    { title: '描述', dataIndex: 'description', key: 'description' },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      render: active => active ? '启用' : '禁用'
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEditPeriod(record)}>编辑</Button>
          <Popconfirm title="确定删除？" onConfirm={() => handleDeletePeriod(record.id)}>
            <Button type="link" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  const renderZoneMap = (polygon) => {
    if (!polygon || polygon.length < 3) return null;

    const minLng = Math.min(...polygon.map(p => p.lng));
    const maxLng = Math.max(...polygon.map(p => p.lng));
    const minLat = Math.min(...polygon.map(p => p.lat));
    const maxLat = Math.max(...polygon.map(p => p.lat));

    const width = 200;
    const height = 150;
    const padding = 10;

    const scaleX = (width - 2 * padding) / (maxLng - minLng || 1);
    const scaleY = (height - 2 * padding) / (maxLat - minLat || 1);
    const scale = Math.min(scaleX, scaleY);

    const points = polygon.map(p => ({
      x: padding + (p.lng - minLng) * scale,
      y: height - padding - (p.lat - minLat) * scale
    }));

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <path d={pathD} fill="rgba(255, 77, 79, 0.3)" stroke="#ff4d4f" strokeWidth="2" />
      </svg>
    );
  };

  return (
    <div>
      <h2 className="page-title">禁渔管理</h2>

      <Tabs defaultActiveKey="zones" items={[
        {
          key: 'zones',
          label: <span><SafetyOutlined />禁渔区管理</span>,
          children: (
            <div>
              <div style={{ textAlign: 'right', marginBottom: '16px' }}>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAddZone}>新增禁渔区</Button>
              </div>
              <Table
                columns={zoneColumns}
                dataSource={zones}
                rowKey="id"
                pagination={{ pageSize: 10 }}
                expandable={{
                  expandedRowRender: record => (
                    <Card title="多边形范围">
                      <Row gutter={16}>
                        <Col span={8}>
                          {renderZoneMap(record.polygon)}
                        </Col>
                        <Col span={16}>
                          <p><strong>坐标点数量:</strong> {record.polygon?.length || 0} 个</p>
                          <p><strong>坐标数据:</strong></p>
                          <pre style={{ background: '#f5f5f5', padding: '12px', borderRadius: '4px', maxHeight: '200px', overflow: 'auto' }}>
                            {JSON.stringify(record.polygon, null, 2)}
                          </pre>
                        </Col>
                      </Row>
                    </Card>
                  )
                }}
              />
            </div>
          )
        },
        {
          key: 'periods',
          label: <span>📅 禁渔期管理</span>,
          children: (
            <div>
              <div style={{ textAlign: 'right', marginBottom: '16px' }}>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAddPeriod}>新增禁渔期</Button>
              </div>
              <Table
                columns={periodColumns}
                dataSource={periods}
                rowKey="id"
                pagination={{ pageSize: 10 }}
              />
            </div>
          )
        }
      ]} />

      <Modal
        title={editingZone ? '编辑禁渔区' : '新增禁渔区'}
        open={zoneModalVisible}
        onOk={handleSubmitZone}
        onCancel={() => setZoneModalVisible(false)}
        width={600}
      >
        <Form form={zoneForm} layout="vertical">
          <Form.Item name="zone_name" label="禁渔区名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="请输入禁渔区名称" />
          </Form.Item>
          <Form.Item name="zone_type" label="禁渔区类型">
            <Input placeholder="如：产卵保护区、养殖保护区等" />
          </Form.Item>
          <Form.Item name="polygon_str" label="多边形坐标 (JSON格式)" rules={[{ required: true, message: '请输入多边形坐标' }]}>
            <Input.TextArea
              rows={6}
              placeholder='[{"lng":121.0,"lat":38.5},{"lng":122.0,"lat":38.5},{"lng":122.0,"lat":39.0},{"lng":121.0,"lat":39.0}]'
            />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} placeholder="请输入描述" />
          </Form.Item>
          <Form.Item name="is_active" label="是否启用">
            <InputNumber min={0} max={1} placeholder="1-启用 0-禁用" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editingPeriod ? '编辑禁渔期' : '新增禁渔期'}
        open={periodModalVisible}
        onOk={handleSubmitPeriod}
        onCancel={() => setPeriodModalVisible(false)}
        width={600}
      >
        <Form form={periodForm} layout="vertical">
          <Form.Item name="period_name" label="禁渔期名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="请输入禁渔期名称" />
          </Form.Item>
          <Form.Item name="date_range" label="起止日期" rules={[{ required: true, message: '请选择日期' }]}>
            <RangePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} placeholder="请输入描述" />
          </Form.Item>
          <Form.Item name="is_active" label="是否启用">
            <InputNumber min={0} max={1} placeholder="1-启用 0-禁用" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default NoFishing;
