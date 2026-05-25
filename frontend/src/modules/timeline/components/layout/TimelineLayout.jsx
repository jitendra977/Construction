/**
 * TimelineLayout — top toolbar with view switcher, filters, and project selector.
 * Mobile: sticky mini-header + bottom tab bar + collapsible filter drawer.
 * Desktop: unchanged two-row bar.
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTimeline } from '../../context/TimelineContext';
import { useConstruction } from '../../../../context/ConstructionContext';
import { usePlatformBase } from '../../../../shared/utils/platformNav';
import ManagementTabs from '../../../../components/desktop/manage/ManagementTabs';
import ExportButton from '../shared/ExportButton';

const VIEWS = [
    { key: 'gantt',    label: '📊 Gantt',    short: '📊', title: 'Gantt Timeline' },
    { key: 'calendar', label: '📅 Calendar', short: '📅', title: 'Calendar View'  },
    { key: 'list',     label: '📋 List',     short: '📋', title: 'Task List'      },
    { key: 'kanban',   label: '🗂️ Kanban',  short: '🗂️', title: 'Kanban Board'  },
];

const STATUS_OPTS   = ['ALL', 'PENDING', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'HALTED'];
const PRIORITY_OPTS = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

function useIsMobile() {
    const [mobile, setMobile] = useState(() => window.innerWidth < 768);
    useEffect(() => {
        const fn = () => setMobile(window.innerWidth < 768);
        window.addEventListener('resize', fn);
        return () => window.removeEventListener('resize', fn);
    }, []);
    return mobile;
}

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
    const navigate  = useNavigate();
    const base = usePlatformBase();
    const isMobile  = useIsMobile();
    const [filtersOpen, setFiltersOpen] = useState(false);

    const projectList  = Array.isArray(projects) ? projects : [];
    const activeProject = projectList.find(p => p.id === activeProjectId);

    const cpCount      = criticalPathIds.length;
    const overdueCount = filteredTasks.filter(t => {
        if (!t.due_date || t.status === 'COMPLETED') return false;
        return new Date(t.due_date) < new Date();
    }).length;

    const activeFilters = [
        filterStatus !== 'ALL',
        filterPhase  !== 'ALL',
        filterPriority !== 'ALL',
        search.trim() !== '',
    ].filter(Boolean).length;

    /* ─── Mobile layout ─────────────────────────────────────────── */
    if (isMobile) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--t-bg)' }}>
                <ManagementTabs />

                {/* Sticky top bar */}
                <div style={{
                    position: 'sticky', top: 0, zIndex: 40,
                    background: 'var(--t-surface)',
                    borderBottom: '1px solid var(--t-border)',
                    padding: '8px 12px',
                    display: 'flex', alignItems: 'center', gap: 8,
                }}>
                    <button onClick={() => navigate(`${base}/home`)} style={{
                        padding: '5px 8px', borderRadius: 8, fontSize: 13,
                        border: '1px solid var(--t-border)', background: 'transparent',
                        color: 'var(--t-text)', cursor: 'pointer',
                    }}>
                        🏠
                    </button>

                    {/* Title + project */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--t-text)', lineHeight: 1 }}>
                            📅 Timeline
                        </div>
                        {activeProject && (
                            <div style={{ fontSize: 10, color: 'var(--t-text3)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {activeProject.name}
                            </div>
                        )}
                    </div>

                    {/* Alert chips */}
                    {overdueCount > 0 && (
                        <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 7px', borderRadius: 6, background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)', whiteSpace: 'nowrap' }}>
                            ⚠ {overdueCount}
                        </span>
                    )}
                    {cpCount > 0 && (
                        <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 7px', borderRadius: 6, background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.18)', whiteSpace: 'nowrap' }}>
                            ⚡ {cpCount}
                        </span>
                    )}

                    {/* Filter toggle */}
                    <button onClick={() => setFiltersOpen(o => !o)} style={{
                        padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                        border: `1px solid ${activeFilters > 0 ? '#f97316' : 'var(--t-border)'}`,
                        background: activeFilters > 0 ? 'rgba(249,115,22,0.1)' : 'var(--t-surface2)',
                        color: activeFilters > 0 ? '#f97316' : 'var(--t-text)',
                        cursor: 'pointer', position: 'relative',
                    }}>
                        🔍{activeFilters > 0 ? ` ${activeFilters}` : ''}
                    </button>

                    {/* Refresh */}
                    <button onClick={load} disabled={loading} style={{
                        padding: '5px 8px', borderRadius: 8, fontSize: 13,
                        border: '1px solid var(--t-border)', background: 'transparent',
                        color: 'var(--t-text)', cursor: loading ? 'not-allowed' : 'pointer',
                    }}>
                        {loading ? '⏳' : '🔄'}
                    </button>
                </div>

                {/* Collapsible filter drawer */}
                {filtersOpen && (
                    <div style={{
                        background: 'var(--t-surface2)',
                        borderBottom: '1px solid var(--t-border)',
                        padding: '10px 12px',
                        display: 'flex', flexDirection: 'column', gap: 8,
                    }}>
                        {/* Search */}
                        <input
                            value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="🔍 Search tasks…"
                            style={{
                                padding: '7px 10px', borderRadius: 8, fontSize: 13,
                                border: '1px solid var(--t-border)', background: 'var(--t-surface)',
                                color: 'var(--t-text)', outline: 'none', width: '100%', boxSizing: 'border-box',
                            }}
                        />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={selectStyle}>
                                {STATUS_OPTS.map(s => <option key={s} value={s}>{s === 'ALL' ? 'All Statuses' : s.replace('_', ' ')}</option>)}
                            </select>
                            <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} style={selectStyle}>
                                {PRIORITY_OPTS.map(p => <option key={p} value={p}>{p === 'ALL' ? 'All Priorities' : p}</option>)}
                            </select>
                        </div>
                        <select value={filterPhase} onChange={e => setFilterPhase(e.target.value)} style={{ ...selectStyle, width: '100%' }}>
                            <option value="ALL">All Phases</option>
                            {phases.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        {/* Project selector */}
                        <select value={activeProjectId || ''} onChange={e => switchProject(Number(e.target.value))} style={{ ...selectStyle, width: '100%' }}>
                            {projectList.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 11, color: 'var(--t-text3)', fontWeight: 600 }}>
                                {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
                            </span>
                            {activeFilters > 0 && (
                                <button onClick={() => { setFilterStatus('ALL'); setFilterPhase('ALL'); setFilterPriority('ALL'); setSearch(''); }} style={{
                                    fontSize: 11, fontWeight: 700, color: '#ef4444', background: 'none',
                                    border: 'none', cursor: 'pointer', padding: '2px 6px',
                                }}>✕ Clear filters</button>
                            )}
                        </div>
                    </div>
                )}

                {/* Main content — above bottom tab bar */}
                <div style={{ flex: 1, overflow: 'hidden', position: 'relative', paddingBottom: 58 }}>
                    {loading ? (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--t-bg)' }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: 32, marginBottom: 8 }}>📅</div>
                                <p style={{ color: 'var(--t-text3)', fontWeight: 600, fontSize: 13 }}>Loading timeline…</p>
                            </div>
                        </div>
                    ) : children}
                </div>

                {/* Bottom view tab bar */}
                <div style={{
                    position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
                    background: 'var(--t-surface)',
                    borderTop: '1px solid var(--t-border)',
                    display: 'flex',
                }}>
                    {VIEWS.map(v => (
                        <button key={v.key} onClick={() => setViewMode(v.key)} style={{
                            flex: 1, padding: '9px 4px 7px',
                            border: 'none', cursor: 'pointer',
                            background: 'transparent',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                            color: viewMode === v.key ? '#f97316' : 'var(--t-text3)',
                            borderTop: viewMode === v.key ? '2px solid #f97316' : '2px solid transparent',
                            fontSize: 18, transition: 'color 0.15s',
                        }}>
                            <span>{v.short}</span>
                            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.04em' }}>
                                {v.title.split(' ')[0]}
                            </span>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    /* ─── Desktop layout (unchanged) ───────────────────────────── */
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
                <button onClick={() => navigate(`${base}/home`)} style={{
                    padding: '5px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                    border: '1px solid var(--t-border)', background: 'transparent',
                    color: 'var(--t-text)', cursor: 'pointer',
                }}>
                    🏠 Home
                </button>
                <div style={{ marginRight: 4 }}>
                    <h1 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: 'var(--t-text)' }}>📅 Timeline</h1>
                    {activeProject && (
                        <p style={{ margin: 0, fontSize: 10, color: 'var(--t-text3)' }}>{activeProject.name}</p>
                    )}
                </div>
                <select value={activeProjectId || ''} onChange={e => switchProject(Number(e.target.value))} style={{
                    padding: '5px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    border: '1px solid var(--t-border)', background: 'var(--t-surface2)',
                    color: 'var(--t-text)', cursor: 'pointer',
                }}>
                    {projectList.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--t-border)' }}>
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
                <div style={{ flex: 1 }} />
                {overdueCount > 0 && (
                    <div style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 800, background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
                        ⚠ {overdueCount} overdue
                    </div>
                )}
                {cpCount > 0 && (
                    <div style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 800, background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                        ⚡ {cpCount} critical
                    </div>
                )}
                <button onClick={load} disabled={loading} style={{ padding: '5px 10px', borderRadius: 8, fontSize: 12, border: '1px solid var(--t-border)', background: 'transparent', color: 'var(--t-text)', cursor: loading ? 'not-allowed' : 'pointer' }}>
                    {loading ? '⏳' : '🔄'}
                </button>
                <ExportButton />
                <button onClick={() => navigate('help')} style={{ padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, border: '1px solid var(--t-border)', background: 'var(--t-surface2)', color: 'var(--t-text)', cursor: 'pointer' }}>
                    ❓ Help
                </button>
            </div>

            {/* ── Filter bar ──────────────────────────────────────────── */}
            <div style={{ padding: '8px 16px', background: 'var(--t-surface2)', borderBottom: '1px solid var(--t-border)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search tasks…" style={{ padding: '5px 10px', borderRadius: 8, fontSize: 12, border: '1px solid var(--t-border)', background: 'var(--t-surface)', color: 'var(--t-text)', outline: 'none', minWidth: 160 }} />
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={selectStyle}>
                    {STATUS_OPTS.map(s => <option key={s} value={s}>{s === 'ALL' ? 'All Statuses' : s.replace('_', ' ')}</option>)}
                </select>
                <select value={filterPhase} onChange={e => setFilterPhase(e.target.value)} style={selectStyle}>
                    <option value="ALL">All Phases</option>
                    {phases.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} style={selectStyle}>
                    {PRIORITY_OPTS.map(p => <option key={p} value={p}>{p === 'ALL' ? 'All Priorities' : p}</option>)}
                </select>
                <div style={{ flex: 1 }} />
                <span style={{ fontSize: 11, color: 'var(--t-text3)', fontWeight: 600 }}>
                    {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
                </span>
            </div>

            {/* ── Main content ────────────────────────────────────────── */}
            <div style={{ flex: 1, overflow: 'hidden', position: 'relative', paddingBottom: '96px' }}>
                {loading ? (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--t-bg)' }}>
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

const selectStyle = {
    padding: '5px 10px', borderRadius: 8, fontSize: 12,
    border: '1px solid var(--t-border)', background: 'var(--t-surface)',
    color: 'var(--t-text)', cursor: 'pointer',
};
