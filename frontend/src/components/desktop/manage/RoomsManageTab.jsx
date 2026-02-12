import React, { useState } from 'react';
import { dashboardService } from '../../../services/api';
import Modal from '../../common/Modal';
import { useConstruction } from '../../../context/ConstructionContext';

const RoomsManageTab = ({ searchQuery = '' }) => {
    const { dashboardData, refreshData } = useConstruction();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({});
    const [loading, setLoading] = useState(false);

    const filteredRooms = dashboardData.rooms?.filter(r =>
        r.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    const handleOpenModal = (room = null) => {
        setEditingItem(room);
        setFormData(room ? { ...room } : { floor: dashboardData.floors[0]?.id, status: 'NOT_STARTED' });
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this Room?')) return;
        try {
            await dashboardService.deleteRoom(id);
            refreshData();
        } catch (error) {
            alert('Delete failed.');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (editingItem) await dashboardService.updateRoom(editingItem.id, formData);
            else await dashboardService.createRoom(formData);
            setIsModalOpen(false);
            refreshData();
        } catch (error) {
            alert('Save failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-2">
                <p className="text-sm text-gray-500">Manage rooms for each floor and track their completion status.</p>
                <button
                    onClick={() => handleOpenModal()}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors shadow-sm"
                >
                    + Add New Room
                </button>
            </div>

            {dashboardData.floors?.map(floor => {
                const floorRooms = filteredRooms.filter(r => r.floor === floor.id);
                if (searchQuery && floorRooms.length === 0) return null;

                return (
                    <div key={floor.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-gray-50 to-white">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest leading-none mb-1">Level {floor.level}</span>
                                <h3 className="font-bold text-gray-800 text-lg leading-tight uppercase tracking-tight">{floor.name}</h3>
                            </div>
                            <span className="text-[10px] font-black px-3 py-1 rounded-full bg-white border border-gray-200 text-gray-500 uppercase tracking-widest shadow-sm">
                                {floorRooms.length} Rooms
                            </span>
                        </div>

                        {/* Desktop View: Table */}
                        <div className="hidden lg:block">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-white border-b border-gray-100">
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Room Name</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Area</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {floorRooms.length > 0 ? (
                                        floorRooms.map(r => (
                                            <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 font-semibold text-gray-900">{r.name}</td>
                                                <td className="px-6 py-4 text-gray-500 text-sm">{r.area_sqft || '-'} sqft</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${r.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                                        r.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                                                            'bg-gray-100 text-gray-500'
                                                        }`}>
                                                        {r.status?.replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right space-x-3">
                                                    <button onClick={() => handleOpenModal(r)} className="text-indigo-600 hover:text-indigo-900 font-semibold text-sm">Edit</button>
                                                    <button onClick={() => handleDelete(r.id)} className="text-red-600 hover:text-red-900 font-semibold text-sm">Delete</button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="4" className="px-6 py-8 text-center text-gray-400 italic text-sm">
                                                No rooms on this floor yet.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile View: Cards */}
                        <div className="lg:hidden p-4 space-y-4">
                            {floorRooms.length > 0 ? (
                                floorRooms.map(r => (
                                    <div key={r.id} className="bg-gray-50/50 rounded-2xl p-4 border border-gray-100 group active:scale-[0.98] transition-all">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <h4 className="font-bold text-gray-900 mb-1">{r.name}</h4>
                                                <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h16M4 4l5 5m11-1V5m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                                                    {r.area_sqft || '-'} sqft Total Area
                                                </div>
                                            </div>
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tight ${r.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                                r.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                                                    'bg-gray-100 text-gray-500'
                                                }`}>
                                                {r.status?.replace('_', ' ')}
                                            </span>
                                        </div>

                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleOpenModal(r)}
                                                className="flex-1 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-[11px] font-bold hover:bg-indigo-100 transition-colors"
                                            >
                                                Edit Detail
                                            </button>
                                            <button
                                                onClick={() => handleDelete(r.id)}
                                                className="px-3 py-2 bg-red-50 text-red-600 rounded-lg text-[11px] font-bold hover:bg-red-100 transition-colors"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-6 text-center text-gray-400 italic text-sm">
                                    No rooms on this floor yet.
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`${editingItem ? 'Edit' : 'Add'} Room`}>
                <form onSubmit={handleSubmit} className="space-y-4 p-1">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Room Name</label>
                        <input
                            type="text"
                            value={formData.name || ''}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none"
                            placeholder="e.g. Master Bedroom"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Floor</label>
                            <select
                                value={formData.floor || ''}
                                onChange={e => setFormData({ ...formData, floor: e.target.value })}
                                className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none appearance-none bg-white"
                                required
                            >
                                <option value="">Select Floor</option>
                                {dashboardData.floors.map(f => (
                                    <option key={f.id} value={f.id}>{f.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Area (sqft)</label>
                            <input
                                type="number"
                                value={formData.area_sqft || ''}
                                onChange={e => setFormData({ ...formData, area_sqft: e.target.value })}
                                className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
                            <select
                                value={formData.status || 'NOT_STARTED'}
                                onChange={e => setFormData({ ...formData, status: e.target.value })}
                                className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none appearance-none bg-white"
                            >
                                <option value="NOT_STARTED">Not Started</option>
                                <option value="IN_PROGRESS">In Progress</option>
                                <option value="COMPLETED">Completed</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Budget Allocation</label>
                            <input
                                type="number"
                                value={formData.budget_allocation || 0}
                                onChange={e => setFormData({ ...formData, budget_allocation: e.target.value })}
                                className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-8">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700">Cancel</button>
                        <button type="submit" disabled={loading} className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 transition-all">
                            {loading ? 'Saving...' : (editingItem ? 'Update Room' : 'Create Room')}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default RoomsManageTab;
