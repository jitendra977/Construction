import { useConstruction } from '../../context/ConstructionContext';

const BudgetTab = () => {
    const { dashboardData, budgetStats, formatCurrency } = useConstruction();
    const { expenses } = dashboardData;
    const { totalBudget, totalSpent, remainingBudget, budgetPercent } = budgetStats;
    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800">Budget Management</h2>

            {/* Budget Overview Card */}
            <div className="bg-white rounded-2xl p-5 shadow-lg border border-purple-50">
                <div className="text-center mb-6">
                    <p className="text-gray-500 text-sm mb-1">Total Budget</p>
                    <h3 className="text-3xl font-bold text-gray-900">{formatCurrency(totalBudget)}</h3>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-red-50 p-3 rounded-xl border border-red-100">
                        <p className="text-xs text-red-500 font-semibold uppercase tracking-wider mb-1">Spent</p>
                        <p className="text-lg font-bold text-red-700">{formatCurrency(totalSpent)}</p>
                    </div>
                    <div className="bg-green-50 p-3 rounded-xl border border-green-100">
                        <p className="text-xs text-green-500 font-semibold uppercase tracking-wider mb-1">Remaining</p>
                        <p className="text-lg font-bold text-green-700">{formatCurrency(remainingBudget)}</p>
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between text-xs font-medium text-gray-600">
                        <span>Utilization</span>
                        <span>{budgetPercent.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                        <div
                            className={`h-full rounded-full ${budgetPercent > 90 ? 'bg-red-500' : 'bg-gradient-to-r from-purple-500 to-indigo-500'}`}
                            style={{ width: `${Math.min(budgetPercent, 100)}%` }}
                        ></div>
                    </div>
                </div>
            </div>

            {/* Recent Expenses List */}
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-gray-800">Recent Expenses</h3>
                    <button className="text-sm text-purple-600 font-semibold">View All</button>
                </div>

                <div className="space-y-3">
                    {expenses.length === 0 ? (
                        <div className="text-center py-8 bg-gray-50 rounded-xl">
                            <p className="text-gray-500">No expenses recorded yet.</p>
                        </div>
                    ) : (
                        expenses.map((expense) => (
                            <div key={expense.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-3">
                                <div className="flex justify-between items-start">
                                    <div className="flex gap-3 items-center">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${expense.expense_type === 'MATERIAL' ? 'bg-blue-50 text-blue-500' :
                                            expense.expense_type === 'LABOR' ? 'bg-orange-50 text-orange-500' :
                                                expense.expense_type === 'FEES' ? 'bg-purple-50 text-purple-500' : 'bg-gray-50 text-gray-400'
                                            }`}>
                                            {expense.expense_type === 'MATERIAL' ? '📦' :
                                                expense.expense_type === 'LABOR' ? '👷' :
                                                    expense.expense_type === 'FEES' ? '👨‍🔬' : '💸'}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900">{expense.title}</p>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[10px] font-bold uppercase ${expense.expense_type === 'MATERIAL' ? 'text-blue-600' :
                                                    expense.expense_type === 'LABOR' ? 'text-orange-600' :
                                                        expense.expense_type === 'FEES' ? 'text-purple-600' : 'text-gray-400'
                                                    }`}>
                                                    {expense.expense_type || 'Material'}
                                                </span>
                                                <span className="text-gray-300">•</span>
                                                <p className="text-xs text-gray-500">{new Date(expense.date).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <span className="font-bold text-red-600">
                                        -{formatCurrency(expense.amount)}
                                    </span>
                                </div>
                                {expense.paid_to && (
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-lg w-fit">
                                        <span className="text-xs text-gray-400">Paid to:</span>
                                        <span className="text-xs font-medium text-gray-700">{expense.paid_to}</span>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>

            <button className="fixed bottom-20 right-4 bg-gradient-to-r from-red-500 to-pink-600 text-white p-4 rounded-full shadow-lg shadow-red-500/30 hover:scale-105 transition-transform">
                <span className="text-2xl">+</span>
            </button>
        </div>
    );
};

export default BudgetTab;
