/**
 * FinanceContext — global state for the Finance module.
 *
 * Migrated to TanStack Query (v5) in Phase 2.
 *
 * Provides (same public API as before — no consumer changes needed):
 *   projectId       — active project
 *   dashboard       — summary numbers from /fin/dashboard/
 *   accounts        — full account list
 *   banks           — accounts where is_bank=true
 *   loans           — accounts where is_loan=true
 *   refresh()       — invalidate + refetch all finance queries
 *   loading         — true while any fetch is in flight
 *   error           — last error message or null
 *
 * Why TanStack Query here?
 *   • Automatic background refetch when the tab regains focus or network reconnects
 *   • Built-in deduplication — multiple useFinance() calls won't fire duplicate requests
 *   • staleTime from QueryClient defaults (30s) prevents hammering the API on every
 *     component mount
 *   • invalidateQueries() from refresh() forces an immediate refetch after mutations
 *     (create bill, transfer, etc.) — previously required manual setDashboard(null)
 */
import React, { createContext, useContext, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import financeApi from '../services/financeApi';

// ── Query key factory — centralised so invalidation is consistent ────────────
export const financeKeys = {
  all:       (projectId) => ['finance', projectId],
  dashboard: (projectId) => ['finance', projectId, 'dashboard'],
  accounts:  (projectId) => ['finance', projectId, 'accounts'],
};

// ── Context ───────────────────────────────────────────────────────────────────
const FinanceContext = createContext(null);

// ── Provider ──────────────────────────────────────────────────────────────────
export function FinanceProvider({ projectId, children }) {
  const queryClient = useQueryClient();

  // ── Dashboard query ──────────────────────────────────────────────────────
  const {
    data:    dashboardData,
    isLoading: dashLoading,
    error:   dashError,
  } = useQuery({
    queryKey: financeKeys.dashboard(projectId),
    queryFn:  () => financeApi.getDashboard(projectId).then(r => r.data),
    enabled:  Boolean(projectId),
  });

  // ── Accounts query ───────────────────────────────────────────────────────
  const {
    data:    accountsData,
    isLoading: acctLoading,
    error:   acctError,
  } = useQuery({
    queryKey: financeKeys.accounts(projectId),
    queryFn:  () => financeApi.getAccounts(projectId).then(r =>
      Array.isArray(r.data) ? r.data : []
    ),
    enabled:  Boolean(projectId),
  });

  // ── Derived state ────────────────────────────────────────────────────────
  const accounts  = accountsData ?? [];
  const dashboard = dashboardData ?? null;
  const loading   = dashLoading || acctLoading;
  const error     = useMemo(() => {
    const e = dashError || acctError;
    if (!e) return null;
    return (
      e?.response?.data?.detail ||
      e?.response?.data?.error  ||
      e?.message                ||
      'Failed to load finance data.'
    );
  }, [dashError, acctError]);

  const banks = useMemo(() => accounts.filter(a => a.is_bank), [accounts]);
  const loans = useMemo(() => accounts.filter(a => a.is_loan), [accounts]);

  // ── refresh() — invalidates all finance queries for this project ──────────
  // Drop-in replacement for the old manual setState approach.
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: financeKeys.all(projectId) });
  };

  return (
    <FinanceContext.Provider value={{
      projectId,
      dashboard,
      accounts,
      banks,
      loans,
      loading,
      error,
      refresh,
    }}>
      {children}
    </FinanceContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useFinance() {
  const ctx = useContext(FinanceContext);
  if (!ctx) {
    throw new Error('useFinance must be used inside <FinanceProvider>');
  }
  return ctx;
}

export default FinanceContext;
