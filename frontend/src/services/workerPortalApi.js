/**
 * workerPortalApi.js
 * ──────────────────
 * API client for the Worker Portal (mobile-first).
 * Base URL: /api/v1/worker/
 *
 * Authentication: phone number as username + 6-digit PIN → JWT tokens.
 * These tokens are stored separately from the main admin session so a
 * worker can log in on a shared device without displacing the manager.
 */
import axios from 'axios';
import api from './api';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

// Separate token storage keys so portal session doesn't conflict with admin session
const PORTAL_ACCESS_KEY  = 'worker_access_token';
const PORTAL_REFRESH_KEY = 'worker_refresh_token';
const PORTAL_USER_KEY    = 'worker_user';

// ── Axios instance ────────────────────────────────────────────────────────────
const portalApi = axios.create({ baseURL: `${API_URL}/worker` });

portalApi.interceptors.request.use(cfg => {
    const token = localStorage.getItem(PORTAL_ACCESS_KEY);
    if (token) cfg.headers = { ...cfg.headers, Authorization: `Bearer ${token}` };
    return cfg;
});

// Auto-refresh on 401
portalApi.interceptors.response.use(
    res => res,
    async err => {
        const original = err.config;
        if (err.response?.status === 401 && !original._retry) {
            original._retry = true;
            try {
                const refresh = localStorage.getItem(PORTAL_REFRESH_KEY);
                if (!refresh) throw new Error('no refresh token');
                const { data } = await axios.post(`${API_URL}/auth/token/refresh/`, { refresh });
                localStorage.setItem(PORTAL_ACCESS_KEY, data.access);
                original.headers.Authorization = `Bearer ${data.access}`;
                return portalApi(original);
            } catch {
                workerPortalApi.logout();
            }
        }
        return Promise.reject(err);
    }
);

// ── Service ───────────────────────────────────────────────────────────────────


// ── Worker chat (reuses global messenger APIs with worker token) ───────────
const workerAuthHeaders = () => {
    const token = localStorage.getItem(PORTAL_ACCESS_KEY);
    return token ? { Authorization: `Bearer ${token}` } : {};
};

const messengerRequest = (method, path, data = null, config = {}) =>
    axios({
        method,
        url: `${API_URL}/messenger/${path}`,
        data,
        headers: { ...workerAuthHeaders(), ...(config.headers || {}) },
        params: config.params,
    }).then(r => r.data);

const workerPortalApi = {

    /**
     * Login with phone number + PIN.
     * POST /api/v1/worker/login/
     * Body: { phone, pin }
     * Returns: { access, refresh, worker: { ... } }
     */
    login: async (phone, pin) => {
        const { data } = await axios.post(`${API_URL}/worker/login/`, { phone, pin });
        localStorage.setItem(PORTAL_ACCESS_KEY,  data.access);
        localStorage.setItem(PORTAL_REFRESH_KEY, data.refresh);
        localStorage.setItem(PORTAL_USER_KEY,    JSON.stringify(data.worker));
        return data;
    },

    /**
     * Login via QR code scan.
     * POST /api/v1/worker/qr-login/
     * Body: { qr_data: "<JSON string from QR code>" }
     */
    qrLogin: async (qrData) => {
        const { data } = await axios.post(`${API_URL}/worker/qr-login/`, { qr_data: qrData });
        localStorage.setItem(PORTAL_ACCESS_KEY,  data.access);
        localStorage.setItem(PORTAL_REFRESH_KEY, data.refresh);
        localStorage.setItem(PORTAL_USER_KEY,    JSON.stringify(data.worker));
        return data;
    },

    /**
     * Login via biometric face ID.
     * POST /api/v1/worker/face-login/
     * Body: { encoding, username }
     */
    faceLogin: async (encoding, username = '') => {
        const { data } = await axios.post(`${API_URL}/worker/face-login/`, { encoding, username });
        localStorage.setItem(PORTAL_ACCESS_KEY,  data.access);
        localStorage.setItem(PORTAL_REFRESH_KEY, data.refresh);
        localStorage.setItem(PORTAL_USER_KEY,    JSON.stringify(data.worker));
        return data;
    },

    /**
     * Launch the worker portal from the admin dashboard without re-entering PIN.
     * Requires the currently authenticated admin user to already have a workforce profile.
     */
    launchFromAdmin: async () => {
        const { data } = await api.post('worker/launch/');
        localStorage.setItem(PORTAL_ACCESS_KEY,  data.access);
        localStorage.setItem(PORTAL_REFRESH_KEY, data.refresh);
        localStorage.setItem(PORTAL_USER_KEY,    JSON.stringify(data.worker));
        return data;
    },

    /**
     * POST /api/v1/worker/qr-checkin/
     * Self-check-in by scanning OWN QR badge (authenticated).
     */
    qrCheckin: (qrData) => portalApi.post('qr-checkin/', { qr_data: qrData }).then(r => r.data),

    /** Remove portal session from localStorage */
    logout: () => {
        localStorage.removeItem(PORTAL_ACCESS_KEY);
        localStorage.removeItem(PORTAL_REFRESH_KEY);
        localStorage.removeItem(PORTAL_USER_KEY);
    },

    /** True if a portal access token exists in storage */
    isAuthenticated: () => !!localStorage.getItem(PORTAL_ACCESS_KEY),

    /** Return cached worker profile from localStorage, or null */
    getCurrentWorker: () => {
        const raw = localStorage.getItem(PORTAL_USER_KEY);
        if (!raw || raw === 'undefined') return null;
        try { return JSON.parse(raw); } catch { return null; }
    },

    /**
     * GET /api/v1/worker/me/
     * Returns own profile + today's attendance + week summary + teams.
     */
    getMe: (month = null) => {
        let url = 'me/';
        if (month) url += `?month=${month}`;
        return portalApi.get(url).then(r => r.data);
    },

    /**
     * GET /api/v1/worker/qr/
     * Returns the worker's QR badge base64 image and token.
     */
    getMyQR: () => portalApi.get('qr/').then(r => r.data),

    /**
     * POST /api/v1/worker/checkin/
     * Body: { type: 'CHECK_IN' | 'CHECK_OUT' }
     * Returns: { status, time, log_id }
     */
    checkIn:  (latitude = null, longitude = null) => portalApi.post('checkin/', { type: 'CHECK_IN', latitude, longitude }).then(r => r.data),
    checkOut: (latitude = null, longitude = null) => portalApi.post('checkin/', { type: 'CHECK_OUT', latitude, longitude }).then(r => r.data),

    /**
     * GET /api/v1/worker/my-team/
     * Team leader only — today's roster for all led teams.
     */
    getMyTeam: () => portalApi.get('my-team/').then(r => r.data),

    // ── Phases ────────────────────────────────────────────────────────────────

    /**
     * GET /api/v1/worker/phases/
     * All phases for worker's current project with task counts + progress %.
     */
    getPhases: () => portalApi.get('phases/').then(r => r.data),

    // ── Tasks ─────────────────────────────────────────────────────────────────

    /**
     * GET /api/v1/worker/tasks/
     * Tasks assigned to this worker.
     * @param {object} params  { phase?, status? }
     */
    getTasks: (params = {}) => portalApi.get('tasks/', { params }).then(r => r.data),

    /**
     * GET /api/v1/worker/project-tasks/
     * ALL tasks in the worker's current project (read-only view, not just assigned).
     * @param {object} params  { phase?, status? }
     */
    getProjectTasks: (params = {}) => portalApi.get('project-tasks/', { params }).then(r => r.data),

    /**
     * PATCH /api/v1/worker/tasks/<id>/update/
     * Update task status from worker side.
     * @param {number} id
     * @param {object} data  { status, blocker_reason?, progress_note? }
     */
    updateTask: (id, data) => portalApi.patch(`tasks/${id}/update/`, data).then(r => r.data),

    // ── Photos ────────────────────────────────────────────────────────────────

    /**
     * GET /api/v1/worker/photos/
     * This worker's uploaded photos (most recent 50).
     */
    getPhotos: () => portalApi.get('photos/').then(r => r.data),

    /**
     * POST /api/v1/worker/photos/upload/
     * Upload a photo tagged to a task.
     * @param {File}   file
     * @param {number} taskId
     * @param {string} description
     * @param {function} onProgress  (0-100) optional
     */
    uploadPhoto: (file, taskId = null, description = '', onProgress = null) => {
        const form = new FormData();
        form.append('file', file);
        // task_id is optional — only include it when a task is selected
        if (taskId != null) form.append('task_id', taskId);
        if (description) form.append('description', description);
        return portalApi.post('photos/upload/', form, {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: onProgress
                ? e => onProgress(Math.round((e.loaded * 100) / e.total))
                : undefined,
        }).then(r => r.data);
    },

    // ── Resources ─────────────────────────────────────────────────────────────

    /**
     * GET /api/v1/worker/resources/
     * Materials + equipment for the worker's current project (no costs).
     */
    getResources: () => portalApi.get('resources/').then(r => r.data),

    /**
     * POST /api/v1/worker/material-requests/
     * Raise a restock request for a material.
     * @param {string} materialId  UUID
     * @param {number} quantity
     * @param {string} notes
     */
    requestMaterial: (materialId, quantity, notes = '') =>
        portalApi.post('material-requests/', {
            material_id: materialId,
            quantity,
            notes,
        }).then(r => r.data),

    /**
     * Train and register worker face signature.
     * POST /api/v1/biometrics/train/
     */


    // Chat members/conversations/messages
    listChatMembers: (q = '') => messengerRequest('get', `members/${q ? `?q=${encodeURIComponent(q)}` : ''}`),
    listChatConversations: () => messengerRequest('get', 'conversations/'),
    startDirectChat: (userId) => messengerRequest('post', 'conversations/start-direct/', { user_id: userId }),
    listChatMessages: (conversationId, since = '') => messengerRequest('get', `conversations/${conversationId}/messages/${since ? `?since=${encodeURIComponent(since)}` : ''}`),
    sendChatMessage: (conversationId, payload = {}) => {
        const form = new FormData();
        if (payload.text) form.append('text', payload.text);
        if (payload.imageFile) form.append('image', payload.imageFile);
        form.append('conversation', conversationId);
        return messengerRequest('post', `conversations/${conversationId}/messages/`, form, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },

    registerFace: (encoding) => {
        const token = localStorage.getItem(PORTAL_ACCESS_KEY);
        return axios.post(`${API_URL}/biometrics/train/`, { encoding }, {
            headers: { Authorization: `Bearer ${token}` }
        }).then(r => r.data);
    },
};

export default workerPortalApi;
