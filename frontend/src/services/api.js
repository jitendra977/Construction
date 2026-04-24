import axios from 'axios';
import offlineQueue from './offlineQueue';

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

        // Global Error Logger for 400/401 debug
        console.error(`❌ API Error [${error.response?.status}]: ${originalRequest?.method?.toUpperCase()} ${originalRequest?.url}`, error.response?.data);

        // If error is 401 and we haven't retried yet
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            console.log("Attempting token refresh...");

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

        // ── Offline queue (HCMS-2 Phase 6) ─────────────────────
        // If this is a mutation and we lost the network, queue the
        // request so it replays when we're back online.
        const method = (originalRequest?.method || '').toLowerCase();
        const isMutation = ['post', 'patch', 'put', 'delete'].includes(method);
        const isNetworkError = !error.response || error.code === 'ERR_NETWORK';
        if (isMutation && isNetworkError && originalRequest?.url) {
            try {
                await offlineQueue.enqueue({
                    url: originalRequest.url,
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
    }
);

// Flush queued writes when connectivity returns
offlineQueue.installOnlineFlush(api);

export const dashboardService = {
    // Project
    getProjects: () => api.get('/projects/'),
    updateProject: (id, data) => api.patch(`/projects/${id}/`, data),

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

    // Finance (Legacy & Categories)
    getBudgetCategories: () => api.get('/finance/budget-categories/'),
    createBudgetCategory: (data) => api.post('/finance/budget-categories/', data),
    updateBudgetCategory: (id, data) => api.patch(`/finance/budget-categories/${id}/`, data),
    deleteBudgetCategory: (id) => api.delete(`/finance/budget-categories/${id}/`),

    getBudgetStats: () => api.get('/finance/expenses/'),
    getExpenses: () => api.get('/finance/expenses/'),
    createExpense: (data) => api.post('/finance/expenses/', data),
    updateExpense: (id, data) => api.patch(`/finance/expenses/${id}/`, data),
    deleteExpense: (id) => api.delete(`/finance/expenses/${id}/`),
    exportExpensesPdf: (params = {}) => api.get('/finance/expenses/export-pdf/', { 
        params, 
        responseType: 'blob' 
    }),

    // Payments
    getPayments: () => api.get('/finance/payments/'),
    createPayment: (data) => api.post('/finance/payments/', data),
    updatePayment: (id, data) => api.patch(`/finance/payments/${id}/`, data),
    deletePayment: (id) => api.delete(`/finance/payments/${id}/`),
    emailPaymentReceipt: (id, data = {}) => api.post(`/finance/payments/${id}/email-receipt/`, data),
    getEmailLogs: (params = {}) => api.get('/email-logs/', { params }), // core email logs not finance

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
    emailSupplier: (materialId, quantity, supplierId, subject, body) =>
        api.post(`/materials/${materialId}/email_supplier/`, {
            quantity,
            supplier_id: supplierId,
            subject,
            body
        }).then(res => res.data),
    receiveMaterialOrder: (transactionId) => api.post(`/material-transactions/${transactionId}/receive_order/`).then(res => res.data),
    recalculateAllMaterialsStock: () => api.post(`/materials/recalculate_all/`),

    getContractors: () => api.get('/contractors/'),
    createContractor: (data) => api.post('/contractors/', data),
    updateContractor: (id, data) => api.patch(`/contractors/${id}/`, data),
    deleteContractor: (id) => api.delete(`/contractors/${id}/`),

    getMaterialTransactions: () => api.get('/material-transactions/'),
    createMaterialTransaction: (data) => {
        if (data.receipt_image instanceof File) {
            const fd = new FormData();
            Object.entries(data).forEach(([k, v]) => {
                if (v !== null && v !== undefined) fd.append(k, v);
            });
            return api.post('/material-transactions/', fd, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
        }
        return api.post('/material-transactions/', data);
    },
    updateMaterialTransaction: (id, data) => {
        if (data.receipt_image instanceof File) {
            const fd = new FormData();
            Object.entries(data).forEach(([k, v]) => {
                if (v !== null && v !== undefined) fd.append(k, v);
            });
            return api.patch(`/material-transactions/${id}/`, fd, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
        }
        return api.patch(`/material-transactions/${id}/`, data);
    },
    deleteMaterialTransaction: (id) => api.delete(`/material-transactions/${id}/`),
    getDocuments: (type) => api.get(`/documents/${type ? `?document_type=${type}` : ''}`),
    createDocument: (formData) => api.post('/documents/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    getGallery: (groupBy = 'category') => api.get(`/gallery/?group_by=${groupBy}`),

    // Funding
    getFundingSources: () => api.get('/finance/funding-sources/'),
    createFundingSource: (data) => api.post('/finance/funding-sources/', data),
    updateFundingSource: (id, data) => api.patch(`/finance/funding-sources/${id}/`, data),
    deleteFundingSource: (id) => api.delete(`/finance/funding-sources/${id}/`),
    createFundingTransaction: (data) => api.post('/finance/funding-transactions/', data),
    deleteFundingTransaction: (id) => api.delete(`/finance/funding-transactions/${id}/`),
    recalculateFundingBalance: (id) => api.post(`/finance/funding-sources/${id}/recalculate/`),
    getPhaseBudgetAllocations: () => api.get('/finance/phase-budget-allocations/'),
    createPhaseBudgetAllocation: (data) => api.post('/finance/phase-budget-allocations/', data),
    updatePhaseBudgetAllocation: (id, data) => api.patch(`/finance/phase-budget-allocations/${id}/`, data),
    deletePhaseBudgetAllocation: (id) => api.delete(`/finance/phase-budget-allocations/${id}/`),

    // Aggregated Dashboard Data (pass project_id to scope to a specific project)
    getDashboardData: async (projectId = null) => {
        try {
            const params = projectId ? { project_id: projectId } : {};
            const response = await api.get('/dashboard/combined/', { params });
            return response.data;
        } catch (error) {
            console.error("Dashboard consolidated fetch failed, falling back to multi-fetch", error);
            throw error;
        }
    },

    // Wastage Alerts
    getWastageAlerts: (params = {}) => api.get('/wastage-alerts/', { params }),
    getWastageDashboard: () => api.get('/wastage-alerts/dashboard/'),
    resolveWastageAlert: (id, resolved_note = '') =>
        api.patch(`/wastage-alerts/${id}/resolve/`, { resolved_note }),
    getMaterialWastageSummary: (materialId) =>
        api.get(`/materials/${materialId}/wastage-summary/`),
    getWastageThresholds: () => api.get('/wastage-thresholds/'),
    createWastageThreshold: (data) => api.post('/wastage-thresholds/', data),

    // User Guides
    getUserGuides: () => api.get('/user-guides/'),
    createUserGuide: (data) => api.post('/user-guides/', data),
    updateUserGuide: (id, data) => api.patch(`/user-guides/${id}/`, data),
    deleteUserGuide: (id) => api.delete(`/user-guides/${id}/`),
    updateGuideProgress: (id, data) => api.post(`/user-guides/${id}/update_progress/`, data),

    // Guide Steps
    createGuideStep: (data) => api.post('/user-guide-steps/', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    updateGuideStep: (id, data) => api.patch(`/user-guide-steps/${id}/`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    deleteGuideStep: (id) => api.delete(`/user-guide-steps/${id}/`),

    // Guide FAQs
    createGuideFaq: (data) => api.post('/user-guide-faqs/', data),
    updateGuideFaq: (id, data) => api.patch(`/user-guide-faqs/${id}/`, data),
    deleteGuideFaq: (id) => api.delete(`/user-guide-faqs/${id}/`),
};

export const accountingService = {
    // ── Summary (single-call dashboard feed) ─────────────────────────────────
    getSummary: (projectId) =>
        api.get('/accounting/summary/' + (projectId ? '?project=' + projectId : '')),

    // ── Ledger ────────────────────────────────────────────────────────────────
    getAccounts: (projectId) => api.get('/accounting/accounts/' + (projectId ? '?project=' + projectId : '')),
    createAccount: (data) => api.post('/accounting/accounts/', data),
    updateAccount: (id, data) => api.patch(`/accounting/accounts/${id}/`, data),
    deleteAccount: (id) => api.delete(`/accounting/accounts/${id}/`),
    getJournalEntries: (projectId) =>
        api.get('/accounting/journal-entries/' + (projectId ? '?project=' + projectId : '')),
    createJournalEntry: (data) => api.post('/accounting/journal-entries/', data),

    // ── Treasury ──────────────────────────────────────────────────────────────
    // ── Treasury (Now using unified Accounts) ────────────────────────────────
    getBanks: (projectId) =>
        api.get(`/accounting/accounts/?account_type=ASSET${projectId ? '&project=' + projectId : ''}`),
    createBank: (data) => api.post('/accounting/accounts/', { ...data, account_type: 'ASSET', is_bank: true }),
    updateBank: (id, data) => api.patch(`/accounting/accounts/${id}/`, data),
    deleteBank: (id) => api.delete(`/accounting/accounts/${id}/`),
    addBankBalance: (id, data) => api.post(`/accounting/accounts/${id}/add-balance/`, data),
    payEMI: (id, data) => api.post(`/accounting/accounts/${id}/pay-emi/`, data),
    getCapitalSources: () => api.get('/accounting/capital-sources/'),
    createCapitalSource: (data) => api.post('/accounting/capital-sources/', data),
    updateCapitalSource: (id, data) => api.patch(`/accounting/capital-sources/${id}/`, data),
    getTransfers: (projectId) =>
        api.get('/accounting/transfers/' + (projectId ? '?project=' + projectId : '')),
    createTransfer: (data) => api.post('/accounting/transfers/', data),

    // ── Vendors ───────────────────────────────────────────────────────────────
    getVendors: () => api.get('/accounting/vendors/'),
    createVendor: (data) => api.post('/accounting/vendors/', data),
    updateVendor: (id, data) => api.patch(`/accounting/vendors/${id}/`, data),
    deleteVendor: (id) => api.delete(`/accounting/vendors/${id}/`),

    // ── Bills ─────────────────────────────────────────────────────────────────
    getBills: (projectId) =>
        api.get('/accounting/bills/' + (projectId ? '?project=' + projectId : '')),
    createBill: (data) => api.post('/accounting/bills/', data),
    updateBill: (id, data) => api.patch(`/accounting/bills/${id}/`, data),

    // ── Payments ──────────────────────────────────────────────────────────────
    getPayments: () => api.get('/accounting/payments/'),
    createPayment: (data) => api.post('/accounting/payments/', data),

    // ── Purchase Orders ───────────────────────────────────────────────────────
    getPurchaseOrders: (projectId) =>
        api.get('/accounting/purchase-orders/' + (projectId ? '?project=' + projectId : '')),
    createPurchaseOrder: (data) => api.post('/accounting/purchase-orders/', data),

    // ── Phase Budgets ─────────────────────────────────────────────────────────
    getPhaseBudgets: (projectId) =>
        api.get('/accounting/phase-budgets/?project=' + projectId),
    getBudgetVariance: (projectId) =>
        api.get('/accounting/phase-budgets/variance/?project=' + projectId),
    updateBudget: (data) => api.post('/accounting/phase-budgets/', data),
    getBudgetRevisions: (budgetLineId) =>
        api.get('/accounting/budget-revisions/?budget_line=' + budgetLineId),

    // ── Contractor Payment Requests ───────────────────────────────────────────
    getPaymentRequests: (projectId) =>
        api.get('/accounting/payment-requests/' + (projectId ? '?project=' + projectId : '')),
    createPaymentRequest: (data) => api.post('/accounting/payment-requests/', data),
    approvePaymentRequest: (id) =>
        api.post(`/accounting/payment-requests/${id}/approve/`),
    getRetentionReleases: () => api.get('/accounting/retention-releases/'),
    createRetentionRelease: (data) => api.post('/accounting/retention-releases/', data),

    // ── Reports ───────────────────────────────────────────────────────────────
    getReport: (type, projectId, months) =>
        api.get('/accounting/reports/?type=' + type +
            (projectId ? '&project=' + projectId : '') +
            '&months=' + (months || 6)),
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
    getTasksByProject: async (projectId) => {
        const response = await api.get('/tasks/', { params: { project: projectId } });
        return response.data;
    },
    getTasksByPhase: async (phaseId) => {
        const response = await api.get('/tasks/', { params: { phase: phaseId } });
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

    /**
     * Force-recalculate all ConstructionPhase.estimated_budget and
     * PhaseBudgetLine.budgeted_amount from current Task sums.
     * Useful after bulk data imports or seed scripts.
     *
     * @param {number|null} projectId  – optional, limits to one project
     */
    recalculateBudgets: async (projectId = null) => {
        const body = projectId ? { project_id: projectId } : {};
        const response = await api.post('/tasks/recalculate_budgets/', body);
        return response.data;
    },

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

export const importService = {
    /**
     * Upload a .sql file to the backend for execution.
     * @param {File} sqlFile - The .sql File object from a file input
     * @param {function} onUploadProgress - Optional axios progress callback
     */
    importSql: (sqlFile, onUploadProgress) => {
        const formData = new FormData();
        formData.append('sql_file', sqlFile);
        return api.post('/import/sql/', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress,
        });
    },

    /**
     * Trigger a full database re-population with sample raw data.
     * Superusers only. 
     */
    populateRawData: () => api.post('/import/populate-raw-data/'),
};

export const accountsService = {
    getActivityLogs: () => api.get('/activity-logs/'),
    getUsers: () => api.get('/users/'),
    createUser: (data) => api.post('/users/', data),
    updateUser: (id, data) => api.patch(`/users/${id}/`, data),
    deleteUser: (id) => api.delete(`/users/${id}/`),
    getRoles: () => api.get('/roles/'),
};

/**
 * Phase 1 — Photo Intelligence & Timelapse.
 *
 * Backend: apps/photo_intel (analyses, timelapses, digests).
 * Every TaskMedia upload automatically schedules a background analysis;
 * these endpoints expose the results and allow re-triggering.
 */
export const photoIntelService = {
    // ── Analyses ────────────────────────────────────────────────
    getAnalyses: (params = {}) => api.get('/photo-intel/analyses/', { params }),
    getAnalysisForTask: (taskId) =>
        api.get('/photo-intel/analyses/', { params: { task: taskId } }),
    getMismatches: () => api.get('/photo-intel/analyses/mismatches/'),
    getAnalysisStats: () => api.get('/photo-intel/analyses/stats/'),
    reanalyze: (id) => api.post(`/photo-intel/analyses/${id}/reanalyze/`),

    // ── Timelapses ──────────────────────────────────────────────
    getTimelapses: (params = {}) => api.get('/photo-intel/timelapses/', { params }),
    generateTimelapse: (payload) => api.post('/photo-intel/timelapses/generate/', payload),
    regenerateTimelapse: (id) => api.post(`/photo-intel/timelapses/${id}/regenerate/`),
    deleteTimelapse: (id) => api.delete(`/photo-intel/timelapses/${id}/`),

    // ── Weekly digests ──────────────────────────────────────────
    getDigests: () => api.get('/photo-intel/digests/'),
    buildCurrentDigest: () => api.post('/photo-intel/digests/build_current/'),
};

/**
 * Phase 2 — Predictive Budget Engine.
 * Forecasts per budget category, rolling supplier rate trends, and a unified
 * alerts feed. The backend services are refreshed on demand via /refresh/.
 */
export const analyticsService = {
    getForecasts: () => api.get('/analytics/forecasts/'),
    refreshForecasts: () => api.post('/analytics/forecasts/refresh/'),

    getRateTrends: () => api.get('/analytics/rate-trends/'),
    refreshRateTrends: () => api.post('/analytics/rate-trends/refresh/'),

    getAlerts: (params = {}) => api.get('/analytics/alerts/', { params }),
    resolveAlert: (id, note = '') =>
        api.post(`/analytics/alerts/${id}/resolve/`, { note }),
    rebuildAll: () => api.post('/analytics/alerts/rebuild/'),
};

/**
 * ── BoQ Auto-Generator (HCMS-2 Phase 3) ───────────────────────────
 */
export const boqService = {
    getTemplates: (params = {}) => api.get('/estimator/boq-templates/', { params }),
    createTemplate: (payload) => api.post('/estimator/boq-templates/', payload),
    seedDefaults: () => api.post('/estimator/boq-templates/seed-defaults/'),

    getGenerated: (projectId) =>
        api.get('/estimator/boqs/', { params: projectId ? { project: projectId } : {} }),
    getGeneratedDetail: (id) => api.get(`/estimator/boqs/${id}/`),
    generateBoQ: (payload) => api.post('/estimator/boqs/generate/', payload),
    applyToBudget: (id) => api.post(`/estimator/boqs/${id}/apply/`),
};

/**
 * ── Voice Assistant (HCMS-2 Phase 4) ──────────────────────────────
 */
export const assistantService = {
    ask: (transcript, language = 'ne') =>
        api.post('/assistant/voice-commands/ask/', { transcript, language }),
    getHistory: () => api.get('/assistant/voice-commands/'),
    getPhrases: () => api.get('/assistant/phrases/'),
    addPhrase: (payload) => api.post('/assistant/phrases/', payload),
};

/**
 * ── Permit Co-Pilot (HCMS-2 Phase 5) ──────────────────────────────
 */
export const permitCopilotService = {
    getTemplates: () => api.get('/permits/municipality-templates/'),
    seedKathmandu: () => api.post('/permits/municipality-templates/seed-kathmandu/'),

    getChecklists: (projectId) =>
        api.get('/permits/checklists/', { params: projectId ? { project: projectId } : {} }),
    getChecklistDetail: (id) => api.get(`/permits/checklists/${id}/`),
    materialiseChecklist: (payload) =>
        api.post('/permits/checklists/materialise/', payload),
    refreshDeadlines: () =>
        api.post('/permits/checklists/refresh-deadlines/'),

    getItems: (checklistId) =>
        api.get('/permits/checklist-items/', { params: { checklist: checklistId } }),
    updateItem: (id, payload) =>
        api.patch(`/permits/checklist-items/${id}/`, payload),
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
