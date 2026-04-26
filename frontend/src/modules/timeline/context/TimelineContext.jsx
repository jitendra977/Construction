/**
 * TimelineContext
 *
 * Loads phases + tasks for the active project, computes dependency graph
 * and critical path, and provides filter/view-mode state.
 */
import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { useConstruction } from '../../../context/ConstructionContext';
import timelineApi from '../services/timelineApi';

const TimelineContext = createContext(null);

export function TimelineProvider({ children, projectId: propProjectId }) {
    const { activeProjectId } = useConstruction();
    const projectId = propProjectId ?? activeProjectId;

    const [phases, setPhases]             = useState([]);
    const [tasks,  setTasks]              = useState([]);
    const [criticalPathIds, setCPIds]     = useState([]);
    const [dependencyGraph, setDepGraph]  = useState({});
    const [taskStats, setTaskStats]       = useState({});
    const [loading, setLoading]           = useState(false);
    const [error,   setError]             = useState(null);

    // View & filter state
    const [viewMode, setViewMode]         = useState('gantt');  // gantt | calendar | list | kanban
    const [filterStatus,  setFilterStatus]  = useState('ALL');  // ALL | PENDING | IN_PROGRESS | COMPLETED | BLOCKED
    const [filterPhase,   setFilterPhase]   = useState('ALL');
    const [filterPriority,setFilterPriority]= useState('ALL');
    const [search, setSearch]             = useState('');

    const load = useCallback(async () => {
        if (!projectId) return;
        setLoading(true);
        setError(null);
        try {
            const [pRes, tRes, cpRes] = await Promise.all([
                timelineApi.getPhases(projectId),
                timelineApi.getTasks(projectId),
                timelineApi.getCriticalPath(projectId),
            ]);

            const phaseList = Array.isArray(pRes.data?.results) ? pRes.data.results
                            : Array.isArray(pRes.data)           ? pRes.data
                            : [];
            const taskList  = Array.isArray(tRes.data?.results) ? tRes.data.results
                            : Array.isArray(tRes.data)           ? tRes.data
                            : [];

            setPhases(phaseList.sort((a, b) => (a.order || 0) - (b.order || 0)));
            setTasks(taskList);

            const cp = cpRes.data || {};
            setCPIds(cp.critical_path_ids || []);
            setDepGraph(cp.dependency_graph || {});
            setTaskStats(cp.task_stats || {});
        } catch (e) {
            setError('Failed to load timeline data');
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => { load(); }, [load]);

    // ── Derived: tasks per phase map ───────────────────────────────────────
    const tasksByPhase = useMemo(() => {
        const map = {};
        for (const t of tasks) {
            const pid = t.phase;
            if (!map[pid]) map[pid] = [];
            map[pid].push(t);
        }
        return map;
    }, [tasks]);

    // ── Filtered tasks ─────────────────────────────────────────────────────
    const filteredTasks = useMemo(() => {
        return tasks.filter(t => {
            if (filterStatus !== 'ALL' && t.status !== filterStatus) return false;
            if (filterPhase  !== 'ALL' && String(t.phase) !== String(filterPhase))  return false;
            if (filterPriority !== 'ALL' && t.priority !== filterPriority) return false;
            if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
            return true;
        });
    }, [tasks, filterStatus, filterPhase, filterPriority, search]);

    // ── Date range (for Gantt / Calendar) ─────────────────────────────────
    const dateRange = useMemo(() => {
        const allDates = [
            ...phases.flatMap(p => [p.start_date, p.end_date]),
            ...tasks.flatMap(t => [t.start_date, t.due_date]),
        ].filter(Boolean).map(d => new Date(d));

        if (!allDates.length) {
            const today = new Date();
            return { min: today, max: new Date(today.getTime() + 90 * 86400000) };
        }
        return {
            min: new Date(Math.min(...allDates)),
            max: new Date(Math.max(...allDates)),
        };
    }, [phases, tasks]);

    // ── Local mutations ────────────────────────────────────────────────────
    const updateTaskLocal = (updated) =>
        setTasks(prev => prev.map(t => t.id === updated.id ? { ...t, ...updated } : t));

    const addTaskLocal = (t) => setTasks(prev => [...prev, t]);

    const removeTaskLocal = (id) => setTasks(prev => prev.filter(t => t.id !== id));

    const updatePhaseLocal = (updated) =>
        setPhases(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p));

    return (
        <TimelineContext.Provider value={{
            projectId,
            phases, tasks, filteredTasks, tasksByPhase,
            criticalPathIds, dependencyGraph, taskStats,
            loading, error,
            viewMode, setViewMode,
            filterStatus, setFilterStatus,
            filterPhase, setFilterPhase,
            filterPriority, setFilterPriority,
            search, setSearch,
            dateRange,
            load,
            updateTaskLocal, addTaskLocal, removeTaskLocal, updatePhaseLocal,
        }}>
            {children}
        </TimelineContext.Provider>
    );
}

export const useTimeline = () => {
    const ctx = useContext(TimelineContext);
    if (!ctx) throw new Error('useTimeline must be inside TimelineProvider');
    return ctx;
};
