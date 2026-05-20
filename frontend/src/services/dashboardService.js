import api from './client';

export const dashboardService = {
    // Project
    getProjects: () => api.get('projects/'),
    updateProject: (id, data) => api.patch(`projects/${id}/`, data),

    // Phases & Floors
    getPhases: () => api.get('phases/'),
    getFloors: () => api.get('floors/'),
    createFloor: (data) => api.post('floors/', data),
    updateFloor: (id, data) => api.patch(`floors/${id}/`, data),
    deleteFloor: (id) => api.delete(`floors/${id}/`),

    // Rooms
    getRooms: () => api.get('rooms/'),
    createRoom: (data) => api.post('rooms/', data),
    updateRoom: (id, data) => api.patch(`rooms/${id}/`, data),
    deleteRoom: (id) => api.delete(`rooms/${id}/`),

    // Tasks
    getTasks: () => api.get('tasks/'),
    getRecentUpdates: () => api.get('updates/'),

    // ── Canonical: fin expenses (/api/v1/fin/expenses/) ──────────────────────
    getBudgetCategories: () => api.get('fin/budget-categories/'),
    createBudgetCategory: (data) => api.post('fin/budget-categories/', data),
    updateBudgetCategory: (id, data) => api.patch(`fin/budget-categories/${id}/`, data),
    deleteBudgetCategory: (id) => api.delete(`fin/budget-categories/${id}/`),

    getBudgetStats: () => api.get('fin/expenses/'),
    getExpenses: () => api.get('fin/expenses/'),
    createExpense: (data) => api.post('fin/expenses/', data),
    updateExpense: (id, data) => api.patch(`fin/expenses/${id}/`, data),
    deleteExpense: (id) => api.delete(`fin/expenses/${id}/`),
    // exportExpensesPdf not available on fin — keep legacy fallback if needed
    exportExpensesPdf: (params = {}) =>
        api.get('finance/expenses/export-pdf/', { params, responseType: 'blob' }),

    // ── DEPRECATED: Legacy finance payments (/api/v1/finance/) ───────────────
    // Payment / FundingSource / FundingTransaction have no fin equivalents yet
    // ─────────────────────────────────────────────────────────────────────────
    getPayments: () => api.get('finance/payments/'),
    createPayment: (data) => api.post('finance/payments/', data),
    updatePayment: (id, data) => api.patch(`finance/payments/${id}/`, data),
    deletePayment: (id) => api.delete(`finance/payments/${id}/`),
    emailPaymentReceipt: (id, data = {}) =>
        api.post(`finance/payments/${id}/email-receipt/`, data),
    getEmailLogs: (params = {}) => api.get('email-logs/', { params }),

    // Resources
    getSuppliers: () => api.get('suppliers/'),
    createSupplier: (data) => api.post('suppliers/', data),
    updateSupplier: (id, data) => api.patch(`suppliers/${id}/`, data),
    deleteSupplier: (id) => api.delete(`suppliers/${id}/`),

    getMaterials: () => api.get('materials/'),
    createMaterial: (data) => api.post('materials/', data),
    updateMaterial: (id, data) => api.patch(`materials/${id}/`, data),
    deleteMaterial: (id) => api.delete(`materials/${id}/`),
    recalculateMaterialStock: (id) => api.post(`materials/${id}/recalculate_stock/`),
    emailSupplier: (materialId, quantity, supplierId, subject, body) =>
        api.post(`materials/${materialId}/email_supplier/`, {
            quantity, supplier_id: supplierId, subject, body,
        }).then((res) => res.data),
    receiveMaterialOrder: (transactionId) =>
        api.post(`material-transactions/${transactionId}/receive_order/`).then((r) => r.data),
    recalculateAllMaterialsStock: () => api.post('materials/recalculate_all/'),

    getContractors: () => api.get('contractors/'),
    createContractor: (data) => api.post('contractors/', data),
    updateContractor: (id, data) => api.patch(`contractors/${id}/`, data),
    deleteContractor: (id) => api.delete(`contractors/${id}/`),

    getMaterialTransactions: () => api.get('material-transactions/'),
    createMaterialTransaction: (data) => {
        if (data.receipt_image instanceof File) {
            const fd = new FormData();
            Object.entries(data).forEach(([k, v]) => {
                if (v !== null && v !== undefined) fd.append(k, v);
            });
            return api.post('material-transactions/', fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
        }
        return api.post('material-transactions/', data);
    },
    updateMaterialTransaction: (id, data) => {
        if (data.receipt_image instanceof File) {
            const fd = new FormData();
            Object.entries(data).forEach(([k, v]) => {
                if (v !== null && v !== undefined) fd.append(k, v);
            });
            return api.patch(`material-transactions/${id}/`, fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
        }
        return api.patch(`material-transactions/${id}/`, data);
    },
    deleteMaterialTransaction: (id) => api.delete(`material-transactions/${id}/`),

    getDocuments: (type) =>
        api.get(`documents/${type ? `?document_type=${type}` : ''}`),
    createDocument: (formData) =>
        api.post('documents/', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),
    getGallery: (groupBy = 'category') => api.get(`gallery/?group_by=${groupBy}`),

    // Funding (legacy — no fin equivalent; see DEPRECATED note above)
    getFundingSources: () => api.get('finance/funding-sources/'),
    createFundingSource: (data) => api.post('finance/funding-sources/', data),
    updateFundingSource: (id, data) => api.patch(`finance/funding-sources/${id}/`, data),
    deleteFundingSource: (id) => api.delete(`finance/funding-sources/${id}/`),
    createFundingTransaction: (data) => api.post('finance/funding-transactions/', data),
    deleteFundingTransaction: (id) => api.delete(`finance/funding-transactions/${id}/`),
    recalculateFundingBalance: (id) => api.post(`finance/funding-sources/${id}/recalculate/`),
    getPhaseBudgetAllocations: () => api.get('finance/phase-budget-allocations/'),
    createPhaseBudgetAllocation: (data) => api.post('finance/phase-budget-allocations/', data),
    updatePhaseBudgetAllocation: (id, data) =>
        api.patch(`finance/phase-budget-allocations/${id}/`, data),
    deletePhaseBudgetAllocation: (id) => api.delete(`finance/phase-budget-allocations/${id}/`),

    // Aggregated dashboard data
    getDashboardData: async (projectId = null) => {
        const params = projectId ? { project_id: projectId } : {};
        const response = await api.get('dashboard/combined/', { params });
        return response.data;
    },

    // Wastage Alerts
    getWastageAlerts: (params = {}) => api.get('wastage-alerts/', { params }),
    getWastageDashboard: () => api.get('wastage-alerts/dashboard/'),
    resolveWastageAlert: (id, resolved_note = '') =>
        api.patch(`wastage-alerts/${id}/resolve/`, { resolved_note }),
    getMaterialWastageSummary: (materialId) =>
        api.get(`materials/${materialId}/wastage-summary/`),
    getWastageThresholds: () => api.get('wastage-thresholds/'),
    createWastageThreshold: (data) => api.post('wastage-thresholds/', data),

    // User Guides
    getUserGuides: () => api.get('user-guides/'),
    createUserGuide: (data) => api.post('user-guides/', data),
    updateUserGuide: (id, data) => api.patch(`user-guides/${id}/`, data),
    deleteUserGuide: (id) => api.delete(`user-guides/${id}/`),
    updateGuideProgress: (id, data) => api.post(`user-guides/${id}/update_progress/`, data),

    createGuideStep: (data) =>
        api.post('user-guide-steps/', data, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),
    updateGuideStep: (id, data) =>
        api.patch(`user-guide-steps/${id}/`, data, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),
    deleteGuideStep: (id) => api.delete(`user-guide-steps/${id}/`),

    createGuideFaq: (data) => api.post('user-guide-faqs/', data),
    updateGuideFaq: (id, data) => api.patch(`user-guide-faqs/${id}/`, data),
    deleteGuideFaq: (id) => api.delete(`user-guide-faqs/${id}/`),

    createGuideSection: (data) => api.post('user-guide-sections/', data),
    updateGuideSection: (id, data) => api.patch(`user-guide-sections/${id}/`, data),
    deleteGuideSection: (id) => api.delete(`user-guide-sections/${id}/`),
};
