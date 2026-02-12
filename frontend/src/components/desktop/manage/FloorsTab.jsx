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
                <p className="text-sm text-gray-500 hidden sm:block">Manage building levels and floors configuration.</p>
                <div className="sm:hidden" /> {/* Spacer for mobile */}
                <button
                    onClick={() => handleOpenModal()}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors shadow-sm text-sm"
                >
                    + Add New Floor
                </button>
            </div>

            {/* Desktop View: Table */}
            <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
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

            {/* Mobile View: Cards */}
            <div className="lg:hidden space-y-4">
                {filteredFloors.map(f => (
                    <div key={f.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">Level {f.level}</span>
                                </div>
                                <h3 className="font-bold text-gray-900 text-lg">{f.name}</h3>
                            </div>
                            <div className="text-right">
                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Status</div>
                                <div className="text-sm font-bold text-emerald-600">Active</div>
                            </div>
                        </div>

                        <div className="bg-gray-50 rounded-xl p-3 mb-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center text-indigo-600 shadow-sm">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                                </div>
                                <div>
                                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Configured Rooms</div>
                                    <div className="text-sm font-black text-gray-900">{f.rooms?.length || 0} Rooms</div>
                                </div>
                            </div>
                            <div className="w-24 bg-white h-2 rounded-full overflow-hidden border border-gray-100 p-0.5">
                                <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${Math.min((f.rooms?.length || 0) * 10, 100)}%` }} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => handleOpenModal(f)}
                                className="py-2.5 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-all"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                Edit Floor
                            </button>
                            <button
                                onClick={() => handleDelete(f.id)}
                                className="py-2.5 bg-red-50 text-red-600 rounded-xl text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-all"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                Delete
                            </button>
                        </div>
                    </div>
                ))}
                {filteredFloors.length === 0 && (
                    <div className="py-10 text-center text-gray-400 italic bg-white rounded-2xl border-2 border-dashed border-gray-100">
                        No floors found matching your search.
                    </div>
                )}
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
