import { useConstruction } from '../../context/ConstructionContext';

const DesktopBudget = () => {
    const { dashboardData, budgetStats, formatCurrency } = useConstruction();
    const { expenses } = dashboardData;
    const { totalBudget, totalSpent, remainingBudget, budgetPercent } = budgetStats;
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">Budget Overview</h2>
                <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium">
                    + Add New Expense
                </button>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-sm text-gray-500 mb-1">Total Budget</p>
                    <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(totalBudget)}</h3>
                    <div className="mt-4 w-full bg-gray-100 rounded-full h-1.5">
                        <div className="bg-gray-900 h-1.5 rounded-full" style={{ width: '100%' }}></div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-sm text-gray-500 mb-1">Total Spent</p>
                    <h3 className="text-2xl font-bold text-red-600">{formatCurrency(totalSpent)}</h3>
                    <div className="mt-4 w-full bg-gray-100 rounded-full h-1.5">
                        <div className="bg-red-500 h-1.5 rounded-full" style={{ width: `${Math.min(budgetPercent, 100)}%` }}></div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-sm text-gray-500 mb-1">Remaining</p>
                    <h3 className="text-2xl font-bold text-green-600">{formatCurrency(remainingBudget)}</h3>
                    <div className="mt-4 w-full bg-gray-100 rounded-full h-1.5">
                        <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${Math.max(0, 100 - budgetPercent)}%` }}></div>
                    </div>
                </div>
            </div>

            {/* Category Breakdown */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-4">Spending by Category</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {expenses.reduce((acc, exp) => {
                        const cat = exp.category_name || 'General';
                        const existing = acc.find(a => a.name === cat);
                        if (existing) existing.spent += Number(exp.amount);
                        else acc.push({ name: cat, spent: Number(exp.amount) });
                        return acc;
                    }, []).map((cat, idx) => (
                        <div key={idx} className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600 font-medium">{cat.name}</span>
                                <span className="text-gray-900 font-bold">{formatCurrency(cat.spent)}</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2">
                                <div
                                    className="bg-indigo-500 h-2 rounded-full"
                                    style={{ width: `${Math.min((cat.spent / totalSpent) * 100, 100)}%` }}
                                ></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Expenses Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-gray-900">Expense History</h3>
                    <button className="text-indigo-600 text-sm font-medium hover:text-indigo-800">Export Report</button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-3 font-medium">Description</th>
                                <th className="px-6 py-3 font-medium">Category</th>
                                <th className="px-6 py-3 font-medium">Date</th>
                                <th className="px-6 py-3 font-medium">Phase</th>
                                <th className="px-6 py-3 font-medium text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {expenses.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                                        No expenses recorded yet.
                                    </td>
                                </tr>
                            ) : (
                                expenses.map((expense) => (
                                    <tr key={expense.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="font-semibold text-gray-900">{expense.title}</p>
                                            <p className="text-xs text-gray-500">{expense.paid_to}</p>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            <span className="px-2 py-1 rounded bg-gray-100 text-gray-700 text-xs font-semibold">
                                                {expense.category_name || 'General'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {new Date(expense.date).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {expense.phase_name || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right font-medium text-red-600">
                                            -{formatCurrency(expense.amount)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default DesktopBudget;
