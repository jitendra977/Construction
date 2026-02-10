import React, { useState } from 'react';
import { dashboardService } from '../../../services/api';
import Modal from '../../common/Modal';
import { useConstruction } from '../../../context/ConstructionContext';

const FloorsTab = ({ searchQuery = '' }) => {
    const { dashboardData, refreshData } = useConstruction();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({});
    const [loading, setLoading] = useState(false);

    const filteredFloors = dashboardData.floors?.filter(f =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    const handleOpenModal = (floor = null) => {
        setEditingItem(floor);
        setFormData(floor ? { ...floor } : { level: dashboardData.floors?.length || 0 });
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this Floor?')) return;
        try {
            await dashboardService.deleteFloor(id);
            refreshData();
        } catch (error) {
            alert('Delete failed. Floor might be linked to other records.');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (editingItem) await dashboardService.updateFloor(editingItem.id, formData);
            else await dashboardService.createFloor(formData);
            setIsModalOpen(false);
            refreshData();
        } catch (error) {
            alert('Save failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-2">
                <p className="text-sm text-gray-500">Manage building levels and floors configuration.</p>
                <button
                    onClick={() => handleOpenModal()}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors shadow-sm"
                >
                    + Add New Floor
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Level</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Floor Name</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Rooms Count</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filteredFloors.map(f => (
                            <tr key={f.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 font-bold text-gray-900">
                                    <span className="bg-gray-100 px-2.5 py-1 rounded text-sm">{f.level}</span>
                                </td>
                                <td className="px-6 py-4 text-gray-700 font-semibold">{f.name}</td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-12 bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                            <div className="bg-indigo-500 h-full" style={{ width: `${Math.min((f.rooms?.length || 0) * 10, 100)}%` }} />
                                        </div>
                                        <span className="text-sm font-medium text-indigo-600">{f.rooms?.length || 0} Rooms</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right space-x-3">
                                    <button onClick={() => handleOpenModal(f)} className="text-indigo-600 hover:text-indigo-900 font-semibold text-sm">Edit</button>
                                    <button onClick={() => handleDelete(f.id)} className="text-red-600 hover:text-red-900 font-semibold text-sm">Delete</button>
                                </td>
                            </tr>
                        ))}
                        {filteredFloors.length === 0 && (
                            <tr>
                                <td colSpan="4" className="px-6 py-10 text-center text-gray-400 italic">No floors found matching your search.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`${editingItem ? 'Edit' : 'Add'} Floor`}>
                <form onSubmit={handleSubmit} className="space-y-4 p-1">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Floor Name</label>
                        <input
                            type="text"
                            value={formData.name || ''}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none"
                            placeholder="e.g. Ground Floor"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Level (0=Ground, 1=First...)</label>
                        <input
                            type="number"
                            value={formData.level || 0}
                            onChange={e => setFormData({ ...formData, level: e.target.value })}
                            className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none"
                            required
                        />
                    </div>
                    <div className="flex justify-end gap-3 mt-8">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700">Cancel</button>
                        <button type="submit" disabled={loading} className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 transition-all">
                            {loading ? 'Saving...' : (editingItem ? 'Update Floor' : 'Create Floor')}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default FloorsTab;
