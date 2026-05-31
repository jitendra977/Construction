import React, { useMemo, useState } from 'react';
import { useStructure } from '../context/StructureContext';
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

    const floorName = (id) => floors.find(f => String(f.id) === String(id))?.name || '—';

    const visible = allRooms.filter(r => {
        if (filterFloor && String(r.floor) !== String(filterFloor)) return false;
        if (filterStatus && r.status !== filterStatus) return false;
        if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });
    const groupedByFloor = useMemo(() => {
        const orderMap = new Map(floors.map((f, i) => [String(f.id), i]));
        const groups = new Map();
        visible.forEach((room) => {
            const key = String(room.floor || 'unknown');
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push(room);
        });
        return Array.from(groups.entries())
            .sort((a, b) => (orderMap.get(a[0]) ?? 9999) - (orderMap.get(b[0]) ?? 9999))
            .map(([floorId, rooms]) => ({ floorId, rooms }));
    }, [visible, floors]);
    const statusChip = (status) => {
        if (status === 'COMPLETED') return { bg: 'rgba(16,185,129,0.12)', color: '#10b981', label: 'Completed' };
        if (status === 'IN_PROGRESS') return { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6', label: 'In Progress' };
        return { bg: 'rgba(107,114,128,0.12)', color: '#6b7280', label: 'Not Started' };
    };

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

            {/* Floor-wise Table View */}
            {visible.length === 0 ? (
                <div className="text-center py-16" style={{ color: 'var(--t-text3)' }}>
                    <p className="text-4xl mb-3">🚪</p>
                    <p className="font-semibold">No rooms found</p>
                    <p className="text-sm mt-1">Add rooms from the Floor Plan page or click + Add Room</p>
                </div>
            ) : (
                <div className="space-y-5">
                    {groupedByFloor.map(group => (
                        <div key={group.floorId} className="rounded-xl border overflow-hidden"
                            style={{ background: 'var(--t-surface)', borderColor: 'var(--t-border)' }}>
                            <div className="px-4 py-3 border-b flex items-center justify-between"
                                style={{ borderColor: 'var(--t-border)', background: 'var(--t-surface2)' }}>
                                <h3 className="text-sm font-black" style={{ color: 'var(--t-text)' }}>
                                    {floorName(group.floorId)} ({group.rooms.length})
                                </h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[860px]">
                                    <thead>
                                        <tr className="text-left" style={{ background: 'var(--t-surface2)' }}>
                                            <th className="px-4 py-2 text-[10px] uppercase tracking-wider" style={{ color: 'var(--t-text3)' }}>Room</th>
                                            <th className="px-4 py-2 text-[10px] uppercase tracking-wider" style={{ color: 'var(--t-text3)' }}>Type</th>
                                            <th className="px-4 py-2 text-[10px] uppercase tracking-wider" style={{ color: 'var(--t-text3)' }}>Status</th>
                                            <th className="px-4 py-2 text-[10px] uppercase tracking-wider" style={{ color: 'var(--t-text3)' }}>Size (cm)</th>
                                            <th className="px-4 py-2 text-[10px] uppercase tracking-wider" style={{ color: 'var(--t-text3)' }}>Budget</th>
                                            <th className="px-4 py-2 text-[10px] uppercase tracking-wider text-right" style={{ color: 'var(--t-text3)' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {group.rooms.map(room => {
                                            const st = statusChip(room.status);
                                            return (
                                                <tr key={room.id} className="border-t" style={{ borderColor: 'var(--t-border)' }}>
                                                    <td className="px-4 py-3">
                                                        <button
                                                            onClick={() => handleEdit(room)}
                                                            className="font-bold text-sm hover:underline"
                                                            style={{ color: 'var(--t-text)' }}
                                                        >
                                                            {room.name}
                                                        </button>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--t-text2)' }}>{room.room_type || '—'}</td>
                                                    <td className="px-4 py-3">
                                                        <span className="px-2 py-1 rounded text-[11px] font-bold"
                                                            style={{ background: st.bg, color: st.color }}>
                                                            {st.label}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--t-text2)' }}>
                                                        {room.width_cm || 0} × {room.depth_cm || 0}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm font-semibold" style={{ color: 'var(--t-text)' }}>
                                                        Rs. {Number(room.budget_allocation || 0).toLocaleString()}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex justify-end gap-2">
                                                            <button
                                                                onClick={() => handleEdit(room)}
                                                                className="px-3 py-1.5 rounded text-xs font-bold"
                                                                style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}
                                                            >
                                                                Edit
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(room)}
                                                                className="px-3 py-1.5 rounded text-xs font-bold"
                                                                style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}
                                                            >
                                                                Delete
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showForm && (
                <Modal isOpen={true} onClose={() => { setShowForm(false); setEditRoom(null); }}>
                    <RoomForm
                        editRoom={editRoom}
                        onClose={() => { setShowForm(false); setEditRoom(null); }}
                    />
                </Modal>
            )}
        </div>
    );
}
