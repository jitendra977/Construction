import React from 'react';
import { useStructure } from '../context/StructureContext';
import StatusBadge, { STATUS_MAP } from '../components/shared/StatusBadge';

const FLOOR_COLORS = ['#ea580c', '#3b82f6', '#8b5cf6', '#10b981'];
const fmt = (n) => n ? `NPR ${(+n).toLocaleString()}` : '—';

export default function ProgressPage() {
    const { floors, allRooms, stats, loading } = useStructure();

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
        </div>
    );

    const overallPct = stats.totalRooms
        ? Math.round((stats.completedRooms / stats.totalRooms) * 100) : 0;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-black" style={{ color: 'var(--t-text)' }}>📊 Progress</h1>
                <p className="text-sm mt-0.5" style={{ color: 'var(--t-text3)' }}>
                    Construction completion by floor and room
                </p>
            </div>

            {/* Overall */}
            <div className="rounded-xl p-6" style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="font-bold" style={{ color: 'var(--t-text)' }}>Overall Progress</h2>
                    <span className="text-2xl font-black" style={{ color: '#f97316' }}>{overallPct}%</span>
                </div>
                <div className="h-4 rounded-full overflow-hidden" style={{ background: 'var(--t-border)' }}>
                    <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${overallPct}%`, background: 'linear-gradient(90deg,#ea580c,#f97316)' }}
                    />
                </div>
                <div className="grid grid-cols-3 gap-4 mt-5">
                    {Object.entries(STATUS_MAP).map(([k, v]) => {
                        const count = allRooms.filter(r => r.status === k).length;
                        const pct   = stats.totalRooms ? Math.round((count / stats.totalRooms) * 100) : 0;
                        return (
                            <div key={k} className="text-center rounded-lg p-3" style={{ background: 'var(--t-bg)' }}>
                                <p className="text-2xl font-black" style={{ color: v.dot }}>{count}</p>
                                <p className="text-xs font-semibold mt-0.5" style={{ color: 'var(--t-text3)' }}>{v.label}</p>
                                <p className="text-[10px]" style={{ color: 'var(--t-text3)' }}>{pct}%</p>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Per-floor */}
            <div className="space-y-4">
                <h2 className="font-bold text-sm" style={{ color: 'var(--t-text)' }}>By Floor</h2>
                {floors.map((floor, idx) => {
                    const color  = FLOOR_COLORS[idx % FLOOR_COLORS.length];
                    const rooms  = floor.rooms || [];
                    const done   = rooms.filter(r => r.status === 'COMPLETED').length;
                    const inProg = rooms.filter(r => r.status === 'IN_PROGRESS').length;
                    const pct    = rooms.length ? Math.round((done / rooms.length) * 100) : 0;
                    const totalArea  = rooms.reduce((s, r) => s + (r.area_sqft ? +r.area_sqft : (r.width_cm && r.depth_cm ? r.width_cm * r.depth_cm / 929.03 : 0)), 0);
                    const totalBudget = rooms.reduce((s, r) => s + (+r.budget_allocation || 0), 0);

                    return (
                        <div key={floor.id} className="rounded-xl overflow-hidden"
                            style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
                            {/* Floor header */}
                            <div className="px-5 py-3 flex items-center justify-between"
                                style={{ borderLeft: `4px solid ${color}`, background: `${color}10` }}>
                                <div>
                                    <h3 className="font-bold" style={{ color: 'var(--t-text)' }}>{floor.name}</h3>
                                    <p className="text-xs" style={{ color: 'var(--t-text3)' }}>
                                        Level {floor.level} · {rooms.length} rooms · {totalArea.toFixed(0)} ft² · {fmt(totalBudget)}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-xl font-black" style={{ color }}>{pct}%</span>
                                </div>
                            </div>

                            {/* Floor progress bar */}
                            <div className="px-5 py-2">
                                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--t-border)' }}>
                                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                                </div>
                                <div className="flex gap-4 mt-2 text-[10px]" style={{ color: 'var(--t-text3)' }}>
                                    <span>✅ {done} done</span>
                                    <span>🔵 {inProg} in progress</span>
                                    <span>⬜ {rooms.length - done - inProg} not started</span>
                                </div>
                            </div>

                            {/* Room rows */}
                            {rooms.length > 0 && (
                                <div className="px-5 pb-4">
                                    <table className="w-full text-xs" style={{ color: 'var(--t-text)' }}>
                                        <thead>
                                            <tr style={{ color: 'var(--t-text3)' }}>
                                                <th className="text-left py-1.5 font-semibold">Room</th>
                                                <th className="text-center py-1.5 font-semibold">Area</th>
                                                <th className="text-center py-1.5 font-semibold">Budget</th>
                                                <th className="text-right py-1.5 font-semibold">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {rooms.map(room => {
                                                const area = room.area_sqft
                                                    ? +room.area_sqft
                                                    : (room.width_cm && room.depth_cm ? +(room.width_cm * room.depth_cm / 929.03).toFixed(1) : null);
                                                return (
                                                    <tr key={room.id} style={{ borderTop: '1px solid var(--t-border)' }}>
                                                        <td className="py-1.5 font-medium">
                                                            {room.name.split('/')[0].trim()}
                                                        </td>
                                                        <td className="text-center py-1.5" style={{ color: 'var(--t-text3)' }}>
                                                            {area ? `${area.toFixed(1)} ft²` : '—'}
                                                        </td>
                                                        <td className="text-center py-1.5" style={{ color: 'var(--t-text3)' }}>
                                                            {+room.budget_allocation > 0 ? fmt(room.budget_allocation) : '—'}
                                                        </td>
                                                        <td className="text-right py-1.5">
                                                            <StatusBadge status={room.status} />
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
