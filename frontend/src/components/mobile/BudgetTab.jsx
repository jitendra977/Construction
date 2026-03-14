import React, { useState } from 'react';
import { useConstruction } from '../../context/ConstructionContext';
import ExpenseDetailModal from '../common/ExpenseDetailModal';
import MobileLayout from './MobileLayout';

const BudgetTab = () => {
    const { dashboardData, budgetStats, formatCurrency } = useConstruction();
    const { expenses } = dashboardData;
    const {
        totalBudget,
        totalSpent,
        budgetPercent,
        inventoryValue,
        availableCash,
        totalFunded,
        totalDebt,
        fundingCoverage,
        debtToEquity,
        lowStockItems
    } = budgetStats;

    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedExpenseId, setSelectedExpenseId] = useState(null);

    const handleViewDetail = (id) => {
        setSelectedExpenseId(id);
        setIsDetailModalOpen(true);
    };

    const headerExtra = (
        <div className={`px-3 py-1 rounded-full dynamic-subtitle shadow-sm ${availableCash > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
            {availableCash > 0 ? 'Stable' : 'Deficit'}
        </div>
    );

    return (
        <MobileLayout 
            title="Finance Engine" 
            subtitle="Capital Distribution Data"
            headerExtra={headerExtra}
        >
            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 gap-6">
                <div className="card-glass rounded-[2rem] p-7 shadow-sm hud-border relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-10 text-6xl rotate-12">💰</div>
                    <div className="relative z-10">
                        <p className="text-slate-400 font-black dynamic-subtitle mb-2">Total Utilization</p>
                        <h3 className="text-slate-800 leading-tight dynamic-title">{formatCurrency(totalSpent)}</h3>
                        <p className="text-slate-400 mt-2 dynamic-body italic">of {formatCurrency(totalBudget)} planned</p>

                        <div className="mt-8 space-y-3">
                            <div className="flex justify-between dynamic-subtitle text-slate-500">
                                <span>Used</span>
                                <span className="text-emerald-600">{budgetPercent.toFixed(1)}%</span>
                            </div>
                            <div className="progress-bar h-3">
                                <div
                                    className="progress-fill"
                                    style={{ width: `${Math.min(budgetPercent, 100)}%`, background: 'linear-gradient(90deg, #059669, #34d399)' }}
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 px-1">
                    <div className="bg-emerald-600 rounded-3xl p-5 shadow-lg shadow-emerald-50 relative overflow-hidden group active:scale-95 transition-all">
                        <div className="absolute -bottom-2 -right-2 text-5xl opacity-20 rotate-6">💵</div>
                        <p className="text-emerald-100 font-black dynamic-subtitle mb-1.5">Liquid</p>
                        <p className="text-white dynamic-title">{formatCurrency(availableCash)}</p>
                    </div>

                    <div className="bg-teal-600 rounded-3xl p-5 shadow-lg shadow-teal-50 relative overflow-hidden group active:scale-95 transition-all">
                        <div className="absolute -bottom-2 -right-2 text-5xl opacity-20 -rotate-6">🏗️</div>
                        <p className="text-teal-100 font-black dynamic-subtitle mb-1.5">Inventory</p>
                        <p className="text-white dynamic-title">{formatCurrency(inventoryValue)}</p>
                    </div>
                </div>
            </div>

            {/* Funding & Debt Section */}
            <div className="card-glass rounded-3xl p-6 shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-slate-400 dynamic-subtitle">Equity Matrix</h3>
                    <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full border border-emerald-100 dynamic-subtitle">{fundingCoverage.toFixed(0)}% Cover</span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                    <div className="flex flex-col">
                        <span className="text-slate-400 dynamic-subtitle mb-1">Funded</span>
                        <span className="text-base font-black text-slate-800">{formatCurrency(totalFunded)}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-slate-400 dynamic-subtitle mb-1">Debt</span>
                        <span className="text-base font-black text-red-600">{formatCurrency(totalDebt)}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-slate-400 dynamic-subtitle mb-1">Ratio</span>
                        <span className="text-orange-600 dynamic-title">{debtToEquity}</span>
                    </div>
                </div>
            </div>

            {/* Transaction Log */}
            <div className="px-1">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-slate-800 dynamic-header pl-1">Transaction Feed</h3>
                    {lowStockItems?.length > 0 && (
                        <div className="flex items-center gap-1 bg-amber-50 text-amber-700 px-3 py-1 rounded-full border border-amber-100 animate-pulse">
                            <span className="dynamic-subtitle">{lowStockItems.length} Low Stock</span>
                        </div>
                    )}
                </div>

                <div className="space-y-4">
                    {expenses && expenses.length === 0 ? (
                        <div className="text-center py-16 card-glass rounded-[2rem] border-dashed">
                            <p className="text-slate-300 dynamic-body italic">No records found</p>
                        </div>
                    ) : (
                        expenses?.slice(0, 10).map((expense) => (
                            <div
                                key={expense.id}
                                onClick={() => handleViewDetail(expense.id)}
                                className="card-glass p-5 rounded-3xl flex items-center justify-between active:scale-[0.98] transition-all group"
                            >
                                <div className="flex items-center gap-5">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-sm ${expense.expense_type === 'MATERIAL' ? 'bg-blue-50' : expense.expense_type === 'LABOR' ? 'bg-orange-50' : 'bg-purple-50' }`}>
                                        {expense.expense_type === 'MATERIAL' ? '📦' : expense.expense_type === 'LABOR' ? '👷' : '💸'}
                                    </div>
                                    <div>
                                        <p className="text-slate-800 leading-tight mb-1 dynamic-body font-black">{expense.title}</p>
                                        <span className="text-slate-400 dynamic-subtitle">{new Date(expense.date).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-slate-800 mb-1 dynamic-body font-bold">{formatCurrency(expense.amount)}</p>
                                    <span className={`px-2 py-1 rounded-lg dynamic-subtitle ${Number(expense.balance_due) > 0 ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600' }`}>
                                        {Number(expense.balance_due) > 0 ? 'Due' : 'Paid'}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <ExpenseDetailModal
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                expenseId={selectedExpenseId}
            />
        </MobileLayout>
    );
};

export default BudgetTab;
