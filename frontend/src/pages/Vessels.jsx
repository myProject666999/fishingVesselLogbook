import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, message, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { vesselAPI } from '../api';

function Vessels() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await vesselAPI.list();
      setData(res.data || []);
    } catch (err) {
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingItem(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingItem(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await vesselAPI.delete(id);
      message.success('删除成功');
      loadData();
    } catch (err) {
      message.error('删除失败');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingItem) {
        await vesselAPI.update(editingItem.id, values);
        message.success('更新成功');
      } else {
        await vesselAPI.create(values);
        message.success('添加成功');
      }
      setModalVisible(false);
      loadData();
    } catch (err) {
      if (err.errorFields) return;
      message.error('操作失败');
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
    { title: '船名', dataIndex: 'vessel_name', key: 'vessel_name' },
    { title: '船舶编号', dataIndex: 'vessel_no', key: 'vessel_no' },
    { title: '船长', dataIndex: 'captain_name', key: 'captain_name' },
    { title: '联系电话', dataIndex: 'phone', key: 'phone' },
    { title: '总吨位(吨)', dataIndex: 'gross_tonnage', key: 'gross_tonnage' },
    { title: '船长(米)', dataIndex: 'length', key: 'length' },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <span>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>编辑</Button>
          <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </span>
      )
    }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h2 className="page-title" style={{ marginBottom: 0 }}>渔船管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增渔船</Button>
      </div>

      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title={editingItem ? '编辑渔船' : '新增渔船'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="vessel_name" label="船名" rules={[{ required: true, message: '请输入船名' }]}>
            <Input placeholder="请输入船名" />
          </Form.Item>
          <Form.Item name="vessel_no" label="船舶编号" rules={[{ required: true, message: '请输入船舶编号' }]}>
            <Input placeholder="请输入船舶编号" />
          </Form.Item>
          <Form.Item name="captain_name" label="船长姓名">
            <Input placeholder="请输入船长姓名" />
          </Form.Item>
          <Form.Item name="phone" label="联系电话">
            <Input placeholder="请输入联系电话" />
          </Form.Item>
          <Form.Item name="gross_tonnage" label="总吨位(吨)">
            <InputNumber style={{ width: '100%' }} placeholder="请输入总吨位" />
          </Form.Item>
          <Form.Item name="length" label="船长(米)">
            <InputNumber style={{ width: '100%' }} placeholder="请输入船长" />
          </Form.Item>
          {editingItem && (
            <Form.Item name="status" label="状态">
              <InputNumber min={0} max={1} placeholder="1-正常 0-停用" />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
}

export default Vessels;
