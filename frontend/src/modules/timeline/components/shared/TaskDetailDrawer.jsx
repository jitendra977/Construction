/**
 * TaskDetailDrawer — slide-in panel with:
 *  • Progress slider
 *  • Update log
 *  • Dependency info
 *  • Quick status change
 */
import React, { useState, useEffect } from 'react';
import { useTimeline } from '../../context/TimelineContext';
import timelineApi from '../../services/timelineApi';

const STATUS_OPTS = [
    { value: 'PENDING',     label: 'Pending',     color: '#6b7280' },
    { value: 'IN_PROGRESS', label: 'In Progress', color: '#3b82f6' },
    { value: 'BLOCKED',     label: 'Blocked',     color: '#f59e0b' },
    { value: 'COMPLETED',   label: 'Done',        color: '#10b981' },
];

const PRIORITY_OPTS = [
    { value: 'LOW',      label: 'Low',      color: '#6b7280' },
    { value: 'MEDIUM',   label: 'Medium',   color: '#f59e0b' },
    { value: 'HIGH',     label: 'High',     color: '#f97316' },
    { value: 'CRITICAL', label: 'Critical', color: '#ef4444' },
];

function fmtDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtDateTime(d) {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-GB', {
        day: '2-digit', month: 'short', year: '2-digit',
        hour: '2-digit', minute: '2-digit',
    });
}

export default function TaskDetailDrawer({ task, onClose }) {
    const { phases, tasks, criticalPathIds, taskStats, updateTaskLocal } = useTimeline();

    const [updates,   setUpdates]   = useState([]);
    const [pct,       setPct]       = useState(task?.progress_percentage || 0);
    const [note,      setNote]      = useState('');
    const [posting,   setPosting]   = useState(false);
    const [saving,    setSaving]    = useState(false);
    const [status,    setStatus]    = useState(task?.status || 'PENDING');
    const [priority,  setPriority]  = useState(task?.priority || 'MEDIUM');

    useEffect(() => {
        if (!task) return;
        setPct(task.progress_percentage || 0);
        setStatus(task.status);
        setPriority(task.priority);
        // Load update log
        timelineApi.getTaskUpdates(task.id)
            .then(r => {
                const list = Array.isArray(r.data?.results) ? r.data.results : Array.isArray(r.data) ? r.data : [];
                setUpdates(list.sort((a, b) => new Date(b.date) - new Date(a.date)));
            })
            .catch(() => {});
    }, [task]);

    if (!task) return null;

    const isCritical = criticalPathIds.includes(task.id);
    const stats      = taskStats[task.id];
    const phase      = phases.find(p => p.id === task.phase);
    const blockedByTask = tasks.find(t => t.id === task.blocked_by);

    const daysLeft = task.due_date
        ? Math.round((new Date(task.due_date) - new Date()) / 86400000)
        : null;

    async function saveChanges() {
        setSaving(true);
        try {
            const res = await timelineApi.updateTask(task.id, { status, priority, progress_percentage: pct });
            updateTaskLocal(res.data);
        } catch (e) { console.error(e); }
        finally { setSaving(false); }
    }

    async function postUpdate() {
        if (!note.trim()) return;
        setPosting(true);
        try {
            const res = await timelineApi.addUpdate(task.id, note, pct);
            setUpdates(prev => [res.data, ...prev]);
            setNote('');
            updateTaskLocal({ ...task, progress_percentage: pct, status });
        } catch (e) { console.error(e); }
        finally { setPosting(false); }
    }

    return (
        <>
            {/* Backdrop */}
            <div onClick={onClose} style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 40,
            }} />

            {/* Drawer */}
            <div style={{
                position: 'fixed', right: 0, top: 0, bottom: 0,
                width: 400, background: 'var(--t-surface)', zIndex: 50,
                boxShadow: '-4px 0 24px rgba(0,0,0,0.3)',
                display: 'flex', flexDirection: 'column',
                overflowY: 'auto',
            }}>
                {/* Header */}
                <div style={{
                    padding: '16px 20px', borderBottom: '1px solid var(--t-border)',
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    background: 'var(--t-surface2)',
                }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        {isCritical && (
                            <div style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                padding: '2px 8px', borderRadius: 6, marginBottom: 6,
                                background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
                            }}>
                                <span style={{ color: '#ef4444', fontSize: 10, fontWeight: 900 }}>⚡ CRITICAL PATH</span>
                            </div>
                        )}
                        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--t-text)', lineHeight: 1.3 }}>
                            {task.title}
                        </h2>
                        <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--t-text3)' }}>
                            {phase?.name || 'Unknown Phase'}
                        </p>
                    </div>
                    <button onClick={onClose} style={{
                        padding: '4px 10px', borderRadius: 8, fontSize: 16,
                        border: '1px solid var(--t-border)', background: 'transparent',
                        color: 'var(--t-text)', cursor: 'pointer', flexShrink: 0,
                    }}>×</button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
                    {/* ── Date info ──────────────────────────────────────── */}
                    <div style={{
                        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16,
                    }}>
                        {[
                            ['📅 Start', fmtDate(task.start_date)],
                            ['🏁 Due', fmtDate(task.due_date)],
                        ].map(([label, val]) => (
                            <div key={label} style={{
                                padding: '8px 12px', borderRadius: 8,
                                background: 'var(--t-surface2)', border: '1px solid var(--t-border)',
                            }}>
                                <p style={{ margin: 0, fontSize: 9, color: 'var(--t-text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</p>
                                <p style={{ margin: '2px 0 0', fontSize: 12, fontWeight: 700, color: 'var(--t-text)' }}>{val}</p>
                            </div>
                        ))}
                        {daysLeft !== null && (
                            <div style={{
                                padding: '8px 12px', borderRadius: 8, gridColumn: '1/-1',
                                background: daysLeft < 0 ? 'rgba(239,68,68,0.08)' : daysLeft <= 3 ? 'rgba(245,158,11,0.08)' : 'var(--t-surface2)',
                                border: `1px solid ${daysLeft < 0 ? '#ef4444' : daysLeft <= 3 ? '#f59e0b' : 'var(--t-border)'}`,
                            }}>
                                <p style={{
                                    margin: 0, fontSize: 12, fontWeight: 800,
                                    color: daysLeft < 0 ? '#ef4444' : daysLeft <= 3 ? '#f59e0b' : '#10b981',
                                }}>
                                    {daysLeft < 0
                                        ? `⚠ ${Math.abs(daysLeft)} days overdue`
                                        : daysLeft === 0
                                        ? '⏰ Due today!'
                                        : `✓ ${daysLeft} days remaining`}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* ── Cost ───────────────────────────────────────────── */}
                    {task.estimated_cost > 0 && (
                        <div style={{
                            marginBottom: 16, padding: '8px 12px', borderRadius: 8,
                            background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)',
                        }}>
                            <p style={{ margin: 0, fontSize: 10, color: '#3b82f6', fontWeight: 700 }}>
                                💰 Estimated Cost
                            </p>
                            <p style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 900, color: 'var(--t-text)' }}>
                                NPR {Number(task.estimated_cost).toLocaleString()}
                            </p>
                        </div>
                    )}

                    {/* ── Dependency info ─────────────────────────────────── */}
                    {blockedByTask && (
                        <div style={{
                            marginBottom: 16, padding: '10px 12px', borderRadius: 8,
                            background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.3)',
                        }}>
                            <p style={{ margin: '0 0 4px', fontSize: 10, color: '#f59e0b', fontWeight: 800 }}>
                                🔗 DEPENDS ON
                            </p>
                            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: 'var(--t-text)' }}>
                                {blockedByTask.title}
                            </p>
                            <p style={{ margin: '2px 0 0', fontSize: 10, color: 'var(--t-text3)' }}>
                                Status: <span style={{
                                    fontWeight: 700,
                                    color: blockedByTask.status === 'COMPLETED' ? '#10b981' : '#f59e0b',
                                }}>
                                    {blockedByTask.status}
                                </span>
                            </p>
                        </div>
                    )}

                    {/* ── Critical path stats ─────────────────────────────── */}
                    {isCritical && stats && (
                        <div style={{
                            marginBottom: 16, padding: '10px 12px', borderRadius: 8,
                            background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.3)',
                        }}>
                            <p style={{ margin: '0 0 6px', fontSize: 10, color: '#ef4444', fontWeight: 800 }}>
                                ⚡ CRITICAL PATH STATS
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                                {[
                                    ['Duration', `${stats.duration}d`],
                                    ['Float', `${stats.float}d`],
                                    ['ES', `Day ${stats.earliest_start}`],
                                    ['EF', `Day ${stats.earliest_finish}`],
                                ].map(([k, v]) => (
                                    <div key={k}>
                                        <span style={{ fontSize: 9, color: 'var(--t-text3)', display: 'block' }}>{k}</span>
                                        <span style={{ fontSize: 12, fontWeight: 800, color: '#ef4444' }}>{v}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Status & Priority ───────────────────────────────── */}
                    <div style={{ marginBottom: 16 }}>
                        <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: 'var(--t-text2)' }}>Status</p>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {STATUS_OPTS.map(o => (
                                <button key={o.value} onClick={() => setStatus(o.value)} style={{
                                    padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                                    cursor: 'pointer', transition: 'all 0.15s',
                                    background: status === o.value ? o.color : 'var(--t-surface2)',
                                    color: status === o.value ? '#fff' : o.color,
                                    border: `1px solid ${o.color}`,
                                }}>
                                    {o.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div style={{ marginBottom: 16 }}>
                        <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: 'var(--t-text2)' }}>Priority</p>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {PRIORITY_OPTS.map(o => (
                                <button key={o.value} onClick={() => setPriority(o.value)} style={{
                                    padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                                    cursor: 'pointer', transition: 'all 0.15s',
                                    background: priority === o.value ? o.color : 'var(--t-surface2)',
                                    color: priority === o.value ? '#fff' : o.color,
                                    border: `1px solid ${o.color}`,
                                }}>
                                    {o.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ── Progress slider ─────────────────────────────────── */}
                    <div style={{ marginBottom: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: 'var(--t-text2)' }}>Progress</p>
                            <span style={{ fontSize: 14, fontWeight: 900, color: pct === 100 ? '#10b981' : '#3b82f6' }}>
                                {pct}%
                            </span>
                        </div>
                        <input type="range" min="0" max="100" value={pct}
                            onChange={e => setPct(Number(e.target.value))}
                            style={{ width: '100%', accentColor: pct === 100 ? '#10b981' : '#3b82f6' }}
                        />
                        <div style={{ height: 6, borderRadius: 3, background: 'var(--t-border)', overflow: 'hidden' }}>
                            <div style={{
                                height: '100%', width: `${pct}%`,
                                background: pct === 100 ? '#10b981' : '#3b82f6',
                                transition: 'width 0.2s',
                            }} />
                        </div>
                    </div>

                    {/* Save button */}
                    <button onClick={saveChanges} disabled={saving} style={{
                        width: '100%', padding: '10px', borderRadius: 10, marginBottom: 20,
                        background: '#f97316', color: '#fff', border: 'none',
                        fontWeight: 800, fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer',
                        opacity: saving ? 0.7 : 1,
                    }}>
                        {saving ? 'Saving…' : '💾 Save Changes'}
                    </button>

                    {/* ── Add update ──────────────────────────────────────── */}
                    <div style={{
                        marginBottom: 20, padding: '12px 14px', borderRadius: 10,
                        background: 'var(--t-surface2)', border: '1px solid var(--t-border)',
                    }}>
                        <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: 'var(--t-text2)' }}>
                            📝 Add Progress Note
                        </p>
                        <textarea
                            value={note}
                            onChange={e => setNote(e.target.value)}
                            placeholder="What was done today? Any blockers?"
                            rows={3}
                            style={{
                                width: '100%', padding: '8px', borderRadius: 8,
                                border: '1px solid var(--t-border)', resize: 'vertical',
                                background: 'var(--t-surface)', color: 'var(--t-text)',
                                fontSize: 12, fontFamily: 'inherit', boxSizing: 'border-box',
                            }}
                        />
                        <button onClick={postUpdate} disabled={posting || !note.trim()} style={{
                            marginTop: 8, padding: '7px 16px', borderRadius: 8,
                            background: '#3b82f6', color: '#fff', border: 'none',
                            fontWeight: 700, fontSize: 12, cursor: posting ? 'not-allowed' : 'pointer',
                            opacity: posting || !note.trim() ? 0.6 : 1,
                        }}>
                            {posting ? 'Posting…' : '+ Post Update'}
                        </button>
                    </div>

                    {/* ── Update log ──────────────────────────────────────── */}
                    <div>
                        <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: 'var(--t-text2)' }}>
                            📋 Update Log ({updates.length})
                        </p>
                        {updates.length === 0 && (
                            <p style={{ fontSize: 11, color: 'var(--t-text3)', textAlign: 'center', padding: '12px 0' }}>
                                No updates yet.
                            </p>
                        )}
                        {updates.map(u => (
                            <div key={u.id} style={{
                                marginBottom: 10, padding: '10px 12px', borderRadius: 8,
                                background: 'var(--t-surface2)', border: '1px solid var(--t-border)',
                                borderLeft: '3px solid #3b82f6',
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                    <span style={{ fontSize: 9, color: 'var(--t-text3)' }}>
                                        {fmtDateTime(u.date)}
                                    </span>
                                    <span style={{
                                        fontSize: 10, fontWeight: 800,
                                        color: u.progress_percentage === 100 ? '#10b981' : '#3b82f6',
                                    }}>
                                        {u.progress_percentage}%
                                    </span>
                                </div>
                                <p style={{ margin: 0, fontSize: 12, color: 'var(--t-text)', lineHeight: 1.4 }}>
                                    {u.note}
                                </p>
                            </div>
                        ))}
                    </div>

                    {/* Description */}
                    {task.description && (
                        <div style={{
                            marginTop: 16, padding: '10px 12px', borderRadius: 8,
                            background: 'var(--t-surface2)', border: '1px solid var(--t-border)',
                        }}>
                            <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 700, color: 'var(--t-text3)', textTransform: 'uppercase' }}>Description</p>
                            <p style={{ margin: 0, fontSize: 12, color: 'var(--t-text)', lineHeight: 1.5 }}>{task.description}</p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
