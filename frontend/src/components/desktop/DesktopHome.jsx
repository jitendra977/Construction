import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../common/Modal';
import SuccessModal from '../common/SuccessModal';
import WastageAlertPanel from '../common/WastageAlertPanel';
import { constructionService, permitService, dashboardService } from '../../services/api';
import { useConstruction } from '../../context/ConstructionContext';
import ConfirmModal from '../common/ConfirmModal';
import attendanceService from '../../services/attendanceService';

/* ── Donut ring ─────────────────────────────────────────────────── */
function DonutRing({ pct = 0, size = 72, stroke = 7, color = '#f97316', track = 'var(--t-border)' }) {
    const r    = (size - stroke) / 2;
    const circ = 2 * Math.PI * r;
    const dash = (Math.min(pct, 100) / 100) * circ;
    return (
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
                strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
                style={{ transition: 'stroke-dasharray 1s ease' }} />
        </svg>
    );
}

/* ── KPI tile ───────────────────────────────────────────────────── */
function KpiTile({ icon, label, value, sub, color, bg, onClick }) {
    return (
        <div onClick={onClick}
            style={{
                background: bg || 'var(--t-surface)',
                border: `1px solid ${color}25`,
                borderRadius: 18,
                padding: '20px',
                cursor: onClick ? 'pointer' : 'default',
                transition: 'transform 0.15s, box-shadow 0.15s',
                position: 'relative', overflow: 'hidden',
            }}
            onMouseEnter={e => { if (onClick) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${color}20`; } }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
        >
            {/* Glow orb */}
            <div style={{
                position: 'absolute', top: -20, right: -20,
                width: 80, height: 80, borderRadius: '50%',
                background: `${color}15`,
            }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--t-text3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    {label}
                </span>
                <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: `${color}18`, color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, flexShrink: 0, position: 'relative',
                }}>
                    {icon}
                </div>
            </div>
            <p style={{ fontSize: 30, fontWeight: 900, color: 'var(--t-text)', lineHeight: 1, letterSpacing: '-0.02em' }}>{value}</p>
            {sub && <p style={{ fontSize: 11, color: 'var(--t-text3)', marginTop: 5 }}>{sub}</p>}
        </div>
    );
}

/* ── Phase row ──────────────────────────────────────────────────── */
const STATUS_META = {
    COMPLETED:   { label: 'Done',     color: '#10b981', bg: '#10b98115' },
    IN_PROGRESS: { label: 'Active',   color: '#f97316', bg: '#f9731615' },
    PENDING:     { label: 'Pending',  color: '#6b7280', bg: '#6b728015' },
    HALTED:      { label: 'Halted',   color: '#ef4444', bg: '#ef444415' },
    NOT_STARTED: { label: 'Queued',   color: '#6b7280', bg: '#6b728015' },
};

const PRIORITY_COLOR = {
    CRITICAL: '#ef4444', HIGH: '#f59e0b', MEDIUM: '#3b82f6', LOW: '#6b7280',
};

/* ── Attendance live mini ───────────────────────────────────────── */
function AttendanceMini({ projectId, navigate }) {
    const [data, setData]   = useState(null);
    const [load, setLoad]   = useState(true);
    React.useEffect(() => {
        if (!projectId) { setLoad(false); return; }
        attendanceService.getLive(projectId).then(setData).catch(() => {}).finally(() => setLoad(false));
    }, [projectId]);
    const present = data?.present_count ?? data?.present ?? 0;
    const absent  = data?.absent_count  ?? data?.absent  ?? 0;
    const total   = data?.total_workers ?? data?.total ?? (present + absent);
    const rate    = total > 0 ? Math.round((present / total) * 100) : 0;
    return (
        <div onClick={() => navigate('/dashboard/desktop/attendance')}
            style={{
                background: 'var(--t-surface)', border: '1px solid var(--t-border)',
                borderRadius: 18, padding: '20px', cursor: 'pointer',
                transition: 'transform 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(16,185,129,0.15)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--t-text3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Today's Workforce</p>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#10b981', background: '#10b98115', padding: '3px 8px', borderRadius: 8, border: '1px solid #10b98125' }}>Live</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                    <DonutRing pct={load ? 0 : rate} size={64} stroke={6} color="#10b981" />
                    <div style={{
                        position: 'absolute', inset: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 900, color: '#10b981',
                    }}>{load ? '—' : `${rate}%`}</div>
                </div>
                <div style={{ display: 'flex', gap: 16 }}>
                    {[{ n: present, l: 'Present', c: '#10b981' }, { n: absent, l: 'Absent', c: '#ef4444' }, { n: total, l: 'Total', c: 'var(--t-text)' }].map(s => (
                        <div key={s.l}>
                            <p style={{ fontSize: 22, fontWeight: 900, color: s.c, lineHeight: 1 }}>{s.n}</p>
                            <p style={{ fontSize: 9, color: 'var(--t-text3)', fontWeight: 700, textTransform: 'uppercase', marginTop: 2 }}>{s.l}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

/* ── Main ───────────────────────────────────────────────────────── */
const DesktopHome = () => {
    const navigate = useNavigate();
    const {
        dashboardData, stats, budgetStats, recentActivities,
        formatCurrency, refreshData, updatePhase,
        user, activeProjectId,
    } = useConstruction();

    const [isTaskModalOpen,    setIsTaskModalOpen]    = useState(false);
    const [selectedPhase,      setSelectedPhase]      = useState(null);
    const [newTaskTitle,       setNewTaskTitle]        = useState('');
    const [loading,            setLoading]             = useState(false);
    const [confirmConfig,      setConfirmConfig]       = useState({ isOpen: false });
    const [isPermitModalOpen,  setIsPermitModalOpen]   = useState(false);
    const [newPermitTitle,     setNewPermitTitle]      = useState('');
    const [orderModalOpen,     setOrderModalOpen]      = useState(false);
    const [selectedOrderMaterial, setSelectedOrderMaterial] = useState(null);
    const [selectedOrderSupplier, setSelectedOrderSupplier] = useState(null);
    const [orderQuantity,      setOrderQuantity]       = useState('');
    const [orderSubject,       setOrderSubject]        = useState('');
    const [orderBody,          setOrderBody]           = useState('');
    const [orderLoading,       setOrderLoading]        = useState(false);
    const [successModalInfo,   setSuccessModalInfo]    = useState({ isOpen: false, title: '', message: '', supplierName: '' });

    const phases = dashboardData.phases || [];
    const tasks  = dashboardData.tasks  || [];

    const phaseStats = useMemo(() => {
        const total = phases.length || 1;
        const done  = phases.filter(p => p.status === 'COMPLETED').length;
        const active = phases.find(p => p.status === 'IN_PROGRESS') || null;
        return { total: phases.length, done, percent: Math.round((done / total) * 100), active };
    }, [phases]);

    const activePhaseTasks = useMemo(() => {
        if (!phaseStats.active) return [];
        return tasks.filter(t => t.phase === phaseStats.active.id);
    }, [tasks, phaseStats.active]);

    const priorityTasks = useMemo(() => {
        const rank = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
        return tasks
            .filter(t => t.status !== 'COMPLETED')
            .sort((a, b) => (rank[a.priority] ?? 2) - (rank[b.priority] ?? 2))
            .slice(0, 6);
    }, [tasks]);

    const greeting = useMemo(() => {
        const h = new Date().getHours();
        return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
    }, []);

    const today = new Date().toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    });

    const firstName = (user?.full_name || user?.username || 'there').split(' ')[0];
    const overAllPct = tasks.length > 0
        ? Math.round(tasks.filter(t => t.status === 'COMPLETED').length / tasks.length * 100)
        : 0;

    const criticalLowStock = (budgetStats.lowStockItems || []).slice(0, 4);
    const overAllocated = budgetStats.projectHealth?.status === 'OVER_ALLOCATED';

    /* ── handlers (unchanged logic) ── */
    const showConfirm  = cfg => setConfirmConfig({ ...cfg, isOpen: true });
    const closeConfirm = ()  => setConfirmConfig(c => ({ ...c, isOpen: false }));

    const handleOpenOrderModal = (material) => {
        setSelectedOrderMaterial(material);
        setSelectedOrderSupplier(material.supplier || null);
        setOrderQuantity(material.min_stock_level || '10');
        setOrderSubject(`Purchase Order: ${material.name} - Dream Home Construction`);
        setOrderBody(`Please confirm availability and provide a quote for ${material.name}.`);
        setOrderModalOpen(true);
    };

    const handleSendOrder = async () => {
        if (!selectedOrderMaterial || !selectedOrderSupplier) { alert('Please select a supplier'); return; }
        setOrderLoading(true);
        try {
            const r = await dashboardService.emailSupplier(selectedOrderMaterial.id, orderQuantity, selectedOrderSupplier, orderSubject, orderBody);
            setOrderModalOpen(false);
            setSuccessModalInfo({ isOpen: true, title: 'Order Sent! 📧', message: r.message, supplierName: r.supplier });
            refreshData();
        } catch (err) { alert(`Error: ${err.response?.data?.error || 'Failed'}`); }
        finally { setOrderLoading(false); }
    };

    const handleReceiveOrder = (transaction) => {
        showConfirm({
            title: 'Confirm Receipt?', confirmText: 'Confirm Receipt', type: 'warning',
            message: 'Confirm receipt of these materials? Stock will be updated and an expense record created.',
            onConfirm: async () => {
                setOrderLoading(true);
                try {
                    const r = await dashboardService.receiveMaterialOrder(transaction.id);
                    setSuccessModalInfo({ isOpen: true, title: 'Stock Updated! 📦', message: r.message, supplierName: r.supplier });
                    refreshData(); closeConfirm();
                } catch (err) { alert(`Error: ${err.response?.data?.error || 'Failed'}`); closeConfirm(); }
                finally { setOrderLoading(false); }
            },
        });
    };

    const handleStatusChange = async (phaseId, newStatus) => {
        try { await updatePhase(phaseId, { status: newStatus }); }
        catch { alert('Failed to update phase status'); }
    };

    const handleTaskToggle = async (task) => {
        try {
            await constructionService.updateTask(task.id, { status: task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED' });
            refreshData();
        } catch (e) { console.error(e); }
    };

    const handleAddTask = async (e) => {
        e.preventDefault();
        if (!newTaskTitle.trim() || !selectedPhase) return;
        setLoading(true);
        try {
            await constructionService.createTask({ title: newTaskTitle, phase: selectedPhase.id, status: 'PENDING', priority: 'MEDIUM' });
            setIsTaskModalOpen(false); refreshData();
        } catch { alert('Failed to create task'); }
        finally { setLoading(false); }
    };

    const handleDeleteTask = (taskId) => {
        showConfirm({
            title: 'Delete Task?', confirmText: 'Delete', type: 'danger',
            message: 'Permanently delete this task? This cannot be undone.',
            onConfirm: async () => {
                try { await constructionService.deleteTask(taskId); refreshData(); closeConfirm(); }
                catch (e) { console.error(e); closeConfirm(); }
            },
        });
    };

    const handleAddPermitStep = async (e) => {
        e.preventDefault();
        if (!newPermitTitle.trim()) return;
        setLoading(true);
        try {
            const maxOrder = dashboardData.permits?.reduce((m, s) => Math.max(m, s.order), 0) || 0;
            await permitService.createStep({ title: newPermitTitle, status: 'PENDING', order: maxOrder + 1, description: 'Custom permit step' });
            setIsPermitModalOpen(false); setNewPermitTitle(''); refreshData();
        } catch { alert('Failed to create permit step'); }
        finally { setLoading(false); }
    };

    /* ── Render ── */
    return (
        <div style={{ minHeight: '100vh', background: 'var(--t-bg)' }}>

            {/* ══ HERO HEADER ═══════════════════════════════════════════ */}
            <div style={{
                background: 'linear-gradient(145deg, #f97316 0%, #ea580c 55%, #c2410c 100%)',
                padding: '28px 36px 32px',
                position: 'relative', overflow: 'hidden',
            }}>
                <div style={{ position: 'absolute', top: -60, right: -60, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
                <div style={{ position: 'absolute', bottom: -30, left: 200, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
                    <div>
                        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 4, fontWeight: 600 }}>{today}</p>
                        <h1 style={{ fontSize: 28, fontWeight: 900, color: '#fff', lineHeight: 1.1, marginBottom: 4 }}>
                            {greeting}, {firstName} 👋
                        </h1>
                        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>
                            {dashboardData.project?.name || 'No project selected'}
                        </p>
                    </div>

                    {/* Overall progress pill */}
                    <div style={{
                        background: 'rgba(255,255,255,0.15)',
                        borderRadius: 20, padding: '16px 24px',
                        backdropFilter: 'blur(12px)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        minWidth: 200, textAlign: 'right',
                    }}>
                        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
                            Overall Progress
                        </p>
                        <p style={{ fontSize: 36, fontWeight: 900, color: '#fff', lineHeight: 1, marginBottom: 8 }}>{overAllPct}%</p>
                        <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.25)', overflow: 'hidden', marginBottom: 6 }}>
                            <div style={{
                                height: '100%', borderRadius: 3, background: '#fff',
                                width: `${overAllPct}%`, transition: 'width 1s ease',
                            }} />
                        </div>
                        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>
                            {tasks.filter(t => t.status === 'COMPLETED').length} / {tasks.length} tasks
                        </p>
                    </div>
                </div>
            </div>

            {/* ══ BODY ═════════════════════════════════════════════════ */}
            <div style={{ padding: '24px 28px', maxWidth: 1400, margin: '0 auto' }}>

                {/* ── KPI STRIP ── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
                    <KpiTile icon="💰" label="Total Budget"
                        value={formatCurrency(budgetStats.totalBudget)}
                        sub="Project master budget"
                        color="#f97316" bg="rgba(249,115,22,0.05)"
                        onClick={() => navigate('/dashboard/desktop/finance')} />
                    <KpiTile icon="💸" label="Total Spent"
                        value={formatCurrency(budgetStats.totalSpent)}
                        sub={`${budgetStats.budgetPercent?.toFixed(0) || 0}% of budget used`}
                        color={budgetStats.budgetPercent > 90 ? '#ef4444' : budgetStats.budgetPercent > 70 ? '#f59e0b' : '#10b981'}
                        bg="rgba(16,185,129,0.04)"
                        onClick={() => navigate('/dashboard/desktop/finance')} />
                    <KpiTile icon="✅" label="Phases Done"
                        value={`${phaseStats.done}/${phaseStats.total}`}
                        sub={`${phaseStats.total - phaseStats.done} remaining`}
                        color="#6366f1" bg="rgba(99,102,241,0.05)"
                        onClick={() => navigate('/dashboard/desktop/phases')} />
                    <KpiTile icon="📋" label="Tasks Pending"
                        value={budgetStats.pendingTasks ?? 0}
                        sub={`${budgetStats.completedTasks ?? 0} completed`}
                        color="#3b82f6" bg="rgba(59,130,246,0.05)"
                        onClick={() => navigate('/dashboard/desktop/phases')} />
                </div>

                {/* ── Net position banner ── */}
                {budgetStats.netPosition !== null && (
                    <div style={{
                        borderRadius: 18, padding: '16px 24px',
                        marginBottom: 20,
                        background: budgetStats.netPosition >= 0 ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                        border: `1px solid ${budgetStats.netPosition >= 0 ? '#10b98130' : '#ef444430'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            <span style={{ fontSize: 28 }}>{budgetStats.netPosition >= 0 ? '📈' : '📉'}</span>
                            <div>
                                <p style={{ fontSize: 10, fontWeight: 800, color: 'var(--t-text3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Net Financial Position</p>
                                <p style={{ fontSize: 24, fontWeight: 900, color: budgetStats.netPosition >= 0 ? '#10b981' : '#ef4444', lineHeight: 1.1 }}>
                                    {formatCurrency(budgetStats.netPosition)}
                                </p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
                            <div>
                                <p style={{ fontSize: 10, color: 'var(--t-text3)' }}>Assets</p>
                                <p style={{ fontSize: 16, fontWeight: 800, color: '#10b981' }}>{formatCurrency(budgetStats.availableCash)}</p>
                            </div>
                            <div>
                                <p style={{ fontSize: 10, color: 'var(--t-text3)' }}>Payable</p>
                                <p style={{ fontSize: 16, fontWeight: 800, color: '#ef4444' }}>{formatCurrency(budgetStats.totalPayables)}</p>
                            </div>
                            <button onClick={() => navigate('/dashboard/desktop/manage')}
                                style={{
                                    padding: '8px 20px', borderRadius: 12, fontSize: 12, fontWeight: 800,
                                    background: 'var(--t-surface)', color: '#f97316',
                                    border: '1px solid #f9731640', cursor: 'pointer',
                                    textTransform: 'uppercase', letterSpacing: '0.06em',
                                }}>Full Analysis →</button>
                        </div>
                    </div>
                )}

                {/* ── MAIN GRID ── */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 380px', gap: 16, marginBottom: 20 }}>

                    {/* Phase Timeline */}
                    <div style={{
                        gridColumn: '1 / 3',
                        background: 'var(--t-surface)', border: '1px solid var(--t-border)',
                        borderRadius: 20, overflow: 'hidden',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px 16px', borderBottom: '1px solid var(--t-border)' }}>
                            <div>
                                <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--t-text)', margin: 0 }}>Phase Timeline</h2>
                                <p style={{ fontSize: 11, color: 'var(--t-text3)', marginTop: 2 }}>Construction stages and progress</p>
                            </div>
                            <button onClick={() => navigate('/dashboard/desktop/phases')}
                                style={{ fontSize: 12, fontWeight: 700, color: '#f97316', background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)', padding: '6px 14px', borderRadius: 10, cursor: 'pointer' }}>
                                View all →
                            </button>
                        </div>
                        <div>
                            {phases.length === 0 ? (
                                <div style={{ padding: 48, textAlign: 'center', color: 'var(--t-text3)', fontSize: 13 }}>
                                    No phases yet. <button onClick={() => navigate('/dashboard/desktop/phases')} style={{ color: '#f97316', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>Add one →</button>
                                </div>
                            ) : phases.map((phase, idx) => {
                                const pTasks   = tasks.filter(t => t.phase === phase.id);
                                const doneCount = pTasks.filter(t => t.status === 'COMPLETED').length;
                                const pct = pTasks.length ? Math.round((doneCount / pTasks.length) * 100) : 0;
                                const sm  = STATUS_META[phase.status] || STATUS_META.PENDING;
                                return (
                                    <div key={phase.id}
                                        onClick={() => navigate('/dashboard/desktop/phases')}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 16,
                                            padding: '14px 24px',
                                            borderBottom: idx < phases.length - 1 ? '1px solid var(--t-border)' : 'none',
                                            cursor: 'pointer', transition: 'background 0.12s',
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'var(--t-surface2)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        {/* Step circle */}
                                        <div style={{
                                            width: 36, height: 36, borderRadius: '50%',
                                            background: sm.bg, color: sm.color,
                                            border: `2px solid ${sm.color}40`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: 12, fontWeight: 900, flexShrink: 0,
                                        }}>
                                            {phase.status === 'COMPLETED' ? '✓' : phase.order}
                                        </div>

                                        {/* Info */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                                                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--t-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {phase.name}
                                                </span>
                                                <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 20, background: sm.bg, color: sm.color, flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                                    {sm.label}
                                                </span>
                                            </div>
                                            <div style={{ height: 4, borderRadius: 2, background: 'var(--t-border)', overflow: 'hidden' }}>
                                                <div style={{
                                                    height: '100%', borderRadius: 2,
                                                    width: `${phase.status === 'COMPLETED' ? 100 : pct}%`,
                                                    background: sm.color, transition: 'width 0.6s',
                                                }} />
                                            </div>
                                            <p style={{ fontSize: 10, color: 'var(--t-text3)', marginTop: 4 }}>
                                                {doneCount}/{pTasks.length} tasks · {formatCurrency(phase.estimated_budget)}
                                            </p>
                                        </div>

                                        {/* % */}
                                        <div style={{ fontSize: 18, fontWeight: 900, color: sm.color, flexShrink: 0, minWidth: 44, textAlign: 'right' }}>
                                            {phase.status === 'COMPLETED' ? 100 : pct}%
                                        </div>

                                        {/* Status select */}
                                        <div onClick={e => e.stopPropagation()}>
                                            <select value={phase.status}
                                                onChange={e => handleStatusChange(phase.id, e.target.value)}
                                                style={{
                                                    fontSize: 11, fontWeight: 700, padding: '5px 8px', borderRadius: 10,
                                                    border: '1px solid var(--t-border)', background: 'var(--t-surface2)',
                                                    color: 'var(--t-text2)', cursor: 'pointer', outline: 'none',
                                                }}>
                                                <option value="PENDING">Pending</option>
                                                <option value="IN_PROGRESS">In Progress</option>
                                                <option value="COMPLETED">Done</option>
                                                <option value="HALTED">Halted</option>
                                            </select>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Priority tasks */}
                    <div style={{
                        background: 'var(--t-surface)', border: '1px solid var(--t-border)',
                        borderRadius: 20, overflow: 'hidden', display: 'flex', flexDirection: 'column',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px 16px', borderBottom: '1px solid var(--t-border)' }}>
                            <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--t-text)', margin: 0 }}>Top Tasks</h2>
                            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--t-text3)' }}>By priority</span>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            {priorityTasks.length === 0 ? (
                                <div style={{ padding: 32, textAlign: 'center' }}>
                                    <p style={{ fontSize: 32, marginBottom: 8 }}>🎉</p>
                                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--t-text2)' }}>All caught up!</p>
                                </div>
                            ) : priorityTasks.map((task, idx) => (
                                <div key={task.id}
                                    onClick={() => navigate('/dashboard/desktop/phases')}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 12,
                                        padding: '12px 20px',
                                        borderBottom: idx < priorityTasks.length - 1 ? '1px solid var(--t-border)' : 'none',
                                        cursor: 'pointer', transition: 'background 0.12s',
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'var(--t-surface2)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                    <div style={{
                                        width: 4, height: 32, borderRadius: 2, flexShrink: 0,
                                        background: PRIORITY_COLOR[task.priority] || '#6b7280',
                                    }} />
                                    <input type="checkbox" checked={task.status === 'COMPLETED'}
                                        onClick={e => e.stopPropagation()}
                                        onChange={() => handleTaskToggle(task)}
                                        style={{ width: 15, height: 15, cursor: 'pointer', accentColor: '#f97316', flexShrink: 0 }} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--t-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {task.title}
                                        </p>
                                        <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2, color: PRIORITY_COLOR[task.priority] || '#6b7280' }}>
                                            {task.priority || 'MEDIUM'}
                                        </p>
                                    </div>
                                    <span style={{ fontSize: 14, color: 'var(--t-text3)' }}>›</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── SECOND ROW ── */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>

                    {/* Attendance */}
                    <AttendanceMini projectId={dashboardData.project?.id || activeProjectId} navigate={navigate} />

                    {/* Quick actions */}
                    <div style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)', borderRadius: 20, padding: '20px' }}>
                        <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--t-text3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>Quick Access</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            {[
                                { icon: '🗺️', label: 'Site Map',   path: '/dashboard/desktop/location',  color: '#06b6d4' },
                                { icon: '📸', label: 'Gallery',    path: '/dashboard/desktop/photos',     color: '#ec4899' },
                                { icon: '📜', label: 'Permits',    path: '/dashboard/desktop/permits',    color: '#8b5cf6' },
                                { icon: '📊', label: 'Analytics',  path: '/dashboard/desktop/analytics',  color: '#6366f1' },
                                { icon: '🧱', label: 'Resources',  path: '/dashboard/desktop/resource',   color: '#f59e0b' },
                                { icon: '🏛️', label: 'Structure',  path: '/dashboard/desktop/structure',  color: '#10b981' },
                            ].map(q => (
                                <button key={q.label} onClick={() => navigate(q.path)}
                                    style={{
                                        background: 'var(--t-surface2)', border: '1px solid var(--t-border)',
                                        borderRadius: 12, padding: '10px 8px',
                                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                                        transition: 'all 0.15s',
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.background = `${q.color}12`; e.currentTarget.style.borderColor = `${q.color}40`; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'var(--t-surface2)'; e.currentTarget.style.borderColor = 'var(--t-border)'; }}>
                                    <span style={{ fontSize: 16 }}>{q.icon}</span>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--t-text2)' }}>{q.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Budget overview */}
                    <div style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)', borderRadius: 20, padding: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--t-text3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Budget Health</p>
                            <button onClick={() => navigate('/dashboard/desktop/finance')}
                                style={{ fontSize: 11, fontWeight: 700, color: '#f97316', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                                Details →
                            </button>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                            <div style={{ position: 'relative', flexShrink: 0 }}>
                                <DonutRing pct={budgetStats.budgetPercent || 0} size={72} stroke={7}
                                    color={budgetStats.budgetPercent > 90 ? '#ef4444' : budgetStats.budgetPercent > 70 ? '#f59e0b' : '#10b981'} />
                                <div style={{
                                    position: 'absolute', inset: 0,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 12, fontWeight: 900,
                                    color: budgetStats.budgetPercent > 90 ? '#ef4444' : '#10b981',
                                }}>
                                    {(budgetStats.budgetPercent || 0).toFixed(0)}%
                                </div>
                            </div>
                            <div>
                                <p style={{ fontSize: 9, color: 'var(--t-text3)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Spent</p>
                                <p style={{ fontSize: 18, fontWeight: 900, color: 'var(--t-text)', lineHeight: 1 }}>{formatCurrency(budgetStats.totalSpent)}</p>
                                <p style={{ fontSize: 10, color: 'var(--t-text3)', marginTop: 3 }}>of {formatCurrency(budgetStats.totalBudget)}</p>
                            </div>
                        </div>
                        {[
                            { label: 'Remaining', val: formatCurrency((budgetStats.totalBudget || 0) - (budgetStats.totalSpent || 0)), color: '#10b981' },
                            { label: 'Payable',   val: formatCurrency(budgetStats.totalPayables || 0), color: '#ef4444' },
                        ].map(r => (
                            <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid var(--t-border)' }}>
                                <p style={{ fontSize: 11, color: 'var(--t-text3)' }}>{r.label}</p>
                                <p style={{ fontSize: 13, fontWeight: 800, color: r.color }}>{r.val}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── EXPENSES + ACTIVITY ── */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>

                    {/* Recent expenses */}
                    <div style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)', borderRadius: 20, overflow: 'hidden' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px 16px', borderBottom: '1px solid var(--t-border)' }}>
                            <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--t-text)', margin: 0 }}>Recent Expenses</h2>
                            <button onClick={() => navigate('/dashboard/desktop/manage')}
                                style={{ fontSize: 12, fontWeight: 700, color: '#f97316', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                                View all →
                            </button>
                        </div>
                        <div>
                            {(dashboardData.expenses || []).slice(0, 5).length === 0 ? (
                                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--t-text3)', fontSize: 13 }}>No expenses yet.</div>
                            ) : (dashboardData.expenses || []).slice(0, 5).map((exp, idx, arr) => (
                                <div key={exp.id}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 14,
                                        padding: '12px 24px',
                                        borderBottom: idx < arr.length - 1 ? '1px solid var(--t-border)' : 'none',
                                    }}>
                                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f97316', flexShrink: 0 }} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--t-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exp.description}</p>
                                        <p style={{ fontSize: 10, color: 'var(--t-text3)', marginTop: 1 }}>{exp.category || '—'}</p>
                                    </div>
                                    <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--t-text)', flexShrink: 0 }}>{formatCurrency(exp.amount)}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Recent activity */}
                    <div style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)', borderRadius: 20, overflow: 'hidden' }}>
                        <div style={{ padding: '18px 24px 16px', borderBottom: '1px solid var(--t-border)' }}>
                            <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--t-text)', margin: 0 }}>Recent Activity</h2>
                        </div>
                        {recentActivities.length === 0 ? (
                            <div style={{ padding: 32, textAlign: 'center', color: 'var(--t-text3)', fontSize: 13 }}>No recent activity.</div>
                        ) : (
                            <div>
                                {recentActivities.slice(0, 6).map((a, idx, arr) => (
                                    <div key={a.id}
                                        style={{
                                            display: 'flex', alignItems: 'flex-start', gap: 14,
                                            padding: '12px 24px',
                                            borderBottom: idx < arr.length - 1 ? '1px solid var(--t-border)' : 'none',
                                        }}>
                                        <div style={{
                                            width: 34, height: 34, borderRadius: 10,
                                            background: 'var(--t-surface2)', border: '1px solid var(--t-border)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: 16, flexShrink: 0,
                                        }}>{a.icon}</div>
                                        <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
                                            <p style={{ fontSize: 12, color: 'var(--t-text)', lineHeight: 1.4 }}>{a.message}</p>
                                            <p style={{ fontSize: 10, color: 'var(--t-text3)', marginTop: 3 }}>{a.time}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Alerts ── */}
                {(criticalLowStock.length > 0 || overAllocated) && (
                    <div style={{ background: 'var(--t-surface)', border: '1px solid #f59e0b30', borderRadius: 20, overflow: 'hidden', marginBottom: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 24px', borderBottom: '1px solid var(--t-border)', background: 'rgba(245,158,11,0.05)' }}>
                            <span style={{ fontSize: 18 }}>⚠️</span>
                            <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--t-text)', margin: 0 }}>Attention Required</h2>
                        </div>
                        <div style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: criticalLowStock.length > 0 && overAllocated ? '1fr 1fr' : '1fr', gap: 20 }}>
                            {criticalLowStock.length > 0 && (
                                <div>
                                    <p style={{ fontSize: 10, fontWeight: 800, color: 'var(--t-text3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Low Stock</p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {criticalLowStock.map(item => (
                                            <div key={item.id}
                                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 14px', borderRadius: 12, background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)' }}>
                                                <div>
                                                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--t-text)' }}>{item.name}</p>
                                                    <p style={{ fontSize: 10, color: '#ef4444', marginTop: 1 }}>{item.current_stock} {item.unit} (min {item.min_stock_level})</p>
                                                </div>
                                                {item.pendingTransaction ? (
                                                    <button onClick={() => handleReceiveOrder(item.pendingTransaction)}
                                                        style={{ fontSize: 11, fontWeight: 800, padding: '6px 14px', borderRadius: 9, background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)', cursor: 'pointer' }}>
                                                        Receive
                                                    </button>
                                                ) : (
                                                    <button onClick={() => handleOpenOrderModal(item)}
                                                        style={{ fontSize: 11, fontWeight: 800, padding: '6px 14px', borderRadius: 9, background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer' }}>
                                                        Order
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {overAllocated && (
                                <div>
                                    <p style={{ fontSize: 10, fontWeight: 800, color: 'var(--t-text3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Budget Overflow</p>
                                    <div style={{ padding: '14px 16px', borderRadius: 12, background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.25)' }}>
                                        <p style={{ fontSize: 13, color: 'var(--t-text2)', lineHeight: 1.5, marginBottom: 10 }}>
                                            Allocation exceeds budget by <b style={{ color: '#f59e0b' }}>{formatCurrency(budgetStats.projectHealth.excess || 0)}</b>.
                                        </p>
                                        {(budgetStats.projectHealth.issues || []).slice(0, 2).map((issue, idx) => (
                                            <p key={idx} style={{ fontSize: 11, color: '#f59e0b', background: 'rgba(245,158,11,0.1)', borderRadius: 7, padding: '5px 10px', marginBottom: 6 }}>{issue.message}</p>
                                        ))}
                                        <button onClick={() => navigate('/dashboard/desktop/manage')}
                                            style={{ fontSize: 11, fontWeight: 800, padding: '7px 16px', borderRadius: 9, background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            Rebalance Now
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div style={{ padding: '0 24px 20px' }}>
                            <WastageAlertPanel compact onResolved={() => {}} />
                        </div>
                    </div>
                )}

            </div>{/* end body */}

            {/* ── Modals (unchanged) ── */}
            <Modal isOpen={orderModalOpen} onClose={() => setOrderModalOpen(false)} title={`Order: ${selectedOrderMaterial?.name || ''}`}>
                <div className="space-y-4 p-4">
                    <div className="bg-[var(--t-nav-active-bg)] border border-[var(--t-border)] rounded-xl p-4">
                        <h4 className="text-sm font-bold text-[var(--t-primary)] mb-2">Material Details</h4>
                        <div className="space-y-1 text-sm">
                            <div className="flex justify-between"><span className="text-[var(--t-text2)]">Material:</span><span className="font-bold text-[var(--t-text)]">{selectedOrderMaterial?.name}</span></div>
                            <div className="flex justify-between"><span className="text-[var(--t-text2)]">Stock:</span><span className="font-bold text-[var(--t-danger)]">{selectedOrderMaterial?.current_stock} {selectedOrderMaterial?.unit}</span></div>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-[var(--t-text2)] mb-2">Supplier *</label>
                        <select value={selectedOrderSupplier || ''} onChange={e => setSelectedOrderSupplier(Number(e.target.value))}
                            className="w-full rounded-xl border-[var(--t-border)] p-3 border outline-none bg-[var(--t-surface)] font-bold">
                            <option value="">Choose a supplier...</option>
                            {(dashboardData.suppliers || []).filter(s => s.email).map(s => (<option key={s.id} value={s.id}>{s.name} ({s.email})</option>))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-[var(--t-text2)] mb-2">Quantity</label>
                        <input type="number" value={orderQuantity} onChange={e => setOrderQuantity(e.target.value)} className="w-full rounded-xl border-[var(--t-border)] p-3 border outline-none text-lg font-black text-center" min="1" />
                    </div>
                    <div className="space-y-3 pt-2 border-t border-[var(--t-border)]">
                        <div><label className="block text-[10px] font-bold text-[var(--t-text2)] uppercase mb-1">Subject</label><input type="text" value={orderSubject} onChange={e => setOrderSubject(e.target.value)} className="w-full rounded-lg border-[var(--t-border)] p-2 border outline-none text-sm font-medium" /></div>
                        <div><label className="block text-[10px] font-bold text-[var(--t-text2)] uppercase mb-1">Message</label><textarea value={orderBody} onChange={e => setOrderBody(e.target.value)} className="w-full rounded-lg border-[var(--t-border)] p-3 border outline-none text-sm min-h-[80px]" /></div>
                    </div>
                    <div className="flex justify-end gap-3 mt-4">
                        <button type="button" onClick={() => setOrderModalOpen(false)} className="px-6 py-2.5 text-xs font-black text-[var(--t-text3)] uppercase tracking-widest">Cancel</button>
                        <button onClick={handleSendOrder} disabled={!orderQuantity || !selectedOrderSupplier || orderLoading} className="px-8 py-2.5 bg-[var(--t-primary)] text-white rounded-xl text-xs font-black uppercase tracking-widest">
                            {orderLoading ? 'Sending...' : 'Send Order'}
                        </button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={isTaskModalOpen} onClose={() => setIsTaskModalOpen(false)} title={`Add Task to ${selectedPhase?.name}`}>
                <form onSubmit={handleAddTask} className="space-y-4">
                    <input type="text" value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} placeholder="e.g. Ground Floor Slab Casting" className="w-full rounded-xl border-[var(--t-border)] p-3 border outline-none font-bold" autoFocus />
                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={() => setIsTaskModalOpen(false)} className="px-6 py-2.5 text-xs font-black text-[var(--t-text3)] uppercase tracking-widest">Cancel</button>
                        <button type="submit" disabled={loading || !newTaskTitle.trim()} className="px-8 py-2.5 bg-[var(--t-primary)] text-white rounded-xl text-xs font-black uppercase tracking-widest">{loading ? 'Adding...' : 'Add Task'}</button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={isPermitModalOpen} onClose={() => setIsPermitModalOpen(false)} title="New Permit Step">
                <form onSubmit={handleAddPermitStep} className="space-y-4">
                    <input type="text" value={newPermitTitle} onChange={e => setNewPermitTitle(e.target.value)} placeholder="e.g. Ward Clearance" className="w-full rounded-xl border-[var(--t-border)] p-3 border outline-none font-bold" autoFocus />
                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={() => setIsPermitModalOpen(false)} className="px-6 py-2.5 text-xs font-black text-[var(--t-text3)] uppercase tracking-widest">Cancel</button>
                        <button type="submit" disabled={loading || !newPermitTitle.trim()} className="px-8 py-2.5 bg-[var(--t-primary)] text-white rounded-xl text-xs font-black uppercase tracking-widest">Create Step</button>
                    </div>
                </form>
            </Modal>

            <SuccessModal isOpen={successModalInfo.isOpen} onClose={() => setSuccessModalInfo({ ...successModalInfo, isOpen: false })} title={successModalInfo.title} message={successModalInfo.message} supplierName={successModalInfo.supplierName} />
            <ConfirmModal isOpen={confirmConfig.isOpen} title={confirmConfig.title} message={confirmConfig.message} confirmText={confirmConfig.confirmText} onConfirm={confirmConfig.onConfirm} onCancel={closeConfirm} type={confirmConfig.type || 'warning'} />
        </div>
    );
};

export default DesktopHome;
