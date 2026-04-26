import React, { useState } from 'react';
import { useStructure } from '../context/StructureContext';
import RoomCard from '../components/rooms/RoomCard';
import Modal from '../../../components/common/Modal';
import RoomForm from '../components/rooms/RoomForm';
import structureApi from '../services/structureApi';

export default function RoomsPage() {
    const { floors, allRooms, loading, reload, removeRoomLocal } = useStructure();
    const [showForm, setShowForm]   = useState(false);
    const [editRoom, setEditRoom]   = useState(null);
    const [filterFloor, setFilter]  = useState('');
    const [filterStatus, setFStatus] = useState('');
    const [search, setSearch]       = useState('');

    const floorName = (id) => floors.find(f => f.id === id)?.name || '—';

    const visible = allRooms.filter(r => {
        if (filterFloor && String(r.floor) !== String(filterFloor)) return false;
        if (filterStatus && r.status !== filterStatus) return false;
        if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    const handleEdit = (room) => { setEditRoom(room); setShowForm(true); };
    const handleDelete = async (room) => {
        if (!window.confirm(`Delete "${room.name}"?`)) return;
        try {
            await structureApi.deleteRoom(room.id);
            removeRoomLocal(room.id);
        } catch (e) { console.error(e); }
    };

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
        </div>
    );

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black" style={{ color: 'var(--t-text)' }}>🚪 Rooms</h1>
                    <p className="text-sm mt-0.5" style={{ color: 'var(--t-text3)' }}>
                        {visible.length} of {allRooms.length} rooms
                    </p>
                </div>
                <button
                    onClick={() => { setEditRoom(null); setShowForm(true); }}
                    className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
                    style={{ background: '#ea580c' }}
                >
                    + Add Room
                </button>
            </div>

            {/* Filters */}
            <div className="flex gap-3 flex-wrap">
                <input
                    className="px-3 py-2 rounded-lg text-sm border outline-none"
                    style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)', color: 'var(--t-text)', minWidth: 200 }}
                    placeholder="🔍 Search rooms…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
                <select
                    className="px-3 py-2 rounded-lg text-sm border outline-none"
                    style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)', color: 'var(--t-text)' }}
                    value={filterFloor}
                    onChange={e => setFilter(e.target.value)}
                >
                    <option value="">All Floors</option>
                    {floors.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
                <select
                    className="px-3 py-2 rounded-lg text-sm border outline-none"
                    style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)', color: 'var(--t-text)' }}
                    value={filterStatus}
                    onChange={e => setFStatus(e.target.value)}
                >
                    <option value="">All Status</option>
                    <option value="NOT_STARTED">Not Started</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                </select>
            </div>

            {/* Grid */}
            {visible.length === 0 ? (
                <div className="text-center py-16" style={{ color: 'var(--t-text3)' }}>
                    <p className="text-4xl mb-3">🚪</p>
                    <p className="font-semibold">No rooms found</p>
                    <p className="text-sm mt-1">Add rooms from the Floor Plan page or click + Add Room</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {visible.map(room => (
                        <div key={room.id} className="relative group">
                            <RoomCard
                                room={room}
                                floorName={floorName(room.floor)}
                                onClick={() => handleEdit(room)}
                            />
                            <button
                                onClick={(e) => { e.stopPropagation(); handleDelete(room); }}
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 rounded-full bg-red-100 text-red-500 text-xs flex items-center justify-center hover:bg-red-200"
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {showForm && (
                <Modal onClose={() => { setShowForm(false); setEditRoom(null); }}>
                    <RoomForm
                        editRoom={editRoom}
                        onClose={() => { setShowForm(false); setEditRoom(null); }}
                    />
                </Modal>
            )}
        </div>
    );
}
