/**
 * TimelineLayout — top toolbar with view switcher, filters, and project selector.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTimeline } from '../../context/TimelineContext';
import { useConstruction } from '../../../../context/ConstructionContext';
import ManagementTabs from '../../../../components/desktop/manage/ManagementTabs';
import ExportButton from '../shared/ExportButton';

const VIEWS = [
    { key: 'gantt', label: '📊 Gantt', title: 'Gantt Timeline' },
    { key: 'calendar', label: '📅 Calendar', title: 'Calendar View' },
    { key: 'list', label: '📋 List', title: 'Task List' },
    { key: 'kanban', label: '🗂️ Kanban', title: 'Kanban Board' },
];

const STATUS_OPTS = ['ALL', 'PENDING', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'HALTED'];
const PRIORITY_OPTS = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

export default function TimelineLayout({ children }) {
    const {
        viewMode, setViewMode,
        filterStatus, setFilterStatus,
        filterPhase, setFilterPhase,
        filterPriority, setFilterPriority,
        search, setSearch,
        phases, filteredTasks, criticalPathIds,
        loading, load,
    } = useTimeline();
    const { projects, activeProjectId, switchProject } = useConstruction();
    const navigate = useNavigate();

    const projectList = Array.isArray(projects) ? projects : [];
    const activeProject = projectList.find(p => p.id === activeProjectId);

    const cpCount = criticalPathIds.length;
    const overdueCount = filteredTasks.filter(t => {
        if (!t.due_date || t.status === 'COMPLETED') return false;
        return new Date(t.due_date) < new Date();
    }).length;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--t-bg)' }}>
            <ManagementTabs />
            {/* ── Top bar ─────────────────────────────────────────────── */}
            <div style={{
                padding: '10px 16px',
                background: 'var(--t-surface)',
                borderBottom: '1px solid var(--t-border)',
                display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
            }}>
                {/* Title */}
                <div style={{ marginRight: 4 }}>
                    <h1 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: 'var(--t-text)' }}>
                        📅 Timeline
                    </h1>
                    {activeProject && (
                        <p style={{ margin: 0, fontSize: 10, color: 'var(--t-text3)' }}>
                            {activeProject.name}
                        </p>
                    )}
                </div>

                {/* Project selector */}
                <select
                    value={activeProjectId || ''}
                    onChange={e => switchProject(Number(e.target.value))}
                    style={{
                        padding: '5px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                        border: '1px solid var(--t-border)', background: 'var(--t-surface2)',
                        color: 'var(--t-text)', cursor: 'pointer',
                    }}
                >
                    {projectList.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>

                {/* View switcher */}
                <div style={{
                    display: 'flex', borderRadius: 8, overflow: 'hidden',
                    border: '1px solid var(--t-border)',
                }}>
                    {VIEWS.map(v => (
                        <button key={v.key} onClick={() => setViewMode(v.key)} title={v.title} style={{
                            padding: '5px 12px', fontSize: 11, fontWeight: 700,
                            border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                            background: viewMode === v.key ? '#f97316' : 'var(--t-surface2)',
                            color: viewMode === v.key ? '#fff' : 'var(--t-text)',
                            borderRight: '1px solid var(--t-border)',
                        }}>
                            {v.label}
                        </button>
                    ))}
                </div>

                {/* Spacer */}
                <div style={{ flex: 1 }} />

                {/* Alert chips */}
                {overdueCount > 0 && (
                    <div style={{
                        padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 800,
                        background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                        border: '1px solid rgba(239,68,68,0.3)',
                    }}>
                        ⚠ {overdueCount} overdue
                    </div>
                )}
                {cpCount > 0 && (
                    <div style={{
                        padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 800,
                        background: 'rgba(239,68,68,0.08)', color: '#ef4444',
                        border: '1px solid rgba(239,68,68,0.2)',
                    }}>
                        ⚡ {cpCount} critical
                    </div>
                )}

                {/* Refresh */}
                <button onClick={load} disabled={loading} style={{
                    padding: '5px 10px', borderRadius: 8, fontSize: 12,
                    border: '1px solid var(--t-border)', background: 'transparent',
                    color: 'var(--t-text)', cursor: loading ? 'not-allowed' : 'pointer',
                }}>
                    {loading ? '⏳' : '🔄'}
                </button>

                <ExportButton />

                {/* Help */}
                <button onClick={() => navigate('help')} style={{
                    padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                    border: '1px solid var(--t-border)', background: 'var(--t-surface2)',
                    color: 'var(--t-text)', cursor: 'pointer',
                }}>
                    ❓ Help
                </button>
            </div>

            {/* ── Filter bar ──────────────────────────────────────────── */}
            <div style={{
                padding: '8px 16px', background: 'var(--t-surface2)',
                borderBottom: '1px solid var(--t-border)',
                display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
            }}>
                {/* Search */}
                <input
                    value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="🔍 Search tasks…"
                    style={{
                        padding: '5px 10px', borderRadius: 8, fontSize: 12,
                        border: '1px solid var(--t-border)', background: 'var(--t-surface)',
                        color: 'var(--t-text)', outline: 'none', minWidth: 160,
                    }}
                />

                {/* Status filter */}
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{
                    padding: '5px 10px', borderRadius: 8, fontSize: 12,
                    border: '1px solid var(--t-border)', background: 'var(--t-surface)',
                    color: 'var(--t-text)', cursor: 'pointer',
                }}>
                    {STATUS_OPTS.map(s => (
                        <option key={s} value={s}>{s === 'ALL' ? 'All Statuses' : s.replace('_', ' ')}</option>
                    ))}
                </select>

                {/* Phase filter */}
                <select value={filterPhase} onChange={e => setFilterPhase(e.target.value)} style={{
                    padding: '5px 10px', borderRadius: 8, fontSize: 12,
                    border: '1px solid var(--t-border)', background: 'var(--t-surface)',
                    color: 'var(--t-text)', cursor: 'pointer',
                }}>
                    <option value="ALL">All Phases</option>
                    {phases.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>

                {/* Priority filter */}
                <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} style={{
                    padding: '5px 10px', borderRadius: 8, fontSize: 12,
                    border: '1px solid var(--t-border)', background: 'var(--t-surface)',
                    color: 'var(--t-text)', cursor: 'pointer',
                }}>
                    {PRIORITY_OPTS.map(p => (
                        <option key={p} value={p}>{p === 'ALL' ? 'All Priorities' : p}</option>
                    ))}
                </select>

                <div style={{ flex: 1 }} />

                {/* Task count */}
                <span style={{ fontSize: 11, color: 'var(--t-text3)', fontWeight: 600 }}>
                    {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
                </span>
            </div>

            {/* ── Main content ────────────────────────────────────────── */}
            <div style={{ flex: 1, overflow: 'hidden', position: 'relative', paddingBottom: '96px' }}>
                {loading ? (
                    <div style={{
                        position: 'absolute', inset: 0, display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        background: 'var(--t-bg)',
                    }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 36, marginBottom: 10 }}>📅</div>
                            <p style={{ color: 'var(--t-text3)', fontWeight: 600 }}>Loading timeline…</p>
                        </div>
                    </div>
                ) : children}
            </div>
        </div>
    );
}
