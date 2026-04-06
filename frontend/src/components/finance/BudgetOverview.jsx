import React, { useState, useEffect } from 'react';
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

    if (loading) return <div className="p-8 text-center text-gray-500 animate-pulse">Loading financial data...</div>;
    if (!stats) return null;

    const health = stats.budget_health || {};
    const hasAlignmentIssues = health.issues?.length > 0;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h2 className="text-2xl font-black tracking-tight" style={{ color: 'var(--t-text)' }}>Financial <span className="opacity-40">Intelligence</span></h2>
                    <p className="text-sm font-medium opacity-70" style={{ color: 'var(--t-text2)' }}>Real-time variance analysis between planned budget and actual costs</p>
                </div>
                <div className={`px-4 py-2 rounded-xl text-sm font-black uppercase tracking-widest border ${health.status === 'HEALTHY'
                    ? 'bg-green-50 text-green-700 border-green-100'
                    : health.status === 'OVER_SPENT'
                        ? 'bg-red-500 text-white border-red-600'
                        : 'bg-orange-50 text-orange-700 border-orange-100'
                    }`}>
                    Status: {health.status.replace('_', ' ')}
                </div>
            </div>

            {hasAlignmentIssues && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="text-xl">🚨</span>
                        <h4 className="text-sm font-black text-red-800 uppercase tracking-tight">Budget Risks Detected</h4>
                    </div>
                    <ul className="space-y-3">
                        {health.issues.map((issue, idx) => (
                            <li key={idx} className="flex items-center justify-between gap-4 bg-white/50 p-2 rounded-lg border border-red-100">
                                <div className="text-xs text-red-700 font-bold flex items-center gap-2">
                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${issue.type.includes('SPENT') ? 'bg-red-600 animate-pulse' : 'bg-red-400'}`}></span>
                                    {issue.message}
                                </div>
                                <button
                                    onClick={() => onResolve?.(issue.type, issue.data)}
                                    className="shrink-0 px-3 py-1.5 bg-red-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-sm active:scale-95"
                                >
                                    Resolve
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Core Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                <StatCard
                    title="Master Capital"
                    amount={formatCurrency(stats.project_budget)}
                    subtitle="Total Project Fund"
                    icon="🏦"
                    percent={100}
                    color="indigo"
                />
                <StatCard
                    title="Total Liquidity"
                    amount={formatCurrency(stats.total_funding)}
                    subtitle="Capital Received"
                    icon="🤝"
                    percent={(stats.total_funding / stats.project_budget) * 100}
                    color="emerald"
                />
                <StatCard
                    title="Planned Assigned"
                    amount={formatCurrency(stats.total_category_allocation)}
                    subtitle="Budget Distributed"
                    icon="📋"
                    percent={health.cat_percent}
                    color="blue"
                />
                <StatCard
                    title="Actual Cash Out"
                    amount={formatCurrency(stats.total_spent)}
                    subtitle="Total Purchases"
                    icon="💸"
                    percent={(stats.total_spent / stats.total_funding) * 100}
                    color="rose"
                    trend={stats.total_spent > stats.total_funding ? 'up' : 'neutral'}
                />
                <StatCard
                    title="Cash Balance"
                    amount={formatCurrency(stats.funding_balance)}
                    subtitle="Live Bank/Cash Float"
                    icon="📉"
                    percent={(stats.funding_balance / stats.total_funding) * 100}
                    color={stats.funding_balance < 0 ? 'red' : 'green'}
                />
            </div>

            {/* Granular Allocation Analytics (Specific Phase-Category Risks) */}
            {stats.allocation_analytics?.some(a => a.is_over) && (
                <div className="bg-white rounded-2xl p-6 border border-red-100 shadow-sm shadow-red-50">
                    <h3 className="text-sm font-black text-red-700 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                        Phase-Category Variance Alerts
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {stats.allocation_analytics.filter(a => a.is_over).map((alloc, idx) => (
                            <div key={idx} className="p-4 rounded-xl border border-red-50 bg-red-50/10 hover:bg-red-50/30 transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{alloc.phase_name}</span>
                                    <span className="text-[10px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-full uppercase tracking-tighter">Budget Blown</span>
                                </div>
                                <h4 className="text-sm font-bold text-gray-900 mb-3">{alloc.category_name}</h4>
                                <div className="flex justify-between items-end">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Planned</span>
                                        <span className="text-xs font-black text-gray-700">{formatCurrency(alloc.planned)}</span>
                                    </div>
                                    <div className="flex flex-col text-right">
                                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Actual</span>
                                        <span className="text-xs font-black text-red-600">{formatCurrency(alloc.actual)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Detailed Breakdowns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
                {/* Categories Progress */}
                <div className="bg-[var(--t-surface)] rounded-2xl p-6 border border-[var(--t-border)] shadow-sm">
                    <h3 className="text-[10px] font-black text-[var(--t-text)] uppercase tracking-[0.2em] mb-6 flex items-center gap-2" style={{ fontFamily: 'var(--f-mono)' }}>
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></span>
                        Category Flow (Planned vs Purchase)
                    </h3>
                    <div className="space-y-5">
                        {stats.estimated_by_category?.map((cat, idx) => (
                            <ProgressBar
                                key={idx}
                                label={cat.category_name}
                                actual={cat.actual}
                                planned={cat.planned}
                                variance={cat.variance}
                                formatCurrency={formatCurrency}
                                color="emerald"
                            />
                        ))}
                    </div>
                </div>

                {/* Phases Progress */}
                <div className="bg-[var(--t-surface)] rounded-2xl p-6 border border-[var(--t-border)] shadow-sm">
                    <h3 className="text-[10px] font-black text-[var(--t-text)] uppercase tracking-[0.2em] mb-6 flex items-center gap-2" style={{ fontFamily: 'var(--f-mono)' }}>
                        <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]"></span>
                        Phase Utilization (Direct + Material Usage)
                    </h3>
                    <div className="space-y-5">
                        {stats.estimated_by_phase?.map((phase, idx) => (
                            <ProgressBar
                                key={idx}
                                label={phase.phase_name}
                                actual={phase.actual}
                                planned={phase.planned}
                                variance={phase.variance}
                                formatCurrency={formatCurrency}
                                color="blue"
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
const StatCard = ({ title, amount, subtitle, icon, percent, color, trend }) => {
    const bgColors = {
        indigo: 'bg-indigo-600 shadow-indigo-100',
        emerald: 'bg-emerald-600 shadow-emerald-100',
        blue: 'bg-blue-600 shadow-blue-100',
        red: 'bg-red-600 shadow-red-100',
        green: 'bg-green-600 shadow-green-100'
    };

    return (
        <div className="bg-[var(--t-surface)] p-6 rounded-2xl border border-[var(--t-border)] shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 group">
            <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl text-white ${bgColors[color] || bgColors.indigo} shadow-lg group-hover:scale-110 transition-transform`}>
                    <span className="text-xl">{icon}</span>
                </div>
                <div className="text-right">
                    <span className="text-xl font-black" style={{ color: 'var(--t-text)' }}>{amount}</span>
                    <div className="flex items-center justify-end gap-1 mt-1">
                        {trend === 'up' && <span className="text-[10px] text-red-500 font-black">▲</span>}
                        <div className={`w-1.5 h-1.5 rounded-full ${percent > 100 ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            {(percent || 0).toFixed(1)}%
                        </span>
                    </div>
                </div>
            </div>
            <div>
                <h4 className="text-[10px] font-black uppercase tracking-[0.15em] mb-1 opacity-40" style={{ color: 'var(--t-text)', fontFamily: 'var(--f-mono)' }}>{title}</h4>
                <p className="text-[10px] font-medium opacity-60" style={{ color: 'var(--t-text2)' }}>{subtitle}</p>
            </div>
        </div>
    );
};

const ProgressBar = ({ label, actual, planned, variance, color, formatCurrency }) => {
    const isOver = actual > planned;
    const progressPercent = planned > 0 ? (actual / planned) * 100 : 0;

    // Use the max of actual/planned as the visual 100% to show overflow
    const visualPercent = Math.min((actual / planned) * 100, 100);

    const barColors = {
        emerald: isOver ? 'bg-red-500' : 'bg-emerald-500',
        blue: isOver ? 'bg-red-500' : 'bg-blue-500'
    };

    return (
        <div className="space-y-2">
            <div className="flex justify-between items-end">
                <div className="flex flex-col">
                    <span className="text-xs font-black text-gray-900 uppercase tracking-tight">{label}</span>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-400 font-bold">Plan: {formatCurrency(planned)}</span>
                        <span className={`text-[10px] font-black ${variance < 0 ? 'text-red-500' : 'text-green-500'}`}>
                            {variance < 0 ? '▼' : '▲'} {formatCurrency(Math.abs(variance))}
                        </span>
                    </div>
                </div>
                <div className="text-right">
                    <span className={`text-xs font-black ${isOver ? 'text-red-600' : 'text-gray-900'}`}>
                        {formatCurrency(actual)}
                    </span>
                    <div className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">
                        {progressPercent.toFixed(1)}% used
                    </div>
                </div>
            </div>
            <div className="w-full h-2 bg-gray-50 rounded-full overflow-hidden border border-gray-100/50">
                <div
                    className={`h-full ${barColors[color] || 'bg-gray-400'} rounded-full transition-all duration-1000 relative`}
                    style={{ width: `${visualPercent}%` }}
                >
                    {isOver && (
                        <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BudgetOverview;
