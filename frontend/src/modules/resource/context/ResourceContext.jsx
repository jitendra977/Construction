/**
 * ResourceContext — global state for the Resource module.
 *
 * Provides:
 *   projectId         — active project ID
 *   dashboard         — summary numbers from /resource/dashboard/
 *   materials         — full materials list
 *   lowStockMaterials — materials where is_low_stock=true
 *   workers           — full workers list
 *   activeWorkers     — workers where is_active=true
 *   suppliers         — full suppliers list
 *   loading           — true while any fetch is in flight
 *   error             — last error message
 *   refresh()         — re-fetch everything
 */
import React, {
  createContext, useContext, useState, useEffect, useCallback,
} from 'react';
import resourceApi from '../services/resourceApi';

// ── Context ───────────────────────────────────────────────────────────────────
const ResourceContext = createContext(null);

// ── Provider ──────────────────────────────────────────────────────────────────
export function ResourceProvider({ projectId, children }) {
  const [dashboard,  setDashboard]  = useState(null);
  const [materials,  setMaterials]  = useState([]);
  const [workers,    setWorkers]    = useState([]);
  const [suppliers,  setSuppliers]  = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);

  const refresh = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const [dashRes, matRes, workerRes, suppRes] = await Promise.all([
        resourceApi.getDashboard(projectId),
        resourceApi.getMaterials(projectId),
        resourceApi.getWorkers(projectId),
        resourceApi.getSuppliers(projectId),
      ]);
      setDashboard(dashRes.data);
      setMaterials(Array.isArray(matRes.data)    ? matRes.data    : matRes.data?.results    || []);
      setWorkers(Array.isArray(workerRes.data)   ? workerRes.data : workerRes.data?.results || []);
      setSuppliers(Array.isArray(suppRes.data)   ? suppRes.data   : suppRes.data?.results   || []);
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
        err?.response?.data?.error  ||
        err.message                 ||
        'Failed to load resource data.'
      );
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Auto-load whenever projectId changes
  useEffect(() => { refresh(); }, [refresh]);

  const lowStockMaterials = materials.filter((m) => m.is_low_stock);
  const activeWorkers     = workers.filter((w) => w.is_active);

  return (
    <ResourceContext.Provider value={{
      projectId,
      dashboard,
      materials,
      lowStockMaterials,
      workers,
      activeWorkers,
      suppliers,
      loading,
      error,
      refresh,
    }}>
      {children}
    </ResourceContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useResource() {
  const ctx = useContext(ResourceContext);
  if (!ctx) {
    throw new Error('useResource must be used inside <ResourceProvider>');
  }
  return ctx;
}

export default ResourceContext;
