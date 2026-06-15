const express = require('express');
const router = express.Router();
const db = require('../config/db');
const debug = require('debug')('app:routes:buyers');

router.get('/', async (req, res) => {
  try {
    debug('获取买家列表');
    const [rows] = await db.query('SELECT * FROM buyers WHERE status = 1 ORDER BY id DESC');
    res.json({ success: true, data: rows });
  } catch (err) {
    debug('获取买家列表失败:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    debug('获取买家详情: id=%s', id);
    const [rows] = await db.query('SELECT * FROM buyers WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '买家不存在' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    debug('获取买家详情失败:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { buyer_name, contact_person, phone, address } = req.body;
    debug('新增买家: buyer_name=%s', buyer_name);
    const [result] = await db.query(
      'INSERT INTO buyers (buyer_name, contact_person, phone, address) VALUES (?, ?, ?, ?)',
      [buyer_name, contact_person, phone, address]
    );
    res.json({ success: true, data: { id: result.insertId } });
  } catch (err) {
    debug('新增买家失败:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { buyer_name, contact_person, phone, address, status } = req.body;
    debug('更新买家: id=%s', id);
    await db.query(
      'UPDATE buyers SET buyer_name = ?, contact_person = ?, phone = ?, address = ?, status = ? WHERE id = ?',
      [buyer_name, contact_person, phone, address, status, id]
    );
    res.json({ success: true, message: '更新成功' });
  } catch (err) {
    debug('更新买家失败:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    debug('删除买家: id=%s', id);
    await db.query('UPDATE buyers SET status = 0 WHERE id = ?', [id]);
    res.json({ success: true, message: '删除成功' });
  } catch (err) {
    debug('删除买家失败:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
