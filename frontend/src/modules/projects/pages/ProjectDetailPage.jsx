/**
 * ProjectDetailPage — Overview tab
 * Cross-module stats, quick links, timeline info for a single project.
 */
import React, { useEffect, useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { usePlatformBase } from '../../../shared/utils/platformNav';
import api from '../services/projectsApi';
import { useConstruction } from '../../../context/ConstructionContext';

const fmt = (n)  => `NPR ${(+n || 0).toLocaleString()}`;
const pct  = (v) => `${(+v || 0).toFixed(1)}%`;

const StatCard = ({ icon, label, value, sub, color = '#f97316' }) => (
    <div className="rounded-xl p-4 flex flex-col gap-1"
        style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
        <p className="text-2xl">{icon}</p>
        <p className="text-xl font-black mt-1" style={{ color }}>{value}</p>
        <p className="text-xs font-semibold" style={{ color: 'var(--t-text)' }}>{label}</p>
        {sub && <p className="text-[10px]" style={{ color: 'var(--t-text3)' }}>{sub}</p>}
    </div>
);

const ProgressBar = ({ value, max, color = '#f97316', label }) => {
    const p = max > 0 ? Math.min(100, (value / max) * 100) : 0;
    return (
        <div>
            <div className="flex justify-between text-[10px] mb-1.5">
                <span style={{ color: 'var(--t-text3)' }}>{label}</span>
                <span style={{ color: 'var(--t-text)' }}>{value} / {max} ({p.toFixed(0)}%)</span>
            </div>
            <div style={{ background: 'var(--t-border)', borderRadius: 6, height: 8, overflow: 'hidden' }}>
                <div style={{ width: `${p}%`, height: '100%', background: color, borderRadius: 6, transition: 'width 0.5s' }} />
            </div>
        </div>
    );
};

export default function ProjectDetailPage() {
    const { project }  = useOutletContext() || {};
    const navigate     = useNavigate();
    const base         = usePlatformBase();
    const isMobile     = base.includes('mobile');
    const { activeProjectId } = useConstruction();
    const [stats, setStats]   = useState(null);
    const [loadingStats, setLS] = useState(false);

    const id = project?.id || activeProjectId;

    useEffect(() => {
        if (!id) return;
        setLS(true);
        api.getStats(id)
            .then(r  => setStats(r.data))
            .catch(e => console.error('Stats failed', e))
            .finally(() => setLS(false));
    }, [id]);

    if (!id) return (
        <div className="flex flex-col items-center justify-center min-h-96 text-center px-8">
            <p className="text-4xl mb-3">🏗️</p>
            <p className="text-base font-semibold" style={{ color: 'var(--t-text3)' }}>
                No project selected. Go back to Projects and pick one.
            </p>
            <button onClick={() => navigate(`${base}/projects`)}
                className="mt-4 px-5 py-2.5 rounded-xl text-sm font-bold text-white"
                style={{ background: '#f97316' }}>
                ← Back to Projects
            </button>
        </div>
    );

    const s = stats;

    return (
        <div style={{ padding: isMobile ? '14px 14px 24px' : '24px', maxWidth: 960, margin: '0 auto' }} className="space-y-5">
            {/* Project banner */}
            {project && (
                <div className="rounded-2xl p-5 flex flex-wrap items-start gap-4"
                    style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl shrink-0"
                        style={{ background: 'rgba(234,88,12,0.12)' }}>
                        🏗️
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-xl font-black" style={{ color: 'var(--t-text)' }}>{project.name}</h2>
                        <p className="text-sm" style={{ color: 'var(--t-text3)' }}>📍 {project.address || '—'}</p>
                        <div className="flex flex-wrap gap-3 mt-2 text-xs">
                            <span style={{ color: 'var(--t-text3)' }}>👤 {project.owner_name || '—'}</span>
                            <span style={{ color: 'var(--t-text3)' }}>📅 {project.start_date} → {project.expected_completion_date}</span>
                            <span style={{ color: 'var(--t-text3)' }}>📐 {project.area_sqft ? `${project.area_sqft.toLocaleString()} ft²` : '—'}</span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => navigate(`${base}/projects/${id}/settings`)}
                            className="px-4 py-2 rounded-lg text-xs font-semibold"
                            style={{ background: 'var(--t-bg)', color: 'var(--t-text3)', border: '1px solid var(--t-border)' }}>
                            ⚙️ Settings
                        </button>
                        <button onClick={() => navigate(`${base}/projects/${id}/team`)}
                            className="px-4 py-2 rounded-lg text-xs font-semibold"
                            style={{ background: 'var(--t-bg)', color: 'var(--t-text3)', border: '1px solid var(--t-border)' }}>
                            👥 Team
                        </button>
                    </div>
                </div>
            )}

            {/* Stats loading */}
            {loadingStats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="rounded-xl h-24 animate-pulse"
                            style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)' }} />
                    ))}
                </div>
            )}

            {s && (
                <>
                    {/* ── Finance stats ───────────────────────────────────────── */}
                    <section>
                        <h3 className="text-sm font-black uppercase tracking-widest mb-3"
                            style={{ color: 'var(--t-text3)' }}>💰 Finance</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                            <StatCard icon="💰" label="Total Budget"   value={fmt(s.finance.budget)}    color="#f97316" />
                            <StatCard icon="💸" label="Total Spent"    value={fmt(s.finance.spent)}     color="#ef4444"
                                sub={`${pct(s.finance.used_pct)} used`} />
                            <StatCard icon="💼" label="Remaining"      value={fmt(s.finance.remaining)} color="#10b981" />
                            <StatCard icon="📊" label="Budget Used"    value={pct(s.finance.used_pct)}
                                color={s.finance.used_pct > 90 ? '#ef4444' : s.finance.used_pct > 70 ? '#f59e0b' : '#10b981'}
                                sub="of total budget" />
                        </div>
                        <ProgressBar value={s.finance.spent} max={s.finance.budget}
                            color={s.finance.used_pct > 90 ? '#ef4444' : '#f97316'} label="Budget Consumed" />
                    </section>

                    {/* ── Structure stats ─────────────────────────────────────── */}
                    <section>
                        <h3 className="text-sm font-black uppercase tracking-widest mb-3"
                            style={{ color: 'var(--t-text3)' }}>🏛️ Structure</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                            <StatCard icon="🏠" label="Total Rooms"     value={s.structure.rooms}      color="#8b5cf6" />
                            <StatCard icon="✅" label="Rooms Complete"  value={s.structure.rooms_done} color="#10b981"
                                sub={pct(s.structure.room_pct)} />
                            <StatCard icon="🏗️" label="Floors"         value={s.structure.floors}     color="#3b82f6" />
                            <StatCard icon="📐" label="Completion"      value={pct(s.structure.room_pct)}
                                color={s.structure.room_pct > 80 ? '#10b981' : s.structure.room_pct > 40 ? '#f59e0b' : '#f97316'} />
                        </div>
                        <ProgressBar value={s.structure.rooms_done} max={s.structure.rooms}
                            color="#8b5cf6" label="Rooms Completed" />
                    </section>

                    {/* ── Phases stats ────────────────────────────────────────── */}
                    <section>
                        <h3 className="text-sm font-black uppercase tracking-widest mb-3"
                            style={{ color: 'var(--t-text3)' }}>🏗️ Construction Phases</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                            <StatCard icon="📋" label="Total Phases"   value={s.phases.total}       color="#f59e0b" />
                            <StatCard icon="✅" label="Completed"      value={s.phases.completed}   color="#10b981"
                                sub={pct(s.phases.pct)} />
                            <StatCard icon="🔄" label="In Progress"    value={s.phases.in_progress} color="#3b82f6" />
                            <StatCard icon="📊" label="Phase Progress" value={pct(s.phases.pct)}
                                color={s.phases.pct > 80 ? '#10b981' : s.phases.pct > 40 ? '#f59e0b' : '#f97316'} />
                        </div>
                        <ProgressBar value={s.phases.completed} max={s.phases.total}
                            color="#f59e0b" label="Phases Completed" />
                    </section>

                    {/* ── Resources & Team ────────────────────────────────────── */}
                    <section>
                        <h3 className="text-sm font-black uppercase tracking-widest mb-3"
                            style={{ color: 'var(--t-text3)' }}>🧱 Resources & Team</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <StatCard icon="🧱" label="Materials"   value={s.resources.materials}   color="#f97316" />
                            <StatCard icon="🤝" label="Contractors" value={s.resources.contractors} color="#3b82f6" />
                            <StatCard icon="👥" label="Team Members" value={s.team.members}         color="#8b5cf6" />
                            <div
                                onClick={() => navigate(`${base}/resource`)}
                                className="rounded-xl p-4 cursor-pointer flex flex-col gap-1 hover:opacity-80 transition-opacity"
                                style={{ background: 'rgba(249,115,22,0.08)', border: '1px dashed #f97316' }}>
                                <p className="text-2xl">🧱</p>
                                <p className="text-xs font-bold mt-1" style={{ color: '#f97316' }}>Resource Module →</p>
                            </div>
                        </div>
                    </section>
                </>
            )}

            {/* Quick links */}
            <section>
                <h3 className="text-sm font-black uppercase tracking-widest mb-3"
                    style={{ color: 'var(--t-text3)' }}>⚡ Quick Links</h3>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(auto-fill, minmax(140px, 1fr))',
                    gap: isMobile ? 8 : 12,
                }}>
                    {[
                        { icon: '📅', label: 'Timeline',   path: `${base}/timeline`   },
                        { icon: '🏛️', label: 'Structure',  path: `${base}/structure`  },
                        { icon: '💰', label: 'Finance',    path: `${base}/finance`    },
                        { icon: '🧱', label: 'Resources',  path: `${base}/resource`   },
                        { icon: '📜', label: 'Permits',    path: `${base}/permits`    },
                        { icon: '📸', label: 'Gallery',    path: `${base}/photos`     },
                        { icon: '📈', label: 'Analytics',  path: `${base}/analytics`  },
                        { icon: '🛠️', label: 'Manage',    path: `${base}/manage`     },
                        { icon: '🧮', label: 'Estimator',  path: `${base}/estimator`  },
                    ].map(({ icon, label, path }) => (
                        <button key={path} onClick={() => navigate(path)}
                            style={{
                                display: 'flex',
                                flexDirection: isMobile ? 'column' : 'row',
                                alignItems: 'center',
                                justifyContent: isMobile ? 'center' : 'flex-start',
                                gap: isMobile ? 4 : 10,
                                padding: isMobile ? '12px 8px' : '12px 16px',
                                borderRadius: 12,
                                fontSize: isMobile ? 10 : 13,
                                fontWeight: 700,
                                cursor: 'pointer',
                                background: 'var(--t-surface)',
                                border: '1px solid var(--t-border)',
                                color: 'var(--t-text)',
                                transition: 'box-shadow 0.15s',
                            }}>
                            <span style={{ fontSize: isMobile ? 20 : 18 }}>{icon}</span>
                            {label}
                        </button>
                    ))}
                </div>
            </section>
        </div>
    );
}
