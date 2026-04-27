import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Wallet, Coins, ListChecks, PackageX, ArrowRight,
    AlertTriangle, CheckCircle2, Clock, Plus, Camera,
    FileText, HardHat, Image as ImageIcon, TrendingUp, TrendingDown, ChevronRight, Scale,
} from 'lucide-react';
import Modal from '../common/Modal';
import SuccessModal from '../common/SuccessModal';
import WastageAlertPanel from '../common/WastageAlertPanel';
import { constructionService, permitService, dashboardService, getMediaUrl } from '../../services/api';
import { useConstruction } from '../../context/ConstructionContext';
import ConfirmModal from '../common/ConfirmModal';

/* ─── Shared presentational components ───────────────────── */

const KpiCard = ({ icon: Icon, label, value, hint, borderColor = '#ea580c' }) => (
    <div
        className="bg-[var(--t-surface)] rounded-xl border border-[var(--t-border)] p-5 shadow-sm flex flex-col gap-3 relative overflow-hidden"
        style={{ borderLeft: `4px solid ${borderColor}` }}
    >
        <div className="flex items-start justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--t-text3)]">{label}</p>
            <div
                className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: `${borderColor}18`, color: borderColor }}
            >
                <Icon className="w-4 h-4" />
            </div>
        </div>
        <div className="text-2xl font-black tabular-nums text-[var(--t-text)]">{value}</div>
        {hint && <p className="text-[11px] text-[var(--t-text3)] leading-snug">{hint}</p>}
    </div>
);

const ProgressBar = ({ percent, color = 'var(--t-primary)' }) => (
    <div className="h-1.5 w-full bg-[var(--t-border)] rounded-full overflow-hidden">
        <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${Math.min(100, Math.max(0, percent))}%`, background: color }}
        />
    </div>
);

const StatusBadge = ({ status }) => {
    const map = {
        COMPLETED:   { label: 'Done',    bg: '#d1fae5', color: '#059669' },
        IN_PROGRESS: { label: 'Active',  bg: '#fff7ed', color: '#ea580c' },
        NOT_STARTED: { label: 'Pending', bg: '#f1f5f9', color: '#64748b' },
    };
    const s = map[status] || map.NOT_STARTED;
    return (
        <span
            className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
            style={{ background: s.bg, color: s.color }}
        >
            {s.label}
        </span>
    );
};

/* ─── Main component ──────────────────────────────────────── */

const DesktopHome = () => {
    const navigate = useNavigate();
    const {
        dashboardData, stats, budgetStats, recentActivities,
        formatCurrency, refreshData, updatePhase,
    } = useConstruction();

    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [selectedPhase, setSelectedPhase] = useState(null);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [loading, setLoading] = useState(false);
    // Phase/Task details are now handled in PhasesPage — navigate there instead

    const [confirmConfig, setConfirmConfig] = useState({ isOpen: false });
    const showConfirm = (config) => setConfirmConfig({ ...config, isOpen: true });
    const closeConfirm = () => setConfirmConfig({ ...confirmConfig, isOpen: false });

    const [isPermitModalOpen, setIsPermitModalOpen] = useState(false);
    const [newPermitTitle, setNewPermitTitle] = useState('');

    const [orderModalOpen, setOrderModalOpen] = useState(false);
    const [selectedOrderMaterial, setSelectedOrderMaterial] = useState(null);
    const [selectedOrderSupplier, setSelectedOrderSupplier] = useState(null);
    const [orderQuantity, setOrderQuantity] = useState('');
    const [orderSubject, setOrderSubject] = useState('');
    const [orderBody, setOrderBody] = useState('');
    const [orderLoading, setOrderLoading] = useState(false);
    const [successModalInfo, setSuccessModalInfo] = useState({ isOpen: false, title: '', message: '', supplierName: '' });

    const phases = dashboardData.phases || [];
    const tasks = dashboardData.tasks || [];

    const phaseStats = useMemo(() => {
        const total = phases.length || 1;
        const done = phases.filter(p => p.status === 'COMPLETED').length;
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
            .slice(0, 5);
    }, [tasks]);

    const greeting = useMemo(() => {
        const h = new Date().getHours();
        if (h < 12) return 'Good morning';
        if (h < 17) return 'Good afternoon';
        return 'Good evening';
    }, []);

    const today = new Date().toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric',
    });

    const handleOpenOrderModal = (material) => {
        setSelectedOrderMaterial(material);
        setSelectedOrderSupplier(material.supplier || null);
        setOrderQuantity(material.min_stock_level || '10');
        setOrderSubject(`Purchase Order: ${material.name} - Dream Home Construction`);
        setOrderBody(`Please confirm availability and provide a quote for ${material.name}. We need this for our ongoing construction project.`);
        setOrderModalOpen(true);
    };

    const handleSendOrder = async () => {
        if (!selectedOrderMaterial || !selectedOrderSupplier) {
            alert('Please select a supplier');
            return;
        }
        setOrderLoading(true);
        try {
            const response = await dashboardService.emailSupplier(
                selectedOrderMaterial.id, orderQuantity, selectedOrderSupplier,
                orderSubject, orderBody,
            );
            setOrderModalOpen(false);
            setSuccessModalInfo({
                isOpen: true,
                title: 'Order Sent Successfully! 📧',
                message: response.message,
                supplierName: response.supplier,
            });
            refreshData();
        } catch (error) {
            const errorMsg = error.response?.data?.error || 'Failed to send order email';
            alert(`Error: ${errorMsg}`);
        } finally {
            setOrderLoading(false);
        }
    };

    const handleReceiveOrder = (transaction) => {
        showConfirm({
            title: 'Confirm Material Receipt?',
            message: 'Are you sure you want to confirm receipt of these materials? This will add them to stock and automatically create an associated expense record. This action cannot be undone.',
            confirmText: 'Yes, Confirm Receipt',
            type: 'warning',
            onConfirm: async () => {
                setOrderLoading(true);
                try {
                    const response = await dashboardService.receiveMaterialOrder(transaction.id);
                    setSuccessModalInfo({
                        isOpen: true,
                        title: 'Stock Updated! 📦',
                        message: response.message,
                        supplierName: response.supplier,
                    });
                    refreshData();
                    closeConfirm();
                } catch (error) {
                    const errorMsg = error.response?.data?.error || 'Failed to confirm receipt';
                    alert(`Error: ${errorMsg}`);
                    closeConfirm();
                } finally {
                    setOrderLoading(false);
                }
            },
        });
    };

    const handleStatusChange = async (phaseId, newStatus) => {
        try { await updatePhase(phaseId, { status: newStatus }); }
        catch { alert('Failed to update phase status'); }
    };

    const handleTaskToggle = async (task) => {
        try {
            const newStatus = task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
            await constructionService.updateTask(task.id, { status: newStatus });
            refreshData();
        } catch (e) { console.error(e); }
    };

    const openAddTaskModal = (phase) => {
        setSelectedPhase(phase);
        setNewTaskTitle('');
        setIsTaskModalOpen(true);
    };

    const handleAddTask = async (e) => {
        e.preventDefault();
        if (!newTaskTitle.trim() || !selectedPhase) return;
        setLoading(true);
        try {
            await constructionService.createTask({
                title: newTaskTitle, phase: selectedPhase.id,
                status: 'PENDING', priority: 'MEDIUM',
            });
            setIsTaskModalOpen(false);
            refreshData();
        } catch { alert('Failed to create task'); }
        finally { setLoading(false); }
    };

    const handleDeleteTask = (taskId) => {
        showConfirm({
            title: 'Delete Task?',
            message: 'Are you sure you want to permanently remove this task? Any associated media and proof records will also be deleted. This action is irreversible.',
            confirmText: 'Yes, Delete Task',
            type: 'danger',
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
            await permitService.createStep({
                title: newPermitTitle, status: 'PENDING',
                order: maxOrder + 1, description: 'Custom permit step',
            });
            setIsPermitModalOpen(false);
            setNewPermitTitle('');
            refreshData();
        } catch { alert('Failed to create permit step'); }
        finally { setLoading(false); }
    };

    const quickActions = [
        { title: 'Manage', sub: 'Budget & Expenses', icon: Wallet, path: '/dashboard/desktop/manage' },
        { title: 'Photos', sub: 'Site Gallery', icon: Camera, path: '/dashboard/desktop/photos' },
        { title: 'Analytics', sub: 'Forecast & Trends', icon: TrendingUp, path: '/dashboard/desktop/analytics' },
        { title: 'Permits', sub: 'Naksha / Co-Pilot', icon: FileText, path: '/dashboard/desktop/permits' },
    ];

    const criticalLowStock = (budgetStats.lowStockItems || []).slice(0, 4);
    const overAllocated = budgetStats.projectHealth?.status === 'OVER_ALLOCATED';

    /* ─── Render ──────────────────────────────────────────────── */
    return (
        <div className="min-h-screen bg-[var(--t-bg)]">

            {/* ── Sticky top bar ── */}
            <div
                className="sticky top-0 z-20 flex items-center justify-between px-8 py-3 bg-[var(--t-surface)] border-b border-[var(--t-border)]"
                style={{ backdropFilter: 'blur(8px)' }}
            >
                <div className="flex items-center gap-2 text-sm">
                    <span className="font-semibold text-[var(--t-text)]">Dashboard</span>
                    <span className="text-[var(--t-text3)]">/</span>
                    <span className="text-[var(--t-text3)]">{dashboardData.project?.name || 'Overview'}</span>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-xs text-[var(--t-text3)]">{today}</span>
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-[var(--t-surface2)] text-[var(--t-text2)] border border-[var(--t-border)]">
                        {phaseStats.percent}% complete
                    </span>
                    {/* theme toggle placeholder */}
                    <span />
                </div>
            </div>

            {/* ── Scrollable page body ── */}
            <div className="px-8 py-6 space-y-6">

                {/* ── KPI Row ── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <KpiCard
                        icon={Wallet}
                        label="Total Budget"
                        value={formatCurrency(budgetStats.totalBudget)}
                        hint="Project master budget"
                        borderColor="#ea580c"
                    />
                    <KpiCard
                        icon={Coins}
                        label="Total Spent"
                        value={formatCurrency(budgetStats.totalSpent)}
                        hint={`${budgetStats.budgetPercent?.toFixed(0) || 0}% of budget used`}
                        borderColor={budgetStats.budgetPercent > 90 ? '#ef4444' : budgetStats.budgetPercent > 70 ? '#f59e0b' : '#10b981'}
                    />
                    <KpiCard
                        icon={CheckCircle2}
                        label="Phases Done"
                        value={`${phaseStats.done} / ${phaseStats.total}`}
                        hint={`${phaseStats.total - phaseStats.done} remaining`}
                        borderColor="#10b981"
                    />
                    <KpiCard
                        icon={ListChecks}
                        label="Tasks Pending"
                        value={`${budgetStats.pendingTasks ?? 0}`}
                        hint={`${budgetStats.completedTasks ?? 0} completed`}
                        borderColor="#6366f1"
                    />
                </div>

                {/* ── Net Position Banner ── */}
                {budgetStats.netPosition !== null && (
                    <div
                        className={`rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${
                            budgetStats.netPosition >= 0
                                ? 'bg-emerald-50 border-emerald-200'
                                : 'bg-rose-50 border-rose-200'
                        }`}
                    >
                        <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                                budgetStats.netPosition >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                            }`}>
                                <Scale className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--t-text3)]">Net Financial Position</p>
                                <p className={`text-xl font-black tabular-nums ${
                                    budgetStats.netPosition >= 0 ? 'text-emerald-700' : 'text-rose-700'
                                }`}>
                                    {formatCurrency(budgetStats.netPosition)}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-6 text-sm shrink-0">
                            <div>
                                <p className="text-xs text-[var(--t-text3)]">Assets</p>
                                <p className="font-bold text-emerald-600">{formatCurrency(budgetStats.availableCash)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-[var(--t-text3)]">Payable</p>
                                <p className="font-bold text-rose-500">{formatCurrency(budgetStats.totalPayables)}</p>
                            </div>
                            <button
                                onClick={() => navigate('/dashboard/desktop/manage?section=finance&tab=analysis')}
                                className="text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors text-[var(--t-primary)] border-[var(--t-primary)] hover:bg-orange-50"
                            >
                                Full Analysis
                            </button>
                        </div>
                    </div>
                )}

                {/* ── Main two-column grid ── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Phase Timeline */}
                    <div className="lg:col-span-2 bg-[var(--t-surface)] rounded-xl border border-[var(--t-border)] shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--t-border)]">
                            <div>
                                <h2 className="text-sm font-bold text-[var(--t-text)]">Phase Timeline</h2>
                                <p className="text-xs text-[var(--t-text3)] mt-0.5">Construction stages and progress</p>
                            </div>
                            <button
                                onClick={() => navigate('/dashboard/desktop/manage')}
                                className="text-xs font-semibold text-[var(--t-primary)] hover:underline flex items-center gap-1"
                            >
                                Manage <ArrowRight className="w-3 h-3" />
                            </button>
                        </div>
                        <div className="divide-y divide-[var(--t-border)]">
                            {phases.length === 0 && (
                                <div className="py-10 text-center text-sm text-[var(--t-text3)]">No phases yet.</div>
                            )}
                            {phases.map((phase) => {
                                const pTasks = tasks.filter(t => t.phase === phase.id);
                                const doneCount = pTasks.filter(t => t.status === 'COMPLETED').length;
                                const pct = pTasks.length ? Math.round((doneCount / pTasks.length) * 100) : 0;
                                const isDone = phase.status === 'COMPLETED';
                                const isActive = phase.status === 'IN_PROGRESS';
                                return (
                                    <div
                                        key={phase.id}
                                        className="px-6 py-4 flex items-center gap-4 cursor-pointer hover:bg-[var(--t-surface2)] transition-colors"
                                        onClick={() => navigate('/dashboard/desktop/phases')}
                                    >
                                        {/* Step marker */}
                                        <div
                                            className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
                                            style={{
                                                background: isDone ? '#d1fae5' : isActive ? '#fff7ed' : 'var(--t-surface2)',
                                                color: isDone ? '#059669' : isActive ? '#ea580c' : 'var(--t-text3)',
                                                border: isActive ? '2px solid #ea580c' : isDone ? '2px solid #059669' : '2px solid var(--t-border)',
                                            }}
                                        >
                                            {isDone ? <CheckCircle2 className="w-4 h-4" /> : phase.order}
                                        </div>

                                        {/* Phase info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <span className={`text-sm font-semibold truncate ${isActive ? 'text-[var(--t-primary)]' : 'text-[var(--t-text)]'}`}>
                                                    {phase.name}
                                                </span>
                                                <StatusBadge status={phase.status} />
                                            </div>
                                            <ProgressBar
                                                percent={isDone ? 100 : pct}
                                                color={isDone ? '#10b981' : isActive ? '#ea580c' : '#94a3b8'}
                                            />
                                            <p className="mt-1.5 text-[11px] text-[var(--t-text3)]">
                                                {doneCount}/{pTasks.length} tasks · {formatCurrency(phase.estimated_budget)}
                                            </p>
                                        </div>

                                        {/* Status selector */}
                                        <div className="shrink-0" onClick={e => e.stopPropagation()}>
                                            <select
                                                value={phase.status}
                                                onChange={(e) => handleStatusChange(phase.id, e.target.value)}
                                                className="text-[11px] font-medium rounded-lg py-1.5 px-2 border outline-none cursor-pointer bg-[var(--t-surface2)] text-[var(--t-text2)] border-[var(--t-border)]"
                                            >
                                                <option value="NOT_STARTED">To Do</option>
                                                <option value="IN_PROGRESS">Active</option>
                                                <option value="COMPLETED">Done</option>
                                            </select>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Recent Tasks panel */}
                    <div className="bg-[var(--t-surface)] rounded-xl border border-[var(--t-border)] shadow-sm overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--t-border)]">
                            <h2 className="text-sm font-bold text-[var(--t-text)]">Pending Tasks</h2>
                            <span className="text-xs font-medium text-[var(--t-text3)]">Top {priorityTasks.length}</span>
                        </div>
                        <div className="flex-1 divide-y divide-[var(--t-border)]">
                            {priorityTasks.length === 0 ? (
                                <div className="py-10 flex flex-col items-center gap-2">
                                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                                    <p className="text-sm text-[var(--t-text2)]">All caught up</p>
                                </div>
                            ) : (
                                priorityTasks.map((task) => (
                                    <div
                                        key={task.id}
                                        onClick={() => navigate('/dashboard/desktop/phases')}
                                        className="flex items-center gap-3 px-5 py-3 hover:bg-[var(--t-surface2)] cursor-pointer transition-colors"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={task.status === 'COMPLETED'}
                                            onClick={e => e.stopPropagation()}
                                            onChange={() => handleTaskToggle(task)}
                                            className="w-4 h-4 rounded accent-[var(--t-primary)] shrink-0"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-[var(--t-text)] truncate">{task.title}</p>
                                            <p className="text-[10px] font-semibold uppercase tracking-wider mt-0.5"
                                                style={{
                                                    color: task.priority === 'CRITICAL' ? '#ef4444' : task.priority === 'HIGH' ? '#f59e0b' : 'var(--t-text3)',
                                                }}>
                                                {task.priority || 'MEDIUM'}
                                            </p>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-[var(--t-text3)] shrink-0" />
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Bottom row: Expenses + Quick Actions ── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Recent Expenses table */}
                    <div className="lg:col-span-2 bg-[var(--t-surface)] rounded-xl border border-[var(--t-border)] shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--t-border)]">
                            <h2 className="text-sm font-bold text-[var(--t-text)]">Recent Expenses</h2>
                            <button
                                onClick={() => navigate('/dashboard/desktop/manage')}
                                className="text-xs font-semibold text-[var(--t-primary)] hover:underline flex items-center gap-1"
                            >
                                View all <ArrowRight className="w-3 h-3" />
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-[var(--t-border)]">
                                        <th className="px-6 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--t-text3)]">Description</th>
                                        <th className="px-6 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--t-text3)]">Category</th>
                                        <th className="px-6 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-[var(--t-text3)]">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--t-border)]">
                                    {(dashboardData.expenses || []).slice(0, 5).length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="px-6 py-8 text-center text-sm text-[var(--t-text3)]">No expenses yet.</td>
                                        </tr>
                                    ) : (
                                        (dashboardData.expenses || []).slice(0, 5).map((exp) => (
                                            <tr key={exp.id} className="hover:bg-[var(--t-surface2)] transition-colors">
                                                <td className="px-6 py-3 font-medium text-[var(--t-text)] truncate max-w-[200px]">{exp.description}</td>
                                                <td className="px-6 py-3 text-[var(--t-text3)] text-xs">{exp.category || '—'}</td>
                                                <td className="px-6 py-3 text-right font-semibold tabular-nums text-[var(--t-text)]">{formatCurrency(exp.amount)}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="bg-[var(--t-surface)] rounded-xl border border-[var(--t-border)] shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-[var(--t-border)]">
                            <h2 className="text-sm font-bold text-[var(--t-text)]">Quick Actions</h2>
                        </div>
                        <div className="p-4 space-y-2">
                            {quickActions.map((a) => (
                                <button
                                    key={a.title}
                                    onClick={() => navigate(a.path)}
                                    className="group w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left border border-[var(--t-border)] hover:border-[var(--t-primary)] hover:bg-orange-50 transition-all"
                                >
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                                        style={{ background: '#fff7ed', color: '#ea580c' }}>
                                        <a.icon className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-[var(--t-text)]">{a.title}</p>
                                        <p className="text-xs text-[var(--t-text3)]">{a.sub}</p>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-[var(--t-text3)] group-hover:text-[var(--t-primary)] transition-colors shrink-0" />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── Attention Required ── */}
                {(criticalLowStock.length > 0 || overAllocated) && (
                    <div className="bg-[var(--t-surface)] rounded-xl border border-[var(--t-border)] shadow-sm overflow-hidden">
                        <div className="flex items-center gap-2 px-6 py-4 border-b border-[var(--t-border)]">
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                            <h2 className="text-sm font-bold text-[var(--t-text)]">Attention Required</h2>
                        </div>
                        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {criticalLowStock.length > 0 && (
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--t-text3)] mb-3">Low Stock</p>
                                    <ul className="space-y-2">
                                        {criticalLowStock.map(item => (
                                            <li key={item.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-rose-50 border border-rose-200">
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-[var(--t-text)] truncate">{item.name}</p>
                                                    <p className="text-[11px] text-rose-600">
                                                        {item.current_stock} {item.unit} (min {item.min_stock_level})
                                                    </p>
                                                </div>
                                                {item.pendingTransaction ? (
                                                    <button
                                                        onClick={() => handleReceiveOrder(item.pendingTransaction)}
                                                        className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg border text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100 transition-colors"
                                                    >
                                                        Receive
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleOpenOrderModal(item)}
                                                        className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg border text-rose-700 bg-white border-rose-300 hover:bg-rose-50 transition-colors"
                                                    >
                                                        Order
                                                    </button>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {overAllocated && (
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--t-text3)] mb-3">Budget Overflow</p>
                                    <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 space-y-3">
                                        <p className="text-sm text-[var(--t-text2)] leading-relaxed">
                                            Category allocation exceeds master budget by{' '}
                                            <span className="font-bold text-amber-700">
                                                {formatCurrency(budgetStats.projectHealth.excess || 0)}
                                            </span>. Rebalance in Manage.
                                        </p>
                                        {(budgetStats.projectHealth.issues || []).slice(0, 3).map((issue, idx) => (
                                            <p key={idx} className="text-xs text-amber-700 bg-amber-100 rounded px-2 py-1.5">
                                                {issue.message}
                                            </p>
                                        ))}
                                        <button
                                            onClick={() => navigate('/dashboard/desktop/manage')}
                                            className="text-xs font-semibold px-3 py-1.5 rounded-lg border text-amber-700 bg-white border-amber-300 hover:bg-amber-50 transition-colors"
                                        >
                                            Rebalance Now
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="px-6 pb-5">
                            <WastageAlertPanel compact onResolved={() => {}} />
                        </div>
                    </div>
                )}

                {/* ── Recent Activity ── */}
                <div className="bg-[var(--t-surface)] rounded-xl border border-[var(--t-border)] shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-[var(--t-border)]">
                        <h2 className="text-sm font-bold text-[var(--t-text)]">Recent Activity</h2>
                    </div>
                    {recentActivities.length === 0 ? (
                        <p className="py-8 text-center text-sm text-[var(--t-text3)]">No recent activity.</p>
                    ) : (
                        <ul className="divide-y divide-[var(--t-border)]">
                            {recentActivities.slice(0, 8).map((a) => (
                                <li key={a.id} className="flex items-start gap-4 px-6 py-3">
                                    <div className="w-8 h-8 rounded-lg bg-[var(--t-surface2)] border border-[var(--t-border)] flex items-center justify-center text-sm shrink-0">
                                        {a.icon}
                                    </div>
                                    <div className="min-w-0 flex-1 py-0.5">
                                        <p className="text-sm text-[var(--t-text)] leading-snug">{a.message}</p>
                                        <p className="text-xs text-[var(--t-text3)] mt-0.5">{a.time}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

            </div>{/* end page body */}

            {/* ── Modals ── */}
            <Modal
                isOpen={orderModalOpen}
                onClose={() => setOrderModalOpen(false)}
                title={`Order Material: ${selectedOrderMaterial?.name || ''}`}
            >
                <div className="space-y-4 p-4">
                    <div className="bg-[var(--t-nav-active-bg)] border border-[var(--t-border)] rounded-xl p-4">
                        <h4 className="text-sm font-bold text-[var(--t-primary)] mb-2">Material Details</h4>
                        <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                                <span className="text-[var(--t-text2)]">Material:</span>
                                <span className="font-bold text-[var(--t-text)]">{selectedOrderMaterial?.name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[var(--t-text2)]">Current Stock:</span>
                                <span className="font-bold text-[var(--t-danger)]">{selectedOrderMaterial?.current_stock} {selectedOrderMaterial?.unit}</span>
                            </div>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-[var(--t-text2)] mb-2">Select Supplier *</label>
                        <select
                            value={selectedOrderSupplier || ''}
                            onChange={(e) => setSelectedOrderSupplier(Number(e.target.value))}
                            className="w-full rounded-xl border-[var(--t-border)] shadow-sm focus:ring-2 focus:ring-[var(--t-primary)] p-3 border outline-none bg-[var(--t-surface)] font-bold"
                            required
                        >
                            <option value="">Choose a supplier...</option>
                            {(dashboardData.suppliers || [])
                                .filter(s => s.email)
                                .map(s => (
                                    <option key={s.id} value={s.id}>{s.name} ({s.email})</option>
                                ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-[var(--t-text2)] mb-2">Quantity to Order</label>
                        <input
                            type="number"
                            value={orderQuantity}
                            onChange={(e) => setOrderQuantity(e.target.value)}
                            className="w-full rounded-xl border-[var(--t-border)] shadow-sm focus:ring-2 focus:ring-[var(--t-primary)] p-3 border outline-none text-lg font-black text-center"
                            min="1"
                        />
                    </div>
                    <div className="space-y-4 pt-2 border-t border-[var(--t-border)]">
                        <h4 className="text-xs font-black text-[var(--t-text3)] uppercase tracking-widest">Email Content</h4>
                        <div>
                            <label className="block text-[10px] font-bold text-[var(--t-text2)] uppercase mb-1">Subject</label>
                            <input
                                type="text"
                                value={orderSubject}
                                onChange={(e) => setOrderSubject(e.target.value)}
                                className="w-full rounded-lg border-[var(--t-border)] shadow-sm focus:ring-2 focus:ring-[var(--t-primary)] p-2 border outline-none text-sm font-medium"
                                placeholder="Email Subject"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-[var(--t-text2)] uppercase mb-1">Custom Message / Notes</label>
                            <textarea
                                value={orderBody}
                                onChange={(e) => setOrderBody(e.target.value)}
                                className="w-full rounded-lg border-[var(--t-border)] shadow-sm focus:ring-2 focus:ring-[var(--t-primary)] p-3 border outline-none text-sm min-h-[100px] leading-relaxed"
                                placeholder="Add specific delivery instructions, deadlines, or site details..."
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <button type="button" onClick={() => setOrderModalOpen(false)} className="px-6 py-2.5 text-xs font-black text-[var(--t-text3)] uppercase tracking-widest">Cancel</button>
                        <button
                            onClick={handleSendOrder}
                            disabled={!orderQuantity || !selectedOrderSupplier || orderLoading}
                            className="px-8 py-2.5 bg-[var(--t-primary)] text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-[var(--t-primary)]/10 hover:bg-[var(--t-primary2)] hover:-translate-y-0.5 transition-all flex items-center gap-2"
                        >
                            {orderLoading ? 'Sending...' : 'Send Order Email'}
                        </button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={isTaskModalOpen} onClose={() => setIsTaskModalOpen(false)} title={`Add Task to ${selectedPhase?.name}`}>
                <form onSubmit={handleAddTask} className="space-y-4">
                    <input
                        type="text"
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        placeholder="e.g. Ground Floor Slab Casting"
                        className="w-full rounded-xl border-[var(--t-border)] shadow-sm focus:ring-2 focus:ring-[var(--t-primary)] p-3 border outline-none font-bold"
                        autoFocus
                    />
                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={() => setIsTaskModalOpen(false)} className="px-6 py-2.5 text-xs font-black text-[var(--t-text3)] uppercase tracking-widest">Cancel</button>
                        <button type="submit" disabled={loading || !newTaskTitle.trim()} className="px-8 py-2.5 bg-[var(--t-primary)] text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-[var(--t-primary)]/10">
                            {loading ? 'Adding...' : 'Confirm Item'}
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={isPermitModalOpen} onClose={() => setIsPermitModalOpen(false)} title="New Permit Step">
                <form onSubmit={handleAddPermitStep} className="space-y-4">
                    <input
                        type="text"
                        value={newPermitTitle}
                        onChange={(e) => setNewPermitTitle(e.target.value)}
                        placeholder="e.g. Ward Clearance"
                        className="w-full rounded-xl border-[var(--t-border)] shadow-sm focus:ring-2 focus:ring-[var(--t-primary)] p-3 border outline-none font-bold"
                        autoFocus
                    />
                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={() => setIsPermitModalOpen(false)} className="px-6 py-2.5 text-xs font-black text-[var(--t-text3)] uppercase tracking-widest">Cancel</button>
                        <button type="submit" disabled={loading || !newPermitTitle.trim()} className="px-8 py-2.5 bg-[var(--t-primary)] text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-[var(--t-primary)]/10">
                            Create Step
                        </button>
                    </div>
                </form>
            </Modal>

            <SuccessModal
                isOpen={successModalInfo.isOpen}
                onClose={() => setSuccessModalInfo({ ...successModalInfo, isOpen: false })}
                title={successModalInfo.title}
                message={successModalInfo.message}
                supplierName={successModalInfo.supplierName}
            />

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

export default DesktopHome;
