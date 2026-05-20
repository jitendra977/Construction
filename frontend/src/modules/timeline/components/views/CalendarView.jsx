/**
 * CalendarView — month grid with event chips (desktop) /
 *                agenda list of days with events (mobile).
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

/* ── constants ──────────────────────────────────────────────────────────────── */
const STATUS_COLOR = {
    COMPLETED:   '#10b981',
    IN_PROGRESS: '#3b82f6',
    HALTED:      '#ef4444',
    BLOCKED:     '#f59e0b',
    PENDING:     '#6b7280',
};

const DAYS_LABEL     = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_LABEL_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/* ── helpers ─────────────────────────────────────────────────────────────── */
function sameDay(a, b) {
    return a.getFullYear() === b.getFullYear() &&
           a.getMonth()    === b.getMonth()    &&
           a.getDate()     === b.getDate();
}

function dateInRange(date, start, end) {
    return start && end && date >= new Date(start) && date <= new Date(end);
}

/* ── mobile agenda view ─────────────────────────────────────────────────── */
function MobileCalendarView({ phases, filteredTasks, criticalPathIds, current, setCurrent, onTaskClick }) {
    const year  = current.getFullYear();
    const month = current.getMonth();
    const today = new Date();

    const prevMonth = () => setCurrent(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrent(new Date(year, month + 1, 1));
    const goToday   = () => { const d = new Date(); d.setDate(1); setCurrent(d); };

    // Build all days with events for this month
    const agendaDays = useMemo(() => {
        const lastDay = new Date(year, month + 1, 0);
        const days = [];
        for (let d = 1; d <= lastDay.getDate(); d++) {
            const date   = new Date(year, month, d);
            const events = [];

            for (const p of phases) {
                if (dateInRange(date, p.start_date, p.end_date)) {
                    events.push({ type: 'phase', data: p, color: STATUS_COLOR[p.status] || '#6b7280' });
                }
            }
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
            if (events.length > 0) {
                days.push({ date, events });
            }
        }
        return days;
    }, [year, month, phases, filteredTasks, criticalPathIds]);

    const monthName = current.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Month nav */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 12px', borderBottom: '1px solid var(--t-border)',
                background: 'var(--t-surface)', flexShrink: 0,
            }}>
                <button onClick={prevMonth} style={{
                    width: 34, height: 34, borderRadius: 8,
                    border: '1px solid var(--t-border)',
                    background: 'var(--t-surface2)', color: 'var(--t-text)',
                    cursor: 'pointer', fontSize: 16, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>‹</button>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--t-text)' }}>
                        {monthName}
                    </h3>
                    <button onClick={goToday} style={{
                        padding: '3px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                        border: '1px solid #f97316', color: '#f97316', background: 'transparent',
                        cursor: 'pointer',
                    }}>Today</button>
                </div>

                <button onClick={nextMonth} style={{
                    width: 34, height: 34, borderRadius: 8,
                    border: '1px solid var(--t-border)',
                    background: 'var(--t-surface2)', color: 'var(--t-text)',
                    cursor: 'pointer', fontSize: 16, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>›</button>
            </div>

            {/* Agenda body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px 80px' }}>
                {agendaDays.length === 0 ? (
                    <div style={{
                        padding: 40, textAlign: 'center',
                        color: 'var(--t-text3)', fontSize: 13,
                    }}>
                        <p style={{ fontSize: 32, marginBottom: 8 }}>📅</p>
                        No events in {monthName}
                    </div>
                ) : agendaDays.map(({ date, events }) => {
                    const isToday = sameDay(date, today);
                    const dayLabel = date.toLocaleDateString('en-US', { weekday: 'short' });
                    const dateNum  = date.getDate();
                    const isSunday = date.getDay() === 0;

                    return (
                        <div key={date.toISOString()} style={{ marginBottom: 12 }}>
                            {/* Day header */}
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                marginBottom: 6,
                            }}>
                                <div style={{
                                    width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                                    display: 'flex', flexDirection: 'column',
                                    alignItems: 'center', justifyContent: 'center',
                                    background: isToday ? '#f97316' : 'var(--t-surface2)',
                                    border: isToday ? 'none' : '1px solid var(--t-border)',
                                }}>
                                    <span style={{
                                        fontSize: 7, fontWeight: 800, lineHeight: 1,
                                        color: isToday ? '#fff' : (isSunday ? '#ef4444' : 'var(--t-text3)'),
                                        textTransform: 'uppercase', letterSpacing: '0.05em',
                                    }}>
                                        {dayLabel}
                                    </span>
                                    <span style={{
                                        fontSize: 15, fontWeight: 900, lineHeight: 1.2,
                                        color: isToday ? '#fff' : (isSunday ? '#ef4444' : 'var(--t-text)'),
                                    }}>
                                        {dateNum}
                                    </span>
                                </div>

                                <div style={{
                                    flex: 1, height: 1, background: 'var(--t-border)',
                                }} />

                                <span style={{ fontSize: 10, color: 'var(--t-text3)', fontWeight: 600, flexShrink: 0 }}>
                                    {events.length} event{events.length !== 1 ? 's' : ''}
                                </span>
                            </div>

                            {/* Events */}
                            <div style={{ paddingLeft: 46, display: 'flex', flexDirection: 'column', gap: 5 }}>
                                {events.map((ev, j) => (
                                    <div
                                        key={j}
                                        onClick={() => ev.type === 'task' && onTaskClick?.(ev.data)}
                                        style={{
                                            padding: '8px 10px',
                                            borderRadius: 8,
                                            background: `${ev.color}12`,
                                            borderLeft: `3px solid ${ev.color}`,
                                            cursor: ev.type === 'task' ? 'pointer' : 'default',
                                            display: 'flex', alignItems: 'center', gap: 7,
                                        }}
                                    >
                                        <span style={{ fontSize: 12, flexShrink: 0 }}>
                                            {ev.type === 'phase' ? '📌' : (ev.isStart ? '▶' : '⏰')}
                                        </span>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <p style={{
                                                margin: 0, fontSize: 12, fontWeight: 700,
                                                color: 'var(--t-text)', wordBreak: 'break-word',
                                                lineHeight: 1.3,
                                            }}>
                                                {ev.type === 'task' ? ev.data.title : ev.data.name}
                                                {ev.isCritical && (
                                                    <span style={{
                                                        marginLeft: 5, fontSize: 8, padding: '1px 4px',
                                                        borderRadius: 3, background: 'rgba(239,68,68,0.15)',
                                                        color: '#ef4444', fontWeight: 900,
                                                    }}>⚡CP</span>
                                                )}
                                            </p>
                                            <p style={{ margin: '2px 0 0', fontSize: 10, color: 'var(--t-text3)' }}>
                                                {ev.type === 'phase' ? 'Phase' : (ev.isStart ? 'Starts' : 'Due')}
                                                {' · '}
                                                <span style={{ color: ev.color, fontWeight: 700 }}>
                                                    {(ev.data.status || '').replace('_', ' ')}
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Legend */}
            <div style={{
                padding: '6px 12px 8px', borderTop: '1px solid var(--t-border)',
                background: 'var(--t-surface)', flexShrink: 0,
                display: 'flex', gap: 10, flexWrap: 'wrap', overflowX: 'auto',
            }}>
                {Object.entries(STATUS_COLOR).map(([s, c]) => (
                    <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                        <div style={{ width: 7, height: 7, borderRadius: 2, background: c }} />
                        <span style={{ fontSize: 9, color: 'var(--t-text3)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                            {s.replace('_', ' ')}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ── main component ─────────────────────────────────────────────────────── */
export default function CalendarView({ onTaskClick }) {
    const { phases, filteredTasks, criticalPathIds } = useTimeline();
    const isMobile = useIsMobile();

    const [current, setCurrent] = useState(() => {
        const d = new Date(); d.setDate(1); return d;
    });

    const year  = current.getFullYear();
    const month = current.getMonth();

    /* ── mobile path ─────────────────────────────────────────────────────── */
    if (isMobile) {
        return (
            <MobileCalendarView
                phases={phases}
                filteredTasks={filteredTasks}
                criticalPathIds={criticalPathIds}
                current={current}
                setCurrent={setCurrent}
                onTaskClick={onTaskClick}
            />
        );
    }

    /* ── desktop path (unchanged) ────────────────────────────────────────── */
    const firstDay = new Date(year, month, 1);
    const lastDay  = new Date(year, month + 1, 0);

    const cells = useMemo(() => {
        const result = [];
        for (let i = 0; i < firstDay.getDay(); i++) result.push(null);
        for (let d = 1; d <= lastDay.getDate(); d++) result.push(new Date(year, month, d));
        while (result.length % 7 !== 0) result.push(null);
        return result;
    }, [year, month, firstDay, lastDay]);

    const today = new Date();

    function eventsOnDay(date) {
        if (!date) return [];
        const events = [];
        for (const p of phases) {
            if (dateInRange(date, p.start_date, p.end_date)) {
                events.push({ type: 'phase', data: p, color: STATUS_COLOR[p.status] || '#6b7280' });
            }
        }
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
            {/* Month nav */}
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

            {/* Day headers */}
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

            {/* Grid */}
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
                            {date && (
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
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

            {/* Legend */}
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
