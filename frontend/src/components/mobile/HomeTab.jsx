import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useConstruction } from '../../context/ConstructionContext';
import { useMobileTracker } from '../../modules/location/context/MobileTrackerContext';
import attendanceService from '../../services/attendanceService';

/* ─── Helpers ───────────────────────────────────────────────────── */
const fmtShort = d => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtRs = n => `Rs. ${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const fmt$ = n => {
    if (!n) return '0';
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
    return String(n);
};

/* ─── GPS permission banner ─────────────────────────────────────── */
function GPSPermissionBanner() {
    const tracker = useMobileTracker();
    if (!tracker) return null;
    const { permission, requestPermission } = tracker;

    if (permission === 'granted') return null;

    const isDenied  = permission === 'denied';
    const isPrompt  = permission === 'prompt' || permission === 'unknown';
    if (!isDenied && !isPrompt) return null;

    return (
        <div style={{
            margin: '0 16px 16px',
            background: 'var(--t-surface)',
            border: `1px solid ${isDenied ? '#ef444440' : 'var(--t-primary)40'}`,
            borderLeft: `3px solid ${isDenied ? '#ef4444' : 'var(--t-primary)'}`,
            borderRadius: 12,
            padding: '12px 14px',
            display: 'flex', alignItems: 'center', gap: 12,
        }}>
            <span style={{ fontSize: 20, flexShrink: 0 }}>{isDenied ? '📵' : '📍'}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--t-text)', marginBottom: 2 }}>
                    {isDenied ? 'Location access blocked' : 'Enable GPS for auto check-in'}
                </p>
                <p style={{ fontSize: 11, color: 'var(--t-text3)', lineHeight: 1.4 }}>
                    {isDenied
                        ? 'Allow location in browser settings to track your attendance.'
                        : 'Tap to allow GPS so your arrival is logged automatically.'}
                </p>
            </div>
            {isPrompt ? (
                /* Popup is auto-triggered — show a subtle spinner/label while browser dialog is pending */
                <span style={{
                    flexShrink: 0, fontSize: 10, fontWeight: 600,
                    color: 'var(--t-primary)', opacity: 0.7,
                }}>
                    …
                </span>
            ) : (
                <Link to="/dashboard/mobile/tracking" style={{
                    flexShrink: 0, padding: '7px 12px', borderRadius: 8,
                    background: 'var(--t-surface2)', color: 'var(--t-text2)',
                    border: '1px solid var(--t-border)', textDecoration: 'none',
                    fontSize: 11, fontWeight: 700,
                }}>
                    Fix →
                </Link>
            )}
        </div>
    );
}

/* ─── Donut ring ────────────────────────────────────────────────── */
function Donut({ pct = 0, size = 64, stroke = 6, color = 'var(--t-primary)' }) {
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    return (
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
            <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--t-border)" strokeWidth={stroke} />
            <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
                strokeDasharray={`${(Math.min(pct,100)/100)*c} ${c}`} strokeLinecap="round"
                style={{ transition: 'stroke-dasharray 1s ease' }} />
        </svg>
    );
}

/* ─── Thin progress bar ─────────────────────────────────────────── */
function Bar({ pct = 0, color = 'var(--t-primary)' }) {
    return (
        <div style={{ height: 3, borderRadius: 99, background: 'var(--t-border)', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 99, width: `${Math.min(pct, 100)}%`, background: color, transition: 'width 1s ease' }} />
        </div>
    );
}

/* ─── Section label ─────────────────────────────────────────────── */
function SectionLabel({ children, action, onAction }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--t-text)', letterSpacing: '-0.01em' }}>{children}</p>
            {action && (
                <button onClick={onAction} style={{ fontSize: 11, color: 'var(--t-text3)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 500 }}>
                    {action}
                </button>
            )}
        </div>
    );
}

/* ─── Card wrapper ──────────────────────────────────────────────── */
function Card({ children, onClick, style = {} }) {
    return (
        <div onClick={onClick}
            style={{
                background: 'var(--t-surface)',
                border: '1px solid var(--t-border)',
                borderRadius: 16,
                padding: '16px',
                cursor: onClick ? 'pointer' : 'default',
                ...style,
            }}>
            {children}
        </div>
    );
}

/* ─── Attendance ────────────────────────────────────────────────── */
function AttendanceCard({ projectId }) {
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [busy, setBusy] = useState(true);
    useEffect(() => {
        if (!projectId) { setBusy(false); return; }
        attendanceService.getLive(projectId).then(setData).catch(() => {}).finally(() => setBusy(false));
    }, [projectId]);
    const present = data?.present_count ?? data?.present ?? 0;
    const absent  = data?.absent_count  ?? data?.absent  ?? 0;
    const total   = data?.total_workers ?? data?.total   ?? (present + absent);
    const rate    = total > 0 ? Math.round(present / total * 100) : 0;

    return (
        <Card onClick={() => navigate('/dashboard/mobile/attendance/daily')}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--t-text3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Workforce Today</p>
                <span style={{ fontSize: 9, fontWeight: 700, color: '#22c55e', background: '#22c55e12', padding: '3px 8px', borderRadius: 20, border: '1px solid #22c55e25', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Live</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                    <Donut pct={busy ? 0 : rate} size={60} stroke={5} color="#22c55e" />
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--t-text)' }}>{busy ? '—' : `${rate}%`}</span>
                    </div>
                </div>
                <div style={{ flex: 1, display: 'flex', gap: 0 }}>
                    {[
                        { n: present, l: 'Present', c: '#22c55e' },
                        { n: absent,  l: 'Absent',  c: '#ef4444' },
                        { n: total,   l: 'Total',   c: 'var(--t-text)' },
                    ].map((s, i) => (
                        <div key={s.l} style={{ flex: 1, paddingLeft: i > 0 ? 12 : 0, borderLeft: i > 0 ? '1px solid var(--t-border)' : 'none', marginLeft: i > 0 ? 12 : 0 }}>
                            <p style={{ fontSize: 22, fontWeight: 800, color: s.c, lineHeight: 1, marginBottom: 3 }}>{s.n}</p>
                            <p style={{ fontSize: 9, color: 'var(--t-text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.l}</p>
                        </div>
                    ))}
                </div>
            </div>
        </Card>
    );
}

/* ─── Quick nav ─────────────────────────────────────────────────── */
const NAV = [
    { icon: '📋', label: 'Phases',    path: '/dashboard/mobile/phases'    },
    { icon: '💰', label: 'Finance',   path: '/dashboard/mobile/finance'   },
    { icon: '👷', label: 'Workforce', path: '/dashboard/mobile/workforce/members'},
    { icon: '📅', label: 'Timeline',  path: '/dashboard/mobile/timeline'  },
    { icon: '🗺️', label: 'Site Map',  path: '/dashboard/mobile/location'  },
    { icon: '🧱', label: 'Resources', path: '/dashboard/mobile/resource'  },
    { icon: '📸', label: 'Photos',    path: '/dashboard/mobile/photos'    },
    { icon: '📜', label: 'Permits',   path: '/dashboard/mobile/permits'   },
];

/* ─── Phase status ──────────────────────────────────────────────── */
const PH = {
    COMPLETED:   { color: '#22c55e', label: 'Done'    },
    IN_PROGRESS: { color: 'var(--t-primary)', label: 'Active'  },
    PENDING:     { color: 'var(--t-text3)',   label: 'Pending' },
    HALTED:      { color: '#ef4444', label: 'Halted'  },
};

/* ═══════════════════════════════════════════════════════════════ */
export default function HomeTab() {
    const { dashboardData, budgetStats, user, activeProjectId } = useConstruction();
    const navigate = useNavigate();

    const project  = dashboardData?.project || {};
    const phases   = dashboardData?.phases  || [];
    const allTasks = dashboardData?.tasks   || [];

    const doneCnt    = allTasks.filter(t => t.status === 'COMPLETED').length;
    const activeCnt  = allTasks.filter(t => t.status === 'IN_PROGRESS').length;
    const pendCnt    = allTasks.filter(t => t.status === 'PENDING').length;
    const overallPct = allTasks.length > 0 ? Math.round(doneCnt / allTasks.length * 100) : 0;

    const activePh      = phases.find(p => p.status === 'IN_PROGRESS');
    const activePhTasks = activePh ? allTasks.filter(t => t.phase === activePh.id) : [];
    const activePhPct   = activePhTasks.length > 0
        ? Math.round(activePhTasks.filter(t => t.status === 'COMPLETED').length / activePhTasks.length * 100) : 0;

    const totalBudget = useMemo(
        () => (dashboardData?.budgetCategories || []).reduce((sum, cat) => sum + Number(cat?.allocation || 0), 0),
        [dashboardData?.budgetCategories]
    );
    const usedBudget  = Number(budgetStats?.totalSpent || 0);
    const budgetPct   = totalBudget > 0 ? Math.round(usedBudget / totalBudget * 100) : 0;

    return (
        <div style={{ minHeight: '100vh', background: 'var(--t-bg)', paddingBottom: 110, overflowX: 'hidden' }}>

            {/* ══ HEADER ═══════════════════════════════════════════ */}
            <div style={{
                position: 'sticky',
                top: 0,
                zIndex: 30,
                background: 'var(--t-surface)',
                borderBottom: '1px solid var(--t-border)',
                padding: '14px',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, marginBottom: 12 }}>
                    <div style={{
                        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 20, background: 'rgba(249,115,22,0.12)',
                        border: '1px solid rgba(249,115,22,0.25)',
                    }}>🏠</div>
                    <div style={{ minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 15, fontWeight: 900, color: 'var(--t-text)' }}>
                            Dashboard
                        </p>
                        <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: 'var(--t-text3)', letterSpacing: '0.06em' }}>
                            {doneCnt}/{allTasks.length || 0} tasks · {phases.length} phases
                        </p>
                    </div>
                </div>

                {/* Overall progress */}
                <div style={{ padding: '14px 16px', background: 'var(--t-surface2)', borderRadius: 12, border: '1px solid var(--t-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <p style={{ fontSize: 11, color: 'var(--t-text3)', fontWeight: 600 }}>Overall Progress</p>
                        <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--t-primary)' }}>{overallPct}%</p>
                    </div>
                    <Bar pct={overallPct} />
                    <div style={{ display: 'flex', gap: 14, marginTop: 8 }}>
                        <p style={{ fontSize: 11, color: 'var(--t-text3)' }}><b style={{ color: 'var(--t-text)', fontWeight: 700 }}>{doneCnt}</b> done</p>
                        <p style={{ fontSize: 11, color: 'var(--t-text3)' }}><b style={{ color: 'var(--t-text)', fontWeight: 700 }}>{activeCnt}</b> active</p>
                        <p style={{ fontSize: 11, color: 'var(--t-text3)' }}><b style={{ color: 'var(--t-text)', fontWeight: 700 }}>{allTasks.length}</b> total</p>
                    </div>
                </div>
            </div>

            {/* ══ GPS PERMISSION BANNER ════════════════════════════ */}
            <GPSPermissionBanner />

            {/* ══ BODY ═════════════════════════════════════════════ */}
            <div style={{ padding: '20px 16px' }}>

                {/* ── STAT STRIP ── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 20 }}>
                    {[
                        { val: doneCnt,       lbl: 'Done',    color: '#22c55e' },
                        { val: activeCnt,     lbl: 'Active',  color: 'var(--t-primary)' },
                        { val: pendCnt,       lbl: 'Pending', color: 'var(--t-text3)' },
                        { val: phases.length, lbl: 'Phases',  color: 'var(--t-text)'   },
                    ].map(s => (
                        <div key={s.lbl} style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)', borderRadius: 12, padding: '12px 8px', textAlign: 'center' }}>
                            <p style={{ fontSize: 22, fontWeight: 800, color: s.color, lineHeight: 1, marginBottom: 4 }}>{s.val}</p>
                            <p style={{ fontSize: 9, color: 'var(--t-text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.lbl}</p>
                        </div>
                    ))}
                </div>

                {/* ── ATTENDANCE ── */}
                <div style={{ marginBottom: 20 }}>
                    <AttendanceCard projectId={project?.id || activeProjectId} />
                </div>

                {/* ── QUICK ACCESS ── */}
                <div style={{ marginBottom: 20 }}>
                    <SectionLabel action="See all" onAction={() => {}}>Quick Access</SectionLabel>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                        {NAV.map(q => (
                            <button key={q.label} onClick={() => navigate(q.path)}
                                style={{ border: 'none', padding: 0, background: 'none', cursor: 'pointer' }}
                                onTouchStart={e => e.currentTarget.firstChild.style.opacity = '0.65'}
                                onTouchEnd={e => e.currentTarget.firstChild.style.opacity = '1'}
                            >
                                <div style={{
                                    background: 'var(--t-surface)', border: '1px solid var(--t-border)',
                                    borderRadius: 14, padding: '14px 6px 12px',
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
                                    transition: 'opacity 0.1s',
                                }}>
                                    <span style={{ fontSize: 22, lineHeight: 1 }}>{q.icon}</span>
                                    <span style={{ fontSize: 9, color: 'var(--t-text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center', lineHeight: 1.3 }}>{q.label}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── ACTIVE PHASE ── */}
                {activePh && (
                    <div style={{ marginBottom: 20 }}>
                        <SectionLabel>Active Phase</SectionLabel>
                        <Card onClick={() => navigate('/dashboard/mobile/phases')}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
                                    <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--t-text)', lineHeight: 1.3, marginBottom: 2 }}>{activePh.name}</p>
                                    <p style={{ fontSize: 11, color: 'var(--t-text3)' }}>
                                        {activePhTasks.filter(t => t.status === 'COMPLETED').length} / {activePhTasks.length} tasks
                                    </p>
                                </div>
                                <p style={{ fontSize: 24, fontWeight: 800, color: 'var(--t-primary)', flexShrink: 0 }}>{activePhPct}%</p>
                            </div>
                            <Bar pct={activePhPct} />
                        </Card>
                    </div>
                )}

                {/* ── BUDGET + SCHEDULE ── */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
                    {/* Budget */}
                    <Card>
                        <p style={{ fontSize: 10, color: 'var(--t-text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Budget</p>
                        <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--t-text)', lineHeight: 1.15, marginBottom: 2 }}>{fmtRs(usedBudget)}</p>
                        <p style={{ fontSize: 10, color: 'var(--t-text3)', marginBottom: 10 }}>of {fmtRs(totalBudget)}</p>
                        <Bar pct={budgetPct} color={budgetPct > 90 ? '#ef4444' : budgetPct > 70 ? '#f59e0b' : '#22c55e'} />
                        <p style={{ fontSize: 10, fontWeight: 700, color: budgetPct > 90 ? '#ef4444' : 'var(--t-text3)', marginTop: 6 }}>{budgetPct}% used</p>
                    </Card>

                    {/* Schedule */}
                    <Card>
                        <p style={{ fontSize: 10, color: 'var(--t-text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Schedule</p>
                        <div style={{ marginBottom: 8 }}>
                            <p style={{ fontSize: 9, color: 'var(--t-text3)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 3 }}>Start</p>
                            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--t-text)' }}>{fmtShort(project.start_date)}</p>
                        </div>
                        <div style={{ height: 1, background: 'var(--t-border)', marginBottom: 8 }} />
                        <div>
                            <p style={{ fontSize: 9, color: 'var(--t-text3)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 3 }}>Target</p>
                            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--t-text)' }}>{fmtShort(project.end_date)}</p>
                        </div>
                    </Card>
                </div>

                {/* ── PHASES ── */}
                {phases.length > 0 && (
                    <div>
                        <SectionLabel action="View all →" onAction={() => navigate('/dashboard/mobile/phases')}>Phases</SectionLabel>
                        <div style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)', borderRadius: 16, overflow: 'hidden' }}>
                            {phases.slice(0, 4).map((ph, idx, arr) => {
                                const pt  = allTasks.filter(t => t.phase === ph.id);
                                const pct = pt.length > 0 ? Math.round(pt.filter(t => t.status === 'COMPLETED').length / pt.length * 100) : 0;
                                const sc  = PH[ph.status] || PH.PENDING;
                                return (
                                    <button key={ph.id} onClick={() => navigate('/dashboard/mobile/phases')}
                                        style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', padding: 0, display: 'block', textAlign: 'left' }}>
                                        <div style={{
                                            padding: '13px 16px',
                                            borderBottom: idx < arr.length - 1 ? '1px solid var(--t-border)' : 'none',
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                                                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: sc.color, flexShrink: 0 }} />
                                                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--t-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ph.name}</p>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                                    <span style={{ fontSize: 10, color: 'var(--t-text3)', fontWeight: 500 }}>{pt.length}t</span>
                                                    <span style={{ fontSize: 12, fontWeight: 700, color: sc.color }}>{pct}%</span>
                                                </div>
                                            </div>
                                            <Bar pct={pct} color={sc.color} />
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
