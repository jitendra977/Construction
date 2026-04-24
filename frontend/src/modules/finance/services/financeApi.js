/**
 * financeApi.js — Finance Module API client
 *
 * All requests go to /api/v1/fin/
 * Uses the same axios instance & JWT token as the rest of the app,
 * but every call is defined here so Finance has zero dependency on
 * the global api.js file.
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

// ── Helpers ───────────────────────────────────────────────────────────────────
const qs = (pid, extra = '') =>
  pid ? `?project=${pid}${extra ? '&' + extra : ''}` : extra ? `?${extra}` : '';

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const getDashboard = (projectId) =>
  http.get(`/fin/dashboard/${qs(projectId)}`);

// ── Accounts (Chart of Accounts) ─────────────────────────────────────────────
export const getAccounts         = (projectId, filters = '') => http.get(`/fin/accounts/${qs(projectId, filters)}`);
export const getAccount          = (id)                       => http.get(`/fin/accounts/${id}/`);
export const createAccount       = (data)                     => http.post('/fin/accounts/', data);
export const updateAccount       = (id, data)                 => http.patch(`/fin/accounts/${id}/`, data);
export const deleteAccount       = (id)                       => http.delete(`/fin/accounts/${id}/`);
export const depositToAccount    = (id, data)                 => http.post(`/fin/accounts/${id}/deposit/`, data);
export const payEMI              = (id, data)                 => http.post(`/fin/accounts/${id}/pay-emi/`, data);

// ── Journal Entries ───────────────────────────────────────────────────────────
export const getJournalEntries   = (projectId, sourceType)    =>
  http.get(`/fin/journal-entries/${qs(projectId, sourceType ? `source_type=${sourceType}` : '')}`);
export const createJournalEntry  = (data)                     => http.post('/fin/journal-entries/', data);

// ── Cash Transfers ────────────────────────────────────────────────────────────
export const getTransfers        = (projectId)  => http.get(`/fin/transfers/${qs(projectId)}`);
export const createTransfer      = (data)       => http.post('/fin/transfers/', data);

// ── Loans — Disbursements ─────────────────────────────────────────────────────
export const getDisbursements    = (projectId, loanId) =>
  http.get(`/fin/loan-disbursements/${qs(projectId, loanId ? `loan_account=${loanId}` : '')}`);
export const createDisbursement  = (data) => http.post('/fin/loan-disbursements/', data);

// ── Loans — EMI Payments ──────────────────────────────────────────────────────
export const getEMIPayments      = (projectId, loanId) =>
  http.get(`/fin/loan-emi-payments/${qs(projectId, loanId ? `loan_account=${loanId}` : '')}`);
export const createEMIPayment    = (data) => http.post('/fin/loan-emi-payments/', data);

// ── Bills ─────────────────────────────────────────────────────────────────────
export const getBills            = (projectId, statusFilter) =>
  http.get(`/fin/bills/${qs(projectId, statusFilter ? `status=${statusFilter}` : '')}`);
export const getBill             = (id)    => http.get(`/fin/bills/${id}/`);
export const createBill          = (data)  => http.post('/fin/bills/', data);
export const updateBill          = (id, data) => http.patch(`/fin/bills/${id}/`, data);
export const payBill             = (id, data) => http.post(`/fin/bills/${id}/pay/`, data);

// ── Bill Payments ─────────────────────────────────────────────────────────────
export const getBillPayments     = (projectId, billId) =>
  http.get(`/fin/bill-payments/${qs(projectId, billId ? `bill=${billId}` : '')}`);
export const createBillPayment   = (data) => http.post('/fin/bill-payments/', data);

// ── Budget ────────────────────────────────────────────────────────────────────
export const getBudgetCategories  = (projectId) => http.get(`/fin/budget-categories/${qs(projectId)}`);
export const createBudgetCategory = (data)      => http.post('/fin/budget-categories/', data);
export const updateBudgetCategory = (id, data)  => http.patch(`/fin/budget-categories/${id}/`, data);
export const deleteBudgetCategory = (id)        => http.delete(`/fin/budget-categories/${id}/`);

export const getBudgetAllocations  = (projectIdOrCategoryId, phaseId) => {
  // Accepts either a projectId (UUID) directly, or (categoryId, phaseId)
  // Heuristic: if called with one UUID-like arg, treat as projectId filter
  const params = [
    projectIdOrCategoryId ? `project=${projectIdOrCategoryId}` : '',
    phaseId               ? `phase=${phaseId}`                 : '',
  ].filter(Boolean).join('&');
  return http.get(`/fin/budget-allocations/${params ? '?' + params : ''}`);
};
export const createBudgetAllocation = (data)       => http.post('/fin/budget-allocations/', data);
export const updateBudgetAllocation = (id, data)   => http.patch(`/fin/budget-allocations/${id}/`, data);

// ── Named export bundle (for components that import everything at once) ────────
const financeApi = {
  getDashboard,
  getAccounts, getAccount, createAccount, updateAccount, deleteAccount,
  depositToAccount, payEMI,
  getJournalEntries, createJournalEntry,
  getTransfers, createTransfer,
  getDisbursements, createDisbursement,
  getEMIPayments, createEMIPayment,
  getBills, getBill, createBill, updateBill, payBill,
  getBillPayments, createBillPayment,
  getBudgetCategories, createBudgetCategory, updateBudgetCategory, deleteBudgetCategory,
  getBudgetAllocations, createBudgetAllocation, updateBudgetAllocation,
};

export default financeApi;
