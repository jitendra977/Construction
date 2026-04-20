import React from 'react';

const SummaryCards = ({ budgetStats, dashboardData, formatCurrency, showInsights, setShowInsights }) => {
    const totalLiquidCash = dashboardData.funding?.reduce((acc, f) => acc + Number(f.current_balance), 0);
    const totalOutstandingDues = dashboardData.expenses?.reduce((acc, e) => acc + Number(e.balance_due), 0);

    const cards = [
        {
            label: 'Project Budget',
            value: formatCurrency(budgetStats.totalBudget),
            sub: budgetStats.budgetPercent > 100 ? 'Over Budget' : budgetStats.budgetPercent > 90 ? 'Near Limit' : 'Healthy',
            pct: Math.min(100, budgetStats.budgetPercent),
            showBar: true,
            accent: 'var(--t-primary)',
            icon: '📊',
        },
        {
            label: 'Total Spent',
            value: formatCurrency(budgetStats.totalSpent),
            sub: `Across ${dashboardData.expenses?.length ?? 0} expenses`,
            accent: 'var(--t-danger)',
            icon: '💸',
        },
        {
            label: 'Liquid Cash',
            value: formatCurrency(totalLiquidCash),
            sub: 'Ready for payments',
            accent: 'var(--t-primary)',
            icon: '💳',
        },
        {
            label: 'Total Dues',
            value: formatCurrency(totalOutstandingDues),
            sub: 'Pending vendor bills',
            accent: 'var(--t-warn)',
            icon: '⚠',
            valueClass: 'text-[var(--t-danger)]',
        },
    ];

    return (
        <div className="space-y-4 mb-8">
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-8 bg-[var(--t-primary)] rounded-full"></div>
                    <h2 className="text-[10px] font-black text-[var(--t-text)] uppercase tracking-[0.3em]">Financial Performance</h2>
                </div>
                <button 
                    onClick={() => setShowInsights(!showInsights)}
                    className={`flex items-center gap-3 px-6 py-2 rounded-full border text-[9px] font-black uppercase tracking-widest transition-all ${
                        showInsights 
                        ? 'bg-[var(--t-primary)] text-white border-[var(--t-primary)] shadow-lg shadow-[var(--t-primary)]/20 scale-105' 
                        : 'bg-[var(--t-surface)] text-[var(--t-text3)] border-[var(--t-border)] hover:border-[var(--t-primary)]'
                    }`}
                >
                    {showInsights ? '⚡ Close Insights' : '📈 View Visual Insights'}
                </button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-1">
                {cards.map((c, i) => (
                    <div key={i}
                        className="bg-[var(--t-surface)] border border-[var(--t-border)] rounded-[2px] p-5 flex flex-col gap-3 hover:border-[var(--t-primary)] transition-all duration-300 group hover:-translate-y-1 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black text-[var(--t-text3)] uppercase tracking-widest leading-none">{c.label}</span>
                            <span className="text-xl leading-none group-hover:scale-125 transition-transform duration-500 ease-out grayscale group-hover:grayscale-0">{c.icon}</span>
                        </div>
                        <div className={`text-[26px] font-['Bebas_Neue',sans-serif] tracking-wider leading-none ${c.valueClass || 'text-[var(--t-text)]'}`}>
                            {c.value}
                        </div>
                        {c.showBar ? (
                            <div className="h-1.5 bg-[var(--t-surface3)] rounded-sm overflow-hidden mt-1">
                                <div
                                    className={`h-full transition-all duration-1000 ease-in-out ${c.pct > 100 ? 'bg-[var(--t-danger)] shadow-[0_0_8px_var(--t-danger)]' : 'bg-[var(--t-primary)] shadow-[0_0_8px_var(--t-primary)]'}`}
                                    style={{ width: `${c.pct}%` }}
                                />
                            </div>
                        ) : (
                            <div className="h-1.5 w-full flex gap-1 mt-1">
                                {[...Array(8)].map((_, i) => (
                                    <div key={i} className="flex-1 bg-[var(--t-surface3)] rounded-full opacity-30"></div>
                                ))}
                            </div>
                        )}
                        <span className="text-[8px] font-bold text-[var(--t-text3)] uppercase tracking-widest">{c.sub}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SummaryCards;
