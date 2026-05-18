/**
 * useFinanceQueries.js
 * ─────────────────────
 * Standalone TanStack Query hooks for finance data.
 *
 * Use these in components that live OUTSIDE <FinanceProvider> (e.g. the
 * site-ops dashboard pulling a burn-rate widget) or in mutation callbacks
 * that need fine-grained invalidation.
 *
 * Components INSIDE <FinanceProvider> should still use useFinance() —
 * these hooks are a supplement, not a replacement.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import financeApi from '../services/financeApi';
import { financeKeys } from '../context/FinanceContext';

// ── Dashboard ─────────────────────────────────────────────────────────────────
export function useFinanceDashboard(projectId) {
  return useQuery({
    queryKey: financeKeys.dashboard(projectId),
    queryFn:  () => financeApi.getDashboard(projectId).then(r => r.data),
    enabled:  Boolean(projectId),
  });
}

// ── Accounts ──────────────────────────────────────────────────────────────────
export function useFinanceAccounts(projectId) {
  return useQuery({
    queryKey: financeKeys.accounts(projectId),
    queryFn:  () => financeApi.getAccounts(projectId).then(r =>
      Array.isArray(r.data) ? r.data : []
    ),
    enabled:  Boolean(projectId),
    select:   (data) => ({
      all:   data,
      banks: data.filter(a => a.is_bank),
      loans: data.filter(a => a.is_loan),
    }),
  });
}

// ── Invalidation helper ───────────────────────────────────────────────────────
/**
 * useInvalidateFinance()
 * Returns a function that invalidates all finance queries for a project.
 * Use this in mutation onSuccess callbacks instead of calling refresh() from context.
 *
 * Example:
 *   const invalidate = useInvalidateFinance();
 *   await financeApi.createBill(payload);
 *   invalidate(projectId);
 */
export function useInvalidateFinance() {
  const queryClient = useQueryClient();
  return (projectId) => {
    queryClient.invalidateQueries({ queryKey: financeKeys.all(projectId) });
  };
}
