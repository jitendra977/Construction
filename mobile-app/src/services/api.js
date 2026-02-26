import axios from 'axios';
import storage from '../utils/storage';

const API_BASE_URL = 'https://api.construction.nishanaweb.cloud/api/v1';

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

let logoutCallback = null;

export const setOnLogout = (callback) => {
    logoutCallback = callback;
};

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = await storage.getItem('refresh_token');
                if (!refreshToken) throw new Error("No refresh token");

                const response = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, {
                    refresh: refreshToken
                });

                const { access } = response.data;
                await storage.setItem('access_token', access);

                originalRequest.headers.Authorization = `Bearer ${access}`;
                return api(originalRequest);
            } catch (refreshError) {
                // Safe removal
                if (storage.removeItem) {
                    await storage.removeItem('access_token');
                    await storage.removeItem('refresh_token');
                    await storage.removeItem('user');
                } else if (storage.deleteItem) {
                    await storage.deleteItem('access_token');
                    await storage.deleteItem('refresh_token');
                    await storage.deleteItem('user');
                }

                // Trigger logout callback if registered
                if (logoutCallback) {
                    logoutCallback();
                }

                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

// Dashboard Service
export const dashboardService = {
    async getDashboardData() {
        const response = await api.get('/dashboard/combined/');
        return response.data;
    },
    async getGallery(groupBy = 'timeline') {
        const response = await api.get(`/gallery/?group_by=${groupBy}`);
        return response.data;
    },
};

// Phase Service
export const phaseService = {
    async getPhases() {
        const response = await api.get('/phases/');
        return response.data;
    },
    async getPhase(id) {
        const response = await api.get(`/phases/${id}/`);
        return response.data;
    },
    async createPhase(data) {
        const formData = new FormData();
        Object.keys(data).forEach(key => {
            if (data[key] !== null && data[key] !== undefined) {
                formData.append(key, data[key]);
            }
        });
        const response = await api.post('/phases/', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },
    async updatePhase(id, data) {
        const formData = new FormData();
        Object.keys(data).forEach(key => {
            if (data[key] !== null && data[key] !== undefined) {
                formData.append(key, data[key]);
            }
        });
        const response = await api.put(`/phases/${id}/`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },
    async deletePhase(id) {
        const response = await api.delete(`/phases/${id}/`);
        return response.data;
    }
};

// Material Service
export const materialService = {
    async getMaterials() {
        const response = await api.get('/materials/');
        return response.data;
    },
    async getMaterial(id) {
        const response = await api.get(`/materials/${id}/`);
        return response.data;
    },
    async createMaterial(data) {
        const response = await api.post('/materials/', data);
        return response.data;
    },
    async updateMaterial(id, data) {
        const response = await api.put(`/materials/${id}/`, data);
        return response.data;
    },
    async emailSupplier(materialId, quantity, supplierId, subject, body) {
        const payload = { quantity, supplier_id: supplierId, subject, body };
        const response = await api.post(`/materials/${materialId}/email_supplier/`, payload);
        return response.data;
    },
    async recalculateStock(materialId) {
        const response = await api.post(`/materials/${materialId}/recalculate_stock/`);
        return response.data;
    },
};

// Material Transaction Service
export const materialTransactionService = {
    async getTransactions(filters = {}) {
        const params = new URLSearchParams(filters);
        const response = await api.get(`/material-transactions/?${params}`);
        return response.data;
    },
    async createTransaction(data) {
        const response = await api.post('/material-transactions/', data);
        return response.data;
    },
    async updateTransaction(id, data) {
        const response = await api.put(`/material-transactions/${id}/`, data);
        return response.data;
    },
    async deleteTransaction(id) {
        const response = await api.delete(`/material-transactions/${id}/`);
        return response.data;
    },
    async receiveOrder(transactionId, updateData = {}) {
        const response = await api.post(`/material-transactions/${transactionId}/receive_order/`, updateData);
        return response.data;
    },
};

// Expense & Payment Service
export const financeService = {
    async getExpenses() {
        const response = await api.get('/expenses/');
        return response.data;
    },
    async getExpense(id) {
        const response = await api.get(`/expenses/${id}/`);
        return response.data;
    },
    async createExpense(data) {
        const response = await api.post('/expenses/', data);
        return response.data;
    },
    async updateExpense(id, data) {
        const response = await api.put(`/expenses/${id}/`, data);
        return response.data;
    },
    async deleteExpense(id) {
        const response = await api.delete(`/expenses/${id}/`);
        return response.data;
    },
    async getExpenseOverview() {
        const response = await api.get('/expenses/overview/');
        return response.data;
    },
    async getPayments() {
        const response = await api.get('/payments/');
        return response.data;
    },
    async createPayment(data) {
        const response = await api.post('/payments/', data);
        return response.data;
    },
    async getBudgetCategories() {
        const response = await api.get('/budget-categories/');
        return response.data;
    },
};

// Funding Service
export const fundingService = {
    async getFundingSources() {
        const response = await api.get('/funding-sources/');
        return response.data;
    },
    async getFundingSource(id) {
        const response = await api.get(`/funding-sources/${id}/`);
        return response.data;
    },
    async createFundingSource(data) {
        const response = await api.post('/funding-sources/', data);
        return response.data;
    },
    async updateFundingSource(id, data) {
        const response = await api.put(`/funding-sources/${id}/`, data);
        return response.data;
    },
    async getFundingTransactions() {
        const response = await api.get('/funding-transactions/');
        return response.data;
    },
};

// Supplier Service
export const supplierService = {
    async getSuppliers() {
        const response = await api.get('/suppliers/');
        return response.data;
    },
    async getSupplier(id) {
        const response = await api.get(`/suppliers/${id}/`);
        return response.data;
    },
    async createSupplier(data) {
        const response = await api.post('/suppliers/', data);
        return response.data;
    },
    async updateSupplier(id, data) {
        const response = await api.put(`/suppliers/${id}/`, data);
        return response.data;
    },
    async deleteSupplier(id) {
        const response = await api.delete(`/suppliers/${id}/`);
        return response.data;
    },
};

// Contractor Service
export const contractorService = {
    async getContractors() {
        const response = await api.get('/contractors/');
        return response.data;
    },
    async getContractor(id) {
        const response = await api.get(`/contractors/${id}/`);
        return response.data;
    },
    async createContractor(data) {
        const response = await api.post('/contractors/', data);
        return response.data;
    },
    async updateContractor(id, data) {
        const response = await api.put(`/contractors/${id}/`, data);
        return response.data;
    },
    async deleteContractor(id) {
        const response = await api.delete(`/contractors/${id}/`);
        return response.data;
    },
};

// Permit Service
export const permitService = {
    async getPermits() {
        const response = await api.get('/permits/steps/');
        return response.data;
    },
    async getPermit(id) {
        const response = await api.get(`/permits/steps/${id}/`);
        return response.data;
    },
    async createPermit(data) {
        const response = await api.post('/permits/steps/', data);
        return response.data;
    },
    async updatePermit(id, data) {
        const response = await api.put(`/permits/steps/${id}/`, data);
        return response.data;
    },
    async getLegalDocuments() {
        const response = await api.get('/permits/legal-documents/');
        return response.data;
    },
};

// Estimator Service
export const estimatorService = {
    async getConstructionRates() {
        const response = await api.get('/estimator/rates/');
        return response.data;
    },
    async updateRate(id, data) {
        const response = await api.put(`/estimator/rates/${id}/`, data);
        return response.data;
    },
    async calculateEstimate(data) {
        const response = await api.post('/estimator/calculate/', data);
        return response.data;
    },
};

// Task Service
export const taskService = {
    async getTasks() {
        const response = await api.get('/tasks/');
        return response.data;
    },
    async getTask(id) {
        const response = await api.get(`/tasks/${id}/`);
        return response.data;
    },
    async createTask(data) {
        const response = await api.post('/tasks/', data);
        return response.data;
    },
    async updateTask(id, data) {
        const response = await api.put(`/tasks/${id}/`, data);
        return response.data;
    },
    async deleteTask(id) {
        const response = await api.delete(`/tasks/${id}/`);
        return response.data;
    },
    async getTaskMedia(taskId) {
        const response = await api.get(`/task-media/?task=${taskId}`);
        return response.data;
    },
    async uploadTaskMedia(taskId, file, mediaType = 'IMAGE') {
        const formData = new FormData();
        formData.append('task', taskId);
        formData.append('file', file);
        formData.append('media_type', mediaType);
        const response = await api.post('/task-media/', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },
    async getTaskUpdates(taskId) {
        const response = await api.get(`/updates/?task=${taskId}`);
        return response.data;
    },
    async createTaskUpdate(data) {
        const response = await api.post('/updates/', data);
        return response.data;
    },
};

// Document Service
export const documentService = {
    async getDocuments(filters = {}) {
        const params = new URLSearchParams(filters);
        const response = await api.get(`/documents/?${params}`);
        return response.data;
    },
    async uploadDocument(data) {
        const formData = new FormData();
        Object.keys(data).forEach(key => {
            if (data[key] !== null && data[key] !== undefined) {
                formData.append(key, data[key]);
            }
        });
        const response = await api.post('/documents/', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },
};

// Project Service
export const projectService = {
    async getProject() {
        const response = await api.get('/projects/');
        return response.data[0]; // Singleton
    },
    async updateProject(id, data) {
        const response = await api.put(`/projects/${id}/`, data);
        return response.data;
    },
};

// User/Profile Service
export const userService = {
    async getProfile() {
        const response = await api.get('/auth/profile/');
        return response.data;
    },
    async updateProfile(userData) {
        const config = {};
        let data = userData;

        // In React Native, we need to handle FormData for file uploads
        if (userData.profile?.avatar && userData.profile.avatar.uri) {
            config.headers = { 'Content-Type': 'multipart/form-data' };
            const formData = new FormData();

            if (userData.first_name) formData.append('first_name', userData.first_name);
            if (userData.last_name) formData.append('last_name', userData.last_name);

            if (userData.profile) {
                Object.keys(userData.profile).forEach(key => {
                    if (key === 'avatar') {
                        const avatar = userData.profile[key];
                        if (avatar.uri) {
                            formData.append('profile.avatar', {
                                uri: avatar.uri,
                                type: avatar.type || 'image/jpeg',
                                name: avatar.fileName || 'profile.jpg',
                            });
                        }
                    } else {
                        formData.append(`profile.${key}`, userData.profile[key]);
                    }
                });
            }
            data = formData;
        }

        const response = await api.patch('/auth/profile/', data, config);
        return response.data;
    },
};

export const getMediaUrl = (url, bustCache = false) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    const baseUrl = API_BASE_URL.replace('/api/v1', '');
    const finalUrl = `${baseUrl}${url}`;
    return bustCache ? `${finalUrl}?t=${new Date().getTime()}` : finalUrl;
};

export default api;
