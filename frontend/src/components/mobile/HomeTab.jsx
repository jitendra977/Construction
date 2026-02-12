import React, { useState, useEffect } from 'react';
import { useConstruction } from '../../context/ConstructionContext';
import PhaseDetailModal from '../desktop/manage/PhaseDetailModal';
import Modal from '../common/Modal';

const HomeTab = () => {
    const {
        updateTaskStatus,
        updatePhaseStatus,
        updatePermitStatus,
        updatePermitStep,
        createPermitStep,
        deletePermitStep,
        dashboardData,
        stats,
        recentActivities: recentUpdates,
        formatCurrency
    } = useConstruction();

    const [expandedPhases, setExpandedPhases] = useState(new Set());
    const [showPermits, setShowPermits] = useState(false);
    const [isManageMode, setIsManageMode] = useState(false);
    const [detailPhase, setDetailPhase] = useState(null);
    const [isPermitModalOpen, setIsPermitModalOpen] = useState(false);
    const [newPermitTitle, setNewPermitTitle] = useState('');
    const [permitLoading, setPermitLoading] = useState(false);

    // Default expand in-progress phases
    useEffect(() => {
        if (!dashboardData?.phases) return;
        const inProgress = dashboardData.phases
            .filter(p => p.status === 'IN_PROGRESS')
            .map(p => p.id);
        if (inProgress.length > 0 && expandedPhases.size === 0) {
            setExpandedPhases(new Set(inProgress));
        }
    }, [dashboardData?.phases]);

    const togglePhase = (phaseId) => {
        const newExpanded = new Set(expandedPhases);
        if (newExpanded.has(phaseId)) {
            newExpanded.delete(phaseId);
        } else {
            newExpanded.add(phaseId);
        }
        setExpandedPhases(newExpanded);
    };

    const expandAll = () => setExpandedPhases(new Set(dashboardData.phases.map(p => p.id)));
    const collapseAll = () => setExpandedPhases(new Set());

    const handleTaskToggle = async (task) => {
        try {
            const newStatus = task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
            await updateTaskStatus(task.id, newStatus);
        } catch (error) {
            console.error("Failed to update task", error);
        }
    };

    const handleStatusChange = async (phaseId, newStatus) => {
        try {
            await updatePhaseStatus(phaseId, newStatus);
        } catch (error) {
            console.error("Failed to update phase status", error);
        }
    };

    const handlePermitToggle = async (step) => {
        try {
            const newStatus = step.status === 'APPROVED' ? 'PENDING' : 'APPROVED';
            await updatePermitStatus(step.id, newStatus);
        } catch (error) {
            console.error("Failed to update permit status", error);
        }
    };

    const handleCreatePermit = async (e) => {
        e.preventDefault();
        if (!newPermitTitle.trim()) return;
        setPermitLoading(true);
        try {
            const maxOrder = dashboardData.permits?.reduce((max, step) => Math.max(max, step.order), 0) || 0;
            await createPermitStep({
                title: newPermitTitle,
                status: 'PENDING',
                order: maxOrder + 1,
                description: 'Custom permit step'
            });
            setNewPermitTitle('');
            setIsPermitModalOpen(false);
        } catch (err) {
            console.error("Failed to create permit step", err);
        } finally {
            setPermitLoading(false);
        }
    };

    const handleDeleteStep = async (stepId) => {
        if (!window.confirm("Are you sure you want to delete this step?")) return;
        try {
            await deletePermitStep(stepId);
        } catch (err) {
            console.error("Failed to delete step", err);
        }
    };

    const handleTitleEdit = async (stepId, newTitle) => {
        try {
            await updatePermitStep(stepId, { title: newTitle });
        } catch (err) {
            console.error("Failed to update title", err);
        }
    };

    return (
        <div className="space-y-6">
            <PhaseDetailModal
                isOpen={!!detailPhase}
                onClose={() => setDetailPhase(null)}
                phase={detailPhase}
                tasks={dashboardData.tasks.filter(t => t.phase === detailPhase?.id)}
            />
            {/* Construction Journey */}

            <section>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Project Timeline</h2>
                    <button
                        onClick={() => setIsManageMode(!isManageMode)}
                        className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${isManageMode
                            ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200 ring-4 ring-indigo-50 animate-pulse-subtle'
                            : 'bg-white text-gray-500 border-2 border-gray-100 shadow-sm'
                            }`}
                    >
                        <span className="text-sm">{isManageMode ? '🛠️' : '⚙️'}</span>
                        {isManageMode ? 'Manage Mode On' : 'Manage Phases'}
                    </button>
                </div>
                <div className="flex gap-2">
                    <button onClick={expandAll} className="text-[10px] font-bold uppercase text-indigo-600 bg-indigo-50 px-2 py-1 rounded active:scale-95">Expand</button>
                    <button onClick={collapseAll} className="text-[10px] font-bold uppercase text-gray-400 bg-gray-100 px-2 py-1 rounded active:scale-95">Hide</button>
                </div>

                <div className="relative space-y-8">
                    {/* Vertical Background Line */}
                    <div className="absolute left-[1.125rem] top-6 bottom-6 w-[2px] bg-gray-100 rounded-full"></div>

                    {/* PHASE 0: Municipal Permits */}
                    <div className="relative group">
                        {(() => {
                            const permits = dashboardData.permits || [];
                            const allApproved = permits.length > 0 && permits.every(p => p.status === 'APPROVED');
                            const anyInProgress = permits.some(p => p.status === 'APPROVED' || p.status === 'IN_PROGRESS');
                            const isPermitCompleted = allApproved;
                            const isPermitInProgress = !allApproved && anyInProgress;

                            return (
                                <>
                                    <div className={`absolute top-0 left-0 w-9 h-9 rounded-full border-2 flex items-center justify-center font-bold text-xs z-10 transition-all duration-500 ${isPermitCompleted ? 'bg-green-500 border-green-50 text-white shadow-lg' :
                                        isPermitInProgress ? 'bg-blue-600 border-blue-50 text-white shadow-lg animate-pulse ring-4 ring-blue-50' :
                                            'bg-white border-gray-100 text-gray-400'
                                        }`}>
                                        {isPermitCompleted ? '✓' : '0'}
                                    </div>

                                    <div className={`ml-12 bg-white rounded-2xl border transition-all duration-300 ${showPermits ? 'shadow-md border-blue-100' : 'shadow-sm border-gray-100'} p-4`}>
                                        <div className="flex justify-between items-center" onClick={() => setShowPermits(!showPermits)}>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-bold text-gray-900">Municipal Permits</h3>
                                                    <span className={`text-[10px] text-gray-400 transition-transform ${showPermits ? 'rotate-180' : ''}`}>▼</span>
                                                </div>
                                                <p className="text-[11px] text-gray-500 leading-tight">Naksha Pass / Approval Process</p>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${isPermitCompleted ? 'bg-green-50 text-green-600' : isPermitInProgress ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-400'}`}>
                                                    {isPermitCompleted ? 'Approved' : isPermitInProgress ? 'In Progress' : 'Pending'}
                                                </span>
                                            </div>
                                        </div>

                                        {showPermits && (
                                            <div className="mt-4 pt-4 border-l-2 border-blue-50 ml-1 pl-4 space-y-4 animate-slideDown">
                                                {dashboardData.permits?.map(step => (
                                                    <div key={step.id} className="flex items-center justify-between gap-3 group">
                                                        <div className="flex items-center gap-3 flex-1">
                                                            <div
                                                                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all flex-shrink-0 ${step.status === 'APPROVED' ? 'bg-green-500 text-white' : 'bg-gray-50 text-gray-400 border border-gray-100'} ${isManageMode ? 'cursor-pointer active:scale-90 shadow-sm' : ''}`}
                                                                onClick={(e) => {
                                                                    if (isManageMode) {
                                                                        e.stopPropagation();
                                                                        handlePermitToggle(step);
                                                                    }
                                                                }}
                                                            >
                                                                {step.status === 'APPROVED' ? '✓' : step.order}
                                                            </div>
                                                            {isManageMode ? (
                                                                <input
                                                                    type="text"
                                                                    value={step.title}
                                                                    onChange={(e) => handleTitleEdit(step.id, e.target.value)}
                                                                    className="text-xs font-semibold text-gray-700 bg-gray-50 border-gray-100 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500 w-full"
                                                                />
                                                            ) : (
                                                                <span className={`text-xs font-medium ${step.status === 'APPROVED' ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{step.title}</span>
                                                            )}
                                                        </div>
                                                        {isManageMode && (
                                                            <button
                                                                onClick={() => handleDeleteStep(step.id)}
                                                                className="text-gray-300 hover:text-red-500 p-1 opacity-100 group-hover:opacity-100 transition-opacity"
                                                            >
                                                                ×
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                                {isManageMode && (
                                                    <button
                                                        onClick={() => setIsPermitModalOpen(true)}
                                                        className="w-full py-2 bg-blue-50 text-blue-600 text-[10px] font-black uppercase rounded-lg border border-blue-100 active:bg-blue-100 transition-colors"
                                                    >
                                                        + Add Permit Step
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </>
                            );
                        })()}
                    </div>

                    {/* Standard Phases */}
                    {dashboardData.phases.map((phase) => {
                        const phaseTasks = dashboardData.tasks.filter(t => t.phase === phase.id);
                        const isCompleted = phase.status === 'COMPLETED';
                        const isInProgress = phase.status === 'IN_PROGRESS';
                        const isExpanded = expandedPhases.has(phase.id);

                        return (
                            <div key={phase.id} className="relative group">
                                {/* Segment Line Overlay */}
                                <div className={`absolute left-[0.5625rem] -top-8 h-8 w-0.5 transition-colors duration-1000 ${phase.status !== 'NOT_STARTED' ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.4)]' : 'bg-gray-100'}`}></div>

                                {/* Node */}
                                <div className={`absolute top-0 left-0 w-9 h-9 rounded-full border-2 flex items-center justify-center font-bold text-xs z-10 transition-all duration-500 ${isCompleted ? 'bg-green-500 border-green-50 text-white shadow-lg shadow-green-100' :
                                    isInProgress ? 'bg-indigo-600 border-indigo-50 text-white shadow-lg animate-pulse ring-4 ring-indigo-50 scale-105' :
                                        'bg-white border-gray-100 text-gray-400'
                                    }`}>
                                    {isCompleted ? '✓' : phase.order}
                                </div>

                                {/* Content Card */}
                                <div
                                    className={`ml-12 bg-white rounded-2xl border transition-all duration-300 ${isExpanded ? 'shadow-md border-indigo-100' : 'shadow-sm border-gray-100'}`}
                                >
                                    <div
                                        className="p-4 flex flex-col cursor-pointer"
                                        onClick={() => togglePhase(phase.id)}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <h3 className={`font-bold text-sm ${isInProgress ? 'text-indigo-900' : 'text-gray-900'}`}>{phase.name}</h3>
                                                    <span className={`text-[10px] text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
                                                </div>
                                                <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">{phase.description}</p>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                {isManageMode ? (
                                                    <select
                                                        value={phase.status}
                                                        onChange={(e) => {
                                                            e.stopPropagation();
                                                            handleStatusChange(phase.id, e.target.value);
                                                        }}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="text-[10px] font-bold uppercase px-1 py-0.5 rounded border border-gray-200 bg-gray-50 outline-none"
                                                    >
                                                        <option value="NOT_STARTED">Pending</option>
                                                        <option value="IN_PROGRESS">Active</option>
                                                        <option value="COMPLETED">Done</option>
                                                    </select>
                                                ) : (
                                                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${isCompleted ? 'bg-green-50 text-green-600' : isInProgress ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-50 text-gray-400'}`}>
                                                        {isCompleted ? 'Done' : isInProgress ? 'Active' : 'Pending'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Simplified Task Progress for Collapsed */}
                                        {!isExpanded && phaseTasks.length > 0 && (
                                            <div className="mt-2 flex items-center gap-2">
                                                <div className="flex-1 h-1 bg-gray-50 rounded-full overflow-hidden text-pretty">
                                                    <div
                                                        className={`h-full transition-all duration-500 ${isCompleted ? 'bg-green-500' : 'bg-indigo-500'}`}
                                                        style={{ width: `${isCompleted ? 100 : Math.round((phaseTasks.filter(t => t.status === 'COMPLETED').length / phaseTasks.length) * 100)}%` }}
                                                    />
                                                </div>
                                                <span className="text-[9px] font-medium text-gray-400">
                                                    {phaseTasks.filter(t => t.status === 'COMPLETED').length}/{phaseTasks.length}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Expanded Tasks List */}
                                    {isExpanded && (
                                        <div className="px-4 pb-4 space-y-3 animate-slideDown">
                                            <div className="h-px bg-gray-50 w-full mb-1" />
                                            {isManageMode && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setDetailPhase(phase);
                                                    }}
                                                    className="w-full py-2 mb-2 bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase rounded-xl border-2 border-indigo-100 active:bg-indigo-200 transition-all shadow-sm flex items-center justify-center gap-2"
                                                >
                                                    <span className="text-xs">✏️</span> Edit Phase & Tasks
                                                </button>
                                            )}
                                            {phaseTasks.length > 0 ? (
                                                <div className="space-y-2">
                                                    {phaseTasks.map(task => (
                                                        <div
                                                            key={task.id}
                                                            className={`flex items-start gap-3 p-2 rounded-xl transition-colors ${task.status === 'COMPLETED' ? 'bg-green-50/50' : 'bg-gray-50/50'}`}
                                                            onClick={(e) => {
                                                                if (isManageMode) {
                                                                    e.stopPropagation();
                                                                    handleTaskToggle(task);
                                                                }
                                                            }}
                                                        >
                                                            <div className="pt-0.5">
                                                                <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${task.status === 'COMPLETED' ? 'bg-green-500 border-green-500 shadow-sm shadow-green-100' : 'bg-white border-gray-200'} ${isManageMode ? 'cursor-pointer active:scale-90' : ''}`}>
                                                                    {task.status === 'COMPLETED' && <span className="text-[10px] text-white font-bold text-pretty">✓</span>}
                                                                </div>
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className={`text-xs font-semibold ${task.status === 'COMPLETED' ? 'text-gray-400 line-through' : 'text-gray-900 hover:text-indigo-600 transition-colors'}`}>{task.title}</p>
                                                                {task.due_date && (
                                                                    <p className="text-[9px] text-gray-400 mt-0.5">Due: {new Date(task.due_date).toLocaleDateString()}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-[10px] text-gray-400 italic text-center py-2">No tasks listed for this phase.</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* Recent Updates */}
            <section>
                <h2 className="text-lg font-bold text-gray-800 mb-4">Recent Updates</h2>
                <div className="space-y-3">
                    {recentUpdates.length === 0 ? (
                        <p className="text-gray-500 text-sm text-center">No recent updates.</p>
                    ) : (
                        recentUpdates.map((update) => (
                            <div key={update.id} className="bg-white rounded-xl p-4 shadow-sm flex gap-3">
                                <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                    <span className="text-lg">{update.icon}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-gray-900 text-sm">{update.title}</h3>
                                    <p className="text-xs text-gray-500 mt-1">{update.time}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </section>

            {/* Quick Actions */}
            <section>
                <h2 className="text-lg font-bold text-gray-800 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-2 gap-3">
                    {[
                        { title: 'Add Expense', icon: '💸', color: 'from-red-500 to-pink-500' },
                        { title: 'Schedule', icon: '📅', color: 'from-blue-500 to-cyan-500' },
                        { title: 'Materials', icon: '📦', color: 'from-green-500 to-emerald-500' },
                        { title: 'Photos', icon: '📸', color: 'from-purple-500 to-indigo-500' },
                    ].map((action, index) => (
                        <button
                            key={index}
                            className={`bg-gradient-to-br ${action.color} text-white rounded-xl p-4 shadow-md active:scale-95 transition-transform`}
                        >
                            <div className="text-3xl mb-2">{action.icon}</div>
                            <div className="font-semibold text-sm">{action.title}</div>
                        </button>
                    ))}
                </div>
            </section>
            {/* Permit Creation Modal */}
            <Modal isOpen={isPermitModalOpen} onClose={() => setIsPermitModalOpen(false)} title="New Permit Step">
                <form onSubmit={handleCreatePermit} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Step Title</label>
                        <input
                            type="text"
                            value={newPermitTitle}
                            onChange={(e) => setNewPermitTitle(e.target.value)}
                            placeholder="e.g. Ward Clearance, Electricity Deposit..."
                            className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-900"
                            autoFocus
                        />
                    </div>
                    <div className="flex gap-3">
                        <button type="button" onClick={() => setIsPermitModalOpen(false)} className="flex-1 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Cancel</button>
                        <button
                            type="submit"
                            disabled={permitLoading || !newPermitTitle.trim()}
                            className="flex-1 py-4 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-100 disabled:opacity-50"
                        >
                            {permitLoading ? 'Wait...' : 'Create Step'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default HomeTab;
