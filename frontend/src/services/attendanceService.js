import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

const getHeaders = () => {
    const token = localStorage.getItem('access_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
};

const api = axios.create({ baseURL: `${API_URL}/attendance` });
api.interceptors.request.use(cfg => {
    cfg.headers = { ...cfg.headers, ...getHeaders() };
    return cfg;
});

// ── Workers ────────────────────────────────────────────────────────────────
export const attendanceService = {
    // Workers
    getWorkers: (params = {}) =>
        api.get('/workers/', { params }).then(r => r.data),

    createWorker: (data) =>
        api.post('/workers/', data).then(r => r.data),

    updateWorker: (id, data) =>
        api.patch(`/workers/${id}/`, data).then(r => r.data),

    deleteWorker: (id) =>
        api.delete(`/workers/${id}/`).then(r => r.data),

    // Daily records
    getRecords: (params = {}) =>
        api.get('/records/', { params }).then(r => r.data),

    createRecord: (data) =>
        api.post('/records/', data).then(r => r.data),

    updateRecord: (id, data) =>
        api.patch(`/records/${id}/`, data).then(r => r.data),

    // Bulk mark attendance for a day
    bulkMark: (payload) =>
        api.post('/records/bulk/', payload).then(r => r.data),

    // Monthly summary
    getMonthlySummary: (project, month) =>
        api.get('/records/summary/', { params: { project, month } }).then(r => r.data),
};

export default attendanceService;
