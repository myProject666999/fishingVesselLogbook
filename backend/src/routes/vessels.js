const express = require('express');
const router = express.Router();
const db = require('../config/db');
const debug = require('debug')('app:routes:vessels');

router.get('/', async (req, res) => {
  try {
    debug('获取渔船列表');
    const [rows] = await db.query('SELECT * FROM vessels WHERE status = 1 ORDER BY id DESC');
    res.json({ success: true, data: rows });
  } catch (err) {
    debug('获取渔船列表失败:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    debug('获取渔船详情: id=%s', id);
    const [rows] = await db.query('SELECT * FROM vessels WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '渔船不存在' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    debug('获取渔船详情失败:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { vessel_name, vessel_no, captain_name, phone, gross_tonnage, length } = req.body;
    debug('新增渔船: vessel_no=%s', vessel_no);
    const [result] = await db.query(
      'INSERT INTO vessels (vessel_name, vessel_no, captain_name, phone, gross_tonnage, length) VALUES (?, ?, ?, ?, ?, ?)',
      [vessel_name, vessel_no, captain_name, phone, gross_tonnage, length]
    );
    res.json({ success: true, data: { id: result.insertId } });
  } catch (err) {
    debug('新增渔船失败:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { vessel_name, captain_name, phone, gross_tonnage, length, status } = req.body;
    debug('更新渔船: id=%s', id);
    await db.query(
      'UPDATE vessels SET vessel_name = ?, captain_name = ?, phone = ?, gross_tonnage = ?, length = ?, status = ? WHERE id = ?',
      [vessel_name, captain_name, phone, gross_tonnage, length, status, id]
    );
    res.json({ success: true, message: '更新成功' });
  } catch (err) {
    debug('更新渔船失败:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    debug('删除渔船: id=%s', id);
    await db.query('UPDATE vessels SET status = 0 WHERE id = ?', [id]);
    res.json({ success: true, message: '删除成功' });
  } catch (err) {
    debug('删除渔船失败:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
