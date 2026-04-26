/**
 * ListView — sortable, filterable table of all tasks across phases.
 */
import React, { useState, useMemo } from 'react';
import { useTimeline } from '../../context/TimelineContext';

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

function fmt(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
}

function daysLeft(dueStr) {
    if (!dueStr) return null;
    const diff = Math.round((new Date(dueStr) - new Date()) / 86400000);
    return diff;
}

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

export default function ListView({ onTaskClick }) {
    const { filteredTasks, phases, criticalPathIds } = useTimeline();
    const [sortKey, setSortKey]   = useState('due_date');
    const [sortDir, setSortDir]   = useState('asc');

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

    // Summary counts
    const counts = useMemo(() => {
        const c = { total: filteredTasks.length, done: 0, inProgress: 0, blocked: 0 };
        for (const t of filteredTasks) {
            if (t.status === 'COMPLETED')   c.done++;
            if (t.status === 'IN_PROGRESS') c.inProgress++;
            if (t.status === 'BLOCKED')     c.blocked++;
        }
        return c;
    }, [filteredTasks]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Summary bar */}
            <div style={{
                padding: '8px 16px', borderBottom: '1px solid var(--t-border)',
                background: 'var(--t-surface)',
                display: 'flex', gap: 20, flexWrap: 'wrap',
            }}>
                {[
                    ['Total', counts.total, 'var(--t-text)'],
                    ['Done', counts.done, '#10b981'],
                    ['In Progress', counts.inProgress, '#3b82f6'],
                    ['Blocked', counts.blocked, '#f59e0b'],
                    ['Critical', criticalPathIds.length, '#ef4444'],
                ].map(([label, val, color]) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 16, fontWeight: 900, color }}>{val}</span>
                        <span style={{ fontSize: 10, color: 'var(--t-text3)', fontWeight: 600 }}>{label}</span>
                    </div>
                ))}
            </div>

            {/* Table */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                        <tr>
                            <Th sort="title"          active={sortKey==='title'}          dir={sortDir} onSort={toggleSort}>Task</Th>
                            <Th sort="phase"          active={sortKey==='phase'}          dir={sortDir} onSort={toggleSort}>Phase</Th>
                            <Th sort="status"         active={sortKey==='status'}         dir={sortDir} onSort={toggleSort}>Status</Th>
                            <Th sort="priority"       active={sortKey==='priority'}       dir={sortDir} onSort={toggleSort}>Priority</Th>
                            <Th sort="progress_percentage" active={sortKey==='progress_percentage'} dir={sortDir} onSort={toggleSort}>Progress</Th>
                            <Th sort="start_date"     active={sortKey==='start_date'}     dir={sortDir} onSort={toggleSort}>Start</Th>
                            <Th sort="due_date"       active={sortKey==='due_date'}       dir={sortDir} onSort={toggleSort}>Due</Th>
                            <Th sort="estimated_cost" active={sortKey==='estimated_cost'} dir={sortDir} onSort={toggleSort}>Cost</Th>
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
                                    {/* Task title */}
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

                                    {/* Phase */}
                                    <td style={{ padding: '8px 12px', color: 'var(--t-text2)', whiteSpace: 'nowrap' }}>
                                        {phaseMap[task.phase] || '—'}
                                    </td>

                                    {/* Status */}
                                    <td style={{ padding: '8px 12px' }}>
                                        <span style={{
                                            padding: '2px 8px', borderRadius: 4,
                                            background: `${sm.color}20`, color: sm.color,
                                            fontSize: 10, fontWeight: 800,
                                        }}>
                                            {sm.label}
                                        </span>
                                    </td>

                                    {/* Priority */}
                                    <td style={{ padding: '8px 12px' }}>
                                        <span style={{ color: pm.color, fontSize: 10, fontWeight: 800 }}>
                                            {pm.label}
                                        </span>
                                    </td>

                                    {/* Progress */}
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

                                    {/* Start */}
                                    <td style={{ padding: '8px 12px', color: 'var(--t-text2)', fontSize: 11, whiteSpace: 'nowrap' }}>
                                        {fmt(task.start_date)}
                                    </td>

                                    {/* Due */}
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

                                    {/* Cost */}
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

                {sorted.length === 0 && (
                    <div style={{
                        padding: 48, textAlign: 'center',
                        color: 'var(--t-text3)', fontSize: 14,
                    }}>
                        <p style={{ fontSize: 36, marginBottom: 8 }}>📋</p>
                        No tasks match the current filters.
                    </div>
                )}
            </div>
        </div>
    );
}
