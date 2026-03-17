import React from 'react';

const SummaryCards = ({ budgetStats, dashboardData, formatCurrency }) => {
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-0.5 mb-6">
            {cards.map((c, i) => (
                <div key={i}
                    className="bg-[var(--t-surface)] border border-[var(--t-border)] rounded-[2px] p-4 flex flex-col gap-2 hover:border-[var(--t-primary)] transition-colors group">
                    <div className="flex items-center justify-between">
                        <span className="text-[8px] font-['DM_Mono',monospace] text-[var(--t-text3)] uppercase tracking-widest">{c.label}</span>
                        <span className="text-base leading-none group-hover:scale-110 transition-transform">{c.icon}</span>
                    </div>
                    <div className={`text-[22px] font-['Bebas_Neue',sans-serif] tracking-wide leading-none ${c.valueClass || 'text-[var(--t-text)]'}`}>
                        {c.value}
                    </div>
                    {c.showBar && (
                        <div className="h-1 bg-[var(--t-surface3)] rounded-sm overflow-hidden">
                            <div
                                className={`h-full transition-all duration-1000 ${c.pct > 100 ? 'bg-[var(--t-danger)]' : 'bg-[var(--t-primary)]'}`}
                                style={{ width: `${c.pct}%` }}
                            />
                        </div>
                    )}
                    <span className="text-[8px] font-['DM_Mono',monospace] text-[var(--t-text3)] uppercase tracking-widest">{c.sub}</span>
                </div>
            ))}
        </div>
    );
};

export default SummaryCards;
