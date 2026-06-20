/**
 * GanttView — horizontal bar chart with date ruler, dependency arrows,
 * critical-path highlighting and today indicator (desktop) /
 * phase-grouped milestone list (mobile).
 */
import React, { useRef, useState, useMemo, useEffect } from 'react';
import { useTimeline } from '../../context/TimelineContext';
import { daysUntilDate, isTaskOverdue } from '../../../../shared/utils/taskSchedule';

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

/* ─── helpers ─────────────────────────────────────────────────────────────── */
const DAY = 86400000;

const STATUS_COLOR = {
    COMPLETED:   '#10b981',
    IN_PROGRESS: '#3b82f6',
    HALTED:      '#ef4444',
    BLOCKED:     '#f59e0b',
    PENDING:     '#6b7280',
};

const STATUS_LABEL = {
    COMPLETED:   'Done',
    IN_PROGRESS: 'Active',
    HALTED:      'Halted',
    BLOCKED:     'Blocked',
    PENDING:     'Pending',
};

const PRIORITY_DOT = {
    CRITICAL: '#ef4444',
    HIGH:     '#f97316',
    MEDIUM:   '#f59e0b',
    LOW:      '#6b7280',
};

function addDays(date, n) {
    return new Date(date.getTime() + n * DAY);
}

function daysBetween(a, b) {
    return Math.round((b - a) / DAY);
}

function clamp(val, lo, hi) {
    return Math.max(lo, Math.min(hi, val));
}

function fmtShort(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
}

/* ─── Date Ruler ─────────────────────────────────────────────────────────── */
const DateRuler = ({ minDate, totalDays, colW }) => {
    const months = [];
    let cursor = new Date(minDate);
    cursor.setDate(1);
    while (cursor <= addDays(minDate, totalDays)) {
        const offsetDays = daysBetween(minDate, cursor);
        const label = cursor.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        months.push({ label, offsetDays });
        cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }

    return (
        <div style={{ position: 'relative', height: 28, borderBottom: '1px solid var(--t-border)', overflow: 'hidden' }}>
            {months.map(m => (
                <div key={m.label + m.offsetDays}
                    style={{
                        position: 'absolute',
                        left: Math.max(0, m.offsetDays) * colW,
                        fontSize: 10, fontWeight: 700,
                        color: 'var(--t-text3)',
                        padding: '5px 6px',
                        whiteSpace: 'nowrap',
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                    }}>
                    {m.label}
                </div>
            ))}
            {Array.from({ length: Math.ceil(totalDays / 7) }, (_, i) => (
                <div key={i} style={{
                    position: 'absolute', left: i * 7 * colW, top: 0,
                    width: 1, height: '100%',
                    background: 'var(--t-border)', opacity: 0.4,
                }} />
            ))}
        </div>
    );
};

/* ─── GanttBar ────────────────────────────────────────────────────────────── */
const GanttBar = ({ left, width, color, isCritical, label, pct, onClick, isTask }) => (
    <div
        onClick={onClick}
        title={label}
        style={{
            position: 'absolute',
            left, width: Math.max(width, 4),
            top: isTask ? 6 : 4,
            height: isTask ? 16 : 22,
            background: color,
            borderRadius: isTask ? 4 : 6,
            cursor: 'pointer',
            border: isCritical ? '2px solid #ef4444' : '1px solid rgba(0,0,0,0.15)',
            boxShadow: isCritical ? '0 0 6px rgba(239,68,68,0.5)' : 'none',
            overflow: 'hidden',
            transition: 'opacity 0.15s',
        }}
        className="hover:opacity-80"
    >
        {pct > 0 && (
            <div style={{
                position: 'absolute', left: 0, top: 0,
                height: '100%', width: `${pct}%`,
                background: 'rgba(255,255,255,0.25)',
                pointerEvents: 'none',
            }} />
        )}
        {width > 60 && (
            <span style={{
                position: 'absolute', left: 4, top: '50%', transform: 'translateY(-50%)',
                fontSize: 9, fontWeight: 700, color: '#fff',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                maxWidth: width - 8, pointerEvents: 'none',
            }}>
                {label}
            </span>
        )}
    </div>
);

/* ─── Mobile milestone list ───────────────────────────────────────────────── */
function MobileGanttView({ phases, tasksByPhase, filteredTasks, criticalPathIds, onTaskClick }) {
    const [expanded, setExpanded] = useState(() => new Set(phases.map(p => p.id)));

    const toggle = (id) => setExpanded(prev => {
        const s = new Set(prev);
        s.has(id) ? s.delete(id) : s.add(id);
        return s;
    });

    const filteredSet = new Set(filteredTasks.map(t => t.id));

    return (
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px 80px' }}>
            {/* Info banner */}
            <div style={{
                padding: '8px 12px', borderRadius: 8, marginBottom: 12,
                background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)',
                display: 'flex', alignItems: 'center', gap: 8,
            }}>
                <span style={{ fontSize: 14 }}>📅</span>
                <span style={{ fontSize: 11, color: 'var(--t-text2)', fontWeight: 600 }}>
                    Gantt chart is available on desktop. Showing phase timeline below.
                </span>
            </div>

            {phases.map(phase => {
                const pTasks = (tasksByPhase[phase.id] || []).filter(t => filteredSet.has(t.id));
                const isOpen = expanded.has(phase.id);
                const sc     = STATUS_COLOR[phase.status] || '#6b7280';
                const sl     = STATUS_LABEL[phase.status] || phase.status;
                const done   = pTasks.filter(t => t.status === 'COMPLETED').length;
                const pct    = pTasks.length ? Math.round((done / pTasks.length) * 100) : 0;

                return (
                    <div key={phase.id} style={{
                        marginBottom: 10,
                        border: '1px solid var(--t-border)',
                        borderLeft: `3px solid ${sc}`,
                        borderRadius: 10,
                        background: 'var(--t-surface)',
                        overflow: 'hidden',
                    }}>
                        {/* Phase header */}
                        <div
                            onClick={() => toggle(phase.id)}
                            style={{
                                padding: '10px 12px',
                                cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: 8,
                            }}
                        >
                            <span style={{ fontSize: 13, transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', display: 'inline-block' }}>›</span>

                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{
                                    margin: 0, fontSize: 13, fontWeight: 800,
                                    color: 'var(--t-text)', wordBreak: 'break-word',
                                }}>
                                    {phase.name}
                                </p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
                                    <span style={{
                                        fontSize: 9, padding: '1px 6px', borderRadius: 4,
                                        background: `${sc}20`, color: sc, fontWeight: 800,
                                    }}>{sl}</span>
                                    <span style={{ fontSize: 10, color: 'var(--t-text3)' }}>
                                        {done}/{pTasks.length} tasks
                                    </span>
                                    {phase.start_date && (
                                        <span style={{ fontSize: 10, color: 'var(--t-text3)' }}>
                                            {fmtShort(phase.start_date)} → {fmtShort(phase.end_date)}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <span style={{ fontSize: 11, fontWeight: 900, color: 'var(--t-text3)', flexShrink: 0 }}>
                                {pct}%
                            </span>
                        </div>

                        {/* Progress bar */}
                        <div style={{ position: 'relative', margin: '0 12px 4px' }}>
                            <div style={{ height: 5, borderRadius: 3, background: 'var(--t-border)', overflow: 'hidden' }}>
                                <div style={{
                                    height: '100%', width: `${pct}%`,
                                    background: pct === 100 ? '#10b981' : sc,
                                    transition: 'width 0.4s',
                                }} />
                            </div>
                        </div>

                        {/* Task list */}
                        {isOpen && pTasks.length > 0 && (
                            <div style={{ padding: '4px 12px 10px' }}>
                                {pTasks.map(task => {
                                    const tc       = STATUS_COLOR[task.status] || '#6b7280';
                                    const tl       = STATUS_LABEL[task.status] || task.status;
                                    const isCrit   = criticalPathIds.includes(task.id);
                                    const dl       = daysUntilDate(task.due_date);
                                    const overdue  = isTaskOverdue(task, [phase]);
                                    const workFinished = task.status === 'COMPLETED' || phase.status === 'COMPLETED';

                                    return (
                                        <div
                                            key={task.id}
                                            onClick={() => onTaskClick?.(task)}
                                            style={{
                                                padding: '8px 10px',
                                                borderRadius: 8,
                                                marginBottom: 6,
                                                cursor: 'pointer',
                                                background: 'var(--t-surface2)',
                                                border: `1px solid ${isCrit ? 'rgba(239,68,68,0.4)' : 'var(--t-border)'}`,
                                                display: 'flex', alignItems: 'flex-start', gap: 8,
                                            }}
                                        >
                                            {/* Priority dot */}
                                            <div style={{
                                                width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                                                background: PRIORITY_DOT[task.priority] || '#6b7280',
                                                marginTop: 4,
                                            }} />

                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                                                    <span style={{
                                                        fontSize: 12, fontWeight: 700,
                                                        color: 'var(--t-text)', wordBreak: 'break-word',
                                                    }}>
                                                        {task.title}
                                                    </span>
                                                    {isCrit && (
                                                        <span style={{
                                                            fontSize: 8, padding: '1px 4px', borderRadius: 3,
                                                            background: 'rgba(239,68,68,0.12)', color: '#ef4444', fontWeight: 900,
                                                        }}>⚡CP</span>
                                                    )}
                                                </div>

                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                                                    <span style={{
                                                        fontSize: 9, padding: '1px 5px', borderRadius: 4,
                                                        background: `${tc}20`, color: tc, fontWeight: 800,
                                                    }}>{tl}</span>

                                                    {task.start_date && (
                                                        <span style={{ fontSize: 10, color: 'var(--t-text3)' }}>
                                                            ▶ {fmtShort(task.start_date)}
                                                        </span>
                                                    )}
                                                    {task.due_date && (
                                                        <span style={{
                                                            fontSize: 10, fontWeight: 700,
                                                            color: overdue ? '#ef4444' : workFinished ? '#10b981' : dl !== null && dl <= 3 ? '#f59e0b' : 'var(--t-text2)',
                                                        }}>
                                                            ⏰ {fmtShort(task.due_date)}
                                                            {dl !== null && (
                                                                <span style={{ marginLeft: 3, fontSize: 9, fontWeight: 600 }}>
                                                                    {overdue ? `(${Math.abs(dl)}d over)` : workFinished ? '(finished)' : dl <= 3 ? `(${dl}d left)` : ''}
                                                                </span>
                                                            )}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {isOpen && pTasks.length === 0 && (
                            <p style={{
                                margin: 0, padding: '8px 14px 10px',
                                fontSize: 11, color: 'var(--t-text3)', fontStyle: 'italic',
                            }}>
                                No tasks in this phase match the current filters.
                            </p>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

/* ─── GanttView ───────────────────────────────────────────────────────────── */
export default function GanttView({ onTaskClick }) {
    const {
        phases, tasksByPhase, filteredTasks,
        criticalPathIds, dateRange,
    } = useTimeline();

    const isMobile = useIsMobile();

    // ── All hooks must be called before any early return (Rules of Hooks) ──
    const COL_W   = 28;
    const ROW_H   = 44;
    const TASK_H  = 32;
    const LABEL_W = 200;

    // dateRange may be undefined on first render — guard here
    const minDate    = dateRange?.min ?? new Date();
    const maxDateRaw = dateRange?.max ?? new Date();
    const maxDate    = addDays(maxDateRaw, 7);
    const totalDays  = Math.max(daysBetween(minDate, maxDate), 30);
    const totalWidth = totalDays * COL_W;

    const today     = new Date();
    const todayLeft = clamp(daysBetween(minDate, today) * COL_W, 0, totalWidth);

    const rows = useMemo(() => {
        const result = [];
        for (const phase of phases) {
            result.push({ type: 'phase', data: phase });
            const phaseTasks = (tasksByPhase[phase.id] || [])
                .filter(t => filteredTasks.some(ft => ft.id === t.id));
            for (const task of phaseTasks) {
                result.push({ type: 'task', data: task });
            }
        }
        return result;
    }, [phases, tasksByPhase, filteredTasks]);

    /* ── mobile path ─────────────────────────────────────────────────────── */
    if (isMobile) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <MobileGanttView
                    phases={phases}
                    tasksByPhase={tasksByPhase}
                    filteredTasks={filteredTasks}
                    criticalPathIds={criticalPathIds}
                    onTaskClick={onTaskClick}
                />
            </div>
        );
    }

    /* ── desktop path ────────────────────────────────────────────────────── */

    function barProps(startDate, endDate, colW, totalDays) {
        if (!startDate) return null;
        const start = new Date(startDate);
        const end   = endDate ? new Date(endDate) : addDays(start, 7);
        const left  = clamp(daysBetween(minDate, start), 0, totalDays) * colW;
        const width = clamp(daysBetween(start, end), 1, totalDays) * colW;
        return { left, width };
    }

    return (
        <div style={{ display: 'flex', height: '100%', overflow: 'hidden', fontFamily: 'var(--f-sans)' }}>
            {/* Left labels */}
            <div style={{
                width: LABEL_W, flexShrink: 0,
                borderRight: '1px solid var(--t-border)',
                background: 'var(--t-surface)',
                overflowY: 'auto', overflowX: 'hidden',
            }}>
                <div style={{ height: 28, borderBottom: '1px solid var(--t-border)' }} />

                {rows.map((row, i) => {
                    const isPhase = row.type === 'phase';
                    const d = row.data;
                    return (
                        <div key={`${row.type}-${d.id}`}
                            style={{
                                height: isPhase ? ROW_H : TASK_H,
                                display: 'flex', alignItems: 'center',
                                paddingLeft: isPhase ? 12 : 24,
                                paddingRight: 8,
                                borderBottom: '1px solid var(--t-border)',
                                background: isPhase ? 'var(--t-surface2)' : 'var(--t-surface)',
                            }}
                        >
                            {isPhase ? (
                                <div style={{ minWidth: 0 }}>
                                    <p style={{
                                        fontSize: 11, fontWeight: 800,
                                        color: 'var(--t-text)', margin: 0,
                                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                    }}>
                                        {d.name}
                                    </p>
                                    <p style={{ fontSize: 9, color: 'var(--t-text3)', margin: 0 }}>
                                        {(tasksByPhase[d.id] || []).length} tasks
                                    </p>
                                </div>
                            ) : (
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: 5, minWidth: 0, width: '100%',
                                }}>
                                    <span style={{
                                        width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                                        background: PRIORITY_DOT[d.priority] || '#6b7280',
                                    }} />
                                    {criticalPathIds.includes(d.id) && (
                                        <span style={{
                                            fontSize: 8, padding: '1px 4px', borderRadius: 3,
                                            background: 'rgba(239,68,68,0.12)', color: '#ef4444',
                                            fontWeight: 800, flexShrink: 0,
                                        }}>CP</span>
                                    )}
                                    <p style={{
                                        fontSize: 10, fontWeight: 600,
                                        color: 'var(--t-text2)', margin: 0,
                                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                        cursor: 'pointer',
                                    }}
                                        onClick={() => onTaskClick?.(d)}
                                    >
                                        {d.title}
                                    </p>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Right chart panel */}
            <div style={{ flex: 1, overflowX: 'auto', overflowY: 'auto' }}>
                <div style={{ minWidth: totalWidth + 16, position: 'relative' }}>
                    <DateRuler minDate={minDate} totalDays={totalDays} colW={COL_W} />

                    {/* Today line */}
                    <div style={{
                        position: 'absolute', left: todayLeft + LABEL_W,
                        top: 0, width: 2, height: '100%',
                        background: '#f97316', opacity: 0.7, zIndex: 10,
                        pointerEvents: 'none',
                    }} />

                    {rows.map((row) => {
                        const isPhase = row.type === 'phase';
                        const d = row.data;
                        const bp = isPhase
                            ? barProps(d.start_date, d.end_date, COL_W, totalDays)
                            : barProps(d.start_date, d.due_date, COL_W, totalDays);
                        const isCritical = !isPhase && criticalPathIds.includes(d.id);
                        const color = STATUS_COLOR[d.status] || '#6b7280';

                        return (
                            <div key={`${row.type}-${d.id}`}
                                style={{
                                    height: isPhase ? ROW_H : TASK_H,
                                    position: 'relative',
                                    borderBottom: '1px solid var(--t-border)',
                                    background: isPhase ? 'rgba(255,255,255,0.02)' : 'transparent',
                                }}
                            >
                                {Array.from({ length: Math.ceil(totalDays / 7) }, (_, i) => (
                                    <div key={i} style={{
                                        position: 'absolute', left: i * 7 * COL_W, top: 0,
                                        width: 1, height: '100%',
                                        background: 'var(--t-border)', opacity: 0.3,
                                    }} />
                                ))}

                                {bp && (
                                    <GanttBar
                                        left={bp.left} width={bp.width}
                                        color={color}
                                        isCritical={isCritical}
                                        label={isPhase ? d.name : d.title}
                                        pct={isPhase ? 0 : (d.progress_percentage || 0)}
                                        isTask={!isPhase}
                                        onClick={() => !isPhase && onTaskClick?.(d)}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
