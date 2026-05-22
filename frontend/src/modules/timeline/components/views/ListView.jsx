/**
 * ListView — sortable, filterable table of all tasks (desktop) /
 *            card list (mobile).
 */
import React, { useState, useMemo, useEffect } from 'react';
import { useTimeline } from '../../context/TimelineContext';

/* ── mobile detector ───────────────────────────────────────────────────────── */
function useIsMobile() {
    const [m, setM] = useState(() => window.innerWidth < 768);
    useEffect(() => {
        const h = () => setM(window.innerWidth < 768);
        window.addEventListener('resize', h);
        return () => window.removeEventListener('resize', h);
    }, []);
    return m;
}

/* ── meta maps ─────────────────────────────────────────────────────────────── */
const STATUS_META = {
    COMPLETED:   { label: 'Done',        color: '#10b981' },
    IN_PROGRESS: { label: 'In Progress', color: '#3b82f6' },
    HALTED:      { label: 'Halted',      color: '#ef4444' },
    BLOCKED:     { label: 'Blocked',     color: '#f59e0b' },
    PENDING:     { label: 'Pending',     color: '#6b7280' },
};

const PRIORITY_META = {
    CRITICAL: { label: 'CRITICAL', color: '#ef4444' },
    HIGH:     { label: 'HIGH',     color: '#f97316' },
    MEDIUM:   { label: 'MEDIUM',   color: '#f59e0b' },
    LOW:      { label: 'LOW',      color: '#6b7280' },
};

/* ── helpers ─────────────────────────────────────────────────────────────── */
function fmt(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
}

function daysLeft(dueStr) {
    if (!dueStr) return null;
    return Math.round((new Date(dueStr) - new Date()) / 86400000);
}

/* ── desktop table header ───────────────────────────────────────────────── */
const Th = ({ children, sort, active, dir, onSort }) => (
    <th onClick={() => onSort(sort)} style={{
        padding: '8px 12px', textAlign: 'left', fontSize: 10,
        fontWeight: 800, color: active ? '#f97316' : 'var(--t-text3)',
        letterSpacing: '0.08em', textTransform: 'uppercase',
        cursor: 'pointer', whiteSpace: 'nowrap',
        borderBottom: '2px solid var(--t-border)',
        background: 'var(--t-surface2)',
    }}>
        {children} {active ? (dir === 'asc' ? '↑' : '↓') : ''}
    </th>
);

/* ── mobile task card ───────────────────────────────────────────────────── */
function MobileTaskCard({ task, phaseMap, criticalPathIds, onTaskClick }) {
    const sm  = STATUS_META[task.status]   || STATUS_META.PENDING;
    const pm  = PRIORITY_META[task.priority] || PRIORITY_META.MEDIUM;
    const dl  = daysLeft(task.due_date);
    const pct = task.progress_percentage || 0;
    const isCritical = criticalPathIds.includes(task.id);

    return (
        <div
            onClick={() => onTaskClick?.(task)}
            style={{
                background: 'var(--t-surface)',
                border: `1px solid ${isCritical ? 'rgba(239,68,68,0.5)' : 'var(--t-border)'}`,
                borderLeft: `3px solid ${isCritical ? '#ef4444' : sm.color}`,
                borderRadius: 10,
                padding: '10px 12px',
                marginBottom: 8,
                cursor: 'pointer',
            }}
        >
            {/* Row 1: title + critical badge */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 6 }}>
                <div style={{
                    width: 7, height: 7, borderRadius: '50%', flexShrink: 0, marginTop: 5,
                    background: pm.color,
                }} />
                <p style={{
                    margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--t-text)',
                    flex: 1, wordBreak: 'break-word', lineHeight: 1.35,
                }}>
                    {task.title}
                </p>
                {isCritical && (
                    <span style={{
                        fontSize: 8, padding: '2px 5px', borderRadius: 4,
                        background: 'rgba(239,68,68,0.12)', color: '#ef4444',
                        fontWeight: 900, flexShrink: 0, marginTop: 2,
                    }}>⚡CP</span>
                )}
            </div>

            {/* Row 2: phase · status · priority */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 7 }}>
                {phaseMap[task.phase] && (
                    <span style={{ fontSize: 10, color: 'var(--t-text3)', fontWeight: 600 }}>
                        📁 {phaseMap[task.phase]}
                    </span>
                )}
                <span style={{
                    fontSize: 9, padding: '2px 7px', borderRadius: 4,
                    background: `${sm.color}20`, color: sm.color, fontWeight: 800,
                }}>
                    {sm.label}
                </span>
                <span style={{ fontSize: 9, color: pm.color, fontWeight: 800 }}>
                    {pm.label}
                </span>
                {task.blocked_by && (
                    <span style={{ fontSize: 9, color: '#f59e0b', fontWeight: 700 }}>🔗 dep</span>
                )}
            </div>

            {/* Row 3: progress bar */}
            <div style={{ position: 'relative', marginBottom: 6 }}>
                <div style={{
                    height: 14, borderRadius: 5, background: 'var(--t-border)', overflow: 'hidden',
                }}>
                    <div style={{
                        height: '100%', width: `${pct}%`,
                        background: pct === 100
                            ? 'linear-gradient(90deg,#10b981,#34d399)'
                            : `linear-gradient(90deg,${sm.color},${sm.color}cc)`,
                        transition: 'width 0.3s',
                    }} />
                </div>
                <span style={{
                    position: 'absolute', right: 5, top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: 8, fontWeight: 900,
                    color: pct > 80 ? '#fff' : 'var(--t-text2)',
                    pointerEvents: 'none',
                }}>
                    {pct}%
                </span>
            </div>

            {/* Row 4: dates */}
            {(task.start_date || task.due_date) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {task.start_date && (
                        <span style={{ fontSize: 10, color: 'var(--t-text3)' }}>
                            ▶ {fmt(task.start_date)}
                        </span>
                    )}
                    {task.due_date && (
                        <span style={{
                            fontSize: 10, fontWeight: 700,
                            color: dl !== null && dl < 0 ? '#ef4444' : dl !== null && dl <= 3 ? '#f59e0b' : 'var(--t-text2)',
                        }}>
                            ⏰ {fmt(task.due_date)}
                            {dl !== null && (
                                <span style={{ marginLeft: 4, fontSize: 9 }}>
                                    ({dl < 0 ? `${Math.abs(dl)}d over` : `${dl}d left`})
                                </span>
                            )}
                        </span>
                    )}
                    {task.estimated_cost && (
                        <span style={{ fontSize: 10, color: 'var(--t-text3)', marginLeft: 'auto' }}>
                            NPR {Number(task.estimated_cost).toLocaleString()}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}

/* ── Summary bar — declared outside ListView so React never recreates it ─── */
const EMPTY_COUNTS = { total: 0, done: 0, inProgress: 0, blocked: 0 };

function SummaryBar({ counts = EMPTY_COUNTS, isMobile = false, criticalPathIds = [] }) {
    return (
        <div style={{
            padding: isMobile ? '8px 12px' : '8px 16px',
            borderBottom: '1px solid var(--t-border)',
            background: 'var(--t-surface)',
            display: 'flex', gap: isMobile ? 12 : 20,
            flexWrap: 'wrap',
        }}>
            {[
                ['Total',       counts.total,             'var(--t-text)'],
                ['Done',        counts.done,              '#10b981'],
                ['In Progress', counts.inProgress,        '#3b82f6'],
                ['Blocked',     counts.blocked,           '#f59e0b'],
                ['Critical',    criticalPathIds.length,   '#ef4444'],
            ].map(([label, val, color]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: isMobile ? 14 : 16, fontWeight: 900, color }}>{val}</span>
                    <span style={{ fontSize: 10, color: 'var(--t-text3)', fontWeight: 600 }}>{label}</span>
                </div>
            ))}
        </div>
    );
}

/* ── main component ─────────────────────────────────────────────────────── */
export default function ListView({ onTaskClick }) {
    const { filteredTasks = [], phases = [], criticalPathIds = [] } = useTimeline();
    const [sortKey, setSortKey] = useState('due_date');
    const [sortDir, setSortDir] = useState('asc');
    const isMobile = useIsMobile();

    const phaseMap = useMemo(() =>
        Object.fromEntries(phases.map(p => [p.id, p.name])), [phases]);

    const sorted = useMemo(() => {
        const arr = [...filteredTasks];
        arr.sort((a, b) => {
            let av = a[sortKey], bv = b[sortKey];
            if (av == null) av = '';
            if (bv == null) bv = '';
            return sortDir === 'asc'
                ? String(av).localeCompare(String(bv))
                : String(bv).localeCompare(String(av));
        });
        return arr;
    }, [filteredTasks, sortKey, sortDir]);

    const toggleSort = (key) => {
        if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortKey(key); setSortDir('asc'); }
    };

    const counts = useMemo(() => {
        const c = { total: filteredTasks.length, done: 0, inProgress: 0, blocked: 0 };
        for (const t of filteredTasks) {
            if (t.status === 'COMPLETED')   c.done++;
            if (t.status === 'IN_PROGRESS') c.inProgress++;
            if (t.status === 'BLOCKED')     c.blocked++;
        }
        return c;
    }, [filteredTasks]);

    /* ── empty state ─────────────────────────────────────────────────────── */
    if (sorted.length === 0) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <SummaryBar counts={counts} isMobile={isMobile} criticalPathIds={criticalPathIds} />
                <div style={{ padding: 48, textAlign: 'center', color: 'var(--t-text3)', fontSize: 14 }}>
                    <p style={{ fontSize: 36, marginBottom: 8 }}>📋</p>
                    No tasks match the current filters.
                </div>
            </div>
        );
    }

    /* ── mobile: card list ───────────────────────────────────────────────── */
    if (isMobile) {
        // Sort controls for mobile
        const SORT_OPTIONS = [
            { key: 'due_date',   label: 'Due Date' },
            { key: 'status',     label: 'Status'   },
            { key: 'priority',   label: 'Priority' },
            { key: 'title',      label: 'Name'     },
        ];

        return (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <SummaryBar counts={counts} isMobile={isMobile} criticalPathIds={criticalPathIds} />

                {/* Sort row */}
                <div style={{
                    padding: '8px 12px',
                    borderBottom: '1px solid var(--t-border)',
                    background: 'var(--t-surface)',
                    display: 'flex', alignItems: 'center', gap: 6, overflowX: 'auto',
                }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--t-text3)', flexShrink: 0 }}>Sort:</span>
                    {SORT_OPTIONS.map(opt => (
                        <button
                            key={opt.key}
                            onClick={() => toggleSort(opt.key)}
                            style={{
                                padding: '4px 10px', borderRadius: 7, fontSize: 10, fontWeight: 800,
                                border: `1px solid ${sortKey === opt.key ? '#f97316' : 'var(--t-border)'}`,
                                background: sortKey === opt.key ? 'rgba(249,115,22,0.10)' : 'var(--t-surface2)',
                                color: sortKey === opt.key ? '#f97316' : 'var(--t-text2)',
                                cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                            }}
                        >
                            {opt.label} {sortKey === opt.key ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                        </button>
                    ))}
                </div>

                {/* Card list */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px 80px' }}>
                    {sorted.map(task => (
                        <MobileTaskCard
                            key={task.id}
                            task={task}
                            phaseMap={phaseMap}
                            criticalPathIds={criticalPathIds}
                            onTaskClick={onTaskClick}
                        />
                    ))}
                </div>
            </div>
        );
    }

    /* ── desktop: table ──────────────────────────────────────────────────── */
    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <SummaryBar counts={counts} isMobile={isMobile} criticalPathIds={criticalPathIds} />
            <div style={{ flex: 1, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                        <tr>
                            <Th sort="title"               active={sortKey==='title'}               dir={sortDir} onSort={toggleSort}>Task</Th>
                            <Th sort="phase"               active={sortKey==='phase'}               dir={sortDir} onSort={toggleSort}>Phase</Th>
                            <Th sort="status"              active={sortKey==='status'}              dir={sortDir} onSort={toggleSort}>Status</Th>
                            <Th sort="priority"            active={sortKey==='priority'}            dir={sortDir} onSort={toggleSort}>Priority</Th>
                            <Th sort="progress_percentage" active={sortKey==='progress_percentage'} dir={sortDir} onSort={toggleSort}>Progress</Th>
                            <Th sort="start_date"          active={sortKey==='start_date'}          dir={sortDir} onSort={toggleSort}>Start</Th>
                            <Th sort="due_date"            active={sortKey==='due_date'}            dir={sortDir} onSort={toggleSort}>Due</Th>
                            <Th sort="estimated_cost"      active={sortKey==='estimated_cost'}      dir={sortDir} onSort={toggleSort}>Cost</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map(task => {
                            const sm = STATUS_META[task.status] || STATUS_META.PENDING;
                            const pm = PRIORITY_META[task.priority] || PRIORITY_META.MEDIUM;
                            const dl = daysLeft(task.due_date);
                            const isCritical = criticalPathIds.includes(task.id);
                            const pct = task.progress_percentage || 0;

                            return (
                                <tr key={task.id}
                                    onClick={() => onTaskClick?.(task)}
                                    style={{
                                        cursor: 'pointer',
                                        background: isCritical ? 'rgba(239,68,68,0.04)' : 'var(--t-surface)',
                                        borderBottom: '1px solid var(--t-border)',
                                        borderLeft: isCritical ? '3px solid #ef4444' : '3px solid transparent',
                                    }}
                                    className="hover:brightness-95"
                                >
                                    <td style={{ padding: '8px 12px', maxWidth: 220 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                            {isCritical && (
                                                <span style={{
                                                    fontSize: 8, padding: '1px 4px', borderRadius: 3,
                                                    background: 'rgba(239,68,68,0.12)', color: '#ef4444',
                                                    fontWeight: 900, flexShrink: 0,
                                                }}>⚡CP</span>
                                            )}
                                            {task.blocked_by && (
                                                <span title="Has dependency" style={{ fontSize: 10 }}>🔗</span>
                                            )}
                                            <span style={{
                                                fontWeight: 600, color: 'var(--t-text)',
                                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                            }}>
                                                {task.title}
                                            </span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '8px 12px', color: 'var(--t-text2)', whiteSpace: 'nowrap' }}>
                                        {phaseMap[task.phase] || '—'}
                                    </td>
                                    <td style={{ padding: '8px 12px' }}>
                                        <span style={{
                                            padding: '2px 8px', borderRadius: 4,
                                            background: `${sm.color}20`, color: sm.color,
                                            fontSize: 10, fontWeight: 800,
                                        }}>
                                            {sm.label}
                                        </span>
                                    </td>
                                    <td style={{ padding: '8px 12px' }}>
                                        <span style={{ color: pm.color, fontSize: 10, fontWeight: 800 }}>
                                            {pm.label}
                                        </span>
                                    </td>
                                    <td style={{ padding: '8px 12px', minWidth: 90 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                            <div style={{
                                                flex: 1, height: 5, borderRadius: 3,
                                                background: 'var(--t-border)', overflow: 'hidden',
                                            }}>
                                                <div style={{
                                                    height: '100%', width: `${pct}%`,
                                                    background: pct === 100 ? '#10b981' : '#3b82f6',
                                                    transition: 'width 0.3s',
                                                }} />
                                            </div>
                                            <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--t-text3)', minWidth: 26 }}>
                                                {pct}%
                                            </span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '8px 12px', color: 'var(--t-text2)', fontSize: 11, whiteSpace: 'nowrap' }}>
                                        {fmt(task.start_date)}
                                    </td>
                                    <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                                        <span style={{ fontSize: 11, color: dl !== null && dl < 0 ? '#ef4444' : dl !== null && dl <= 3 ? '#f59e0b' : 'var(--t-text2)' }}>
                                            {fmt(task.due_date)}
                                        </span>
                                        {dl !== null && (
                                            <span style={{
                                                marginLeft: 4, fontSize: 9, fontWeight: 700,
                                                color: dl < 0 ? '#ef4444' : dl <= 3 ? '#f59e0b' : 'var(--t-text3)',
                                            }}>
                                                {dl < 0 ? `${Math.abs(dl)}d over` : `${dl}d left`}
                                            </span>
                                        )}
                                    </td>
                                    <td style={{ padding: '8px 12px', color: 'var(--t-text2)', fontSize: 11, whiteSpace: 'nowrap' }}>
                                        {task.estimated_cost
                                            ? `NPR ${Number(task.estimated_cost).toLocaleString()}`
                                            : '—'}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
