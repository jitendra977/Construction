/**
 * ProjectsContext
 *
 * Reuses the projects list already loaded by ConstructionContext so there
 * is no duplicate API call and no stale-data race. Adds local-mutation
 * helpers (add / update / remove) that keep both contexts in sync.
 */
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useConstruction } from '../../../context/ConstructionContext';
import api from '../services/projectsApi';

const ProjectsContext = createContext(null);

export function ProjectsProvider({ children }) {
    const {
        projects: ctxProjects,   // already fetched by ConstructionContext
        refreshData,             // re-fetches everything (including projects)
    } = useConstruction();

    // Local override list — starts from the global context then allows
    // optimistic mutations without re-fetching the whole dashboard.
    const [localProjects, setLocal] = useState(null); // null = "use ctxProjects"
    const [loading, setLoading]     = useState(false);
    const [error, setError]         = useState(null);

    // Whenever ConstructionContext refreshes its projects, reset local override
    useEffect(() => {
        setLocal(null);
    }, [ctxProjects]);

    // The effective list: prefer local override, fall back to global context
    const rawProjects = localProjects ?? ctxProjects;
    const projects    = Array.isArray(rawProjects) ? rawProjects : [];

    // Full refresh (calls ConstructionContext.refreshData which re-fetches projects)
    const fetchProjects = useCallback(async () => {
        setLoading(true);
        try {
            await refreshData?.(true);
            setError(null);
        } catch (e) {
            setError('Could not reload projects');
        } finally {
            setLoading(false);
        }
    }, [refreshData]);

    // ── Optimistic local mutations ──────────────────────────────────────────
    const addProjectLocal = (p) =>
        setLocal(prev => [p, ...(prev ?? projects)]);

    const updateProjectLocal = (p) =>
        setLocal(prev => (prev ?? projects).map(x => x.id === p.id ? { ...x, ...p } : x));

    const removeProjectLocal = (id) =>
        setLocal(prev => (prev ?? projects).filter(x => x.id !== id));

    return (
        <ProjectsContext.Provider value={{
            projects, loading, error,
            fetchProjects,
            addProjectLocal, updateProjectLocal, removeProjectLocal,
        }}>
            {children}
        </ProjectsContext.Provider>
    );
}

export const useProjects = () => {
    const ctx = useContext(ProjectsContext);
    if (!ctx) throw new Error('useProjects must be inside ProjectsProvider');
    return ctx;
};
