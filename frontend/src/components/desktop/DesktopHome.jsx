import React, { useState } from 'react';
import Modal from '../common/Modal';
import SuccessModal from '../common/SuccessModal';
import PhaseDetailModal from './manage/PhaseDetailModal';
import TaskPreviewModal from './manage/TaskPreviewModal';
import WastageAlertPanel from '../common/WastageAlertPanel';
import { constructionService, permitService, dashboardService, getMediaUrl } from '../../services/api';
import { useConstruction } from '../../context/ConstructionContext';
import ConfirmModal from '../common/ConfirmModal';

const DesktopHome = () => {
    const { dashboardData, stats, budgetStats, recentActivities, formatCurrency, refreshData, updatePhase } = useConstruction();

    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [selectedPhase, setSelectedPhase] = useState(null);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [loading, setLoading] = useState(false);
    const [detailPhase, setDetailPhase] = useState(null);
    const [previewTask, setPreviewTask] = useState(null);

    // Confirmation Modal System
    const [confirmConfig, setConfirmConfig] = useState({ isOpen: false });
    const showConfirm = (config) => setConfirmConfig({ ...config, isOpen: true });
    const closeConfirm = () => setConfirmConfig({ ...confirmConfig, isOpen: false });

    // Permit State
    const [isPermitModalOpen, setIsPermitModalOpen] = useState(false);
    const [newPermitTitle, setNewPermitTitle] = useState('');
    const [showPermits, setShowPermits] = useState(false);

    // Order State
    const [orderModalOpen, setOrderModalOpen] = useState(false);
    const [selectedOrderMaterial, setSelectedOrderMaterial] = useState(null);
    const [selectedOrderSupplier, setSelectedOrderSupplier] = useState(null);
    const [orderQuantity, setOrderQuantity] = useState('');
    const [orderSubject, setOrderSubject] = useState('');
    const [orderBody, setOrderBody] = useState('');
    const [orderLoading, setOrderLoading] = useState(false);
    const [successModalInfo, setSuccessModalInfo] = useState({ isOpen: false, title: '', message: '', supplierName: '' });

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
            alert('❌ Please select a supplier');
            return;
        }
        setOrderLoading(true);
        try {
            const response = await dashboardService.emailSupplier(
                selectedOrderMaterial.id,
                orderQuantity,
                selectedOrderSupplier,
                orderSubject,
                orderBody
            );
            setOrderModalOpen(false);
            setSuccessModalInfo({
                isOpen: true,
                title: 'Order Sent Successfully! 📧',
                message: response.message,
                supplierName: response.supplier
            });
            refreshData();
        } catch (error) {
            const errorMsg = error.response?.data?.error || 'Failed to send order email';
            alert(`❌ ${errorMsg}`);
        } finally {
            setOrderLoading(false);
        }
    };

    const handleReceiveOrder = (transaction) => {
        showConfirm({
            title: "Confirm Material Receipt?",
            message: "Are you sure you want to confirm receipt of these materials? This will add them to stock and automatically create an associated expense record. This action cannot be undone.",
            confirmText: "Yes, Confirm Receipt",
            type: "warning",
            onConfirm: async () => {
                setOrderLoading(true);
                try {
                    const response = await dashboardService.receiveMaterialOrder(transaction.id);
                    setSuccessModalInfo({
                        isOpen: true,
                        title: 'Stock Updated! 📦',
                        message: response.message,
                        supplierName: response.supplier
                    });
                    refreshData();
                    closeConfirm();
                } catch (error) {
                    const errorMsg = error.response?.data?.error || 'Failed to confirm receipt';
                    alert(`❌ ${errorMsg}`);
                    closeConfirm();
                } finally {
                    setOrderLoading(false);
                }
            }
        });
    };

    // Collapsible Phases State
    const [expandedPhases, setExpandedPhases] = useState(new Set());

    // Initialize with in-progress phase
    React.useEffect(() => {
        if (dashboardData.phases.length > 0 && expandedPhases.size === 0) {
            const inProgressPhase = dashboardData.phases.find(p => p.status === 'IN_PROGRESS');
            if (inProgressPhase) {
                setExpandedPhases(new Set([inProgressPhase.id]));
            }
        }
    }, [dashboardData.phases, expandedPhases.size]);

    const togglePhase = (phaseId) => {
        const newExpanded = new Set(expandedPhases);
        if (newExpanded.has(phaseId)) {
            newExpanded.delete(phaseId);
        } else {
            newExpanded.add(phaseId);
        }
        setExpandedPhases(newExpanded);
    };

    const expandAll = () => {
        setExpandedPhases(new Set(dashboardData.phases.map(p => p.id)));
    };

    const collapseAll = () => {
        setExpandedPhases(new Set());
    };

    const focusActive = () => {
        const inProgress = dashboardData.phases.filter(p => p.status === 'IN_PROGRESS');
        setExpandedPhases(new Set(inProgress.map(p => p.id)));
    };

    const handleStatusChange = async (phaseId, newStatus) => {
        try {
            await updatePhase(phaseId, { status: newStatus });
        } catch (error) {
            console.error("Failed to update phase status", error);
            alert("Failed to update phase status");
        }
    };

    const handlePermitStatusChange = async (stepId, newStatus) => {
        try {
            await permitService.updateStep(stepId, { status: newStatus });
            refreshData();
        } catch (error) {
            console.error("Failed to update permit status", error);
            alert("Failed to update permit status");
        }
    };

    const handleTaskToggle = async (task) => {
        try {
            const newStatus = task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
            await constructionService.updateTask(task.id, { status: newStatus });
            refreshData();
        } catch (error) {
            console.error("Failed to update task", error);
        }
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
                title: newTaskTitle,
                phase: selectedPhase.id,
                status: 'PENDING',
                priority: 'MEDIUM',
            });
            setIsTaskModalOpen(false);
            refreshData();
        } catch (error) {
            console.error("Failed to create task", error);
            alert("Failed to create task");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteTask = (taskId) => {
        showConfirm({
            title: "Delete Task?",
            message: "Are you sure you want to permanently remove this task? Any associated media and proof records will also be deleted. This action is irreversible.",
            confirmText: "Yes, Delete Task",
            type: "danger",
            onConfirm: async () => {
                try {
                    await constructionService.deleteTask(taskId);
                    refreshData();
                    closeConfirm();
                } catch (error) {
                    console.error("Failed to delete task", error);
                    closeConfirm();
                }
            }
        });
    };

    const handleAddPermitStep = async (e) => {
        e.preventDefault();
        if (!newPermitTitle.trim()) return;

        setLoading(true);
        try {
            const maxOrder = dashboardData.permits?.reduce((max, step) => Math.max(max, step.order), 0) || 0;
            await permitService.createStep({
                title: newPermitTitle,
                status: 'PENDING',
                order: maxOrder + 1,
                description: 'Custom permit step'
            });
            setIsPermitModalOpen(false);
            setNewPermitTitle('');
            refreshData();
        } catch (error) {
            console.error("Failed to create permit step", error);
            alert("Failed to create permit step");
        } finally {
            setLoading(false);
        }
    };

    const handleDeletePermitStep = (stepId) => {
        showConfirm({
            title: "Delete Permit Step?",
            message: "Are you sure you want to delete this permit step? This will remove it from the legal compliance workflow. This action is irreversible.",
            confirmText: "Yes, Delete Step",
            type: "danger",
            onConfirm: async () => {
                try {
                    await permitService.deleteStep(stepId);
                    refreshData();
                    closeConfirm();
                } catch (error) {
                    console.error("Failed to delete permit step", error);
                    closeConfirm();
                }
            }
        });
    };

    return (
        <div className="min-h-screen bg-[var(--t-bg)] font-sans">
            {/* Header Section with Stats */}
            <div className="bg-[var(--t-surface)] border-b border-[var(--t-border)] pb-8 pt-8 px-6 relative overflow-hidden">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-[var(--t-text)] flex items-center gap-3 tracking-tight">
                                <span className="text-4xl text-[var(--t-primary)]">🏗️</span>
                                Project Dashboard
                            </h1>
                            <p className="text-[var(--t-text2)] mt-1 text-base font-medium">
                                Dream Home Construction - Overview & Progress
                            </p>
                        </div>
                        <div className="hidden md:flex items-center gap-3 bg-[var(--t-surface2)] px-4 py-2 rounded-lg border border-[var(--t-border)]">
                            <span className="flex h-2.5 w-2.5 rounded-full bg-[var(--t-primary)]"></span>
                            <span className="text-[var(--t-text2)] text-[10px] font-bold uppercase tracking-wider">Live Status</span>
                        </div>
                    </div>

                    {/* Stats Grid inside Header */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-[var(--t-surface)] rounded-xl p-6 border border-[var(--t-border)] shadow-sm transition-all hover:shadow-md h-full">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-[var(--t-primary)]/10 rounded-lg flex items-center justify-center text-2xl">💰</div>
                                <div>
                                    <div className="text-[var(--t-text3)] text-[10px] font-bold uppercase tracking-wider">Budget Used</div>
                                    <div className="text-2xl font-bold text-[var(--t-text)] mt-0.5">
                                        {budgetStats.budgetPercent.toFixed(1)}%
                                    </div>
                                </div>
                            </div>
                            <div className="mt-4 text-[11px] text-[var(--t-text3)]">
                                <span className="text-[var(--t-text)] font-bold">{formatCurrency(budgetStats.totalSpent)}</span> utilized
                            </div>
                        </div>

                        <div className="bg-[var(--t-surface)] rounded-xl p-6 border border-[var(--t-border)] shadow-sm transition-all hover:shadow-md h-full">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-[var(--t-info)]/10 rounded-lg flex items-center justify-center text-2xl">💵</div>
                                <div>
                                    <div className="text-[var(--t-text3)] text-[10px] font-bold uppercase tracking-wider">Available Cash</div>
                                    <div className="text-2xl font-bold text-[var(--t-text)] mt-0.5">
                                        {formatCurrency(budgetStats.availableCash)}
                                    </div>
                                </div>
                            </div>
                            <div className="mt-4">
                                <div className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide ${budgetStats.availableCash > 0 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'}`}>
                                    {budgetStats.availableCash > 0 ? 'Healthy Liquidity' : 'Low Funds Warning'}
                                </div>
                            </div>
                        </div>

                        <div className="bg-[var(--t-surface)] rounded-xl p-6 border border-[var(--t-border)] shadow-sm transition-all hover:shadow-md h-full">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-indigo-500/10 rounded-lg flex items-center justify-center text-2xl">🏗️</div>
                                <div>
                                    <div className="text-[var(--t-text3)] text-[10px] font-bold uppercase tracking-wider">Inventory Value</div>
                                    <div className="text-2xl font-bold text-[var(--t-text)] mt-0.5">
                                        {formatCurrency(budgetStats.inventoryValue)}
                                    </div>
                                </div>
                            </div>
                            <div className="mt-4 text-[11px] text-[var(--t-text3)]">
                                {dashboardData.materials?.length || 0} Material types tracked
                            </div>
                        </div>

                        <div className="bg-[var(--t-surface)] rounded-xl p-6 border border-[var(--t-border)] shadow-sm transition-all hover:shadow-md h-full">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-amber-500/10 rounded-lg flex items-center justify-center text-2xl">🛡️</div>
                                <div>
                                    <div className="text-[var(--t-text3)] text-[10px] font-bold uppercase tracking-wider">Funding Coverage</div>
                                    <div className="text-2xl font-bold text-[var(--t-text)] mt-0.5">
                                        {budgetStats.fundingCoverage.toFixed(0)}%
                                    </div>
                                </div>
                            </div>
                            <div className="mt-4 text-[11px] text-[var(--t-text3)] flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                Total capital secured
                            </div>
                        </div>
                    </div>
                    {stats.find(s => s.title === 'Master Budget') && (
                        <div className="mt-8 bg-[var(--t-surface2)] rounded-xl p-6 border border-[var(--t-border)]">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <div className="text-[var(--t-text3)] text-[10px] font-bold uppercase tracking-wider">Master Budget Overview</div>
                                    <div className="flex items-baseline gap-2 mt-1">
                                        <div className="text-3xl font-bold text-[var(--t-text)]">
                                            Rs. {stats.find(s => s.title === 'Master Budget').value}
                                        </div>
                                        <div className="text-sm font-medium text-[var(--t-text3)]">Planned</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[var(--t-text3)] text-[10px] font-bold uppercase tracking-wider">Utilization</div>
                                    <div className="text-xl font-bold text-[var(--t-primary)] mt-1">
                                        {budgetStats.budgetPercent}%
                                    </div>
                                </div>
                            </div>
                            <div className="h-2.5 w-full bg-[var(--t-bg)] rounded-full overflow-hidden border border-[var(--t-border)]">
                                <div 
                                    className="h-full bg-[var(--t-primary)] rounded-full transition-all duration-1000 ease-out" 
                                    style={{ width: `${budgetStats.budgetPercent}%` }} 
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content Area - Overlapping the Header slightly for modern look */}
            <div className="max-w-7xl mx-auto px-6 -mt-6 pb-12 relative z-10">
                {/* Action Required Section */}
                {(budgetStats.lowStockItems?.length > 0 || budgetStats.projectHealth?.status === 'OVER_ALLOCATED') && (
                    <div className="bg-white rounded-xl border-l-4 border-l-red-500 shadow-sm mb-8 overflow-hidden animate-fadeIn">
                        <div className="bg-red-50 px-6 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="text-xl">⚠️</span>
                                <h2 className="text-sm font-bold text-red-700 uppercase tracking-wider">Attention Required</h2>
                            </div>
                            <span className="text-[10px] font-bold text-red-600 bg-red-100 px-3 py-1 rounded-full uppercase tracking-wide">Critical Info</span>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Low Stock Items */}
                            {budgetStats.lowStockItems?.length > 0 && (
                                <div className="space-y-4">
                                    <h3 className="text-xs font-bold text-[var(--t-text2)] uppercase tracking-wider flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                        Critical Inventory Level
                                    </h3>
                                    <div className="space-y-2">
                                        {budgetStats.lowStockItems.slice(0, 3).map(item => (
                                            <div key={item.id} className="flex items-center justify-between p-3 bg-[var(--t-danger)]/5 rounded-xl border border-[var(--t-danger)]/10 hover:border-[var(--t-danger)]/30 transition-colors">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-[var(--t-text)]">{item.name}</span>
                                                    <span className="text-[10px] text-[var(--t-danger)] font-bold uppercase tracking-tight">Stock: {item.current_stock} {item.unit} (Min: {item.min_stock_level})</span>
                                                </div>
                                                {item.pendingTransaction ? (
                                                    <button
                                                        onClick={() => handleReceiveOrder(item.pendingTransaction)}
                                                        className="text-[10px] font-bold text-[var(--t-primary2)] bg-[var(--t-primary2)]/5 border border-[var(--t-primary2)]/20 px-3 py-1.5 rounded-lg shadow-sm hover:bg-[var(--t-primary2)]/10 transition-colors flex items-center gap-1.5"
                                                    >
                                                        <span>✅</span>
                                                        Confirm Received
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleOpenOrderModal(item)}
                                                        className="text-[10px] font-bold text-[var(--t-danger)] bg-[var(--t-surface)] border border-[var(--t-danger)]/20 px-3 py-1.5 rounded-lg shadow-sm hover:bg-[var(--t-danger)]/10 transition-colors"
                                                    >
                                                        Order Now
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                        {budgetStats.lowStockItems.length > 3 && (
                                            <p className="text-[10px] text-[var(--t-text3)] italic pl-1">+ {budgetStats.lowStockItems.length - 3} more items need attention</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Budget Validation */}
                            {budgetStats.projectHealth?.status === 'OVER_ALLOCATED' && (
                                <div className="space-y-4">
                                    <h3 className="text-xs font-bold text-[var(--t-text2)] uppercase tracking-wider flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-[var(--t-warn)]"></span>
                                        Budget Warning
                                    </h3>
                                    <div className="p-4 bg-[var(--t-warn)]/5 rounded-2xl border border-[var(--t-warn)]/20 flex items-start gap-4">
                                        <div className="w-10 h-10 bg-[var(--t-warn)]/10 rounded-full flex items-center justify-center text-xl flex-shrink-0">💰</div>
                                        <div className="flex flex-col flex-1">
                                            <span className="text-sm font-bold text-[var(--t-warn)]">Allocation Overflow</span>
                                            <p className="text-xs text-[var(--t-text2)] mt-1 leading-relaxed">
                                                Category allocation exceeds master budget by <span className="font-bold">{formatCurrency(budgetStats.projectHealth.excess)}</span>. Check the "Expenses" tab to rebalance.
                                            </p>
                                            <div className="h-1.5 w-full bg-[var(--t-warn)]/10 rounded-full mt-3 overflow-hidden">
                                                <div className="h-full bg-[var(--t-warn)] rounded-full animate-pulse" style={{ width: '100%' }}></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Wastage Alert Compact Banner */}
                <WastageAlertPanel compact onResolved={() => {}} />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Construction Journey */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="bg-[var(--t-surface)] rounded-2xl shadow-sm border border-[var(--t-border)] overflow-hidden">
                            <div className="px-6 py-4 border-b border-[var(--t-border)] flex justify-between items-center bg-[var(--t-surface2)]/50">
                                <div>
                                    <h2 className="text-xs font-black text-[var(--t-text3)] uppercase tracking-[0.2em]">Construction Journey</h2>
                                    <h1 className="text-xl font-black text-[var(--t-text)] mt-1">Timeline & Phases</h1>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={expandAll}
                                        className="text-[10px] font-bold uppercase tracking-wider text-[var(--t-primary)] hover:text-[var(--t-nav-active-text)] bg-[var(--t-nav-active-bg)] px-3 py-1.5 rounded-lg transition-colors"
                                    >
                                        Expand All
                                    </button>
                                    <button
                                        onClick={collapseAll}
                                        className="text-[10px] font-bold uppercase tracking-wider text-[var(--t-text2)] hover:text-[var(--t-text2)] bg-[var(--t-surface3)] px-3 py-1.5 rounded-lg transition-colors"
                                    >
                                        Collapse All
                                    </button>
                                </div>
                            </div>

                            <div className="p-6 relative pl-4 space-y-12 bg-[var(--t-surface)]">
                                {/* Vertical Progress Line */}
                                <div className="absolute left-10 top-6 bottom-6 w-[2px] bg-[var(--t-surface3)] rounded-full -translate-x-1/2"></div>
                                                {/* Phases Rendering */}
                                                {dashboardData.phases.map((phase) => {
                                                    const phaseTasks = dashboardData.tasks.filter(t => t.phase === phase.id);
                                                    const completedTasks = phaseTasks.filter(t => t.status === 'COMPLETED').length;
                                                    const progress = phaseTasks.length > 0 ? Math.round((completedTasks / phaseTasks.length) * 100) : 0;
                                                    const isCompleted = phase.status === 'COMPLETED';
                                                    const isInProgress = phase.status === 'IN_PROGRESS';

                                                    return (
                                                        <div key={phase.id} className="relative group pl-16 mb-12 last:mb-0">
                                                            {/* Phase Connector Node */}
                                                            <div className={`absolute top-0 left-6 -ml-3 mt-6 w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-xs z-10 transition-all bg-white ${
                                                                isCompleted ? 'border-emerald-500 text-emerald-600' :
                                                                isInProgress ? 'border-[var(--t-primary)] text-[var(--t-primary)] shadow-sm' :
                                                                'border-slate-300 text-slate-400'
                                                            }`}>
                                                                {isCompleted ? '✓' : phase.order}
                                                            </div>

                                                            {/* Phase Content Card */}
                                                            <div className={`bg-white rounded-xl border transition-all overflow-hidden ${isInProgress ? 'border-[var(--t-primary)]/40 shadow-sm' : 'border-slate-200'}`}>
                                                                <div
                                                                    className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50 transition-colors"
                                                                    onClick={() => togglePhase(phase.id)}
                                                                >
                                                                    <div className="flex-1">
                                                                        <div className="flex items-center gap-3 mb-1">
                                                                            <h3 className={`font-bold text-lg ${isInProgress ? 'text-[var(--t-primary)]' : 'text-slate-900'}`}>{phase.name}</h3>
                                                                            {isInProgress && (
                                                                                <span className="px-2 py-0.5 rounded-full bg-[var(--t-primary)]/10 text-[var(--t-primary)] text-[10px] font-bold uppercase tracking-wide">In Progress</span>
                                                                            )}
                                                                        </div>
                                                                        <p className="text-sm text-slate-500 font-medium line-clamp-2 max-w-2xl">{phase.description}</p>
                                                                        
                                                                        <div className="flex flex-wrap items-center gap-4 mt-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                                            <span className="flex items-center gap-1.5"><span className="text-sm">💰</span> {formatCurrency(phase.estimated_budget)}</span>
                                                                            <span className="flex items-center gap-1.5"><span className="text-sm">📋</span> {phaseTasks.length} Units</span>
                                                                        </div>
                                                                        
                                                                        {/* Simple Progress Strip inside the info column */}
                                                                        <div className="mt-4 flex items-center gap-3 w-full max-w-xs">
                                                                            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                                                <div className={`h-full rounded-full ${isCompleted ? 'bg-emerald-500' : 'bg-[var(--t-primary)]'}`} style={{ width: `${isCompleted ? 100 : progress}%` }} />
                                                                            </div>
                                                                            <span className="text-[10px] font-bold text-slate-500">{isCompleted ? '100%' : `${progress}%`}</span>
                                                                        </div>
                                                                    </div>

                                                                    {/* Management Column */}
                                                                    <div className="flex flex-col items-end gap-3" onClick={(e) => e.stopPropagation()}>
                                                                        <div className="flex items-center gap-2">
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setDetailPhase(phase);
                                                                                }}
                                                                                className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-indigo-600 transition-all"
                                                                                title="Settings"
                                                                            >
                                                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                                            </button>
                                                                            <select
                                                                                value={phase.status}
                                                                                onChange={(e) => handleStatusChange(phase.id, e.target.value)}
                                                                                className={`text-[10px] font-bold uppercase rounded-lg py-1.5 px-3 border outline-none ${
                                                                                    isCompleted ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                                                    isInProgress ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                                                                                    'bg-slate-50 text-slate-500 border-slate-100'
                                                                                }`}
                                                                            >
                                                                                <option value="NOT_STARTED">To Do</option>
                                                                                <option value="IN_PROGRESS">Active</option>
                                                                                <option value="COMPLETED">Finished</option>
                                                                            </select>
                                                                        </div>
                                                                        
                                                                        <div className="flex -space-x-2 overflow-hidden py-1">
                                                                            {phase.completion_photo && (
                                                                                <img
                                                                                    src={getMediaUrl(phase.completion_photo)}
                                                                                    alt="Completion"
                                                                                    className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover cursor-pointer hover:scale-110 transition-transform"
                                                                                    onClick={(e) => { e.stopPropagation(); setDetailPhase(phase); }}
                                                                                />
                                                                            )}
                                                                            {phase.naksa_file && (
                                                                                <div className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-indigo-50 flex items-center justify-center text-[8px] font-bold text-indigo-600 cursor-pointer" title="Blueprint">BP</div>
                                                                            )}
                                                                            <button
                                                                                onClick={() => openAddTaskModal(phase)}
                                                                                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all font-bold text-sm ring-2 ring-white"
                                                                                title="Add Task"
                                                                            >
                                                                                +
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Expanded Task List (Inside Card) */}
                                                                {expandedPhases.has(phase.id) && (
                                                                    <div className="border-t border-slate-100 bg-slate-50/30 p-5 space-y-2">
                                                                        {phaseTasks.map(task => (
                                                                            <div key={task.id} 
                                                                                 onClick={() => setPreviewTask(task)}
                                                                                 className="bg-white p-3 rounded-lg border border-slate-200 flex items-center justify-between group hover:border-indigo-300 transition-all shadow-sm cursor-pointer">
                                                                                <div className="flex items-center gap-3">
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        checked={task.status === 'COMPLETED'}
                                                                                        onChange={(e) => { e.stopPropagation(); handleTaskToggle(task); }}
                                                                                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                                                    />
                                                                                    <div className="flex flex-col">
                                                                                        <span className={`text-sm font-semibold ${task.status === 'COMPLETED' ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                                                                                            {task.title}
                                                                                        </span>
                                                                                        <div className="flex items-center gap-2 mt-0.5">
                                                                                            <span className={`text-[8px] font-black uppercase tracking-widest px-1 rounded-[2px] ${
                                                                                                task.priority === 'CRITICAL' ? 'bg-red-50 text-red-600' :
                                                                                                task.priority === 'HIGH' ? 'bg-orange-50 text-orange-600' :
                                                                                                'bg-indigo-50 text-indigo-600'
                                                                                            }`}>
                                                                                                {task.priority || 'MEDIUM'}
                                                                                            </span>
                                                                                            {task.due_date && (
                                                                                                <span className="text-[9px] text-slate-400 font-bold uppercase">
                                                                                                    Due: {new Date(task.due_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                                                                                                </span>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="flex items-center gap-3">
                                                                                    {task.media?.length > 0 && (
                                                                                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                                                                            📸 {task.media.length}
                                                                                        </span>
                                                                                    )}
                                                                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity px-2 text-lg">×</button>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                        <button
                                                                            onClick={() => openAddTaskModal(phase)}
                                                                            className="w-full py-2 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 hover:text-indigo-600 hover:border-indigo-300 hover:bg-white transition-all text-[10px] font-bold uppercase tracking-widest"
                                                                        >
                                                                            + Add New Task
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Activity & Quick Actions */}
                    <div className="space-y-6">
                        {/* Quick Actions Card */}
                        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                            <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Quick Actions</h2>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                { title: 'New Expense', icon: '💸', color: 'hover:bg-red-50 text-slate-700' },
                                { title: 'Add Material', icon: '📦', color: 'hover:bg-indigo-50 text-slate-700' },
                                { title: 'Upload Photo', icon: '📷', color: 'hover:bg-sky-50 text-slate-700' },
                                { title: 'Create Task', icon: '📋', color: 'hover:bg-emerald-50 text-slate-700' },
                                ].map((a, i) => (
                                    <button key={i} className={`p-4 rounded-xl border border-slate-100 flex flex-col items-center justify-center gap-2 transition-all group ${a.color}`}>
                                        <span className="text-2xl group-hover:scale-110 transition-transform">{a.icon}</span>
                                        <span className="text-[10px] font-bold uppercase tracking-wide text-center">{a.title}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Log Stream Card */}
                        <div className="bg-white rounded-xl border border-slate-200 flex flex-col h-[500px] shadow-sm">
                            <div className="px-6 py-4 border-b border-slate-100">
                                <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recent Activity</h2>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                {recentActivities.map((activity) => (
                                    <div key={activity.id} className="relative pl-6 pb-6 border-l border-[var(--t-border)] last:pb-0 last:border-0">
                                        <div className="absolute left-0 top-0 -translate-x-1/2 w-3 h-3 rounded-full bg-[var(--t-surface)] border-2 border-[var(--t-border)]"></div>
                                        <div className="flex gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-[var(--t-surface2)] border border-[var(--t-border)] flex items-center justify-center text-lg flex-shrink-0 text-[var(--t-text2)]">
                                                {activity.icon}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-[var(--t-text)] leading-tight">{activity.message}</p>
                                                <p className="text-xs text-[var(--t-text3)] font-medium mt-1">{activity.time}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Nepali User Guide Dashboard */}
                        <div className="bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden shadow-sm">
                            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                                <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">How to use (प्रयोगकर्ता सम्बन्धी जानकारी)</h2>
                                <span className="text-[8px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full uppercase">User Guide</span>
                            </div>
                            <div className="p-6 space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-3 bg-[var(--t-surface2)]/40 p-4 rounded-xl border border-[var(--t-border)]/50">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-lg">🏗️</span>
                                            <h3 className="text-xs font-black text-[var(--t-text)] uppercase tracking-wider">निर्माण चरण (Phases)</h3>
                                        </div>
                                        <p className="text-[11px] text-[var(--t-text2)] leading-relaxed">
                                            घर निर्माणको प्रत्येक चरण र बजेट यहाँबाट व्यवस्थापन गर्न सकिन्छ। चरण अनुसारको कामको प्रगति हेर्नुहोस्।
                                        </p>
                                    </div>
                                    <div className="space-y-3 bg-[var(--t-surface2)]/40 p-4 rounded-xl border border-[var(--t-border)]/50">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-lg">✅</span>
                                            <h3 className="text-xs font-black text-[var(--t-text)] uppercase tracking-wider">कार्य र प्रमाण (Tasks)</h3>
                                        </div>
                                        <p className="text-[11px] text-[var(--t-text2)] leading-relaxed">
                                            दैनिक हुने कामहरू अपडेट गर्नुहोस्। काम सकिएपछि फोटो वा बिल 'Proof' को रूपमा अपलोड गरी सुरक्षित राख्नुहोस्।
                                        </p>
                                    </div>
                                    <div className="space-y-3 bg-[var(--t-surface2)]/40 p-4 rounded-xl border border-[var(--t-border)]/50">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-lg">📦</span>
                                            <h3 className="text-xs font-black text-[var(--t-text)] uppercase tracking-wider">स्टक र खेर (Stock)</h3>
                                        </div>
                                        <p className="text-[11px] text-[var(--t-text2)] leading-relaxed">
                                            सामाग्री खरिद गर्दा 'Stock In' र प्रयोग गर्दा 'Stock Out' गर्नुहोस्। सामाग्री खेर गएमा (Wastage) तुरुन्त दर्ता गर्नुहोस्।
                                        </p>
                                    </div>
                                    <div className="space-y-3 bg-[var(--t-surface2)]/40 p-4 rounded-xl border border-[var(--t-border)]/50">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-lg">💰</span>
                                            <h3 className="text-xs font-black text-[var(--t-text)] uppercase tracking-wider">वित्तीय विवरण (Finance)</h3>
                                        </div>
                                        <p className="text-[11px] text-[var(--t-text2)] leading-relaxed">
                                            कहाँ कति खर्च भयो र कुन खाताबाट पैसा तिरियो भन्ने कुराको पूर्ण हिसाब यहाँ स्पष्ट देखिन्छ।
                                        </p>
                                    </div>
                                </div>

                                <div className="bg-[var(--t-primary)]/5 p-4 rounded-2xl border border-[var(--t-primary)]/10">
                                    <div className="flex items-start gap-3">
                                        <span className="text-xl">💡</span>
                                        <div>
                                            <p className="text-[11px] font-bold text-[var(--t-primary2)] mb-1 uppercase tracking-tight">मुख्य सुझाव (Safety Tip)</p>
                                            <p className="text-xs text-[var(--t-text)] leading-relaxed font-medium">
                                                निर्माण सामाग्री १०% भन्दा बढी खेर गएमा ड्यासबोर्डमा रातो अलर्ट देखा पर्नेछ। यस्तो अवस्थामा इन्जिनियरसँग सल्लाह लिनुहोस्।
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            {/* Direct Order Modal */}
            <Modal
                isOpen={orderModalOpen}
                onClose={() => setOrderModalOpen(false)}
                title={`📧 Order Material: ${selectedOrderMaterial?.name || ''}`}
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
                                    <option key={s.id} value={s.id}>
                                        {s.name} ({s.email})
                                    </option>
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
                        <h4 className="text-xs font-black text-[var(--t-text3)] uppercase tracking-widest">Email Content (अनुकूलन गर्नुहोस्)</h4>

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
                            {orderLoading ? 'Sending...' : '🚀 Send Order Email'}
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

            {detailPhase && (
                <PhaseDetailModal
                    isOpen={!!detailPhase}
                    onClose={() => setDetailPhase(null)}
                    phase={detailPhase ? dashboardData.phases.find(p => p.id === detailPhase.id) : null}
                    tasks={detailPhase ? dashboardData.tasks.filter(t => t.phase === detailPhase.id) : []}
                    onRefresh={refreshData}
                />
            )}
            {/* Success Reinforcement Modal */}
            <SuccessModal
                isOpen={successModalInfo.isOpen}
                onClose={() => setSuccessModalInfo({ ...successModalInfo, isOpen: false })}
                title={successModalInfo.title}
                message={successModalInfo.message}
                supplierName={successModalInfo.supplierName}
            />

            {previewTask && (
                <TaskPreviewModal
                    isOpen={!!previewTask}
                    onClose={() => setPreviewTask(null)}
                    task={previewTask}
                />
            )}

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
