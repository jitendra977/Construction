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
            <div className="bg-[var(--t-surface)] border-b border-[var(--t-border)] pb-12 pt-8 px-6 relative overflow-hidden">
                {/* Decorative Pattern */}
                <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, var(--t-primary) 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-3xl font-black text-[var(--t-text)] flex items-center gap-3 tracking-tight">
                                <span className="text-4xl drop-shadow-[0_0_10px_rgba(var(--t-primary-rgb),0.3)]">🏗️</span>
                                Project Dashboard
                            </h1>
                            <p className="text-[var(--t-text2)] mt-2 text-lg font-medium opacity-80">
                                Dream Home Construction - Overview & Progress
                            </p>
                        </div>
                        <div className="hidden md:flex items-center gap-3 bg-[var(--t-bg)]/30 backdrop-blur-sm px-4 py-2 rounded-xl border border-[var(--t-border)]">
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--t-primary2)] opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-[var(--t-primary2)] shadow-[0_0_8px_var(--t-primary2)]"></span>
                            </span>
                            <span className="text-[var(--t-text)] text-xs font-black uppercase tracking-widest">Live Project Status</span>
                        </div>
                    </div>

                    {/* Stats Grid inside Header */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-[var(--t-bg)]/40 hover:bg-[var(--t-bg)]/60 backdrop-blur-md rounded-2xl p-5 border border-[var(--t-border)] transition-all group overflow-hidden relative">
                            <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-20 transition-opacity">
                                <span className="text-4xl">💰</span>
                            </div>
                            <div className="flex justify-between items-start relative z-10">
                                <div>
                                    <div className="text-[var(--t-text3)] text-[10px] font-black uppercase tracking-[0.2em]">Budget Utilization</div>
                                    <div className="text-2xl font-black text-[var(--t-primary)] mt-1.5 leading-none">
                                        {budgetStats.budgetPercent.toFixed(1)}%
                                    </div>
                                </div>
                            </div>
                            <div className="mt-4 text-[11px] text-[var(--t-text2)] font-bold flex items-center gap-2">
                                <span className="text-[var(--t-primary)] font-black">{formatCurrency(budgetStats.totalSpent)}</span>
                                <span className="opacity-40">/</span>
                                <span className="opacity-60">{formatCurrency(budgetStats.totalBudget)}</span>
                            </div>
                        </div>

                        <div className="bg-[var(--t-bg)]/40 hover:bg-[var(--t-bg)]/60 backdrop-blur-md rounded-2xl p-5 border border-[var(--t-border)] transition-all group overflow-hidden relative">
                            <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-20 transition-opacity">
                                <span className="text-4xl">💵</span>
                            </div>
                            <div className="flex justify-between items-start relative z-10">
                                <div>
                                    <div className="text-[var(--t-text3)] text-[10px] font-black uppercase tracking-[0.2em]">Available Cash</div>
                                    <div className="text-2xl font-black text-[var(--t-text)] mt-1.5 leading-none">
                                        {formatCurrency(budgetStats.availableCash)}
                                    </div>
                                </div>
                            </div>
                            <div className="mt-4 flex items-center">
                                <div className={`inline-flex items-center px-2 py-0.5 rounded-[4px] text-[9px] font-black uppercase tracking-widest border ${budgetStats.availableCash > 0 ? 'bg-[var(--t-primary)]/10 text-[var(--t-primary)] border-[var(--t-primary)]/30 shadow-[0_0_8px_rgba(var(--t-primary-rgb),0.1)]' : 'bg-[var(--t-danger)]/10 text-[var(--t-danger)] border-[var(--t-danger)]/30'}`}>
                                    {budgetStats.availableCash > 0 ? 'Liquid' : 'Cash Tight'}
                                </div>
                            </div>
                        </div>

                        <div className="bg-[var(--t-bg)]/40 hover:bg-[var(--t-bg)]/60 backdrop-blur-md rounded-2xl p-5 border border-[var(--t-border)] transition-all group overflow-hidden relative">
                            <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-20 transition-opacity">
                                <span className="text-4xl">🏗️</span>
                            </div>
                            <div className="flex justify-between items-start relative z-10">
                                <div>
                                    <div className="text-[var(--t-text3)] text-[10px] font-black uppercase tracking-[0.2em]">Stock Value</div>
                                    <div className="text-2xl font-black text-[var(--t-info)] mt-1.5 leading-none">
                                        {formatCurrency(budgetStats.inventoryValue)}
                                    </div>
                                </div>
                            </div>
                            <div className="mt-4 text-[11px] text-[var(--t-text3)] font-black uppercase tracking-widest">
                                {dashboardData.materials?.length || 0} Resource types
                            </div>
                        </div>

                        <div className="bg-[var(--t-bg)]/40 hover:bg-[var(--t-bg)]/60 backdrop-blur-md rounded-2xl p-5 border border-[var(--t-border)] transition-all group overflow-hidden relative">
                            <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-20 transition-opacity">
                                <span className="text-4xl">🛡️</span>
                            </div>
                            <div className="flex justify-between items-start relative z-10">
                                <div>
                                    <div className="text-[var(--t-text3)] text-[10px] font-black uppercase tracking-[0.2em]">Funding Coverage</div>
                                    <div className="text-2xl font-black text-[var(--t-primary2)] mt-1.5 leading-none">
                                        {budgetStats.fundingCoverage.toFixed(0)}%
                                    </div>
                                </div>
                            </div>
                            <div className="mt-4 text-[11px] text-[var(--t-text3)] font-black uppercase tracking-widest flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-[var(--t-primary2)] shadow-[0_0_6px_var(--t-primary2)]"></span>
                                Securing total project
                            </div>
                        </div>
                    </div>
                    {stats.find(s => s.title === 'Master Budget') && (
                        <div className="mt-6 bg-[var(--t-surface2)]/40 backdrop-blur-md rounded-2xl p-5 border border-[var(--t-border)] relative overflow-hidden group">
                            <div className="absolute -right-4 -bottom-4 text-7xl opacity-5 rotate-12 transition-transform group-hover:scale-110">💰</div>
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <div className="text-[var(--t-text3)] text-[10px] font-black uppercase tracking-[0.2em]">Master Budget Plan</div>
                                    <div className="text-3xl font-black text-[var(--t-text)] mt-1 leading-none">
                                        Rs. {stats.find(s => s.title === 'Master Budget').value}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[var(--t-text3)] text-[10px] font-black uppercase tracking-[0.2em]">Utilization</div>
                                    <div className="text-xl font-black text-[var(--t-primary)] mt-1">
                                        {budgetStats.budgetPercent}%
                                    </div>
                                </div>
                            </div>
                            <div className="h-2 w-full bg-[var(--t-bg)]/40 rounded-full overflow-hidden border border-[var(--t-border)]">
                                <div 
                                    className="h-full bg-gradient-to-r from-[var(--t-primary)] to-[var(--t-primary2)] rounded-full shadow-[0_0_15px_var(--t-primary)] transition-all duration-1000 ease-out" 
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
                    <div className="bg-[var(--t-surface)] rounded-2xl border border-[var(--t-danger)]/20 shadow-lg mb-8 overflow-hidden animate-fadeIn">
                        <div className="bg-[var(--t-danger)]/5 px-6 py-3 border-b border-[var(--t-danger)]/10 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-xl">⚠️</span>
                                <h2 className="text-sm font-black text-[var(--t-danger)] uppercase tracking-widest">Action Required (तत्काल ध्यान दिनुहोस्)</h2>
                            </div>
                            <span className="text-[10px] font-bold text-[var(--t-danger)] bg-[var(--t-danger)]/10 px-3 py-1 rounded-full uppercase tracking-wide">High Priority</span>
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
                                    const phaseTasks = dashboardData.tasks.filter(t => t.phase === phase.id).sort((a, b) => {
                                        const dateA = a.due_date ? new Date(a.due_date) : null;
                                        const dateB = b.due_date ? new Date(b.due_date) : null;
                                        if (dateA && dateB) return dateA - dateB;
                                        if (dateA) return -1;
                                        if (dateB) return 1;
                                        return new Date(b.created_at) - new Date(a.created_at);
                                    });
                                    const completedTasks = phaseTasks.filter(t => t.status === 'COMPLETED').length;
                                    const totalTasks = phaseTasks.length;
                                    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
                                    const isCompleted = phase.status === 'COMPLETED';
                                    const isInProgress = phase.status === 'IN_PROGRESS';

                                    return (
                                        <div key={phase.id} className="relative group pl-16">
                                            {/* Phase Connector Node */}
                                            <div className={`absolute top-0 left-6 -ml-3 mt-6 w-10 h-10 rounded-full border-4 flex items-center justify-center font-black text-xs z-10 transition-all duration-500 bg-[var(--t-surface)] ${isCompleted ? 'border-[var(--t-primary2)] text-[var(--t-primary2)] shadow-lg shadow-[var(--t-primary2)]/10' :
                                                isInProgress ? 'border-[var(--t-primary)] text-[var(--t-primary)] shadow-lg shadow-[var(--t-primary)]/10 scale-110 ring-4 ring-[var(--t-primary)]/5' :
                                                    'border-[var(--t-border)] text-[var(--t-text3)]'
                                                }`}>
                                                {isCompleted ? '✓' : phase.order}
                                            </div>

                                            {/* Phase Content */}
                                            <div className={`bg-[var(--t-surface)] rounded-2xl border transition-all duration-300 overflow-hidden ${isInProgress ? 'border-[var(--t-primary)]/30 shadow-md ring-1 ring-[var(--t-primary)]/10' : 'border-[var(--t-border)] hover:border-[var(--t-border2)] shadow-sm'}`}>

                                                <div
                                                    className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none"
                                                    onClick={() => togglePhase(phase.id)}
                                                >
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-3 mb-1">
                                                            <h3 className={`font-black text-lg tracking-tight ${isInProgress ? 'text-[var(--t-primary)]' : 'text-[var(--t-text)]'}`}>
                                                                {phase.name}
                                                            </h3>
                                                            {isInProgress && (
                                                                <span className="animate-pulse px-2 py-0.5 rounded-full bg-[var(--t-nav-active-bg)] text-[var(--t-primary)] text-[10px] font-bold uppercase tracking-wide">Active Phase</span>
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-[var(--t-text2)] font-medium line-clamp-2 leading-relaxed max-w-2xl">{phase.description}</p>

                                                        {/* Detailed Meta-Data Subtitle */}
                                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-[10px] font-black uppercase tracking-[0.12em]">
                                                            <div className="flex items-center gap-2 text-[var(--t-primary2)] bg-[var(--t-primary2)]/5 px-2.5 py-1 rounded-md border border-[var(--t-primary2)]/10 shadow-sm">
                                                                <span className="text-[12px] leading-none">💰</span>
                                                                <span className="opacity-60 mr-0.5">Budget:</span>
                                                                {formatCurrency(phase.estimated_budget)}
                                                            </div>
                                                            <div className="flex items-center gap-2 text-[var(--t-nav-active-text)] bg-[var(--t-nav-active-bg)] px-2.5 py-1 rounded-md border border-[var(--t-border)] shadow-sm">
                                                                <span className="text-[12px] leading-none">📋</span>
                                                                <span className="opacity-60 mr-0.5">Scope:</span>
                                                                {phaseTasks.length} {phaseTasks.length === 1 ? 'Task' : 'Tasks'}
                                                            </div>
                                                            {(phase.start_date || phase.end_date) && (
                                                                <div className="flex items-center gap-2 text-[var(--t-text2)] bg-[var(--t-surface2)]/50 px-2.5 py-1 rounded-md border border-[var(--t-border)] shadow-sm">
                                                                    <span className="text-[12px] leading-none">📅</span>
                                                                    <span className="opacity-60 mr-0.5">Timeline:</span>
                                                                    <span className="tracking-normal font-bold">
                                                                        {phase.start_date ? new Date(phase.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '...'}
                                                                        <span className="mx-1.5 opacity-40">→</span>
                                                                        {phase.end_date ? new Date(phase.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '...'}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Progress Bar */}
                                                        <div className="mt-4 flex items-center gap-3 w-full max-w-md">
                                                            <div className="flex-1 h-2 bg-[var(--t-surface3)] rounded-full overflow-hidden">
                                                                <div
                                                                    className={`h-full rounded-full transition-all duration-1000 ease-out ${isCompleted ? 'bg-[var(--t-primary2)]' : isInProgress ? 'bg-[var(--t-primary)]' : 'bg-[var(--t-border)]'}`}
                                                                    style={{ width: `${isCompleted ? 100 : progress}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-[10px] font-bold text-[var(--t-text3)] uppercase">
                                                                {isCompleted ? '100%' : `${progress}%`}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-col items-end gap-3" onClick={(e) => e.stopPropagation()}>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setDetailPhase(phase);
                                                                }}
                                                                className="p-2 rounded-lg text-[var(--t-text3)] hover:bg-[var(--t-surface3)] hover:text-[var(--t-primary)] transition-all"
                                                                title="Manage Phase Details (Mockups, Photos, Docs)"
                                                            >
                                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                            </button>
                                                            <select
                                                                value={phase.status}
                                                                onChange={(e) => handleStatusChange(phase.id, e.target.value)}
                                                                className={`text-[10px] font-bold uppercase tracking-wide border-0 rounded-lg py-1.5 px-3 cursor-pointer outline-none focus:ring-2 focus:ring-offset-1 ${isCompleted ? 'bg-[var(--t-primary2)]/10 text-[var(--t-primary2)] focus:ring-[var(--t-primary2)]' :
                                                                    isInProgress ? 'bg-[var(--t-nav-active-bg)] text-[var(--t-nav-active-text)] focus:ring-[var(--t-primary)]' :
                                                                        'bg-[var(--t-surface3)] text-[var(--t-text2)] focus:ring-[var(--t-border2)]'
                                                                    }`}
                                                            >
                                                                <option value="NOT_STARTED">To Do</option>
                                                                <option value="IN_PROGRESS">In Progress</option>
                                                                <option value="COMPLETED">Done</option>
                                                            </select>
                                                        </div>

                                                        {/* Image Previews - Tiny Row */}
                                                        <div className="flex -space-x-2 overflow-hidden py-1">
                                                            {phase.completion_photo && (
                                                                <img
                                                                    src={getMediaUrl(phase.completion_photo)}
                                                                    alt="Completion"
                                                                    className="inline-block h-8 w-8 rounded-full ring-2 ring-[var(--t-surface)] object-cover cursor-pointer hover:scale-110 transition-transform"
                                                                    title="Completion Photo"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setDetailPhase(phase);
                                                                    }}
                                                                />
                                                            )}
                                                            {phase.naksa_file && (
                                                                <div className="inline-block h-8 w-8 rounded-full ring-2 ring-[var(--t-surface)] bg-[var(--t-primary)]/10 flex items-center justify-center text-[8px] font-bold text-[var(--t-primary)] cursor-pointer" title="Blueprint">BP</div>
                                                            )}
                                                        </div>

                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => openAddTaskModal(phase)}
                                                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--t-surface2)] text-[var(--t-text3)] hover:bg-[var(--t-nav-active-bg)] hover:text-[var(--t-primary)] transition-all font-bold text-lg"
                                                                title="Add Task"
                                                            >
                                                                +
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Expanded Tasks */}
                                                {expandedPhases.has(phase.id) && (
                                                    <div className="border-t border-[var(--t-border)] bg-[var(--t-surface2)]/30 p-5 animate-slideDown">
                                                        <div className="grid grid-cols-1 gap-2">
                                                            {phaseTasks.map(task => (
                                                                <div key={task.id} 
                                                                     onClick={() => setPreviewTask(task)}
                                                                     className="bg-[var(--t-surface)] p-3 rounded-xl border border-[var(--t-border)] flex items-center justify-between group hover:border-[var(--t-primary)]/40 hover:shadow-md transition-all shadow-sm cursor-pointer">
                                                                    <div className="flex items-center gap-3">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={task.status === 'COMPLETED'}
                                                                            onChange={(e) => { e.stopPropagation(); handleTaskToggle(task); }}
                                                                            className="w-4 h-4 rounded border-[var(--t-border2)] text-[var(--t-primary)] focus:ring-[var(--t-primary)] cursor-pointer"
                                                                        />
                                                                        <div className="flex flex-col">
                                                                            <span className={`text-sm font-semibold transition-colors ${task.status === 'COMPLETED' ? 'text-[var(--t-text3)] line-through' : 'text-[var(--t-text)]'}`}>
                                                                                {task.title}
                                                                            </span>
                                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                                <span className={`text-[8px] font-black uppercase tracking-widest px-1 rounded-[2px] ${
                                                                                    task.priority === 'CRITICAL' ? 'bg-red-500/10 text-red-500' :
                                                                                    task.priority === 'HIGH' ? 'bg-orange-500/10 text-orange-500' :
                                                                                    'bg-[var(--t-primary)]/10 text-[var(--t-primary)]'
                                                                                }`}>
                                                                                    {task.priority || 'MEDIUM'}
                                                                                </span>
                                                                                {task.due_date && (
                                                                                    <span className="text-[9px] text-[var(--t-text3)] font-bold uppercase">
                                                                                        Due: {new Date(task.due_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-3">
                                                                        {task.media?.length > 0 && (
                                                                            <span className="text-[10px] text-[var(--t-text3)] opacity-40 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                                                                📸 {task.media.length}
                                                                            </span>
                                                                        )}
                                                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }} className="text-[var(--t-text3)] hover:text-[var(--t-danger)] opacity-0 group-hover:opacity-100 transition-opacity px-2 text-lg">×</button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                            <button
                                                                onClick={() => openAddTaskModal(phase)}
                                                                className="p-3 border-2 border-dashed border-[var(--t-border)] rounded-xl text-[var(--t-text3)] hover:text-[var(--t-primary)] hover:border-[var(--t-primary)] hover:bg-[var(--t-primary)]/5 transition-all text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2"
                                                            >
                                                                + Add New Task
                                                            </button>
                                                        </div>
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
                        <div className="bg-[var(--t-surface)] rounded-2xl shadow-sm border border-[var(--t-border)] p-6">
                            <h2 className="text-xs font-black text-[var(--t-text3)] uppercase tracking-[0.2em] mb-4">Quick Actions</h2>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                {
                                    title: 'New Expense',
                                    icon: '💸',
                                    color: 'bg-[var(--t-danger)]/5 text-[var(--t-danger)] border-[var(--t-danger)]/10 hover:bg-[var(--t-danger)]/10'
                                },
                                {
                                    title: 'Add Material',
                                    icon: '📦',
                                    color: 'bg-[var(--t-primary2)]/5 text-[var(--t-primary2)] border-[var(--t-primary2)]/10 hover:bg-[var(--t-primary2)]/10'
                                },
                                {
                                    title: 'Upload Photo',
                                    icon: '📷',
                                    color: 'bg-[var(--t-primary)]/5 text-[var(--t-primary)] border-[var(--t-primary)]/10 hover:bg-[var(--t-primary)]/10'
                                },
                                {
                                    title: 'Create Task',
                                    icon: '📋',
                                    color: 'bg-indigo-500/5 text-indigo-500 border-indigo-500/10 hover:bg-indigo-500/10'
                                },
                                ].map((a, i) => (
                                    <button key={i} className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all group ${a.color}`}>
                                        <span className="text-2xl group-hover:scale-110 transition-transform">{a.icon}</span>
                                        <span className="text-[10px] font-black tracking-wider uppercase text-center">{a.title}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Log Stream Card */}
                        <div className="bg-[var(--t-surface)] rounded-2xl shadow-sm border border-[var(--t-border)] flex flex-col h-[500px]">
                            <div className="px-6 py-4 border-b border-[var(--t-border)]">
                                <h2 className="text-xs font-black text-[var(--t-text3)] uppercase tracking-[0.2em]">Activity Log</h2>
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
                        <div className="bg-[var(--t-surface)] rounded-2xl shadow-sm border border-[var(--t-border)] flex flex-col overflow-hidden">
                            <div className="px-6 py-4 border-b border-[var(--t-border)] bg-[var(--t-primary)]/5 flex items-center justify-between">
                                <h2 className="text-xs font-black text-[var(--t-primary)] uppercase tracking-[0.2em]">प्रयोगकर्ता निर्देशिका (User Guide)</h2>
                                <span className="text-[10px] font-black text-[var(--t-primary)] uppercase bg-[var(--t-primary)]/10 px-2 py-0.5 rounded-full">Dashboard Help</span>
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
