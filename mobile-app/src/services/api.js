import axios from 'axios';
import storage from '../utils/storage';

const API_BASE_URL = 'http://192.168.0.112:8000/api/v1';

const api = axios.create({
    baseURL: API_BASE_URL,
});

api.interceptors.request.use(
    async (config) => {
        const token = await storage.getItem('access_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    });

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = await SecureStore.getItemAsync('refresh_token');
                if (!refreshToken) throw new Error("No refresh token");

                const response = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, {
                    refresh: refreshToken
                });

                const { access } = response.data;
                await SecureStore.setItemAsync('access_token', access);

                originalRequest.headers.Authorization = `Bearer ${access}`;
                return api(originalRequest);
            } catch (refreshError) {
                await SecureStore.deleteItemAsync('access_token');
                await SecureStore.deleteItemAsync('refresh_token');
                await SecureStore.deleteItemAsync('user');
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export const dashboardService = {
    async getDashboardData() {
        const response = await api.get('/dashboard/combined/');
        return response.data;
    },
    async getGallery(groupBy = 'timeline') {
        const response = await api.get(`/gallery/?group_by=${groupBy}`);
        return response.data;
    },
    async emailSupplier(materialId, quantity, supplierId, subject, body) {
        const payload = {
            quantity,
            supplier_id: supplierId,
            subject,
            body
        };
        const response = await api.post(`/materials/${materialId}/email_supplier/`, payload);
        return response.data;
    },
    async createPhase(data) {
        const response = await api.post('/phases/', data);
        return response.data;
    },
    async updatePhase(id, data) {
        const response = await api.put(`/phases/${id}/`, data);
        return response.data;
    },
    async deletePhase(id) {
        const response = await api.delete(`/phases/${id}/`);
        return response.data;
    }
};

export const getMediaUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    const baseUrl = API_BASE_URL.replace('/api/v1', '');
    return `${baseUrl}${url}`;
};

export default api;
