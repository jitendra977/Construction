import React, { useMemo } from 'react';

const FinanceInsights = ({ dashboardData, formatCurrency }) => {
    const { expenses = [], budgetCategories = [] } = dashboardData;

    // 1. Category Utilization Data
    const categoryStats = useMemo(() => {
        return budgetCategories.map(cat => {
            const spent = expenses
                .filter(e => e.category === cat.id && !e.is_inventory_usage)
                .reduce((sum, e) => sum + Number(e.amount), 0);
            
            const allocation = Number(cat.allocation || 0);
            const pct = allocation > 0 ? Math.min((spent / allocation) * 100, 100) : 0;
            const isOver = spent > allocation;

            return { id: cat.id, name: cat.name, spent, allocation, pct, isOver };
        }).sort((a, b) => b.spent - a.spent);
    }, [expenses, budgetCategories]);

    // 2. Spending Trend (Last 30 days)
    const trendData = useMemo(() => {
        const last30Days = [...Array(30)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (29 - i));
            return d.toISOString().split('T')[0];
        });

        const points = last30Days.map(date => {
            const dailyTotal = expenses
                .filter(e => e.date === date && !e.is_inventory_usage)
                .reduce((sum, e) => sum + Number(e.amount), 0);
            return dailyTotal;
        });

        const max = Math.max(...points, 1);
        // Normalize points for SVG viewport (100x40)
        return points.map((p, i) => ({
            x: (i / 29) * 100,
            y: 40 - (p / max) * 35 // Leave some padding top
        }));
    }, [expenses]);

    const polylinePath = trendData.map(p => `${p.x},${p.y}`).join(' ');

    return (
        <div className="bg-[var(--t-surface)] border border-[var(--t-border)] rounded-[2px] overflow-hidden animate-in slide-in-from-top-4 duration-500 mb-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 divide-x divide-[var(--t-border)]">
                
                {/* Left: Category Utilization */}
                <div className="p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-[10px] font-black text-[var(--t-text)] uppercase tracking-[0.2em] flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[var(--t-primary)] shadow-[0_0_8px_var(--t-primary)]"></span>
                            Budget Utilization per Category
                        </h3>
                        <span className="text-[8px] font-['DM_Mono',monospace] text-[var(--t-text3)] uppercase">Spend vs Allocation</span>
                    </div>

                    <div className="space-y-4">
                        {categoryStats.slice(0, 5).map(cat => (
                            <div key={cat.id} className="space-y-1.5">
                                <div className="flex justify-between items-end">
                                    <span className="text-[11px] font-bold text-[var(--t-text2)] uppercase">{cat.name}</span>
                                    <div className="text-right">
                                        <span className={`text-[11px] font-black ${cat.isOver ? 'text-[var(--t-danger)]' : 'text-[var(--t-text)]'}`}>
                                            {formatCurrency(cat.spent)}
                                        </span>
                                        <span className="text-[9px] text-[var(--t-text3)] ml-1">/ {formatCurrency(cat.allocation)}</span>
                                    </div>
                                </div>
                                <div className="h-1.5 bg-[var(--t-surface3)] rounded-sm overflow-hidden flex">
                                    <div 
                                        className={`h-full transition-all duration-1000 ${cat.isOver ? 'bg-[var(--t-danger)]' : 'bg-[var(--t-primary)]'}`}
                                        style={{ width: `${cat.pct}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: Daily Spending Trend */}
                <div className="p-6 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-[10px] font-black text-[var(--t-text)] uppercase tracking-[0.2em] flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[var(--t-info)] shadow-[0_0_8px_var(--t-info)]"></span>
                            30-Day Cash Burn Velocity
                        </h3>
                        <div className="flex items-center gap-2">
                             <div className="flex items-center gap-1">
                                <span className="w-2 h-0.5 bg-[var(--t-info)]"></span>
                                <span className="text-[8px] font-bold text-[var(--t-text3)] uppercase">Intensity</span>
                             </div>
                        </div>
                    </div>

                    <div className="flex-1 min-h-[120px] relative mt-4 flex items-end">
                        <svg viewBox="0 0 100 40" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                            <defs>
                                <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="var(--t-info)" stopOpacity="0.4" />
                                    <stop offset="100%" stopColor="var(--t-info)" stopOpacity="0" />
                                </linearGradient>
                            </defs>
                            
                            {/* Grid lines */}
                            <line x1="0" y1="40" x2="100" y2="40" stroke="var(--t-border)" strokeWidth="0.1" />
                            <line x1="0" y1="20" x2="100" y2="20" stroke="var(--t-border)" strokeWidth="0.1" strokeDasharray="1,1" />
                            <line x1="0" y1="0" x2="100" y2="0" stroke="var(--t-border)" strokeWidth="0.1" strokeDasharray="1,1" />

                            {/* Area fill */}
                            <path 
                                d={`M 0,40 L ${polylinePath} L 100,40 Z`} 
                                fill="url(#trendGradient)" 
                                className="transition-all duration-1000"
                            />
                            
                            {/* Trend line */}
                            <polyline
                                fill="none"
                                stroke="var(--t-info)"
                                strokeWidth="0.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                points={polylinePath}
                                className="transition-all duration-1000"
                            />

                            {/* Data points (dots on peaks) */}
                            {trendData.filter((p, i) => i % 3 === 0).map((p, i) => (
                                <circle key={i} cx={p.x} cy={p.y} r="0.8" fill="var(--t-bg)" stroke="var(--t-info)" strokeWidth="0.3" />
                            ))}
                        </svg>
                    </div>

                    <div className="flex justify-between items-center mt-6 pt-4 border-t border-[var(--t-border)]">
                        <div>
                            <p className="text-[8px] font-black text-[var(--t-text3)] uppercase tracking-widest mb-1">Avg. Daily Burn</p>
                            <p className="text-[16px] font-['Bebas_Neue',sans-serif] text-[var(--t-text)] leading-none">
                                {formatCurrency(expenses.length ? expenses.reduce((sum, e) => sum + Number(e.amount), 0) / 30 : 0)}
                            </p>
                        </div>
                        <div className="text-right">
                             <p className="text-[8px] font-black text-[var(--t-text3)] uppercase tracking-widest mb-1">Volatility</p>
                             <div className="flex items-center gap-1 justify-end">
                                <span className="text-[10px] font-bold text-[var(--t-primary)] uppercase tracking-tight">Stable Flow</span>
                                <span className="text-[12px]">✨</span>
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FinanceInsights;
