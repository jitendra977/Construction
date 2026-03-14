import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConstruction } from '../../context/ConstructionContext';
import PhaseDetailModal from '../desktop/manage/PhaseDetailModal';
import MobileLayout from './MobileLayout';
import { CheckCircle2, Construction, Clock, Calendar, Activity, MapPin } from 'lucide-react';

const HomeTab = () => {
    const {
        updateTaskStatus,
        dashboardData,
        budgetStats,
        recentActivities: recentUpdates,
    } = useConstruction();
    const navigate = useNavigate();

    const [expandedPhases, setExpandedPhases] = useState(new Set());
    const [detailPhase, setDetailPhase] = useState(null);

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

    const stats = [
        { 
            id: 'done', 
            label: 'Done', 
            count: budgetStats.completedTasks || 0, 
            icon: <CheckCircle2 size={48} strokeWidth={1.5} />,
        },
        { 
            id: 'live', 
            label: 'Live', 
            count: (budgetStats.activePhases || 0) + (budgetStats.activeTasks || 0), 
            icon: <Construction size={48} strokeWidth={1.5} />,
        },
        { 
            id: 'wait', 
            label: 'Wait', 
            count: budgetStats.pendingTasks || 0, 
            icon: <Clock size={48} strokeWidth={1.5} />,
        },
    ];

    return (
        <MobileLayout>
            <PhaseDetailModal
                isOpen={!!detailPhase}
                onClose={() => setDetailPhase(null)}
                phase={detailPhase}
                tasks={dashboardData.tasks?.filter(t => t.phase === detailPhase?.id) || []}
            />

            {/* METRICS GRID - EMERALD GRADIENT THEME */}
            <div className="grid grid-cols-3 gap-3 px-1 w-full">
                {stats.map((item) => (
                    <button 
                        key={item.id} 
                        className="relative group h-32 flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-[2rem] shadow-lg shadow-emerald-900/20 transition-all duration-300 active:scale-95 hover:shadow-emerald-500/30 hover:-translate-y-1 border border-emerald-400/30"
                    >
                        <div className="absolute -right-2 -bottom-2 text-white/10 transition-transform duration-700 group-hover:scale-125 group-hover:-rotate-12 pointer-events-none">
                            {item.icon}
                        </div>
                        <div className="relative z-10 flex flex-col items-center">
                            <span className="text-3xl font-black text-white tabular-nums tracking-tighter drop-shadow-md mb-1">
                                {item.count}
                            </span>
                            <span className="text-[10px] font-black text-emerald-100/80 uppercase tracking-[0.2em]">
                                {item.label}
                            </span>
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                    </button>
                ))}
            </div>

            {/* PROJECT SCHEDULE CONTROLLER - UNIFIED THEME */}
            <div className="px-1 mt-6">
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-[2rem] p-6 shadow-xl shadow-emerald-900/10 relative overflow-hidden group border border-emerald-400/30">
                    {/* Background Icon Decoration */}
                    <div className="absolute -right-4 -top-4 text-white/5 pointer-events-none scale-150 rotate-12">
                        <Calendar size={120} strokeWidth={1} />
                    </div>

                    <div className="flex justify-between items-start mb-6 relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-xl text-white">
                                <Calendar size={20} />
                            </div>
                            <div>
                                <h4 className="text-white font-black text-sm leading-tight">Project Timeline</h4>
                                <p className="text-emerald-100/60 font-medium text-[10px] uppercase tracking-wider">Schedule Control</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => navigate('/dashboard/mobile/manage')}
                            className="bg-white text-emerald-700 px-4 py-2 rounded-xl text-[9px] font-black hover:bg-emerald-50 transition-all active:scale-95 shadow-lg shadow-black/5"
                        >
                            Manage Dates
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 relative z-10">
                        <div className="bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
                            <span className="text-[9px] font-black text-emerald-100/50 uppercase tracking-widest block mb-1.5">Project Launch</span>
                            <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-black text-white tabular-nums">
                                    {dashboardData.project?.start_date ? new Date(dashboardData.project.start_date).getDate() : '01'}
                                </span>
                                <span className="text-[11px] font-bold text-emerald-100 uppercase">
                                    {dashboardData.project?.start_date ? new Date(dashboardData.project.start_date).toLocaleDateString(undefined, { month: 'short' }) : 'Jan'}
                                </span>
                            </div>
                        </div>
                        <div className="bg-emerald-600/30 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
                            <span className="text-[9px] font-black text-emerald-200/50 uppercase tracking-widest block mb-1.5">Target Finish</span>
                            <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-black text-white tabular-nums">
                                    {dashboardData.project?.end_date ? new Date(dashboardData.project.end_date).getDate() : '30'}
                                </span>
                                <span className="text-[11px] font-bold text-emerald-100 uppercase">
                                    {dashboardData.project?.end_date ? new Date(dashboardData.project.end_date).toLocaleDateString(undefined, { month: 'short' }) : 'Dec'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* CONSTRUCTION FEED */}
            <div className="px-1 mt-10">
                <div className="flex justify-between items-center mb-8">
                    <h3 className="dynamic-header text-slate-800 pl-1">Engine Flow</h3>
                    <div className="flex gap-2">
                        <button onClick={expandAll} className="bg-white/50 border border-slate-100 px-3 py-1.5 rounded-xl text-[9px] font-black text-slate-500 hover:text-emerald-500 transition-all">All</button>
                        <button onClick={collapseAll} className="bg-white/50 border border-slate-100 px-3 py-1.5 rounded-xl text-[9px] font-black text-slate-500 hover:text-red-400 transition-all">Hide</button>
                    </div>
                </div>

                <div className="space-y-4">
                    {dashboardData.phases?.map(phase => {
                        const phaseTasks = dashboardData.tasks?.filter(t => t.phase === phase.id) || [];
                        const perc = phaseTasks.length > 0 ? Math.round((phaseTasks.filter(t => t.status === 'COMPLETED').length / phaseTasks.length) * 100) : 0;
                        const isExpanded = expandedPhases.has(phase.id);

                        return (
                            <div key={phase.id} className="relative">
                                {/* Vertical Progress Trace */}
                                {isExpanded && (
                                    <div className="absolute left-[26px] top-[60px] bottom-0 w-0.5 bg-gradient-to-b from-emerald-500/20 via-emerald-500/5 to-transparent z-0"></div>
                                )}

                                <div
                                    onClick={() => togglePhase(phase.id)}
                                    className={`relative z-10 flex flex-col p-5 rounded-[2rem] transition-all cursor-pointer group ${isExpanded ? 'bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-xl shadow-emerald-900/10 border-transparent' : 'bg-white border border-slate-100 shadow-sm'}`}
                                >
                                    <div className="flex justify-between items-center mb-3">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500 ${isExpanded ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-600'}`}>
                                                <span className={`text-base transition-transform duration-500 ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className={`text-sm tracking-tight ${isExpanded ? 'text-white font-black' : 'text-slate-700 font-bold'}`}>
                                                    {phase.name}
                                                </span>
                                                <span className={`text-[10px] font-black uppercase tracking-[0.2em] mt-0.5 ${isExpanded ? 'text-emerald-100/50' : 'text-slate-400'}`}>
                                                    {phaseTasks.length} Systems Active
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className={`text-2xl font-black tabular-nums leading-none ${isExpanded ? 'text-white' : (perc === 100 ? 'text-emerald-600' : 'text-slate-800')}`}>{perc}%</span>
                                            <span className={`text-[9px] font-black uppercase tracking-widest mt-1 ${isExpanded ? 'text-emerald-100/50' : 'text-emerald-500'}`}>Status</span>
                                        </div>
                                    </div>

                                    {/* Mini Progress Bar */}
                                    <div className={`w-full h-2 rounded-full overflow-hidden ${isExpanded ? 'bg-emerald-800/30' : 'bg-slate-100'}`}>
                                        <div
                                            className={`h-full transition-all duration-1000 ease-out ${isExpanded ? 'bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]'}`}
                                            style={{ width: `${perc}%` }}
                                        ></div>
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="relative z-10 px-3 pb-3 space-y-3 pt-6 ml-3">
                                        {phaseTasks.map((task, idx) => (
                                            <div
                                                key={task.id}
                                                onClick={() => handleTaskToggle(task)}
                                                className="flex items-center gap-4 group/task"
                                            >
                                                {/* Timeline Node */}
                                                <div className={`w-9 h-9 rounded-2xl flex items-center justify-center border transition-all shrink-0 ${task.status === 'COMPLETED' ? 'bg-emerald-500 border-emerald-400 shadow-sm' : 'bg-white border-emerald-200/40'}`}>
                                                    {task.status === 'COMPLETED' ? (
                                                        <span className="text-white text-xs">✓</span>
                                                    ) : (
                                                        <div className="w-1 h-1 rounded-full bg-emerald-200"></div>
                                                    )}
                                                </div>

                                                <div className={`flex-1 p-4 rounded-3xl border transition-all ${task.status === 'COMPLETED' ? 'bg-emerald-50/5 border-emerald-200/20 shadow-sm' : 'bg-white border-emerald-200/40 hover:translate-x-1'}`}>
                                                    <div className="flex justify-between items-center">
                                                        <span className={`text-[14px] ${task.status === 'COMPLETED' ? 'text-slate-300 line-through' : 'text-slate-600 font-bold'}`}>
                                                            {task.title}
                                                        </span>
                                                        <span className={`text-[7px] font-black tracking-widest uppercase ${task.status === 'COMPLETED' ? 'text-emerald-500' : 'text-slate-300'}`}>
                                                            {task.status === 'COMPLETED' ? 'Synced' : 'Valid'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                        <div className="ml-12 pt-4">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDetailPhase(phase);
                                                }}
                                                className="w-full py-4 bg-slate-900 text-white rounded-3xl text-[10px] font-black hover:bg-emerald-600 transition-all active:scale-[0.98] shadow-lg shadow-slate-100"
                                            >
                                                System Analytics
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ACTIVITY FEED - UNIFIED THEME */}
            <div className="px-1 mt-10 mb-10">
                <h3 className="dynamic-header text-slate-800 mb-8 pl-1">Activity Stream</h3>
                <div className="space-y-4">
                    {recentUpdates && recentUpdates.length > 0 ? (
                        recentUpdates.map((update) => (
                            <div key={update.id} className="bg-white p-6 rounded-[2.5rem] flex items-center gap-6 active:scale-[0.98] transition-all shadow-sm border border-slate-100">
                                <div className="w-14 h-14 rounded-[2rem] bg-gradient-to-br from-emerald-500/10 to-emerald-700/10 flex items-center justify-center text-2xl text-emerald-600">
                                    <Activity size={24} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-center mb-1">
                                        <p className="text-base font-black text-slate-800 leading-tight truncate">{update.title}</p>
                                        <span className="text-emerald-600 text-[9px] font-black opacity-70 uppercase tracking-widest">Live</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <p className="text-slate-500 text-[14px] truncate max-w-[150px] font-medium">{update.message || 'EVENT_CONFIRMED'}</p>
                                        <span className="text-slate-300 text-[9px] tabular-nums font-black">{update.time?.split(',')[0]}</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-20 bg-emerald-50/20 rounded-[3rem] border-dashed border-2 border-emerald-100">
                            <p className="text-emerald-400 italic font-medium">Awaiting Telemetry...</p>
                        </div>
                    )}
                </div>
            </div>

            {/* GEO STATUS - UNIFIED THEME */}
            <div className="grid grid-cols-2 gap-4 pb-20 px-1">
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-[2.5rem] p-8 flex flex-col items-center justify-center text-center space-y-6 shadow-xl shadow-emerald-900/10 border border-emerald-400/30 overflow-hidden relative">
                    <div className="absolute -left-4 -top-4 text-white/10 pointer-events-none">
                        <MapPin size={80} strokeWidth={1} />
                    </div>
                    <div className="w-16 h-16 rounded-full border border-white/20 flex items-center justify-center animate-spin-slow relative z-10">
                        <div className="w-10 h-10 rounded-full border border-white/40 flex items-center justify-center">
                            <div className="w-6 h-6 rounded-full bg-white shadow-lg"></div>
                        </div>
                    </div>
                    <div className="space-y-1 relative z-10">
                        <p className="text-[10px] font-black text-emerald-100 uppercase tracking-widest leading-none">Global Sync</p>
                        <p className="text-[8px] font-black text-emerald-200 uppercase tracking-widest">{dashboardData.project?.name?.split(' ')[0] || 'SITE'}_LINK</p>
                    </div>
                </div>
                
                <div className="bg-white rounded-[2.5rem] p-8 space-y-6 shadow-sm border border-slate-100 relative overflow-hidden flex flex-col justify-center">
                    <div className="space-y-3 relative z-10">
                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest leading-none">LATITUDE</p>
                        <p className="text-2xl font-black tabular-nums text-slate-800 leading-none">
                            {dashboardData.project?.latitude || '28.4'}°<span className="text-xs text-emerald-500 ml-1 font-black">N</span>
                        </p>
                    </div>
                    <div className="space-y-3 relative z-10">
                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest leading-none">LONGITUDE</p>
                        <p className="text-2xl font-black tabular-nums text-slate-800 leading-none">
                            {dashboardData.project?.longitude || '82.3'}°<span className="text-xs text-emerald-500 ml-1 font-black">E</span>
                        </p>
                    </div>
                    {/* Subtle Gradient Accent */}
                    <div className="absolute right-0 bottom-0 w-24 h-24 bg-emerald-50 rounded-tl-[3rem] opacity-50"></div>
                </div>
            </div>

        </MobileLayout>
    );
};

export default HomeTab;
