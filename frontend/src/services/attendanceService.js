import axios from 'axios';
import { attachResponseInterceptor } from './api';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

const getHeaders = () => {
    const token = localStorage.getItem('access_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
};

const api = axios.create({ baseURL: API_URL });
api.interceptors.request.use(cfg => {
    cfg.headers = { ...cfg.headers, ...getHeaders() };
    return cfg;
});
attachResponseInterceptor(api);

export const attendanceService = {
    // Workers
    getWorkers:   (params = {}) => api.get('/attendance/workers/', { params }).then(r => r.data),
    createWorker: (data)        => api.post('/attendance/workers/', data).then(r => r.data),
    updateWorker: (id, data)    => api.patch(`/attendance/workers/${id}/`, data).then(r => r.data),
    deleteWorker: (id)          => api.delete(`/attendance/workers/${id}/`).then(r => r.data),
    getWorkerHistory: (id)      => api.get(`/attendance/workers/${id}/history/`).then(r => r.data),
    getWorkerQRCode:  (id)      => api.get(`/attendance/workers/${id}/qr-code/`).then(r => r.data),
    regenerateQR:     (id)      => api.post(`/attendance/workers/${id}/regenerate-qr/`).then(r => r.data),
    getWorkerScanLogs:(id)      => api.get(`/attendance/workers/${id}/scan-logs/`).then(r => r.data),

    // Team import
    getUnlinkedTeamMembers: (project) =>
        api.get('/attendance/workers/team-unlinked/', { params: { project } }).then(r => r.data),
    importTeamMember: (payload) =>
        api.post('/attendance/workers/import-member/', payload).then(r => r.data),

    // Daily records
    getRecords:   (params = {}) => api.get('/attendance/records/', { params }).then(r => r.data),
    createRecord: (data)        => api.post('/attendance/records/', data).then(r => r.data),
    updateRecord: (id, data)    => api.patch(`/attendance/records/${id}/`, data).then(r => r.data),
    deleteRecord: (id)          => api.delete(`/attendance/records/${id}/`).then(r => r.data),
    bulkMark:     (payload)     => api.post('/attendance/records/bulk/', payload).then(r => r.data),
    getLive:      (project)     => api.get('/attendance/records/live/', { params: { project } }).then(r => r.data),

    // Holiday Management
    setHoliday: (data) => api.post('/attendance/records/set-holiday/', data).then(r => r.data),

    // Monthly
    getMonthlySummary: (project, month) =>
        api.get('/attendance/records/summary/', { params: { project, month } }).then(r => r.data),
    exportCsv: (params) =>
        api.get('/attendance/records/export-csv/', { params, responseType: 'blob' }).then(r => r.data),
    postToFinance: (payload) =>
        api.post('/attendance/records/post-to-finance/', payload).then(r => r.data),

    // Create login account for a worker who doesn't have one
    createWorkerAccount: (workerId, payload = {}) =>
        api.post(`/attendance/workers/${workerId}/create-account/`, payload).then(r => r.data),

    // My QR badge — finds or auto-creates this user's worker profile & returns QR
    getMyQR: (projectId) =>
        api.get('/attendance/workers/my-qr/', { params: { project: projectId } }).then(r => r.data),

    // QR scan — hits AllowAny endpoint, used by kiosk tab
    qrScan: (qrData) =>
        axios.post(`${API_URL}/attendance/qr-scan/`, { qr_data: qrData }, {
            headers: { ...getHeaders(), 'Content-Type': 'application/json' },
        }).then(r => r.data),

    // ── Scan Time Window (admin) ───────────────────────────────────────────────
    getTimeWindow:    (project)        => api.get('/attendance/time-window/',      { params: { project } }).then(r => r.data),
    updateTimeWindow: (project, data)  => api.put('/attendance/time-window/',      data, { params: { project } }).then(r => r.data),

    // ── Missed checkouts (admin) ───────────────────────────────────────────────
    getMissedCheckouts: (project)          => api.get('/attendance/missed-checkouts/', { params: { project } }).then(r => r.data),
    manualCheckout:     (payload)          => api.post('/attendance/manual-checkout/',  payload).then(r => r.data),

    // ── Scan attempt log (admin) ───────────────────────────────────────────────
    getScanLogs: (params = {}) => api.get('/attendance/scan-logs/', { params }).then(r => r.data),

    // ── Manpower legacy (kept for backward compat) ───────────────────────────
    getManpower:           (project)              => api.get('/attendance/manpower/',              { params: { project } }).then(r => r.data),
    getUnlinkedContractors:(project)              => api.get('/attendance/unlinked-contractors/',  { params: { project } }).then(r => r.data),
    linkContractor:        (workerId, payload)    => api.post(`/attendance/workers/${workerId}/link-contractor/`,    payload).then(r => r.data),
    unlinkContractor:      (workerId)             => api.post(`/attendance/workers/${workerId}/unlink-contractor/`,  {}).then(r => r.data),
    syncFromContractor:    (workerId)             => api.post(`/attendance/workers/${workerId}/sync-from-contractor/`, {}).then(r => r.data),

    // ── Unified Person API (real-world single record per human) ───────────────
    getPersons:           (project, active = 'true') =>
        api.get('/attendance/persons/', { params: { project, active } }).then(r => r.data),
    addPerson:            (data)         => api.post('/attendance/persons/add/', data).then(r => r.data),
    updatePerson:         (workerId, data) =>
        api.patch(`/attendance/persons/${workerId}/update/`, data).then(r => r.data),
    toggleRole:           (workerId, data) =>
        api.post(`/attendance/persons/${workerId}/toggle-role/`, data).then(r => r.data),
    togglePersonActive:   (workerId) =>
        api.post(`/attendance/persons/${workerId}/toggle-active/`).then(r => r.data),
    adoptContractor:      (data)         =>
        api.post('/attendance/persons/adopt-contractor/', data).then(r => r.data),

    // ── Dashboard + stats ─────────────────────────────────────────────────────
    getDashboard:  (project)   => api.get('/attendance/dashboard/',                       { params: { project } }).then(r => r.data),
    getWorkerStats:(workerId)  => api.get(`/attendance/workers/${workerId}/stats/`).then(r => r.data),

    // ── Project Attendance Settings ────────────────────────────────────────────
    getSettings:    (project)        => api.get('/attendance/settings/',  { params: { project } }).then(r => r.data),
    updateSettings: (project, data)  => api.patch('/attendance/settings/', { ...data, project }, { params: { project } }).then(r => r.data),

    // ── Holidays ───────────────────────────────────────────────────────────────
    getHolidays:    (project, year)  => api.get('/attendance/holidays/', { params: { project, ...(year ? { year } : {}) } }).then(r => r.data),
    createHoliday:  (data)           => api.post('/attendance/holidays/', data).then(r => r.data),
    deleteHoliday:  (id)             => api.delete(`/attendance/holidays/${id}/`).then(r => r.data),
    applyHoliday:   (id)             => api.post(`/attendance/holidays/${id}/apply/`).then(r => r.data),

    // ── NFC Attendance ────────────────────────────────────────────────────────
    // Use the modern mqtt/nfc-scan/ endpoint which handles logging and v2 features
    nfcAttendanceScan: (payload) => api.post('/attendance/mqtt/nfc-scan/', payload).then(r => r.data),

    // ── NFC Device Fleet ──────────────────────────────────────────────────────
    getNfcDevices: (project, params = {}) =>
        api.get('/attendance/mqtt/devices/', { params: { project, ...params } }).then(r => r.data),

    // Push ALL active workers with NFC UIDs to one or every device immediately
    pushUsersToDevice: (project, mac = null) =>
        api.post('/attendance/mqtt/devices/push-users/', { project, ...(mac ? { mac } : {}) }).then(r => r.data),

    // Push a SINGLE worker to every device via users/set (faster, targeted)
    pushSingleWorker: (project, worker_id) =>
        api.post('/attendance/mqtt/devices/push-worker/', { project, worker_id }).then(r => r.data),

    // Reboot one device (mac) or all project devices via MQTT cmd topic
    rebootDevice: (project, mac = null) =>
        api.post('/attendance/mqtt/devices/reboot/', { project, ...(mac ? { mac } : {}) }).then(r => r.data),
};

export default attendanceService;
