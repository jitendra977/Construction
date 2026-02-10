import React, { useState } from 'react';
import Modal from '../common/Modal';
import PhaseDetailModal from './manage/PhaseDetailModal';
import { constructionService, permitService } from '../../services/api';
import { useConstruction } from '../../context/ConstructionContext';

const DesktopHome = () => {
    const { dashboardData, stats, recentActivities, formatCurrency, refreshData, updatePhase } = useConstruction();

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
                // Assuming defaults for other fields or backend handles them
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
            // Determine order: last order + 1
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
        <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, index) => (
                    <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500 mb-1">{stat.title}</p>
                                <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
                                <div className={`inline-flex items-center mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium ${stat.trend === 'up' ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-600'}`}>
                                    <span>{stat.change}</span>
                                </div>
                            </div>
                            <div className="p-3 bg-indigo-50 rounded-xl text-2xl text-indigo-600">
                                {stat.icon}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Construction Journey */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Construction Journey</h2>
                                <p className="text-xs text-gray-500">Track and manage your build phases</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={expandAll}
                                    className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-1 rounded transition-colors"
                                >
                                    Expand All
                                </button>
                                <button
                                    onClick={collapseAll}
                                    className="text-[10px] font-bold uppercase tracking-wider text-gray-500 hover:text-gray-700 bg-gray-100 px-2 py-1 rounded transition-colors"
                                >
                                    Collapse All
                                </button>
                                <button
                                    onClick={focusActive}
                                    className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-1 rounded transition-colors"
                                    title="Collapse all except in-progress phases"
                                >
                                    Focus Running
                                </button>
                                <span className="ml-2 text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded border border-gray-100">Manage Mode</span>
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
                                        <div className={`absolute top-0 left-0 -ml-1.5 mt-6 w-11 h-11 rounded-full border-4 flex items-center justify-center font-bold text-sm z-10 transition-all duration-500 ${isPermitCompleted ? 'bg-green-500 border-green-50 text-white shadow-[0_0_15px_rgba(34,197,94,0.3)] ring-4 ring-green-50' :
                                            isPermitInProgress ? 'bg-blue-600 border-blue-50 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] scale-110 animate-pulse ring-4 ring-blue-50' :
                                                'bg-white border-gray-100 text-gray-400 shadow-sm'
                                            }`}>
                                            {isPermitCompleted ? '✓' : '0'}
                                        </div>
                                    );
                                })()}

                                <div className="ml-16 bg-blue-50 border border-blue-100 rounded-2xl p-4 transition-all duration-300 hover:shadow-md hover:border-blue-200 overflow-hidden">
                                    <div className="flex justify-between items-center mb-2">
                                        <div
                                            className="flex items-center gap-3 cursor-pointer select-none"
                                            onClick={() => setShowPermits(!showPermits)}
                                        >
                                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-xl shadow-sm">
                                                📜
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-bold text-blue-900">Municipal Permits (Naksha Pass)</h3>
                                                    <span className={`text-xs text-blue-400 transition-transform duration-200 ${showPermits ? 'rotate-180' : ''}`}>
                                                        ▼
                                                    </span>
                                                </div>
                                                <p className="text-sm text-blue-700">Official Nagar Palika Process</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {showPermits && (
                                                <>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setIsPermitModalOpen(true); }}
                                                        className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
                                                    >
                                                        + Add Step
                                                    </button>
                                                    <button className="text-xs font-semibold text-blue-600 hover:underline" onClick={(e) => { e.stopPropagation(); (document.querySelector('button[key="permits"]') || { click: () => { } }).click(); }}>
                                                        Manage Documents →
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
                                                    <div key={step.id} className="group bg-white rounded-lg p-3 border border-blue-100 shadow-sm flex items-center justify-between transition-all hover:border-blue-300">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${isApproved ? 'bg-green-100 text-green-600' :
                                                                isInProgress ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'
                                                                }`}>
                                                                {step.order}
                                                            </div>
                                                            <div>
                                                                <p className={`font-medium text-sm ${isApproved ? 'text-green-800' : 'text-gray-900'}`}>{step.title}</p>
                                                                <p className="text-xs text-gray-500">{step.description}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <select
                                                                value={step.status}
                                                                onChange={(e) => handlePermitStatusChange(step.id, e.target.value)}
                                                                className="text-xs font-semibold border-gray-200 rounded-md focus:ring-blue-500 focus:border-blue-500 py-1 pl-2 pr-6 bg-gray-50"
                                                            >
                                                                <option value="PENDING">Pending</option>
                                                                <option value="IN_PROGRESS">In Progress</option>
                                                                <option value="APPROVED">Approved</option>
                                                                <option value="REJECTED">Rejected</option>
                                                            </select>
                                                            <button
                                                                onClick={() => handleDeletePermitStep(step.id)}
                                                                className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity px-2"
                                                                title="Delete Step"
                                                            >
                                                                ×
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {(!dashboardData.permits || dashboardData.permits.length === 0) && (
                                                <div className="text-sm text-blue-400 italic text-center py-2">No permit steps found. Click 'Add Step' to create one.</div>
                                            )}
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
                                        <div className={`absolute top-0 left-0 -ml-1.5 mt-6 w-11 h-11 rounded-full border-4 flex items-center justify-center font-bold text-sm z-10 transition-all duration-500 ${isCompleted ? 'bg-green-500 border-green-50 text-white shadow-[0_0_15px_rgba(34,197,94,0.3)] ring-4 ring-green-50' :
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
                                                            <h3 className={`font-bold text-lg ${isInProgress ? 'text-indigo-900' : 'text-gray-900'}`}>
                                                                {phase.name}
                                                            </h3>
                                                            <span className={`text-xs text-gray-400 transition-transform duration-300 ${expandedPhases.has(phase.id) ? 'rotate-180' : ''}`}>
                                                                ▼
                                                            </span>
                                                        </div>
                                                        {isInProgress && (
                                                            <span className="animate-pulse w-2 h-2 bg-indigo-500 rounded-full"></span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-gray-500 leading-relaxed max-w-2xl">{phase.description}</p>


                                                    {/* Phase Dates - Only show if expanded */}
                                                    {expandedPhases.has(phase.id) && (
                                                        <div className="flex flex-wrap gap-4 mt-3 text-xs animate-fadeIn" onClick={(e) => e.stopPropagation()}>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-medium text-gray-600">Start:</span>
                                                                <input
                                                                    type="date"
                                                                    value={phase.start_date || ''}
                                                                    onChange={(e) => {
                                                                        updatePhase(phase.id, { start_date: e.target.value || null })
                                                                            .catch(err => console.error('Failed to update start date', err));
                                                                    }}
                                                                    className="border-gray-200 rounded-lg px-2 py-1 text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                                                />
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-medium text-gray-600">End:</span>
                                                                <input
                                                                    type="date"
                                                                    value={phase.end_date || ''}
                                                                    onChange={(e) => {
                                                                        updatePhase(phase.id, { end_date: e.target.value || null })
                                                                            .catch(err => console.error('Failed to update end date', err));
                                                                    }}
                                                                    className="border-gray-200 rounded-lg px-2 py-1 text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                                                />
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Progress Bar */}
                                                    <div className="mt-4 flex items-center gap-3 w-full max-w-md">
                                                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full transition-all duration-1000 ease-out ${isCompleted ? 'bg-green-500' :
                                                                    isInProgress ? 'bg-indigo-500' : 'bg-gray-300'
                                                                    }`}
                                                                style={{ width: `${isCompleted ? 100 : progress}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-xs font-semibold text-gray-500 whitespace-nowrap">
                                                            {isCompleted ? '100% Done' : `${progress}% Complete`}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Actions & Status */}
                                                <div className="flex flex-col items-end gap-3 min-w-[140px]" onClick={(e) => e.stopPropagation()}>
                                                    <select
                                                        value={phase.status}
                                                        onChange={(e) => handleStatusChange(phase.id, e.target.value)}
                                                        className={`text-xs font-bold uppercase tracking-wide border-0 rounded-lg py-1.5 px-3 cursor-pointer transition-colors ${isCompleted ? 'bg-green-50 text-green-700 hover:bg-green-100' :
                                                            isInProgress ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100' :
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
                                                            title="Add Task"
                                                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 transition-colors"
                                                        >
                                                            +
                                                        </button>
                                                        <button
                                                            onClick={() => setDetailPhase(phase)}
                                                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-indigo-50 text-gray-600 hover:text-indigo-600 font-medium text-xs transition-colors"
                                                        >
                                                            <span>Manage Tasks</span>
                                                            <span className="text-lg leading-none">📋</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Tasks List - Only shown if expanded */}
                                            {expandedPhases.has(phase.id) && (
                                                <div className="bg-gray-50/50 border-t border-gray-100 p-4 animate-slideDown">
                                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                                        Sub-Phases & Tasks
                                                        <span className="bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full text-[10px]">{phaseTasks.length}</span>
                                                    </h4>

                                                    {phaseTasks.length > 0 ? (
                                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                            {phaseTasks.map(task => (
                                                                <div
                                                                    key={task.id}
                                                                    className={`relative group/task flex items-start gap-3 p-3 rounded-xl border transition-all duration-200 ${task.status === 'COMPLETED'
                                                                        ? 'bg-white/50 border-gray-100 hover:border-gray-200'
                                                                        : 'bg-white border-gray-200 hover:border-indigo-300 hover:shadow-sm shadow-[0_1px_2px_rgba(0,0,0,0.02)]'
                                                                        }`}
                                                                >
                                                                    <div className="pt-0.5">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={task.status === 'COMPLETED'}
                                                                            onChange={() => handleTaskToggle(task)}
                                                                            className={`w-4 h-4 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer transition-all ${task.status === 'COMPLETED' ? 'text-green-500 focus:ring-green-500' : 'text-indigo-600'
                                                                                }`}
                                                                        />
                                                                    </div>

                                                                    <div className="flex-1 min-w-0">
                                                                        <p className={`text-sm font-medium transition-colors ${task.status === 'COMPLETED' ? 'text-gray-400 line-through decoration-gray-300' : 'text-gray-700'
                                                                            }`}>
                                                                            {task.title}
                                                                        </p>

                                                                        {/* Media Count Badge */}
                                                                        {task.media && task.media.length > 0 && (
                                                                            <span className="inline-flex items-center gap-1 mt-1 text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-full font-medium">
                                                                                📷 {task.media.length}
                                                                            </span>
                                                                        )}

                                                                        {task.priority && !task.status === 'COMPLETED' && (
                                                                            <span className={`inline-block mt-1 ml-1 text-[10px] px-1.5 py-0.5 rounded font-medium ${task.priority === 'CRITICAL' ? 'bg-red-50 text-red-600' :
                                                                                task.priority === 'HIGH' ? 'bg-orange-50 text-orange-600' :
                                                                                    'bg-blue-50 text-blue-600'
                                                                                }`}>
                                                                                {task.priority}
                                                                            </span>
                                                                        )}
                                                                    </div>

                                                                    <button
                                                                        onClick={() => handleDeleteTask(task.id)}
                                                                        className="absolute top-2 right-2 text-gray-300 hover:text-red-500 opacity-0 group-hover/task:opacity-100 transition-opacity p-1 rounded-full hover:bg-red-50"
                                                                        title="Delete Task"
                                                                    >
                                                                        ×
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div
                                                            onClick={() => openAddTaskModal(phase)}
                                                            className="flex flex-col items-center justify-center py-6 border-2 border-dashed border-gray-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50/10 cursor-pointer transition-all group/empty"
                                                        >
                                                            <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mb-2 group-hover/empty:bg-indigo-100 group-hover/empty:text-indigo-500 transition-colors">
                                                                +
                                                            </div>
                                                            <p className="text-xs font-medium text-gray-500 group-hover/empty:text-indigo-600">Add first task</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Right Column: Recent Activity & Quick Actions */}
                <div className="space-y-6">
                    {/* Quick Actions */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h2>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { title: 'Add Expense', icon: '💸', color: 'from-red-500 to-pink-600' },
                                { title: 'Schedule', icon: '📅', color: 'from-blue-500 to-cyan-600' },
                                { title: 'Materials', icon: '📦', color: 'from-green-500 to-emerald-600' },
                                { title: 'Updates', icon: '📝', color: 'from-purple-500 to-indigo-600' },
                            ].map((action, index) => (
                                <button
                                    key={index}
                                    className={`p-3 rounded-xl bg-gradient-to-br ${action.color} text-white hover:shadow-lg transition-all transform hover:-translate-y-0.5 text-left`}
                                >
                                    <div className="text-2xl mb-1">{action.icon}</div>
                                    <div className="font-medium text-sm">{action.title}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Activity</h2>
                        <div className="space-y-4">
                            {recentActivities.map((activity) => (
                                <div key={activity.id} className="flex gap-3 items-start">
                                    <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-lg flex-shrink-0">
                                        {activity.icon}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-gray-900">{activity.message}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">{activity.time}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Task Modal */}
            <Modal
                isOpen={isTaskModalOpen}
                onClose={() => setIsTaskModalOpen(false)}
                title={`Add Task to ${selectedPhase?.name}`}
            >
                <form onSubmit={handleAddTask} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Task Title</label>
                        <input
                            type="text"
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            placeholder="e.g. Pour foundation concrete"
                            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
                            autoFocus
                        />
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            type="button"
                            onClick={() => setIsTaskModalOpen(false)}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !newTaskTitle.trim()}
                            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {loading ? 'Adding...' : 'Add Task'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Add Permit Step Modal */}
            <Modal
                isOpen={isPermitModalOpen}
                onClose={() => setIsPermitModalOpen(false)}
                title="Add New Permit Step"
            >
                <form onSubmit={handleAddPermitStep} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Step Title</label>
                        <input
                            type="text"
                            value={newPermitTitle}
                            onChange={(e) => setNewPermitTitle(e.target.value)}
                            placeholder="e.g. Electrical Inspection"
                            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
                            autoFocus
                        />
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            type="button"
                            onClick={() => setIsPermitModalOpen(false)}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !newPermitTitle.trim()}
                            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {loading ? 'Adding...' : 'Add Step'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Phase Detail Modal */}
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
