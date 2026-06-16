const express = require('express');
const router = express.Router();
const db = require('../config/db');
const redisClient = require('../config/redis');
const debug = require('debug')('app:routes:noFishing');

router.get('/zones', async (req, res) => {
  try {
    debug('获取禁渔区列表');
    const [rows] = await db.query('SELECT * FROM no_fishing_zones ORDER BY id DESC');
    const zones = rows.map(row => ({
      ...row,
      polygon: JSON.parse(row.polygon_coords)
    }));
    res.json({ success: true, data: zones });
  } catch (err) {
    debug('获取禁渔区失败:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/zones/:id', async (req, res) => {
  try {
    const { id } = req.params;
    debug('获取禁渔区详情: id=%s', id);
    const [rows] = await db.query('SELECT * FROM no_fishing_zones WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '禁渔区不存在' });
    }
    const zone = {
      ...rows[0],
      polygon: JSON.parse(rows[0].polygon_coords)
    };
    res.json({ success: true, data: zone });
  } catch (err) {
    debug('获取禁渔区详情失败:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/zones', async (req, res) => {
  try {
    const { zone_name, zone_type, polygon, description } = req.body;
    debug('新增禁渔区: zone_name=%s', zone_name);
    
    const polygon_coords = JSON.stringify(polygon);
    const [result] = await db.query(
      'INSERT INTO no_fishing_zones (zone_name, zone_type, polygon_coords, description) VALUES (?, ?, ?, ?)',
      [zone_name, zone_type, polygon_coords, description]
    );

    await clearZoneCache();
    
    res.json({ success: true, data: { id: result.insertId } });
  } catch (err) {
    debug('新增禁渔区失败:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/zones/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { zone_name, zone_type, polygon, description, is_active } = req.body;
    debug('更新禁渔区: id=%s', id);
    
    const polygon_coords = JSON.stringify(polygon);
    await db.query(
      'UPDATE no_fishing_zones SET zone_name = ?, zone_type = ?, polygon_coords = ?, description = ?, is_active = ? WHERE id = ?',
      [zone_name, zone_type, polygon_coords, description, is_active, id]
    );

    await clearZoneCache();
    
    res.json({ success: true, message: '更新成功' });
  } catch (err) {
    debug('更新禁渔区失败:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/zones/:id', async (req, res) => {
  try {
    const { id } = req.params;
    debug('删除禁渔区: id=%s', id);
    await db.query('DELETE FROM no_fishing_zones WHERE id = ?', [id]);
    await clearZoneCache();
    res.json({ success: true, message: '删除成功' });
  } catch (err) {
    debug('删除禁渔区失败:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/periods', async (req, res) => {
  try {
    debug('获取禁渔期列表');
    const [rows] = await db.query(`
      SELECT id, period_name, zone_ids, description, is_active, created_at, updated_at,
             DATE_FORMAT(start_date, '%Y-%m-%d') as start_date,
             DATE_FORMAT(end_date, '%Y-%m-%d') as end_date
      FROM no_fishing_periods ORDER BY id DESC
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    debug('获取禁渔期失败:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/periods/:id', async (req, res) => {
  try {
    const { id } = req.params;
    debug('获取禁渔期详情: id=%s', id);
    const [rows] = await db.query(`
      SELECT id, period_name, zone_ids, description, is_active, created_at, updated_at,
             DATE_FORMAT(start_date, '%Y-%m-%d') as start_date,
             DATE_FORMAT(end_date, '%Y-%m-%d') as end_date
      FROM no_fishing_periods WHERE id = ?
    `, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '禁渔期不存在' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    debug('获取禁渔期详情失败:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/periods', async (req, res) => {
  try {
    const { period_name, start_date, end_date, zone_ids, description } = req.body;
    debug('新增禁渔期: period_name=%s', period_name);
    
    const [result] = await db.query(
      'INSERT INTO no_fishing_periods (period_name, start_date, end_date, zone_ids, description) VALUES (?, ?, ?, ?, ?)',
      [period_name, start_date, end_date, zone_ids || '', description]
    );
    
    res.json({ success: true, data: { id: result.insertId } });
  } catch (err) {
    debug('新增禁渔期失败:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/periods/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { period_name, start_date, end_date, zone_ids, description, is_active } = req.body;
    debug('更新禁渔期: id=%s', id);
    
    await db.query(
      'UPDATE no_fishing_periods SET period_name = ?, start_date = ?, end_date = ?, zone_ids = ?, description = ?, is_active = ? WHERE id = ?',
      [period_name, start_date, end_date, zone_ids || '', description, is_active, id]
    );
    
    res.json({ success: true, message: '更新成功' });
  } catch (err) {
    debug('更新禁渔期失败:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/periods/:id', async (req, res) => {
  try {
    const { id } = req.params;
    debug('删除禁渔期: id=%s', id);
    await db.query('DELETE FROM no_fishing_periods WHERE id = ?', [id]);
    res.json({ success: true, message: '删除成功' });
  } catch (err) {
    debug('删除禁渔期失败:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/check-point', async (req, res) => {
  try {
    const { longitude, latitude, date } = req.body;
    debug('检查点: lng=%s, lat=%s, date=%s', longitude, latitude, date);

    const [zones] = await db.query('SELECT * FROM no_fishing_zones WHERE is_active = 1');
    const { pointInPolygon } = require('../utils/geoUtils');
    
    const point = { lat: latitude, lng: longitude };
    const violatedZones = [];
    
    for (const zone of zones) {
      const polygon = JSON.parse(zone.polygon_coords);
      if (pointInPolygon(point, polygon)) {
        violatedZones.push({
          id: zone.id,
          zone_name: zone.zone_name,
          zone_type: zone.zone_type
        });
      }
    }

    let inNoFishingPeriod = false;
    let violatedPeriod = null;
    if (date) {
      const [periods] = await db.query(
        'SELECT * FROM no_fishing_periods WHERE is_active = 1 AND start_date <= ? AND end_date >= ?',
        [date, date]
      );
      if (periods.length > 0) {
        inNoFishingPeriod = true;
        violatedPeriod = periods[0];
      }
    }

    res.json({
      success: true,
      data: {
        in_no_fishing_zone: violatedZones.length > 0,
        violated_zones: violatedZones,
        in_no_fishing_period: inNoFishingPeriod,
        violated_period: violatedPeriod,
        is_violation: violatedZones.length > 0 || inNoFishingPeriod
      }
    });
  } catch (err) {
    debug('检查点失败:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

async function clearZoneCache() {
  try {
    await redisClient.del('no_fishing_zones:active');
    debug('禁渔区缓存已清除');
  } catch (err) {
    debug('清除禁渔区缓存失败:', err.message);
  }
}

module.exports = router;
