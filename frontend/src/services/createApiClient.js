/**
 * createApiClient — shared factory for all module API clients.
 *
 * Eliminates the copy-paste of JWT injection + token-refresh logic
 * that was duplicated across every module's service file.
 *
 * Usage:
 *   import createApiClient from '../../../services/createApiClient';
 *   const http = createApiClient();
 *   export const getItems = () => http.get('/my-module/items/');
 */
import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || '/api/v1';

export default function createApiClient(options = {}) {
    const http = axios.create({
        baseURL: options.baseURL ?? BASE,
        ...options.axiosConfig,
    });

    // ── JWT injection ─────────────────────────────────────────────────────────
    http.interceptors.request.use((config) => {
        const token = localStorage.getItem('access_token');
        if (token) config.headers.Authorization = `Bearer ${token}`;
        return config;
    });

    // ── Token refresh on 401 ──────────────────────────────────────────────────
    http.interceptors.response.use(
        (res) => res,
        async (err) => {
            const original = err.config;
            if (err.response?.status === 401 && !original._retry) {
                original._retry = true;
                const refresh = localStorage.getItem('refresh_token');
                if (refresh) {
                    try {
                        const { data } = await axios.post(
                            `${BASE}/auth/token/refresh/`,
                            { refresh }
                        );
                        localStorage.setItem('access_token', data.access);
                        original.headers.Authorization = `Bearer ${data.access}`;
                        return http(original);
                    } catch {
                        localStorage.removeItem('access_token');
                        localStorage.removeItem('refresh_token');
                        if (!window.location.pathname.startsWith('/login')) {
                            window.location.href = '/login?expired=true';
                        }
                    }
                }
            }
            return Promise.reject(err);
        }
    );

    return http;
}

/** Convenience: derive the media/static server root from the API base URL. */
export function getMediaBase() {
    return BASE.replace('/api/v1', '').replace(/\/$/, '');
}

/** Build a full URL for a media file path returned by the backend. */
export function mediaUrl(path) {
    if (!path) return '';
    if (path.startsWith('http') || path.startsWith('blob:') || path.startsWith('data:')) return path;
    return `${getMediaBase()}${path}`;
}
