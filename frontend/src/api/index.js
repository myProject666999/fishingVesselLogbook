import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000
});

api.interceptors.response.use(
  response => response.data,
  error => {
    console.error('API Error:', error.message);
    return Promise.reject(error);
  }
);

export const vesselAPI = {
  list: () => api.get('/vessels'),
  get: (id) => api.get(`/vessels/${id}`),
  create: (data) => api.post('/vessels', data),
  update: (id, data) => api.put(`/vessels/${id}`, data),
  delete: (id) => api.delete(`/vessels/${id}`)
};

export const voyageAPI = {
  list: (params) => api.get('/voyages', { params }),
  get: (id) => api.get(`/voyages/${id}`),
  create: (data) => api.post('/voyages', data),
  finish: (id, data) => api.put(`/voyages/${id}/finish`, data)
};

export const trackAPI = {
  upload: (data) => api.post('/tracks/upload', data),
  batchUpload: (data) => api.post('/tracks/batch-upload', data),
  getByVoyage: (voyageId, simplified = false) => api.get(`/tracks/voyage/${voyageId}`, { params: { simplified } }),
  simplify: (voyageId, tolerance) => api.get(`/tracks/simplify/${voyageId}`, { params: { tolerance } })
};

export const catchLogAPI = {
  list: (params) => api.get('/catch-logs', { params }),
  get: (id) => api.get(`/catch-logs/${id}`),
  create: (data) => api.post('/catch-logs', data),
  update: (id, data) => api.put(`/catch-logs/${id}`, data),
  delete: (id) => api.delete(`/catch-logs/${id}`)
};

export const noFishingAPI = {
  getZones: () => api.get('/no-fishing/zones'),
  getZone: (id) => api.get(`/no-fishing/zones/${id}`),
  createZone: (data) => api.post('/no-fishing/zones', data),
  updateZone: (id, data) => api.put(`/no-fishing/zones/${id}`, data),
  deleteZone: (id) => api.delete(`/no-fishing/zones/${id}`),
  getPeriods: () => api.get('/no-fishing/periods'),
  getPeriod: (id) => api.get(`/no-fishing/periods/${id}`),
  createPeriod: (data) => api.post('/no-fishing/periods', data),
  updatePeriod: (id, data) => api.put(`/no-fishing/periods/${id}`, data),
  deletePeriod: (id) => api.delete(`/no-fishing/periods/${id}`),
  checkPoint: (data) => api.post('/no-fishing/check-point', data)
};

export const violationAPI = {
  list: (params) => api.get('/violations', { params }),
  get: (id) => api.get(`/violations/${id}`),
  handle: (id, data) => api.put(`/violations/${id}/handle`, data)
};

export const buyerAPI = {
  list: () => api.get('/buyers'),
  get: (id) => api.get(`/buyers/${id}`),
  create: (data) => api.post('/buyers', data),
  update: (id, data) => api.put(`/buyers/${id}`, data),
  delete: (id) => api.delete(`/buyers/${id}`)
};

export default api;
