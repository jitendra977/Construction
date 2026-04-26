/**
 * PhasesTab — Phase-Grouped Task Manager
 *
 * Features:
 *  • Accordion phases with all tasks inline (no separate modal to see tasks)
 *  • Inline task creation — type a title and press Enter
 *  • Click task title to edit inline
 *  • Click status badge to cycle through statuses instantly
 *  • Checkbox to mark task complete/incomplete
 *  • Priority color strip and overdue badge on each task row
 *  • Quick phase status change from the phase header
 *  • Progress bar per phase based on completed tasks
 *  • Drag-and-drop to reorder phases (DnD kit)
 *  • Global search + status / priority filters
 *  • Summary stats bar at the top
 */
import React, { useState, useRef, useEffect } from 'react';
import {
    DndContext, closestCenter, KeyboardSensor,
    PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
    arrayMove, SortableContext,
    sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { constructionService } from '../../../services/api';
import { authService } from '../../../services/auth';
import { useConstruction } from '../../../context/ConstructionContext';
import ConfirmModal from '../../common/ConfirmModal';

/* ─── Constants ──────────────────────────────────────────────────────────── */
const PHASE_STATUSES  = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'HALTED'];
const TASK_STATUSES   = ['PENDING', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED'];
const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

const PHASE_STATUS_META = {
    COMPLETED:   { label: 'Done',        color: '#10b981', bg: '#10b98118' },
    IN_PROGRESS: { label: 'In Progress', color: '#3b82f6', bg: '#3b82f618' },
    HALTED:      { label: 'Halted',      color: '#ef4444', bg: '#ef444418' },
    PENDING:     { label: 'Pending',     color: '#6b7280', bg: '#6b728018' },
};

const TASK_STATUS_META = {
    COMPLETED:   { label: 'Done',        color: '#10b981', next: 'PENDING'     },
    IN_PROGRESS: { label: 'In Progress', color: '#3b82f6', next: 'COMPLETED'   },
    BLOCKED:     { label: 'Blocked',     color: '#f59e0b', next: 'IN_PROGRESS' },
    PENDING:     { label: 'Pending',     color: '#6b7280', next: 'IN_PROGRESS' },
};

const PRIORITY_COLOR = {
    CRITICAL: '#ef4444', HIGH: '#f97316', MEDIUM: '#f59e0b', LOW: '#6b7280',
};

/* ─── Tiny helpers ───────────────────────────────────────────────────────── */
const fmtDate = (d) => d
    ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
    : null;

const daysLeft = (dueStr) => {
    if (!dueStr) return null;
    return Math.round((new Date(dueStr) - new Date()) / 86400000);
};

const DragHandle = ({ attrs, listeners }) => (
    <div
        className="cursor-grab active:cursor-grabbing select-none shrink-0"
        {...attrs} {...listeners}
        onClick={e => e.stopPropagation()}
        style={{ color: 'var(--t-text3)', padding: '0 4px' }}
        title="Drag to reorder phases"
    >
        <svg width="12" height="18" viewBox="0 0 12 18" fill="none">
            {[3, 9, 15].map(y => (
                <React.Fragment key={y}>
                    <circle cx="3" cy={y} r="1.5" fill="currentColor" />
                    <circle cx="9" cy={y} r="1.5" fill="currentColor" />
                </React.Fragment>
            ))}
        </svg>
    </div>
);

/* ─── InlineEdit ─────────────────────────────────────────────────────────── */
function InlineEdit({ value, onSave, placeholder = 'Click to edit…', style = {} }) {
    const [editing, setEditing] = useState(false);
    const [val, setVal]         = useState(value);
    const ref = useRef();

    useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);
    useEffect(() => { setVal(value); }, [value]);

    const commit = () => {
        setEditing(false);
        if (val.trim() && val.trim() !== value) onSave(val.trim());
        else setVal(value);
    };

    if (!editing) return (
        <span onClick={() => setEditing(true)} title="Click to edit" style={{ cursor: 'text', ...style }}>
            {value || <em style={{ color: 'var(--t-text3)' }}>{placeholder}</em>}
        </span>
    );

    return (
        <input
            ref={ref}
            value={val}
            onChange={e => setVal(e.target.value)}
            onBlur={commit}
            onKeyDown={e => {
                if (e.key === 'Enter') commit();
                if (e.key === 'Escape') { setEditing(false); setVal(value); }
            }}
            style={{
                background: 'var(--t-surface2)',
                border: '1px solid #f97316',
                borderRadius: 4, padding: '2px 6px',
                fontSize: 'inherit', fontWeight: 'inherit', color: 'inherit',
                outline: 'none', width: '100%', ...style,
            }}
        />
    );
}

/* ─── QuickAddTask ───────────────────────────────────────────────────────── */
function QuickAddTask({ phaseId, onAdded }) {
    const [value, setValue] = useState('');
    const [busy,  setBusy]  = useState(false);
    const ref = useRef();

    const submit = async () => {
        const title = value.trim();
        if (!title) return;
        setBusy(true);
        try {
            const task = await constructionService.createTask({
                title, phase: phaseId,
                status: 'PENDING', priority: 'MEDIUM',
            });
            onAdded(task);
            setValue('');
            ref.current?.focus();
        } catch { /* silent */ }
        finally { setBusy(false); }
    };

    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 12px 10px 38px',
        }}>
            <input
                ref={ref}
                value={value}
                onChange={e => setValue(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submit()}
                placeholder="+ Add task — type and press Enter"
                disabled={busy}
                style={{
                    flex: 1, padding: '6px 12px', borderRadius: 8,
                    border: '1px dashed var(--t-border)',
                    background: 'transparent',
                    color: 'var(--t-text)', fontSize: 12,
                    outline: 'none', transition: 'border-color 0.15s',
                }}
                onFocus={e => e.target.style.borderColor = '#f97316'}
                onBlur={e => e.target.style.borderColor = 'var(--t-border)'}
            />
            {value && (
                <button onClick={submit} disabled={busy} style={{
                    padding: '5px 14px', borderRadius: 7, fontSize: 11, fontWeight: 800,
                    background: '#f97316', color: '#fff', border: 'none', cursor: 'pointer',
                    opacity: busy ? 0.6 : 1,
                }}>
                    {busy ? '…' : 'Add'}
                </button>
            )}
        </div>
    );
}

/* ─── TaskRow ────────────────────────────────────────────────────────────── */
function TaskRow({ task, onUpdate, onDelete }) {
    const [hovered, setHovered]  = useState(false);
    const [deleting, setDeleting] = useState(false);

    const sm     = TASK_STATUS_META[task.status] || TASK_STATUS_META.PENDING;
    const dl     = daysLeft(task.due_date);
    const isDone = task.status === 'COMPLETED';
    const pct    = task.progress_percentage || 0;

    const cycleStatus = () => onUpdate(task.id, { status: sm.next });

    const toggleDone = () => onUpdate(task.id, {
        status: isDone ? 'PENDING' : 'COMPLETED',
        progress_percentage: isDone ? pct : 100,
    });

    const cyclePriority = () => {
        const idx = TASK_PRIORITIES.indexOf(task.priority);
        onUpdate(task.id, { priority: TASK_PRIORITIES[(idx + 1) % TASK_PRIORITIES.length] });
    };

    const del = async () => {
        setDeleting(true);
        try {
            await constructionService.deleteTask(task.id);
            onDelete(task.id);
        } catch { /* silent */ }
        finally { setDeleting(false); }
    };

    return (
        <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '6px 12px 6px 0',
                borderRadius: 7,
                borderLeft: `3px solid ${isDone ? '#10b98140' : (PRIORITY_COLOR[task.priority] || '#6b7280') + '60'}`,
                marginLeft: 12,
                background: hovered ? 'var(--t-surface2)' : 'transparent',
                transition: 'background 0.1s',
                opacity: isDone ? 0.65 : 1,
            }}
        >
            {/* Checkbox */}
            <input
                type="checkbox"
                checked={isDone}
                onChange={toggleDone}
                style={{ marginLeft: 10, cursor: 'pointer', accentColor: '#10b981', flexShrink: 0 }}
            />

            {/* Title (inline editable) */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <InlineEdit
                    value={task.title}
                    onSave={v => onUpdate(task.id, { title: v })}
                    style={{
                        fontSize: 13, fontWeight: 600,
                        color: isDone ? 'var(--t-text3)' : 'var(--t-text)',
                        textDecoration: isDone ? 'line-through' : 'none',
                        display: 'block',
                    }}
                />
                {pct > 0 && pct < 100 && (
                    <div style={{
                        height: 3, borderRadius: 2, background: 'var(--t-border)',
                        marginTop: 3, overflow: 'hidden', maxWidth: 100,
                    }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: '#3b82f6', borderRadius: 2 }} />
                    </div>
                )}
            </div>

            {/* Status — click to cycle */}
            <button onClick={cycleStatus} title={`Next: ${sm.next.replace('_', ' ')}`} style={{
                padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 800,
                background: sm.color + '18', color: sm.color,
                border: `1px solid ${sm.color}30`,
                cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap', minWidth: 76, textAlign: 'center',
            }}>
                {sm.label}
            </button>

            {/* Priority — click to cycle */}
            <button onClick={cyclePriority} title="Click to change priority" style={{
                padding: '2px 7px', borderRadius: 4, fontSize: 9, fontWeight: 900,
                background: (PRIORITY_COLOR[task.priority] || '#6b7280') + '18',
                color: PRIORITY_COLOR[task.priority] || '#6b7280',
                border: 'none', cursor: 'pointer', flexShrink: 0, minWidth: 60, textAlign: 'center',
                letterSpacing: '0.05em',
            }}>
                {task.priority}
            </button>

            {/* Due date */}
            <span style={{
                fontSize: 10, fontWeight: 700, flexShrink: 0, whiteSpace: 'nowrap',
                minWidth: 80, textAlign: 'right',
                color: dl !== null && dl < 0 ? '#ef4444'
                     : dl !== null && dl <= 3 ? '#f59e0b'
                     : 'var(--t-text3)',
            }}>
                {task.due_date
                    ? (dl !== null && dl < 0
                        ? `⚠ ${Math.abs(dl)}d over`
                        : `📅 ${fmtDate(task.due_date)}`)
                    : ''}
            </span>

            {/* Assigned */}
            <span style={{
                fontSize: 10, color: 'var(--t-text3)', flexShrink: 0,
                minWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
                {task.assigned_to_detail?.name ? `👤 ${task.assigned_to_detail.name}` : ''}
            </span>

            {/* Cost */}
            <span style={{
                fontSize: 10, color: 'var(--t-text3)', flexShrink: 0,
                minWidth: 70, textAlign: 'right', whiteSpace: 'nowrap',
            }}>
                {task.estimated_cost > 0 ? `Rs.${Number(task.estimated_cost).toLocaleString()}` : ''}
            </span>

            {/* Delete */}
            <button
                onClick={del}
                disabled={deleting}
                style={{
                    padding: '3px 8px', borderRadius: 5, fontSize: 11,
                    background: hovered ? 'rgba(239,68,68,0.1)' : 'transparent',
                    color: hovered ? '#ef4444' : 'transparent',
                    border: 'none', cursor: 'pointer', flexShrink: 0, width: 32,
                    transition: 'all 0.15s',
                }}
            >
                {deleting ? '…' : '✕'}
            </button>
        </div>
    );
}

/* ─── PhaseAccordion ─────────────────────────────────────────────────────── */
function SortablePhaseAccordion({
    phase, tasks, expanded, onToggle,
    onPhaseUpdate, onPhaseDelete,
    onTaskUpdate, onTaskDelete, onTaskAdded,
    canManage, searchQuery, filterStatus, filterPriority,
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
        useSortable({ id: phase.id });
    const domStyle = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 50 : 'auto' };

    const sm = PHASE_STATUS_META[phase.status] || PHASE_STATUS_META.PENDING;

    const visibleTasks = tasks.filter(t => {
        if (filterStatus !== 'ALL' && t.status !== filterStatus) return false;
        if (filterPriority !== 'ALL' && t.priority !== filterPriority) return false;
        if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    const totalT   = tasks.length;
    const doneT    = tasks.filter(t => t.status === 'COMPLETED').length;
    const overdueT = tasks.filter(t => t.due_date && daysLeft(t.due_date) < 0 && t.status !== 'COMPLETED').length;
    const inProgT  = tasks.filter(t => t.status === 'IN_PROGRESS').length;
    const progress = totalT > 0 ? Math.round(doneT / totalT * 100) : 0;

    const cyclePhaseStatus = () => {
        const idx  = PHASE_STATUSES.indexOf(phase.status);
        const next = PHASE_STATUSES[(idx + 1) % PHASE_STATUSES.length];
        onPhaseUpdate(phase.id, { status: next });
    };

    return (
        <div ref={setNodeRef} style={{
            ...domStyle,
            marginBottom: 8, borderRadius: 12,
            border: `1px solid ${isDragging ? '#f97316' : expanded ? 'var(--t-primary)' : 'var(--t-border)'}`,
            background: 'var(--t-surface)',
            boxShadow: isDragging ? '0 8px 28px rgba(0,0,0,0.2)' : 'none',
            overflow: 'hidden',
            transition: 'box-shadow 0.15s, border-color 0.15s',
        }}>
            {/* ── Phase header ──────────────────────────────────────── */}
            <div
                onClick={() => onToggle(phase.id)}
                style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '11px 14px',
                    cursor: 'pointer',
                    background: expanded ? 'var(--t-surface2)' : 'var(--t-surface)',
                    userSelect: 'none',
                }}
            >
                {canManage && (
                    <div onClick={e => e.stopPropagation()}>
                        <DragHandle attrs={attributes} listeners={listeners} />
                    </div>
                )}

                {/* Order # */}
                <span style={{
                    fontSize: 10, fontWeight: 900, width: 22, height: 22, borderRadius: 6,
                    flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(249,115,22,0.12)', color: '#f97316',
                    border: '1px solid rgba(249,115,22,0.2)',
                }}>
                    {phase.order}
                </span>

                {/* Name + mini-progress */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                        fontSize: 14, fontWeight: 800, color: 'var(--t-text)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                        {phase.name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
                        <div style={{ width: 80, height: 4, borderRadius: 2, background: 'var(--t-border)', overflow: 'hidden' }}>
                            <div style={{
                                height: '100%', width: `${progress}%`,
                                background: progress === 100 ? '#10b981' : '#f97316',
                                borderRadius: 2, transition: 'width 0.4s',
                            }} />
                        </div>
                        <span style={{ fontSize: 10, color: 'var(--t-text3)', fontWeight: 700, whiteSpace: 'nowrap' }}>
                            {doneT}/{totalT} · {progress}%
                        </span>
                        {inProgT > 0 && (
                            <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, fontWeight: 800, background: '#3b82f618', color: '#3b82f6' }}>
                                🔄 {inProgT} active
                            </span>
                        )}
                        {overdueT > 0 && (
                            <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, fontWeight: 800, background: '#ef444418', color: '#ef4444' }}>
                                ⚠ {overdueT} overdue
                            </span>
                        )}
                        {phase.start_date && (
                            <span style={{ fontSize: 10, color: 'var(--t-text3)', whiteSpace: 'nowrap' }}>
                                {fmtDate(phase.start_date)} → {fmtDate(phase.end_date) || '?'}
                            </span>
                        )}
                    </div>
                </div>

                {/* Budget */}
                {phase.estimated_budget > 0 && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--t-text2)', whiteSpace: 'nowrap' }}>
                        Rs.{Number(phase.estimated_budget).toLocaleString()}
                    </span>
                )}

                {/* Status — click to cycle */}
                <button
                    onClick={e => { e.stopPropagation(); cyclePhaseStatus(); }}
                    title="Click to change phase status"
                    style={{
                        padding: '3px 10px', borderRadius: 5, fontSize: 10, fontWeight: 800,
                        background: sm.bg, color: sm.color,
                        border: `1px solid ${sm.color}30`,
                        cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap',
                    }}
                >
                    {sm.label}
                </button>

                {/* Task count */}
                <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                    background: 'var(--t-surface2)', color: 'var(--t-text2)',
                    border: '1px solid var(--t-border)', flexShrink: 0,
                }}>
                    {totalT} {totalT === 1 ? 'task' : 'tasks'}
                </span>

                {/* Delete phase */}
                {canManage && (
                    <button
                        onClick={e => { e.stopPropagation(); onPhaseDelete(phase.id); }}
                        style={{
                            padding: '3px 7px', borderRadius: 5, fontSize: 12,
                            background: 'transparent', color: 'var(--t-text3)',
                            border: 'none', cursor: 'pointer', flexShrink: 0,
                        }}
                        title="Delete phase"
                    >
                        🗑
                    </button>
                )}

                {/* Chevron */}
                <span style={{
                    fontSize: 14, color: 'var(--t-text3)', flexShrink: 0,
                    transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s',
                }}>
                    ›
                </span>
            </div>

            {/* ── Tasks panel ───────────────────────────────────────── */}
            {expanded && (
                <div style={{ borderTop: '1px solid var(--t-border)' }}>
                    {/* Column header */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '5px 12px 5px 52px',
                        background: 'rgba(0,0,0,0.015)',
                        borderBottom: '1px solid var(--t-border)',
                    }}>
                        {[
                            { label: 'Task (click to edit)', flex: 1 },
                            { label: 'Status ↗', width: 84 },
                            { label: 'Priority ↗', width: 68 },
                            { label: 'Due', width: 88 },
                            { label: 'Assigned', width: 98 },
                            { label: 'Cost', width: 78 },
                            { label: '', width: 32 },
                        ].map((col, i) => (
                            <span key={i} style={{
                                flex: col.flex, width: col.width, flexShrink: 0,
                                fontSize: 9, fontWeight: 800, color: 'var(--t-text3)',
                                textTransform: 'uppercase', letterSpacing: '0.1em',
                            }}>
                                {col.label}
                            </span>
                        ))}
                    </div>

                    {/* Task rows */}
                    <div style={{ padding: '4px 0' }}>
                        {visibleTasks.length === 0 ? (
                            <div style={{
                                padding: '16px 24px', fontSize: 12,
                                color: 'var(--t-text3)', textAlign: 'center', fontStyle: 'italic',
                            }}>
                                {tasks.length === 0
                                    ? 'No tasks yet — add one below.'
                                    : 'No tasks match the current filters.'}
                            </div>
                        ) : (
                            visibleTasks
                                .slice()
                                .sort((a, b) => {
                                    // Sort: overdue first, then by due date, then by priority
                                    const da = a.due_date ? new Date(a.due_date) : null;
                                    const db = b.due_date ? new Date(b.due_date) : null;
                                    if (da && db) return da - db;
                                    if (da) return -1; if (db) return 1;
                                    return 0;
                                })
                                .map(task => (
                                    <TaskRow
                                        key={task.id}
                                        task={task}
                                        onUpdate={onTaskUpdate}
                                        onDelete={onTaskDelete}
                                    />
                                ))
                        )}
                    </div>

                    {/* Inline quick-add */}
                    {canManage && (
                        <QuickAddTask phaseId={phase.id} onAdded={onTaskAdded} />
                    )}
                </div>
            )}
        </div>
    );
}

/* ─── SummaryBar ─────────────────────────────────────────────────────────── */
function SummaryBar({ phases, tasks }) {
    const total     = tasks.length;
    const done      = tasks.filter(t => t.status === 'COMPLETED').length;
    const inProg    = tasks.filter(t => t.status === 'IN_PROGRESS').length;
    const blocked   = tasks.filter(t => t.status === 'BLOCKED').length;
    const overdue   = tasks.filter(t => t.due_date && daysLeft(t.due_date) < 0 && t.status !== 'COMPLETED').length;
    const phaseDone = phases.filter(p => p.status === 'COMPLETED').length;
    const overall   = total > 0 ? Math.round(done / total * 100) : 0;

    const stats = [
        { label: 'Phases',      value: `${phaseDone}/${phases.length}`, color: '#f97316' },
        { label: 'Total Tasks', value: total,                            color: 'var(--t-text)' },
        { label: 'Done',        value: done,                             color: '#10b981' },
        { label: 'In Progress', value: inProg,                           color: '#3b82f6' },
        { label: 'Blocked',     value: blocked,                          color: '#f59e0b' },
        { label: 'Overdue',     value: overdue,                          color: overdue > 0 ? '#ef4444' : 'var(--t-text3)' },
    ];

    return (
        <div style={{ marginBottom: 14 }}>
            {/* Overall progress */}
            <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--t-border)', overflow: 'hidden' }}>
                    <div style={{
                        height: '100%', width: `${overall}%`,
                        background: overall === 100 ? '#10b981' : 'linear-gradient(90deg, #f97316, #fb923c)',
                        borderRadius: 3, transition: 'width 0.5s',
                    }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--t-text2)', whiteSpace: 'nowrap' }}>
                    {overall}% overall
                </span>
            </div>

            {/* Stat chips */}
            <div style={{
                display: 'flex', gap: 0, borderRadius: 10, overflow: 'hidden',
                border: '1px solid var(--t-border)', background: 'var(--t-surface)',
            }}>
                {stats.map((s, i) => (
                    <div key={s.label} style={{
                        flex: 1, padding: '9px 12px', textAlign: 'center',
                        borderRight: i < stats.length - 1 ? '1px solid var(--t-border)' : 'none',
                    }}>
                        <div style={{ fontSize: 18, fontWeight: 900, color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: 9, color: 'var(--t-text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 1 }}>
                            {s.label}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ─── AddPhaseForm ───────────────────────────────────────────────────────── */
function AddPhaseForm({ phaseCount, onCreated, onCancel }) {
    const [form, setForm] = useState({
        name: '', status: 'PENDING',
        start_date: '', end_date: '',
        estimated_budget: '', description: '',
    });
    const [busy, setBusy] = useState(false);
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const submit = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) return;
        setBusy(true);
        try {
            const phase = await constructionService.createPhase({
                ...form,
                order: phaseCount + 1,
                estimated_budget: form.estimated_budget || 0,
            });
            onCreated(phase);
        } catch { /* silent */ }
        finally { setBusy(false); }
    };

    const inp = {
        padding: '7px 10px', borderRadius: 7, fontSize: 12,
        border: '1px solid var(--t-border)', background: 'var(--t-surface)',
        color: 'var(--t-text)', outline: 'none', width: '100%', boxSizing: 'border-box',
    };

    return (
        <form onSubmit={submit} style={{
            padding: '16px', borderRadius: 12, marginBottom: 10,
            border: '2px dashed #f97316', background: 'rgba(249,115,22,0.03)',
        }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 800, color: 'var(--t-text)' }}>
                + New Phase
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 10 }}>
                <div style={{ gridColumn: '1 / -1' }}>
                    <input style={{ ...inp, fontSize: 14, fontWeight: 700 }}
                        placeholder="Phase name (e.g. Foundation & Plinth)"
                        value={form.name} onChange={e => set('name', e.target.value)}
                        required autoFocus />
                </div>
                <div>
                    <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--t-text3)', display: 'block', marginBottom: 3 }}>Status</label>
                    <select style={inp} value={form.status} onChange={e => set('status', e.target.value)}>
                        {PHASE_STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                    </select>
                </div>
                <div>
                    <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--t-text3)', display: 'block', marginBottom: 3 }}>Est. Budget (Rs.)</label>
                    <input type="number" style={inp} placeholder="0"
                        value={form.estimated_budget} onChange={e => set('estimated_budget', e.target.value)} />
                </div>
                <div>
                    <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--t-text3)', display: 'block', marginBottom: 3 }}>Start Date</label>
                    <input type="date" style={inp} value={form.start_date} onChange={e => set('start_date', e.target.value)} />
                </div>
                <div>
                    <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--t-text3)', display: 'block', marginBottom: 3 }}>End Date</label>
                    <input type="date" style={inp} value={form.end_date} onChange={e => set('end_date', e.target.value)} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--t-text3)', display: 'block', marginBottom: 3 }}>Description (optional)</label>
                    <textarea rows={2} style={{ ...inp, resize: 'none' }}
                        placeholder="Scope of work for this phase…"
                        value={form.description} onChange={e => set('description', e.target.value)} />
                </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" disabled={busy || !form.name.trim()} style={{
                    padding: '8px 22px', borderRadius: 8, fontWeight: 800, fontSize: 12,
                    background: '#f97316', color: '#fff', border: 'none', cursor: 'pointer',
                    opacity: busy || !form.name.trim() ? 0.6 : 1,
                }}>
                    {busy ? 'Creating…' : 'Create Phase'}
                </button>
                <button type="button" onClick={onCancel} style={{
                    padding: '8px 16px', borderRadius: 8, fontWeight: 700, fontSize: 12,
                    background: 'var(--t-surface2)', color: 'var(--t-text)',
                    border: '1px solid var(--t-border)', cursor: 'pointer',
                }}>
                    Cancel
                </button>
            </div>
        </form>
    );
}

/* ─── PhasesTab (main) ───────────────────────────────────────────────────── */
const PhasesTab = ({ searchQuery = '' }) => {
    const { dashboardData, refreshData, activeProjectId } = useConstruction();
    const canManage = authService.hasPermission('can_manage_phases');

    const [phases, setPhases] = useState([]);
    const [tasks,  setTasks]  = useState([]);
    const [expandedIds, setExpandedIds] = useState(() => new Set());
    const [showAddPhase, setShowAddPhase] = useState(false);
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [filterPriority, setFilterPri]  = useState('ALL');
    const [confirmCfg, setConfirmCfg]     = useState({ isOpen: false });

    useEffect(() => {
        setPhases((dashboardData.phases || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0)));
        setTasks(dashboardData.tasks || []);
    }, [dashboardData.phases, dashboardData.tasks]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    /* ── Helpers ── */
    const toggleExpand = (id) =>
        setExpandedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    const expandAll   = () => setExpandedIds(new Set(phases.map(p => p.id)));
    const collapseAll = () => setExpandedIds(new Set());

    /* ── Drag phases ── */
    const handleDragEnd = async ({ active, over }) => {
        if (!over || active.id === over.id) return;
        const oldIdx    = phases.findIndex(p => p.id === active.id);
        const newIdx    = phases.findIndex(p => p.id === over.id);
        const reordered = arrayMove(phases, oldIdx, newIdx).map((p, i) => ({ ...p, order: i + 1 }));
        setPhases(reordered);
        try {
            await constructionService.reorderPhases(reordered.map((p, i) => ({ id: p.id, order: i + 1 })));
        } catch { refreshData(); }
    };

    /* ── Phase CRUD ── */
    const handlePhaseUpdate = async (id, data) => {
        setPhases(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
        try { await constructionService.updatePhase(id, data); }
        catch { refreshData(); }
    };

    const handlePhaseDelete = (id) =>
        setConfirmCfg({
            isOpen: true,
            title: 'Delete Phase?',
            message: 'This will permanently delete the phase and all tasks inside it. Cannot be undone.',
            confirmText: 'Delete Phase',
            type: 'danger',
            onConfirm: async () => {
                setPhases(prev => prev.filter(p => p.id !== id));
                setTasks(prev => prev.filter(t => t.phase !== id));
                setConfirmCfg(c => ({ ...c, isOpen: false }));
                try { await constructionService.deletePhase(id); }
                catch { refreshData(); }
            },
        });

    const handlePhaseCreated = (phase) => {
        setPhases(prev => [...prev, phase]);
        setExpandedIds(prev => new Set([...prev, phase.id]));
        setShowAddPhase(false);
    };

    /* ── Task CRUD ── */
    const handleTaskUpdate = async (id, data) => {
        setTasks(prev => prev.map(t => t.id === id ? { ...t, ...data } : t));
        try { await constructionService.updateTask(id, data); }
        catch { refreshData(); }
    };

    const handleTaskDelete = (id) => setTasks(prev => prev.filter(t => t.id !== id));

    const handleTaskAdded = (task) => setTasks(prev => [...prev, task]);

    /* ── Filter phases ── */
    const filteredPhases = phases.filter(p =>
        !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div>
            {/* Summary */}
            <SummaryBar phases={phases} tasks={tasks} />

            {/* Toolbar */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                marginBottom: 12, flexWrap: 'wrap',
            }}>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{
                    padding: '6px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                    border: '1px solid var(--t-border)', background: 'var(--t-surface)',
                    color: 'var(--t-text)', cursor: 'pointer',
                }}>
                    <option value="ALL">All Statuses</option>
                    {TASK_STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>

                <select value={filterPriority} onChange={e => setFilterPri(e.target.value)} style={{
                    padding: '6px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                    border: '1px solid var(--t-border)', background: 'var(--t-surface)',
                    color: 'var(--t-text)', cursor: 'pointer',
                }}>
                    <option value="ALL">All Priorities</option>
                    {TASK_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>

                <div style={{ flex: 1 }} />

                <button onClick={expandAll} style={{
                    padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                    border: '1px solid var(--t-border)', background: 'var(--t-surface2)',
                    color: 'var(--t-text)', cursor: 'pointer',
                }}>↕ Expand All</button>

                <button onClick={collapseAll} style={{
                    padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                    border: '1px solid var(--t-border)', background: 'var(--t-surface2)',
                    color: 'var(--t-text)', cursor: 'pointer',
                }}>↕ Collapse All</button>

                {canManage && (
                    <button onClick={() => setShowAddPhase(true)} style={{
                        padding: '6px 18px', borderRadius: 8, fontSize: 11, fontWeight: 800,
                        background: '#f97316', color: '#fff', border: 'none', cursor: 'pointer',
                    }}>+ Add Phase</button>
                )}
            </div>

            {/* Inline add phase form */}
            {showAddPhase && (
                <AddPhaseForm
                    phaseCount={phases.length}
                    onCreated={handlePhaseCreated}
                    onCancel={() => setShowAddPhase(false)}
                />
            )}

            {/* Phase accordions */}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={filteredPhases.map(p => p.id)} strategy={verticalListSortingStrategy}>
                    {filteredPhases.map(phase => (
                        <SortablePhaseAccordion
                            key={phase.id}
                            phase={phase}
                            tasks={tasks.filter(t => t.phase === phase.id)}
                            expanded={expandedIds.has(phase.id)}
                            onToggle={toggleExpand}
                            onPhaseUpdate={handlePhaseUpdate}
                            onPhaseDelete={handlePhaseDelete}
                            onTaskUpdate={handleTaskUpdate}
                            onTaskDelete={handleTaskDelete}
                            onTaskAdded={handleTaskAdded}
                            canManage={canManage}
                            activeProjectId={activeProjectId}
                            searchQuery={searchQuery}
                            filterStatus={filterStatus}
                            filterPriority={filterPriority}
                        />
                    ))}
                </SortableContext>
            </DndContext>

            {/* Empty state */}
            {filteredPhases.length === 0 && !showAddPhase && (
                <div style={{
                    padding: 48, textAlign: 'center', borderRadius: 12,
                    border: '2px dashed var(--t-border)', background: 'var(--t-surface)',
                }}>
                    <p style={{ fontSize: 40, marginBottom: 8 }}>🏗️</p>
                    <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--t-text)', marginBottom: 4 }}>
                        {searchQuery ? 'No phases match your search' : 'No phases yet'}
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--t-text3)', marginBottom: 16 }}>
                        Phases organise your construction into stages. Add your first phase to begin.
                    </p>
                    {!searchQuery && canManage && (
                        <button onClick={() => setShowAddPhase(true)} style={{
                            padding: '9px 22px', borderRadius: 9, fontWeight: 800, fontSize: 13,
                            background: '#f97316', color: '#fff', border: 'none', cursor: 'pointer',
                        }}>
                            + Add First Phase
                        </button>
                    )}
                </div>
            )}

            {/* Quick-reference tips */}
            <div style={{
                marginTop: 20, padding: '12px 16px', borderRadius: 10,
                background: 'rgba(59,130,246,0.04)', border: '1px solid rgba(59,130,246,0.14)',
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8,
            }}>
                {[
                    ['⌨️', 'Type a task and press Enter to add it instantly'],
                    ['✏️', 'Click any task title to edit it inline'],
                    ['🔄', 'Click a status badge to jump to the next state'],
                    ['🎯', 'Click a priority badge to cycle LOW→MEDIUM→HIGH→CRITICAL'],
                    ['☑️', 'Tick the checkbox to mark a task done/undone'],
                    ['⣿', 'Drag the dot handle to reorder phases'],
                ].map(([icon, tip]) => (
                    <div key={tip} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                        <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>{icon}</span>
                        <span style={{ fontSize: 11, color: 'var(--t-text3)', lineHeight: 1.45 }}>{tip}</span>
                    </div>
                ))}
            </div>

            <ConfirmModal
                isOpen={confirmCfg.isOpen}
                title={confirmCfg.title}
                message={confirmCfg.message}
                confirmText={confirmCfg.confirmText}
                type={confirmCfg.type}
                onConfirm={confirmCfg.onConfirm}
                onCancel={() => setConfirmCfg(c => ({ ...c, isOpen: false }))}
            />
        </div>
    );
};

export default PhasesTab;
