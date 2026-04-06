import React, { useState } from 'react';
import { dashboardService } from '../../../services/api';
import Modal from '../../common/Modal';
import { useConstruction } from '../../../context/ConstructionContext';
import ConfirmModal from '../../common/ConfirmModal';

const FloorCard = ({ f, handleOpenModal, handleDelete, handleOpenRoomModal, handleDeleteRoom }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    return (
        <div className="bg-[var(--t-surface)] rounded-2xl p-4 border border-[var(--t-border)] shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-[var(--t-info)]/100" />
            <div 
                className="flex justify-between items-start cursor-pointer" 
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="bg-[var(--t-info)]/10 text-[var(--t-primary)] px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">Level {f.level}</span>
                    </div>
                    <h3 className="font-bold text-[var(--t-text)] text-lg">{f.name}</h3>
                </div>
                <div className="flex items-center gap-2">
                    <div className="text-right">
                        <div className="text-[10px] font-black text-[var(--t-text3)] uppercase tracking-widest mb-1">Rooms</div>
                        <div className="text-sm font-bold text-[var(--t-primary)]">{f.rooms?.length || 0} Rooms</div>
                    </div>
                    <svg 
                        className={`w-5 h-5 text-[var(--t-text2)] transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                        fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </div>

            {isExpanded && (
                <div className="mt-4 animate-fadeIn space-y-4">
                    {/* Floor Actions */}
                    <div className="grid grid-cols-2 gap-3 pb-4 border-b border-[var(--t-border)]">
                        <button
                            onClick={(e) => { e.stopPropagation(); handleOpenModal(f); }}
                            className="py-2.5 bg-[var(--t-info)]/10 text-[var(--t-primary)] rounded-xl text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-all"
                        >
                            Edit Floor
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(f.id); }}
                            className="py-2.5 bg-[var(--t-danger)]/10 text-[var(--t-danger)] rounded-xl text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-all"
                        >
                            Delete Floor
                        </button>
                    </div>

                    {/* Rooms Section */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <h4 className="text-[10px] font-black text-[var(--t-text3)] uppercase tracking-widest">Rooms in {f.name}</h4>
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleOpenRoomModal(null, f.id); }}
                                className="text-[10px] font-bold text-[var(--t-primary)] uppercase tracking-tighter"
                            >
                                + Add Room
                            </button>
                        </div>
                        
                        <div className="space-y-2">
                            {f.rooms?.length > 0 ? f.rooms.map(room => (
                                <div key={room.id} className="bg-[var(--t-surface2)] p-3 rounded-xl border border-[var(--t-border)] flex justify-between items-center">
                                    <div>
                                        <div className="font-bold text-sm text-[var(--t-text)]">{room.name}</div>
                                        <div className="text-[10px] text-[var(--t-text3)]">{room.area_sqft || '0'} SQFT • {room.status}</div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleOpenRoomModal(room, f.id)} className="text-[var(--t-primary)] text-[10px] font-bold uppercase">Edit</button>
                                        <button onClick={() => handleDeleteRoom(room.id)} className="text-[var(--t-danger)] text-[10px] font-bold uppercase">Del</button>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-4 bg-[var(--t-surface2)] rounded-xl border border-dashed border-[var(--t-border)] text-[10px] text-[var(--t-text3)] italic">
                                    No rooms added to this floor yet.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const FloorsTab = ({ searchQuery = '' }) => {
    const { dashboardData, refreshData } = useConstruction();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
    
    const [editingItem, setEditingItem] = useState(null);
    const [editingRoom, setEditingRoom] = useState(null);
    const [selectedFloorId, setSelectedFloorId] = useState(null);
    
    const [formData, setFormData] = useState({});
    const [roomFormData, setRoomFormData] = useState({});
    const [loading, setLoading] = useState(false);

    // Confirmation Modal System
    const [confirmConfig, setConfirmConfig] = useState({ isOpen: false });
    const showConfirm = (config) => setConfirmConfig({ ...config, isOpen: true });
    const closeConfirm = () => setConfirmConfig({ ...confirmConfig, isOpen: false });

    const filteredFloors = dashboardData.floors?.filter(f =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.rooms?.some(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()))
    ) || [];

    const handleOpenModal = (floor = null) => {
        setEditingItem(floor);
        setFormData(floor ? { ...floor } : { level: dashboardData.floors?.length || 0 });
        setIsModalOpen(true);
    };

    const handleOpenRoomModal = (room = null, floorId) => {
        setEditingRoom(room);
        setSelectedFloorId(floorId);
        setRoomFormData(room ? { ...room } : { floor: floorId, status: 'NOT_STARTED' });
        setIsRoomModalOpen(true);
    };

    const handleDelete = (id) => {
        showConfirm({
            title: "Delete Floor?",
            message: "Are you sure you want to permanently remove this floor? All rooms assigned to this floor may also be affected. This action is irreversible.",
            confirmText: "Yes, Delete Floor",
            type: "danger",
            onConfirm: async () => {
                try {
                    await dashboardService.deleteFloor(id);
                    refreshData();
                    closeConfirm();
                } catch (error) {
                    alert('Delete failed. Floor might be linked to other records.');
                    closeConfirm();
                }
            }
        });
    };

    const handleDeleteRoom = (id) => {
        showConfirm({
            title: "Delete Room?",
            message: "Are you sure you want to permanently remove this room? Any material usage or expense records linked to this room will lose their association. This action is irreversible.",
            confirmText: "Yes, Delete Room",
            type: "danger",
            onConfirm: async () => {
                try {
                    await dashboardService.deleteRoom(id);
                    refreshData();
                    closeConfirm();
                } catch (error) {
                    alert('Delete failed.');
                    closeConfirm();
                }
            }
        });
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

    const handleRoomSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (editingRoom) await dashboardService.updateRoom(editingRoom.id, roomFormData);
            else await dashboardService.createRoom(roomFormData);
            setIsRoomModalOpen(false);
            refreshData();
        } catch (error) {
            alert('Save failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                <p className="text-sm text-[var(--t-text2)]">Manage project hierarchy: Floors and their nested Rooms.</p>
                <button
                    onClick={() => handleOpenModal()}
                    className="w-full sm:w-auto px-4 py-2.5 bg-[var(--t-primary)] text-[var(--t-bg)] rounded-[2px] hover:opacity-90 font-['DM_Mono',monospace] uppercase tracking-widest text-[10px] sm:text-xs transition-colors shadow-sm"
                >
                    + Add New Floor
                </button>
            </div>

            {/* Desktop View: Table */}
            <div className="hidden lg:block bg-[var(--t-surface)] rounded-xl shadow-sm border border-[var(--t-border)] overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-[var(--t-surface2)] border-b border-[var(--t-border)]">
                            <th className="px-6 py-4 text-[10px] font-black text-[var(--t-text3)] uppercase tracking-[0.25em]" style={{ fontFamily: 'var(--f-mono)' }}>Structure Hierarchy</th>
                            <th className="px-6 py-4 text-[10px] font-black text-[var(--t-text3)] uppercase tracking-[0.25em] text-right" style={{ fontFamily: 'var(--f-mono)' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--t-border)]">
                        {filteredFloors.map(f => (
                            <React.Fragment key={f.id}>
                                <tr className="bg-[var(--t-surface3)]/30">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <span className="bg-[var(--t-primary)] text-[var(--t-bg)] px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest">Lvl {f.level}</span>
                                            <span className="text-[var(--t-text)] font-semibold text-sm tracking-tight">{f.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right space-x-3">
                                        <button onClick={() => handleOpenRoomModal(null, f.id)} className="text-[var(--t-info)] hover:opacity-70 font-bold text-[10px] uppercase tracking-wider">Add Room</button>
                                        <button onClick={() => handleOpenModal(f)} className="text-[var(--t-primary)] hover:opacity-70 font-bold text-[10px] uppercase tracking-wider">Edit</button>
                                        <button onClick={() => handleDelete(f.id)} className="text-[var(--t-danger)] hover:opacity-70 font-bold text-[10px] uppercase tracking-wider">Del</button>
                                    </td>
                                </tr>
                                {f.rooms?.map(r => (
                                    <tr key={r.id} className="hover:bg-[var(--t-surface2)] transition-colors">
                                        <td className="px-12 py-3 border-b border-[var(--t-border)]">
                                            <div className="flex items-center gap-4">
                                                <div className="w-1.5 h-1.5 bg-[var(--t-border)] rounded-full" />
                                                <div className="text-[var(--t-text)] font-medium text-sm">{r.name}</div>
                                                <span className="text-[10px] text-[var(--t-text3)] font-mono uppercase tracking-tighter">({r.area_sqft || 0} SQFT)</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 text-right space-x-3 border-b border-[var(--t-border)]">
                                            <button onClick={() => handleOpenRoomModal(r, f.id)} className="text-[var(--t-primary)] hover:opacity-70 font-bold text-[10px] uppercase">Edit</button>
                                            <button onClick={() => handleDeleteRoom(r.id)} className="text-[var(--t-danger)] hover:opacity-70 font-bold text-[10px] uppercase">Del</button>
                                        </td>
                                    </tr>
                                ))}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile View: Cards */}
            <div className="lg:hidden space-y-4">
                {filteredFloors.map(f => (
                    <FloorCard 
                        key={f.id} 
                        f={f} 
                        handleOpenModal={handleOpenModal} 
                        handleDelete={handleDelete}
                        handleOpenRoomModal={handleOpenRoomModal}
                        handleDeleteRoom={handleDeleteRoom}
                    />
                ))}
            </div>

            {/* Floor Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`${editingItem ? 'Edit' : 'Add'} Floor`}>
                <form onSubmit={handleSubmit} className="space-y-4 p-1">
                    <div>
                        <label className="block text-xs font-black text-[var(--t-text3)] uppercase tracking-widest mb-1">Floor Name</label>
                        <input
                            type="text"
                            value={formData.name || ''}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="w-full bg-[var(--t-surface2)] border border-[var(--t-border)] p-3 rounded-[2px] text-[var(--t-text)] outline-none focus:border-[var(--t-primary)]"
                            placeholder="e.g. Ground Floor"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-[var(--t-text3)] uppercase tracking-widest mb-1">Level (Order)</label>
                        <input
                            type="number"
                            value={formData.level || 0}
                            onChange={e => setFormData({ ...formData, level: e.target.value })}
                            className="w-full bg-[var(--t-surface2)] border border-[var(--t-border)] p-3 rounded-[2px] text-[var(--t-text)] outline-none focus:border-[var(--t-primary)]"
                            required
                        />
                    </div>
                    <div className="flex justify-end gap-3 mt-8">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="text-xs font-bold text-[var(--t-text3)] uppercase">Cancel</button>
                        <button type="submit" disabled={loading} className="px-8 py-2.5 bg-[var(--t-primary)] text-[var(--t-bg)] font-black uppercase tracking-widest text-xs rounded-[2px] shadow-[var(--t-primary)]/20">
                            {loading ? 'Saving...' : (editingItem ? 'Update' : 'Create')}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Room Modal */}
            <Modal isOpen={isRoomModalOpen} onClose={() => setIsRoomModalOpen(false)} title={`${editingRoom ? 'Update' : 'Register New'} Room`}>
                <form onSubmit={handleRoomSubmit} className="space-y-6 p-1">
                    <div className="bg-[var(--t-surface2)]/50 p-4 rounded-xl border border-[var(--t-border)] space-y-4">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-[var(--t-primary)]/10 flex items-center justify-center text-[var(--t-primary)] border border-[var(--t-primary)]/30">🏠</div>
                            <div>
                                <h4 className="text-[10px] font-black text-[var(--t-text3)] uppercase tracking-[0.2em] leading-tight">Configuration</h4>
                                <p className="text-[11px] text-[var(--t-text)] font-bold">Assigning to Floor {dashboardData.floors?.find(f => f.id === selectedFloorId)?.name || '...'}</p>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-[var(--t-text3)] uppercase tracking-widest mb-1.5 ml-1">Room Designation</label>
                            <input
                                type="text"
                                value={roomFormData.name || ''}
                                onChange={e => setRoomFormData({ ...roomFormData, name: e.target.value })}
                                className="w-full bg-[var(--t-surface)] border border-[var(--t-border)] p-3 rounded-[2px] text-[var(--t-text)] outline-none focus:border-[var(--t-primary)] text-sm font-semibold transition-all focus:shadow-[var(--t-primary)]/10"
                                placeholder="e.g. Master Bedroom, Kitchen"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-[var(--t-text3)] uppercase tracking-widest mb-1.5 ml-1">Area Dimension (SQFT)</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={roomFormData.area_sqft || ''}
                                        onChange={e => setRoomFormData({ ...roomFormData, area_sqft: e.target.value })}
                                        className="w-full bg-[var(--t-surface)] border border-[var(--t-border)] p-3 rounded-[2px] text-[var(--t-text)] outline-none focus:border-[var(--t-primary)] text-sm font-semibold pr-12"
                                        placeholder="0.00"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-[var(--t-text3)]">FT²</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-[var(--t-text3)] uppercase tracking-widest mb-1.5 ml-1">Current Status</label>
                                <select
                                    value={roomFormData.status || 'NOT_STARTED'}
                                    onChange={e => setRoomFormData({ ...roomFormData, status: e.target.value })}
                                    className="w-full bg-[var(--t-surface)] border border-[var(--t-border)] p-3 rounded-[2px] text-[var(--t-text)] outline-none focus:border-[var(--t-primary)] text-[11px] font-black tracking-widest uppercase cursor-pointer"
                                >
                                    <option value="NOT_STARTED">⚪ NOT STARTED</option>
                                    <option value="IN_PROGRESS">🔵 IN PROGRESS</option>
                                    <option value="COMPLETED">🟢 COMPLETED</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between gap-4 pt-2">
                        <button 
                            type="button" 
                            onClick={() => setIsRoomModalOpen(false)} 
                            className="flex-1 py-3 text-[10px] font-black text-[var(--t-text3)] uppercase tracking-[0.2em] border border-[var(--t-border)] rounded-[2px] hover:bg-[var(--t-surface2)] transition-colors"
                        >
                            Abort
                        </button>
                        <button 
                            type="submit" 
                            disabled={loading} 
                            className="flex-[2] py-3 bg-[var(--t-primary)] text-[var(--t-bg)] font-black uppercase tracking-[0.2em] text-[10px] rounded-[2px] shadow-[var(--t-primary)]/20 hover:translate-y-[-1px] active:translate-y-[1px] transition-all disabled:opacity-50"
                        >
                            {loading ? 'Initializing...' : (editingRoom ? 'Update Protocol' : 'Finalize Room')}
                        </button>
                    </div>
                </form>
            </Modal>

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

export default FloorsTab;
