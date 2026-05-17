import api from './client';

export const accountingService = {
    // Summary
    getSummary: (projectId) =>
        api.get('accounting/summary/' + (projectId ? '?project=' + projectId : '')),

    // Accounts / Ledger
    getAccounts: (projectId) =>
        api.get('accounting/accounts/' + (projectId ? '?project=' + projectId : '')),
    createAccount: (data) => api.post('accounting/accounts/', data),
    updateAccount: (id, data) => api.patch(`accounting/accounts/${id}/`, data),
    deleteAccount: (id) => api.delete(`accounting/accounts/${id}/`),

    getJournalEntries: (projectId) =>
        api.get('accounting/journal-entries/' + (projectId ? '?project=' + projectId : '')),
    createJournalEntry: (data) => api.post('accounting/journal-entries/', data),

    // Treasury / Banks
    getBanks: (projectId) =>
        api.get(`accounting/accounts/?account_type=ASSET${projectId ? '&project=' + projectId : ''}`),
    createBank: (data) =>
        api.post('accounting/accounts/', { ...data, account_type: 'ASSET', is_bank: true }),
    updateBank: (id, data) => api.patch(`accounting/accounts/${id}/`, data),
    deleteBank: (id) => api.delete(`accounting/accounts/${id}/`),
    addBankBalance: (id, data) => api.post(`accounting/accounts/${id}/add-balance/`, data),
    payEMI: (id, data) => api.post(`accounting/accounts/${id}/pay-emi/`, data),
    getCapitalSources: () => api.get('accounting/capital-sources/'),
    createCapitalSource: (data) => api.post('accounting/capital-sources/', data),
    updateCapitalSource: (id, data) => api.patch(`accounting/capital-sources/${id}/`, data),
    getTransfers: (projectId) =>
        api.get('accounting/transfers/' + (projectId ? '?project=' + projectId : '')),
    createTransfer: (data) => api.post('accounting/transfers/', data),

    // Vendors
    getVendors: () => api.get('accounting/vendors/'),
    createVendor: (data) => api.post('accounting/vendors/', data),
    updateVendor: (id, data) => api.patch(`accounting/vendors/${id}/`, data),
    deleteVendor: (id) => api.delete(`accounting/vendors/${id}/`),

    // Bills
    getBills: (projectId) =>
        api.get('accounting/bills/' + (projectId ? '?project=' + projectId : '')),
    createBill: (data) => api.post('accounting/bills/', data),
    updateBill: (id, data) => api.patch(`accounting/bills/${id}/`, data),

    // Payments
    getPayments: () => api.get('accounting/payments/'),
    createPayment: (data) => api.post('accounting/payments/', data),

    // Purchase Orders
    getPurchaseOrders: (projectId) =>
        api.get('accounting/purchase-orders/' + (projectId ? '?project=' + projectId : '')),
    createPurchaseOrder: (data) => api.post('accounting/purchase-orders/', data),

    // Phase Budgets
    getPhaseBudgets: (projectId) =>
        api.get('accounting/phase-budgets/?project=' + projectId),
    getBudgetVariance: (projectId) =>
        api.get('accounting/phase-budgets/variance/?project=' + projectId),
    updateBudget: (data) => api.post('accounting/phase-budgets/', data),
    getBudgetRevisions: (budgetLineId) =>
        api.get('accounting/budget-revisions/?budget_line=' + budgetLineId),

    // Contractor Payment Requests
    getPaymentRequests: (projectId) =>
        api.get('accounting/payment-requests/' + (projectId ? '?project=' + projectId : '')),
    createPaymentRequest: (data) => api.post('accounting/payment-requests/', data),
    approvePaymentRequest: (id) => api.post(`accounting/payment-requests/${id}/approve/`),
    getRetentionReleases: () => api.get('accounting/retention-releases/'),
    createRetentionRelease: (data) => api.post('accounting/retention-releases/', data),

    // Reports
    getReport: (type, projectId, months) =>
        api.get(
            'accounting/reports/?type=' + type +
            (projectId ? '&project=' + projectId : '') +
            '&months=' + (months || 6),
        ),
};
