/**
 * CalendarView — month grid showing phases and tasks as event chips.
 */
import React, { useState, useMemo } from 'react';
import { useTimeline } from '../../context/TimelineContext';

const STATUS_COLOR = {
    COMPLETED:   '#10b981',
    IN_PROGRESS: '#3b82f6',
    HALTED:      '#ef4444',
    BLOCKED:     '#f59e0b',
    PENDING:     '#6b7280',
};

const DAYS_LABEL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function sameDay(a, b) {
    return a.getFullYear() === b.getFullYear() &&
           a.getMonth()    === b.getMonth()    &&
           a.getDate()     === b.getDate();
}

function dateInRange(date, start, end) {
    return start && end && date >= new Date(start) && date <= new Date(end);
}

export default function CalendarView({ onTaskClick }) {
    const { phases, filteredTasks, criticalPathIds } = useTimeline();
    const [current, setCurrent] = useState(() => {
        const d = new Date(); d.setDate(1); return d;
    });

    const year  = current.getFullYear();
    const month = current.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay  = new Date(year, month + 1, 0);

    // Grid cells: pad start / end
    const cells = useMemo(() => {
        const result = [];
        // leading blanks
        for (let i = 0; i < firstDay.getDay(); i++) result.push(null);
        // days of month
        for (let d = 1; d <= lastDay.getDate(); d++) {
            result.push(new Date(year, month, d));
        }
        // trailing blanks to complete last week
        while (result.length % 7 !== 0) result.push(null);
        return result;
    }, [year, month, firstDay, lastDay]);

    const today = new Date();

    function eventsOnDay(date) {
        if (!date) return [];
        const events = [];

        // Phases spanning this day
        for (const p of phases) {
            if (dateInRange(date, p.start_date, p.end_date)) {
                events.push({ type: 'phase', data: p, color: STATUS_COLOR[p.status] || '#6b7280' });
            }
        }
        // Tasks due or starting this day
        for (const t of filteredTasks) {
            const isStart = t.start_date && sameDay(date, new Date(t.start_date));
            const isDue   = t.due_date   && sameDay(date, new Date(t.due_date));
            if (isStart || isDue) {
                events.push({
                    type: 'task', data: t,
                    color: STATUS_COLOR[t.status] || '#6b7280',
                    isStart, isDue,
                    isCritical: criticalPathIds.includes(t.id),
                });
            }
        }
        return events;
    }

    const prevMonth = () => setCurrent(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrent(new Date(year, month + 1, 1));
    const goToday   = () => { const d = new Date(); d.setDate(1); setCurrent(d); };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* ── Month nav ─────────────────────────────────────────────── */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 16px', borderBottom: '1px solid var(--t-border)',
                background: 'var(--t-surface)',
            }}>
                <button onClick={prevMonth} style={{
                    padding: '4px 12px', borderRadius: 8, border: '1px solid var(--t-border)',
                    background: 'var(--t-surface2)', color: 'var(--t-text)', cursor: 'pointer', fontWeight: 700,
                }}>‹</button>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--t-text)' }}>
                        {current.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </h3>
                    <button onClick={goToday} style={{
                        padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                        border: '1px solid #f97316', color: '#f97316', background: 'transparent',
                        cursor: 'pointer',
                    }}>Today</button>
                </div>

                <button onClick={nextMonth} style={{
                    padding: '4px 12px', borderRadius: 8, border: '1px solid var(--t-border)',
                    background: 'var(--t-surface2)', color: 'var(--t-text)', cursor: 'pointer', fontWeight: 700,
                }}>›</button>
            </div>

            {/* ── Day headers ───────────────────────────────────────────── */}
            <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
                background: 'var(--t-surface2)', borderBottom: '1px solid var(--t-border)',
            }}>
                {DAYS_LABEL.map(d => (
                    <div key={d} style={{
                        padding: '6px 0', textAlign: 'center',
                        fontSize: 10, fontWeight: 800, letterSpacing: '0.08em',
                        color: 'var(--t-text3)', textTransform: 'uppercase',
                    }}>{d}</div>
                ))}
            </div>

            {/* ── Grid ─────────────────────────────────────────────────── */}
            <div style={{
                flex: 1, overflowY: 'auto',
                display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
                gridAutoRows: 'minmax(90px, auto)',
                gap: 0,
            }}>
                {cells.map((date, i) => {
                    const events   = eventsOnDay(date);
                    const isToday  = date && sameDay(date, today);
                    const isSunday = i % 7 === 0;

                    return (
                        <div key={i} style={{
                            border: '1px solid var(--t-border)',
                            background: date
                                ? (isToday ? 'rgba(249,115,22,0.05)' : 'var(--t-surface)')
                                : 'var(--t-surface2)',
                            padding: '4px 6px',
                            minHeight: 90,
                            opacity: date ? 1 : 0.4,
                        }}>
                            {/* Day number */}
                            {date && (
                                <div style={{
                                    display: 'flex', justifyContent: 'flex-end', marginBottom: 4,
                                }}>
                                    <span style={{
                                        fontSize: 12, fontWeight: isToday ? 900 : 600,
                                        width: 22, height: 22, borderRadius: '50%',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        background: isToday ? '#f97316' : 'transparent',
                                        color: isToday ? '#fff' : (isSunday ? '#ef4444' : 'var(--t-text)'),
                                    }}>
                                        {date.getDate()}
                                    </span>
                                </div>
                            )}

                            {/* Events */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {events.slice(0, 3).map((ev, j) => (
                                    <div key={j}
                                        onClick={() => ev.type === 'task' && onTaskClick?.(ev.data)}
                                        title={ev.type === 'task' ? ev.data.title : ev.data.name}
                                        style={{
                                            padding: '2px 5px', borderRadius: 4,
                                            background: `${ev.color}22`,
                                            borderLeft: `3px solid ${ev.color}`,
                                            border: ev.isCritical ? `1px solid ${ev.color}` : undefined,
                                            cursor: ev.type === 'task' ? 'pointer' : 'default',
                                            fontSize: 9, fontWeight: 700,
                                            color: ev.color,
                                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                        }}>
                                        {ev.type === 'phase' ? '📌 ' : (ev.isStart ? '▶ ' : '⏰ ')}
                                        {ev.type === 'task' ? ev.data.title : ev.data.name}
                                        {ev.isCritical && ' ⚡'}
                                    </div>
                                ))}
                                {events.length > 3 && (
                                    <div style={{ fontSize: 9, color: 'var(--t-text3)', fontWeight: 600 }}>
                                        +{events.length - 3} more
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ── Legend ───────────────────────────────────────────────── */}
            <div style={{
                padding: '8px 16px', borderTop: '1px solid var(--t-border)',
                background: 'var(--t-surface)',
                display: 'flex', gap: 16, flexWrap: 'wrap',
            }}>
                {Object.entries(STATUS_COLOR).map(([s, c]) => (
                    <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: c }} />
                        <span style={{ fontSize: 10, color: 'var(--t-text3)', fontWeight: 600 }}>
                            {s.replace('_', ' ')}
                        </span>
                    </div>
                ))}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: '#ef4444', boxShadow: '0 0 4px #ef4444' }} />
                    <span style={{ fontSize: 10, color: '#ef4444', fontWeight: 700 }}>CRITICAL PATH</span>
                </div>
            </div>
        </div>
    );
}
