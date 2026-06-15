const express = require('express');
const router = express.Router();
const db = require('../config/db');
const debug = require('debug')('app:routes:violations');

router.get('/', async (req, res) => {
  try {
    const { vessel_id, violation_type, status, page = 1, pageSize = 10 } = req.query;
    debug('获取违规记录列表: vessel_id=%s, type=%s, status=%s', vessel_id, violation_type, status);

    let sql = `SELECT vr.*, v.vessel_name, v.vessel_no, 
              z.zone_name, p.period_name 
              FROM violation_records vr 
              LEFT JOIN vessels v ON vr.vessel_id = v.id 
              LEFT JOIN no_fishing_zones z ON vr.zone_id = z.id 
              LEFT JOIN no_fishing_periods p ON vr.period_id = p.id 
              WHERE 1=1`;
    const params = [];

    if (vessel_id) {
      sql += ' AND vr.vessel_id = ?';
      params.push(vessel_id);
    }
    if (violation_type) {
      sql += ' AND vr.violation_type = ?';
      params.push(violation_type);
    }
    if (status !== undefined) {
      sql += ' AND vr.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY vr.id DESC LIMIT ? OFFSET ?';
    params.push(parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize));

    const [rows] = await db.query(sql, params);

    let countSql = 'SELECT COUNT(*) as total FROM violation_records WHERE 1=1';
    const countParams = [];
    if (vessel_id) {
      countSql += ' AND vessel_id = ?';
      countParams.push(vessel_id);
    }
    if (violation_type) {
      countSql += ' AND violation_type = ?';
      countParams.push(violation_type);
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
    debug('获取违规记录失败:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    debug('获取违规记录详情: id=%s', id);
    const [rows] = await db.query(
      `SELECT vr.*, v.vessel_name, v.vessel_no, 
       z.zone_name, p.period_name 
       FROM violation_records vr 
       LEFT JOIN vessels v ON vr.vessel_id = v.id 
       LEFT JOIN no_fishing_zones z ON vr.zone_id = z.id 
       LEFT JOIN no_fishing_periods p ON vr.period_id = p.id 
       WHERE vr.id = ?`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '违规记录不存在' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    debug('获取违规记录详情失败:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/:id/handle', async (req, res) => {
  try {
    const { id } = req.params;
    const { handler, remarks } = req.body;
    debug('处理违规记录: id=%s, handler=%s', id, handler);
    
    await db.query(
      'UPDATE violation_records SET status = 1, handled_at = NOW(), handler = ?, remarks = ? WHERE id = ?',
      [handler, remarks, id]
    );
    
    res.json({ success: true, message: '处理成功' });
  } catch (err) {
    debug('处理违规记录失败:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
