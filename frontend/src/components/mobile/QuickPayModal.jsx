import React, { useState, useEffect } from 'react';
import { useConstruction } from '../../context/ConstructionContext';
import { dashboardService } from '../../services/api';
import Modal from '../common/Modal';

const QuickPayModal = ({ isOpen, onClose }) => {
    const { dashboardData, refreshData, formatCurrency } = useConstruction();
    const [loading, setLoading] = useState(false);
    const [targetType, setTargetType] = useState('CONTRACTOR'); // CONTRACTOR or SUPPLIER
    const [selectedId, setSelectedId] = useState('');
    const [activeTarget, setActiveTarget] = useState(null);

    const [paymentFormData, setPaymentFormData] = useState({
        amount: '',
        date: new Date().toISOString().split('T')[0],
        method: 'CASH',
        reference_id: '',
        funding_source: dashboardData.funding[0]?.id || '',
        notes: ''
    });

    // Update active target when selection changes
    useEffect(() => {
        if (!selectedId) {
            setActiveTarget(null);
            return;
        }
        const list = targetType === 'CONTRACTOR' ? dashboardData.contractors : dashboardData.suppliers;
        const target = list?.find(item => item.id === parseInt(selectedId));
        setActiveTarget(target);
        if (target && target.balance_due > 0) {
            setPaymentFormData(prev => ({ ...prev, amount: target.balance_due }));
        }
    }, [selectedId, targetType, dashboardData]);

    const getHistory = () => {
        if (!activeTarget || !dashboardData?.expenses) return [];
        const isContractor = targetType === 'CONTRACTOR';
        const filteredExpenses = dashboardData.expenses.filter(exp =>
            (isContractor ? exp.contractor === activeTarget.id : exp.supplier === activeTarget.id) &&
            exp.balance_due !== undefined
        );

        let history = [];
        filteredExpenses.forEach(exp => {
            history.push({
                id: `exp-${exp.id}`,
                date: exp.date,
                type: 'BILL',
                title: exp.title,
                amount: exp.amount,
                status: exp.status
            });
            if (exp.payments && exp.payments.length > 0) {
                exp.payments.forEach(payment => {
                    history.push({
                        id: `pay-${payment.id}`,
                        date: payment.date,
                        type: 'PAYMENT',
                        title: `Payment: ${exp.title}`,
                        amount: payment.amount,
                        method: payment.method
                    });
                });
            }
        });
        return history.sort((a, b) => new Date(b.date) - new Date(a.date));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!activeTarget || !selectedId) return;
        setLoading(true);
        try {
            // Logic mirrored from desktop tabs:
            // 1. Find unpaid expenses
            const isContractor = targetType === 'CONTRACTOR';
            const unpaidExpenses = dashboardData.expenses?.filter(exp =>
                (isContractor ? exp.contractor === activeTarget.id : exp.supplier === activeTarget.id) &&
                exp.balance_due > 0
            );

            let targetExpenseId = null;
            if (unpaidExpenses && unpaidExpenses.length > 0) {
                targetExpenseId = unpaidExpenses[0].id;
            } else {
                // Auto-create Advance Expense
                const categoryName = isContractor ? 'Labor' : 'Material';
                let categoryId = dashboardData.budgetCategories?.find(c =>
                    c.name.toLowerCase().includes(categoryName.toLowerCase())
                )?.id;
                if (!categoryId && dashboardData.budgetCategories?.length > 0) categoryId = dashboardData.budgetCategories[0].id;

                const expenseData = {
                    title: `${categoryName} Payment/Advance: ${activeTarget.name}`,
                    amount: parseFloat(paymentFormData.amount),
                    expense_type: isContractor ? 'LABOR' : 'MATERIAL',
                    category: categoryId,
                    date: paymentFormData.date,
                    is_paid: false,
                    paid_to: activeTarget.name,
                    funding_source: paymentFormData.funding_source
                };
                if (isContractor) expenseData.contractor = activeTarget.id;
                else expenseData.supplier = activeTarget.id;

                const expenseRes = await dashboardService.createExpense(expenseData);
                targetExpenseId = expenseRes.data.id;
            }

            // 2. Create Payment
            await dashboardService.createPayment({
                expense: targetExpenseId,
                funding_source: paymentFormData.funding_source,
                amount: parseFloat(paymentFormData.amount),
                date: paymentFormData.date,
                method: paymentFormData.method,
                reference_id: paymentFormData.reference_id,
                notes: paymentFormData.notes
            });

            refreshData();
            onClose();
            // Reset
            setSelectedId('');
            setPaymentFormData({
                amount: '',
                date: new Date().toISOString().split('T')[0],
                method: 'CASH',
                reference_id: '',
                funding_source: dashboardData.funding[0]?.id || '',
                notes: ''
            });
        } catch (error) {
            alert("Payment failed. Please check account balance.");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Pay Contractor/Supplier">
            <div className="space-y-4 p-1">
                {/* Type Selection */}
                <div className="flex bg-gray-100 p-1 rounded-2xl">
                    <button
                        onClick={() => { setTargetType('CONTRACTOR'); setSelectedId(''); }}
                        className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${targetType === 'CONTRACTOR' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}
                    >
                        👷 Contractor
                    </button>
                    <button
                        onClick={() => { setTargetType('SUPPLIER'); setSelectedId(''); }}
                        className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${targetType === 'SUPPLIER' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}
                    >
                        🏢 Supplier
                    </button>
                </div>

                {/* Search / Select */}
                <div className="relative">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                        Select {targetType === 'CONTRACTOR' ? 'Contractor' : 'Supplier'} Name
                    </label>
                    <select
                        value={selectedId}
                        onChange={(e) => setSelectedId(e.target.value)}
                        className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-black text-gray-900 focus:ring-2 focus:ring-indigo-500 appearance-none transition-all shadow-inner"
                    >
                        <option value="">Choose or Search...</option>
                        {(targetType === 'CONTRACTOR' ? dashboardData.contractors : dashboardData.suppliers)?.map(item => (
                            <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                    </select>
                </div>

                {activeTarget && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-4">
                        {/* Summary Card */}
                        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-5 text-white shadow-xl relative overflow-hidden">
                            <div className="relative z-10">
                                <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Balance Due</span>
                                <div className="text-3xl font-black mt-1 text-emerald-400">{formatCurrency(activeTarget.balance_due)}</div>
                                <div className="mt-4 flex justify-between items-end">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black uppercase opacity-60">Total Bill</span>
                                        <span className="font-bold">{formatCurrency(targetType === 'CONTRACTOR' ? activeTarget.total_amount : activeTarget.total_billed)}</span>
                                    </div>
                                    <div className="text-right flex flex-col">
                                        <span className="text-[10px] font-black uppercase opacity-60">Total Paid</span>
                                        <span className="font-bold text-indigo-300">{formatCurrency(activeTarget.total_paid)}</span>
                                    </div>
                                </div>
                            </div>
                            {/* Decorative background circle */}
                            <div className="absolute -right-10 -top-10 w-32 h-32 bg-white/5 rounded-full" />
                        </div>

                        {/* Payment Form */}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Amount to Pay</label>
                                    <input
                                        type="number"
                                        value={paymentFormData.amount}
                                        onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: e.target.value })}
                                        className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm font-black text-emerald-600 focus:ring-2 focus:ring-emerald-500 shadow-inner"
                                        placeholder="0.00"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Date</label>
                                    <input
                                        type="date"
                                        value={paymentFormData.date}
                                        onChange={(e) => setPaymentFormData({ ...paymentFormData, date: e.target.value })}
                                        className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-indigo-500 shadow-inner"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Funding Source</label>
                                    <select
                                        value={paymentFormData.funding_source}
                                        onChange={(e) => setPaymentFormData({ ...paymentFormData, funding_source: e.target.value })}
                                        className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm font-black text-indigo-600 focus:ring-2 focus:ring-indigo-500 appearance-none shadow-inner"
                                        required
                                    >
                                        {dashboardData.funding?.map(f => (
                                            <option key={f.id} value={f.id}>{f.name} (Avl: {formatCurrency(f.current_balance)})</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Method</label>
                                        <select
                                            value={paymentFormData.method}
                                            onChange={(e) => setPaymentFormData({ ...paymentFormData, method: e.target.value })}
                                            className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-emerald-500 appearance-none shadow-inner"
                                        >
                                            <option value="CASH">💰 Cash</option>
                                            <option value="BANK_TRANSFER">🏦 Bank</option>
                                            <option value="QR">📱 QR</option>
                                            <option value="CHECK">📜 Cheque</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Reference</label>
                                        <input
                                            type="text"
                                            value={paymentFormData.reference_id}
                                            onChange={(e) => setPaymentFormData({ ...paymentFormData, reference_id: e.target.value })}
                                            className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-indigo-500 shadow-inner"
                                            placeholder="ID / #"
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-emerald-100 active:scale-95 transition-all disabled:opacity-50 mt-2"
                            >
                                {loading ? 'Processing...' : `Confirm Payment: ${activeTarget.name}`}
                            </button>
                        </form>

                        {/* Recent Activity */}
                        <div className="pt-4 border-t border-gray-100">
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Linked Transactions</h4>
                            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                {getHistory().map((txn, idx) => (
                                    <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-2xl">
                                        <div className="flex items-center gap-2">
                                            <div className={`text-lg ${txn.type === 'BILL' ? 'opacity-40' : 'brightness-110'}`}>{txn.type === 'BILL' ? '🧾' : '💸'}</div>
                                            <div>
                                                <div className="text-[10px] font-black text-gray-900 leading-tight">{txn.title}</div>
                                                <div className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">{txn.date}</div>
                                            </div>
                                        </div>
                                        <div className={`text-[10px] font-black ${txn.type === 'BILL' ? 'text-gray-400' : 'text-emerald-600'}`}>
                                            {txn.type === 'BILL' ? '-' : '+'}{formatCurrency(txn.amount)}
                                        </div>
                                    </div>
                                ))}
                                {getHistory().length === 0 && <div className="text-center py-4 text-[10px] font-bold text-gray-300 italic">No history found</div>}
                            </div>
                        </div>
                    </div>
                )}

                {/* Placeholder when no target selected */}
                {!activeTarget && (
                    <div className="py-12 flex flex-col items-center justify-center opacity-30 grayscale cursor-default">
                        <div className="text-6xl mb-4">💳</div>
                        <p className="text-xs font-black uppercase tracking-widest">Select a target to begin</p>
                    </div>
                )}

                <div className="flex pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full py-4 text-xs font-black text-gray-400 uppercase tracking-[0.2em] hover:text-gray-600 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default QuickPayModal;
