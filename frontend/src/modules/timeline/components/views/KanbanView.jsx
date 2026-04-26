/**
 * KanbanView — drag-and-drop columns by task status.
 */
import React, { useState } from 'react';
import { useTimeline } from '../../context/TimelineContext';
import timelineApi from '../../services/timelineApi';

const COLUMNS = [
    { key: 'PENDING',     label: 'Pending',     color: '#6b7280', icon: '⏳' },
    { key: 'IN_PROGRESS', label: 'In Progress',  color: '#3b82f6', icon: '🔄' },
    { key: 'BLOCKED',     label: 'Blocked',      color: '#f59e0b', icon: '🚫' },
    { key: 'COMPLETED',   label: 'Done',         color: '#10b981', icon: '✅' },
];

const PRIORITY_DOT = {
    CRITICAL: '#ef4444', HIGH: '#f97316', MEDIUM: '#f59e0b', LOW: '#6b7280',
};

export default function KanbanView({ onTaskClick }) {
    const { filteredTasks, phases, criticalPathIds, updateTaskLocal } = useTimeline();
    const [dragging, setDragging] = useState(null);
    const [over,     setOver]     = useState(null);

    const phaseMap = Object.fromEntries(phases.map(p => [p.id, p.name]));

    const columns = Object.fromEntries(
        COLUMNS.map(col => [
            col.key,
            filteredTasks.filter(t => t.status === col.key),
        ])
    );

    function onDragStart(e, task) {
        setDragging(task);
        e.dataTransfer.effectAllowed = 'move';
    }

    function onDragOver(e, colKey) {
        e.preventDefault();
        setOver(colKey);
    }

    function onDragLeave() {
        setOver(null);
    }

    async function onDrop(e, colKey) {
        e.preventDefault();
        setOver(null);
        if (!dragging || dragging.status === colKey) return;
        // Optimistic update
        updateTaskLocal({ ...dragging, status: colKey });
        try {
            await timelineApi.updateTask(dragging.id, { status: colKey });
        } catch {
            // revert
            updateTaskLocal(dragging);
        }
        setDragging(null);
    }

    function fmt(d) {
        if (!d) return null;
        return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    }

    return (
        <div style={{
            display: 'flex', gap: 12, height: '100%',
            padding: '12px 16px', overflowX: 'auto', overflowY: 'hidden',
        }}>
            {COLUMNS.map(col => {
                const cards = columns[col.key] || [];
                const isOver = over === col.key;

                return (
                    <div key={col.key}
                        onDragOver={e => onDragOver(e, col.key)}
                        onDragLeave={onDragLeave}
                        onDrop={e => onDrop(e, col.key)}
                        style={{
                            minWidth: 240, maxWidth: 280, flex: '0 0 260px',
                            display: 'flex', flexDirection: 'column',
                            borderRadius: 12,
                            background: isOver ? `${col.color}12` : 'var(--t-surface)',
                            border: `1px solid ${isOver ? col.color : 'var(--t-border)'}`,
                            transition: 'border-color 0.15s, background 0.15s',
                        }}
                    >
                        {/* Column header */}
                        <div style={{
                            padding: '10px 14px',
                            borderBottom: '1px solid var(--t-border)',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                <span style={{ fontSize: 14 }}>{col.icon}</span>
                                <span style={{ fontSize: 12, fontWeight: 800, color: col.color }}>
                                    {col.label}
                                </span>
                            </div>
                            <span style={{
                                fontSize: 11, fontWeight: 900,
                                background: `${col.color}20`, color: col.color,
                                padding: '1px 7px', borderRadius: 8,
                            }}>
                                {cards.length}
                            </span>
                        </div>

                        {/* Cards */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px' }}>
                            {cards.map(task => {
                                const isCritical = criticalPathIds.includes(task.id);
                                const pct = task.progress_percentage || 0;
                                const dl = task.due_date
                                    ? Math.round((new Date(task.due_date) - new Date()) / 86400000)
                                    : null;

                                return (
                                    <div
                                        key={task.id}
                                        draggable
                                        onDragStart={e => onDragStart(e, task)}
                                        onClick={() => onTaskClick?.(task)}
                                        style={{
                                            marginBottom: 8, padding: '10px 12px',
                                            borderRadius: 8, cursor: 'pointer',
                                            background: 'var(--t-surface2)',
                                            border: `1px solid ${isCritical ? '#ef4444' : 'var(--t-border)'}`,
                                            boxShadow: isCritical ? '0 0 6px rgba(239,68,68,0.2)' : 'none',
                                            transition: 'transform 0.1s',
                                            opacity: dragging?.id === task.id ? 0.5 : 1,
                                        }}
                                        className="hover:scale-[1.01]"
                                    >
                                        {/* Top row */}
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 5, marginBottom: 6 }}>
                                            <div style={{
                                                width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                                                background: PRIORITY_DOT[task.priority] || '#6b7280',
                                                marginTop: 3,
                                            }} />
                                            <p style={{
                                                margin: 0, fontSize: 12, fontWeight: 700,
                                                color: 'var(--t-text)', lineHeight: 1.3, flex: 1,
                                            }}>
                                                {task.title}
                                            </p>
                                            {isCritical && (
                                                <span style={{
                                                    fontSize: 8, padding: '1px 4px', borderRadius: 3,
                                                    background: 'rgba(239,68,68,0.12)', color: '#ef4444',
                                                    fontWeight: 900, flexShrink: 0,
                                                }}>⚡CP</span>
                                            )}
                                        </div>

                                        {/* Phase */}
                                        <p style={{ margin: '0 0 6px 12px', fontSize: 10, color: 'var(--t-text3)' }}>
                                            {phaseMap[task.phase] || '—'}
                                        </p>

                                        {/* Progress bar */}
                                        {pct > 0 && (
                                            <div style={{ margin: '0 0 6px 0' }}>
                                                <div style={{
                                                    height: 4, borderRadius: 2,
                                                    background: 'var(--t-border)', overflow: 'hidden',
                                                }}>
                                                    <div style={{
                                                        height: '100%', width: `${pct}%`,
                                                        background: pct === 100 ? '#10b981' : col.color,
                                                    }} />
                                                </div>
                                                <p style={{ margin: '2px 0 0', fontSize: 9, color: 'var(--t-text3)', textAlign: 'right' }}>
                                                    {pct}%
                                                </p>
                                            </div>
                                        )}

                                        {/* Footer: dependency + due date */}
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            {task.blocked_by ? (
                                                <span style={{ fontSize: 9, color: '#f59e0b', fontWeight: 700 }}>
                                                    🔗 Depends on #{task.blocked_by}
                                                </span>
                                            ) : <span />}

                                            {dl !== null && (
                                                <span style={{
                                                    fontSize: 9, fontWeight: 700,
                                                    color: dl < 0 ? '#ef4444' : dl <= 3 ? '#f59e0b' : 'var(--t-text3)',
                                                }}>
                                                    {dl < 0 ? `⚠ ${Math.abs(dl)}d over` : `📅 ${fmt(task.due_date)}`}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}

                            {cards.length === 0 && (
                                <div style={{
                                    padding: 20, textAlign: 'center',
                                    color: 'var(--t-text3)', fontSize: 11,
                                    border: `2px dashed ${isOver ? col.color : 'var(--t-border)'}`,
                                    borderRadius: 8, transition: 'border-color 0.15s',
                                }}>
                                    Drop here
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
