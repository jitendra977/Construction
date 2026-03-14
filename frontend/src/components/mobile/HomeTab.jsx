import React, { useState, useEffect } from 'react';
import { useConstruction } from '../../context/ConstructionContext';
import PhaseDetailModal from '../desktop/manage/PhaseDetailModal';
import Modal from '../common/Modal';
import MobileLayout from './MobileLayout';

const HomeTab = () => {
    const {
        updateTaskStatus,
        updatePhaseStatus,
        createPermitStep,
        dashboardData,
        stats,
        recentActivities: recentUpdates,
    } = useConstruction();

    const [expandedPhases, setExpandedPhases] = useState(new Set());
    const [detailPhase, setDetailPhase] = useState(null);
    const [isPermitModalOpen, setIsPermitModalOpen] = useState(false);
    const [newPermitTitle, setNewPermitTitle] = useState('');
    const [permitLoading, setPermitLoading] = useState(false);

    useEffect(() => {
        if (!dashboardData?.phases) return;
        const inProgress = dashboardData.phases
            .filter(p => p.status === 'IN_PROGRESS')
            .map(p => p.id);
        if (inProgress.length > 0 && expandedPhases.size === 0) {
            setExpandedPhases(new Set(inProgress));
        }
    }, [dashboardData?.phases, expandedPhases.size]);

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

    const handleCreatePermit = async (e) => {
        e.preventDefault();
        if (!newPermitTitle.trim()) return;
        setPermitLoading(true);
        try {
            const maxOrder = (dashboardData.permits || []).reduce((max, step) => Math.max(max, step.order), 0) || 0;
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

    const headerExtra = (
        <div className="flex items-center gap-3">
            <div className="glow-dot shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
            <span className="dynamic-subtitle text-emerald-500">Live</span>
        </div>
    );

    return (
        <MobileLayout
            title={dashboardData.project?.name || 'Construction Manager'}
            subtitle="Project Matrix Active"
            headerExtra={headerExtra}
        >
            <PhaseDetailModal
                isOpen={!!detailPhase}
                onClose={() => setDetailPhase(null)}
                phase={detailPhase}
                tasks={dashboardData.tasks?.filter(t => t.phase === detailPhase?.id) || []}
            />

            {/* MAIN DASHBOARD OVERVIEW */}
            <div className="grid grid-cols-1 gap-6">
                <div className="card-glass rounded-[2rem] p-7 shadow-sm hud-border relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-10 text-6xl rotate-12">🏗️</div>
                    <div className="relative z-10">
                        <p className="text-slate-400 font-black dynamic-subtitle mb-2">Project Pulse</p>
                        <h3 className="text-slate-800 leading-tight dynamic-title">
                            {stats.find(s => s.id === 'progress')?.value || '0%'} 
                            <span className="text-xs ml-2 text-emerald-500 dynamic-subtitle">Completed</span>
                        </h3>
                        
                        <div className="mt-8 space-y-3">
                            <div className="flex justify-between dynamic-subtitle text-slate-500">
                                <span>Construction Progress</span>
                                <span className="text-emerald-600">Active</span>
                            </div>
                            <div className="progress-bar h-3">
                                <div
                                    className="progress-fill"
                                    style={{ 
                                        width: stats.find(s => s.id === 'progress')?.value || '0%', 
                                        background: 'linear-gradient(90deg, #059669, #34d399)' 
                                    }}
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 px-1">
                    <div className="bg-emerald-600 rounded-3xl p-5 shadow-lg shadow-emerald-50 relative overflow-hidden group active:scale-95 transition-all">
                        <div className="absolute -bottom-2 -right-2 text-5xl opacity-20 rotate-6">✅</div>
                        <p className="text-emerald-100 font-black dynamic-subtitle mb-1.5">Health</p>
                        <p className="text-white dynamic-title">100%</p>
                    </div>

                    <div className="bg-teal-600 rounded-3xl p-5 shadow-lg shadow-teal-50 relative overflow-hidden group active:scale-95 transition-all">
                        <div className="absolute -bottom-2 -right-2 text-5xl opacity-20 -rotate-6">🚧</div>
                        <p className="text-teal-100 font-black dynamic-subtitle mb-1.5">Active</p>
                        <p className="text-white dynamic-title">
                            {dashboardData.phases?.filter(p => p.status === 'IN_PROGRESS').length || 0}
                        </p>
                    </div>
                </div>
            </div>


            {/* CONSTRUCTION FEED */}
            <div className="px-1">
                <div className="flex justify-between items-center mb-8">
                    <h3 className="dynamic-header text-slate-800 pl-1">Engine Flow</h3>
                    <div className="flex gap-2">
                        <button onClick={expandAll} className="bg-white/50 border border-slate-100 px-3 py-1.5 rounded-xl dynamic-subtitle text-slate-500 hover:text-emerald-500 transition-all">All</button>
                        <button onClick={collapseAll} className="bg-white/50 border border-slate-100 px-3 py-1.5 rounded-xl dynamic-subtitle text-slate-500 hover:text-red-400 transition-all">Hide</button>
                    </div>
                </div>

                <div className="space-y-8">
                    {dashboardData.phases?.map(phase => {
                        const phaseTasks = dashboardData.tasks?.filter(t => t.phase === phase.id) || [];
                        const perc = phaseTasks.length > 0 ? Math.round((phaseTasks.filter(t => t.status === 'COMPLETED').length / phaseTasks.length) * 100) : 0;
                        const isExpanded = expandedPhases.has(phase.id);

                        return (
                            <div key={phase.id} className="space-y-4">
                                <div
                                    onClick={() => togglePhase(phase.id)}
                                    className={`flex justify-between p-5 rounded-3xl card-glass border transition-all cursor-pointer group mb-3 ${isExpanded ? 'border-emerald-200 shadow-md' : 'border-slate-100 shadow-sm'}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <span className={`text-xl transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                                        <span className={`dynamic-subtitle ${isExpanded ? 'text-emerald-600 font-black' : 'text-slate-600'}`}>
                                            {phase.name}
                                        </span>
                                    </div>
                                    <span className={`dynamic-body font-black tabular-nums transition-colors ${perc === 100 ? 'text-emerald-600' : 'text-slate-400'}`}>{perc}%</span>
                                </div>


                                {isExpanded && (
                                    <div className="px-2 pb-6 space-y-3 animate-stagger border-l-2 border-emerald-100 ml-7 mt-2">
                                        {phaseTasks.map(task => (
                                            <div
                                                key={task.id}
                                                onClick={() => handleTaskToggle(task)}
                                                className={`flex items-center justify-between p-4 rounded-2xl transition-all cursor-pointer border ${task.status === 'COMPLETED' ? 'bg-emerald-50/20 border-emerald-100/50' : 'bg-white border-slate-100 hover:border-emerald-200'}`}
                                            >
                                                <span className={`dynamic-body ${task.status === 'COMPLETED' ? 'text-slate-300 line-through' : 'text-slate-600 font-medium'}`}>
                                                    {task.title}
                                                </span>
                                                <div className={`w-5 h-5 rounded-lg border-2 transition-all flex items-center justify-center ${task.status === 'COMPLETED' ? 'bg-emerald-500 border-emerald-400 shadow-sm' : 'border-slate-100'}`}>
                                                    {task.status === 'COMPLETED' && <span className="dynamic-subtitle text-white">✓</span>}
                                                </div>
                                            </div>
                                        ))}
                                        <button
                                            onClick={() => setDetailPhase(phase)}
                                            className="w-full py-4 bg-emerald-50/50 border border-emerald-100 text-emerald-600 dynamic-subtitle rounded-2xl hover:bg-emerald-100 transition-all active:scale-[0.98] mt-4"
                                        >
                                            View Phase Detail
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ACTIVITY FEED */}
            <div className="px-1">
                <h3 className="dynamic-header text-slate-800 mb-6 pl-1">Activity Stream</h3>
                <div className="space-y-4">
                    {recentUpdates && recentUpdates.length > 0 ? (
                        recentUpdates.map((update) => (
                            <div key={update.id} className="card-glass p-5 rounded-3xl flex items-center gap-5 active:scale-[0.98] transition-all">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-xl shadow-sm">
                                    {update.icon || '🚀'}
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-center mb-1">
                                        <p className="dynamic-body font-black text-slate-800 leading-tight">{update.title}</p>
                                        <span className="text-emerald-600 dynamic-subtitle text-[9px] opacity-70">ACK_OK</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <p className="text-slate-500 dynamic-body text-[11px] truncate max-w-[150px]">{update.message || 'EVENT_CONFIRMED'}</p>
                                        <span className="text-slate-300 dynamic-subtitle text-[9px]">{update.time.split(',')[0]}</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-16 card-glass rounded-[2rem] border-dashed">
                             <p className="text-slate-300 dynamic-body italic">Awaiting Telemetry...</p>
                        </div>
                    )}
                </div>
            </div>

            {/* GEO STATUS */}
            <div className="grid grid-cols-2 gap-6">
                <div className="card-glass rounded-[2rem] p-8 hud-border flex flex-col items-center justify-center text-center space-y-6">
                    <div className="w-20 h-20 rounded-full border border-emerald-100 flex items-center justify-center animate-spin-slow">
                        <div className="w-14 h-14 rounded-full border border-emerald-50 flex items-center justify-center">
                            <div className="w-10 h-10 rounded-full bg-emerald-50"></div>
                        </div>
                    </div>
                </div>
                <div className="card-glass rounded-[2rem] p-8 hud-border space-y-6">
                    <div className="space-y-3">
                        <p className="dynamic-subtitle text-slate-400 font-black">LATITUDE</p>
                        <p className="dynamic-title tabular-nums text-slate-800">28.4°<span className="text-xs text-emerald-500 ml-1 font-bold">N</span></p>
                    </div>
                    <div className="space-y-3">
                        <p className="dynamic-subtitle text-slate-400 font-black">LONGITUDE</p>
                        <p className="dynamic-title tabular-nums text-slate-800">82.3°<span className="text-xs text-emerald-500 ml-1 font-bold">E</span></p>
                    </div>
                </div>
            </div>

            {/* FLOATING ACTION INTERFACE */}
            <div className="fixed bottom-12 right-10 flex flex-col gap-6 z-50">
                <button
                    onClick={() => setIsPermitModalOpen(true)}
                    className="w-16 h-16 rounded-2xl bg-emerald-600 text-white flex items-center justify-center text-3xl hover:scale-110 shadow-lg shadow-emerald-100 transition-all active:scale-95"
                >
                    ＋
                </button>
            </div>

            <Modal isOpen={isPermitModalOpen} onClose={() => setIsPermitModalOpen(false)} title="DATA_COMMIT">
                <form onSubmit={handleCreatePermit} className="p-6 space-y-10">
                    <div className="space-y-5 text-left">
                        <label className="dynamic-subtitle text-slate-400">Label</label>
                        <input
                            type="text"
                            value={newPermitTitle}
                            onChange={(e) => setNewPermitTitle(e.target.value)}
                            className="w-full p-6 bg-slate-50 border border-slate-100 rounded-2xl text-slate-800 outline-none dynamic-body"
                            autoFocus
                        />
                    </div>
                    <div className="flex gap-6">
                        <button type="submit" disabled={permitLoading} className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl dynamic-subtitle shadow-lg">Confirm</button>
                    </div>
                </form>
            </Modal>
        </MobileLayout>
    );
};

export default HomeTab;
