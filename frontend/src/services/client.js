/**
 * Shared Axios instance.
 * Import `api` (default) from here in every domain service file.
 * Import `getMediaUrl` here too if needed.
 */
import axios from 'axios';
import { toast } from 'sonner';
import offlineQueue from './offlineQueue';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

const getAuthHeader = () => {
    const accessToken = localStorage.getItem('access_token');
    return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
};

const toQueueUrl = (request = {}) => {
    const rawUrl = request.url || '';
    if (!rawUrl) return rawUrl;
    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
        try {
            const parsed = new URL(rawUrl);
            return `${parsed.pathname}${parsed.search}${parsed.hash}`;
        } catch {
            return rawUrl;
        }
    }
    if (rawUrl.startsWith('/')) return rawUrl;

    const rawBase = request.baseURL || API_URL;
    const normalizedBase = rawBase.endsWith('/') ? rawBase : `${rawBase}/`;

    try {
        const origin =
            typeof window !== 'undefined' && window.location?.origin
                ? window.location.origin
                : 'http://localhost';
        const resolved = new URL(rawUrl, new URL(normalizedBase, origin));
        return `${resolved.pathname}${resolved.search}${resolved.hash}`;
    } catch {
        return rawUrl;
    }
};

const api = axios.create({ baseURL: API_URL });

// ── Request interceptor — attach Bearer token ─────────────────────────────
api.interceptors.request.use(
    (config) => {
        const { Authorization } = getAuthHeader();
        if (Authorization) config.headers.Authorization = Authorization;
        return config;
    },
    (error) => Promise.reject(error),
);

// ── Response interceptor — token refresh + offline queue ──────────────────
export const attachResponseInterceptor = (axiosInstance) => {
    axiosInstance.interceptors.response.use(
        (response) => response,
        async (error) => {
            const originalRequest = error.config;

            console.error(
                `❌ API Error [${error.response?.status}]: ` +
                `${originalRequest?.method?.toUpperCase()} ${originalRequest?.url}`,
                error.response?.data,
            );

            // ── User-facing toast for server errors ───────────────────────────
            const status = error.response?.status;
            const skipToast =
                // Auth errors are handled by redirect / login form
                status === 401 ||
                // Offline mutations get queued — no error toast needed
                (!error.response && error.code === 'ERR_NETWORK') ||
                // Caller opted out via config flag
                originalRequest?._silentError;

            if (!skipToast && status) {
                const serverMsg =
                    error.response?.data?.detail ||
                    error.response?.data?.message ||
                    error.response?.data?.error;
                const label =
                    serverMsg ||
                    (status >= 500 ? 'Server error — please try again.' :
                     status === 403 ? 'You don\'t have permission to do that.' :
                     status === 404 ? 'Resource not found.' :
                     'Something went wrong.');
                toast.error(label, { duration: 4000 });
            }

            // 401 handling — skip for login endpoint itself
            const isLoginRequest = originalRequest?.url?.includes('auth/login/');
            if (
                error.response?.status === 401 &&
                !originalRequest._retry &&
                !isLoginRequest
            ) {
                originalRequest._retry = true;
                try {
                    const refreshToken = localStorage.getItem('refresh_token');
                    if (!refreshToken) throw new Error('No refresh token');

                    const { data } = await axios.post(
                        `${API_URL}/auth/token/refresh/`,
                        { refresh: refreshToken },
                    );
                    localStorage.setItem('access_token', data.access);
                    originalRequest.headers.Authorization = `Bearer ${data.access}`;
                    return axiosInstance(originalRequest);
                } catch {
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('refresh_token');
                    localStorage.removeItem('user');
                    if (!window.location.pathname.startsWith('/login')) {
                        window.location.href = '/login?expired=true';
                    }
                    return Promise.reject(error);
                }
            }

            // Offline mutation queuing
            const method = (originalRequest?.method || '').toLowerCase();
            const isMutation = ['post', 'patch', 'put', 'delete'].includes(method);
            const isNetworkError = !error.response || error.code === 'ERR_NETWORK';
            if (isMutation && isNetworkError && originalRequest?.url) {
                try {
                    await offlineQueue.enqueue({
                        url: toQueueUrl(originalRequest),
                        method: originalRequest.method,
                        body: originalRequest.data,
                        headers: {
                            Authorization: originalRequest.headers?.Authorization,
                            'Content-Type': 'application/json',
                        },
                    });
                    return Promise.resolve({
                        data: { queued: true, offline: true },
                        status: 202,
                        queued: true,
                    });
                } catch {
                    /* fall through */
                }
            }

            return Promise.reject(error);
        },
    );
};

attachResponseInterceptor(api);
offlineQueue.installOnlineFlush(api);

/**
 * Returns a usable URL for any media file path.
 * Strips internal host in dev so Vite proxy handles it.
 */
export const getMediaUrl = (url) => {
    if (!url) return '';
    let path = url;
    if (url.startsWith('http')) {
        const isInternal =
            url.includes('nishanaweb.cloud') ||
            url.includes('localhost') ||
            url.includes('127.0.0.1') ||
            url.includes('192.168.');
        if (isInternal) {
            try { path = new URL(url).pathname; } catch { return url; }
        } else {
            return url;
        }
    }
    return path;
};

export default api;
