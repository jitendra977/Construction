import React, { useState, useEffect } from 'react';
import { accountingService } from '../../../services/api';

const fmt = (v) => 'NPR ' + Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

const BudgetTab = ({ projectId }) => {
    const [budgets, setBudgets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const labels = {
        en: {
            title: 'Phase Budget vs Actual',
            desc: 'Budgeted amount compared to actual spend per phase',
            phase: 'Phase', budgeted: 'Budgeted', spent: 'Spent',
            variance: 'Variance', usage: 'Usage %', status: 'Status',
            total: 'Total', over: 'Over Budget', warn: 'Near Limit', healthy: 'Healthy',
            noBudgets: 'No budget data available.',
        },
        np: {
            title: 'चरण बजेट बनाम वास्तविक',
            desc: 'प्रत्येक चरणको बजेट र वास्तविक खर्चको तुलना',
            phase: 'चरण', budgeted: 'विनियोजित', spent: 'खर्च',
            variance: 'फरक', usage: 'प्रयोग %', status: 'अवस्था',
            total: 'जम्मा', over: 'बजेट नाघेको', warn: 'सीमाको नजिक', healthy: 'सामान्य',
            noBudgets: 'बजेट डेटा उपलब्ध छैन।',
        },
    }.en;

    useEffect(() => {
        if (!projectId) return;
        setLoading(true);
        setError(null);
        accountingService.getBudgetVariance(projectId)
            .then(res => setBudgets(Array.isArray(res.data) ? res.data : []))
            .catch(err => { setError('Failed to load budget data.'); console.error(err); })
            .finally(() => setLoading(false));
    }, [projectId]);

    if (loading) return <div className="p-10 text-center text-[var(--t-text3)] text-sm">Loading budget data...</div>;
    if (error) return <div className="p-10 text-center text-red-500 text-sm">{error}</div>;
    if (!projectId) return <div className="p-10 text-center text-[var(--t-text3)] text-sm">Select a project to view budget data.</div>;

    const totalBudgeted = budgets.reduce((s, b) => s + Number(b.budgeted || 0), 0);
    const totalSpent = budgets.reduce((s, b) => s + Number(b.spent || 0), 0);
    const totalVariance = totalBudgeted - totalSpent;
    const totalPct = totalBudgeted > 0 ? Math.round((totalSpent / totalBudgeted) * 100) : 0;

    const statusLabel = (pct) => pct > 100 ? labels.over : pct > 90 ? labels.warn : labels.healthy;
    const statusClass = (pct) => pct > 100 ? 'bg-red-100 text-red-700' : pct > 90 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700';
    const barClass = (pct) => pct > 100 ? 'bg-red-500' : pct > 90 ? 'bg-amber-400' : 'bg-emerald-500';

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-base font-black text-[var(--t-text)]">{labels.title}</h3>
                <p className="text-sm text-[var(--t-text3)]">{labels.desc}</p>
            </div>

            {budgets.length === 0 ? (
                <div className="p-8 border-2 border-dashed border-[var(--t-border)] rounded-xl text-center text-[var(--t-text3)] text-sm">{labels.noBudgets}</div>
            ) : (
                <div className="bg-[var(--t-surface)] border border-[var(--t-border)] rounded-xl shadow-sm overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead>
                            <tr className="bg-[var(--t-surface2)] border-b border-[var(--t-border)]">
                                {[labels.phase, labels.budgeted, labels.spent, labels.variance, labels.usage, labels.status].map(h => (
                                    <th key={h} className="px-4 py-3 text-xs font-black uppercase tracking-wider text-[var(--t-text3)]">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--t-border)]">
                            {budgets.map((b, i) => {
                                const pct = Number(b.percent_used || 0);
                                const variance = Number(b.budgeted || 0) - Number(b.spent || 0);
                                return (
                                    <tr key={b.phase_name || i} className="hover:bg-[var(--t-surface2)] transition-colors">
                                        <td className="px-4 py-3 text-sm font-semibold text-[var(--t-text)]">{b.phase_name}</td>
                                        <td className="px-4 py-3 text-sm text-[var(--t-text2)]">{fmt(b.budgeted)}</td>
                                        <td className="px-4 py-3 text-sm text-[var(--t-text2)]">{fmt(b.spent)}</td>
                                        <td className={`px-4 py-3 text-sm font-bold ${variance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                            {variance >= 0 ? '+' : ''}{fmt(variance)}
                                        </td>
                                        <td className="px-4 py-3 w-48">
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 h-2 bg-[var(--t-surface2)] rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-500 ${barClass(pct)}`}
                                                        style={{ width: `${Math.min(pct, 100)}%` }}
                                                    />
                                                </div>
                                                <span className={`text-xs font-black shrink-0 ${pct > 100 ? 'text-red-600' : 'text-[var(--t-text3)]'}`}>
                                                    {Math.round(pct)}%
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${statusClass(pct)}`}>
                                                {statusLabel(pct)}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        {/* Summary Row */}
                        <tfoot>
                            <tr className="bg-[var(--t-surface2)] border-t-2 border-[var(--t-border)]">
                                <td className="px-4 py-3 text-sm font-black text-[var(--t-text)] uppercase tracking-wider">{labels.total}</td>
                                <td className="px-4 py-3 text-sm font-black text-[var(--t-text)]">{fmt(totalBudgeted)}</td>
                                <td className="px-4 py-3 text-sm font-black text-[var(--t-text)]">{fmt(totalSpent)}</td>
                                <td className={`px-4 py-3 text-sm font-black ${totalVariance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {totalVariance >= 0 ? '+' : ''}{fmt(totalVariance)}
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 h-2.5 bg-[var(--t-border)] rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${barClass(totalPct)}`}
                                                style={{ width: `${Math.min(totalPct, 100)}%` }}
                                            />
                                        </div>
                                        <span className="text-xs font-black text-[var(--t-text)]">{totalPct}%</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${statusClass(totalPct)}`}>
                                        {statusLabel(totalPct)}
                                    </span>
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}
        </div>
    );
};

export default BudgetTab;
