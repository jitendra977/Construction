import React, { useState } from 'react';
import { constructionService } from '../../../services/api';
import Modal from '../../common/Modal';
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

const SortableCard = ({ phase, onEdit, onDelete }) => {
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
        <div ref={setNodeRef} style={style} className={`bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-3 transition-all ${isDragging ? 'shadow-xl scale-[1.02] border-indigo-200' : ''}`}>
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                    <div className="cursor-move p-2 -ml-2 text-gray-400 hover:text-indigo-600 active:scale-125 transition-all" {...attributes} {...listeners}>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8h16M4 16h16" />
                        </svg>
                    </div>
                    <div>
                        <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Phase {phase.order}</div>
                        <h3 className="font-bold text-gray-900">{phase.name}</h3>
                    </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${phase.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                    phase.status === 'IN_PROGRESS' ? 'bg-indigo-100 text-indigo-700' :
                        phase.status === 'HALTED' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-500'
                    }`}>
                    {phase.status}
                </span>
            </div>

            <div className="flex justify-between items-center bg-gray-50 rounded-xl p-3 mb-3">
                <div>
                    <div className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Est. Budget</div>
                    <div className="text-sm font-black text-gray-900">Rs. {Number(phase.estimated_budget).toLocaleString()}</div>
                </div>
                <div className="text-right">
                    <div className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Timeline</div>
                    <div className="text-[11px] font-bold text-gray-600">
                        {phase.start_date ? new Date(phase.start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'TBD'} -
                        {phase.end_date ? new Date(phase.end_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'TBD'}
                    </div>
                </div>
            </div>

            <div className="flex gap-2">
                <button
                    onClick={() => onEdit(phase)}
                    className="flex-1 py-2.5 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-colors"
                >
                    Edit Details
                </button>
                <button
                    onClick={() => onDelete(phase.id)}
                    className="px-4 py-2.5 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors"
                >
                    Delete
                </button>
            </div>
        </div>
    );
};

const SortableRow = ({ phase, onEdit, onDelete }) => {
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
        <tr ref={setNodeRef} style={style} className={`hover:bg-gray-50 transition-colors ${isDragging ? 'bg-indigo-50 shadow-lg relative' : ''}`}>
            <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                    <div className="cursor-move p-1 text-gray-400 hover:text-indigo-600" {...attributes} {...listeners}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8h16M4 16h16" />
                        </svg>
                    </div>
                    <span className="font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded text-xs">{phase.order}</span>
                </div>
            </td>
            <td className="px-6 py-4 text-gray-700 font-semibold">{phase.name}</td>
            <td className="px-6 py-4">
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${phase.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                    phase.status === 'IN_PROGRESS' ? 'bg-indigo-100 text-indigo-700' :
                        phase.status === 'HALTED' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-500'
                    }`}>
                    {phase.status}
                </span>
            </td>
            <td className="px-6 py-4 font-bold text-gray-900 text-sm">Rs. {Number(phase.estimated_budget).toLocaleString()}</td>
            <td className="px-6 py-4 text-right space-x-3">
                <button onClick={() => onEdit(phase)} className="text-indigo-600 hover:text-indigo-900 font-semibold text-sm">Edit</button>
                <button onClick={() => onDelete(phase.id)} className="text-red-600 hover:text-red-900 font-semibold text-sm">Delete</button>
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

    const filteredPhases = dashboardData.phases?.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleOpenModal = (phase = null) => {
        setEditingItem(phase);
        setFormData(phase ? { ...phase } : { status: 'PENDING', order: (dashboardData.phases?.length || 0) + 1 });
        setIsModalOpen(true);
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
            <div className="flex justify-between items-center mb-2">
                <p className="text-sm text-gray-500 hidden sm:block">Manage construction timeline and budget allocation per phase.</p>
                <div className="sm:hidden" /> {/* Spacer for mobile */}
                <button
                    onClick={() => handleOpenModal()}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors shadow-sm text-sm"
                >
                    + Add New Phase
                </button>
            </div>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                {/* Desktop View: Table */}
                <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Order</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Phase Name</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Estimated Budget</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            <SortableContext items={filteredPhases.map(p => p.id)} strategy={verticalListSortingStrategy}>
                                {filteredPhases.map(p => (
                                    <SortableRow key={p.id} phase={p} onEdit={handleOpenModal} onDelete={handleDelete} />
                                ))}
                            </SortableContext>
                            {filteredPhases.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="px-6 py-10 text-center text-gray-400 italic">No phases found matching your search.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile View: Vertically Stacked List */}
                <div className="lg:hidden">
                    <SortableContext items={filteredPhases.map(p => p.id)} strategy={verticalListSortingStrategy}>
                        {filteredPhases.map(p => (
                            <SortableCard key={p.id} phase={p} onEdit={handleOpenModal} onDelete={handleDelete} />
                        ))}
                    </SortableContext>
                    {filteredPhases.length === 0 && (
                        <div className="py-10 text-center text-gray-400 italic bg-white rounded-2xl border-2 border-dashed border-gray-100">
                            No phases found matching your search.
                        </div>
                    )}
                </div>
            </DndContext>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`${editingItem ? 'Edit' : 'Add'} Phase`}>
                <form onSubmit={handleSubmit} className="space-y-4 p-1">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Phase Name</label>
                        <input
                            type="text"
                            value={formData.name || ''}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none"
                            placeholder="e.g. Foundation & Plinth"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Order</label>
                            <input
                                type="number"
                                value={formData.order || 0}
                                onChange={e => setFormData({ ...formData, order: e.target.value })}
                                className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Estimated Budget (Rs.)</label>
                            <input
                                type="number"
                                value={formData.estimated_budget || 0}
                                onChange={e => setFormData({ ...formData, estimated_budget: e.target.value })}
                                className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Start Date</label>
                            <input
                                type="date"
                                value={formData.start_date || ''}
                                onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                                className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">End Date</label>
                            <input
                                type="date"
                                value={formData.end_date || ''}
                                onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                                className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
                        <select
                            value={formData.status || 'PENDING'}
                            onChange={e => setFormData({ ...formData, status: e.target.value })}
                            className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none appearance-none bg-white"
                        >
                            <option value="PENDING">Pending (Baki Cha)</option>
                            <option value="IN_PROGRESS">In Progress (Hudai Cha)</option>
                            <option value="COMPLETED">Completed (Sakiya)</option>
                            <option value="HALTED">Halted (Rokiyeko)</option>
                        </select>
                    </div>
                    <div className="flex justify-end gap-3 mt-8">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700">Cancel</button>
                        <button type="submit" disabled={loading} className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 transition-all">
                            {loading ? 'Saving...' : (editingItem ? 'Update Phase' : 'Create Phase')}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default PhasesTab;
