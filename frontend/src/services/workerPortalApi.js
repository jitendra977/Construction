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
    checkIn:  () => portalApi.post('checkin/', { type: 'CHECK_IN'  }).then(r => r.data),
    checkOut: () => portalApi.post('checkin/', { type: 'CHECK_OUT' }).then(r => r.data),

    /**
     * GET /api/v1/worker/my-team/
     * Team leader only — today's roster for all led teams.
     */
    getMyTeam: () => portalApi.get('my-team/').then(r => r.data),
};

export default workerPortalApi;
