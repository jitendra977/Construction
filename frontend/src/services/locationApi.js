import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

const getHeaders = () => {
    const token = localStorage.getItem('access_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
};

const api = axios.create({ baseURL: `${API_URL}/location/` });
api.interceptors.request.use(cfg => {
    cfg.headers = { ...cfg.headers, ...getHeaders() };
    return cfg;
});

export const locationApi = {
    // ── Geofences ─────────────────────────────────────────────────────────────
    getGeofences:    (params)     => api.get('geofences/',        { params }).then(r => r.data),
    createGeofence:  (data)       => api.post('geofences/', data).then(r => r.data),
    updateGeofence:  (id, data)   => api.patch(`geofences/${id}/`, data).then(r => r.data),
    deleteGeofence:  (id)         => api.delete(`geofences/${id}/`).then(r => r.data),

    // ── Site Pins ─────────────────────────────────────────────────────────────
    getPins:         (projectId)  => api.get('pins/', { params: { project: projectId } }).then(r => r.data),
    createPin:       (data)       => api.post('pins/', data).then(r => r.data),
    updatePin:       (id, data)   => api.patch(`pins/${id}/`, data).then(r => r.data),
    deletePin:       (id)         => api.delete(`pins/${id}/`).then(r => r.data),

    // ── Mobile Ping ───────────────────────────────────────────────────────────
    pingLocation:    (data)       => api.post('ping/', data).then(r => r.data),

    // ── Live Positions ────────────────────────────────────────────────────────
    getLivePositions: (projectId) => api.get('live/', { params: { project: projectId } }).then(r => r.data),

    // ── Location History (path playback) ──────────────────────────────────────
    getLocationHistory: (params)  => api.get('history/', { params }).then(r => r.data),

    // ── Analytics ─────────────────────────────────────────────────────────────
    getPresenceAnalytics: (params) => api.get('analytics/', { params }).then(r => r.data),
    getPresenceSummary:   (params) => api.get('analytics/summary/', { params }).then(r => r.data),
};

export default locationApi;
