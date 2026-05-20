/**
 * KanbanView — drag-and-drop columns by status (desktop) /
 *              tab switcher (mobile).
 */
import React, { useState, useEffect } from 'react';
import { useTimeline } from '../../context/TimelineContext';
import timelineApi from '../../services/timelineApi';

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

const COLUMNS = [
    { key: 'PENDING',     label: 'Pending',     color: '#6b7280', icon: '⏳' },
    { key: 'IN_PROGRESS', label: 'In Progress',  color: '#3b82f6', icon: '🔄' },
    { key: 'BLOCKED',     label: 'Blocked',      color: '#f59e0b', icon: '🚫' },
    { key: 'COMPLETED',   label: 'Done',         color: '#10b981', icon: '✅' },
];

const PRIORITY_DOT = {
    CRITICAL: '#ef4444', HIGH: '#f97316', MEDIUM: '#f59e0b', LOW: '#6b7280',
};

const STATUS_META = {
    COMPLETED:   { label: 'Done',        color: '#10b981' },
    IN_PROGRESS: { label: 'In Progress', color: '#3b82f6' },
    HALTED:      { label: 'Halted',      color: '#ef4444' },
    BLOCKED:     { label: 'Blocked',     color: '#f59e0b' },
    PENDING:     { label: 'Pending',     color: '#6b7280' },
};

function fmt(d) {
    if (!d) return null;
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

/* ── shared task card ────────────────────────────────────────────────────── */
function KanbanCard({ task, phaseMap, criticalPathIds, col, dragging, onDragStart, onClick, isMobile }) {
    const isCritical = criticalPathIds.includes(task.id);
    const pct = task.progress_percentage || 0;
    const dl  = task.due_date
        ? Math.round((new Date(task.due_date) - new Date()) / 86400000)
        : null;

    return (
        <div
            draggable={!isMobile}
            onDragStart={!isMobile ? (e) => onDragStart(e, task) : undefined}
            onClick={() => onClick?.(task)}
            style={{
                marginBottom: 8,
                padding: isMobile ? '12px 14px' : '10px 12px',
                borderRadius: 10,
                cursor: 'pointer',
                background: 'var(--t-surface2)',
                border: `1px solid ${isCritical ? '#ef4444' : 'var(--t-border)'}`,
                boxShadow: isCritical ? '0 0 6px rgba(239,68,68,0.2)' : 'none',
                opacity: dragging?.id === task.id ? 0.5 : 1,
                transition: 'transform 0.1s',
            }}
            className={!isMobile ? 'hover:scale-[1.01]' : undefined}
        >
            {/* Top row: priority dot + title + CP badge */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 6 }}>
                <div style={{
                    width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                    background: PRIORITY_DOT[task.priority] || '#6b7280',
                    marginTop: 4,
                }} />
                <p style={{
                    margin: 0,
                    fontSize: isMobile ? 13 : 12,
                    fontWeight: 700, color: 'var(--t-text)',
                    lineHeight: 1.35, flex: 1,
                    wordBreak: 'break-word',
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
            <p style={{ margin: '0 0 6px 13px', fontSize: 10, color: 'var(--t-text3)' }}>
                {phaseMap[task.phase] || '—'}
            </p>

            {/* Progress bar */}
            {pct > 0 && (
                <div style={{ margin: '0 0 6px 0' }}>
                    <div style={{
                        height: isMobile ? 6 : 4, borderRadius: 3,
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

            {/* Footer: dependency + due */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 }}>
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
}

/* ── main component ─────────────────────────────────────────────────────── */
export default function KanbanView({ onTaskClick }) {
    const { filteredTasks, phases, criticalPathIds, updateTaskLocal } = useTimeline();
    const [dragging,     setDragging]     = useState(null);
    const [over,         setOver]         = useState(null);
    const [activeColumn, setActiveColumn] = useState('IN_PROGRESS');
    const isMobile = useIsMobile();

    const phaseMap = Object.fromEntries(phases.map(p => [p.id, p.name]));

    const columns = Object.fromEntries(
        COLUMNS.map(col => [
            col.key,
            filteredTasks.filter(t => t.status === col.key),
        ])
    );

    /* ── drag handlers (desktop only) ──────────────────────────────────── */
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
        updateTaskLocal({ ...dragging, status: colKey });
        try {
            await timelineApi.updateTask(dragging.id, { status: colKey });
        } catch {
            updateTaskLocal(dragging);
        }
        setDragging(null);
    }

    /* ── mobile: tab switcher ───────────────────────────────────────────── */
    if (isMobile) {
        const col     = COLUMNS.find(c => c.key === activeColumn) || COLUMNS[0];
        const cards   = columns[activeColumn] || [];

        return (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {/* Column tabs */}
                <div style={{
                    display: 'flex', overflowX: 'auto',
                    borderBottom: '2px solid var(--t-border)',
                    background: 'var(--t-surface)',
                    padding: '0 8px',
                    gap: 4,
                    flexShrink: 0,
                }}>
                    {COLUMNS.map(c => {
                        const cnt     = (columns[c.key] || []).length;
                        const isActive = activeColumn === c.key;
                        return (
                            <button
                                key={c.key}
                                onClick={() => setActiveColumn(c.key)}
                                style={{
                                    padding: '10px 12px',
                                    border: 'none',
                                    borderBottom: isActive ? `3px solid ${c.color}` : '3px solid transparent',
                                    background: 'transparent',
                                    cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: 5,
                                    flexShrink: 0,
                                    transition: 'border-color 0.15s',
                                }}
                            >
                                <span style={{ fontSize: 14 }}>{c.icon}</span>
                                <span style={{
                                    fontSize: 11, fontWeight: 800,
                                    color: isActive ? c.color : 'var(--t-text3)',
                                }}>
                                    {c.label}
                                </span>
                                <span style={{
                                    fontSize: 10, fontWeight: 900,
                                    padding: '1px 6px', borderRadius: 8,
                                    background: isActive ? `${c.color}25` : 'var(--t-border)',
                                    color: isActive ? c.color : 'var(--t-text3)',
                                }}>
                                    {cnt}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Cards for active column */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px 80px' }}>
                    {cards.length === 0 ? (
                        <div style={{
                            padding: 32, textAlign: 'center',
                            color: 'var(--t-text3)', fontSize: 13,
                            border: `2px dashed var(--t-border)`,
                            borderRadius: 10, marginTop: 16,
                        }}>
                            {col.icon} No {col.label.toLowerCase()} tasks
                        </div>
                    ) : cards.map(task => (
                        <KanbanCard
                            key={task.id}
                            task={task}
                            phaseMap={phaseMap}
                            criticalPathIds={criticalPathIds}
                            col={col}
                            dragging={null}
                            onDragStart={() => {}}
                            onClick={onTaskClick}
                            isMobile={true}
                        />
                    ))}
                </div>
            </div>
        );
    }

    /* ── desktop: 4-column drag-and-drop board ───────────────────────────── */
    return (
        <div style={{
            display: 'flex', gap: 12, height: '100%',
            padding: '12px 16px', overflowX: 'auto', overflowY: 'hidden',
        }}>
            {COLUMNS.map(col => {
                const cards  = columns[col.key] || [];
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
                            {cards.map(task => (
                                <KanbanCard
                                    key={task.id}
                                    task={task}
                                    phaseMap={phaseMap}
                                    criticalPathIds={criticalPathIds}
                                    col={col}
                                    dragging={dragging}
                                    onDragStart={onDragStart}
                                    onClick={onTaskClick}
                                    isMobile={false}
                                />
                            ))}

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
