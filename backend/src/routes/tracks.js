const express = require('express');
const router = express.Router();
const db = require('../config/db');
const redisClient = require('../config/redis');
const { douglasPeucker, pointInPolygon, calculateTotalDistance } = require('../utils/geoUtils');
const debug = require('debug')('app:routes:tracks');

const SIMPLIFY_TOLERANCE = 10;

router.post('/upload', async (req, res) => {
  try {
    const { voyage_id, vessel_id, points } = req.body;
    debug('轨迹上传: voyage_id=%s, vessel_id=%s, 点数=%d', voyage_id, vessel_id, points.length);

    if (!points || points.length === 0) {
      return res.json({ success: true, message: '无数据' });
    }

    const allZones = await getActiveNoFishingZones();
    const violations = [];

    for (const point of points) {
      await db.query(
        'INSERT INTO track_points (voyage_id, vessel_id, longitude, latitude, speed, heading, timestamp, is_offline_upload) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [voyage_id, vessel_id, point.longitude, point.latitude, point.speed || null, point.heading || null, point.timestamp, point.is_offline || 0]
      );

      try {
        await redisClient.geoAdd(`vessel:${vessel_id}:track`, {
          longitude: point.longitude,
          latitude: point.latitude,
          member: `${voyage_id}:${point.timestamp}`
        });
      } catch (redisErr) {
        debug('Redis GEO添加失败:', redisErr.message);
      }

      for (const zone of allZones) {
        if (pointInPolygon(
          { lat: point.latitude, lng: point.longitude },
          zone.polygon
        )) {
          debug('检测到禁渔区违规: vessel_id=%s, zone_id=%d', vessel_id, zone.id);
          
          const [violationResult] = await db.query(
            'INSERT INTO violation_records (vessel_id, voyage_id, violation_type, violation_time, longitude, latitude, zone_id, evidence) VALUES (?, ?, 1, ?, ?, ?, ?, ?)',
            [vessel_id, voyage_id, point.timestamp, point.longitude, point.latitude, zone.id, JSON.stringify(point)]
          );
          
          violations.push({
            id: violationResult.insertId,
            type: 'no_fishing_zone',
            zone_name: zone.zone_name,
            point: point
          });
        }
      }
    }

    res.json({ 
      success: true, 
      message: '上传成功', 
      violations: violations,
      point_count: points.length
    });
  } catch (err) {
    debug('轨迹上传失败:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/batch-upload', async (req, res) => {
  try {
    const { voyage_id, vessel_id, points } = req.body;
    debug('离线补传: voyage_id=%s, vessel_id=%s, 点数=%d', voyage_id, vessel_id, points.length);

    if (!points || points.length === 0) {
      return res.json({ success: true, message: '无数据' });
    }

    const allZones = await getActiveNoFishingZones();
    const violations = [];

    const values = points.map(p => [
      voyage_id, vessel_id, p.longitude, p.latitude, p.speed || null, p.heading || null, p.timestamp, 1
    ]);

    const placeholders = values.map(() => '(?, ?, ?, ?, ?, ?, ?, ?)').join(',');
    const flatValues = values.flat();
    
    await db.query(
      `INSERT INTO track_points (voyage_id, vessel_id, longitude, latitude, speed, heading, timestamp, is_offline_upload) VALUES ${placeholders}`,
      flatValues
    );

    for (const point of points) {
      for (const zone of allZones) {
        if (pointInPolygon(
          { lat: point.latitude, lng: point.longitude },
          zone.polygon
        )) {
          const [violationResult] = await db.query(
            'INSERT INTO violation_records (vessel_id, voyage_id, violation_type, violation_time, longitude, latitude, zone_id, evidence) VALUES (?, ?, 1, ?, ?, ?, ?, ?)',
            [vessel_id, voyage_id, point.timestamp, point.longitude, point.latitude, zone.id, JSON.stringify(point)]
          );
          
          violations.push({
            id: violationResult.insertId,
            type: 'no_fishing_zone',
            zone_name: zone.zone_name,
            point: point
          });
        }
      }
    }

    res.json({ 
      success: true, 
      message: '补传成功', 
      violations: violations,
      point_count: points.length
    });
  } catch (err) {
    debug('离线补传失败:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/voyage/:voyageId', async (req, res) => {
  try {
    const { voyageId } = req.params;
    const { simplified = 'false' } = req.query;
    debug('获取航次轨迹: voyage_id=%s, simplified=%s', voyageId, simplified);

    let sql = 'SELECT * FROM track_points WHERE voyage_id = ? ORDER BY timestamp ASC';
    const [rows] = await db.query(sql, [voyageId]);

    let points = rows;
    
    if (simplified === 'true' && rows.length > 2) {
      const trackPoints = rows.map(r => ({
        lat: r.latitude,
        lng: r.longitude,
        ...r
      }));
      const simplifiedPoints = douglasPeucker(trackPoints, SIMPLIFY_TOLERANCE);
      points = simplifiedPoints;
      
      await db.query('UPDATE track_points SET is_simplified = 0 WHERE voyage_id = ?', [voyageId]);
      for (const sp of simplifiedPoints) {
        await db.query('UPDATE track_points SET is_simplified = 1 WHERE id = ?', [sp.id]);
      }
    }

    const totalDistance = calculateTotalDistance(points);

    res.json({ 
      success: true, 
      data: points,
      total_distance: totalDistance,
      point_count: points.length
    });
  } catch (err) {
    debug('获取轨迹失败:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/simplify/:voyageId', async (req, res) => {
  try {
    const { voyageId } = req.params;
    const { tolerance = SIMPLIFY_TOLERANCE } = req.query;
    debug('轨迹抽稀: voyage_id=%s, tolerance=%s', voyageId, tolerance);

    const [rows] = await db.query(
      'SELECT * FROM track_points WHERE voyage_id = ? ORDER BY timestamp ASC',
      [voyageId]
    );

    if (rows.length <= 2) {
      return res.json({ success: true, data: rows, original_count: rows.length, simplified_count: rows.length });
    }

    const trackPoints = rows.map(r => ({
      id: r.id,
      lat: r.latitude,
      lng: r.longitude,
      latitude: r.latitude,
      longitude: r.longitude,
      timestamp: r.timestamp,
      speed: r.speed,
      heading: r.heading
    }));

    const simplifiedPoints = douglasPeucker(trackPoints, parseFloat(tolerance));

    res.json({ 
      success: true, 
      data: simplifiedPoints,
      original_count: rows.length,
      simplified_count: simplifiedPoints.length
    });
  } catch (err) {
    debug('轨迹抽稀失败:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

async function getActiveNoFishingZones() {
  try {
    const cacheKey = 'no_fishing_zones:active';
    const cached = await redisClient.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }
    
    const [rows] = await db.query('SELECT * FROM no_fishing_zones WHERE is_active = 1');
    const zones = rows.map(row => ({
      ...row,
      polygon: JSON.parse(row.polygon_coords)
    }));
    
    await redisClient.setEx(cacheKey, 300, JSON.stringify(zones));
    return zones;
  } catch (err) {
    debug('获取禁渔区缓存失败:', err.message);
    const [rows] = await db.query('SELECT * FROM no_fishing_zones WHERE is_active = 1');
    return rows.map(row => ({
      ...row,
      polygon: JSON.parse(row.polygon_coords)
    }));
  }
}

module.exports = router;
