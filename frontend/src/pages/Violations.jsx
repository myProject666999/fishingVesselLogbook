import React, { useState, useEffect } from 'react';
import { Table, Tag, Button, Modal, Form, Input, Select, message, Space } from 'antd';
import { InfoCircleOutlined, CheckOutlined } from '@ant-design/icons';
import { violationAPI } from '../api';
import dayjs from 'dayjs';

function Violations() {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [handleVisible, setHandleVisible] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [form] = Form.useForm();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState(null);

  useEffect(() => {
    loadData();
  }, [page, pageSize, statusFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = { page, pageSize };
      if (statusFilter !== null) params.status = statusFilter;
      const res = await violationAPI.list(params);
      setData(res.data || []);
      setTotal(res.total || 0);
    } catch (err) {
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = (record) => {
    setCurrentItem(record);
    setDetailVisible(true);
  };

  const handleProcess = (record) => {
    setCurrentItem(record);
    form.resetFields();
    setHandleVisible(true);
  };

  const handleSubmitProcess = async () => {
    try {
      const values = await form.validateFields();
      await violationAPI.handle(currentItem.id, values);
      message.success('处理成功');
      setHandleVisible(false);
      loadData();
    } catch (err) {
      if (err.errorFields) return;
      message.error('操作失败');
    }
  };

  const getViolationType = (type) => {
    const typeMap = {
      1: { color: 'error', text: '禁渔区违规' },
      2: { color: 'warning', text: '禁渔期违规' }
    };
    return typeMap[type] || { color: 'default', text: '未知' };
  };

  const getStatus = (status) => {
    const statusMap = {
      0: { color: 'processing', text: '待处理' },
      1: { color: 'success', text: '已处理' }
    };
    return statusMap[status] || { color: 'default', text: '未知' };
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
    { title: '渔船', dataIndex: 'vessel_name', key: 'vessel_name' },
    {
      title: '违规类型',
      dataIndex: 'violation_type',
      key: 'violation_type',
      render: type => <Tag color={getViolationType(type).color}>{getViolationType(type).text}</Tag>
    },
    {
      title: '违规时间',
      dataIndex: 'violation_time',
      key: 'violation_time',
      render: t => dayjs(t).format('YYYY-MM-DD HH:mm:ss')
    },
    { title: '涉事区域', dataIndex: 'zone_name', key: 'zone_name', render: (t, r) => t || r.period_name || '-' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: s => <Tag color={getStatus(s).color}>{getStatus(s).text}</Tag>
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<InfoCircleOutlined />} onClick={() => handleViewDetail(record)}>详情</Button>
          {record.status === 0 && (
            <Button type="link" icon={<CheckOutlined />} onClick={() => handleProcess(record)}>处理</Button>
          )}
        </Space>
      )
    }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
        <h2 className="page-title" style={{ marginBottom: 0 }}>违规记录</h2>
        <Space>
          <Select
            style={{ width: 120 }}
            placeholder="状态筛选"
            allowClear
            onChange={val => setStatusFilter(val === undefined ? null : val)}
          >
            <Select.Option value={0}>待处理</Select.Option>
            <Select.Option value={1}>已处理</Select.Option>
          </Select>
        </Space>
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
        title="违规详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={600}
      >
        {currentItem && (
          <div>
            <p><strong>渔船:</strong> {currentItem.vessel_name} ({currentItem.vessel_no})</p>
            <p><strong>违规类型:</strong> {getViolationType(currentItem.violation_type).text}</p>
            <p><strong>违规时间:</strong> {dayjs(currentItem.violation_time).format('YYYY-MM-DD HH:mm:ss')}</p>
            <p><strong>违规地点:</strong> {currentItem.longitude}, {currentItem.latitude}</p>
            <p><strong>涉事区域:</strong> {currentItem.zone_name || currentItem.period_name || '-'}</p>
            <p><strong>状态:</strong> {getStatus(currentItem.status).text}</p>
            {currentItem.handler && (
              <p><strong>处理人:</strong> {currentItem.handler}</p>
            )}
            {currentItem.handled_at && (
              <p><strong>处理时间:</strong> {dayjs(currentItem.handled_at).format('YYYY-MM-DD HH:mm:ss')}</p>
            )}
            {currentItem.remarks && (
              <p><strong>处理备注:</strong> {currentItem.remarks}</p>
            )}
            {currentItem.evidence && (
              <div>
                <p><strong>证据数据:</strong></p>
                <pre style={{ background: '#f5f5f5', padding: '12px', borderRadius: '4px', maxHeight: '200px', overflow: 'auto' }}>
                  {typeof currentItem.evidence === 'string'
                    ? currentItem.evidence
                    : JSON.stringify(currentItem.evidence, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        title="处理违规"
        open={handleVisible}
        onOk={handleSubmitProcess}
        onCancel={() => setHandleVisible(false)}
        width={500}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="handler" label="处理人" rules={[{ required: true, message: '请输入处理人' }]}>
            <Input placeholder="请输入处理人姓名" />
          </Form.Item>
          <Form.Item name="remarks" label="处理备注">
            <Input.TextArea rows={4} placeholder="请输入处理备注" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default Violations;
