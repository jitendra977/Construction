/**
 * FinanceContext — global state for the Finance module.
 *
 * Provides:
 *   projectId       — active project (read from parent ConstructionContext)
 *   dashboard       — summary numbers from /fin/dashboard/
 *   accounts        — full account list
 *   banks           — accounts where is_bank=true
 *   loans           — accounts where is_loan=true
 *   refresh()       — re-fetch everything
 *   loading         — true while any fetch is in flight
 *   error           — last error message
 */
import React, {
  createContext, useContext, useState, useEffect, useCallback,
} from 'react';
import financeApi from '../services/financeApi';

// ── Context ───────────────────────────────────────────────────────────────────
const FinanceContext = createContext(null);

// ── Provider ──────────────────────────────────────────────────────────────────
export function FinanceProvider({ projectId, children }) {
  const [dashboard, setDashboard] = useState(null);
  const [accounts,  setAccounts]  = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);

  const refresh = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const [dashRes, acctRes] = await Promise.all([
        financeApi.getDashboard(projectId),
        financeApi.getAccounts(projectId),
      ]);
      setDashboard(dashRes.data);
      setAccounts(Array.isArray(acctRes.data) ? acctRes.data : []);
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
        err?.response?.data?.error  ||
        err.message                 ||
        'Failed to load finance data.'
      );
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Auto-load whenever projectId changes
  useEffect(() => { refresh(); }, [refresh]);

  const banks = accounts.filter((a) => a.is_bank);
  const loans = accounts.filter((a) => a.is_loan);

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
