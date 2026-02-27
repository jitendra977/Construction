import React from 'react';

const SummaryCards = ({ budgetStats, dashboardData, formatCurrency }) => {
    const totalLiquidCash = dashboardData.funding?.reduce((acc, f) => acc + Number(f.current_balance), 0);
    const totalOutstandingDues = dashboardData.expenses?.reduce((acc, e) => acc + Number(e.balance_due), 0);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Total Budget Card */}
            <div className="relative group overflow-hidden bg-white/60 backdrop-blur-xl p-6 rounded-3xl border border-white shadow-xl hover:shadow-2xl transition-all duration-500">
                <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-all duration-500"></div>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600 group-hover:scale-110 transition-transform duration-500 shadow-sm">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                        </div>
                        <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Project Budget</span>
                    </div>
                    <div className="text-3xl font-black text-gray-900 mb-2 truncate" title={formatCurrency(budgetStats.totalBudget)}>
                        {formatCurrency(budgetStats.totalBudget)}
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-bold text-gray-500">
                        <span>Status: {budgetStats.budgetPercent > 100 ? 'Over Budget' : budgetStats.budgetPercent > 90 ? 'Near Limit' : 'Healthy'}</span>
                        <div className="w-24 bg-gray-100 h-2 rounded-full overflow-hidden shadow-inner">
                            <div
                                className={`h-full transition-all duration-1000 ${budgetStats.budgetPercent > 100 ? 'bg-rose-500 animate-pulse' : 'bg-gradient-to-r from-indigo-500 to-blue-600'}`}
                                style={{ width: `${Math.min(100, budgetStats.budgetPercent)}%` }}
                            ></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Spent Card */}
            <div className="relative group overflow-hidden bg-white/60 backdrop-blur-xl p-6 rounded-3xl border border-white shadow-xl hover:shadow-2xl transition-all duration-500">
                <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl group-hover:bg-rose-500/20 transition-all duration-500"></div>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-rose-50 rounded-2xl text-rose-600 group-hover:scale-110 transition-transform duration-500 shadow-sm">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Total Spent</span>
                    </div>
                    <div className="text-3xl font-black text-gray-900 mb-2 truncate" title={formatCurrency(budgetStats.totalSpent)}>
                        {formatCurrency(budgetStats.totalSpent)}
                    </div>
                    <div className="text-[11px] text-rose-500 font-bold bg-rose-50 px-2 py-1 rounded-lg inline-block">
                        Across {dashboardData.expenses?.length} expenses
                    </div>
                </div>
            </div>

            {/* Liquid Cash Card */}
            <div className="relative group overflow-hidden bg-white/60 backdrop-blur-xl p-6 rounded-3xl border border-white shadow-xl hover:shadow-2xl transition-all duration-500">
                <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all duration-500"></div>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600 group-hover:scale-110 transition-transform duration-500 shadow-sm">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        </div>
                        <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Liquid Cash</span>
                    </div>
                    <div className="text-3xl font-black text-gray-900 mb-2 truncate" title={formatCurrency(totalLiquidCash)}>
                        {formatCurrency(totalLiquidCash)}
                    </div>
                    <div className="text-[11px] text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded-lg inline-block">
                        Ready for payments
                    </div>
                </div>
            </div>

            {/* Outstanding Card */}
            <div className="relative group overflow-hidden bg-white/60 backdrop-blur-xl p-6 rounded-3xl border border-white shadow-xl hover:shadow-2xl transition-all duration-500">
                <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl group-hover:bg-amber-500/20 transition-all duration-500"></div>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-amber-50 rounded-2xl text-amber-600 group-hover:scale-110 transition-transform duration-500 shadow-sm">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        </div>
                        <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Total Dues</span>
                    </div>
                    <div className="text-3xl font-black text-rose-600 mb-2 truncate" title={formatCurrency(totalOutstandingDues)}>
                        {formatCurrency(totalOutstandingDues)}
                    </div>
                    <div className="text-[11px] text-amber-600 font-bold bg-amber-50 px-2 py-1 rounded-lg inline-block">
                        Pending vendor bills
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SummaryCards;
