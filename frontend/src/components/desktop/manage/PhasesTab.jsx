import React, { useState } from 'react';
import { constructionService } from '../../../services/api';
import { authService } from '../../../services/auth';
import Modal from '../../common/Modal';
import PhaseDetailModal from './PhaseDetailModal';
import TaskPreviewModal from './TaskPreviewModal';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useConstruction } from '../../../context/ConstructionContext';
import ConfirmModal from '../../common/ConfirmModal';

/* ─── Status helpers ─────────────────────────────────────────────────────── */
const STATUS_META = {
    COMPLETED: { label: 'Completed', dot: 'var(--t-primary)', bg: 'var(--t-primary)', text: 'var(--t-bg)' },
    IN_PROGRESS: { label: 'In Progress', dot: 'var(--t-info)', bg: 'var(--t-info)', text: 'var(--t-bg)' },
    HALTED: { label: 'Halted', dot: 'var(--t-danger)', bg: 'var(--t-danger)', text: 'var(--t-bg)' },
    PENDING: { label: 'Pending', dot: 'var(--t-text3)', bg: 'var(--t-surface3)', text: 'var(--t-text2)' },
};

const StatusBadge = ({ status, small }) => {
    const m = STATUS_META[status] || STATUS_META.PENDING;
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: `color-mix(in srgb, ${m.bg} 14%, transparent)`,
            color: m.dot,
            border: `1px solid color-mix(in srgb, ${m.dot} 28%, transparent)`,
            borderRadius: 4,
            padding: small ? '2px 7px' : '3px 9px',
            fontSize: small ? 9 : 10,
            fontWeight: 900,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            fontFamily: 'var(--f-mono)',
        }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: m.dot, flexShrink: 0 }} />
            {m.label}
        </span>
    );
};

const DragHandle = ({ attrs, listeners }) => (
    <div
        className="cursor-move text-[var(--t-text3)] hover:text-[var(--t-primary)] active:scale-110 transition-all select-none"
        {...attrs}
        {...listeners}
        onClick={e => e.stopPropagation()}
        title="Drag to reorder"
    >
        <svg width="14" height="20" viewBox="0 0 14 20" fill="none">
            {[3, 9, 15].map(y => (
                <React.Fragment key={y}>
                    <circle cx="4" cy={y} r="1.5" fill="currentColor" />
                    <circle cx="10" cy={y} r="1.5" fill="currentColor" />
                </React.Fragment>
            ))}
        </svg>
    </div>
);

/* ─── Mobile Card ─────────────────────────────────────────────────────────── */
const SortableCard = ({ phase, tasks = [], onEdit, onDelete, isExpanded, onToggleExpand, onAddTask, onEditTask }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: phase.id });
    const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 100 : 'auto' };

    const completedTasks = tasks.filter(t => t.status === 'COMPLETED').length;
    const totalTasks = tasks.length;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return (
        <div
            ref={setNodeRef} style={style}
            className={`mb-3 rounded-2xl border transition-all overflow-hidden ${isDragging
                    ? 'border-[var(--t-primary)] shadow-2xl scale-[1.01]'
                    : 'border-[var(--t-border)] bg-[var(--t-surface)]'
                }`}
        >
            {/* Header */}
            <div
                className="flex items-center gap-3 px-4 pt-4 pb-3 cursor-pointer hover:bg-[var(--t-surface2)] transition-colors"
                onClick={() => onEdit(phase)}
            >
                <DragHandle attrs={attributes} listeners={listeners} />
                <div
                    className="flex items-center justify-center w-7 h-7 rounded-lg text-[11px] font-black shrink-0"
                    style={{
                        background: `color-mix(in srgb, var(--t-primary) 12%, transparent)`,
                        color: 'var(--t-primary)',
                        fontFamily: 'var(--f-mono)',
                        border: '1px solid color-mix(in srgb, var(--t-primary) 22%, transparent)',
                    }}
                >
                    {phase.order}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-[9px] font-black text-[var(--t-text3)] uppercase tracking-[0.2em] mb-0.5" style={{ fontFamily: 'var(--f-mono)' }}>Phase</div>
                    <h3 className="font-bold text-[var(--t-text)] text-[15px] leading-tight truncate" style={{ fontFamily: 'var(--f-body)' }}>{phase.name}</h3>
                </div>
                <StatusBadge status={phase.status} small />
            </div>

            {/* Progress */}
            <div className="px-4 pb-3">
                <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[9px] font-black text-[var(--t-text3)] uppercase tracking-widest" style={{ fontFamily: 'var(--f-mono)' }}>
                        Task Progress
                    </span>
                    <span className="text-[9px] font-black" style={{ color: 'var(--t-primary)', fontFamily: 'var(--f-mono)' }}>
                        {completedTasks} / {totalTasks} · {progress}%
                    </span>
                </div>
                <div className="h-[5px] rounded-full overflow-hidden bg-[var(--t-surface3)]" style={{ border: '1px solid var(--t-border)' }}>
                    <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                            width: `${progress}%`,
                            background: 'linear-gradient(90deg, var(--t-primary), var(--t-primary2))',
                            boxShadow: '0 0 8px color-mix(in srgb, var(--t-primary) 40%, transparent)',
                        }}
                    />
                </div>
            </div>

            {/* Budget + Timeline row */}
            <div className="mx-4 mb-3 px-3 py-2.5 rounded-xl flex justify-between items-center bg-[var(--t-surface2)] border border-[var(--t-border)]">
                <div>
                    <div className="text-[8px] font-black text-[var(--t-text3)] uppercase tracking-tighter mb-0.5" style={{ fontFamily: 'var(--f-mono)' }}>Est. Budget</div>
                    <div className="text-[13px] font-black text-[var(--t-text)]" style={{ fontFamily: 'var(--f-disp)', letterSpacing: '0.04em' }}>
                        Rs. {Number(phase.estimated_budget).toLocaleString()}
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-[8px] font-black text-[var(--t-text3)] uppercase tracking-tighter mb-0.5" style={{ fontFamily: 'var(--f-mono)' }}>Timeline</div>
                    <div className="text-[11px] font-semibold text-[var(--t-text2)]">
                        {phase.start_date ? new Date(phase.start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'TBD'}
                        {' — '}
                        {phase.end_date ? new Date(phase.end_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'TBD'}
                    </div>
                </div>
            </div>

            {/* Action buttons */}
            <div className="px-4 pb-4 flex gap-2">
                <button
                    onClick={() => onToggleExpand(phase.id)}
                    className="flex-1 py-2 rounded-xl text-[11px] font-bold tracking-wide transition-colors border"
                    style={isExpanded
                        ? { background: 'var(--t-primary)', color: 'var(--t-bg)', border: '1px solid var(--t-primary)' }
                        : { background: 'var(--t-surface2)', color: 'var(--t-text)', border: '1px solid var(--t-border)' }
                    }
                >
                    {isExpanded ? 'Hide Tasks' : 'Manage Tasks'}
                </button>
                <button
                    onClick={() => onEdit(phase)}
                    className="px-4 py-2 rounded-xl text-[11px] font-bold tracking-wide border border-[var(--t-border)] bg-[var(--t-surface2)] text-[var(--t-text)] hover:border-[var(--t-primary)] transition-colors"
                >
                    Details
                </button>
            </div>

            {/* Expanded task list */}
            {isExpanded && (
                <div className="mx-4 mb-4 pt-3 border-t border-[var(--t-border)] space-y-2 animate-fadeIn">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-[9px] font-black text-[var(--t-text2)] uppercase tracking-[0.2em]" style={{ fontFamily: 'var(--f-mono)' }}>Tasks</span>
                        <button onClick={() => onAddTask(phase.id)} className="text-[9px] font-black text-[var(--t-primary)] uppercase tracking-widest hover:underline" style={{ fontFamily: 'var(--f-mono)' }}>
                            + Add Task
                        </button>
                    </div>
                    {tasks.length > 0 ? [...tasks].sort((a, b) => {
                        const dA = a.due_date ? new Date(a.due_date) : null;
                        const dB = b.due_date ? new Date(b.due_date) : null;
                        if (dA && dB) return dA - dB;
                        if (dA) return -1; if (dB) return 1;
                        return new Date(b.created_at) - new Date(a.created_at);
                    }).map(t => (
                        <div
                            key={t.id} onClick={() => onEditTask(t)}
                            className="flex justify-between items-center px-3 py-2.5 rounded-xl border border-[var(--t-border)] bg-[var(--t-surface2)] cursor-pointer hover:border-[var(--t-primary)] transition-all group"
                        >
                            <div>
                                <div className="text-[12px] font-semibold text-[var(--t-text)] group-hover:text-[var(--t-primary)] transition-colors">{t.title}</div>
                                <div className="text-[9px] text-[var(--t-text3)] mt-0.5 uppercase font-bold tracking-wider" style={{ fontFamily: 'var(--f-mono)' }}>{t.status} · {t.priority}</div>
                            </div>
                            <svg className="w-3.5 h-3.5 text-[var(--t-primary)] opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                            </svg>
                        </div>
                    )) : (
                        <div className="py-6 text-center text-[10px] text-[var(--t-text3)] italic border border-dashed border-[var(--t-border)] rounded-xl">
                            No tasks assigned yet.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

/* ─── Desktop Row ─────────────────────────────────────────────────────────── */
const SortableRow = ({ phase, tasks = [], onEdit, onDelete, isExpanded, onToggleExpand, onAddTask, onEditTask }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: phase.id });
    const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : 'auto' };

    const completedTasks = tasks.filter(t => t.status === 'COMPLETED').length;
    const totalTasks = tasks.length;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const canManagePhases = authService.hasPermission('can_manage_phases');

    return (
        <>
            <tr
                ref={setNodeRef} style={style}
                className={`group transition-colors cursor-pointer ${isDragging ? 'bg-[var(--t-surface3)] shadow-lg' : 'hover:bg-[var(--t-surface2)]'}`}
            >
                {/* Order + drag */}
                <td className="px-5 py-4 border-b border-[var(--t-border)] w-16" onClick={() => onEdit(phase)}>
                    <div className="flex items-center gap-2.5">
                        <div onClick={e => e.stopPropagation()}>
                            <DragHandle attrs={attributes} listeners={listeners} />
                        </div>
                        <span
                            className="flex items-center justify-center w-6 h-6 rounded-md text-[10px] font-black"
                            style={{
                                background: `color-mix(in srgb, var(--t-primary) 12%, transparent)`,
                                color: 'var(--t-primary)',
                                fontFamily: 'var(--f-mono)',
                                border: '1px solid color-mix(in srgb, var(--t-primary) 22%, transparent)',
                            }}
                        >
                            {phase.order}
                        </span>
                    </div>
                </td>

                {/* Name + progress */}
                <td className="px-5 py-4 border-b border-[var(--t-border)]" onClick={() => onEdit(phase)}>
                    <div className="font-semibold text-[var(--t-text)] text-[14px] leading-snug mb-2" style={{ fontFamily: 'var(--f-body)' }}>
                        {phase.name}
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex-1 max-w-[160px]">
                            <div className="h-[4px] rounded-full overflow-hidden bg-[var(--t-surface3)]" style={{ border: '1px solid var(--t-border)' }}>
                                <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{
                                        width: `${progress}%`,
                                        background: 'linear-gradient(90deg, var(--t-primary), var(--t-primary2))',
                                        boxShadow: '0 0 6px color-mix(in srgb, var(--t-primary) 30%, transparent)',
                                    }}
                                />
                            </div>
                        </div>
                        <span className="text-[9px] font-black text-[var(--t-text3)] whitespace-nowrap" style={{ fontFamily: 'var(--f-mono)' }}>
                            {completedTasks}/{totalTasks} · {progress}%
                        </span>
                    </div>
                </td>

                {/* Status */}
                <td className="px-5 py-4 border-b border-[var(--t-border)]" onClick={() => onEdit(phase)}>
                    <StatusBadge status={phase.status} />
                </td>

                {/* Budget */}
                <td className="px-5 py-4 border-b border-[var(--t-border)]" onClick={() => onEdit(phase)}>
                    <div className="text-[13px] font-bold text-[var(--t-text)]" style={{ fontFamily: 'var(--f-disp)', letterSpacing: '0.04em' }}>
                        Rs. {Number(phase.estimated_budget).toLocaleString()}
                    </div>
                    {(phase.start_date || phase.end_date) && (
                        <div className="text-[9px] text-[var(--t-text3)] mt-1 font-semibold" style={{ fontFamily: 'var(--f-mono)' }}>
                            {phase.start_date ? new Date(phase.start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—'}
                            {' → '}
                            {phase.end_date ? new Date(phase.end_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—'}
                        </div>
                    )}
                </td>

                {/* Actions */}
                <td className="px-5 py-4 border-b border-[var(--t-border)] text-right">
                    <div className="flex justify-end items-center gap-2">
                        <button
                            onClick={e => { e.stopPropagation(); onToggleExpand(phase.id); }}
                            className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all"
                            style={isExpanded
                                ? { background: 'var(--t-primary)', color: 'var(--t-bg)', border: '1px solid var(--t-primary)', fontFamily: 'var(--f-mono)' }
                                : { background: 'transparent', color: 'var(--t-primary)', border: '1px solid color-mix(in srgb, var(--t-primary) 35%, transparent)', fontFamily: 'var(--f-mono)' }
                            }
                        >
                            {isExpanded ? 'Hide' : 'Tasks'}
                        </button>
                        {canManagePhases && (
                            <button
                                onClick={e => { e.stopPropagation(); onDelete(phase.id); }}
                                className="p-1.5 rounded-lg text-[var(--t-danger)] hover:bg-[var(--t-danger)]/10 transition-all"
                                title="Delete phase"
                            >
                                <svg className="w-[15px] h-[15px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        )}
                    </div>
                </td>
            </tr>

            {/* Expanded tasks panel */}
            {isExpanded && (
                <tr className="animate-fadeIn">
                    <td colSpan="5" className="border-b border-[var(--t-border)] bg-[var(--t-surface2)]/40">
                        <div className="px-8 py-5">
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-1 h-4 rounded-full" style={{ background: 'var(--t-primary)' }} />
                                    <span className="text-[10px] font-black text-[var(--t-text)] uppercase tracking-[.25em]" style={{ fontFamily: 'var(--f-mono)' }}>
                                        Tasks · {phase.name}
                                    </span>
                                </div>
                                {canManagePhases && (
                                    <button
                                        onClick={() => onAddTask(phase.id)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border border-dashed transition-all hover:opacity-80"
                                        style={{
                                            background: `color-mix(in srgb, var(--t-primary) 8%, transparent)`,
                                            color: 'var(--t-primary)',
                                            borderColor: `color-mix(in srgb, var(--t-primary) 40%, transparent)`,
                                            fontFamily: 'var(--f-mono)',
                                        }}
                                    >
                                        + New Task
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                {tasks.length > 0 ? [...tasks].sort((a, b) => {
                                    const dA = a.due_date ? new Date(a.due_date) : null;
                                    const dB = b.due_date ? new Date(b.due_date) : null;
                                    if (dA && dB) return dA - dB;
                                    if (dA) return -1; if (dB) return 1;
                                    return new Date(b.created_at) - new Date(a.created_at);
                                }).map(t => (
                                    <div
                                        key={t.id} onClick={() => onEditTask(t)}
                                        className="relative flex justify-between items-start px-4 py-3 rounded-xl border border-[var(--t-border)] bg-[var(--t-surface)] cursor-pointer hover:border-[var(--t-primary)] transition-all group overflow-hidden"
                                    >
                                        <div
                                            className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl transition-colors"
                                            style={{ background: `color-mix(in srgb, var(--t-primary) 25%, transparent)` }}
                                        />
                                        <div className="pl-1">
                                            <div className="text-[13px] font-semibold text-[var(--t-text)] group-hover:text-[var(--t-primary)] transition-colors leading-snug" style={{ fontFamily: 'var(--f-body)' }}>
                                                {t.title}
                                            </div>
                                            <div className="flex items-center gap-2 mt-1.5">
                                                <StatusBadge status={t.status} small />
                                                <span className={`text-[8px] font-black uppercase tracking-wider ${t.priority === 'CRITICAL' ? 'text-[var(--t-danger)]' : 'text-[var(--t-text3)]'}`} style={{ fontFamily: 'var(--f-mono)' }}>
                                                    {t.priority}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-[9px] font-bold text-[var(--t-text3)] shrink-0 ml-2 mt-0.5" style={{ fontFamily: 'var(--f-mono)' }}>
                                            {t.due_date ? new Date(t.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'TBD'}
                                        </div>
                                    </div>
                                )) : (
                                    <div className="col-span-full py-8 text-center border border-dashed border-[var(--t-border)] rounded-xl">
                                        <span className="text-[10px] font-black text-[var(--t-text3)] uppercase tracking-widest">No tasks assigned to this phase</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
};

/* ─── Main Tab ────────────────────────────────────────────────────────────── */
const PhasesTab = ({ searchQuery = '' }) => {
    const { dashboardData, refreshData } = useConstruction();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({});
    const [loading, setLoading] = useState(false);
    const canManagePhases = authService.hasPermission('can_manage_phases');

    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [selectedPhase, setSelectedPhase] = useState(null);
    const [expandedPhaseId, setExpandedPhaseId] = useState(null);

    const [previewTask, setPreviewTask] = useState(null);
    const [taskModalMode, setTaskModalMode] = useState('read');

    const [confirmConfig, setConfirmConfig] = useState({ isOpen: false });
    const showConfirm = (config) => setConfirmConfig({ ...config, isOpen: true });
    const closeConfirm = () => setConfirmConfig({ ...confirmConfig, isOpen: false });

    const filteredPhases = dashboardData.phases?.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleOpenModal = (phase = null) => {
        if (phase) {
            setSelectedPhase(phase);
            setIsDetailOpen(true);
        } else {
            setEditingItem(null);
            setFormData({ status: 'PENDING', order: (dashboardData.phases?.length || 0) + 1 });
            setIsModalOpen(true);
        }
    };

    const handleToggleExpand = (phaseId) => {
        setExpandedPhaseId(expandedPhaseId === phaseId ? null : phaseId);
    };

    const handleAddTask = (phaseId) => {
        setPreviewTask({ phase: phaseId });
        setTaskModalMode('edit');
    };

    const handleEditTask = (task) => {
        setPreviewTask(task);
        setTaskModalMode('read');
    };

    const handleDelete = (id) => {
        showConfirm({
            title: "Delete Phase?",
            message: "Are you sure you want to delete this phase? This will remove all structural data and estimated budgets associated with it. This action cannot be undone.",
            confirmText: "Yes, Delete Phase",
            type: "danger",
            onConfirm: async () => {
                try {
                    await constructionService.deletePhase(id);
                    refreshData();
                    closeConfirm();
                } catch (error) {
                    alert('Delete failed. Phase might be linked to other records.');
                    closeConfirm();
                }
            }
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (editingItem) await constructionService.updatePhase(editingItem.id, formData);
            else await constructionService.createPhase(formData);
            setIsModalOpen(false);
            refreshData();
        } catch (error) {
            alert('Save failed. Please check your inputs.');
        } finally {
            setLoading(false);
        }
    };

    const handleDragEnd = async (event) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            const oldIndex = dashboardData.phases.findIndex(p => p.id === active.id);
            const newIndex = dashboardData.phases.findIndex(p => p.id === over.id);
            const newPhases = arrayMove(dashboardData.phases, oldIndex, newIndex);
            const orderUpdate = newPhases.map((phase, index) => ({ id: phase.id, order: index + 1 }));
            try {
                await constructionService.reorderPhases(orderUpdate);
                refreshData();
            } catch (error) {
                alert('Reorder failed.');
            }
        }
    };

    /* ── Label style shared across form inputs ── */
    const labelCls = "block text-[9px] font-black text-[var(--t-text3)] uppercase tracking-[0.18em] mb-1.5";
    const inputCls = "w-full bg-[var(--t-surface)] border border-[var(--t-border)] rounded-lg px-3.5 py-2.5 text-[13px] text-[var(--t-text)] outline-none focus:border-[var(--t-primary)] transition-all placeholder-[var(--t-text3)]";

    return (
        <div className="space-y-4">
            {/* Header row */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5">
                <p className="text-[13px] text-[var(--t-text2)] leading-relaxed">
                    Manage project schedule by phases and track structural units.
                </p>
                {canManagePhases && (
                    <button
                        onClick={() => handleOpenModal()}
                        className="shrink-0 px-5 py-2.5 rounded-xl hover:opacity-90 text-[11px] font-black uppercase tracking-widest transition-all shadow-md"
                        style={{
                            background: 'linear-gradient(135deg, var(--t-primary), var(--t-primary2))',
                            color: 'var(--t-bg)',
                            fontFamily: 'var(--f-mono)',
                            boxShadow: '0 4px 14px color-mix(in srgb, var(--t-primary) 30%, transparent)',
                        }}
                    >
                        + Add Phase
                    </button>
                )}
            </div>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                {/* Desktop Table */}
                <div className="hidden lg:block bg-[var(--t-surface)] rounded-2xl border border-[var(--t-border)] overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[var(--t-surface2)] border-b border-[var(--t-border)]">
                                {['#', 'Phase Overview', 'Status', 'Budget & Timeline', 'Actions'].map((h, i) => (
                                    <th
                                        key={h}
                                        className={`px-5 py-3.5 text-[9px] font-black text-[var(--t-text3)] uppercase tracking-[0.22em] ${i === 4 ? 'text-right' : ''}`}
                                        style={{ fontFamily: 'var(--f-mono)' }}
                                    >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            <SortableContext items={filteredPhases.map(p => p.id)} strategy={verticalListSortingStrategy}>
                                {filteredPhases.map(p => (
                                    <SortableRow
                                        key={p.id}
                                        phase={p}
                                        tasks={dashboardData.tasks?.filter(t => t.phase === p.id) || []}
                                        onEdit={handleOpenModal}
                                        onDelete={handleDelete}
                                        isExpanded={expandedPhaseId === p.id}
                                        onToggleExpand={handleToggleExpand}
                                        onAddTask={handleAddTask}
                                        onEditTask={handleEditTask}
                                    />
                                ))}
                            </SortableContext>
                            {filteredPhases.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-[13px] text-[var(--t-text3)] italic">
                                        No phases found matching your search.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Cards */}
                <div className="lg:hidden">
                    <SortableContext items={filteredPhases.map(p => p.id)} strategy={verticalListSortingStrategy}>
                        {filteredPhases.map(p => (
                            <SortableCard
                                key={p.id}
                                phase={p}
                                tasks={dashboardData.tasks?.filter(t => t.phase === p.id) || []}
                                onEdit={handleOpenModal}
                                onDelete={handleDelete}
                                isExpanded={expandedPhaseId === p.id}
                                onToggleExpand={handleToggleExpand}
                                onAddTask={handleAddTask}
                                onEditTask={handleEditTask}
                            />
                        ))}
                    </SortableContext>
                    {filteredPhases.length === 0 && (
                        <div className="py-12 text-center text-[13px] text-[var(--t-text3)] italic bg-[var(--t-surface)] rounded-2xl border border-dashed border-[var(--t-border)]">
                            No phases found matching your search.
                        </div>
                    )}
                </div>
            </DndContext>

            {/* Add Phase Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add New Phase" maxWidth="max-w-2xl">
                <form onSubmit={handleSubmit} className="p-5 space-y-5 bg-[var(--t-bg)]">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="col-span-full">
                            <label className={labelCls}>Phase Name</label>
                            <input
                                type="text"
                                value={formData.name || ''}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className={inputCls}
                                placeholder="e.g. Foundation & Plinth"
                                required
                            />
                        </div>

                        <div>
                            <label className={labelCls}>Display Order</label>
                            <input
                                type="number"
                                value={formData.order || 0}
                                onChange={e => setFormData({ ...formData, order: e.target.value })}
                                className={inputCls}
                                required
                            />
                        </div>

                        <div>
                            <label className={labelCls}>Est. Budget (Rs.)</label>
                            <input
                                type="number"
                                value={formData.estimated_budget || 0}
                                onChange={e => setFormData({ ...formData, estimated_budget: e.target.value })}
                                className={inputCls}
                                placeholder="0.00"
                            />
                        </div>

                        <div>
                            <label className={labelCls}>Start Date</label>
                            <input
                                type="date"
                                value={formData.start_date || ''}
                                onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                                className={inputCls}
                            />
                        </div>

                        <div>
                            <label className={labelCls}>Target End Date</label>
                            <input
                                type="date"
                                value={formData.end_date || ''}
                                onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                                className={inputCls}
                            />
                        </div>

                        <div className="col-span-full">
                            <label className={labelCls}>Initial Status</label>
                            <select
                                value={formData.status || 'PENDING'}
                                onChange={e => setFormData({ ...formData, status: e.target.value })}
                                className={inputCls + ' appearance-none cursor-pointer'}
                            >
                                <option value="PENDING">Pending (Baki Cha)</option>
                                <option value="IN_PROGRESS">In Progress (Hudai Cha)</option>
                                <option value="COMPLETED">Completed (Sakiya)</option>
                                <option value="HALTED">Halted (Rokiyeko)</option>
                            </select>
                        </div>

                        <div className="col-span-full">
                            <label className={labelCls}>Detailed Description</label>
                            <textarea
                                value={formData.description || ''}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                className={inputCls + ' min-h-[100px] resize-none'}
                                placeholder="Describe the scope of work for this phase..."
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-[var(--t-border)]">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="px-5 py-2.5 text-[11px] font-black text-[var(--t-text3)] uppercase tracking-widest hover:text-[var(--t-text)] transition-colors rounded-lg"
                            style={{ fontFamily: 'var(--f-mono)' }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-7 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-[.15em] hover:opacity-90 disabled:opacity-50 transition-all shadow-lg"
                            style={{
                                background: 'linear-gradient(135deg, var(--t-primary), var(--t-primary2))',
                                color: 'var(--t-bg)',
                                fontFamily: 'var(--f-mono)',
                            }}
                        >
                            {loading ? 'Creating…' : 'Create Phase'}
                        </button>
                    </div>
                </form>
            </Modal>

            {isDetailOpen && selectedPhase && (
                <PhaseDetailModal
                    isOpen={isDetailOpen}
                    onClose={() => { setIsDetailOpen(false); setSelectedPhase(null); }}
                    phase={selectedPhase}
                    tasks={dashboardData.tasks?.filter(t => t.phase === selectedPhase.id) || []}
                />
            )}

            <TaskPreviewModal
                isOpen={!!previewTask}
                onClose={() => setPreviewTask(null)}
                task={previewTask}
                initialMode={taskModalMode}
            />

            <ConfirmModal
                isOpen={confirmConfig.isOpen}
                title={confirmConfig.title}
                message={confirmConfig.message}
                confirmText={confirmConfig.confirmText}
                onConfirm={confirmConfig.onConfirm}
                onCancel={closeConfirm}
                type={confirmConfig.type || 'warning'}
            />

            {/* ── Help Note ── */}
            <div className="mt-12 p-6 rounded-[2rem] bg-blue-50/50 border border-blue-100 animate-in fade-in slide-in-from-bottom-8">
                <h3 className="text-lg font-black text-blue-900 mb-3 flex items-center gap-2" style={{ fontFamily: 'var(--f-body)' }}>
                    <span>💡</span> निर्माण चरण (Phases/Milestones) भनेको के हो र किन प्रयोग गर्ने? (Why use Phases/Milestones?)
                </h3>
                <div className="text-sm font-medium text-blue-800/80 space-y-4 leading-relaxed mb-6 pb-6 border-b border-blue-200/50" style={{ fontFamily: 'var(--f-body)' }}>
                    <p>
                        निर्माण चरण (Phases/Milestones) भनेको घर बनाउने समग्र कामलाई सजिलो बनाउन छुट्याइएका मुख्य खण्डहरू हुन् (जस्तै: जग खन्ने, पिलर उठाउने, ढलान गर्ने)। यसले कुन काम कहिले सुरु र सकिन्छ भनेर प्रष्ट देखाउँछ।
                    </p>
                    <ul className="list-disc list-inside space-y-2 ml-2">
                        <li><strong className="text-blue-900">प्रगति ट्र्याक गर्न (Track Progress):</strong> कुन काम सकियो र कुन बाँकी छ भनेर सजिलै हेर्न सकिन्छ।</li>
                        <li><strong className="text-blue-900">बजेट व्यवस्थापन (Budget Management):</strong> प्रत्येक चरणको लागि छुट्ट्याइएको अनुमानित बजेट र वास्तविक खर्चको तुलना गर्न।</li>
                        <li><strong className="text-blue-900">योजना बनाउन (Planning):</strong> कामलाई समयमै र व्यवस्थित तरिकाले सकाउन।</li>
                    </ul>
                </div>

                <h3 className="text-lg font-black text-blue-900 mb-3 flex items-center gap-2" style={{ fontFamily: 'var(--f-body)' }}>
                    <span>🛠️</span> प्रयोग गर्ने तरिका (How to use)
                </h3>
                <div className="text-sm font-medium text-blue-800/80 space-y-3 leading-relaxed" style={{ fontFamily: 'var(--f-body)' }}>
                    <p>
                        <strong className="text-blue-900">१. चरण थप्ने:</strong> माथि रहेको "+ Add Phase" बटनमा थिचेर नयाँ निर्माण चरण (जस्तै: Foundation) थप्नुहोस्।
                    </p>
                    <p>
                        <strong className="text-blue-900">२. कार्यहरू (Tasks) तोक्ने:</strong> प्रत्येक चरणको "Manage Tasks" मा गएर आवश्यक कामहरू (जस्तै: रड बाँध्ने, सिमेन्ट हाल्ने) थप्नुहोस्।
                    </p>
                    <p>
                        <strong className="text-blue-900">३. प्रगति अपडेट गर्ने:</strong> काम सकिँदै जाँदा चरण र कार्यको Status (जस्तै: In Progress बाट Completed) परिवर्तन गर्नुहोस्।
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PhasesTab;