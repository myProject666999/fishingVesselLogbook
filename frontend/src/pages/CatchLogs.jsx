import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Select, Input, InputNumber, DatePicker, message, Popconfirm, Space, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { catchLogAPI, voyageAPI, buyerAPI, noFishingAPI } from '../api';
import dayjs from 'dayjs';

function CatchLogs() {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [voyages, setVoyages] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [noFishingPeriods, setNoFishingPeriods] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form] = Form.useForm();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    loadData();
    loadVoyages();
    loadBuyers();
    loadNoFishingPeriods();
  }, [page, pageSize]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await catchLogAPI.list({ page, pageSize });
      setData(res.data || []);
      setTotal(res.total || 0);
    } catch (err) {
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const loadVoyages = async () => {
    try {
      const res = await voyageAPI.list({ pageSize: 100 });
      setVoyages(res.data || []);
    } catch (err) {
      console.error('加载航次列表失败');
    }
  };

  const loadBuyers = async () => {
    try {
      const res = await buyerAPI.list();
      setBuyers(res.data || []);
    } catch (err) {
      console.error('加载买家列表失败');
    }
  };

  const loadNoFishingPeriods = async () => {
    try {
      const res = await noFishingAPI.getPeriods();
      const activePeriods = (res.data || []).filter(p => p.is_active === 1);
      setNoFishingPeriods(activePeriods);
    } catch (err) {
      console.error('加载禁渔期列表失败');
    }
  };

  const disabledDate = (current) => {
    if (!current) return false;
    const currentDate = current.format('YYYY-MM-DD');
    for (const period of noFishingPeriods) {
      const startDate = dayjs(period.start_date).format('YYYY-MM-DD');
      const endDate = dayjs(period.end_date).format('YYYY-MM-DD');
      if (currentDate >= startDate && currentDate <= endDate) {
        return true;
      }
    }
    return false;
  };

  const dateCellRender = (current) => {
    if (!current) return null;
    const currentDate = current.format('YYYY-MM-DD');
    for (const period of noFishingPeriods) {
      const startDate = dayjs(period.start_date).format('YYYY-MM-DD');
      const endDate = dayjs(period.end_date).format('YYYY-MM-DD');
      if (currentDate >= startDate && currentDate <= endDate) {
        return (
          <div style={{ position: 'relative', height: '100%' }}>
            <div style={{ color: '#ff4d4f', fontWeight: 'bold' }}>
              {current.date()}
            </div>
            <div style={{ fontSize: '10px', color: '#ff4d4f' }}>禁渔</div>
          </div>
        );
      }
    }
    return <div>{current.date()}</div>;
  };

  const handleAdd = () => {
    setEditingItem(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingItem(record);
    form.setFieldsValue({
      ...record,
      log_date: record.log_date ? dayjs(record.log_date) : null
    });
    setModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await catchLogAPI.delete(id);
      message.success('删除成功');
      loadData();
    } catch (err) {
      message.error('删除失败');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const voyage = voyages.find(v => v.id === values.voyage_id);
      const submitData = {
        ...values,
        vessel_id: voyage?.vessel_id,
        log_date: values.log_date?.format('YYYY-MM-DD')
      };

      if (editingItem) {
        await catchLogAPI.update(editingItem.id, submitData);
        message.success('更新成功');
      } else {
        await catchLogAPI.create(submitData);
        message.success('添加成功');
      }
      setModalVisible(false);
      loadData();
    } catch (err) {
      if (err.errorFields) return;
      if (err.response?.data?.violation) {
        message.error(err.response.data.message);
      } else {
        message.error('操作失败');
      }
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
    { title: '渔船', dataIndex: 'vessel_name', key: 'vessel_name' },
    { title: '作业日期', dataIndex: 'log_date', key: 'log_date' },
    { title: '鱼种', dataIndex: 'fish_type', key: 'fish_type' },
    { title: '重量(公斤)', dataIndex: 'weight', key: 'weight' },
    { title: '预估价值(元)', dataIndex: 'estimated_value', key: 'estimated_value' },
    { title: '买家', dataIndex: 'buyer', key: 'buyer' },
    { title: '作业海域', dataIndex: 'fishing_area', key: 'fishing_area' },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>编辑</Button>
          <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h2 className="page-title" style={{ marginBottom: 0 }}>捕捞日志</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增日志</Button>
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
        title={editingItem ? '编辑捕捞日志' : '新增捕捞日志'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="voyage_id" label="所属航次" rules={[{ required: true, message: '请选择航次' }]}>
            <Select placeholder="请选择航次">
              {voyages.map(v => (
                <Select.Option key={v.id} value={v.id}>
                  {v.voyage_no} - {v.vessel_name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="log_date" label="作业日期" rules={[{ required: true, message: '请选择作业日期' }]}>
            <DatePicker 
              style={{ width: '100%' }} 
              placeholder="请选择作业日期（禁渔期已标记为红色且不可选）"
              disabledDate={disabledDate}
              dateCellRender={dateCellRender}
            />
          </Form.Item>
          {noFishingPeriods.length > 0 && (
            <div style={{ marginBottom: '16px', padding: '12px', background: '#fff2f0', border: '1px solid #ffccc7', borderRadius: '4px' }}>
              <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', color: '#ff4d4f' }}>⚠️ 禁渔期提醒：</p>
              {noFishingPeriods.map(p => (
                <Tag key={p.id} color="error" style={{ marginBottom: '4px' }}>
                  {p.period_name}: {dayjs(p.start_date).format('YYYY-MM-DD')} 至 {dayjs(p.end_date).format('YYYY-MM-DD')}
                </Tag>
              ))}
            </div>
          )}
          <Form.Item name="fish_type" label="鱼种" rules={[{ required: true, message: '请输入鱼种' }]}>
            <Input placeholder="请输入鱼种，如：带鱼、黄鱼、对虾等" />
          </Form.Item>
          <Form.Item name="weight" label="重量(公斤)" rules={[{ required: true, message: '请输入重量' }]}>
            <InputNumber style={{ width: '100%' }} min={0} placeholder="请输入重量" />
          </Form.Item>
          <Form.Item name="estimated_value" label="预估价值(元)">
            <InputNumber style={{ width: '100%' }} min={0} placeholder="请输入预估价值" />
          </Form.Item>
          <Form.Item name="buyer" label="买家">
            <Select placeholder="请选择或输入买家" allowClear>
              {buyers.map(b => (
                <Select.Option key={b.id} value={b.buyer_name}>{b.buyer_name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="fishing_area" label="作业海域">
            <Input placeholder="请输入作业海域" />
          </Form.Item>
          <Form.Item name="remarks" label="备注">
            <Input.TextArea rows={3} placeholder="请输入备注" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default CatchLogs;
