/**
 * resourceApi.js — Resource Module API client
 *
 * All requests go to /api/v1/resource/
 * Uses the same axios instance & JWT token as the rest of the app,
 * but every call is defined here so Resource has zero dependency on
 * the global api.js file.
 */
import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || '/api/v1';

const http = axios.create({ baseURL: BASE });

// ── JWT injection ─────────────────────────────────────────────────────────────
http.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Token refresh on 401 ─────────────────────────────────────────────────────
http.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = localStorage.getItem('refresh_token');
      if (refresh) {
        try {
          const { data } = await axios.post(`${BASE}/auth/token/refresh/`, { refresh });
          localStorage.setItem('access_token', data.access);
          original.headers.Authorization = `Bearer ${data.access}`;
          return http(original);
        } catch {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(err);
  }
);

// ── Helpers ───────────────────────────────────────────────────────────────────
const qs = (pid, extra = '') =>
  pid ? `?project=${pid}${extra ? '&' + extra : ''}` : extra ? `?${extra}` : '';

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const getDashboard = (projectId) =>
  http.get(`/resource/dashboard/${qs(projectId)}`);

// ── Materials ─────────────────────────────────────────────────────────────────
export const getMaterials    = (projectId)     => http.get(`/resource/materials/${qs(projectId)}`);
export const getMaterial     = (id)            => http.get(`/resource/materials/${id}/`);
export const createMaterial  = (data)          => http.post('/resource/materials/', data);
export const updateMaterial  = (id, data)      => http.patch(`/resource/materials/${id}/`, data);
export const stockIn         = (id, data)      => http.post(`/resource/materials/${id}/stock-in/`, data);
export const stockOut        = (id, data)      => http.post(`/resource/materials/${id}/stock-out/`, data);

// ── Equipment ─────────────────────────────────────────────────────────────────
export const getEquipment    = (projectId, status) =>
  http.get(`/resource/equipment/${qs(projectId, status ? `status=${status}` : '')}`);
export const createEquipment = (data)          => http.post('/resource/equipment/', data);
export const updateEquipment = (id, data)      => http.patch(`/resource/equipment/${id}/`, data);

// ── Workers ───────────────────────────────────────────────────────────────────
export const getWorkers      = (projectId, isActive) =>
  http.get(`/resource/workers/${qs(projectId, isActive !== undefined ? `is_active=${isActive}` : '')}`);
export const createWorker    = (data)          => http.post('/resource/workers/', data);
export const updateWorker    = (id, data)      => http.patch(`/resource/workers/${id}/`, data);

// ── Worker Attendance ─────────────────────────────────────────────────────────
export const getAttendance   = (workerId, date) => {
  const params = [
    workerId ? `worker=${workerId}` : '',
    date     ? `date=${date}`       : '',
  ].filter(Boolean).join('&');
  return http.get(`/resource/worker-attendance/${params ? '?' + params : ''}`);
};
export const createAttendance = (data)         => http.post('/resource/worker-attendance/', data);
export const updateAttendance = (id, data)     => http.patch(`/resource/worker-attendance/${id}/`, data);

// ── Suppliers ─────────────────────────────────────────────────────────────────
export const getSuppliers    = (projectId)     => http.get(`/resource/suppliers/${qs(projectId)}`);
export const createSupplier  = (data)          => http.post('/resource/suppliers/', data);
export const updateSupplier  = (id, data)      => http.patch(`/resource/suppliers/${id}/`, data);

// ── Purchase Orders ───────────────────────────────────────────────────────────
export const getPurchaseOrders    = (projectId)  => http.get(`/resource/purchase-orders/${qs(projectId)}`);
export const createPurchaseOrder  = (data)       => http.post('/resource/purchase-orders/', data);
export const updatePurchaseOrder  = (id, data)   => http.patch(`/resource/purchase-orders/${id}/`, data);
export const receivePurchaseOrder = (id)         => http.post(`/resource/purchase-orders/${id}/receive/`);

// ── Purchase Items ────────────────────────────────────────────────────────────
export const getPurchaseItems    = (orderId)   =>
  http.get(`/resource/purchase-items/${orderId ? `?order=${orderId}` : ''}`);
export const createPurchaseItem  = (data)      => http.post('/resource/purchase-items/', data);
export const updatePurchaseItem  = (id, data)  => http.patch(`/resource/purchase-items/${id}/`, data);

// ── Stock Movements ───────────────────────────────────────────────────────────
export const getStockMovements = (projectId, materialId) => {
  const params = [
    projectId  ? `project=${projectId}`   : '',
    materialId ? `material=${materialId}` : '',
  ].filter(Boolean).join('&');
  return http.get(`/resource/stock-movements/${params ? '?' + params : ''}`);
};

// ── Named export bundle (for components that import everything at once) ────────
const resourceApi = {
  getDashboard,
  getMaterials, getMaterial, createMaterial, updateMaterial, stockIn, stockOut,
  getEquipment, createEquipment, updateEquipment,
  getWorkers, createWorker, updateWorker,
  getAttendance, createAttendance, updateAttendance,
  getSuppliers, createSupplier, updateSupplier,
  getPurchaseOrders, createPurchaseOrder, updatePurchaseOrder, receivePurchaseOrder,
  getPurchaseItems, createPurchaseItem, updatePurchaseItem,
  getStockMovements,
};

export default resourceApi;
