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

export const attendanceService = {
    // Workers
    getWorkers:   (params = {}) => api.get('workers/', { params }).then(r => r.data),
    createWorker: (data)        => api.post('workers/', data).then(r => r.data),
    updateWorker: (id, data)    => api.patch(`workers/${id}/`, data).then(r => r.data),
    deleteWorker: (id)          => api.delete(`workers/${id}/`).then(r => r.data),
    getWorkerHistory: (id)      => api.get(`workers/${id}/history/`).then(r => r.data),
    getWorkerQRCode:  (id)      => api.get(`workers/${id}/qr-code/`).then(r => r.data),
    regenerateQR:     (id)      => api.post(`workers/${id}/regenerate-qr/`).then(r => r.data),
    getWorkerScanLogs:(id)      => api.get(`workers/${id}/scan-logs/`).then(r => r.data),

    // Team import
    getUnlinkedTeamMembers: (project) =>
        api.get('workers/team-unlinked/', { params: { project } }).then(r => r.data),
    importTeamMember: (payload) =>
        api.post('workers/import-member/', payload).then(r => r.data),

    // Daily records
    getRecords:   (params = {}) => api.get('records/', { params }).then(r => r.data),
    createRecord: (data)        => api.post('records/', data).then(r => r.data),
    updateRecord: (id, data)    => api.patch(`records/${id}/`, data).then(r => r.data),
    deleteRecord: (id)          => api.delete(`records/${id}/`).then(r => r.data),
    bulkMark:     (payload)     => api.post('records/bulk/', payload).then(r => r.data),
    getLive:      (project)     => api.get('records/live/', { params: { project } }).then(r => r.data),

    // Holiday Management
    setHoliday: (data) => api.post('records/set-holiday/', data).then(r => r.data),

    // Monthly
    getMonthlySummary: (project, month) =>
        api.get('records/summary/', { params: { project, month } }).then(r => r.data),
    exportCsv: (params) =>
        api.get('records/export-csv/', { params, responseType: 'blob' }).then(r => r.data),
    postToFinance: (payload) =>
        api.post('records/post-to-finance/', payload).then(r => r.data),

    // Create login account for a worker who doesn't have one
    createWorkerAccount: (workerId, payload = {}) =>
        api.post(`workers/${workerId}/create-account/`, payload).then(r => r.data),

    // My QR badge — finds or auto-creates this user's worker profile & returns QR
    getMyQR: (projectId) =>
        api.get('workers/my-qr/', { params: { project: projectId } }).then(r => r.data),

    // QR scan — hits AllowAny endpoint, used by kiosk tab
    qrScan: (qrData) =>
        axios.post(`${API_URL}/attendance/qr-scan/`, { qr_data: qrData }, {
            headers: { ...getHeaders(), 'Content-Type': 'application/json' },
        }).then(r => r.data),

    // ── Scan Time Window (admin) ───────────────────────────────────────────────
    getTimeWindow:    (project)        => api.get('time-window/',      { params: { project } }).then(r => r.data),
    updateTimeWindow: (project, data)  => api.put('time-window/',      data, { params: { project } }).then(r => r.data),

    // ── Missed checkouts (admin) ───────────────────────────────────────────────
    getMissedCheckouts: (project)          => api.get('missed-checkouts/', { params: { project } }).then(r => r.data),
    manualCheckout:     (payload)          => api.post('manual-checkout/',  payload).then(r => r.data),

    // ── Scan attempt log (admin) ───────────────────────────────────────────────
    getScanLogs: (params = {}) => api.get('scan-logs/', { params }).then(r => r.data),

    // ── Manpower legacy (kept for backward compat) ───────────────────────────
    getManpower:           (project)              => api.get('manpower/',              { params: { project } }).then(r => r.data),
    getUnlinkedContractors:(project)              => api.get('unlinked-contractors/',  { params: { project } }).then(r => r.data),
    linkContractor:        (workerId, payload)    => api.post(`workers/${workerId}/link-contractor/`,    payload).then(r => r.data),
    unlinkContractor:      (workerId)             => api.post(`workers/${workerId}/unlink-contractor/`,  {}).then(r => r.data),
    syncFromContractor:    (workerId)             => api.post(`workers/${workerId}/sync-from-contractor/`, {}).then(r => r.data),

    // ── Unified Person API (real-world single record per human) ───────────────
    getPersons:           (project, active = 'true') =>
        api.get('persons/', { params: { project, active } }).then(r => r.data),
    addPerson:            (data)         => api.post('persons/add/', data).then(r => r.data),
    updatePerson:         (workerId, data) =>
        api.patch(`persons/${workerId}/update/`, data).then(r => r.data),
    toggleRole:           (workerId, data) =>
        api.post(`persons/${workerId}/toggle-role/`, data).then(r => r.data),
    adoptContractor:      (data)         =>
        api.post('persons/adopt-contractor/', data).then(r => r.data),
};

export default attendanceService;
