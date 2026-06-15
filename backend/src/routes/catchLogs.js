const express = require('express');
const router = express.Router();
const db = require('../config/db');
const debug = require('debug')('app:routes:catchLogs');

router.get('/', async (req, res) => {
  try {
    const { voyage_id, vessel_id, page = 1, pageSize = 10 } = req.query;
    debug('获取捕捞日志列表: voyage_id=%s, vessel_id=%s', voyage_id, vessel_id);

    let sql = 'SELECT cl.*, v.vessel_name, v.vessel_no FROM catch_logs cl LEFT JOIN vessels v ON cl.vessel_id = v.id WHERE 1=1';
    const params = [];

    if (voyage_id) {
      sql += ' AND cl.voyage_id = ?';
      params.push(voyage_id);
    }
    if (vessel_id) {
      sql += ' AND cl.vessel_id = ?';
      params.push(vessel_id);
    }

    sql += ' ORDER BY cl.id DESC LIMIT ? OFFSET ?';
    params.push(parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize));

    const [rows] = await db.query(sql, params);

    let countSql = 'SELECT COUNT(*) as total FROM catch_logs WHERE 1=1';
    const countParams = [];
    if (voyage_id) {
      countSql += ' AND voyage_id = ?';
      countParams.push(voyage_id);
    }
    if (vessel_id) {
      countSql += ' AND vessel_id = ?';
      countParams.push(vessel_id);
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
    debug('获取捕捞日志失败:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    debug('获取捕捞日志详情: id=%s', id);
    const [rows] = await db.query('SELECT * FROM catch_logs WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '日志不存在' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    debug('获取捕捞日志详情失败:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { voyage_id, vessel_id, log_date, fish_type, weight, estimated_value, buyer, fishing_area, remarks } = req.body;
    debug('新增捕捞日志: vessel_id=%s, log_date=%s', vessel_id, log_date);

    const inNoFishingPeriod = await checkNoFishingPeriod(log_date);
    if (inNoFishingPeriod) {
      debug('禁渔期，拒绝录入: log_date=%s', log_date);
      return res.status(400).json({ 
        success: false, 
        message: `日期 ${log_date} 处于禁渔期内，禁止录入捕捞日志`,
        violation: true,
        violation_type: 'no_fishing_period'
      });
    }

    const [voyageRows] = await db.query('SELECT * FROM voyages WHERE id = ?', [voyage_id]);
    if (voyageRows.length > 0 && voyageRows[0].status === 0) {
      debug('警告: 航次尚未结束');
    }

    const [result] = await db.query(
      'INSERT INTO catch_logs (voyage_id, vessel_id, log_date, fish_type, weight, estimated_value, buyer, fishing_area, remarks) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [voyage_id, vessel_id, log_date, fish_type, weight, estimated_value, buyer, fishing_area, remarks]
    );

    res.json({ success: true, data: { id: result.insertId } });
  } catch (err) {
    debug('新增捕捞日志失败:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { log_date, fish_type, weight, estimated_value, buyer, fishing_area, remarks } = req.body;
    debug('更新捕捞日志: id=%s', id);

    const inNoFishingPeriod = await checkNoFishingPeriod(log_date);
    if (inNoFishingPeriod) {
      return res.status(400).json({ 
        success: false, 
        message: `日期 ${log_date} 处于禁渔期内，禁止修改为该日期`,
        violation: true,
        violation_type: 'no_fishing_period'
      });
    }

    await db.query(
      'UPDATE catch_logs SET log_date = ?, fish_type = ?, weight = ?, estimated_value = ?, buyer = ?, fishing_area = ?, remarks = ? WHERE id = ?',
      [log_date, fish_type, weight, estimated_value, buyer, fishing_area, remarks, id]
    );

    res.json({ success: true, message: '更新成功' });
  } catch (err) {
    debug('更新捕捞日志失败:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    debug('删除捕捞日志: id=%s', id);
    await db.query('DELETE FROM catch_logs WHERE id = ?', [id]);
    res.json({ success: true, message: '删除成功' });
  } catch (err) {
    debug('删除捕捞日志失败:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

async function checkNoFishingPeriod(date) {
  try {
    const [rows] = await db.query(
      'SELECT * FROM no_fishing_periods WHERE is_active = 1 AND start_date <= ? AND end_date >= ?',
      [date, date]
    );
    return rows.length > 0;
  } catch (err) {
    debug('检查禁渔期失败:', err.message);
    return false;
  }
}

module.exports = router;
