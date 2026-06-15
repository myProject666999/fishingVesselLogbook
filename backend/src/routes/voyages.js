const express = require('express');
const router = express.Router();
const db = require('../config/db');
const debug = require('debug')('app:routes:voyages');

router.get('/', async (req, res) => {
  try {
    const { vessel_id, status, page = 1, pageSize = 10 } = req.query;
    debug('获取航次列表: vessel_id=%s, status=%s', vessel_id, status);
    
    let sql = 'SELECT v.*, ves.vessel_name, ves.vessel_no FROM voyages v LEFT JOIN vessels ves ON v.vessel_id = ves.id WHERE 1=1';
    const params = [];
    
    if (vessel_id) {
      sql += ' AND v.vessel_id = ?';
      params.push(vessel_id);
    }
    if (status !== undefined) {
      sql += ' AND v.status = ?';
      params.push(status);
    }
    
    sql += ' ORDER BY v.id DESC LIMIT ? OFFSET ?';
    params.push(parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize));
    
    const [rows] = await db.query(sql, params);
    
    let countSql = 'SELECT COUNT(*) as total FROM voyages WHERE 1=1';
    const countParams = [];
    if (vessel_id) {
      countSql += ' AND vessel_id = ?';
      countParams.push(vessel_id);
    }
    if (status !== undefined) {
      countSql += ' AND status = ?';
      countParams.push(status);
    }
    const [countResult] = await db.query(countSql, countParams);
    
    res.json({ 
      success: true, 
      data: rows, 
      total: countResult[0].total,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    });
  } catch (err) {
    debug('获取航次列表失败:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    debug('获取航次详情: id=%s', id);
    const [rows] = await db.query(
      'SELECT v.*, ves.vessel_name, ves.vessel_no, ves.captain_name FROM voyages v LEFT JOIN vessels ves ON v.vessel_id = ves.id WHERE v.id = ?',
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '航次不存在' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    debug('获取航次详情失败:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { vessel_id, departure_port, departure_time } = req.body;
    const voyage_no = `VY${Date.now()}`;
    debug('开始新航次: vessel_id=%s, voyage_no=%s', vessel_id, voyage_no);
    
    const [result] = await db.query(
      'INSERT INTO voyages (vessel_id, voyage_no, departure_port, departure_time, status) VALUES (?, ?, ?, ?, 0)',
      [vessel_id, voyage_no, departure_port, departure_time || new Date()]
    );
    
    res.json({ success: true, data: { id: result.insertId, voyage_no } });
  } catch (err) {
    debug('创建航次失败:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/:id/finish', async (req, res) => {
  try {
    const { id } = req.params;
    const { arrival_port, arrival_time } = req.body;
    debug('结束航次: id=%s', id);
    
    await db.query(
      'UPDATE voyages SET arrival_port = ?, arrival_time = ?, status = 1 WHERE id = ?',
      [arrival_port, arrival_time || new Date(), id]
    );
    
    res.json({ success: true, message: '航次已结束' });
  } catch (err) {
    debug('结束航次失败:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
