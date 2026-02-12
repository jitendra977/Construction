import { useState } from 'react';
import { useConstruction } from '../../context/ConstructionContext';
import BudgetOverview from '../finance/BudgetOverview';

const DesktopBudget = () => {
    const { dashboardData, budgetStats, formatCurrency } = useConstruction();
    const { expenses } = dashboardData;
    const { totalBudget, totalSpent, remainingBudget, budgetPercent } = budgetStats;
    const [activeTab, setActiveTab] = useState('overview');

    // Calculate category breakdown
    const categoryBreakdown = expenses.reduce((acc, exp) => {
        const cat = exp.category_name || 'General';
        const existing = acc.find(a => a.name === cat);
        if (existing) {
            existing.spent += Number(exp.amount);
            existing.count += 1;
        } else {
            acc.push({ name: cat, spent: Number(exp.amount), count: 1 });
        }
        return acc;
    }, []).sort((a, b) => b.spent - a.spent);

    const tabs = [
        { id: 'overview', label: 'Budget Overview', icon: '📊' },
        { id: 'categories', label: 'Categories', icon: '📁' },
        { id: 'expenses', label: 'Expense History', icon: '📝' }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 shadow-xl">
                <div className="max-w-7xl mx-auto px-6 py-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                                <span className="text-4xl">💰</span>
                                Budget & Financial Management
                            </h1>
                            <p className="text-emerald-100 mt-2 text-lg">
                                Tulsipur Construction Project - Financial Overview
                            </p>
                        </div>
                        <div className="hidden md:flex items-center gap-3 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/20">
                            <svg className="w-5 h-5 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-white font-semibold">Budget Tracking Active</span>
                        </div>
                    </div>

                    {/* Statistics Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                            <div className="text-white/70 text-xs font-semibold uppercase tracking-wide">Total Budget</div>
                            <div className="text-2xl font-bold text-white mt-1">{formatCurrency(totalBudget)}</div>
                            <div className="text-emerald-200 text-xs mt-1">Allocated</div>
                        </div>
                        <div className="bg-red-500/20 backdrop-blur-sm rounded-xl p-4 border border-red-400/30">
                            <div className="text-red-100 text-xs font-semibold uppercase tracking-wide">Total Spent</div>
                            <div className="text-2xl font-bold text-red-50 mt-1">{formatCurrency(totalSpent)}</div>
                            <div className="text-red-200 text-xs mt-1">{expenses.length} expenses</div>
                        </div>
                        <div className="bg-green-500/20 backdrop-blur-sm rounded-xl p-4 border border-green-400/30">
                            <div className="text-green-100 text-xs font-semibold uppercase tracking-wide">Remaining</div>
                            <div className="text-2xl font-bold text-green-50 mt-1">{formatCurrency(remainingBudget)}</div>
                            <div className="text-green-200 text-xs mt-1">{(100 - budgetPercent).toFixed(1)}% left</div>
                        </div>
                        <div className="bg-blue-500/20 backdrop-blur-sm rounded-xl p-4 border border-blue-400/30">
                            <div className="text-blue-100 text-xs font-semibold uppercase tracking-wide">Categories</div>
                            <div className="text-2xl font-bold text-blue-50 mt-1">{categoryBreakdown.length}</div>
                            <div className="text-blue-200 text-xs mt-1">Active</div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-6 bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-white font-semibold text-sm">Budget Utilization</span>
                            <span className="text-white font-bold text-lg">{budgetPercent.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-white/20 rounded-full h-3">
                            <div
                                className={`h-3 rounded-full transition-all ${budgetPercent > 90 ? 'bg-red-400' : budgetPercent > 75 ? 'bg-yellow-400' : 'bg-green-400'
                                    }`}
                                style={{ width: `${Math.min(budgetPercent, 100)}%` }}
                            ></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex gap-1">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-6 py-4 font-semibold text-sm transition-all relative ${activeTab === tab.id
                                        ? 'text-emerald-600 bg-emerald-50'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                    }`}
                            >
                                <span className="flex items-center gap-2">
                                    <span className="text-lg">{tab.icon}</span>
                                    {tab.label}
                                </span>
                                {activeTab === tab.id && (
                                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-600 rounded-t-full"></div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                            <div className="mb-6">
                                <h2 className="text-2xl font-bold text-gray-900">Financial Overview</h2>
                                <p className="text-gray-500 mt-1">Comprehensive budget allocation and spending analysis</p>
                            </div>
                            <BudgetOverview />
                        </div>

                        {/* Quick Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <div className="text-blue-600 text-xs font-semibold uppercase">Avg. Expense</div>
                                        <div className="text-2xl font-bold text-blue-900">
                                            {expenses.length > 0 ? formatCurrency(totalSpent / expenses.length) : 'रू 0'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border border-purple-200">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center">
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <div className="text-purple-600 text-xs font-semibold uppercase">Top Category</div>
                                        <div className="text-xl font-bold text-purple-900">
                                            {categoryBreakdown[0]?.name || 'N/A'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-6 border border-orange-200">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-12 h-12 bg-orange-600 rounded-xl flex items-center justify-center">
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                        </svg>
                                    </div>
                                    <div>
                                        <div className="text-orange-600 text-xs font-semibold uppercase">Burn Rate</div>
                                        <div className="text-xl font-bold text-orange-900">
                                            {budgetPercent > 0 ? `${budgetPercent.toFixed(1)}%` : '0%'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Categories Tab */}
                {activeTab === 'categories' && (
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Spending by Category</h2>
                                <p className="text-gray-500 mt-1">Detailed breakdown of expenses across all categories</p>
                            </div>
                        </div>

                        {categoryBreakdown.length === 0 ? (
                            <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <p className="text-gray-500 font-semibold">No expenses recorded yet</p>
                                <p className="text-gray-400 text-sm mt-1">Start adding expenses to see category breakdown</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {categoryBreakdown.map((cat, idx) => (
                                    <div key={idx} className="bg-gradient-to-br from-gray-50 to-white p-5 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex-1">
                                                <h3 className="font-bold text-gray-900 text-lg">{cat.name}</h3>
                                                <p className="text-xs text-gray-500 mt-1">{cat.count} expense{cat.count !== 1 ? 's' : ''}</p>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xl font-bold text-emerald-600">{formatCurrency(cat.spent)}</div>
                                                <div className="text-xs text-gray-500 mt-1">
                                                    {((cat.spent / totalSpent) * 100).toFixed(1)}%
                                                </div>
                                            </div>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                                            <div
                                                className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2.5 rounded-full transition-all"
                                                style={{ width: `${Math.min((cat.spent / totalSpent) * 100, 100)}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Expenses Tab */}
                {activeTab === 'expenses' && (
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-gray-50 to-white">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Expense History</h2>
                                <p className="text-gray-500 text-sm mt-1">Complete record of all transactions</p>
                            </div>
                            <div className="flex gap-3">
                                <button className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-semibold text-sm flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Add Expense
                                </button>
                                <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-semibold text-sm flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    Export
                                </button>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gradient-to-r from-gray-100 to-gray-50 text-gray-700 text-xs uppercase tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4 font-semibold">Description</th>
                                        <th className="px-6 py-4 font-semibold">Category</th>
                                        <th className="px-6 py-4 font-semibold">Date</th>
                                        <th className="px-6 py-4 font-semibold">Phase</th>
                                        <th className="px-6 py-4 font-semibold text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {expenses.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-12 text-center">
                                                <div className="flex flex-col items-center">
                                                    <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                    <p className="text-gray-500 font-semibold">No expenses recorded yet</p>
                                                    <p className="text-gray-400 text-sm mt-1">Click "Add Expense" to create your first entry</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        expenses.map((expense) => (
                                            <tr key={expense.id} className="hover:bg-emerald-50 transition-colors cursor-pointer">
                                                <td className="px-6 py-4">
                                                    <p className="font-semibold text-gray-900">{expense.title}</p>
                                                    <p className="text-xs text-gray-500 mt-1">{expense.paid_to}</p>
                                                </td>
                                                <td className="px-6 py-4 text-sm">
                                                    <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
                                                        {expense.category_name || 'General'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600">
                                                    {new Date(expense.date).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600">
                                                    {expense.phase_name || '-'}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="font-bold text-red-600 text-lg">
                                                        -{formatCurrency(expense.amount)}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Help Section */}
            <div className="max-w-7xl mx-auto px-6 pb-8">
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-6 border border-emerald-200">
                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-gray-900">Budget Management Tips</h3>
                            <p className="text-gray-600 mt-1 text-sm">
                                Keep your construction project on track by regularly monitoring expenses and maintaining detailed records of all transactions.
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <span className="px-3 py-1 bg-white rounded-lg text-xs font-semibold text-gray-700 border border-gray-200">
                                    💡 Track daily expenses
                                </span>
                                <span className="px-3 py-1 bg-white rounded-lg text-xs font-semibold text-gray-700 border border-gray-200">
                                    📊 Review weekly reports
                                </span>
                                <span className="px-3 py-1 bg-white rounded-lg text-xs font-semibold text-gray-700 border border-gray-200">
                                    ⚠️ Set category limits
                                </span>
                                <span className="px-3 py-1 bg-white rounded-lg text-xs font-semibold text-gray-700 border border-gray-200">
                                    📈 Monitor trends
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DesktopBudget;
