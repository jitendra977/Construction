/**
 * WorkerTasksPage.jsx  — Advanced Dark + Colorful Edition
 * ────────────────────────────────────────────────────────
 * Shows ALL project tasks (not just assigned to worker) in a separate "Project Tasks"
 * section, plus the worker's own assigned tasks. Dark theme matching WorkerPortal.jsx.
 *
 * Sections:
 *  • My Tasks  — tasks assigned to this worker (filterable by status/phase)
 *  • Project Tasks — ALL tasks in the project, grouped by phase (read-only view)
 *
 * Features:
 *  • Tab switching: My Tasks / Project Tasks
 *  • Status filter chips (colored)
 *  • Priority badges with gradient backgrounds
 *  • Phase grouping with collapse toggle
 *  • Progress bar per task (completion percentage)
 *  • Quick status update dark sheet modal
 *  • Blocker note with red glow
 *  • Animated transitions
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import workerPortalApi from '../../../services/workerPortalApi';

// ─── Design tokens ─────────────────────────────────────────────────────────────
const C = {
    bg:      '#020617',
    surface: '#0f172a',
    card:    '#0d1826',
    border:  '#1e293b',
    text:    '#f1f5f9',
    muted:   '#64748b',
    dim:     '#94a3b8',
    blue:    '#38bdf8',
    blueD:   '#0369a1',
    green:   '#4ade80',
    greenD:  '#15803d',
    amber:   '#fbbf24',
    amberD:  '#b45309',
    red:     '#f87171',
    redD:    '#b91c1c',
    purple:  '#a78bfa',
    purpleD: '#6d28d9',
    cyan:    '#22d3ee',
};

// ─── CSS injected once ─────────────────────────────────────────────────────────
const STYLES = `
@keyframes wtFadeIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
@keyframes wtSlideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
@keyframes wtPulseRed { 0%,100%{box-shadow:0 0 0 0 rgba(248,113,113,.5)} 50%{box-shadow:0 0 0 6px rgba(248,113,113,0)} }
@keyframes wtPulseAmber { 0%,100%{box-shadow:0 0 0 0 rgba(251,191,36,.4)} 50%{box-shadow:0 0 0 5px rgba(251,191,36,0)} }
@keyframes wtSpin { to{transform:rotate(360deg)} }
@keyframes wtProgress { from{width:0} to{width:var(--pct)} }
.wt-card { animation: wtFadeIn .25s ease both; }
.wt-card:hover { transform:translateY(-1px); transition:transform .15s; }
.wt-sheet { animation: wtSlideUp .3s cubic-bezier(.16,1,.3,1) both; }
.wt-chip { transition: all .15s; }
.wt-chip:hover { opacity:.85; }
.wt-spinner { width:28px;height:28px;border:3px solid #1e293b;border-top-color:#38bdf8;border-radius:50%;animation:wtSpin .8s linear infinite;margin:0 auto; }
`;

function injectStyles() {
    if (document.getElementById('worker-tasks-styles')) return;
    const s = document.createElement('style');
    s.id = 'worker-tasks-styles';
    s.textContent = STYLES;
    document.head.appendChild(s);
}

// ─── Status metadata ───────────────────────────────────────────────────────────
const STATUS_META = {
    PENDING:     { label: 'Pending',     color: C.muted,  glow: 'none',          icon: '⏳', gradient: 'linear-gradient(135deg,#334155,#1e293b)' },
    IN_PROGRESS: { label: 'In Progress', color: C.amber,  glow: '0 0 12px rgba(251,191,36,.35)', icon: '🔨', gradient: 'linear-gradient(135deg,#451a03,#78350f)' },
    COMPLETED:   { label: 'Completed',   color: C.green,  glow: '0 0 12px rgba(74,222,128,.3)',  icon: '✅', gradient: 'linear-gradient(135deg,#052e16,#14532d)' },
    BLOCKED:     { label: 'Blocked',     color: C.red,    glow: '0 0 14px rgba(248,113,113,.4)', icon: '🚫', gradient: 'linear-gradient(135deg,#450a0a,#7f1d1d)' },
};

const PRIORITY_META = {
    LOW:      { label: 'Low',      color: C.muted,  bg: 'rgba(100,116,139,.15)' },
    MEDIUM:   { label: 'Medium',   color: C.amber,  bg: 'rgba(251,191,36,.15)'  },
    HIGH:     { label: 'High',     color: C.red,    bg: 'rgba(248,113,113,.15)' },
    CRITICAL: { label: 'Critical', color: C.purple, bg: 'rgba(167,139,250,.15)', pulse: true },
};

// ─── Small components ──────────────────────────────────────────────────────────

function StatusChip({ status, small }) {
    const m = STATUS_META[status] || STATUS_META.PENDING;
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: small ? '2px 8px' : '3px 10px',
            borderRadius: 20, fontSize: small ? 10 : 11, fontWeight: 700,
            color: m.color, background: m.gradient,
            border: `1px solid ${m.color}30`,
            boxShadow: m.glow,
        }}>
            {m.icon} {m.label}
        </span>
    );
}

function PriorityBadge({ priority }) {
    const m = PRIORITY_META[priority] || PRIORITY_META.MEDIUM;
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700,
            color: m.color, background: m.bg,
            animation: m.pulse ? 'wtPulseAmber 1.8s infinite' : 'none',
        }}>
            {priority === 'CRITICAL' ? '🔥' : priority === 'HIGH' ? '▲' : priority === 'LOW' ? '▼' : '●'} {m.label}
        </span>
    );
}

function ProgressBar({ pct = 0, color = C.blue }) {
    return (
        <div style={{ background: C.border, borderRadius: 4, height: 4, overflow: 'hidden', marginTop: 8 }}>
            <div style={{
                height: '100%', borderRadius: 4,
                width: `${Math.min(100, Math.max(0, pct))}%`,
                background: pct >= 100 ? C.green : pct > 50 ? color : pct > 20 ? C.amber : C.red,
                transition: 'width .6s ease',
                boxShadow: `0 0 6px ${pct >= 100 ? C.green : color}60`,
            }} />
        </div>
    );
}

// ─── Update modal (dark sheet) ─────────────────────────────────────────────────

function UpdateModal({ task, onClose, onSaved }) {
    const [newStatus, setNewStatus] = useState(
        task.status === 'PENDING' ? 'IN_PROGRESS' : task.status
    );
    const [blockerReason, setBlocker] = useState(task.blocker_reason || '');
    const [progressNote, setNote]    = useState('');
    const [saving, setSaving]         = useState(false);
    const [error, setError]           = useState('');

    const ALLOWED = ['IN_PROGRESS', 'COMPLETED', 'BLOCKED'];

    const submit = async () => {
        if (newStatus === 'BLOCKED' && !blockerReason.trim()) {
            setError('Please describe what is blocking you.');
            return;
        }
        setSaving(true); setError('');
        try {
            const updated = await workerPortalApi.updateTask(task.id, {
                status: newStatus,
                blocker_reason: blockerReason,
                progress_note: progressNote,
            });
            onSaved(updated);
        } catch (e) {
            setError(e.response?.data?.error || 'Failed to update. Try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 1100,
            background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'flex-end',
        }} onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="wt-sheet" style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: '24px 24px 0 0',
                width: '100%', padding: '24px 20px 48px',
                maxHeight: '90vh', overflowY: 'auto',
            }}>
                {/* Handle */}
                <div style={{ width: 40, height: 4, borderRadius: 2, background: C.border, margin: '0 auto 20px' }} />

                <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>
                    Update Task
                </p>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: C.text, margin: '0 0 4px' }}>{task.title}</h3>
                <p style={{ fontSize: 12, color: C.muted, margin: '0 0 20px' }}>{task.phase_name}</p>

                {/* Status buttons */}
                <p style={{ fontSize: 11, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>New Status</p>
                <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                    {ALLOWED.map(s => {
                        const m = STATUS_META[s];
                        const active = newStatus === s;
                        return (
                            <button key={s} className="wt-chip" onClick={() => { setNewStatus(s); setError(''); }}
                                style={{
                                    padding: '9px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                                    border: `1.5px solid ${active ? m.color : C.border}`,
                                    background: active ? m.gradient : 'transparent',
                                    color: active ? m.color : C.muted,
                                    cursor: 'pointer',
                                    boxShadow: active ? m.glow : 'none',
                                }}>
                                {m.icon} {m.label}
                            </button>
                        );
                    })}
                </div>

                {/* Blocker reason */}
                {newStatus === 'BLOCKED' && (
                    <div style={{ marginBottom: 14 }}>
                        <label style={{ fontSize: 12, fontWeight: 700, color: C.red, display: 'block', marginBottom: 6 }}>
                            🚫 What is blocking you? *
                        </label>
                        <textarea
                            value={blockerReason} onChange={e => setBlocker(e.target.value)}
                            placeholder="Missing materials, waiting for inspection, safety issue…"
                            rows={3}
                            style={{
                                width: '100%', padding: '11px 13px', borderRadius: 10,
                                border: `1.5px solid ${C.red}60`, fontSize: 13, resize: 'none',
                                boxSizing: 'border-box', background: 'rgba(248,113,113,.05)',
                                color: C.text, outline: 'none',
                                boxShadow: '0 0 10px rgba(248,113,113,.15)',
                            }} />
                    </div>
                )}

                {/* Progress note */}
                <div style={{ marginBottom: 20 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: C.dim, display: 'block', marginBottom: 6 }}>
                        Progress note (optional)
                    </label>
                    <textarea
                        value={progressNote} onChange={e => setNote(e.target.value)}
                        placeholder="What did you complete today? Any observations?"
                        rows={3}
                        style={{
                            width: '100%', padding: '11px 13px', borderRadius: 10,
                            border: `1.5px solid ${C.border}`, fontSize: 13, resize: 'none',
                            boxSizing: 'border-box', background: 'rgba(255,255,255,.03)',
                            color: C.text, outline: 'none',
                        }} />
                </div>

                {error && (
                    <p style={{ color: C.red, fontSize: 12, fontWeight: 600, marginBottom: 12, padding: '8px 12px', background: 'rgba(248,113,113,.1)', borderRadius: 8, border: `1px solid ${C.red}40` }}>
                        ⚠️ {error}
                    </p>
                )}

                <button onClick={submit} disabled={saving || newStatus === task.status}
                    style={{
                        width: '100%', padding: '14px', borderRadius: 14, border: 'none',
                        background: newStatus === task.status
                            ? C.border
                            : `linear-gradient(135deg, ${STATUS_META[newStatus]?.color || C.blue}, ${C.blue})`,
                        color: newStatus === task.status ? C.muted : '#000',
                        fontSize: 14, fontWeight: 800,
                        cursor: newStatus === task.status ? 'default' : 'pointer',
                        boxShadow: newStatus !== task.status ? `0 4px 20px ${STATUS_META[newStatus]?.color || C.blue}50` : 'none',
                    }}>
                    {saving ? '⏳ Saving…' : '✓ Save Update'}
                </button>
            </div>
        </div>
    );
}

// ─── Task card (dark) ──────────────────────────────────────────────────────────

function TaskCard({ task, onUpdate, readOnly = false }) {
    const [expanded, setExpanded] = useState(false);
    const [showModal, setShowModal] = useState(false);

    const handleSaved = (updated) => { onUpdate(updated); setShowModal(false); };

    const dueDate = task.due_date
        ? new Date(task.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
        : null;
    const overdue = task.due_date && task.status !== 'COMPLETED' && new Date(task.due_date) < new Date();
    const pct = task.completion_percentage ?? (task.status === 'COMPLETED' ? 100 : task.status === 'IN_PROGRESS' ? 50 : 0);
    const sm = STATUS_META[task.status] || STATUS_META.PENDING;

    return (
        <>
            <div className="wt-card" style={{
                background: C.card,
                borderRadius: 16, marginBottom: 10,
                border: `1px solid ${task.status === 'BLOCKED' ? `${C.red}40` : task.status === 'COMPLETED' ? `${C.green}30` : C.border}`,
                overflow: 'hidden',
                boxShadow: task.status === 'BLOCKED' ? `0 0 16px rgba(248,113,113,.12)` : 'none',
            }}>
                {/* Left accent bar */}
                <div style={{
                    position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
                    background: sm.color, borderRadius: '16px 0 0 16px',
                    display: 'none',
                }} />

                {/* Header */}
                <div style={{ padding: '14px 16px', cursor: 'pointer' }} onClick={() => setExpanded(e => !e)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                <span style={{ fontSize: 14 }}>{sm.icon}</span>
                                <p style={{
                                    fontSize: 14, fontWeight: 700, margin: 0,
                                    color: task.status === 'COMPLETED' ? C.muted : C.text,
                                    textDecoration: task.status === 'COMPLETED' ? 'line-through' : 'none',
                                    lineHeight: 1.3,
                                }}>{task.title}</p>
                            </div>
                            <p style={{ fontSize: 11, color: C.muted, margin: '0 0 6px', fontWeight: 500 }}>
                                📂 {task.phase_name}{task.room_name ? ` · 🚪 ${task.room_name}` : ''}
                                {task.assigned_to_name ? ` · 👷 ${task.assigned_to_name}` : ''}
                            </p>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                                <StatusChip status={task.status} small />
                                <PriorityBadge priority={task.priority} />
                                {dueDate && (
                                    <span style={{
                                        fontSize: 10, fontWeight: 700,
                                        color: overdue ? C.red : C.muted,
                                        background: overdue ? 'rgba(248,113,113,.1)' : 'transparent',
                                        padding: overdue ? '2px 6px' : '0',
                                        borderRadius: 6,
                                    }}>
                                        {overdue ? '⚠️' : '📅'} {dueDate}
                                    </span>
                                )}
                                {task.media?.length > 0 && (
                                    <span style={{ fontSize: 10, color: C.blue, fontWeight: 700 }}>📸 {task.media.length}</span>
                                )}
                            </div>
                        </div>
                        <span style={{ fontSize: 14, color: C.muted, flexShrink: 0, paddingTop: 2, transition: 'transform .2s', transform: expanded ? 'rotate(180deg)' : 'none' }}>
                            ▼
                        </span>
                    </div>
                    {/* Progress bar */}
                    <ProgressBar pct={pct} color={sm.color} />
                    {pct > 0 && (
                        <p style={{ fontSize: 10, color: C.muted, margin: '4px 0 0', textAlign: 'right' }}>
                            {pct}% complete
                        </p>
                    )}
                </div>

                {/* Expanded detail */}
                {expanded && (
                    <div style={{ padding: '0 16px 16px', borderTop: `1px solid ${C.border}` }}>
                        {task.description && (
                            <p style={{ fontSize: 13, color: C.dim, margin: '12px 0 0', lineHeight: 1.6 }}>{task.description}</p>
                        )}

                        {task.blocker_reason && task.status === 'BLOCKED' && (
                            <div style={{
                                marginTop: 12, padding: '10px 12px',
                                background: 'rgba(248,113,113,.08)',
                                borderRadius: 8, border: `1px solid ${C.red}40`,
                                boxShadow: '0 0 12px rgba(248,113,113,.1)',
                            }}>
                                <p style={{ fontSize: 11, fontWeight: 800, color: C.red, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                                    🚫 Blocker
                                </p>
                                <p style={{ fontSize: 12, color: C.dim, margin: 0, lineHeight: 1.5 }}>{task.blocker_reason}</p>
                            </div>
                        )}

                        {task.technical_requirement && (
                            <div style={{
                                marginTop: 10, padding: '10px 12px',
                                background: 'rgba(56,189,248,.06)',
                                borderRadius: 8, borderLeft: `3px solid ${C.blue}`,
                            }}>
                                <p style={{ fontSize: 11, fontWeight: 800, color: C.blue, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                                    Technical Requirements
                                </p>
                                <p style={{ fontSize: 12, color: C.dim, margin: 0, lineHeight: 1.5 }}>{task.technical_requirement}</p>
                            </div>
                        )}

                        {task.media?.length > 0 && (
                            <div style={{ marginTop: 12 }}>
                                <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 6 }}>
                                    📸 {task.media.length} photo{task.media.length !== 1 ? 's' : ''}
                                </p>
                                <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
                                    {task.media.slice(0, 6).map(m => (
                                        <img key={m.id} src={m.url} alt=""
                                            style={{
                                                width: 64, height: 64, objectFit: 'cover',
                                                borderRadius: 10, flexShrink: 0,
                                                border: `1px solid ${C.border}`,
                                            }} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {!readOnly && task.status !== 'COMPLETED' && (
                            <button onClick={() => setShowModal(true)}
                                style={{
                                    marginTop: 14, width: '100%', padding: '12px',
                                    borderRadius: 12, border: 'none',
                                    background: `linear-gradient(135deg, ${C.blueD}, ${C.blue})`,
                                    color: '#000', fontSize: 13, fontWeight: 800,
                                    cursor: 'pointer',
                                    boxShadow: `0 4px 16px ${C.blue}40`,
                                }}>
                                Update Status →
                            </button>
                        )}
                        {readOnly && (
                            <p style={{ fontSize: 11, color: C.muted, textAlign: 'center', marginTop: 12, fontStyle: 'italic' }}>
                                Project view — contact supervisor to update
                            </p>
                        )}
                    </div>
                )}
            </div>

            {showModal && (
                <UpdateModal task={task} onClose={() => setShowModal(false)} onSaved={handleSaved} />
            )}
        </>
    );
}

// ─── Phase group (collapsible) ─────────────────────────────────────────────────

function PhaseGroup({ phase, tasks, onUpdate, readOnly }) {
    const [open, setOpen] = useState(true);
    const done = tasks.filter(t => t.status === 'COMPLETED').length;
    const blocked = tasks.filter(t => t.status === 'BLOCKED').length;
    const pct = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0;

    return (
        <div style={{ marginBottom: 16 }}>
            {/* Phase header */}
            <div
                onClick={() => setOpen(o => !o)}
                style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', borderRadius: 12,
                    background: 'rgba(56,189,248,.06)',
                    border: `1px solid ${C.blue}20`,
                    cursor: 'pointer', marginBottom: open ? 8 : 0,
                    userSelect: 'none',
                }}>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 12 }}>📂</span>
                        <span style={{ fontSize: 13, fontWeight: 800, color: C.blue }}>{phase}</span>
                        <span style={{ fontSize: 11, color: C.muted }}>
                            {tasks.length} tasks
                        </span>
                        {blocked > 0 && (
                            <span style={{ fontSize: 10, fontWeight: 700, color: C.red, background: 'rgba(248,113,113,.15)', padding: '1px 6px', borderRadius: 10 }}>
                                {blocked} blocked
                            </span>
                        )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                        <div style={{ flex: 1, height: 3, background: C.border, borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? C.green : C.blue, borderRadius: 2, transition: 'width .4s' }} />
                        </div>
                        <span style={{ fontSize: 10, color: C.muted, flexShrink: 0 }}>{done}/{tasks.length}</span>
                    </div>
                </div>
                <span style={{ color: C.muted, fontSize: 12, marginLeft: 12, transition: 'transform .2s', transform: open ? 'rotate(180deg)' : 'none' }}>▼</span>
            </div>

            {open && tasks.map(task => (
                <TaskCard key={task.id} task={task} onUpdate={onUpdate} readOnly={readOnly} />
            ))}
        </div>
    );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function WorkerTasksPage() {
    useEffect(() => { injectStyles(); }, []);

    const [tab, setTab]               = useState('mine');      // 'mine' | 'project'
    const [myTasks, setMyTasks]       = useState([]);
    const [allTasks, setAllTasks]     = useState([]);
    const [phases, setPhases]         = useState([]);
    const [loading, setLoading]       = useState(true);
    const [error, setError]           = useState('');
    const [statusFilter, setStatus]   = useState('');
    const [phaseFilter, setPhase]     = useState('');
    const [search, setSearch]         = useState('');

    const load = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const [t, p, all] = await Promise.all([
                workerPortalApi.getTasks({ status: statusFilter || undefined, phase: phaseFilter || undefined }),
                workerPortalApi.getPhases(),
                workerPortalApi.getProjectTasks(),
            ]);
            setMyTasks(Array.isArray(t) ? t : []);
            setPhases(Array.isArray(p) ? p : []);
            setAllTasks(Array.isArray(all) ? all : []);
        } catch {
            setError('Could not load tasks. Check your connection.');
        } finally {
            setLoading(false);
        }
    }, [statusFilter, phaseFilter]);

    useEffect(() => { load(); }, [load]);

    const handleUpdate = (updated) => {
        setMyTasks(ts => ts.map(t => t.id === updated.id ? updated : t));
    };

    // Filter + search
    const filteredMine = myTasks.filter(t =>
        !search || t.title?.toLowerCase().includes(search.toLowerCase()) || t.phase_name?.toLowerCase().includes(search.toLowerCase())
    );

    const filteredAll = allTasks.filter(t =>
        !search || t.title?.toLowerCase().includes(search.toLowerCase()) || t.phase_name?.toLowerCase().includes(search.toLowerCase())
    );

    // Group all tasks by phase
    const tasksByPhase = filteredAll.reduce((acc, t) => {
        const key = t.phase_name || 'Unassigned';
        if (!acc[key]) acc[key] = [];
        acc[key].push(t);
        return acc;
    }, {});

    // Stats
    const counts = {
        total:   myTasks.length,
        active:  myTasks.filter(t => t.status === 'IN_PROGRESS').length,
        done:    myTasks.filter(t => t.status === 'COMPLETED').length,
        pending: myTasks.filter(t => t.status === 'PENDING').length,
        blocked: myTasks.filter(t => t.status === 'BLOCKED').length,
    };

    const STATUS_FILTERS = [
        { label: 'All',        val: '',            count: counts.total,   color: C.dim   },
        { label: 'Active',     val: 'IN_PROGRESS', count: counts.active,  color: C.amber },
        { label: 'Pending',    val: 'PENDING',     count: counts.pending, color: C.muted },
        { label: 'Done',       val: 'COMPLETED',   count: counts.done,    color: C.green },
        { label: 'Blocked',    val: 'BLOCKED',     count: counts.blocked, color: C.red   },
    ];

    return (
        <div style={{ minHeight: '100vh', background: C.bg, paddingBottom: 100, color: C.text }}>

            {/* ── Header ── */}
            <div style={{
                padding: '20px 20px 0',
                background: C.surface,
                borderBottom: `1px solid ${C.border}`,
                position: 'sticky', top: 0, zIndex: 50,
            }}>
                {/* Page title */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div>
                        <h2 style={{ fontSize: 20, fontWeight: 900, margin: 0, color: C.text }}>Tasks</h2>
                        <p style={{ fontSize: 11, color: C.muted, margin: '2px 0 0' }}>
                            {counts.active} active · {counts.done} done{counts.blocked > 0 ? ` · ${counts.blocked} blocked` : ''}
                        </p>
                    </div>
                    <button onClick={load} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 8, color: C.muted, padding: '6px 10px', fontSize: 12, cursor: 'pointer' }}>
                        ↻ Refresh
                    </button>
                </div>

                {/* Section tabs: My Tasks / Project Tasks */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
                    {[
                        { key: 'mine',    label: '👤 My Tasks',      count: counts.total },
                        { key: 'project', label: '🏗️ Project Tasks', count: allTasks.length },
                    ].map(t => (
                        <button key={t.key} className="wt-chip" onClick={() => { setTab(t.key); setSearch(''); }}
                            style={{
                                flex: 1, padding: '9px 4px', borderRadius: 10, border: 'none',
                                background: tab === t.key ? `linear-gradient(135deg,${C.blueD},${C.blue})` : C.card,
                                color: tab === t.key ? '#000' : C.muted,
                                fontSize: 12, fontWeight: 800, cursor: 'pointer',
                                boxShadow: tab === t.key ? `0 4px 14px ${C.blue}40` : 'none',
                            }}>
                            {t.label} <span style={{ opacity: .7 }}>({t.count})</span>
                        </button>
                    ))}
                </div>

                {/* Status filter chips (only for My Tasks) */}
                {tab === 'mine' && (
                    <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 12, scrollbarWidth: 'none' }}>
                        {STATUS_FILTERS.map(f => {
                            const active = statusFilter === f.val;
                            return (
                                <button key={f.val} className="wt-chip" onClick={() => setStatus(f.val)}
                                    style={{
                                        padding: '5px 12px', borderRadius: 20,
                                        fontSize: 11, fontWeight: 700, flexShrink: 0,
                                        border: `1.5px solid ${active ? f.color : C.border}`,
                                        background: active ? `${f.color}18` : 'transparent',
                                        color: active ? f.color : C.muted,
                                        cursor: 'pointer', whiteSpace: 'nowrap',
                                    }}>
                                    {f.label} {f.count > 0 && `(${f.count})`}
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Phase filter — only for My Tasks */}
                {tab === 'mine' && phases.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                        <select value={phaseFilter} onChange={e => setPhase(e.target.value)}
                            style={{
                                width: '100%', padding: '9px 12px', borderRadius: 10,
                                border: `1px solid ${phaseFilter ? C.blue : C.border}`,
                                fontSize: 12, fontWeight: 600,
                                color: phaseFilter ? C.blue : C.muted,
                                background: C.card, outline: 'none',
                            }}>
                            <option value="">All Phases</option>
                            {phases.map(p => (
                                <option key={p.id} value={p.id}>{p.name} ({p.progress_pct}%)</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* ── Content ── */}
            <div style={{ padding: '14px 16px' }}>

                {/* Search bar */}
                <div style={{ position: 'relative', marginBottom: 14 }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: C.muted }}>🔍</span>
                    <input
                        value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search tasks…"
                        style={{
                            width: '100%', padding: '10px 12px 10px 36px',
                            borderRadius: 12, border: `1px solid ${C.border}`,
                            fontSize: 13, background: C.card,
                            color: C.text, outline: 'none', boxSizing: 'border-box',
                        }} />
                </div>

                {/* Loading */}
                {loading && (
                    <div style={{ textAlign: 'center', padding: 60 }}>
                        <div className="wt-spinner" />
                        <p style={{ fontSize: 13, color: C.muted, marginTop: 16 }}>Loading tasks…</p>
                    </div>
                )}

                {/* Error */}
                {!loading && error && (
                    <div style={{ padding: 20, background: 'rgba(248,113,113,.08)', borderRadius: 14, textAlign: 'center', border: `1px solid ${C.red}30` }}>
                        <p style={{ color: C.red, fontSize: 13, fontWeight: 600 }}>{error}</p>
                        <button onClick={load} style={{ marginTop: 10, padding: '8px 20px', background: C.red, color: '#fff', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                            ↻ Retry
                        </button>
                    </div>
                )}

                {/* ── My Tasks tab ── */}
                {!loading && !error && tab === 'mine' && (
                    filteredMine.length === 0
                        ? (
                            <div style={{ textAlign: 'center', padding: 60, color: C.muted }}>
                                <div style={{ fontSize: 52, marginBottom: 16 }}>📋</div>
                                <p style={{ fontSize: 15, fontWeight: 700, color: C.dim }}>
                                    {statusFilter || phaseFilter || search ? 'No tasks match' : 'No tasks assigned to you'}
                                </p>
                                <p style={{ fontSize: 12, marginTop: 4 }}>
                                    {statusFilter || phaseFilter || search
                                        ? 'Try removing the filters.'
                                        : 'Ask your supervisor to assign tasks. Switch to Project Tasks to see all tasks.'}
                                </p>
                                {!statusFilter && !phaseFilter && !search && (
                                    <button onClick={() => setTab('project')}
                                        style={{
                                            marginTop: 14, padding: '9px 20px', borderRadius: 10,
                                            background: `linear-gradient(135deg,${C.blueD},${C.blue})`,
                                            color: '#000', border: 'none', fontSize: 12, fontWeight: 800,
                                            cursor: 'pointer',
                                        }}>
                                        View Project Tasks →
                                    </button>
                                )}
                            </div>
                        )
                        : filteredMine.map(task => (
                            <TaskCard key={task.id} task={task} onUpdate={handleUpdate} />
                        ))
                )}

                {/* ── Project Tasks tab ── */}
                {!loading && !error && tab === 'project' && (
                    Object.keys(tasksByPhase).length === 0
                        ? (
                            <div style={{ textAlign: 'center', padding: 60, color: C.muted }}>
                                <div style={{ fontSize: 52, marginBottom: 16 }}>🏗️</div>
                                <p style={{ fontSize: 15, fontWeight: 700, color: C.dim }}>No tasks in this project yet</p>
                                <p style={{ fontSize: 12, marginTop: 4 }}>
                                    {search ? 'Try a different search term.' : 'Ask your supervisor to create tasks in the project.'}
                                </p>
                            </div>
                        )
                        : Object.entries(tasksByPhase).map(([phase, phaseTasks]) => (
                            <PhaseGroup key={phase} phase={phase} tasks={phaseTasks} onUpdate={() => {}} readOnly />
                        ))
                )}
            </div>
        </div>
    );
}
