import React from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlatformBase } from '../../../../shared/utils/platformNav';

const fmt = (n) => n ? `NPR ${(+n).toLocaleString()}` : '—';

const HealthDot = ({ status }) => {
    const map = {
        HEALTHY:      { color: '#10b981', label: 'Healthy' },
        WARNING:      { color: '#f59e0b', label: 'Warning' },
        OVER_ALLOCATED: { color: '#f97316', label: 'Over Budget' },
        OVER_SPENT:   { color: '#ef4444', label: 'Over Spent' },
    };
    const s = map[status] || map.HEALTHY;
    return (
        <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold"
            style={{ color: s.color }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
            {s.label}
        </span>
    );
};

const MiniBar = ({ value, max, color = '#f97316' }) => {
    const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
    return (
        <div style={{ background: 'var(--t-border)', borderRadius: 4, height: 5, overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.4s' }} />
        </div>
    );
};

export default function ProjectCard({ project, isActive, onActivate, onEdit }) {
    const navigate = useNavigate();
    const base     = usePlatformBase();
    const isMobile = base.includes('mobile');

    const phaseTotal = project.phase_count       || 0;
    const phaseDone  = project.completed_phase_count || 0;
    const phasePct   = phaseTotal > 0 ? Math.round(phaseDone / phaseTotal * 100) : 0;

    const roomTotal  = project.room_count        || 0;
    const roomDone   = project.completed_room_count || 0;
    const roomPct    = roomTotal > 0 ? Math.round(roomDone / roomTotal * 100) : 0;

    const health     = project.budget_health?.status || 'HEALTHY';

    return (
        <div
            className="rounded-2xl cursor-pointer transition-all hover:shadow-lg flex flex-col"
            style={{
                background:  'var(--t-surface)',
                border:      `2px solid ${isActive ? '#f97316' : 'var(--t-border)'}`,
                boxShadow:   isActive ? '0 0 0 3px rgba(249,115,22,0.12)' : undefined,
                padding:     isMobile ? '14px' : '20px',
                gap:         isMobile ? 12 : 16,
            }}
            onClick={onActivate}
        >
            {/* Header */}
            <div className="flex items-start gap-3">
                <div
                    className="rounded-xl flex items-center justify-center shrink-0"
                    style={{
                        width: isMobile ? 38 : 48,
                        height: isMobile ? 38 : 48,
                        fontSize: isMobile ? 18 : 24,
                        background: 'rgba(234,88,12,0.12)',
                    }}>
                    🏗️
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-base truncate" style={{ color: 'var(--t-text)' }}>
                            {project.name}
                        </h3>
                        {isActive && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                style={{ background: 'rgba(249,115,22,0.15)', color: '#f97316' }}>
                                ● ACTIVE
                            </span>
                        )}
                    </div>
                    <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--t-text3)' }}>
                        📍 {project.address || '—'}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--t-text3)' }}>
                        👤 {project.owner_name || '—'}
                    </p>
                </div>
                <HealthDot status={health} />
            </div>

            {/* Key stats */}
            <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg p-2" style={{ background: 'var(--t-bg)' }}>
                    <p className="text-xs font-black" style={{ color: '#f97316' }}>
                        {fmt(project.total_budget)}
                    </p>
                    <p className="text-[9px] mt-0.5" style={{ color: 'var(--t-text3)' }}>Total Budget</p>
                </div>
                <div className="rounded-lg p-2" style={{ background: 'var(--t-bg)' }}>
                    <p className="text-xs font-black" style={{ color: 'var(--t-text)' }}>
                        {project.area_sqft ? `${project.area_sqft.toLocaleString()} ft²` : '—'}
                    </p>
                    <p className="text-[9px] mt-0.5" style={{ color: 'var(--t-text3)' }}>Build Area</p>
                </div>
                <div className="rounded-lg p-2" style={{ background: 'var(--t-bg)' }}>
                    <p className="text-xs font-black" style={{ color: 'var(--t-text)' }}>
                        {project.member_count || 0}
                    </p>
                    <p className="text-[9px] mt-0.5" style={{ color: 'var(--t-text3)' }}>Team Members</p>
                </div>
            </div>

            {/* Progress bars */}
            <div className="space-y-2.5">
                <div>
                    <div className="flex justify-between text-[10px] mb-1">
                        <span style={{ color: 'var(--t-text3)' }}>🏗️ Phases</span>
                        <span style={{ color: 'var(--t-text)' }}>{phaseDone}/{phaseTotal} ({phasePct}%)</span>
                    </div>
                    <MiniBar value={phaseDone} max={phaseTotal} color="#3b82f6" />
                </div>
                <div>
                    <div className="flex justify-between text-[10px] mb-1">
                        <span style={{ color: 'var(--t-text3)' }}>🏠 Rooms</span>
                        <span style={{ color: 'var(--t-text)' }}>{roomDone}/{roomTotal} ({roomPct}%)</span>
                    </div>
                    <MiniBar value={roomDone} max={roomTotal} color="#10b981" />
                </div>
            </div>

            {/* Timeline */}
            <div className="flex items-center justify-between text-[10px] pt-2"
                style={{ borderTop: '1px solid var(--t-border)' }}>
                <span style={{ color: 'var(--t-text3)' }}>
                    📅 Start: {project.start_date || '—'}
                </span>
                <span style={{ color: 'var(--t-text3)' }}>
                    🏁 ETA: {project.expected_completion_date || '—'}
                </span>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button
                    style={{
                        flex: 1,
                        padding: isMobile ? '9px 0' : '8px 0',
                        borderRadius: 10, fontSize: isMobile ? 11 : 12,
                        fontWeight: 800, cursor: 'pointer',
                        background: isActive ? 'rgba(249,115,22,0.15)' : 'var(--t-bg)',
                        color:      isActive ? '#f97316' : 'var(--t-text3)',
                        border:     `1px solid ${isActive ? '#f97316' : 'var(--t-border)'}`,
                    }}
                    onClick={(e) => { e.stopPropagation(); onActivate(); }}>
                    {isActive ? '✓ Active Project' : 'Set as Active'}
                </button>
                <button
                    style={{
                        flex: 1,
                        padding: isMobile ? '9px 0' : '8px 0',
                        borderRadius: 10, fontSize: isMobile ? 11 : 12,
                        fontWeight: 800, cursor: 'pointer',
                        background: '#f97316', color: '#fff', border: 'none',
                    }}
                    onClick={(e) => {
                        e.stopPropagation();
                        onActivate();
                        navigate(`${base}/projects/${project.id}/overview`);
                    }}>
                    Open →
                </button>
            </div>
        </div>
    );
}
