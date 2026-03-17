import React, { useState } from 'react';
import { constructionService } from '../../../services/api';
import Modal from '../../common/Modal';
import PhaseDetailModal from './PhaseDetailModal';
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

const SortableCard = ({ phase, tasks = [], onEdit, onDelete }) => {
    const [isExpanded, setIsExpanded] = useState(false);
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

    return (
        <div ref={setNodeRef} style={style} className={`cyber-card mb-3 transition-all ${isDragging ? 'shadow-xl scale-[1.02] border-[var(--t-primary)]' : ''}`}>
            <div
                className="flex justify-between items-start cursor-pointer"
                onClick={() => setIsExpanded(!isExpanded)}
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
                    <svg
                        className={`w-5 h-5 text-[var(--t-text2)] transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </div>

            {isExpanded && (
                <div className="mt-4 animate-fadeIn">
                    {phase.description && (
                        <p className="text-[11px] text-[var(--t-text2)] mb-3 line-clamp-2 leading-relaxed italic" style={{ fontFamily: 'var(--f-body)' }}>
                            {phase.description}
                        </p>
                    )}

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

                    {/* Associated Tasks Section */}
                    <div className="mb-4 bg-[var(--t-surface2)] rounded-xl p-3 border border-[var(--t-border)]">
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="text-[10px] font-black text-[var(--t-primary)] uppercase tracking-widest flex items-center gap-2">
                                <span>🔧</span> Tasks ({tasks.length})
                            </h4>
                        </div>
                        {tasks.length > 0 ? (
                            <div className="space-y-1.5">
                                {tasks.map(task => (
                                    <div key={task.id} className="flex items-center justify-between bg-[var(--t-surface3)] p-2 rounded-lg text-[11px] border border-[var(--t-border2)]">
                                        <span className="font-bold text-[var(--t-text)] truncate mr-2" style={{ fontFamily: 'var(--f-body)' }}>{task.title}</span>
                                        <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase ${task.status === 'COMPLETED' ? 'bg-[var(--t-primary)]/20 text-[var(--t-primary)]' :
                                            task.status === 'IN_PROGRESS' ? 'bg-[var(--t-info)]/20 text-[var(--t-info)]' :
                                                'bg-[var(--t-surface)] text-[var(--t-text3)] border border-[var(--t-border)]'
                                            }`}>
                                            {task.status === 'IN_PROGRESS' ? 'Active' : task.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-[10px] text-[var(--t-text3)] italic">No tasks assigned yet.</p>
                        )}
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => onEdit(phase)}
                            className="flex-1 py-2.5 bg-[var(--t-surface3)] text-[var(--t-text)] border border-[var(--t-border)] rounded-xl text-xs font-bold hover:border-[var(--t-primary)] transition-colors"
                        >
                            Edit Details
                        </button>
                        <button
                            onClick={() => onDelete(phase.id)}
                            className="px-4 py-2.5 bg-[var(--t-danger)]/10 text-[var(--t-danger)] border border-[var(--t-danger)]/30 rounded-xl text-xs font-bold hover:bg-[var(--t-danger)]/20 transition-colors"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const SortableRow = ({ phase, tasks = [], onEdit, onDelete }) => {
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

    return (
        <tr ref={setNodeRef} style={style} className={`hover:bg-[var(--t-surface2)] transition-colors ${isDragging ? 'bg-[var(--t-surface3)] shadow-lg relative' : ''}`}>
            <td className="px-6 py-4 border-b border-[var(--t-border)]">
                <div className="flex items-center gap-3">
                    <div className="cursor-move p-1 text-[var(--t-text2)] hover:text-[var(--t-primary)]" {...attributes} {...listeners}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8h16M4 16h16" />
                        </svg>
                    </div>
                    <span className="font-bold text-[var(--t-text)] bg-[var(--t-surface3)] px-2 py-0.5 rounded text-xs border border-[var(--t-border)]" style={{ fontFamily: 'var(--f-mono)' }}>{phase.order}</span>
                </div>
            </td>
            <td className="px-6 py-4 border-b border-[var(--t-border)]">
                <div className="text-[var(--t-text)] font-bold" style={{ fontFamily: 'var(--f-body)' }}>{phase.name}</div>
                {phase.description && (
                    <div className="text-[10px] text-[var(--t-text2)] mt-0.5 line-clamp-1 italic max-w-xs">
                        {phase.description}
                    </div>
                )}
                <div className="flex flex-wrap gap-1.5 mt-2">
                    {tasks.length > 0 ? (
                        tasks.slice(0, 3).map(task => (
                            <div key={task.id} className="flex items-center gap-1.5 bg-[var(--t-surface3)] px-2 py-1 rounded-md text-[10px] font-bold text-[var(--t-text2)] whitespace-nowrap border border-[var(--t-border)]">
                                <span className={task.status === 'COMPLETED' ? 'text-[var(--t-primary)]' : 'text-[var(--t-info)]'}>●</span>
                                {task.title}
                            </div>
                        ))
                    ) : (
                        <span className="text-[10px] text-[var(--t-text3)] font-medium italic">No tasks</span>
                    )}
                    {tasks.length > 3 && (
                        <div className="bg-[var(--t-surface2)] px-2 py-1 rounded-md text-[10px] font-black text-[var(--t-text)] border border-[var(--t-border2)]">
                            +{tasks.length - 3} MORE
                        </div>
                    )}
                </div>
            </td>
            <td className="px-6 py-4 text-xs font-bold border-b border-[var(--t-border)]">
                <span className={`px-2.5 py-1 rounded-full uppercase ${phase.status === 'COMPLETED' ? 'bg-[var(--t-primary)]/20 text-[var(--t-primary)]' :
                    phase.status === 'IN_PROGRESS' ? 'bg-[var(--t-info)]/20 text-[var(--t-info)]' :
                        phase.status === 'HALTED' ? 'bg-[var(--t-danger)]/20 text-[var(--t-danger)]' :
                            'bg-[var(--t-surface3)] text-[var(--t-text2)]'
                    }`} style={{ fontFamily: 'var(--f-mono)' }}>
                    {phase.status}
                </span>
            </td>
            <td className="px-6 py-4 font-black text-[var(--t-text)] text-sm border-b border-[var(--t-border)]" style={{ fontFamily: 'var(--f-disp)', letterSpacing: '1px' }}>Rs. {Number(phase.estimated_budget).toLocaleString()}</td>
            <td className="px-6 py-4 text-right space-x-3 border-b border-[var(--t-border)]">
                <button onClick={() => onEdit(phase)} className="text-[var(--t-primary)] hover:opacity-80 font-bold text-xs uppercase tracking-widest" style={{ fontFamily: 'var(--f-mono)' }}>Edit</button>
                <button onClick={() => onDelete(phase.id)} className="text-[var(--t-danger)] hover:opacity-80 font-bold text-xs uppercase tracking-widest" style={{ fontFamily: 'var(--f-mono)' }}>Delete</button>
            </td>
        </tr>
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

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this Phase?')) return;
        try {
            await constructionService.deletePhase(id);
            refreshData();
        } catch (error) {
            alert('Delete failed. Phase might be linked to other records.');
        }
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
                <p className="text-sm text-[var(--t-text2)]">Manage construction timeline and budget allocation per phase.</p>
                <div className="flex-1 sm:hidden"></div> {/* Takes up space to push button right */}
                <button
                    onClick={() => handleOpenModal()}
                    className="w-full sm:w-auto px-4 py-2.5 bg-[var(--t-primary)] text-[var(--t-bg)] rounded-[2px] hover:opacity-90 font-['DM_Mono',monospace] uppercase tracking-widest text-[10px] sm:text-xs transition-colors shadow-sm"
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
                                <th className="px-6 py-4 text-xs font-bold text-[var(--t-text2)] uppercase tracking-wider" style={{ fontFamily: 'var(--f-mono)' }}>Order</th>
                                <th className="px-6 py-4 text-xs font-bold text-[var(--t-text2)] uppercase tracking-wider" style={{ fontFamily: 'var(--f-mono)' }}>Phase Name</th>
                                <th className="px-6 py-4 text-xs font-bold text-[var(--t-text2)] uppercase tracking-wider" style={{ fontFamily: 'var(--f-mono)' }}>Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-[var(--t-text2)] uppercase tracking-wider" style={{ fontFamily: 'var(--f-mono)' }}>Estimated Budget</th>
                                <th className="px-6 py-4 text-xs font-bold text-[var(--t-text2)] uppercase tracking-wider text-right" style={{ fontFamily: 'var(--f-mono)' }}>Actions</th>
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

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add New Phase">
                <form onSubmit={handleSubmit} className="space-y-4 p-1">
                    <div>
                        <label className="block text-sm font-semibold text-[var(--t-text2)] mb-1">Phase Name</label>
                        <input
                            type="text"
                            value={formData.name || ''}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="cyber-input w-full rounded-xl border border-[var(--t-border)] bg-[var(--t-surface2)] text-[var(--t-text)] shadow-sm focus:ring-2 focus:ring-[var(--t-primary)] focus:border-[var(--t-primary)] p-3 outline-none"
                            placeholder="e.g. Foundation & Plinth"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-[var(--t-text2)] mb-1">Order</label>
                            <input
                                type="number"
                                value={formData.order || 0}
                                onChange={e => setFormData({ ...formData, order: e.target.value })}
                                className="cyber-input w-full rounded-xl border border-[var(--t-border)] bg-[var(--t-surface2)] text-[var(--t-text)] shadow-sm focus:ring-2 focus:ring-[var(--t-primary)] focus:border-[var(--t-primary)] p-3 outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-[var(--t-text2)] mb-1">Estimated Budget (Rs.)</label>
                            <input
                                type="number"
                                value={formData.estimated_budget || 0}
                                onChange={e => setFormData({ ...formData, estimated_budget: e.target.value })}
                                className="cyber-input w-full rounded-xl border border-[var(--t-border)] bg-[var(--t-surface2)] text-[var(--t-text)] shadow-sm focus:ring-2 focus:ring-[var(--t-primary)] focus:border-[var(--t-primary)] p-3 outline-none"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-[var(--t-text2)] mb-1">Start Date</label>
                            <input
                                type="date"
                                value={formData.start_date || ''}
                                onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                                className="cyber-input w-full rounded-xl border border-[var(--t-border)] bg-[var(--t-surface2)] text-[var(--t-text)] shadow-sm focus:ring-2 focus:ring-[var(--t-primary)] focus:border-[var(--t-primary)] p-3 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-[var(--t-text2)] mb-1">End Date</label>
                            <input
                                type="date"
                                value={formData.end_date || ''}
                                onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                                className="cyber-input w-full rounded-xl border border-[var(--t-border)] bg-[var(--t-surface2)] text-[var(--t-text)] shadow-sm focus:ring-2 focus:ring-[var(--t-primary)] focus:border-[var(--t-primary)] p-3 outline-none"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-[var(--t-text2)] mb-1">Status</label>
                        <select
                            value={formData.status || 'PENDING'}
                            onChange={e => setFormData({ ...formData, status: e.target.value })}
                            className="cyber-input w-full rounded-xl border border-[var(--t-border)] bg-[var(--t-surface2)] text-[var(--t-text)] shadow-sm focus:ring-2 focus:ring-[var(--t-primary)] focus:border-[var(--t-primary)] p-3 outline-none appearance-none"
                        >
                            <option value="PENDING">Pending (Baki Cha)</option>
                            <option value="IN_PROGRESS">In Progress (Hudai Cha)</option>
                            <option value="COMPLETED">Completed (Sakiya)</option>
                            <option value="HALTED">Halted (Rokiyeko)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-[var(--t-text2)] mb-1">Description</label>
                        <textarea
                            value={formData.description || ''}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            className="cyber-input w-full rounded-xl border border-[var(--t-border)] bg-[var(--t-surface2)] text-[var(--t-text)] shadow-sm focus:ring-2 focus:ring-[var(--t-primary)] focus:border-[var(--t-primary)] p-3 outline-none min-h-[100px] text-sm"
                            placeholder="Detailed description of the phase work..."
                        />
                    </div>
                    <div className="flex justify-end gap-3 mt-8">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-sm font-bold text-[var(--t-text2)] hover:text-[var(--t-text)]">Cancel</button>
                        <button type="submit" disabled={loading} className="px-8 py-2.5 bg-[var(--t-primary)] text-[var(--t-bg)] rounded-xl font-bold shadow-lg hover:bg-[var(--t-primary2)] disabled:opacity-50 transition-all">
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
        </div>
    );
};

export default PhasesTab;
