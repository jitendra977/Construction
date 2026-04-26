import React from 'react';
import StatusBadge from '../shared/StatusBadge';

const ROOM_TYPE_ICONS = {
    BEDROOM:   '🛏️', KITCHEN:   '🍳', BATHROOM:  '🚿',
    LIVING:    '🛋️', DINING:    '🍽️', OFFICE:    '💼',
    STORE:     '📦', STAIRCASE: '🪜', TERRACE:   '🌿',
    BALCONY:   '🌸', PUJA:      '🪔', GARAGE:    '🚗',
    LAUNDRY:   '👕', HALL:      '🏛️', OTHER:     '🏠',
};

const FINISH_LABEL = {
    TILE: 'Tile', MARBLE: 'Marble', GRANITE: 'Granite',
    WOOD: 'Wood', CEMENT: 'Cement', STONE: 'Stone',
    PAINT: 'Paint', PLASTER: 'Plaster', OTHER: 'Other',
};

const PRIORITY_CONFIG = {
    HIGH:   { emoji: '🔴', label: 'High',   color: '#ef4444' },
    MEDIUM: { emoji: '🟡', label: 'Medium', color: '#f59e0b' },
    LOW:    { emoji: '🟢', label: 'Low',    color: '#10b981' },
};

const roomIcon = (room) =>
    ROOM_TYPE_ICONS[room.room_type] || (() => {
        const n = (room.name || '').toLowerCase();
        if (n.includes('bed') || n.includes('कोठा')) return '🛏️';
        if (n.includes('kitchen') || n.includes('भान्सा')) return '🍳';
        if (n.includes('toilet') || n.includes('bath')) return '🚿';
        if (n.includes('living') || n.includes('बैठक')) return '🛋️';
        if (n.includes('puja') || n.includes('पूजा')) return '🪔';
        return '🏠';
    })();

const fmt = (n) => n ? `NPR ${(+n).toLocaleString()}` : '—';

const fmtDate = (d) => {
    if (!d) return null;
    const dt = new Date(d);
    return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const isHex = (s) => /^#[0-9a-fA-F]{3,6}$/.test((s || '').trim());

const Chip = ({ children, color }) => (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium"
        style={{
            background: color ? `${color}18` : 'var(--t-bg)',
            color: color || 'var(--t-text3)',
            border: `1px solid ${color ? `${color}50` : 'var(--t-border)'}`,
        }}>
        {children}
    </span>
);

export default function RoomCard({ room, floorName, onClick }) {
    const w = room.width_cm, d = room.depth_cm;
    const areaSqft = room.area_sqft
        ? +room.area_sqft
        : (w && d ? +(w * d / 929.03).toFixed(1) : null);
    const icon = roomIcon(room);

    const priority   = PRIORITY_CONFIG[room.priority] || null;
    const hasMEP     = room.electrical_points > 0 || room.light_points > 0
                    || room.fan_points > 0 || room.ac_provision || room.plumbing_points > 0;
    const colorSwatch = room.color_scheme && isHex(room.color_scheme) ? room.color_scheme.trim() : null;

    return (
        <div
            onClick={onClick}
            className="rounded-xl p-4 cursor-pointer transition-all hover:shadow-md"
            style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)' }}
        >
            {/* Header row */}
            <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0"
                    style={{ background: 'rgba(234,88,12,0.1)' }}>
                    {icon}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-semibold text-sm truncate" style={{ color: 'var(--t-text)' }}>
                            {room.name}
                        </p>
                        {priority && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                                style={{ background: `${priority.color}18`, color: priority.color, border: `1px solid ${priority.color}50` }}>
                                {priority.emoji} {priority.label}
                            </span>
                        )}
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--t-text3)' }}>
                        {floorName || 'Unknown Floor'}
                    </p>
                </div>
                <StatusBadge status={room.status} />
            </div>

            {/* Dimensions row */}
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div>
                    <p className="text-[10px] font-medium" style={{ color: 'var(--t-text3)' }}>Size</p>
                    <p className="text-xs font-bold mt-0.5" style={{ color: 'var(--t-text)' }}>
                        {w && d ? `${w}×${d} cm` : '—'}
                    </p>
                </div>
                <div>
                    <p className="text-[10px] font-medium" style={{ color: 'var(--t-text3)' }}>Area</p>
                    <p className="text-xs font-bold mt-0.5" style={{ color: 'var(--t-text)' }}>
                        {areaSqft ? `${areaSqft.toFixed(1)} ft²` : '—'}
                    </p>
                </div>
                <div>
                    <p className="text-[10px] font-medium" style={{ color: 'var(--t-text3)' }}>Ceiling</p>
                    <p className="text-xs font-bold mt-0.5" style={{ color: 'var(--t-text)' }}>
                        {room.ceiling_height_cm ? `${room.ceiling_height_cm} cm` : '—'}
                    </p>
                </div>
            </div>

            {/* Finish + openings chips */}
            {(room.floor_finish || room.wall_finish || room.door_count > 0 || room.window_count > 0) && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                    {room.floor_finish && <Chip>🪵 {FINISH_LABEL[room.floor_finish] || room.floor_finish}</Chip>}
                    {room.wall_finish  && <Chip>🎨 {FINISH_LABEL[room.wall_finish]  || room.wall_finish}</Chip>}
                    {room.door_count   > 0 && <Chip>🚪 {room.door_count}</Chip>}
                    {room.window_count > 0 && <Chip>🪟 {room.window_count}</Chip>}
                    {colorSwatch && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                            style={{ background: 'var(--t-bg)', color: 'var(--t-text3)', border: '1px solid var(--t-border)' }}>
                            <span style={{ width: 10, height: 10, borderRadius: '50%', background: colorSwatch, display: 'inline-block', border: '1px solid rgba(0,0,0,0.15)' }} />
                            {room.color_scheme}
                        </span>
                    )}
                    {!colorSwatch && room.color_scheme && (
                        <Chip>🖌 {room.color_scheme}</Chip>
                    )}
                </div>
            )}

            {/* MEP summary chips */}
            {hasMEP && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                    {room.electrical_points > 0 && <Chip color="#f59e0b">⚡ {room.electrical_points}</Chip>}
                    {room.light_points      > 0 && <Chip color="#f59e0b">💡 {room.light_points}</Chip>}
                    {room.fan_points        > 0 && <Chip color="#f59e0b">🌀 {room.fan_points}</Chip>}
                    {room.ac_provision          && <Chip color="#3b82f6">❄️ AC</Chip>}
                    {room.plumbing_points   > 0 && <Chip color="#3b82f6">🔧 {room.plumbing_points}</Chip>}
                </div>
            )}

            {/* Completion date */}
            {room.completion_date && (
                <div className="mt-2 flex items-center gap-1.5">
                    <span className="text-[10px]" style={{ color: 'var(--t-text3)' }}>📅</span>
                    <span className="text-[10px]" style={{ color: 'var(--t-text3)' }}>
                        {fmtDate(room.completion_date)}
                    </span>
                </div>
            )}

            {/* Budget */}
            {+room.budget_allocation > 0 && (
                <div className="mt-3 pt-2.5 flex items-center justify-between"
                    style={{ borderTop: '1px solid var(--t-border)' }}>
                    <span className="text-[10px] font-medium" style={{ color: 'var(--t-text3)' }}>Budget</span>
                    <span className="text-xs font-bold" style={{ color: '#f97316' }}>
                        {fmt(room.budget_allocation)}
                    </span>
                </div>
            )}

            {/* Notes preview */}
            {room.notes && (
                <p className="mt-2 text-[10px] italic truncate" style={{ color: 'var(--t-text3)' }}>
                    💬 {room.notes}
                </p>
            )}
        </div>
    );
}
