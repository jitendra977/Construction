import React from 'react';

const CategoryUtilization = ({ budgetStats, formatCurrency }) => {
    return (
        <div className="bg-white/80 backdrop-blur-md p-8 rounded-3xl border border-white shadow-xl mb-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h3 className="text-[12px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Budget Utilization per Category</h3>
                    <p className="text-sm text-gray-500">Track how much of the allocated {formatCurrency(budgetStats.totalBudget)} is used in each category.</p>
                </div>

                {budgetStats.projectHealth?.status === 'OVER_ALLOCATED' && (
                    <div className="bg-rose-50/50 border border-rose-100 px-4 py-2 rounded-2xl flex items-center gap-3 animate-pulse">
                        <div className="w-2.5 h-2.5 bg-rose-500 rounded-full shadow-lg shadow-rose-200"></div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest leading-none mb-1">Budget Warning</span>
                            <span className="text-[11px] text-rose-500 font-bold whitespace-nowrap">Allocation exceeds total budget by {formatCurrency(budgetStats.projectHealth.excess)}</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-8">
                {budgetStats.categories?.map(cat => (
                    <div key={cat.id} className="group">
                        <div className="flex justify-between items-end mb-2.5">
                            <div className="flex flex-col">
                                <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1 group-hover:text-indigo-600 transition-colors">
                                    {cat.name}
                                </span>
                                <span className="text-[13px] font-black text-gray-900">
                                    {formatCurrency(cat.spent)}
                                </span>
                            </div>
                            <div className={`text-[12px] font-black px-2 py-0.5 rounded-lg ${cat.percent > 95 ? 'text-rose-600 bg-rose-50' : 'text-indigo-600 bg-indigo-50'}`}>
                                {Math.round(cat.percent)}%
                            </div>
                        </div>

                        <div className="relative h-2.5 w-full bg-gray-100 rounded-full overflow-hidden shadow-inner">
                            <div
                                className={`absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out shadow-sm ${cat.percent > 100 ? 'bg-gradient-to-r from-rose-500 to-rose-600 animate-pulse' :
                                    cat.percent > 90 ? 'bg-gradient-to-r from-orange-400 to-orange-500' :
                                        'bg-gradient-to-r from-indigo-500 to-violet-600'
                                    }`}
                                style={{ width: `${Math.min(100, cat.percent)}%` }}
                            />
                            {/* Marker at 100% */}
                            {cat.percent > 100 && (
                                <div className="absolute left-[100%] top-0 bottom-0 w-1 bg-white/50 blur-[1px]"></div>
                            )}
                        </div>

                        <div className="flex justify-between mt-2 px-1">
                            <span className="text-[10px] font-bold text-gray-400">Target: {formatCurrency(cat.amount)}</span>
                            <span className={`text-[10px] font-bold ${cat.remaining < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                {cat.remaining < 0 ? 'Over' : 'Rem'}: {formatCurrency(Math.abs(cat.remaining))}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CategoryUtilization;
