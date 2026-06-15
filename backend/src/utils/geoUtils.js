const debug = require('debug')('app:utils:geo');

function toRad(degrees) {
  return degrees * Math.PI / 180;
}

function toDegrees(radians) {
  return radians * 180 / Math.PI;
}

function distance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function pointToLineDistance(point, lineStart, lineEnd) {
  const { lat: px, lng: py } = point;
  const { lat: lx1, lng: ly1 } = lineStart;
  const { lat: lx2, lng: ly2 } = lineEnd;

  const A = px - lx1;
  const B = py - ly1;
  const C = lx2 - lx1;
  const D = ly2 - ly1;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;

  if (lenSq !== 0) param = dot / lenSq;

  let xx, yy;

  if (param < 0) {
    xx = lx1;
    yy = ly1;
  } else if (param > 1) {
    xx = lx2;
    yy = ly2;
  } else {
    xx = lx1 + param * C;
    yy = ly1 + param * D;
  }

  return distance(px, py, xx, yy);
}

function douglasPeucker(points, tolerance) {
  debug('Douglas-Peucker抽稀，原始点数: %d, 容差: %d米', points.length, tolerance);
  
  if (points.length <= 2) {
    return points;
  }

  let maxDist = 0;
  let index = 0;
  const end = points.length - 1;

  for (let i = 1; i < end; i++) {
    const dist = pointToLineDistance(points[i], points[0], points[end]);
    if (dist > maxDist) {
      maxDist = dist;
      index = i;
    }
  }

  if (maxDist > tolerance) {
    const first = douglasPeucker(points.slice(0, index + 1), tolerance);
    const second = douglasPeucker(points.slice(index), tolerance);
    const result = first.slice(0, -1).concat(second);
    debug('抽稀后点数: %d', result.length);
    return result;
  } else {
    return [points[0], points[end]];
  }
}

function pointInPolygon(point, polygon) {
  const { lat, lng } = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng, yi = polygon[i].lat;
    const xj = polygon[j].lng, yj = polygon[j].lat;

    if (((yi > lat) !== (yj > lat)) &&
      (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }

  return inside;
}

function calculateTotalDistance(points) {
  if (points.length < 2) return 0;
  
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += distance(
      points[i - 1].latitude || points[i - 1].lat,
      points[i - 1].longitude || points[i - 1].lng,
      points[i].latitude || points[i].lat,
      points[i].longitude || points[i].lng
    );
  }
  return total / 1852;
}

module.exports = {
  distance,
  pointToLineDistance,
  douglasPeucker,
  pointInPolygon,
  calculateTotalDistance,
  toRad,
  toDegrees
};
