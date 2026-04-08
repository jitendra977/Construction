import React, { useState, useEffect, useMemo } from 'react';
import { useConstruction } from '../../context/ConstructionContext';
import { dashboardService } from '../../services/api';

const BudgetOverview = ({ onResolve }) => {
    const { formatCurrency } = useConstruction();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await dashboardService.getBudgetOverview();
                setStats(res.data);
            } catch (error) {
                console.error("Failed to fetch budget stats", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    const insights = useMemo(() => {
        if (!stats) return null;
        
        const dailyBurn = stats.days_active > 0 ? stats.total_spent / stats.days_active : 0;
        const runwayDays = dailyBurn > 0 ? stats.funding_balance / dailyBurn : Infinity;
        
        // Resource Split
        const types = stats.type_breakdown || {};
        const total = Object.values(types).reduce((a, b) => a + b, 0);
        
        return {
            dailyBurn,
            runwayDays: runwayDays === Infinity ? 'N/A' : Math.floor(runwayDays),
            distribution: {
                materials: total > 0 ? (types.MATERIAL || 0) / total * 100 : 0,
                labor: total > 0 ? (types.LABOR || 0) / total * 100 : 0,
                fees: total > 0 ? ((types.FEES || 0) + (types.GOVT || 0)) / total * 100 : 0,
                other: total > 0 ? (types.OTHER || 0) / total * 100 : 0
            }
        };
    }, [stats]);

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-20 space-y-4 animate-pulse">
            <div className="w-16 h-16 border-4 border-[var(--t-primary)]/20 border-t-[var(--t-primary)] rounded-full animate-spin"></div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--t-text3)]">Synthesizing Financial Intelligence...</p>
        </div>
    );
    
    if (!stats) return null;

    const health = stats.budget_health || {};

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {/* 1. Project Solvency & Health Bar */}
            <div className="bg-[var(--t-surface)] rounded-3xl p-8 border border-[var(--t-border)] shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--t-primary)]/5 rounded-full blur-3xl -mr-32 -mt-32 transition-colors group-hover:bg-[var(--t-primary)]/10"></div>
                
                <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">🏗️</span>
                            <h2 className="text-3xl font-black text-[var(--t-text)] uppercase tracking-tighter italic">Project Solvency</h2>
                        </div>
                        <p className="text-sm font-bold text-[var(--t-text2)] max-w-md leading-relaxed opacity-70">
                            Overall financial health of the construction lifecycle based on total master capital and current utilization.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-4 items-center">
                        <div className="px-6 py-3 bg-[var(--t-surface2)] border border-[var(--t-border)] rounded-2xl flex flex-col items-center min-w-[120px]">
                            <span className="text-[10px] font-black text-[var(--t-text3)] uppercase tracking-widest mb-1">Health Score</span>
                            <span className={`text-xl font-black italic ${health.status === 'HEALTHY' ? 'text-emerald-500' : 'text-red-500'}`}>
                                {health.status === 'HEALTHY' ? 'OPTIMAL' : 'AT RISK'}
                            </span>
                        </div>
                        <div className="px-6 py-3 bg-[var(--t-primary)] text-white rounded-2xl flex flex-col items-center min-w-[120px] shadow-lg shadow-[var(--t-primary)]/20">
                            <span className="text-[10px] font-black opacity-60 uppercase tracking-widest mb-1">Funded Status</span>
                            <span className="text-xl font-black italic">
                                {((stats.total_funding / stats.project_budget) * 100).toFixed(1)}%
                            </span>
                        </div>
                    </div>
                </div>

                <div className="mt-10 space-y-4">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-[var(--t-text3)]">
                        <span>Project Completion Estimate (Financial)</span>
                        <span className="text-[var(--t-text)]">{((stats.total_spent / stats.project_budget) * 100).toFixed(1)}% Consumed</span>
                    </div>
                    <div className="h-4 bg-[var(--t-surface2)] rounded-full overflow-hidden border border-[var(--t-border)] flex">
                        <div className="h-full bg-[var(--t-primary)] transition-all duration-1000 relative group/bar" style={{ width: `${(stats.total_spent / stats.project_budget) * 100}%` }}>
                            <div className="absolute inset-0 bg-white/20 animate-pulse opacity-0 group-hover/bar:opacity-100 transition-opacity"></div>
                        </div>
                        <div className="h-full bg-[var(--t-primary)]/20 border-l border-white/20" style={{ width: `${((stats.total_funding - stats.total_spent) / stats.project_budget) * 100}%` }}></div>
                    </div>
                    <div className="flex justify-between items-center text-[9px] font-bold text-[var(--t-text3)] italic">
                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[var(--t-primary)]"></div> Actual Cash Out</div>
                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[var(--t-primary)]/20"></div> Pending Liquidity</div>
                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[var(--t-surface2)]"></div> Unfunded Budget</div>
                    </div>
                </div>
            </div>

            {/* 2. Intelligence Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard 
                    title="Live Cash Balance"
                    value={formatCurrency(stats.funding_balance)}
                    subtitle="Liquid and Available"
                    icon="🏦"
                    color="emerald"
                    trend={stats.funding_balance > 0 ? "SURPLUS" : "CRITICAL"}
                />
                <MetricCard 
                    title="Daily Burn Rate"
                    value={formatCurrency(insights?.dailyBurn || 0)}
                    subtitle="Avg. Daily Outflow"
                    icon="🔥"
                    color="orange"
                    trend="VELOCITY"
                />
                <MetricCard 
                    title="Liquidity Runway"
                    value={insights?.runwayDays}
                    unit=" Days"
                    subtitle="Est. Cash Exhaustion"
                    icon="⏳"
                    color="blue"
                    trend={insights?.runwayDays < 15 ? "DANGER" : "STABLE"}
                />
                <MetricCard 
                    title="Total Commitments"
                    value={formatCurrency(stats.total_category_allocation)}
                    subtitle="Planned Assignments"
                    icon="📋"
                    color="purple"
                    trend="ALLOCATED"
                />
            </div>

            {/* 3. Resource Analysis & Risk Radar */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Spending Split */}
                <div className="xl:col-span-2 bg-[var(--t-surface)] rounded-3xl p-8 border border-[var(--t-border)] shadow-xl">
                    <div className="flex justify-between items-center mb-10">
                        <div>
                            <h3 className="text-lg font-black text-[var(--t-text)] uppercase tracking-tighter italic">Resource Distribution</h3>
                            <p className="text-[10px] font-bold text-[var(--t-text3)] uppercase tracking-widest mt-1">Breakdown of capital outflow by entity type</p>
                        </div>
                        <div className="flex gap-2">
                            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 border border-orange-500/20">👷</div>
                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20">🧱</div>
                            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 border border-purple-500/20">📑</div>
                        </div>
                    </div>

                    <div className="space-y-8">
                        <DistributionBar label="Materials (Brick, Cement, Iron)" percent={insights?.distribution.materials} color="bg-blue-500" />
                        <DistributionBar label="Labor & Contractors" percent={insights?.distribution.labor} color="bg-orange-500" />
                        <DistributionBar label="Professional Fees & Government" percent={insights?.distribution.fees} color="bg-purple-500" />
                        <DistributionBar label="Miscellaneous & Others" percent={insights?.distribution.other} color="bg-slate-400" />
                    </div>

                    <div className="mt-10 p-6 bg-[var(--t-surface2)] rounded-2xl border border-[var(--t-border)]">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500">💡</div>
                            <div>
                                <h4 className="text-xs font-black text-[var(--t-text)] uppercase tracking-widest">Financial Insight</h4>
                                <p className="text-xs font-medium text-[var(--t-text2)] mt-1 leading-relaxed opacity-70">
                                    {insights?.distribution.materials > 60 
                                        ? "Inventory intensity is high. Focus on stock wastage reduction to preserve liquidity."
                                        : "Labor costs are trending high. Consider reviewing worker attendance vs project milestones."}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Variance Alerts */}
                <div className="bg-[var(--t-surface2)] rounded-3xl p-8 border border-[var(--t-border)] flex flex-col">
                    <h3 className="text-lg font-black text-[var(--t-text)] uppercase tracking-tighter italic mb-2">Variance Radar</h3>
                    <p className="text-[10px] font-bold text-[var(--t-text3)] uppercase tracking-widest mb-8">Critical budget drift alerts</p>
                    
                    <div className="flex-1 space-y-4">
                        {stats.allocation_analytics?.filter(a => a.is_over).slice(0, 4).map((alert, i) => (
                            <div key={i} className="bg-[var(--t-surface)] p-4 rounded-2xl border-l-4 border-red-500 shadow-sm animate-in fade-in slide-in-from-right-4 duration-500" style={{ animationDelay: `${i * 100}ms` }}>
                                <div className="flex justify-between items-start mb-1">
                                    <span className="text-[9px] font-black text-red-500 uppercase tracking-[0.2em]">{alert.phase_name}</span>
                                    <span className="text-[9px] font-bold text-[var(--t-text3)]">+{((alert.actual / alert.planned - 1) * 100).toFixed(0)}% Error</span>
                                </div>
                                <h4 className="text-xs font-black text-[var(--t-text)] uppercase mb-3">{alert.category_name}</h4>
                                <div className="flex justify-between items-end">
                                    <span className="text-[10px] font-bold text-[var(--t-text2)]">DUE: <span className="font-black text-red-500">{formatCurrency(Math.abs(alert.variance))}</span> Over</span>
                                    <button 
                                        onClick={() => onResolve?.('SPENT_EXCEEDS_PHASE_ALLOCATION', {})}
                                        className="text-[9px] font-black text-[var(--t-primary)] uppercase tracking-widest hover:underline"
                                    >
                                        FIX NOW →
                                    </button>
                                </div>
                            </div>
                        ))}
                        
                        {!stats.allocation_analytics?.some(a => a.is_over) && (
                            <div className="h-full flex flex-col items-center justify-center text-center py-10 opacity-40">
                                <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-4 border border-emerald-500/20">🛡️</div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--t-text3)]">All Phase Allocations<br/>Within Safe Variance</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 4. Detailed Flow Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-10">
                <ProgressSection 
                    title="Category Utilization" 
                    subtitle="Total category allocation vs actual purchases"
                    data={stats.estimated_by_category} 
                    formatCurrency={formatCurrency}
                    color="emerald"
                />
                <ProgressSection 
                    title="Construction Phase Burn" 
                    subtitle="Direct costs and material usage per phase"
                    data={stats.estimated_by_phase} 
                    formatCurrency={formatCurrency}
                    color="blue"
                />
            </div>
        </div>
    );
};

const MetricCard = ({ title, value, unit = "", subtitle, icon, color, trend }) => {
    const colorClasses = {
        emerald: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20 shadow-emerald-500/5",
        orange: "text-orange-500 bg-orange-500/10 border-orange-500/20 shadow-orange-500/5",
        blue: "text-blue-500 bg-blue-500/10 border-blue-500/20 shadow-blue-500/5",
        purple: "text-purple-500 bg-purple-500/10 border-purple-500/20 shadow-purple-500/5",
    };

    return (
        <div className="bg-[var(--t-surface)] p-6 rounded-3xl border border-[var(--t-border)] shadow-xl hover:shadow-2xl transition-all duration-300 group hover:-translate-y-1">
            <div className="flex justify-between items-start mb-6">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl border group-hover:scale-110 transition-transform ${colorClasses[color]}`}>
                    {icon}
                </div>
                <div className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${trend === 'CRITICAL' || trend === 'DANGER' ? 'bg-red-500/10 text-red-500 border-red-500/20 animate-pulse' : 'bg-[var(--t-surface2)] text-[var(--t-text3)] border-[var(--t-border)]'}`}>
                    {trend}
                </div>
            </div>
            <div>
                <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-[var(--t-text)] italic tracking-tighter" style={{ fontFamily: 'var(--f-mono)' }}>{value}</span>
                    <span className="text-sm font-black text-[var(--t-text3)] uppercase">{unit}</span>
                </div>
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--t-text3)] mt-2 mb-0.5">{title}</h4>
                <p className="text-[10px] font-bold text-[var(--t-text2)] opacity-50">{subtitle}</p>
            </div>
        </div>
    );
};

const DistributionBar = ({ label, percent, color }) => (
    <div className="space-y-2">
        <div className="flex justify-between items-end">
            <span className="text-[10px] font-black text-[var(--t-text)] uppercase tracking-widest">{label}</span>
            <span className="text-[10px] font-black text-[var(--t-text)] italic">{(percent || 0).toFixed(1)}%</span>
        </div>
        <div className="h-2 w-full bg-[var(--t-surface2)] rounded-full overflow-hidden flex">
            <div 
                className={`h-full ${color} transition-all duration-1000 relative group`}
                style={{ width: `${percent}%` }}
            >
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>
        </div>
    </div>
);

const ProgressSection = ({ title, subtitle, data, formatCurrency, color }) => (
    <div className="bg-[var(--t-surface)] rounded-3xl p-8 border border-[var(--t-border)] shadow-xl">
        <div className="mb-10">
            <h3 className="text-lg font-black text-[var(--t-text)] uppercase tracking-tighter italic">{title}</h3>
            <p className="text-[10px] font-bold text-[var(--t-text3)] uppercase tracking-widest mt-1">{subtitle}</p>
        </div>
        <div className="space-y-8">
            {data?.map((item, idx) => (
                <ProgressBar
                    key={idx}
                    label={item.category_name || item.phase_name}
                    actual={item.actual}
                    planned={item.planned}
                    variance={item.variance}
                    formatCurrency={formatCurrency}
                    color={color}
                />
            ))}
        </div>
    </div>
);

const ProgressBar = ({ label, actual, planned, variance, color, formatCurrency }) => {
    const isOver = actual > planned;
    const progressPercent = planned > 0 ? (actual / planned) * 100 : 0;
    const visualPercent = Math.min(progressPercent, 100);

    return (
        <div className="space-y-3">
            <div className="flex justify-between items-end px-0.5">
                <div className="flex flex-col">
                    <span className="text-[11px] font-black text-[var(--t-text)] uppercase tracking-tight italic leading-none mb-1.5">{label}</span>
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] text-[var(--t-text3)] font-bold uppercase tracking-tighter">Plan: {formatCurrency(planned)}</span>
                        {variance !== 0 && (
                            <span className={`text-[9px] font-black ${variance < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                {variance < 0 ? '▼' : '▲'} {formatCurrency(Math.abs(variance))}
                            </span>
                        )}
                    </div>
                </div>
                <div className="text-right">
                    <span className={`text-[13px] font-black italic tracking-tighter ${isOver ? 'text-red-600' : 'text-[var(--t-text)]'}`}>
                        {formatCurrency(actual)}
                    </span>
                    <div className={`text-[8px] font-black uppercase tracking-widest mt-0.5 ${isOver ? 'text-red-500' : 'text-[var(--t-text3)]'}`}>
                        {progressPercent.toFixed(1)}% Used
                    </div>
                </div>
            </div>
            <div className="w-full h-1.5 bg-[var(--t-surface2)] rounded-full overflow-hidden border border-[var(--t-border)]/50">
                <div
                    className={`h-full transition-all duration-1000 relative ${isOver ? 'bg-red-500' : color === 'emerald' ? 'bg-emerald-500' : 'bg-blue-500'}`}
                    style={{ width: `${visualPercent}%` }}
                >
                    {isOver && <div className="absolute inset-0 bg-white/30 animate-pulse"></div>}
                </div>
            </div>
        </div>
    );
};

export default BudgetOverview;
