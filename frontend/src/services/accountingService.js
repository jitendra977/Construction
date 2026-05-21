import api from './client';

export const accountingService = {
    // Summary / Dashboard
    getSummary: (projectId) =>
        api.get('financials/dashboard/' + (projectId ? '?project=' + projectId : '')),

    // Accounts / Ledger
    getAccounts: (projectId) =>
        api.get('financials/accounts/' + (projectId ? '?project=' + projectId : '')),
    createAccount: (data) => api.post('financials/accounts/', data),
    updateAccount: (id, data) => api.patch(`financials/accounts/${id}/`, data),
    deleteAccount: (id) => api.delete(`financials/accounts/${id}/`),

    getJournalEntries: (projectId) =>
        api.get('financials/journal-entries/' + (projectId ? '?project=' + projectId : '')),
    createJournalEntry: (data) => api.post('financials/journal-entries/', data),

    // Treasury / Banks
    getBanks: (projectId) =>
        api.get(`financials/accounts/?account_type=ASSET${projectId ? '&project=' + projectId : ''}`),
    createBank: (data) =>
        api.post('financials/accounts/', { ...data, account_type: 'ASSET', is_bank: true }),
    updateBank: (id, data) => api.patch(`financials/accounts/${id}/`, data),
    deleteBank: (id) => api.delete(`financials/accounts/${id}/`),
    addBankBalance: (id, data) => api.post(`financials/accounts/${id}/deposit/`, data),
    payEMI: (id, data) => api.post(`financials/accounts/${id}/pay-emi/`, data),

    // Capital Sources (legacy finance endpoints)
    getCapitalSources: () => api.get('finance/funding-sources/'),
    createCapitalSource: (data) => api.post('finance/funding-sources/', data),
    updateCapitalSource: (id, data) => api.patch(`finance/funding-sources/${id}/`, data),

    getTransfers: (projectId) =>
        api.get('financials/transfers/' + (projectId ? '?project=' + projectId : '')),
    createTransfer: (data) => api.post('financials/transfers/', data),

    // Vendors
    getVendors: () => api.get('financials/vendors/'),
    createVendor: (data) => api.post('financials/vendors/', data),
    updateVendor: (id, data) => api.patch(`financials/vendors/${id}/`, data),
    deleteVendor: (id) => api.delete(`financials/vendors/${id}/`),

    // Bills
    getBills: (projectId) =>
        api.get('financials/bills/' + (projectId ? '?project=' + projectId : '')),
    createBill: (data) => api.post('financials/bills/', data),
    updateBill: (id, data) => api.patch(`financials/bills/${id}/`, data),

    // Payments (legacy finance)
    getPayments: () => api.get('finance/payments/'),
    createPayment: (data) => api.post('finance/payments/', data),

    // Purchase Orders (legacy finance)
    getPurchaseOrders: (projectId) =>
        api.get('finance/purchase-orders/' + (projectId ? '?project=' + projectId : '')),
    createPurchaseOrder: (data) => api.post('finance/purchase-orders/', data),

    // Phase Budgets
    getPhaseBudgets: (projectId) =>
        api.get('financials/phase-budgets/?project=' + projectId),
    getBudgetVariance: (projectId) =>
        api.get('financials/phase-budgets/variance/?project=' + projectId),
    updateBudget: (data) => api.post('financials/phase-budgets/', data),
    getBudgetRevisions: (budgetLineId) =>
        api.get('financials/budget-revisions/?budget_line=' + budgetLineId),

    // Contractor Payment Requests
    getPaymentRequests: (projectId) =>
        api.get('financials/contractor-contracts/' + (projectId ? '?project=' + projectId : '')),
    createPaymentRequest: (data) => api.post('financials/contractor-contracts/', data),
    approvePaymentRequest: (id) => api.post(`financials/contractor-installments/${id}/add_payment/`),
    getRetentionReleases: () => api.get('financials/installment-payments/'),
    createRetentionRelease: (data) => api.post('financials/installment-payments/', data),

    // Reports
    getReport: (type, projectId, months) =>
        api.get(
            'financials/reports/?type=' + type +
            (projectId ? '&project=' + projectId : '') +
            '&months=' + (months || 6),
        ),
};
