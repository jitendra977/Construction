import React, { useState } from 'react';
import { dashboardService } from '../../../services/api';
import Modal from '../../common/Modal';
import { useConstruction } from '../../../context/ConstructionContext';
import ExpenseDetailModal from '../../common/ExpenseDetailModal';

const ExpensesTab = ({ searchQuery = '' }) => {
    const { dashboardData, refreshData, formatCurrency, budgetStats } = useConstruction();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedExpenseId, setSelectedExpenseId] = useState(null);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({});
    const [loading, setLoading] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [activeExpense, setActiveExpense] = useState(null);
    const [paymentFormData, setPaymentFormData] = useState({
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        method: 'CASH',
        reference_id: ''
    });

    const filteredExpenses = dashboardData.expenses?.filter(e =>
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.paid_to?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.category_name?.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    const handleOpenModal = (expense = null) => {
        setEditingItem(expense);
        setFormData(expense ? { ...expense } : {
            category: dashboardData.budgetCategories[0]?.id,
            date: new Date().toISOString().split('T')[0],
            expense_type: 'MATERIAL'
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this Expense?')) return;
        try {
            await dashboardService.deleteExpense(id);
            refreshData();
        } catch (error) {
            alert('Delete failed.');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            let dataToSubmit = { ...formData };
            // Sanitize foreign keys
            ['supplier', 'contractor', 'material', 'room', 'phase', 'category', 'funding_source'].forEach(key => {
                if (dataToSubmit[key] === '') dataToSubmit[key] = null;
            });

            if (editingItem) await dashboardService.updateExpense(editingItem.id, dataToSubmit);
            else await dashboardService.createExpense(dataToSubmit);
            setIsModalOpen(false);
            refreshData();
        } catch (error) {
            alert('Save failed.');
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetail = (id) => {
        setSelectedExpenseId(id);
        setIsDetailModalOpen(true);
    };

    const handleOpenPaymentModal = (expense) => {
        setActiveExpense(expense);

        let defaultMethod = 'CASH';
        if (expense.funding_source) {
            const fs = dashboardData.funding?.find(f => f.id === expense.funding_source);
            if (fs?.default_payment_method) defaultMethod = fs.default_payment_method;
        }

        setPaymentFormData({
            amount: expense.balance_due,
            date: new Date().toISOString().split('T')[0],
            method: defaultMethod,
            reference_id: ''
        });
        setIsPaymentModalOpen(true);
    };

    const handlePaymentSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await dashboardService.createPayment({
                ...paymentFormData,
                expense: activeExpense.id,
                amount: parseFloat(paymentFormData.amount)
            });
            setIsPaymentModalOpen(false);
            refreshData();
        } catch (error) {
            console.error("Payment error:", error);
            alert('Payment recording failed. Please check the console.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Financial Health Summary Bar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Project Budget</div>
                    <div className="text-xl font-black text-gray-900">{formatCurrency(budgetStats.totalBudget)}</div>
                    <div className="w-full bg-gray-100 h-1 rounded-full mt-2 overflow-hidden">
                        <div className="bg-indigo-500 h-full" style={{ width: `${Math.min(100, budgetStats.budgetPercent)}%` }}></div>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Material Spent</div>
                    <div className="text-xl font-black text-indigo-600">{formatCurrency(budgetStats.totalSpent)}</div>
                    <div className="text-[10px] text-gray-400 font-bold mt-1">Across {dashboardData.expenses?.length} items</div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm border-l-4 border-l-blue-500">
                    <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Inventory Asset Value</div>
                    <div className="text-xl font-black text-blue-700">
                        {formatCurrency(budgetStats.inventoryValue)}
                    </div>
                    <div className="text-[10px] text-blue-400 font-bold mt-1">Value of current stock</div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm border-l-4 border-l-emerald-500">
                    <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Liquid Cash (Bachat)</div>
                    <div className="text-xl font-black text-emerald-700">
                        {formatCurrency(dashboardData.funding?.reduce((acc, f) => acc + Number(f.current_balance), 0))}
                    </div>
                    <div className="text-[10px] text-emerald-500 font-bold mt-1">Ready for next payment</div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm border-l-4 border-l-red-500">
                    <div className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Total Outstanding Dues</div>
                    <div className="text-xl font-black text-red-600">
                        {formatCurrency(dashboardData.expenses?.reduce((acc, e) => acc + Number(e.balance_due), 0))}
                    </div>
                    <div className="text-[10px] text-red-400 font-bold mt-1">Pending vendor bills</div>
                </div>
            </div>

            {/* Budget Utilization per Category */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm mb-6">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Budget Utilization per Category</h3>
                        <p className="text-[10px] text-gray-400 font-medium italic">How much of the allocated {formatCurrency(budgetStats.totalBudget)} is used?</p>
                    </div>

                    {budgetStats.projectHealth?.status === 'OVER_ALLOCATED' && (
                        <div className="bg-red-50 border border-red-100 px-3 py-1.5 rounded-lg flex items-center gap-2 animate-pulse">
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black text-red-600 uppercase tracking-tighter leading-none">बजेट चेतावनी (Budget Warning)</span>
                                <span className="text-[8px] text-red-500 font-bold">विनियोजन रकमले कुल बजेटलाई {formatCurrency(budgetStats.projectHealth.excess)} ले नाघ्यो</span>
                            </div>
                        </div>
                    )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
                    {budgetStats.categories?.map(cat => (
                        <div key={cat.id} className="space-y-1.5">
                            <div className="flex justify-between items-center text-[10px] font-bold">
                                <span className="text-gray-700 uppercase tracking-tight">{cat.name}</span>
                                <span className={cat.percent > 90 ? 'text-red-600' : 'text-indigo-600'}>
                                    {Math.round(cat.percent)}% Used
                                </span>
                            </div>
                            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-700 ${cat.percent > 100 ? 'bg-red-500' :
                                        cat.percent > 90 ? 'bg-orange-500' :
                                            'bg-indigo-500'
                                        }`}
                                    style={{ width: `${Math.min(100, cat.percent)}%` }}
                                />
                            </div>
                            <div className="flex justify-between text-[9px] font-bold text-gray-400 px-0.5">
                                <span>Spent: {formatCurrency(cat.spent)}</span>
                                <span>Rem: {formatCurrency(cat.remaining)}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center mb-6">
                <p className="text-sm text-gray-500">Track all project spending, material purchases, and labor payments.</p>
                <button
                    onClick={() => handleOpenModal()}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors shadow-sm"
                >
                    + Add New Expense
                </button>
            </div>

            {/* Desktop View: Table */}
            <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Expense Details</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Total / Balance</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Paid To / Date</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filteredExpenses.map(e => (
                            <tr key={e.id} className="hover:bg-gray-50 transition-colors group">
                                <td className="px-6 py-4 cursor-pointer" onClick={() => handleViewDetail(e.id)}>
                                    <div className="flex items-center gap-2">
                                        <div className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{e.title}</div>
                                        {e.material_transaction && (
                                            <span className="px-2 py-0.5 bg-indigo-50/50 text-indigo-700 text-[9px] font-black uppercase rounded border border-indigo-200 tracking-tighter" title="Auto-generated from Material Inventory receipt">
                                                Auto: Stock-In
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-1">
                                        <span className={`px-1.5 py-0.5 rounded-[4px] text-[8px] font-black tracking-wider uppercase ${e.expense_type === 'MATERIAL' ? 'bg-blue-50 text-blue-600' :
                                            e.expense_type === 'LABOR' ? 'bg-orange-50 text-orange-600' :
                                                e.expense_type === 'FEES' ? 'bg-purple-50 text-purple-600' : 'bg-gray-50 text-gray-600'
                                            }`}>
                                            {e.expense_type}
                                        </span>
                                        <span className="text-[10px] text-gray-400 font-bold">#{e.category_name}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${e.status === 'PAID' ? 'bg-green-100 text-green-700' :
                                        e.status === 'PARTIAL' ? 'bg-amber-100 text-amber-700' :
                                            'bg-red-100 text-red-700'
                                        }`}>
                                        {e.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="text-gray-900 font-bold text-sm">{formatCurrency(e.amount)}</span>
                                        {Number(e.balance_due) > 0 && (
                                            <div className="flex items-center gap-1 mt-0.5">
                                                <span className="text-[10px] text-red-500 font-black">Due: {formatCurrency(e.balance_due)}</span>
                                                <div className="w-12 bg-gray-100 h-1 rounded-full overflow-hidden">
                                                    <div className="bg-green-500 h-full" style={{ width: `${(Number(e.total_paid) / Number(e.amount)) * 100}%` }} />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-xs font-black text-gray-700 uppercase tracking-tight">{e.paid_to || '-'}</div>
                                    <div className="text-[10px] text-gray-400 font-medium">{new Date(e.date).toLocaleDateString(undefined, { dateStyle: 'medium' })}</div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end items-center gap-2">
                                        <button
                                            onClick={() => handleViewDetail(e.id)}
                                            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                            title="View Full Details"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                        </button>
                                        {Number(e.balance_due) > 0 && (
                                            <button
                                                onClick={() => handleOpenPaymentModal(e)}
                                                className={`px-3 py-1 text-white text-[10px] font-black uppercase tracking-wider rounded-lg shadow-sm transition-all whitespace-nowrap flex items-center gap-1 ${(() => {
                                                    const fs = dashboardData.funding?.find(f => f.id === e.funding_source);
                                                    return fs?.source_type === 'LOAN' ? 'bg-orange-600 hover:bg-orange-700' :
                                                        fs?.source_type === 'BORROWED' ? 'bg-purple-600 hover:bg-purple-700' :
                                                            'bg-green-600 hover:bg-green-700';
                                                })()}`}
                                            >
                                                <span>Pay</span>
                                                {e.funding_source && (
                                                    <span className="opacity-75 font-medium ml-0.5 border-l border-white/20 pl-1 flex items-center gap-1">
                                                        <span className="max-w-[40px] truncate">{e.funding_source_name?.split(' ')[0]}</span>
                                                        <span className="opacity-50">•</span>
                                                        {(() => {
                                                            const fs = dashboardData.funding?.find(f => f.id === e.funding_source);
                                                            const method = fs?.default_payment_method;
                                                            return method === 'BANK_TRANSFER' ? 'IPS' :
                                                                method === 'CASH' ? 'Nagad' :
                                                                    method === 'QR' ? 'eSewa' :
                                                                        method === 'CHECK' ? 'Cheque' : 'Ref';
                                                        })()}
                                                    </span>
                                                )}
                                            </button>
                                        )}
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleOpenModal(e)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-5M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
                                            </button>
                                            <button onClick={() => handleDelete(e.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredExpenses.length === 0 && (
                            <tr>
                                <td colSpan="5" className="px-6 py-10 text-center text-gray-400 italic text-sm">No expenses found matching your search.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile View: Cards */}
            <div className="lg:hidden space-y-4">
                {filteredExpenses.map(e => (
                    <div key={e.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col gap-4">
                        <div className="flex justify-between items-start">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{new Date(e.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                    <span className="w-1 h-1 bg-gray-300 rounded-full" />
                                    <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest leading-none">#{e.category_name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-gray-900 text-base leading-tight">{e.title}</h3>
                                    {e.material_transaction && (
                                        <span className="px-2 py-0.5 bg-indigo-50/50 text-indigo-700 text-[9px] font-black uppercase rounded border border-indigo-200 tracking-tighter" title="Auto-generated from Material Inventory receipt">Auto: Stock-In</span>
                                    )}
                                </div>
                                {e.paid_to && <p className="text-[10px] text-gray-500 mt-1 font-bold">Paid to: {e.paid_to}</p>}
                            </div>
                            <div className="text-right">
                                <div className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tight mb-2 inline-block ${e.status === 'PAID' ? 'bg-green-100 text-green-700' :
                                    e.status === 'PARTIAL' ? 'bg-amber-100 text-amber-700' :
                                        'bg-red-100 text-red-700'
                                    }`}>
                                    {e.status}
                                </div>
                                <div className="text-sm font-black text-gray-900 leading-none">{formatCurrency(e.amount)}</div>
                                {Number(e.balance_due) > 0 && (
                                    <div className="text-[9px] font-black text-red-500 mt-1 uppercase tracking-tighter">Due: {formatCurrency(e.balance_due)}</div>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div className="col-span-2 grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => handleViewDetail(e.id)}
                                    className="py-2.5 bg-gray-50 text-gray-700 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                    View Detail
                                </button>
                                {Number(e.balance_due) > 0 && (
                                    <button
                                        onClick={() => handleOpenPaymentModal(e)}
                                        className={`py-2.5 text-white rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-sm flex items-center justify-center gap-1 ${(() => {
                                            const fs = dashboardData.funding?.find(f => f.id === e.funding_source);
                                            return fs?.source_type === 'LOAN' ? 'bg-orange-600 shadow-orange-200' :
                                                fs?.source_type === 'BORROWED' ? 'bg-purple-600 shadow-purple-200' :
                                                    'bg-green-600 shadow-green-200';
                                        })()}`}
                                    >
                                        Pay Dues
                                    </button>
                                )}
                            </div>
                            <button
                                onClick={() => handleOpenModal(e)}
                                className="py-2.5 bg-indigo-50 text-indigo-700 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-5M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
                                Edit
                            </button>
                            <button
                                onClick={() => handleDelete(e.id)}
                                className="py-2.5 bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                Delete
                            </button>
                        </div>
                    </div>
                ))}
                {filteredExpenses.length === 0 && (
                    <div className="py-10 text-center text-gray-400 italic bg-white rounded-2xl border-2 border-dashed border-gray-100">
                        No expenses found matching your search.
                    </div>
                )}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`${editingItem ? 'Edit' : 'Add'} Expense`}>
                <form onSubmit={handleSubmit} className="space-y-4 p-1">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Expense Title</label>
                            <input
                                type="text"
                                value={formData.title || ''}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none"
                                placeholder="e.g. 50 Bags Cement"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Expense Type</label>
                            <select
                                value={formData.expense_type || 'MATERIAL'}
                                onChange={e => setFormData({ ...formData, expense_type: e.target.value })}
                                className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none appearance-none bg-white"
                                required
                            >
                                <option value="MATERIAL">Material Purchase</option>
                                <option value="LABOR">Labor/Worker Payment</option>
                                <option value="FEES">Professional Fees</option>
                                <option value="GOVT">Government/Permit Fees</option>
                                <option value="OTHER">Other</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Date</label>
                            <input
                                type="date"
                                value={formData.date || ''}
                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                                className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Expense Amount (Rs.)</label>
                            <input
                                type="number"
                                value={formData.amount || 0}
                                onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                className={`w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none font-black text-indigo-600 ${formData.expense_type === 'MATERIAL' && formData.material ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : ''}`}
                                disabled={formData.expense_type === 'MATERIAL' && !!formData.material}
                                required
                            />
                            {formData.expense_type === 'MATERIAL' && formData.material && (
                                <p className="text-[10px] text-indigo-500 mt-1 font-bold italic">Calculated: Qty × Unit Price</p>
                            )}
                        </div>
                    </div>

                    {/* Material Integration Fields */}
                    {formData.expense_type === 'MATERIAL' && (
                        <div className="bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100/50 space-y-4">
                            <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                                Inventory Details (Stock In)
                            </h3>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Select Material</label>
                                <select
                                    value={formData.material || ''}
                                    onChange={e => {
                                        const mat = dashboardData.materials?.find(m => m.id === parseInt(e.target.value));
                                        setFormData({
                                            ...formData,
                                            material: e.target.value,
                                            unit: mat?.unit || ''
                                        });
                                    }}
                                    className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none appearance-none bg-white"
                                >
                                    <option value="">Select Material for Inventory</option>
                                    {dashboardData.materials?.map(m => (
                                        <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
                                    ))}
                                </select>
                            </div>
                            {formData.material && (
                                <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">Quantity ({formData.unit || 'Units'})</label>
                                        <input
                                            type="number"
                                            value={formData.quantity || ''}
                                            onChange={e => {
                                                const qty = parseFloat(e.target.value) || 0;
                                                const up = parseFloat(formData.unit_price) || 0;
                                                setFormData({ ...formData, quantity: e.target.value, amount: (qty * up).toFixed(2) });
                                            }}
                                            className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none font-bold"
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">Unit Price (Rs.)</label>
                                        <input
                                            type="number"
                                            value={formData.unit_price || ''}
                                            onChange={e => {
                                                const up = parseFloat(e.target.value) || 0;
                                                const qty = parseFloat(formData.quantity) || 0;
                                                setFormData({ ...formData, unit_price: e.target.value, amount: (qty * up).toFixed(2) });
                                            }}
                                            className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none font-bold text-green-600"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Construction Phase</label>
                            <select
                                value={formData.phase || ''}
                                onChange={e => setFormData({ ...formData, phase: e.target.value })}
                                className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none appearance-none bg-white font-medium"
                            >
                                <option value="">Entire Project (General)</option>
                                {dashboardData.phases?.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Target Room / Area</label>
                            <select
                                value={formData.room || ''}
                                onChange={e => setFormData({ ...formData, room: e.target.value })}
                                className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none appearance-none bg-white font-medium"
                            >
                                <option value="">General Project Area</option>
                                {dashboardData.rooms?.map(r => (
                                    <option key={r.id} value={r.id}>{r.name} ({r.floor_name})</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Paid To (Vendor/Person)</label>
                            {formData.expense_type === 'MATERIAL' ? (
                                <select
                                    value={formData.supplier || ''}
                                    onChange={e => {
                                        const s = dashboardData.suppliers?.find(sup => sup.id === parseInt(e.target.value));
                                        setFormData({ ...formData, supplier: e.target.value, paid_to: s ? s.name : formData.paid_to });
                                    }}
                                    className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none appearance-none bg-white"
                                >
                                    <option value="">Select Supplier</option>
                                    {dashboardData.suppliers?.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            ) : (formData.expense_type === 'LABOR' || formData.expense_type === 'FEES') ? (
                                <select
                                    value={formData.contractor || ''}
                                    onChange={e => {
                                        const c = dashboardData.contractors?.find(con => con.id === parseInt(e.target.value));
                                        setFormData({ ...formData, contractor: e.target.value, paid_to: c ? c.name : formData.paid_to });
                                    }}
                                    className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none appearance-none bg-white"
                                >
                                    <option value="">Select Contractor</option>
                                    {dashboardData.contractors?.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    type="text"
                                    value={formData.paid_to || ''}
                                    onChange={e => setFormData({ ...formData, paid_to: e.target.value })}
                                    className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none"
                                    placeholder="Who was paid?"
                                />
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
                            <select
                                value={formData.category || ''}
                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                                className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none appearance-none bg-white"
                                required
                            >
                                <option value="">Select Category</option>
                                {dashboardData.budgetCategories?.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="bg-gray-50/50 p-5 rounded-2xl border border-gray-100">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 ml-1">Funding Source (Where did money come from?)</label>
                        <select
                            value={formData.funding_source || ''}
                            onChange={e => setFormData({ ...formData, funding_source: e.target.value })}
                            className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none appearance-none bg-white font-black text-gray-900"
                            required
                        >
                            <option value="">Select Account / Funding Source</option>
                            {dashboardData.funding?.map(f => (
                                <option key={f.id} value={f.id}>
                                    {f.source_type === 'LOAN' ? '🏦 Karja: ' : f.source_type === 'OWN_MONEY' ? '💰 Bachat: ' : '🤝 Saapathi: '}
                                    {f.name} (Avl: {formatCurrency(f.current_balance)})
                                </option>
                            ))}
                        </select>
                        {formData.funding_source && (
                            <div className="mt-3 flex items-center justify-between px-2">
                                <span className="text-[10px] font-bold text-gray-400 italic">Target account for this expense</span>
                                {(() => {
                                    const fs = dashboardData.funding?.find(f => f.id === parseInt(formData.funding_source));
                                    if (!fs) return null;
                                    return (
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter ${fs.source_type === 'LOAN' ? 'bg-orange-100 text-orange-600' :
                                                fs.source_type === 'OWN_MONEY' ? 'bg-emerald-100 text-emerald-600' :
                                                    'bg-purple-100 text-purple-600'
                                                }`}>
                                                {fs.source_type}
                                            </span>
                                            <span className="text-[10px] font-black text-gray-900">Avl: {formatCurrency(fs.current_balance)}</span>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}
                    </div>
                    <div className="flex justify-end gap-3 mt-8">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700">Cancel</button>
                        <button type="submit" disabled={loading} className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 transition-all">
                            {loading ? 'Saving...' : (editingItem ? 'Update Expense' : 'Create Expense')}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Payment Modal */}
            <Modal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} title={`Record Payment: ${activeExpense?.title}`}>
                <div className="space-y-6">
                    {/* Dynamic Funding Context */}
                    {activeExpense?.funding_source && (
                        <div className={`p-4 rounded-xl border flex items-center justify-between ${(() => {
                            const fs = dashboardData.funding?.find(f => f.id === activeExpense.funding_source);
                            return fs?.source_type === 'LOAN' ? 'bg-orange-50 border-orange-100 text-orange-800' :
                                fs?.source_type === 'BORROWED' ? 'bg-purple-50 border-purple-100 text-purple-800' :
                                    'bg-green-50 border-green-100 text-green-800';
                        })()}`}>
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white rounded-lg shadow-sm">
                                    <svg className="w-5 h-5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                </div>
                                <div>
                                    <div className="text-[10px] font-black uppercase tracking-widest opacity-60">Debiting From</div>
                                    <div className="text-sm font-bold">{activeExpense.funding_source_name}</div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-[10px] font-black uppercase tracking-widest opacity-60">Available Balance</div>
                                <div className="text-sm font-black">
                                    {formatCurrency(dashboardData.funding?.find(f => f.id === activeExpense.funding_source)?.current_balance || 0)}
                                </div>
                            </div>
                        </div>
                    )}
                    {/* Payment History */}
                    {activeExpense?.payments?.length > 0 && (
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3 ml-1">Payment History</h4>
                            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                {activeExpense.payments.map((p, idx) => (
                                    <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                                        <div>
                                            <div className="text-xs font-bold text-gray-900">{formatCurrency(p.amount)}</div>
                                            <div className="text-[10px] text-gray-400 font-medium">
                                                {p.method === 'CASH' ? 'Nagad' :
                                                    p.method === 'BANK_TRANSFER' ? 'ConnectIPS' :
                                                        p.method === 'QR' ? 'eSewa/Khalti' : p.method} • {new Date(p.date).toLocaleDateString()}
                                            </div>
                                        </div>
                                        {p.reference_id && <div className="text-[10px] text-indigo-500 font-bold">#{p.reference_id}</div>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <form onSubmit={handlePaymentSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Paying Amount (Rs.)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    max={activeExpense?.balance_due}
                                    value={paymentFormData.amount}
                                    onChange={e => setPaymentFormData({ ...paymentFormData, amount: e.target.value })}
                                    className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none font-bold text-green-600"
                                    required
                                />
                                <p className="text-[10px] text-gray-400 mt-1 font-bold">Max: {formatCurrency(activeExpense?.balance_due)}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Date</label>
                                <input
                                    type="date"
                                    value={paymentFormData.date}
                                    onChange={e => setPaymentFormData({ ...paymentFormData, date: e.target.value })}
                                    className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none"
                                    required
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Method</label>
                                <select
                                    value={paymentFormData.method}
                                    onChange={e => setPaymentFormData({ ...paymentFormData, method: e.target.value })}
                                    className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none bg-white font-medium"
                                    required
                                >
                                    <option value="CASH">💰 Nagad (Cash)</option>
                                    <option value="BANK_TRANSFER">🏦 Bank / ConnectIPS</option>
                                    <option value="QR">📱 eSewa / Khalti (QR)</option>
                                    <option value="CHECK">📜 Cheque</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Reference ID</label>
                                <input
                                    type="text"
                                    value={paymentFormData.reference_id}
                                    onChange={e => setPaymentFormData({ ...paymentFormData, reference_id: e.target.value })}
                                    className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none"
                                    placeholder="Txn ID / Check #"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-8">
                            <button type="button" onClick={() => setIsPaymentModalOpen(false)} className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700">Cancel</button>
                            <button type="submit" disabled={loading} className="px-8 py-2.5 bg-green-600 text-white rounded-xl font-bold shadow-lg shadow-green-200 hover:bg-green-700 disabled:opacity-50 transition-all">
                                {loading ? 'Processing...' : 'Record Payment'}
                            </button>
                        </div>
                    </form>
                </div>
            </Modal>

            <ExpenseDetailModal
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                expenseId={selectedExpenseId}
            />
        </div>
    );
};

export default ExpensesTab;
