/**
 * GanttView — horizontal bar chart with date ruler, dependency arrows,
 * critical-path highlighting and today indicator.
 */
import React, { useRef, useState, useMemo } from 'react';
import { useTimeline } from '../../context/TimelineContext';

/* ─── helpers ─────────────────────────────────────────────────────────────── */
const DAY = 86400000;

const STATUS_COLOR = {
    COMPLETED:   '#10b981',
    IN_PROGRESS: '#3b82f6',
    HALTED:      '#ef4444',
    BLOCKED:     '#f59e0b',
    PENDING:     '#6b7280',
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
            {/* Week grid lines */}
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
        {/* Progress fill */}
        {pct > 0 && (
            <div style={{
                position: 'absolute', left: 0, top: 0,
                height: '100%', width: `${pct}%`,
                background: 'rgba(255,255,255,0.25)',
                pointerEvents: 'none',
            }} />
        )}
        {/* Label */}
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

/* ─── GanttView ───────────────────────────────────────────────────────────── */
export default function GanttView({ onTaskClick }) {
    const {
        phases, tasksByPhase, filteredTasks,
        criticalPathIds, dateRange,
    } = useTimeline();

    const COL_W  = 28;   // pixels per day
    const ROW_H  = 44;   // height of a phase row
    const TASK_H = 32;
    const LABEL_W = 200;

    const { min: minDate, max: maxDateRaw } = dateRange;
    const maxDate    = addDays(maxDateRaw, 7);   // small right padding
    const totalDays  = Math.max(daysBetween(minDate, maxDate), 30);
    const totalWidth = totalDays * COL_W;

    const today      = new Date();
    const todayLeft  = clamp(daysBetween(minDate, today) * COL_W, 0, totalWidth);

    // Build rows: phase + its tasks
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
            {/* ── Left labels panel ─────────────────────────────────────── */}
            <div style={{
                width: LABEL_W, flexShrink: 0,
                borderRight: '1px solid var(--t-border)',
                background: 'var(--t-surface)',
                overflowY: 'auto', overflowX: 'hidden',
            }}>
                {/* Header spacer */}
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
                                    {/* Priority dot */}
                                    <span style={{
                                        width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                                        background: PRIORITY_DOT[d.priority] || '#6b7280',
                                    }} />
                                    {/* Critical path badge */}
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

            {/* ── Right chart panel ─────────────────────────────────────── */}
            <div style={{ flex: 1, overflowX: 'auto', overflowY: 'auto' }}>
                <div style={{ minWidth: totalWidth + 16, position: 'relative' }}>
                    {/* Date ruler */}
                    <DateRuler minDate={minDate} totalDays={totalDays} colW={COL_W} />

                    {/* Today line */}
                    <div style={{
                        position: 'absolute', left: todayLeft + LABEL_W,
                        top: 0, width: 2, height: '100%',
                        background: '#f97316', opacity: 0.7, zIndex: 10,
                        pointerEvents: 'none',
                    }} />

                    {/* Rows */}
                    {rows.map((row) => {
                        const isPhase = row.type === 'phase';
                        const d = row.data;
                        const bp = isPhase
                            ? barProps(d.start_date, d.end_date, COL_W, totalDays)
                            : barProps(d.start_date, d.due_date, COL_W, totalDays);
                        const isCritical = !isPhase && criticalPathIds.includes(d.id);
                        const color = isPhase
                            ? (STATUS_COLOR[d.status] || '#6b7280')
                            : (STATUS_COLOR[d.status] || '#6b7280');

                        return (
                            <div key={`${row.type}-${d.id}`}
                                style={{
                                    height: isPhase ? ROW_H : TASK_H,
                                    position: 'relative',
                                    borderBottom: '1px solid var(--t-border)',
                                    background: isPhase ? 'rgba(255,255,255,0.02)' : 'transparent',
                                }}
                            >
                                {/* Week grid */}
                                {Array.from({ length: Math.ceil(totalDays / 7) }, (_, i) => (
                                    <div key={i} style={{
                                        position: 'absolute', left: i * 7 * COL_W, top: 0,
                                        width: 1, height: '100%',
                                        background: 'var(--t-border)', opacity: 0.3,
                                    }} />
                                ))}

                                {/* Bar */}
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
