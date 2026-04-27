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
        api.get('workers/', { params }).then(r => r.data),

    createWorker: (data) =>
        api.post('workers/', data).then(r => r.data),

    updateWorker: (id, data) =>
        api.patch(`workers/${id}/`, data).then(r => r.data),

    getWorkerHistory: (id) =>
        api.get(`workers/${id}/history/`).then(r => r.data),

    deleteWorker: (id) =>
        api.delete(`workers/${id}/`).then(r => r.data),

    // Daily records
    getRecords: (params = {}) =>
        api.get('records/', { params }).then(r => r.data),

    createRecord: (data) =>
        api.post('records/', data).then(r => r.data),

    updateRecord: (id, data) =>
        api.patch(`records/${id}/`, data).then(r => r.data),

    // Bulk mark attendance for a day
    bulkMark: (payload) =>
        api.post('records/bulk/', payload).then(r => r.data),

    // Monthly summary
    getMonthlySummary: (project, month) =>
        api.get('records/summary/', { params: { project, month } }).then(r => r.data),

    // Team import
    getUnlinkedTeamMembers: (project) =>
        api.get('workers/team-unlinked/', { params: { project } }).then(r => r.data),

    importTeamMember: (payload) =>
        api.post('workers/import-member/', payload).then(r => r.data),

    // Finance integration
    postToFinance: (payload) =>
        api.post('records/post-to-finance/', payload).then(r => r.data),

    exportCsv: (params) =>
        api.get('records/export-csv/', { params, responseType: 'blob' }).then(r => r.data),
};

export default attendanceService;
