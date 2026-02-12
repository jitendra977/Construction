import React, { useState } from 'react';
import Modal from '../common/Modal';
import PhaseDetailModal from './manage/PhaseDetailModal';
import { constructionService, permitService, getMediaUrl } from '../../services/api';
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
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 font-sans">
            {/* Header Section with Stats */}
            <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 shadow-xl pb-12 pt-8 px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                                <span className="text-4xl">🏗️</span>
                                Project Dashboard
                            </h1>
                            <p className="text-emerald-100 mt-2 text-lg">
                                Dream Home Construction - Overview & Progress
                            </p>
                        </div>
                        <div className="hidden md:flex items-center gap-3 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/20">
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                            </span>
                            <span className="text-white font-semibold">Live Project Status</span>
                        </div>
                    </div>

                    {/* Stats Grid inside Header */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {stats.filter(s => s.title !== 'Master Budget').map((stat, index) => (
                            <div key={index} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:bg-white/20 transition-colors">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="text-emerald-100 text-xs font-bold uppercase tracking-wide opacity-80">{stat.title}</div>
                                        <div className="text-2xl font-bold text-white mt-1 leading-none">
                                            {stat.title.toLowerCase().includes('count') ? stat.value : `Rs. ${stat.value}`}
                                        </div>
                                    </div>
                                    <div className="text-2xl opacity-80">{stat.icon}</div>
                                </div>
                                <div className={`inline-flex items-center mt-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${stat.trend === 'up' ? 'bg-emerald-400/20 text-emerald-100' : 'bg-white/10 text-white/70'}`}>
                                    {stat.change}
                                </div>
                            </div>
                        ))}
                        {/* Master Budget Card */}
                        {stats.find(s => s.title === 'Master Budget') && (
                            <div className="bg-gradient-to-br from-indigo-500/80 to-purple-600/80 backdrop-blur-sm rounded-xl p-4 border border-white/20 relative overflow-hidden group">
                                <div className="absolute -right-4 -bottom-4 text-6xl opacity-20 rotate-12 transition-transform group-hover:scale-110">💰</div>
                                <div className="text-indigo-100 text-xs font-bold uppercase tracking-wide opacity-90">Master Budget</div>
                                <div className="text-2xl font-bold text-white mt-1 leading-none">
                                    Rs. {stats.find(s => s.title === 'Master Budget').value}
                                </div>
                                <div className="mt-3 flex items-center gap-2">
                                    <div className="h-1.5 flex-1 bg-black/20 rounded-full overflow-hidden">
                                        <div className="h-full bg-emerald-400 rounded-full shadow-[0_0_10px_rgba(52,211,153,0.5)]" style={{ width: `${budgetStats.budgetPercent}%` }} />
                                    </div>
                                    <span className="text-[10px] font-bold text-white">{budgetStats.budgetPercent}% Used</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content Area - Overlapping the Header slightly for modern look */}
            <div className="max-w-7xl mx-auto px-6 -mt-6 pb-12 relative z-10">
                {/* Action Required Section */}
                {(budgetStats.lowStockItems?.length > 0 || budgetStats.projectHealth?.status === 'OVER_ALLOCATED') && (
                    <div className="bg-white rounded-2xl border border-red-100 shadow-lg mb-8 overflow-hidden animate-fadeIn">
                        <div className="bg-gradient-to-r from-red-50 to-white px-6 py-3 border-b border-red-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-xl">⚠️</span>
                                <h2 className="text-sm font-black text-red-900 uppercase tracking-widest">Action Required (तत्काल ध्यान दिनुहोस्)</h2>
                            </div>
                            <span className="text-[10px] font-bold text-red-600 bg-red-100 px-3 py-1 rounded-full uppercase tracking-wide">High Priority</span>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Low Stock Items */}
                            {budgetStats.lowStockItems?.length > 0 && (
                                <div className="space-y-4">
                                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                        Critical Inventory Level
                                    </h3>
                                    <div className="space-y-2">
                                        {budgetStats.lowStockItems.slice(0, 3).map(item => (
                                            <div key={item.id} className="flex items-center justify-between p-3 bg-red-50/30 rounded-xl border border-red-100 hover:border-red-200 transition-colors">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-gray-900">{item.name}</span>
                                                    <span className="text-[10px] text-red-600 font-bold uppercase tracking-tight">Stock: {item.current_stock} {item.unit} (Min: {item.min_stock_level})</span>
                                                </div>
                                                <button className="text-[10px] font-bold text-red-600 bg-white border border-red-100 px-3 py-1.5 rounded-lg shadow-sm hover:bg-red-50 hover:text-red-700 transition-colors">Order Now</button>
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
                                <div className="space-y-4">
                                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                                        Budget Warning
                                    </h3>
                                    <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 flex items-start gap-4">
                                        <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-xl flex-shrink-0">💰</div>
                                        <div className="flex flex-col flex-1">
                                            <span className="text-sm font-bold text-orange-900">Allocation Overflow</span>
                                            <p className="text-xs text-orange-800 mt-1 leading-relaxed">
                                                Category allocation exceeds master budget by <span className="font-bold">{formatCurrency(budgetStats.projectHealth.excess)}</span>. Check the "Expenses" tab to rebalance.
                                            </p>
                                            <div className="h-1.5 w-full bg-orange-200/50 rounded-full mt-3 overflow-hidden">
                                                <div className="h-full bg-orange-500 rounded-full animate-pulse" style={{ width: '100%' }}></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Construction Journey */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <div>
                                    <h2 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Construction Journey</h2>
                                    <h1 className="text-xl font-black text-gray-900 mt-1">Timeline & Phases</h1>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={expandAll}
                                        className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors"
                                    >
                                        Expand All
                                    </button>
                                    <button
                                        onClick={collapseAll}
                                        className="text-[10px] font-bold uppercase tracking-wider text-gray-500 hover:text-gray-700 bg-gray-100 px-3 py-1.5 rounded-lg transition-colors"
                                    >
                                        Collapse All
                                    </button>
                                </div>
                            </div>

                            <div className="p-6 relative pl-4 space-y-12 bg-white">
                                {/* Vertical Progress Line */}
                                <div className="absolute left-10 top-6 bottom-6 w-[2px] bg-gray-100 rounded-full -translate-x-1/2"></div>
                                {/* Phases Rendering */}
                                {dashboardData.phases.map((phase) => {
                                    const phaseTasks = dashboardData.tasks.filter(t => t.phase === phase.id);
                                    const completedTasks = phaseTasks.filter(t => t.status === 'COMPLETED').length;
                                    const totalTasks = phaseTasks.length;
                                    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
                                    const isCompleted = phase.status === 'COMPLETED';
                                    const isInProgress = phase.status === 'IN_PROGRESS';

                                    return (
                                        <div key={phase.id} className="relative group pl-12">
                                            {/* Phase Connector Node */}
                                            <div className={`absolute top-0 left-6 -ml-3 mt-6 w-10 h-10 rounded-full border-4 flex items-center justify-center font-black text-xs z-10 transition-all duration-500 bg-white ${isCompleted ? 'border-green-500 text-green-600 shadow-lg shadow-green-100' :
                                                isInProgress ? 'border-indigo-600 text-indigo-600 shadow-lg shadow-indigo-100 scale-110 ring-4 ring-indigo-50' :
                                                    'border-gray-200 text-gray-300'
                                                }`}>
                                                {isCompleted ? '✓' : phase.order}
                                            </div>

                                            {/* Phase Content */}
                                            <div className={`bg-white rounded-2xl border transition-all duration-300 overflow-hidden ${isInProgress ? 'border-indigo-200 shadow-md ring-1 ring-indigo-50' : 'border-gray-200 hover:border-gray-300 shadow-sm'}`}>

                                                <div
                                                    className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none"
                                                    onClick={() => togglePhase(phase.id)}
                                                >
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-3 mb-1">
                                                            <h3 className={`font-black text-lg tracking-tight ${isInProgress ? 'text-indigo-900' : 'text-gray-900'}`}>
                                                                {phase.name}
                                                            </h3>
                                                            {isInProgress && (
                                                                <span className="animate-pulse px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600 text-[10px] font-bold uppercase tracking-wide">Active Phase</span>
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-gray-500 font-medium">{phase.description}</p>

                                                        {/* Progress Bar */}
                                                        <div className="mt-4 flex items-center gap-3 w-full max-w-md">
                                                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                                <div
                                                                    className={`h-full rounded-full transition-all duration-1000 ease-out ${isCompleted ? 'bg-green-500' : isInProgress ? 'bg-indigo-500' : 'bg-gray-300'}`}
                                                                    style={{ width: `${isCompleted ? 100 : progress}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-[10px] font-bold text-gray-400 uppercase">
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
                                                                className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-indigo-600 transition-all"
                                                                title="Manage Phase Details (Mockups, Photos, Docs)"
                                                            >
                                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                            </button>
                                                            <select
                                                                value={phase.status}
                                                                onChange={(e) => handleStatusChange(phase.id, e.target.value)}
                                                                className={`text-[10px] font-bold uppercase tracking-wide border-0 rounded-lg py-1.5 px-3 cursor-pointer outline-none focus:ring-2 focus:ring-offset-1 ${isCompleted ? 'bg-green-50 text-green-700 focus:ring-green-500' :
                                                                    isInProgress ? 'bg-indigo-50 text-indigo-700 focus:ring-indigo-500' :
                                                                        'bg-gray-100 text-gray-600 focus:ring-gray-400'
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
                                                                    className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover cursor-pointer hover:scale-110 transition-transform"
                                                                    title="Completion Photo"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setDetailPhase(phase);
                                                                    }}
                                                                />
                                                            )}
                                                            {phase.naksa_file && (
                                                                <div className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-blue-100 flex items-center justify-center text-[8px] font-bold text-blue-600 cursor-pointer" title="Blueprint">BP</div>
                                                            )}
                                                        </div>

                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => openAddTaskModal(phase)}
                                                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-50 text-gray-400 hover:bg-emerald-50 hover:text-emerald-600 transition-all font-bold text-lg"
                                                                title="Add Task"
                                                            >
                                                                +
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Expanded Tasks */}
                                                {expandedPhases.has(phase.id) && (
                                                    <div className="border-t border-gray-100 bg-gray-50/50 p-5 animate-slideDown">
                                                        <div className="grid grid-cols-1 gap-2">
                                                            {phaseTasks.map(task => (
                                                                <div key={task.id} className="bg-white p-3 rounded-xl border border-gray-100 flex items-center justify-between group hover:border-indigo-200 transition-all shadow-sm">
                                                                    <div className="flex items-center gap-3">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={task.status === 'COMPLETED'}
                                                                            onChange={() => handleTaskToggle(task)}
                                                                            className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                                        />
                                                                        <span className={`text-sm font-medium transition-colors ${task.status === 'COMPLETED' ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                                                                            {task.title}
                                                                        </span>
                                                                    </div>
                                                                    <button onClick={() => handleDeleteTask(task.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity px-2">×</button>
                                                                </div>
                                                            ))}
                                                            <button
                                                                onClick={() => openAddTaskModal(phase)}
                                                                className="p-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2"
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
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <h2 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Quick Actions</h2>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { title: 'New Expense', icon: '💸', color: 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100' },
                                    { title: 'Add Material', icon: '📦', color: 'bg-green-50 text-green-600 border-green-100 hover:bg-green-100' },
                                    { title: 'Upload Photo', icon: '📷', color: 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100' },
                                    { title: 'Create Task', icon: '📋', color: 'bg-purple-50 text-purple-600 border-purple-100 hover:bg-purple-100' },
                                ].map((a, i) => (
                                    <button key={i} className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all group ${a.color}`}>
                                        <span className="text-2xl group-hover:scale-110 transition-transform">{a.icon}</span>
                                        <span className="text-[10px] font-black tracking-wider uppercase text-center">{a.title}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Log Stream Card */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[500px]">
                            <div className="px-6 py-4 border-b border-gray-100">
                                <h2 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Activity Log</h2>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                {recentActivities.map((activity) => (
                                    <div key={activity.id} className="relative pl-6 pb-6 border-l border-gray-100 last:pb-0 last:border-0">
                                        <div className="absolute left-0 top-0 -translate-x-1/2 w-3 h-3 rounded-full bg-white border-2 border-indigo-200"></div>
                                        <div className="flex gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-lg flex-shrink-0 text-gray-400">
                                                {activity.icon}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-800 leading-tight">{activity.message}</p>
                                                <p className="text-xs text-gray-400 font-medium mt-1">{activity.time}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
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
