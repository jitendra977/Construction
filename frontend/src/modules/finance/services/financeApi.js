/**
 * financeApi.js — Finance Module API client
 * All requests go to /api/v1/financials/
 */
import createApiClient from '../../../services/createApiClient';

const http = createApiClient();

// ── Helpers ───────────────────────────────────────────────────────────────────
const qs = (pid, extra = '') =>
  pid ? `?project=${pid}${extra ? '&' + extra : ''}` : extra ? `?${extra}` : '';

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const getDashboard = (projectId) =>
  http.get(`/financials/dashboard/${qs(projectId)}`);

// ── Accounts (Chart of Accounts) ─────────────────────────────────────────────
export const getAccounts         = (projectId, filters = '') => http.get(`/financials/accounts/${qs(projectId, filters)}`);
export const getAccount          = (id)                       => http.get(`/financials/accounts/${id}/`);
export const createAccount       = (data)                     => http.post('/financials/accounts/', data);
export const updateAccount       = (id, data)                 => http.patch(`/financials/accounts/${id}/`, data);
export const deleteAccount       = (id)                       => http.delete(`/financials/accounts/${id}/`);
export const depositToAccount    = (id, data)                 => http.post(`/financials/accounts/${id}/deposit/`, data);
export const payEMI              = (id, data)                 => http.post(`/financials/accounts/${id}/pay-emi/`, data);

// ── Journal Entries ───────────────────────────────────────────────────────────
export const getJournalEntries      = (projectId, sourceType) =>
  http.get(`/financials/journal-entries/${qs(projectId, sourceType ? `source_type=${sourceType}` : '')}`);
export const getAccountTransactions = (projectId, accountId) =>
  http.get(`/financials/journal-entries/?project=${projectId}&account=${accountId}`);
export const createJournalEntry  = (data)                     => http.post('/financials/journal-entries/', data);

// ── Cash Transfers ────────────────────────────────────────────────────────────
export const getTransfers        = (projectId)  => http.get(`/financials/transfers/${qs(projectId)}`);
export const createTransfer      = (data)       => http.post('/financials/transfers/', data);

// ── Loans — Disbursements ─────────────────────────────────────────────────────
export const getDisbursements    = (projectId, loanId) =>
  http.get(`/financials/loan-disbursements/${qs(projectId, loanId ? `loan_account=${loanId}` : '')}`);
export const createDisbursement  = (data) => http.post('/financials/loan-disbursements/', data);
export const updateDisbursement  = (id, data) => http.patch(`/financials/loan-disbursements/${id}/`, data);
export const deleteDisbursement  = (id) => http.delete(`/financials/loan-disbursements/${id}/`);

// ── Loans — EMI Payments ──────────────────────────────────────────────────────
export const getEMIPayments      = (projectId, loanId) =>
  http.get(`/financials/loan-emi-payments/${qs(projectId, loanId ? `loan_account=${loanId}` : '')}`);
export const createEMIPayment    = (data) => http.post('/financials/loan-emi-payments/', data);
export const updateEMIPayment    = (id, data) => http.patch(`/financials/loan-emi-payments/${id}/`, data);
export const deleteEMIPayment    = (id) => http.delete(`/financials/loan-emi-payments/${id}/`);

// ── Bills ─────────────────────────────────────────────────────────────────────
export const getBills            = (projectId, statusFilter) =>
  http.get(`/financials/bills/${qs(projectId, statusFilter ? `status=${statusFilter}` : '')}`);
export const getBill             = (id)    => http.get(`/financials/bills/${id}/`);
export const createBill          = (data)  => http.post('/financials/bills/', data);
export const updateBill          = (id, data) => http.patch(`/financials/bills/${id}/`, data);
export const payBill             = (id, data) => http.post(`/financials/bills/${id}/pay/`, data);
export const getBillPDF          = (id)       => http.get(`/financials/bills/${id}/pdf/`, { responseType: 'blob' });

// ── Bill Payments ─────────────────────────────────────────────────────────────
export const getBillPayments     = (projectId, billId) =>
  http.get(`/financials/bill-payments/${qs(projectId, billId ? `bill=${billId}` : '')}`);
export const createBillPayment   = (data) => http.post('/financials/bill-payments/', data);
export const getPaymentPDF       = (id)   => http.get(`/financials/payments/${id}/pdf/`, { responseType: 'blob' });

// ── Budget ────────────────────────────────────────────────────────────────────
export const getBudgetCategories  = (projectId) => http.get(`/financials/budget-categories/${qs(projectId)}`);
export const createBudgetCategory = (data)      => http.post('/financials/budget-categories/', data);
export const updateBudgetCategory = (id, data)  => http.patch(`/financials/budget-categories/${id}/`, data);
export const deleteBudgetCategory = (id)        => http.delete(`/financials/budget-categories/${id}/`);
export const reorderBudgetCategories = (orderedIds) => http.patch('/financials/budget-categories/reorder/', { ordered_ids: orderedIds });

export const getBudgetAllocations  = (projectIdOrCategoryId, phaseId) => {
  // Accepts either a projectId (UUID) directly, or (categoryId, phaseId)
  // Heuristic: if called with one UUID-like arg, treat as projectId filter
  const params = [
    projectIdOrCategoryId ? `project=${projectIdOrCategoryId}` : '',
    phaseId               ? `phase=${phaseId}`                 : '',
  ].filter(Boolean).join('&');
  return http.get(`/financials/budget-allocations/${params ? '?' + params : ''}`);
};
export const createBudgetAllocation = (data)       => http.post('/financials/budget-allocations/', data);
export const updateBudgetAllocation = (id, data)   => http.patch(`/financials/budget-allocations/${id}/`, data);
export const deleteBudgetAllocation = (id)         => http.delete(`/financials/budget-allocations/${id}/`);

// ── Contractor Contracts + Installments ──────────────────────────────────────
export const getContractorContracts  = (projectId) =>
  http.get(`/financials/contractor-contracts/${qs(projectId)}`);
export const getContractorContract   = (id) =>
  http.get(`/financials/contractor-contracts/${id}/`);
export const createContractorContract = (data) => {
  if (data.document) {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      if (data[key] !== null && data[key] !== undefined) {
        formData.append(key, data[key]);
      }
    });
    return http.post('/financials/contractor-contracts/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }
  return http.post('/financials/contractor-contracts/', data);
};
export const updateContractorContract = (id, data) => {
  if (data.document) {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      if (data[key] !== null && data[key] !== undefined) {
        formData.append(key, data[key]);
      }
    });
    return http.patch(`/financials/contractor-contracts/${id}/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }
  return http.patch(`/financials/contractor-contracts/${id}/`, data);
};
export const deleteContractorContract = (id) =>
  http.delete(`/financials/contractor-contracts/${id}/`);

export const getInstallments       = (projectId, contractId) =>
  http.get(`/financials/contractor-installments/${qs(projectId, contractId ? `contract=${contractId}` : '')}`);
export const createInstallment     = (data) =>
  http.post('/financials/contractor-installments/', data);
export const updateInstallment     = (id, data) =>
  http.patch(`/financials/contractor-installments/${id}/`, data);
export const deleteInstallment     = (id) =>
  http.delete(`/financials/contractor-installments/${id}/`);
export const addInstallmentPayment = (installmentId, data) => {
  if (data.proof) {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      if (data[key] !== null && data[key] !== undefined) {
        formData.append(key, data[key]);
      }
    });
    return http.post(`/financials/contractor-installments/${installmentId}/add_payment/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }
  return http.post(`/financials/contractor-installments/${installmentId}/add_payment/`, data);
};
export const resetInstallment      = (installmentId) =>
  http.post(`/financials/contractor-installments/${installmentId}/reset/`, {});

// ── Installment Payment Tranches ─────────────────────────────────────────────
export const getInstallmentPayments  = (installmentId) =>
  http.get(`/financials/installment-payments/?installment=${installmentId}`);
export const deleteInstallmentPayment = (paymentId) =>
  http.delete(`/financials/installment-payments/${paymentId}/`);

// ── Named export bundle (for components that import everything at once) ────────
const financeApi = {
  getDashboard,
  getAccounts, getAccount, createAccount, updateAccount, deleteAccount,
  depositToAccount, payEMI, getAccountTransactions,
  getJournalEntries, createJournalEntry,
  getTransfers, createTransfer,
  getDisbursements, createDisbursement,
  getEMIPayments, createEMIPayment,
  getBills, getBill, createBill, updateBill, payBill, getBillPDF,
  getBillPayments, createBillPayment, getPaymentPDF,
  getBudgetCategories, createBudgetCategory, updateBudgetCategory, deleteBudgetCategory, reorderBudgetCategories,
  getBudgetAllocations, createBudgetAllocation, updateBudgetAllocation, deleteBudgetAllocation,
  getContractorContracts, getContractorContract,
  createContractorContract, updateContractorContract, deleteContractorContract,
  getInstallments, createInstallment, updateInstallment, deleteInstallment,
  addInstallmentPayment, resetInstallment,
  getInstallmentPayments, deleteInstallmentPayment,
};

export default financeApi;
