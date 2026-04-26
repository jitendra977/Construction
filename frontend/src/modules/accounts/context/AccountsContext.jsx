/**
 * AccountsContext — state for the Accounts module.
 *
 * Provides: stats, users, roles, loading, error, refresh helpers.
 * The current user's profile comes from ConstructionContext (already loaded at app level).
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import accountsApi from '../services/accountsApi';

const AccountsContext = createContext(null);

export function AccountsProvider({ children }) {
    const [stats,   setStats]   = useState(null);
    const [users,   setUsers]   = useState([]);
    const [roles,   setRoles]   = useState([]);
    const [loading, setLoading] = useState(false);
    const [error,   setError]   = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [sRes, uRes, rRes] = await Promise.all([
                accountsApi.getStats(),
                accountsApi.getUsers(),
                accountsApi.getRoles(),
            ]);
            setStats(sRes.data);
            const rawUsers = uRes.data?.results ?? uRes.data ?? [];
            const rawRoles = rRes.data?.results ?? rRes.data ?? [];
            setUsers(Array.isArray(rawUsers) ? rawUsers : []);
            setRoles(Array.isArray(rawRoles) ? rawRoles : []);
        } catch (e) {
            setError(e?.response?.data?.detail || e?.message || 'Failed to load accounts data.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    // ── Mutation helpers ───────────────────────────────────────────────────────
    const refreshUsers = async () => {
        try {
            const res = await accountsApi.getUsers();
            const raw = res.data?.results ?? res.data ?? [];
            setUsers(Array.isArray(raw) ? raw : []);
        } catch { /* silent */ }
    };

    const refreshRoles = async () => {
        try {
            const res = await accountsApi.getRoles();
            const raw = res.data?.results ?? res.data ?? [];
            setRoles(Array.isArray(raw) ? raw : []);
        } catch { /* silent */ }
    };

    const refreshStats = async () => {
        try {
            const res = await accountsApi.getStats();
            setStats(res.data);
        } catch { /* silent */ }
    };

    return (
        <AccountsContext.Provider value={{
            stats, users, roles,
            loading, error,
            load,
            refreshUsers, refreshRoles, refreshStats,
        }}>
            {children}
        </AccountsContext.Provider>
    );
}

export function useAccounts() {
    const ctx = useContext(AccountsContext);
    if (!ctx) throw new Error('useAccounts must be used inside <AccountsProvider>');
    return ctx;
}

export default AccountsContext;
