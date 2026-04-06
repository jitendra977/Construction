import React, { useState } from 'react';
import { constructionService } from '../../../services/api';
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

const SortableCard = ({ phase, tasks = [], onEdit, onDelete, isExpanded, onToggleExpand, onAddTask, onEditTask }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: phase.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 100 : 'auto',
    };

    const completedTasks = tasks.filter(t => t.status === 'COMPLETED').length;
    const totalTasks = tasks.length;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return (
        <div ref={setNodeRef} style={style} className={`cyber-card mb-3 transition-all ${isDragging ? 'shadow-xl scale-[1.02] border-[var(--t-primary)]' : ''}`}>
            <div
                className="flex justify-between items-start cursor-pointer hover:bg-[var(--t-surface2)] transition-colors p-4"
                onClick={() => onEdit(phase)}
            >
                <div className="flex items-center gap-3">
                    <div
                        className="cursor-move p-2 -ml-2 text-[var(--t-text2)] hover:text-[var(--t-primary)] active:scale-125 transition-all"
                        {...attributes}
                        {...listeners}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8h16M4 16h16" />
                        </svg>
                    </div>
                    <div>
                        <div className="text-[10px] font-black text-[var(--t-text2)] uppercase tracking-widest" style={{ fontFamily: 'var(--f-mono)' }}>Phase {phase.order}</div>
                        <h3 className="font-bold text-[var(--t-text)]" style={{ fontFamily: 'var(--f-body)' }}>{phase.name}</h3>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${phase.status === 'COMPLETED' ? 'bg-[var(--t-primary)]/20 text-[var(--t-primary)]' :
                        phase.status === 'IN_PROGRESS' ? 'bg-[var(--t-info)]/20 text-[var(--t-info)]' :
                            phase.status === 'HALTED' ? 'bg-[var(--t-danger)]/20 text-[var(--t-danger)]' :
                                'bg-[var(--t-surface3)] text-[var(--t-text2)]'
                        }`}>
                        {phase.status}
                    </span>
                </div>
            </div>

            <div className="px-4 pb-4">
                {/* Progress Bar Section (Replacing Task List) */}
                <div className="mb-4 bg-[var(--t-surface2)] rounded-xl p-3 border border-[var(--t-border)]">
                    <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                            <span className="text-xs">📊</span>
                            <span className="text-[10px] font-black text-[var(--t-text2)] uppercase tracking-widest">Progress</span>
                        </div>
                        <span className="text-[10px] font-black text-[var(--t-primary)] uppercase tracking-tight">
                            {completedTasks}/{totalTasks} Tasks ({progress}%)
                        </span>
                    </div>
                    <div className="w-full bg-[var(--t-surface3)] h-1.5 rounded-full overflow-hidden border border-[var(--t-border)]">
                        <div 
                            className="h-full bg-gradient-to-r from-[var(--t-primary)] to-[var(--t-primary2)] transition-all duration-500 ease-out shadow-[0_0_10px_rgba(var(--t-primary-rgb),0.3)]"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                </div>

                <div className="flex justify-between items-center bg-[var(--t-surface2)] border border-[var(--t-border)] rounded-xl p-3 mb-3">
                    <div>
                        <div className="text-[9px] font-bold text-[var(--t-text2)] uppercase tracking-tighter" style={{ fontFamily: 'var(--f-mono)' }}>Est. Budget</div>
                        <div className="text-sm font-black text-[var(--t-text)]" style={{ fontFamily: 'var(--f-disp)', letterSpacing: '1px' }}>Rs. {Number(phase.estimated_budget).toLocaleString()}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-[9px] font-bold text-[var(--t-text2)] uppercase tracking-tighter" style={{ fontFamily: 'var(--f-mono)' }}>Timeline</div>
                        <div className="text-[11px] font-bold text-[var(--t-text3)]">
                            {phase.start_date ? new Date(phase.start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'TBD'} -
                            {phase.end_date ? new Date(phase.end_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'TBD'}
                        </div>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => onToggleExpand(phase.id)}
                        className={`flex-1 py-2.5 border rounded-xl text-xs font-bold transition-colors ${isExpanded ? 'bg-[var(--t-primary)] text-[var(--t-bg)] border-[var(--t-primary)]' : 'bg-[var(--t-surface3)] text-[var(--t-text)] border-[var(--t-border)] hover:border-[var(--t-primary)]'}`}
                    >
                        {isExpanded ? 'Hide Tasks' : 'Manage Tasks'}
                    </button>
                    <button
                        onClick={() => onEdit(phase)}
                        className="px-4 py-2.5 bg-[var(--t-surface3)] text-[var(--t-text)] border border-[var(--t-border)] rounded-xl text-xs font-bold hover:border-[var(--t-primary)] transition-colors"
                    >
                        Phase Details
                    </button>
                </div>

                {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-[var(--t-border)] space-y-3 animate-fadeIn">
                        <div className="flex justify-between items-center bg-[var(--t-surface2)] p-2 rounded-lg">
                             <h4 className="text-[10px] font-black text-[var(--t-text)] uppercase tracking-widest">Tasks List</h4>
                             <button onClick={() => onAddTask(phase.id)} className="text-[10px] font-black text-[var(--t-primary)] uppercase underline">[+ ADD TASK]</button>
                        </div>
                        {tasks.length > 0 ? [...tasks].sort((a, b) => {
                            const dateA = a.due_date ? new Date(a.due_date) : null;
                            const dateB = b.due_date ? new Date(b.due_date) : null;
                            if (dateA && dateB) return dateA - dateB;
                            if (dateA) return -1;
                            if (dateB) return 1;
                            return new Date(b.created_at) - new Date(a.created_at);
                        }).map(t => (
                            <div key={t.id} onClick={() => onEditTask(t)} className="bg-[var(--t-surface2)] p-3 rounded-xl border border-[var(--t-border)] flex justify-between items-center group cursor-pointer hover:border-[var(--t-primary)] transition-all">
                                <div>
                                    <div className="text-xs font-bold text-[var(--t-text)]">{t.title}</div>
                                    <div className="text-[9px] text-[var(--t-text3)] mt-1 uppercase font-black">{t.status} • {t.priority}</div>
                                </div>
                                <div className="text-[var(--t-primary)] opacity-0 group-hover:opacity-100 transition-opacity">➔</div>
                            </div>
                        )) : (
                            <div className="text-center py-4 text-[10px] text-[var(--t-text3)] italic">No tasks assigned yet.</div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

const SortableRow = ({ phase, tasks = [], onEdit, onDelete, isExpanded, onToggleExpand, onAddTask, onEditTask }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: phase.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 'auto',
    };

    const completedTasks = tasks.filter(t => t.status === 'COMPLETED').length;
    const totalTasks = tasks.length;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return (
        <>
        <tr ref={setNodeRef} style={style} 
            className={`hover:bg-[var(--t-surface2)] transition-colors cursor-pointer group ${isDragging ? 'bg-[var(--t-surface3)] shadow-lg relative' : ''}`}>
            <td className="px-6 py-4 border-b border-[var(--t-border)]" onClick={() => onEdit(phase)}>
                <div className="flex items-center gap-3">
                    <div className="cursor-move p-1 text-[var(--t-text2)] hover:text-[var(--t-primary)]" {...attributes} {...listeners} onClick={(e) => e.stopPropagation()}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8h16M4 16h16" />
                        </svg>
                    </div>
                    <span className="font-bold text-[var(--t-text)] bg-[var(--t-surface3)] px-2 py-0.5 rounded text-xs border border-[var(--t-border)]" style={{ fontFamily: 'var(--f-mono)' }}>{phase.order}</span>
                </div>
            </td>
            <td className="px-6 py-4 border-b border-[var(--t-border)]" onClick={() => onEdit(phase)}>
                <div className="text-[var(--t-text)] font-bold text-sm" style={{ fontFamily: 'var(--f-body)' }}>{phase.name}</div>
                <div className="flex items-center gap-4 mt-2">
                    <div className="flex-1 max-w-[150px]">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-[8px] font-black text-[var(--t-text3)] uppercase tracking-tighter">Progress</span>
                            <span className="text-[8px] font-black text-[var(--t-primary)]">{progress}%</span>
                        </div>
                        <div className="w-full bg-[var(--t-surface3)] h-1 rounded-full overflow-hidden border border-[var(--t-border2)]">
                            <div 
                                className="h-full bg-[var(--t-primary)] transition-all duration-500 shadow-[0_0_8px_rgba(var(--t-primary-rgb),0.2)]"
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                    </div>
                    <div className="text-[9px] font-black text-[var(--t-text2)] bg-[var(--t-surface2)] px-2 py-0.5 rounded border border-[var(--t-border)] uppercase tracking-tighter">
                        ✅ {completedTasks}/{totalTasks}
                    </div>
                </div>
            </td>
            <td className="px-6 py-4 text-xs font-bold border-b border-[var(--t-border)]" onClick={() => onEdit(phase)}>
                <span className={`px-2.5 py-1 rounded-full uppercase text-[10px] ${phase.status === 'COMPLETED' ? 'bg-[var(--t-primary)]/20 text-[var(--t-primary)]' :
                    phase.status === 'IN_PROGRESS' ? 'bg-[var(--t-info)]/20 text-[var(--t-info)]' :
                        phase.status === 'HALTED' ? 'bg-[var(--t-danger)]/20 text-[var(--t-danger)]' :
                            'bg-[var(--t-surface3)] text-[var(--t-text2)]'
                    }`} style={{ fontFamily: 'var(--f-mono)' }}>
                    {phase.status}
                </span>
            </td>
            <td className="px-6 py-4 font-black text-[var(--t-text)] text-sm border-b border-[var(--t-border)]" style={{ fontFamily: 'var(--f-disp)', letterSpacing: '1px' }} onClick={() => onEdit(phase)}>Rs. {Number(phase.estimated_budget).toLocaleString()}</td>
            <td className="px-6 py-4 text-right border-b border-[var(--t-border)]">
                <div className="flex justify-end items-center gap-3">
                    <button 
                        onClick={(e) => { e.stopPropagation(); onToggleExpand(phase.id); }} 
                        className={`px-3 py-1.5 rounded-sm font-black text-[9px] uppercase tracking-widest border transition-all ${isExpanded ? 'bg-[var(--t-primary)] text-[var(--t-bg)] border-[var(--t-primary)]' : 'bg-transparent text-[var(--t-primary)] border-[var(--t-primary)]/30 hover:bg-[var(--t-primary)]/10'}`}
                        style={{ fontFamily: 'var(--f-mono)' }}
                    >
                        {isExpanded ? '[ HIDE TASKS ]' : '[ VIEW TASKS ]'}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(phase.id); }} className="text-[var(--t-danger)] hover:scale-125 transition-all p-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>
            </td>
        </tr>
        {isExpanded && (
            <tr className="bg-[var(--t-surface2)]/30 animate-fadeIn">
                <td colSpan="5" className="px-10 py-6 border-b border-[var(--t-border)]">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="text-[10px] font-black text-[var(--t-text)] uppercase tracking-[.3em]" style={{ fontFamily: 'var(--f-mono)' }}>Structural Tasks Matrix</h4>
                        <button onClick={() => onAddTask(phase.id)} className="px-3 py-1 bg-[var(--t-primary)]/10 text-[var(--t-primary)] border border-dashed border-[var(--t-primary)]/50 text-[9px] font-black uppercase tracking-widest hover:bg-[var(--t-primary)]/20 transition-all rounded-sm">
                            + ADD NEW TASK
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {tasks.length > 0 ? [...tasks].sort((a, b) => {
                            const dateA = a.due_date ? new Date(a.due_date) : null;
                            const dateB = b.due_date ? new Date(b.due_date) : null;
                            if (dateA && dateB) return dateA - dateB;
                            if (dateA) return -1;
                            if (dateB) return 1;
                            return new Date(b.created_at) - new Date(a.created_at);
                        }).map(t => (
                            <div key={t.id} onClick={() => onEditTask(t)} className="bg-[var(--t-surface)] p-3 rounded-sm border border-[var(--t-border)] flex justify-between items-start group cursor-pointer hover:border-[var(--t-primary)] hover:shadow-lg transition-all relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-[var(--t-primary)]/20 group-hover:bg-[var(--t-primary)] transition-colors"></div>
                                <div className="pl-2">
                                    <div className="text-[13px] font-bold text-[var(--t-text)] group-hover:text-[var(--t-primary)] transition-colors" style={{ fontFamily: 'var(--f-body)' }}>{t.title}</div>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <span className={`text-[8px] font-black px-1 py-0.5 rounded-sm border ${
                                            t.status === 'COMPLETED' ? 'bg-[var(--t-primary)]/10 text-[var(--t-primary)] border-[var(--t-primary)]/20' : 'bg-[var(--t-surface3)] text-[var(--t-text3)] border-[var(--t-border)]'
                                        }`} style={{ fontFamily: 'var(--f-mono)' }}>{t.status}</span>
                                        <span className={`text-[8px] font-black ${t.priority === 'CRITICAL' ? 'text-[var(--t-danger)]' : 'text-[var(--t-text3)]'}`} style={{ fontFamily: 'var(--f-mono)' }}>{t.priority}</span>
                                    </div>
                                </div>
                                <div className="text-xs text-[var(--t-text3)] font-black uppercase tracking-tighter" style={{ fontFamily: 'var(--f-mono)' }}>
                                    {t.due_date ? new Date(t.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'TBD'}
                                </div>
                            </div>
                        )) : (
                            <div className="col-span-full py-8 text-center border border-dashed border-[var(--t-border2)] rounded-sm grayscale opacity-50">
                                <span className="text-[10px] font-black text-[var(--t-text3)] uppercase tracking-widest">No tasks initialized for this node</span>
                            </div>
                        )}
                    </div>
                </td>
            </tr>
        )}
        </>
    );
};

const PhasesTab = ({ searchQuery = '' }) => {
    const { dashboardData, refreshData } = useConstruction();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({});
    const [loading, setLoading] = useState(false);

    // Detail Modal State
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [selectedPhase, setSelectedPhase] = useState(null);
    const [expandedPhaseId, setExpandedPhaseId] = useState(null);

    // Task CRUD State
    const [previewTask, setPreviewTask] = useState(null);
    const [taskModalMode, setTaskModalMode] = useState('read');

    // Confirmation Modal System
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
            const oldIndex = dashboardData.phases.findIndex((p) => p.id === active.id);
            const newIndex = dashboardData.phases.findIndex((p) => p.id === over.id);
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

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                <p className="text-sm text-[var(--t-text2)] font-medium">Manage project schedule by phases and track structural structural units.</p>
                <div className="flex-1 sm:hidden"></div> {/* Takes up space to push button right */}
                <button
                    onClick={() => handleOpenModal()}
                    className="w-full sm:w-auto px-4 py-2.5 bg-[var(--t-primary)] text-[var(--t-bg)] rounded-[2px] hover:opacity-90 uppercase tracking-widest text-[10px] sm:text-xs transition-colors shadow-sm"
                    style={{ fontFamily: 'var(--f-mono)' }}
                >
                    + Add New Phase
                </button>
            </div>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                {/* Desktop View: Table */}
                <div className="hidden lg:block bg-[var(--t-surface)] rounded-xl shadow-sm border border-[var(--t-border)] overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[var(--t-surface2)] border-b border-[var(--t-border)]">
                                <th className="px-6 py-4 text-[10px] font-black text-[var(--t-text3)] uppercase tracking-[.2em]" style={{ fontFamily: 'var(--f-mono)' }}>Order</th>
                                <th className="px-6 py-4 text-[10px] font-black text-[var(--t-text3)] uppercase tracking-[.2em]" style={{ fontFamily: 'var(--f-mono)' }}>Phase Overview</th>
                                <th className="px-6 py-4 text-[10px] font-black text-[var(--t-text3)] uppercase tracking-[.2em]" style={{ fontFamily: 'var(--f-mono)' }}>Status</th>
                                <th className="px-6 py-4 text-[10px] font-black text-[var(--t-text3)] uppercase tracking-[.2em]" style={{ fontFamily: 'var(--f-mono)' }}>Est. Budget</th>
                                <th className="px-6 py-4 text-[10px] font-black text-[var(--t-text3)] uppercase tracking-[.2em] text-right" style={{ fontFamily: 'var(--f-mono)' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--t-border)]">
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
                                    <td colSpan="5" className="px-6 py-10 text-center text-[var(--t-text3)] italic">No phases found matching your search.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile View: Vertically Stacked List */}
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
                        <div className="py-10 text-center text-[var(--t-text3)] italic bg-[var(--t-surface)] rounded-2xl border border-dashed border-[var(--t-border)]">
                            No phases found matching your search.
                        </div>
                    )}
                </div>
            </DndContext>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add New Phase" maxWidth="max-w-2xl">
                <form onSubmit={handleSubmit} className="p-4 space-y-6 bg-[var(--t-bg)]">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="col-span-full">
                            <label className="block text-[10px] font-black text-[var(--t-text3)] uppercase tracking-widest mb-2">Phase Name</label>
                            <input
                                type="text"
                                value={formData.name || ''}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full bg-[var(--t-surface)] border border-[var(--t-border)] rounded-[2px] px-4 py-3 text-sm text-[var(--t-text)] outline-none focus:border-[var(--t-primary)] transition-all placeholder-[var(--t-text3)]"
                                placeholder="e.g. Foundation & Plinth"
                                required
                            />
                        </div>
                        
                        <div>
                            <label className="block text-[10px] font-black text-[var(--t-text3)] uppercase tracking-widest mb-2">Display Order</label>
                            <input
                                type="number"
                                value={formData.order || 0}
                                onChange={e => setFormData({ ...formData, order: e.target.value })}
                                className="w-full bg-[var(--t-surface)] border border-[var(--t-border)] rounded-[2px] px-4 py-3 text-sm text-[var(--t-text)] outline-none focus:border-[var(--t-primary)] transition-all"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-[var(--t-text3)] uppercase tracking-widest mb-2">Est. Budget (Rs.)</label>
                            <input
                                type="number"
                                value={formData.estimated_budget || 0}
                                onChange={e => setFormData({ ...formData, estimated_budget: e.target.value })}
                                className="w-full bg-[var(--t-surface)] border border-[var(--t-border)] rounded-[2px] px-4 py-3 text-sm text-[var(--t-text)] outline-none focus:border-[var(--t-primary)] transition-all"
                                placeholder="0.00"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-[var(--t-text3)] uppercase tracking-widest mb-2">Start Date</label>
                            <input
                                type="date"
                                value={formData.start_date || ''}
                                onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                                className="w-full bg-[var(--t-surface)] border border-[var(--t-border)] rounded-[2px] px-4 py-3 text-sm text-[var(--t-text)] outline-none focus:border-[var(--t-primary)] transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-[var(--t-text3)] uppercase tracking-widest mb-2">Target End Date</label>
                            <input
                                type="date"
                                value={formData.end_date || ''}
                                onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                                className="w-full bg-[var(--t-surface)] border border-[var(--t-border)] rounded-[2px] px-4 py-3 text-sm text-[var(--t-text)] outline-none focus:border-[var(--t-primary)] transition-all"
                            />
                        </div>

                        <div className="col-span-full">
                            <label className="block text-[10px] font-black text-[var(--t-text3)] uppercase tracking-widest mb-2">Initial Status</label>
                            <select
                                value={formData.status || 'PENDING'}
                                onChange={e => setFormData({ ...formData, status: e.target.value })}
                                className="w-full bg-[var(--t-surface)] border border-[var(--t-border)] rounded-[2px] px-4 py-3 text-sm text-[var(--t-text)] outline-none focus:border-[var(--t-primary)] transition-all appearance-none"
                            >
                                <option value="PENDING">Pending (Baki Cha)</option>
                                <option value="IN_PROGRESS">In Progress (Hudai Cha)</option>
                                <option value="COMPLETED">Completed (Sakiya)</option>
                                <option value="HALTED">Halted (Rokiyeko)</option>
                            </select>
                        </div>

                        <div className="col-span-full">
                            <label className="block text-[10px] font-black text-[var(--t-text3)] uppercase tracking-widest mb-2">Detailed Description</label>
                            <textarea
                                value={formData.description || ''}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                className="w-full bg-[var(--t-surface)] border border-[var(--t-border)] rounded-[2px] px-4 py-3 text-sm text-[var(--t-text)] outline-none focus:border-[var(--t-primary)] transition-all min-h-[120px] resize-none"
                                placeholder="Describe the scope of work for this phase..."
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-4 pt-6 mt-6 border-t border-[var(--t-border)]">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-xs font-black text-[var(--t-text3)] uppercase tracking-widest hover:text-[var(--t-text)] transition-colors">Cancel</button>
                        <button type="submit" disabled={loading} className="px-8 py-2.5 bg-gradient-to-r from-[var(--t-primary)] to-[var(--t-primary2)] text-[var(--t-bg)] rounded-[2px] text-xs font-black uppercase tracking-[.2em] shadow-lg hover:opacity-90 disabled:opacity-50 transition-all">
                            {loading ? 'Creating...' : 'Create Phase'}
                        </button>
                    </div>
                </form>
            </Modal>

            {isDetailOpen && selectedPhase && (
                <PhaseDetailModal
                    isOpen={isDetailOpen}
                    onClose={() => {
                        setIsDetailOpen(false);
                        setSelectedPhase(null);
                    }}
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
        </div>
    );
};

export default PhasesTab;
