import React, { useState } from 'react';
import Modal from '../common/Modal';
import PhaseDetailModal from './manage/PhaseDetailModal';
import { constructionService, permitService } from '../../services/api';
import { useConstruction } from '../../context/ConstructionContext';

const DesktopHome = () => {
    const { dashboardData, stats, budgetStats, recentActivities, formatCurrency, refreshData, updatePhase } = useConstruction();

    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [selectedPhase, setSelectedPhase] = useState(null);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [loading, setLoading] = useState(false);

    // Permit State
    const [isPermitModalOpen, setIsPermitModalOpen] = useState(false);
    const [newPermitTitle, setNewPermitTitle] = useState('');
    const [showPermits, setShowPermits] = useState(false);

    // Phase Detail State
    const [detailPhase, setDetailPhase] = useState(null);

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

    const handleDeleteTask = async (taskId) => {
        if (!window.confirm("Are you sure you want to delete this task?")) return;
        try {
            await constructionService.deleteTask(taskId);
            refreshData();
        } catch (error) {
            console.error("Failed to delete task", error);
        }
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

    const handleDeletePermitStep = async (stepId) => {
        if (!window.confirm("Are you sure you want to delete this permit step?")) return;
        try {
            await permitService.deleteStep(stepId);
            refreshData();
        } catch (error) {
            console.error("Failed to delete permit step", error);
        }
    };

    return (
        <div className="space-y-6 overflow-x-hidden">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.filter(s => s.title !== 'Master Budget').map((stat, index) => (
                    <div key={index} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{stat.title}</p>
                                <h3 className="text-xl font-black text-gray-900 leading-none">
                                    {stat.title.toLowerCase().includes('count') ? stat.value : `Rs. ${stat.value}`}
                                </h3>
                                <div className={`inline-flex items-center mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter ${stat.trend === 'up' ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-600'}`}>
                                    <span>{stat.change}</span>
                                </div>
                            </div>
                            <div className="p-3 bg-indigo-50 rounded-xl text-2xl text-indigo-600">
                                {stat.icon}
                            </div>
                        </div>
                    </div>
                ))}
                {/* Special Master Budget Card */}
                {stats.find(s => s.title === 'Master Budget') && (
                    <div className="bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-100 p-6 relative overflow-hidden group">
                        <div className="absolute -right-4 -bottom-4 text-8xl opacity-10 rotate-12 transition-transform group-hover:scale-110">🏗️</div>
                        <p className="text-[10px] font-black text-indigo-100 uppercase tracking-widest mb-1">Master Budget</p>
                        <h3 className="text-xl font-black text-white leading-none">
                            Rs. {stats.find(s => s.title === 'Master Budget').value}
                        </h3>
                        <div className="mt-3 flex items-center gap-2">
                            <div className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
                                <div className="h-full bg-white rounded-full" style={{ width: `${budgetStats.budgetPercent}%` }} />
                            </div>
                            <span className="text-[10px] font-black text-white">{budgetStats.budgetPercent}%</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Action Required Section */}
            {(budgetStats.lowStockItems?.length > 0 || budgetStats.projectHealth?.status === 'OVER_ALLOCATED') && (
                <div className="bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden animate-fadeIn">
                    <div className="bg-red-50/50 px-6 py-3 border-b border-red-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-xl">⚠️</span>
                            <h2 className="text-sm font-black text-red-900 uppercase tracking-widest">Action Required</h2>
                        </div>
                        <span className="text-[10px] font-bold text-red-500 bg-red-100 px-2 py-0.5 rounded-full uppercase">Professional Audit Alert</span>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Low Stock Items */}
                        {budgetStats.lowStockItems?.length > 0 && (
                            <div className="space-y-3">
                                <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Critical Inventory Level</h3>
                                <div className="space-y-2">
                                    {budgetStats.lowStockItems.slice(0, 3).map(item => (
                                        <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black text-gray-900">{item.name}</span>
                                                <span className="text-[10px] text-red-600 font-bold uppercase tracking-tight">Stock: {item.current_stock} {item.unit} (Min: {item.min_stock_level})</span>
                                            </div>
                                            <button className="text-[10px] font-black text-indigo-600 bg-white border border-indigo-100 px-3 py-1 rounded-lg shadow-sm hover:bg-indigo-50">Buy Now</button>
                                        </div>
                                    ))}
                                    {budgetStats.lowStockItems.length > 3 && (
                                        <p className="text-[10px] text-gray-400 italic pl-1">+ {budgetStats.lowStockItems.length - 3} more items need attention</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Budget Validation */}
                        {budgetStats.projectHealth?.status === 'OVER_ALLOCATED' && (
                            <div className="space-y-3">
                                <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Budget Integrity Warning</h3>
                                <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 flex items-start gap-3">
                                    <div className="text-2xl">💰</div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-black text-orange-900">Allocation Overflow</span>
                                        <p className="text-xs text-orange-800 mt-0.5 leading-relaxed">
                                            Category allocations exceed your master budget by <span className="font-black">Rs. {formatCurrency(budgetStats.projectHealth.excess)}</span>. Check the Expenses tab to rebalance.
                                        </p>
                                        <div className="h-1.5 w-full bg-orange-200/50 rounded-full mt-3 overflow-hidden">
                                            <div className="h-full bg-orange-500 rounded-full" style={{ width: '100%' }}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Construction Journey */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-[12px] font-black text-gray-400 uppercase tracking-[0.2em]">Construction Journey</h2>
                                <h1 className="text-lg font-black text-gray-900">Project Timeline & Phases</h1>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={expandAll}
                                    className="text-[9px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-1 rounded-md transition-colors"
                                >
                                    Expand All
                                </button>
                                <button
                                    onClick={collapseAll}
                                    className="text-[9px] font-black uppercase tracking-widest text-gray-500 hover:text-gray-700 bg-gray-50 px-2 py-1 rounded-md transition-colors"
                                >
                                    Collapse All
                                </button>
                                <button
                                    onClick={focusActive}
                                    className="text-[9px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-1 rounded-md transition-colors border border-indigo-100 shadow-sm"
                                    title="Collapse all except in-progress phases"
                                >
                                    Focus Running
                                </button>
                            </div>
                        </div>
                        {/* Advanced Construction Timeline */}
                        <div className="relative pl-4 space-y-12">
                            {/* Vertical Progress Line (Background) */}
                            <div className="absolute left-8 top-6 bottom-6 w-[3px] bg-gray-50 rounded-full -translate-x-1/2 ml-0"></div>

                            {/* PHASE 0: Municipal Permits */}
                            <div className="relative group">
                                {/* Phase Connector Node (0) */}
                                {(() => {
                                    const permits = dashboardData.permits || [];
                                    const allApproved = permits.length > 0 && permits.every(p => p.status === 'APPROVED');
                                    const anyInProgress = permits.some(p => p.status === 'APPROVED' || p.status === 'IN_PROGRESS');

                                    const isPermitCompleted = allApproved;
                                    const isPermitInProgress = !allApproved && anyInProgress;

                                    return (
                                        <div className={`absolute top-0 left-0 -ml-1.5 mt-6 w-11 h-11 rounded-full border-4 flex items-center justify-center font-black text-sm z-10 transition-all duration-500 ${isPermitCompleted ? 'bg-green-500 border-green-50 text-white shadow-[0_0_15px_rgba(34,197,94,0.3)] ring-4 ring-green-50' :
                                            isPermitInProgress ? 'bg-blue-600 border-blue-50 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] scale-110 animate-pulse ring-4 ring-blue-50' :
                                                'bg-white border-gray-100 text-gray-400 shadow-sm'
                                            }`}>
                                            {isPermitCompleted ? '✓' : '0'}
                                        </div>
                                    );
                                })()}

                                <div className="ml-16 bg-blue-50/50 border border-blue-100 rounded-2xl p-4 transition-all duration-300 hover:shadow-md hover:border-blue-200 overflow-hidden">
                                    <div className="flex justify-between items-center mb-2">
                                        <div
                                            className="flex items-center gap-3 cursor-pointer select-none"
                                            onClick={() => setShowPermits(!showPermits)}
                                        >
                                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-xl shadow-sm border border-blue-50">
                                                📜
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-black text-blue-900 tracking-tight uppercase text-xs">Municipal Permits & Approvals</h3>
                                                    <span className={`text-[10px] text-blue-400 transition-transform duration-200 ${showPermits ? 'rotate-180' : ''}`}>
                                                        ▼
                                                    </span>
                                                </div>
                                                <p className="text-[10px] text-blue-700 font-bold uppercase tracking-tighter mt-0.5">Nagar Palika Naksha Pass Process</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {showPermits && (
                                                <>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setIsPermitModalOpen(true); }}
                                                        className="text-[9px] font-black uppercase tracking-widest text-blue-600 bg-white border border-blue-100 px-2 py-1 rounded-md hover:bg-blue-50 transition-colors shadow-sm"
                                                    >
                                                        + Add Step
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {showPermits && (
                                        <div className="space-y-3 mt-4 animate-fadeIn">
                                            {dashboardData.permits?.map((step) => {
                                                const isApproved = step.status === 'APPROVED';
                                                const isInProgress = step.status === 'IN_PROGRESS';

                                                return (
                                                    <div key={step.id} className="group bg-white rounded-xl p-3 border border-blue-100 shadow-sm flex items-center justify-between transition-all hover:border-blue-300">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] ${isApproved ? 'bg-green-100 text-green-600' :
                                                                isInProgress ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'
                                                                }`}>
                                                                {step.order}
                                                            </div>
                                                            <div>
                                                                <p className={`font-black text-sm tracking-tight ${isApproved ? 'text-green-800' : 'text-gray-900'}`}>{step.title}</p>
                                                                <p className="text-[10px] text-gray-400 font-medium italic">{step.description}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <select
                                                                value={step.status}
                                                                onChange={(e) => handlePermitStatusChange(step.id, e.target.value)}
                                                                className="text-[10px] font-black uppercase tracking-tighter border-gray-100 rounded-lg focus:ring-blue-500 focus:border-blue-500 py-1 pl-2 pr-6 bg-gray-50 outline-none"
                                                            >
                                                                <option value="PENDING">Pending</option>
                                                                <option value="IN_PROGRESS">In Progress</option>
                                                                <option value="APPROVED">Approved</option>
                                                                <option value="REJECTED">Rejected</option>
                                                            </select>
                                                            <button
                                                                onClick={() => handleDeletePermitStep(step.id)}
                                                                className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity px-2 text-xl font-light"
                                                                title="Delete Step"
                                                            >
                                                                ×
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {dashboardData.phases.map((phase) => {
                                const phaseTasks = dashboardData.tasks.filter(t => t.phase === phase.id);
                                const completedTasks = phaseTasks.filter(t => t.status === 'COMPLETED').length;
                                const totalTasks = phaseTasks.length;
                                const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

                                const isCompleted = phase.status === 'COMPLETED';
                                const isInProgress = phase.status === 'IN_PROGRESS';

                                return (
                                    <div key={phase.id} className="relative group">
                                        {/* Connection Line Segment (to previous) */}
                                        <div className={`absolute left-8 -top-12 h-12 w-[3px] -translate-x-1/2 transition-all duration-1000 ${phase.status !== 'NOT_STARTED' ? 'bg-gradient-to-b from-indigo-500 to-indigo-600 shadow-[0_0_10px_rgba(99,102,241,0.3)]' : 'bg-gray-50'}`}></div>

                                        {/* Phase Connector Node */}
                                        <div className={`absolute top-0 left-0 -ml-1.5 mt-6 w-11 h-11 rounded-full border-4 flex items-center justify-center font-black text-sm z-10 transition-all duration-500 ${isCompleted ? 'bg-green-500 border-green-50 text-white shadow-[0_0_15px_rgba(34,197,94,0.3)] ring-4 ring-green-50' :
                                            isInProgress ? 'bg-indigo-600 border-indigo-50 text-white shadow-[0_0_20px_rgba(79,70,229,0.4)] scale-110 animate-pulse ring-4 ring-indigo-50' :
                                                'bg-white border-gray-100 text-gray-400 shadow-sm'
                                            }`}>
                                            {isCompleted ? '✓' : phase.order}
                                        </div>

                                        {/* Phase Content Layout */}
                                        <div className="ml-16 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group-hover:border-indigo-100">
                                            {/* Header Section */}
                                            <div
                                                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none"
                                                onClick={() => togglePhase(phase.id)}
                                            >
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-1">
                                                        <div className="flex items-center gap-2">
                                                            <h3 className={`font-black text-lg tracking-tight ${isInProgress ? 'text-indigo-900' : 'text-gray-900'}`}>
                                                                {phase.name}
                                                            </h3>
                                                            <span className={`text-[10px] text-gray-400 transition-transform duration-300 ${expandedPhases.has(phase.id) ? 'rotate-180' : ''}`}>
                                                                ▼
                                                            </span>
                                                        </div>
                                                        {isInProgress && (
                                                            <span className="animate-pulse w-2 h-2 bg-indigo-500 rounded-full"></span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-gray-500 leading-relaxed max-w-2xl font-medium">{phase.description}</p>

                                                    {/* Progress Bar */}
                                                    <div className="mt-4 flex items-center gap-3 w-full max-w-md">
                                                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                                                            <div
                                                                className={`h-full rounded-full transition-all duration-1000 ease-out ${isCompleted ? 'bg-green-500' :
                                                                    isInProgress ? 'bg-indigo-500' : 'bg-gray-300'
                                                                    }`}
                                                                style={{ width: `${isCompleted ? 100 : progress}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                                                            {isCompleted ? '100% Done' : `${progress}% Complete`}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col items-end gap-3 min-w-[140px]" onClick={(e) => e.stopPropagation()}>
                                                    <select
                                                        value={phase.status}
                                                        onChange={(e) => handleStatusChange(phase.id, e.target.value)}
                                                        className={`text-[10px] font-black uppercase tracking-widest border-0 rounded-xl py-1.5 px-3 cursor-pointer transition-colors shadow-sm outline-none ${isCompleted ? 'bg-green-50 text-green-700 hover:bg-green-100' :
                                                            isInProgress ? 'bg-indigo-600 text-white hover:bg-indigo-700' :
                                                                'bg-gray-50 text-gray-600 hover:bg-gray-100'
                                                            }`}
                                                    >
                                                        <option value="NOT_STARTED">Pending</option>
                                                        <option value="IN_PROGRESS">In Progress</option>
                                                        <option value="COMPLETED">Completed</option>
                                                    </select>

                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() => openAddTaskModal(phase)}
                                                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-50 hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 transition-colors text-lg font-black"
                                                        >
                                                            +
                                                        </button>
                                                        <button
                                                            onClick={() => setDetailPhase(phase)}
                                                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 font-black text-[10px] tracking-widest uppercase transition-colors"
                                                        >
                                                            Manage
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Sub-Phases Grid */}
                                            {expandedPhases.has(phase.id) && (
                                                <div className="px-5 pb-5 bg-gray-50/30 border-t border-gray-50 animate-slideDown">
                                                    <div className="pt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                        {phaseTasks.map(task => (
                                                            <div key={task.id} className="bg-white p-3 rounded-xl border border-gray-100 flex items-center justify-between group/task hover:border-indigo-200 transition-all">
                                                                <div className="flex items-center gap-3">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={task.status === 'COMPLETED'}
                                                                        onChange={() => handleTaskToggle(task)}
                                                                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                                    />
                                                                    <span className={`text-xs font-bold tracking-tight ${task.status === 'COMPLETED' ? 'text-gray-300 line-through' : 'text-gray-700'}`}>
                                                                        {task.title}
                                                                    </span>
                                                                </div>
                                                                <button onClick={() => handleDeleteTask(task.id)} className="text-gray-200 hover:text-red-400 font-light opacity-0 group-hover/task:opacity-100 transition-opacity">×</button>
                                                            </div>
                                                        ))}
                                                        <button
                                                            onClick={() => openAddTaskModal(phase)}
                                                            className="p-3 border-2 border-dashed border-gray-100 rounded-xl text-gray-400 hover:text-indigo-500 hover:border-indigo-100 hover:bg-indigo-50/30 transition-all flex items-center justify-center gap-2"
                                                        >
                                                            <span className="text-xs font-black uppercase tracking-widest">+ New Item</span>
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
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <h2 className="text-[12px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Quick Post</h2>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { title: 'EXPENSE', icon: '💸', color: 'bg-red-50 text-red-600 border-red-100' },
                                { title: 'MATERIAL', icon: '📦', color: 'bg-green-50 text-green-600 border-green-100' },
                                { title: 'PHOTO', icon: '📷', color: 'bg-blue-50 text-blue-600 border-blue-100' },
                                { title: 'TASK', icon: '📋', color: 'bg-purple-50 text-purple-600 border-purple-100' },
                            ].map((a, i) => (
                                <button key={i} className={`p-4 rounded-2xl border flex flex-col items-center justify-center gap-2 hover:shadow-md transition-all ${a.color}`}>
                                    <span className="text-2xl">{a.icon}</span>
                                    <span className="text-[9px] font-black tracking-widest uppercase">{a.title}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <h2 className="text-[12px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Log Stream</h2>
                        <div className="space-y-4">
                            {recentActivities.map((activity) => (
                                <div key={activity.id} className="flex gap-4 items-start group">
                                    <div className="w-8 h-8 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-lg flex-shrink-0 group-hover:bg-indigo-50 group-hover:border-indigo-100 transition-colors">
                                        {activity.icon}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold text-gray-900 leading-tight">{activity.message}</p>
                                        <p className="text-[10px] text-gray-400 font-medium italic mt-1">{activity.time}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <Modal isOpen={isTaskModalOpen} onClose={() => setIsTaskModalOpen(false)} title={`Add Sub-Phase to ${selectedPhase?.name}`}>
                <form onSubmit={handleAddTask} className="space-y-4">
                    <input
                        type="text"
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        placeholder="e.g. Ground Floor Slab Casting"
                        className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none font-bold"
                        autoFocus
                    />
                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={() => setIsTaskModalOpen(false)} className="px-6 py-2.5 text-xs font-black text-gray-400 uppercase tracking-widest">Cancel</button>
                        <button type="submit" disabled={loading || !newTaskTitle.trim()} className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-100">
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
                        className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-blue-500 p-3 border outline-none font-bold"
                        autoFocus
                    />
                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={() => setIsPermitModalOpen(false)} className="px-6 py-2.5 text-xs font-black text-gray-400 uppercase tracking-widest">Cancel</button>
                        <button type="submit" disabled={loading || !newPermitTitle.trim()} className="px-8 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-100">
                            Create Step
                        </button>
                    </div>
                </form>
            </Modal>

            <PhaseDetailModal
                isOpen={!!detailPhase}
                onClose={() => setDetailPhase(null)}
                phase={detailPhase ? dashboardData.phases.find(p => p.id === detailPhase.id) : null}
                tasks={detailPhase ? dashboardData.tasks.filter(t => t.phase === detailPhase.id) : []}
                onRefresh={refreshData}
            />
        </div >
    );
};

export default DesktopHome;
