import api from './api';

export const accountingService = {
    // ── Summary (single-call dashboard feed) ─────────────────────────────────
    getSummary: (projectId) =>
        api.get('/accounting/summary/' + (projectId ? '?project=' + projectId : '')),

    // ── Ledger ────────────────────────────────────────────────────────────────
    getAccounts: () => api.get('/accounting/accounts/'),
    createAccount: (data) => api.post('/accounting/accounts/', data),
    updateAccount: (id, data) => api.patch('/accounting/accounts/' + id + '/', data),
    getJournalEntries: () => api.get('/accounting/journal-entries/'),

    // ── Treasury ──────────────────────────────────────────────────────────────
    getBanks: (projectId) =>
        api.get('/accounting/banks/' + (projectId ? '?project=' + projectId : '')),
    createBank: (data) => api.post('/accounting/banks/', data),
    addBankBalance: (id, data) => api.post('/accounting/banks/' + id + '/add-balance/', data),
    getCapitalSources: () => api.get('/accounting/capital-sources/'),
    createCapitalSource: (data) => api.post('/accounting/capital-sources/', data),
    getTransfers: () => api.get('/accounting/transfers/'),
    createTransfer: (data) => api.post('/accounting/transfers/', data),

    // ── Vendors ───────────────────────────────────────────────────────────────
    getVendors: () => api.get('/accounting/vendors/'),
    createVendor: (data) => api.post('/accounting/vendors/', data),
    updateVendor: (id, data) => api.patch('/accounting/vendors/' + id + '/', data),

    // ── Bills ─────────────────────────────────────────────────────────────────
    getBills: (projectId) =>
        api.get('/accounting/bills/' + (projectId ? '?project=' + projectId : '')),
    createBill: (data) => api.post('/accounting/bills/', data),

    // ── Payments ──────────────────────────────────────────────────────────────
    getPayments: () => api.get('/accounting/payments/'),
    createPayment: (data) => api.post('/accounting/payments/', data),

    // ── Purchase Orders ───────────────────────────────────────────────────────
    getPurchaseOrders: () => api.get('/accounting/purchase-orders/'),
    createPurchaseOrder: (data) => api.post('/accounting/purchase-orders/', data),

    // ── Construction Finance ──────────────────────────────────────────────────
    getPhaseBudgets: (projectId) =>
        api.get('/accounting/phase-budgets/?project=' + projectId),
    getBudgetVariance: (projectId) =>
        api.get('/accounting/phase-budgets/variance/?project=' + projectId),
    getPaymentRequests: (projectId) =>
        api.get('/accounting/payment-requests/' + (projectId ? '?project=' + projectId : '')),
    createPaymentRequest: (data) => api.post('/accounting/payment-requests/', data),
    approvePaymentRequest: (id) =>
        api.post('/accounting/payment-requests/' + id + '/approve/'),
    getRetentionReleases: () => api.get('/accounting/retention-releases/'),
    createRetentionRelease: (data) => api.post('/accounting/retention-releases/', data),

    // ── Reports ───────────────────────────────────────────────────────────────
    getReport: (type, projectId, months) =>
        api.get('/accounting/reports/?type=' + type +
            (projectId ? '&project=' + projectId : '') +
            '&months=' + (months || 6)),
};
