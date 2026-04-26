/**
 * accountsApi.js — Accounts Module API client
 * All requests go to /api/v1/accounts/ (and /api/v1/auth/ for auth actions)
 */
import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || '/api/v1';

const http = axios.create({ baseURL: BASE });

// ── JWT injection ─────────────────────────────────────────────────────────────
http.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// ── Token refresh on 401 ─────────────────────────────────────────────────────
http.interceptors.response.use(
    (res) => res,
    async (err) => {
        const original = err.config;
        if (err.response?.status === 401 && !original._retry) {
            original._retry = true;
            const refresh = localStorage.getItem('refresh_token');
            if (refresh) {
                try {
                    const { data } = await axios.post(`${BASE}/auth/token/refresh/`, { refresh });
                    localStorage.setItem('access_token', data.access);
                    original.headers.Authorization = `Bearer ${data.access}`;
                    return http(original);
                } catch {
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('refresh_token');
                    window.location.href = '/login';
                }
            }
        }
        return Promise.reject(err);
    }
);

// ── Stats ─────────────────────────────────────────────────────────────────────
export const getStats            = ()         => http.get('/accounts/stats/');

// ── Profile (current user) ────────────────────────────────────────────────────
export const getProfile          = ()         => http.get('/auth/profile/');
export const updateProfile       = (data)     => http.patch('/auth/profile/', data, {
    headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
});
export const changePassword      = (data)     => http.post('/accounts/change-password/', data);

// ── Users ─────────────────────────────────────────────────────────────────────
export const getUsers            = ()         => http.get('/accounts/users/');
export const getUser             = (id)       => http.get(`/accounts/users/${id}/`);
export const createUser          = (data)     => http.post('/accounts/users/', data, {
    headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
});
export const updateUser          = (id, data) => http.patch(`/accounts/users/${id}/`, data, {
    headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
});
export const deleteUser          = (id)       => http.delete(`/accounts/users/${id}/`);
export const activateUser        = (id)       => http.post(`/accounts/users/${id}/activate/`);
export const deactivateUser      = (id)       => http.post(`/accounts/users/${id}/deactivate/`);
export const resetUserPassword   = (id, data) => http.post(`/accounts/users/${id}/reset-password/`, data);
export const inviteUser          = (data)     => http.post('/accounts/users/invite/', data);

// ── Roles ─────────────────────────────────────────────────────────────────────
export const getRoles            = ()         => http.get('/accounts/roles/');
export const getRole             = (id)       => http.get(`/accounts/roles/${id}/`);
export const createRole          = (data)     => http.post('/accounts/roles/', data);
export const updateRole          = (id, data) => http.patch(`/accounts/roles/${id}/`, data);
export const deleteRole          = (id)       => http.delete(`/accounts/roles/${id}/`);

// ── Activity Logs ─────────────────────────────────────────────────────────────
export const getActivityLogs     = (params={}) => {
    const qs = new URLSearchParams();
    if (params.action  && params.action  !== 'ALL') qs.set('action',  params.action);
    if (params.model   && params.model   !== 'ALL') qs.set('model',   params.model);
    if (params.user_id)                              qs.set('user_id', params.user_id);
    if (params.days)                                 qs.set('days',    params.days);
    return http.get(`/accounts/activity-logs/?${qs.toString()}`);
};

const accountsApi = {
    getStats,
    getProfile, updateProfile, changePassword,
    getUsers, getUser, createUser, updateUser, deleteUser,
    activateUser, deactivateUser, resetUserPassword, inviteUser,
    getRoles, getRole, createRole, updateRole, deleteRole,
    getActivityLogs,
};

export default accountsApi;
