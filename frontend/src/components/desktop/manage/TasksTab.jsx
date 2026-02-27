import React, { useState } from 'react';
import { constructionService } from '../../../services/api';
import Modal from '../../common/Modal';
import { useConstruction } from '../../../context/ConstructionContext';

const TasksTab = ({ searchQuery = '' }) => {
    const { dashboardData, refreshData } = useConstruction();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({});
    const [loading, setLoading] = useState(false);
    const [phaseFilter, setPhaseFilter] = useState('');
    const [contractorFilter, setContractorFilter] = useState('');

    const filteredTasks = (dashboardData.tasks || []).filter(t => {
        const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.description?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesPhase = phaseFilter ? t.phase === parseInt(phaseFilter) : true;
        const matchesContractor = contractorFilter ? t.assigned_to === parseInt(contractorFilter) : true;
        return matchesSearch && matchesPhase && matchesContractor;
    });

    const handleOpenModal = (item = null) => {
        setEditingItem(item);
        if (item) {
            setFormData(item);
        } else {
            setFormData({
                status: 'PENDING',
                priority: 'MEDIUM',
                phase: dashboardData.phases?.[0]?.id || ''
            });
        }
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this task?')) return;
        try {
            await constructionService.deleteTask(id);
            refreshData();
        } catch (error) {
            alert('Delete failed.');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (editingItem) await constructionService.updateTask(editingItem.id, formData);
            else await constructionService.createTask(formData);
            setIsModalOpen(false);
            refreshData();
        } catch (error) {
            alert('Save failed. Please check your inputs.');
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'COMPLETED': return 'bg-green-100 text-green-700 border-green-200';
            case 'IN_PROGRESS': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
            case 'BLOCKED': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'CRITICAL': return 'text-red-600';
            case 'HIGH': return 'text-orange-600';
            case 'MEDIUM': return 'text-indigo-600';
            default: return 'text-gray-500';
        }
    };

    const getPhaseName = (id) => dashboardData.phases?.find(p => p.id === id)?.name || 'Unknown Phase';
    const getContractorName = (id) => dashboardData.contractors?.find(c => c.id === id)?.name || 'Unassigned';

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
                <div className="flex flex-wrap gap-2">
                    <select
                        value={phaseFilter}
                        onChange={e => setPhaseFilter(e.target.value)}
                        className="text-xs font-bold border-gray-200 rounded-lg p-2 focus:ring-indigo-500 bg-white shadow-sm"
                    >
                        <option value="">All Phases (सबै चरण)</option>
                        {dashboardData.phases?.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                    <select
                        value={contractorFilter}
                        onChange={e => setContractorFilter(e.target.value)}
                        className="text-xs font-bold border-gray-200 rounded-lg p-2 focus:ring-indigo-500 bg-white shadow-sm"
                    >
                        <option value="">All Contractors (सबै ठेकेदार)</option>
                        {dashboardData.contractors?.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors shadow-sm text-sm"
                >
                    + Add New Task
                </button>
            </div>

            {/* Desktop View */}
            <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Task Details</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Phase & Assignment</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Status & Priority</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filteredTasks.map(t => (
                            <tr key={t.id} className="hover:bg-gray-50 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="font-bold text-gray-900">{t.title}</div>
                                    <div className="text-[10px] text-gray-400 font-medium line-clamp-1 max-w-xs italic">
                                        {t.description || 'No description provided'}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col gap-1">
                                        <div className="text-[10px] font-black text-indigo-500 uppercase tracking-tighter">
                                            {getPhaseName(t.phase)}
                                        </div>
                                        <div className="text-xs text-gray-600 font-medium">
                                            👤 {getContractorName(t.assigned_to)}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col gap-1.5">
                                        <span className={`px-2 py-0.5 rounded border text-[9px] font-black uppercase w-fit ${getStatusColor(t.status)}`}>
                                            {t.status}
                                        </span>
                                        <div className={`text-[10px] font-bold ${getPriorityColor(t.priority)}`}>
                                            {t.priority} Priority
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleOpenModal(t)} className="text-indigo-600 hover:text-indigo-900 font-bold text-[10px] uppercase">Edit</button>
                                        <button onClick={() => handleDelete(t.id)} className="text-red-500 hover:text-red-700 font-bold text-[10px] uppercase">Delete</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile View */}
            <div className="lg:hidden space-y-3">
                {filteredTasks.map(t => (
                    <div key={t.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <h3 className="font-bold text-gray-900">{t.title}</h3>
                                <div className="text-[10px] font-black text-indigo-500 uppercase mt-0.5">
                                    {getPhaseName(t.phase)}
                                </div>
                            </div>
                            <span className={`px-2 py-0.5 rounded border text-[9px] font-black uppercase ${getStatusColor(t.status)}`}>
                                {t.status}
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-gray-500 mb-4 bg-gray-50 p-2 rounded-xl">
                            <div>
                                <span className="text-[9px] font-bold text-gray-400 uppercase block mb-0.5">Assigned To</span>
                                <span className="font-bold text-gray-700">{getContractorName(t.assigned_to)}</span>
                            </div>
                            <div className="text-right">
                                <span className="text-[9px] font-bold text-gray-400 uppercase block mb-0.5">Priority</span>
                                <span className={`font-black ${getPriorityColor(t.priority)}`}>{t.priority}</span>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => handleOpenModal(t)} className="flex-1 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold hover:bg-indigo-100">Edit</button>
                            <button onClick={() => handleDelete(t.id)} className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100">Delete</button>
                        </div>
                    </div>
                ))}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`${editingItem ? 'Edit' : 'Add'} Task`}>
                <form onSubmit={handleSubmit} className="space-y-4 p-1">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Task Title</label>
                        <input
                            type="text"
                            value={formData.title || ''}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none font-medium"
                            placeholder="e.g. Concrete Pouring"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                        <textarea
                            value={formData.description || ''}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none min-h-[100px]"
                            placeholder="Add details about the task..."
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Phase</label>
                            <select
                                value={formData.phase || ''}
                                onChange={e => setFormData({ ...formData, phase: parseInt(e.target.value) })}
                                className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none appearance-none bg-white font-medium"
                                required
                            >
                                <option value="">Select Phase</option>
                                {dashboardData.phases?.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Assigned Contractor</label>
                            <select
                                value={formData.assigned_to || ''}
                                onChange={e => setFormData({ ...formData, assigned_to: e.target.value ? parseInt(e.target.value) : null })}
                                className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none appearance-none bg-white font-medium"
                            >
                                <option value="">Unassigned</option>
                                {dashboardData.contractors?.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
                            <select
                                value={formData.status || 'PENDING'}
                                onChange={e => setFormData({ ...formData, status: e.target.value })}
                                className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none appearance-none bg-white font-medium"
                            >
                                <option value="PENDING">Pending</option>
                                <option value="IN_PROGRESS">In Progress</option>
                                <option value="COMPLETED">Completed</option>
                                <option value="BLOCKED">Blocked</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Priority</label>
                            <select
                                value={formData.priority || 'MEDIUM'}
                                onChange={e => setFormData({ ...formData, priority: e.target.value })}
                                className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none appearance-none bg-white font-medium"
                            >
                                <option value="LOW">Low</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HIGH">High</option>
                                <option value="CRITICAL">Critical</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-8">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700">Cancel</button>
                        <button type="submit" disabled={loading} className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 transition-all">
                            {loading ? 'Saving...' : (editingItem ? 'Update Task' : 'Create Task')}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default TasksTab;
