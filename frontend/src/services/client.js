/**
 * Shared Axios instance.
 * Import `api` (default) from here in every domain service file.
 * Import `getMediaUrl` here too if needed.
 */
import axios from 'axios';
import { toast } from 'sonner';
import offlineQueue from './offlineQueue';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

// The path-only portion of API_URL (e.g. "/api/v1") — used to strip the
// prefix from absolute URLs before they are stored in the offline queue,
// so that offlineQueue.normalizeQueuedUrl doesn't prepend it a second time.
const API_PATH = (() => {
    try { return new URL(API_URL, 'http://x').pathname.replace(/\/$/, ''); }
    catch { return API_URL.startsWith('http') ? '/api/v1' : API_URL.replace(/\/$/, ''); }
})();

const MEDIA_BASE = (() => {
    if (API_URL.startsWith('http://') || API_URL.startsWith('https://')) {
        return API_URL.replace(/\/api\/v1\/?$/, '');
    }
    if (typeof window !== 'undefined' && window.location?.origin) {
        return window.location.origin;
    }
    return '';
})();

const getAuthHeader = () => {
    const accessToken = localStorage.getItem('access_token');
    return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
};

const toQueueUrl = (request = {}) => {
    const rawUrl = request.url || '';
    if (!rawUrl) return rawUrl;

    // Absolute URL → extract path only, then strip the API base path so the
    // offline queue doesn't prepend it again when replaying.
    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
        try {
            const parsed = new URL(rawUrl);
            const pathname = `${parsed.pathname}${parsed.search}${parsed.hash}`;
            // Strip API_PATH prefix to get a plain relative path like "auth/login/"
            if (API_PATH && pathname.startsWith(API_PATH)) {
                return pathname.slice(API_PATH.length).replace(/^\//, '');
            }
            return pathname;
        } catch {
            return rawUrl;
        }
    }

    // Already an absolute path starting with "/" — strip API_PATH prefix.
    if (rawUrl.startsWith('/')) {
        if (API_PATH && rawUrl.startsWith(API_PATH)) {
            return rawUrl.slice(API_PATH.length).replace(/^\//, '');
        }
        return rawUrl;
    }

    // Relative URL (e.g. "auth/login/") — resolve against the base URL, then strip.
    const rawBase = request.baseURL || API_URL;
    const normalizedBase = rawBase.endsWith('/') ? rawBase : `${rawBase}/`;
    try {
        const origin =
            typeof window !== 'undefined' && window.location?.origin
                ? window.location.origin
                : 'http://localhost';
        const resolved = new URL(rawUrl, new URL(normalizedBase, origin));
        const pathname = `${resolved.pathname}${resolved.search}${resolved.hash}`;
        if (API_PATH && pathname.startsWith(API_PATH)) {
            return pathname.slice(API_PATH.length).replace(/^\//, '');
        }
        return pathname;
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

            // 401 handling — skip for login and refresh endpoints themselves
            const isLoginRequest = originalRequest?.url?.includes('auth/login/');
            const isRefreshRequest = originalRequest?.url?.includes('auth/token/refresh/');
            if (
                error.response?.status === 401 &&
                !originalRequest._retry &&
                !isLoginRequest &&
                !isRefreshRequest
            ) {
                originalRequest._retry = true;
                try {
                    const refreshToken = localStorage.getItem('refresh_token');
                    if (!refreshToken) throw new Error('No refresh token');

                    // Use a plain relative path so axios resolves it against
                    // baseURL — avoids doubling the prefix if API_URL already
                    // contains "/api/v1".
                    const { data } = await api.post(
                        'auth/token/refresh/',
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
            const isAuthRequest = originalRequest?.url?.includes('auth/');
            if (isMutation && isNetworkError && originalRequest?.url && !isAuthRequest) {
                try {
                    await offlineQueue.enqueue({
                        url: toQueueUrl(originalRequest),
                        method: originalRequest.method,
                        body: originalRequest.data,
                        headers: {
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
    if (url.startsWith('blob:') || url.startsWith('data:')) return url;

    let path = url;
    if (url.startsWith('http://') || url.startsWith('https://')) {
        try {
            const parsed = new URL(url);
            const isInternal =
                parsed.hostname.endsWith('nishanaweb.cloud') ||
                parsed.hostname === 'localhost' ||
                parsed.hostname === '127.0.0.1' ||
                parsed.hostname.startsWith('192.168.');
            if (!isInternal) return url;
            path = `${parsed.pathname}${parsed.search}${parsed.hash}`;
        } catch {
            return url;
        }
    }

    if (!path.startsWith('/')) return path;
    return MEDIA_BASE ? `${MEDIA_BASE}${path}` : path;
};

export default api;
