import React, { useState } from 'react';
import { useConstruction } from '../../context/ConstructionContext';
import ExpenseDetailModal from '../common/ExpenseDetailModal';

const BudgetTab = () => {
    const { dashboardData, budgetStats, formatCurrency } = useConstruction();
    const { expenses } = dashboardData;
    const {
        totalBudget,
        totalSpent,
        remainingBudget,
        budgetPercent,
        totalFunded,
        totalDebt,
        fundingCoverage,
        inventoryValue,
        availableCash,
        debtToEquity,
        lowStockItems
    } = budgetStats;

    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedExpenseId, setSelectedExpenseId] = useState(null);

    const handleViewDetail = (id) => {
        setSelectedExpenseId(id);
        setIsDetailModalOpen(true);
    };

    return (
        <div className="space-y-6 pb-24">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Financial Hub</h2>
                <div className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${availableCash > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {availableCash > 0 ? 'Liquid' : 'Cash Tight'}
                </div>
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 gap-4">
                {/* Budget Utilization Card */}
                <div className="bg-white rounded-2xl p-5 shadow-lg border border-indigo-50 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 text-4xl group-hover:scale-110 transition-transform">💰</div>
                    <div className="relative z-10">
                        <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">Budget Utilization</p>
                        <h3 className="text-3xl font-black text-gray-900">{formatCurrency(totalSpent)}</h3>
                        <p className="text-xs text-gray-400 mt-1">of {formatCurrency(totalBudget)} planned</p>

                        <div className="mt-6 space-y-2">
                            <div className="flex justify-between text-[10px] font-black text-gray-500 uppercase tracking-tighter">
                                <span>Used</span>
                                <span>{budgetPercent.toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden shadow-inner">
                                <div
                                    className={`h-full rounded-full transition-all duration-1000 ${budgetPercent > 90 ? 'bg-red-500' : 'bg-gradient-to-r from-indigo-600 to-purple-600'}`}
                                    style={{ width: `${Math.min(budgetPercent, 100)}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {/* Available Cash */}
                    <div className="bg-emerald-600 rounded-2xl p-4 shadow-xl shadow-emerald-100 relative overflow-hidden">
                        <div className="absolute -bottom-2 -right-2 text-4xl opacity-20 rotate-12">💵</div>
                        <p className="text-emerald-100 text-[9px] font-black uppercase tracking-widest mb-1">Available Cash</p>
                        <p className="text-xl font-black text-white">{formatCurrency(availableCash)}</p>
                        <p className="text-[10px] text-emerald-200 mt-1 font-medium">Ready to deploy</p>
                    </div>

                    {/* Inventory Value */}
                    <div className="bg-indigo-600 rounded-2xl p-4 shadow-xl shadow-indigo-100 relative overflow-hidden">
                        <div className="absolute -bottom-2 -right-2 text-4xl opacity-20 -rotate-12">🏗️</div>
                        <p className="text-indigo-100 text-[9px] font-black uppercase tracking-widest mb-1">Stock Value</p>
                        <p className="text-xl font-black text-white">{formatCurrency(inventoryValue)}</p>
                        <p className="text-[10px] text-indigo-200 mt-1 font-medium">Current Inventory</p>
                    </div>
                </div>
            </div>

            {/* Funding & Debt Section */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Funding & Liquidity</h3>
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{fundingCoverage.toFixed(0)}% Covered</span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                    <div className="flex flex-col">
                        <span className="text-[9px] text-gray-400 font-bold uppercase">Total Funded</span>
                        <span className="text-sm font-black text-gray-900">{formatCurrency(totalFunded)}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[9px] text-gray-400 font-bold uppercase">Total Debt</span>
                        <span className="text-sm font-black text-red-600">{formatCurrency(totalDebt)}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[9px] text-gray-400 font-bold uppercase">Debt Ratio</span>
                        <span className="text-sm font-black text-orange-600">{debtToEquity}</span>
                    </div>
                </div>
            </div>

            {/* Recent Expenses List */}
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Transaction Log</h3>
                    {lowStockItems?.length > 0 && (
                        <div className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-100 animate-pulse">
                            <span className="text-[10px]">⚠️</span>
                            <span className="text-[9px] font-black uppercase">{lowStockItems.length} Low Stock</span>
                        </div>
                    )}
                </div>

                <div className="space-y-3">
                    {expenses && expenses.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100">
                            <p className="text-gray-400 text-xs font-medium italic">No transactions found</p>
                        </div>
                    ) : (
                        expenses?.slice(0, 10).map((expense) => (
                            <div
                                key={expense.id}
                                onClick={() => handleViewDetail(expense.id)}
                                className="bg-white p-4 rounded-2xl shadow-sm border border-gray-50 flex items-center justify-between active:scale-[0.98] transition-all"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-sm ${expense.expense_type === 'MATERIAL' ? 'bg-blue-50 text-blue-500' :
                                        expense.expense_type === 'LABOR' ? 'bg-orange-50 text-orange-500' :
                                            expense.expense_type === 'FEES' ? 'bg-purple-50 text-purple-500' : 'bg-gray-50 text-gray-400'
                                        }`}>
                                        {expense.expense_type === 'MATERIAL' ? '📦' :
                                            expense.expense_type === 'LABOR' ? '👷' :
                                                expense.expense_type === 'FEES' ? '📑' : '💸'}
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-gray-900 leading-none mb-1">{expense.title}</p>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">{new Date(expense.date).toLocaleDateString()}</span>
                                            {expense.category_name && (
                                                <>
                                                    <span className="text-gray-200 text-[8px]">•</span>
                                                    <span className="text-[9px] font-black text-indigo-500 uppercase tracking-tighter">{expense.category_name}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-black text-gray-900">{formatCurrency(expense.amount)}</p>
                                    <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full ${Number(expense.balance_due) > 0 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                                        }`}>
                                        {Number(expense.balance_due) > 0 ? 'Partial' : 'Paid'}
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
        </div>
    );
};

export default BudgetTab;
