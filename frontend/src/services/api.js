import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

const getAuthHeader = () => {
    const accessToken = localStorage.getItem('access_token');
    if (accessToken) {
        return { Authorization: `Bearer ${accessToken}` };
    }
    return {};
};

const api = axios.create({
    baseURL: API_URL,
});

api.interceptors.request.use((config) => {
    const headers = getAuthHeader();
    if (headers && headers.Authorization) {
        config.headers.Authorization = headers.Authorization;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

// Response interceptor for token refresh
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // If error is 401 and we haven't retried yet
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = localStorage.getItem('refresh_token');
                if (!refreshToken) throw new Error("No refresh token");

                // Attempt to refresh
                const response = await axios.post(`${API_URL}/auth/token/refresh/`, {
                    refresh: refreshToken
                });

                const { access } = response.data;
                localStorage.setItem('access_token', access);

                // Update header and retry
                originalRequest.headers.Authorization = `Bearer ${access}`;
                return api(originalRequest);
            } catch (refreshError) {
                // If refresh fails, logout
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                localStorage.removeItem('user');

                // Only redirect if not already on login
                if (!window.location.pathname.startsWith('/login')) {
                    window.location.href = '/login?expired=true';
                }
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export const dashboardService = {
    // Project
    getProjects: () => api.get('/projects/'),

    // Phases & Floors
    getPhases: () => api.get('/phases/'),
    getFloors: () => api.get('/floors/'),
    createFloor: (data) => api.post('/floors/', data),
    updateFloor: (id, data) => api.patch(`/floors/${id}/`, data),
    deleteFloor: (id) => api.delete(`/floors/${id}/`),

    // Rooms
    getRooms: () => api.get('/rooms/'),
    createRoom: (data) => api.post('/rooms/', data),
    updateRoom: (id, data) => api.patch(`/rooms/${id}/`, data),
    deleteRoom: (id) => api.delete(`/rooms/${id}/`),

    // Tasks
    getTasks: () => api.get('/tasks/'),
    getRecentUpdates: () => api.get('/updates/'),

    // Finance
    getBudgetCategories: () => api.get('/budget-categories/'),
    createBudgetCategory: (data) => api.post('/budget-categories/', data),
    updateBudgetCategory: (id, data) => api.patch(`/budget-categories/${id}/`, data),
    deleteBudgetCategory: (id) => api.delete(`/budget-categories/${id}/`),

    getBudgetStats: () => api.get('/expenses/'),
    getBudgetOverview: () => api.get('/expenses/overview/'),
    getExpenses: () => api.get('/expenses/'),
    createExpense: (data) => api.post('/expenses/', data),
    updateExpense: (id, data) => api.patch(`/expenses/${id}/`, data),
    deleteExpense: (id) => api.delete(`/expenses/${id}/`),

    // Payments
    getPayments: () => api.get('/payments/'),
    createPayment: (data) => api.post('/payments/', data),
    deletePayment: (id) => api.delete(`/payments/${id}/`),

    // Resources
    getSuppliers: () => api.get('/suppliers/'),
    createSupplier: (data) => api.post('/suppliers/', data),
    updateSupplier: (id, data) => api.patch(`/suppliers/${id}/`, data),
    deleteSupplier: (id) => api.delete(`/suppliers/${id}/`),

    getMaterials: () => api.get('/materials/'),
    createMaterial: (data) => api.post('/materials/', data),
    updateMaterial: (id, data) => api.patch(`/materials/${id}/`, data),
    deleteMaterial: (id) => api.delete(`/materials/${id}/`),
    recalculateMaterialStock: (id) => api.post(`/materials/${id}/recalculate_stock/`),
    recalculateAllMaterialsStock: () => api.post(`/materials/recalculate_all/`),

    getContractors: () => api.get('/contractors/'),
    createContractor: (data) => api.post('/contractors/', data),
    updateContractor: (id, data) => api.patch(`/contractors/${id}/`, data),
    deleteContractor: (id) => api.delete(`/contractors/${id}/`),

    getMaterialTransactions: () => api.get('/material-transactions/'),
    createMaterialTransaction: (data) => api.post('/material-transactions/', data),
    updateMaterialTransaction: (id, data) => api.patch(`/material-transactions/${id}/`, data),
    deleteMaterialTransaction: (id) => api.delete(`/material-transactions/${id}/`),
    getDocuments: (type) => api.get(`/documents/${type ? `?document_type=${type}` : ''}`),
    createDocument: (formData) => api.post('/documents/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    getGallery: (groupBy = 'category') => api.get(`/gallery/?group_by=${groupBy}`),

    // Funding
    getFundingSources: () => api.get('/funding-sources/'),
    createFundingSource: (data) => api.post('/funding-sources/', data),
    updateFundingSource: (id, data) => api.patch(`/funding-sources/${id}/`, data),
    deleteFundingSource: (id) => api.delete(`/funding-sources/${id}/`),
    createFundingTransaction: (data) => api.post('/funding-transactions/', data),

    // Aggregated Dashboard Data
    getContractors: () => api.get('/contractors/'),

    // Dashboard Data - Aggregated
    getDashboardData: async () => {
        try {
            const [projects, rooms, tasks, phases, expenses, floors, materials, contractors, budgetCategories, suppliers, transactions, permits, funding] = await Promise.all([
                api.get('/projects/'),
                api.get('/rooms/'),
                api.get('/tasks/'),
                api.get('/phases/'),
                api.get('/expenses/'),
                api.get('/floors/'),
                api.get('/materials/'),
                api.get('/contractors/'),
                api.get('/budget-categories/'),
                api.get('/suppliers/'),
                api.get('/material-transactions/'),
                api.get('/permits/steps/'),
                api.get('/funding-sources/'),
            ]);

            return {
                project: projects.data[0] || null,
                rooms: rooms.data,
                tasks: tasks.data,
                phases: phases.data,
                expenses: expenses.data,
                floors: floors.data,
                materials: materials.data,
                contractors: contractors.data,
                budgetCategories: budgetCategories.data,
                suppliers: suppliers.data,
                transactions: transactions.data,
                permits: permits.data,
                funding: funding.data,
            };
        } catch (error) {
            console.error("Error fetching dashboard data:", error);
            throw error;
        }
    },
};

export const constructionService = {
    // Phases
    getPhases: async () => {
        const response = await api.get('/phases/');
        return response.data;
    },
    createPhase: async (data) => {
        const response = await api.post('/phases/', data);
        return response.data;
    },
    updatePhase: async (id, data) => {
        const response = await api.patch(`/phases/${id}/`, data);
        return response.data;
    },
    deletePhase: async (id) => {
        await api.delete(`/phases/${id}/`);
    },

    // Tasks
    getTasks: async () => {
        const response = await api.get('/tasks/');
        return response.data;
    },
    createTask: async (data) => {
        const response = await api.post('/tasks/', data);
        return response.data;
    },
    updateTask: async (id, data) => {
        const response = await api.patch(`/tasks/${id}/`, data);
        return response.data;
    },
    deleteTask: async (id) => {
        await api.delete(`/tasks/${id}/`);
    },
    reorderPhases: (order) => api.post('/phases/reorder/', { order }),

    // Task Media
    uploadTaskMedia: async (data) => {
        const response = await api.post('/task-media/', data, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },
    deleteTaskMedia: async (id) => {
        await api.delete(`/task-media/${id}/`);
    },
};

export const calculatorService = {
    calculateWall: (data) => api.post('/estimator/wall/', data),
    calculateConcrete: (data) => api.post('/estimator/concrete/', data),
    calculatePlaster: (data) => api.post('/estimator/plaster/', data),
    calculateFlooring: (data) => api.post('/estimator/flooring/', data),
    calculateBudget: (data) => api.post('/estimator/budget/', data),
    getRates: () => api.get('/estimator/rates/'),
    updateRate: (id, data) => api.patch(`/estimator/rates/${id}/`, data),
};

export const permitService = {
    getSteps: () => api.get('/permits/steps/'),
    createStep: (data) => api.post('/permits/steps/', data),
    updateStep: (id, data) => api.put(`/permits/steps/${id}/`, data),
    deleteStep: (id) => api.delete(`/permits/steps/${id}/`),

    // Attach/detach documents to permit steps
    attachDocument: (stepId, documentId) => api.post(`/permits/steps/${stepId}/attach_document/`, { document_id: documentId }),
    detachDocument: (stepId, documentId) => api.post(`/permits/steps/${stepId}/detach_document/`, { document_id: documentId }),

    getDocuments: () => api.get('/permits/documents/'),
    createDocument: (data) => api.post('/permits/documents/', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    deleteDocument: (id) => api.delete(`/permits/documents/${id}/`),
};

/**
 * Helper to get the full URL for media files.
 * In dev, prepends the backend server URL.
 * In prod, keeps it relative since Nginx handles it.
 */
export const getMediaUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;

    // API_URL might be "http://localhost:8000/api/v1" or just "/api/v1"
    const base = API_URL.replace('/api/v1', '').replace(/\/$/, '');
    return `${base}${url}`;
};

export default api;
