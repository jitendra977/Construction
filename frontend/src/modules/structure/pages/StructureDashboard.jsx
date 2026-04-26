import React, { useState } from 'react';
import { useStructure } from '../context/StructureContext';
import Modal from '../../../components/common/Modal';
import FloorForm from '../components/floors/FloorForm';
import RoomForm from '../components/rooms/RoomForm';
import StatusBadge, { STATUS_MAP } from '../components/shared/StatusBadge';

const FLOOR_COLORS = ['#ea580c', '#3b82f6', '#8b5cf6', '#10b981'];

const Stat = ({ icon, label, value, sub }) => (
    <div className="rounded-xl p-4 flex items-center gap-4"
        style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
            style={{ background: 'rgba(234,88,12,0.1)' }}>{icon}</div>
        <div>
            <p className="text-2xl font-black" style={{ color: 'var(--t-text)' }}>{value}</p>
            <p className="text-xs font-semibold" style={{ color: 'var(--t-text3)' }}>{label}</p>
            {sub && <p className="text-[10px]" style={{ color: 'var(--t-text3)' }}>{sub}</p>}
        </div>
    </div>
);

export default function StructureDashboard() {
    const { floors, allRooms, stats, loading, error, reload } = useStructure();
    const [showFloorForm, setShowFloorForm] = useState(false);
    const [showRoomForm, setShowRoomForm]   = useState(false);
    const [editFloor, setEditFloor]         = useState(null);

    const progressPct = stats.totalRooms
        ? Math.round((stats.completedRooms / stats.totalRooms) * 100)
        : 0;

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
        </div>
    );

    if (error) return (
        <div className="text-center py-16 text-red-400">{error}</div>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black" style={{ color: 'var(--t-text)' }}>
                        🏗️ Structure Overview
                    </h1>
                    <p className="text-sm mt-0.5" style={{ color: 'var(--t-text3)' }}>
                        Manage floors, rooms, and building layout
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => { setEditFloor(null); setShowFloorForm(true); }}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
                        style={{ background: '#ea580c' }}
                    >
                        + Add Floor
                    </button>
                    <button
                        onClick={() => setShowRoomForm(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border"
                        style={{ color: 'var(--t-text)', borderColor: 'var(--t-border)', background: 'var(--t-surface)' }}
                    >
                        + Add Room
                    </button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Stat icon="🏢" label="Total Floors" value={floors.length} />
                <Stat icon="🚪" label="Total Rooms" value={stats.totalRooms}
                    sub={`${stats.completedRooms} completed`} />
                <Stat icon="📐" label="Total Area" value={`${stats.totalArea.toFixed(0)} ft²`}
                    sub={`${(stats.totalArea * 0.0929).toFixed(1)} m²`} />
                <Stat icon="💰" label="Budgeted"
                    value={`NPR ${(stats.totalBudget / 1000).toFixed(0)}k`} />
            </div>

            {/* Overall progress */}
            <div className="rounded-xl p-5" style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-sm" style={{ color: 'var(--t-text)' }}>Overall Completion</h3>
                    <span className="text-sm font-black" style={{ color: '#f97316' }}>{progressPct}%</span>
                </div>
                <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--t-border)' }}>
                    <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${progressPct}%`, background: 'linear-gradient(90deg,#ea580c,#f97316)' }}
                    />
                </div>
                <div className="flex gap-4 mt-3">
                    {Object.entries(STATUS_MAP).map(([k, v]) => (
                        <div key={k} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--t-text3)' }}>
                            <span className="w-2 h-2 rounded-full" style={{ background: v.dot }} />
                            {v.label}: {allRooms.filter(r => r.status === k).length}
                        </div>
                    ))}
                </div>
            </div>

            {/* Floors grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {floors.map((floor, idx) => {
                    const color = FLOOR_COLORS[idx % FLOOR_COLORS.length];
                    const rooms = floor.rooms || [];
                    const done  = rooms.filter(r => r.status === 'COMPLETED').length;
                    const pct   = rooms.length ? Math.round((done / rooms.length) * 100) : 0;

                    return (
                        <div
                            key={floor.id}
                            className="rounded-xl overflow-hidden"
                            style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)' }}
                        >
                            {/* Floor header */}
                            <div className="px-4 py-3 flex items-center justify-between"
                                style={{ borderBottom: `2px solid ${color}`, background: `${color}18` }}>
                                <div>
                                    <h3 className="font-black text-sm" style={{ color: 'var(--t-text)' }}>
                                        {floor.name}
                                    </h3>
                                    <p className="text-[10px]" style={{ color: 'var(--t-text3)' }}>
                                        Level {floor.level} · {rooms.length} rooms
                                        {floor.plan_width_cm && ` · ${floor.plan_width_cm / 100}m × ${floor.plan_depth_cm / 100}m`}
                                    </p>
                                </div>
                                <button
                                    onClick={() => { setEditFloor(floor); setShowFloorForm(true); }}
                                    className="text-xs px-2 py-1 rounded border transition-colors"
                                    style={{ color: 'var(--t-text3)', borderColor: 'var(--t-border)' }}
                                >
                                    Edit
                                </button>
                            </div>

                            {/* Progress bar */}
                            <div className="px-4 py-2">
                                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--t-border)' }}>
                                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                                </div>
                                <p className="text-[10px] mt-1" style={{ color: 'var(--t-text3)' }}>
                                    {done}/{rooms.length} rooms complete
                                </p>
                            </div>

                            {/* Rooms mini list */}
                            <div className="px-4 pb-4 space-y-1.5">
                                {rooms.slice(0, 5).map(room => (
                                    <div key={room.id}
                                        className="flex items-center justify-between py-1">
                                        <span className="text-xs font-medium truncate" style={{ color: 'var(--t-text)' }}>
                                            {room.name.split('/')[0].trim()}
                                        </span>
                                        <StatusBadge status={room.status} />
                                    </div>
                                ))}
                                {rooms.length > 5 && (
                                    <p className="text-[10px] text-center pt-1" style={{ color: 'var(--t-text3)' }}>
                                        +{rooms.length - 5} more rooms
                                    </p>
                                )}
                                {rooms.length === 0 && (
                                    <p className="text-xs text-center py-3" style={{ color: 'var(--t-text3)' }}>
                                        No rooms yet — add from Floor Plan
                                    </p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Modals */}
            {showFloorForm && (
                <Modal onClose={() => { setShowFloorForm(false); setEditFloor(null); reload(); }}>
                    <FloorForm
                        editFloor={editFloor}
                        onClose={() => { setShowFloorForm(false); setEditFloor(null); }}
                    />
                </Modal>
            )}
            {showRoomForm && (
                <Modal onClose={() => { setShowRoomForm(false); reload(); }}>
                    <RoomForm onClose={() => setShowRoomForm(false)} />
                </Modal>
            )}
        </div>
    );
}
