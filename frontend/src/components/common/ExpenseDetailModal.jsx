import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { useConstruction } from '../../context/ConstructionContext';
import { dashboardService } from '../../services/api';

const ExpenseDetailModal = ({ isOpen, onClose, expenseId }) => {
    const { dashboardData, refreshData, formatCurrency } = useConstruction();
    const [isPaymentFormOpen, setIsPaymentFormOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const expense = dashboardData.expenses?.find(e => e.id === expenseId);

    const [paymentData, setPaymentData] = useState({
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        method: 'CASH',
        reference_id: '',
        funding_source: ''
    });

    // Synchronize default payment method when form opens
    useEffect(() => {
        if (isPaymentFormOpen && expense) {
            let defaultMethod = 'CASH';
            let defaultSource = expense.funding_source || '';

            if (expense.funding_source) {
                const fs = dashboardData.funding?.find(f => f.id === expense.funding_source);
                if (fs?.default_payment_method) defaultMethod = fs.default_payment_method;
            }

            setPaymentData(prev => ({
                ...prev,
                amount: expense.balance_due,
                method: defaultMethod,
                funding_source: defaultSource
            }));
        }
    }, [isPaymentFormOpen, expense, dashboardData.funding]);

    if (!expense) return null;

    const handlePaymentSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await dashboardService.createPayment({
                ...paymentData,
                expense: expense.id,
                amount: parseFloat(paymentData.amount)
            });
            setIsPaymentFormOpen(false);
            refreshData();
        } catch (error) {
            alert('Payment failed.');
        } finally {
            setLoading(false);
        }
    };

    const statusColors = {
        'PAID': 'bg-green-100 text-green-700 border-green-200',
        'PARTIAL': 'bg-amber-100 text-amber-700 border-amber-200',
        'UNPAID': 'bg-red-100 text-red-700 border-red-200'
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Expense Details" maxWidth="max-w-4xl">
            <div className="flex flex-col h-full max-h-[85vh] overflow-hidden">
                {/* Header Summary */}
                <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h2 className="text-2xl font-black text-gray-900 tracking-tight">{expense.title}</h2>
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${statusColors[expense.status]}`}>
                                    {expense.status}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{expense.expense_type}</span>
                                <span className="text-gray-300">•</span>
                                <span className="text-xs font-black text-indigo-600 uppercase tracking-wider">#{expense.category_name}</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-3xl font-black text-gray-900 leading-none">{formatCurrency(expense.amount)}</div>
                            <div className="text-[11px] font-bold text-gray-400 mt-1 uppercase tracking-tighter">Total Transaction Amount</div>
                        </div>
                    </div>

                    {/* Financial Progress */}
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                        <div className="grid grid-cols-3 gap-8 mb-4">
                            <div>
                                <div className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Total Paid</div>
                                <div className="text-lg font-black text-green-600">{formatCurrency(expense.total_paid)}</div>
                            </div>
                            <div>
                                <div className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Balance Due</div>
                                <div className="text-lg font-black text-red-500">{formatCurrency(expense.balance_due)}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1 text-right">Payment Progress</div>
                                <div className="text-lg font-black text-gray-900">{((expense.total_paid / expense.amount) * 100).toFixed(0)}%</div>
                            </div>
                        </div>
                        <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                            <div
                                className="bg-green-500 h-full transition-all duration-500"
                                style={{ width: `${(expense.total_paid / expense.amount) * 100}%` }}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Details Section */}
                        <div className="space-y-8">
                            <div>
                                <h3 className="text-xs font-black text-gray-900 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></span>
                                    Contextual Info
                                </h3>
                                {/* Inventory Details */}
                                {expense.expense_type === 'MATERIAL' && expense.material && (
                                    <div className="bg-indigo-50/50 rounded-2xl p-5 border border-indigo-100/50 mb-4">
                                        <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                                            Linked Inventory Item
                                        </h3>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="text-sm font-black text-indigo-900 uppercase tracking-tight">{expense.material_name}</div>
                                                <div className="text-[10px] text-indigo-500 font-bold">Qty: {expense.quantity} {expense.unit}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-black text-gray-900">{formatCurrency(expense.unit_price)}</div>
                                                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Per {expense.unit}</div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Budget Category</span>
                                            <span className="text-sm font-black text-indigo-600">{expense.category_name}</span>
                                        </div>
                                        <div className="h-px bg-gray-50"></div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Debit Source</span>
                                            {(() => {
                                                const fs = dashboardData.funding?.find(f => f.id === expense.funding_source);
                                                if (!fs) return <span className="text-sm font-black text-gray-800">Personal Funds</span>;
                                                return (
                                                    <div className="flex items-center gap-2">
                                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter ${fs.source_type === 'LOAN' ? 'bg-orange-100 text-orange-600' :
                                                            fs.source_type === 'OWN_MONEY' ? 'bg-emerald-100 text-emerald-600' :
                                                                'bg-purple-100 text-purple-600'
                                                            }`}>
                                                            {fs.source_type === 'LOAN' ? 'Karja' : fs.source_type === 'OWN_MONEY' ? 'Bachat' : 'Saapathi'}
                                                        </span>
                                                        <span className="text-sm font-black text-gray-900">{fs.name}</span>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                        <div className="h-px bg-gray-50"></div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Paid To</span>
                                            <span className="text-sm font-black text-gray-800">{expense.paid_to || '-'}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Transaction Date</span>
                                            <span className="text-sm font-black text-gray-800">{new Date(expense.date).toLocaleDateString(undefined, { dateStyle: 'long' })}</span>
                                        </div>
                                    </div>
                                    {expense.phase_name && (
                                        <div className="flex justify-between items-center py-1">
                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Related Phase</span>
                                            <span className="text-sm font-black text-indigo-600 uppercase">{expense.phase_name}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Payment History */}
                        <div className="space-y-6">
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-xs font-black text-gray-900 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 bg-green-600 rounded-full"></span>
                                        Payment History
                                    </h3>
                                    {expense.balance_due > 0 && !isPaymentFormOpen && (
                                        <button
                                            onClick={() => setIsPaymentFormOpen(true)}
                                            className="text-[10px] font-black text-green-600 uppercase tracking-widest bg-green-50 px-3 py-1.5 rounded-lg hover:bg-green-100 transition-colors"
                                        >
                                            + Record Payment
                                        </button>
                                    )}
                                </div>

                                {isPaymentFormOpen ? (
                                    <div className="bg-white rounded-2xl border-2 border-green-100 p-5 mb-4 shadow-xl shadow-green-50/50">
                                        <div className="flex justify-between items-center mb-4">
                                            <span className="text-[10px] font-black text-green-700 uppercase tracking-widest">New Installment</span>
                                            <button onClick={() => setIsPaymentFormOpen(false)} className="text-gray-400 hover:text-gray-600">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                        </div>

                                        <div className="mb-4">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Debit From (Account)</label>
                                            <select
                                                value={paymentData.funding_source}
                                                onChange={e => {
                                                    const sourceId = parseInt(e.target.value);
                                                    const fs = dashboardData.funding?.find(f => f.id === sourceId);
                                                    setPaymentData({
                                                        ...paymentData,
                                                        funding_source: e.target.value,
                                                        method: fs?.default_payment_method || paymentData.method
                                                    });
                                                }}
                                                className="w-full bg-gray-50 border-none rounded-xl p-3 text-xs font-black text-gray-900 focus:ring-2 focus:ring-green-500 focus:bg-white transition-all appearance-none"
                                            >
                                                <option value="">Select Account</option>
                                                {dashboardData.funding?.map(f => (
                                                    <option key={f.id} value={f.id}>
                                                        {f.source_type === 'LOAN' ? '🏦 Karja: ' : f.source_type === 'OWN_MONEY' ? '💰 Bachat: ' : '🤝 Saapathi: '}
                                                        {f.name} (Avl: {formatCurrency(f.current_balance)})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <form onSubmit={handlePaymentSubmit} className="space-y-4">
                                            <div>
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Amount (Max {formatCurrency(expense.balance_due)})</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    max={expense.balance_due}
                                                    value={paymentData.amount}
                                                    onChange={e => setPaymentData({ ...paymentData, amount: e.target.value })}
                                                    className="w-full mt-1 bg-gray-50 border-none rounded-xl p-3 text-lg font-black text-green-600 placeholder-gray-300 focus:ring-2 focus:ring-green-500 focus:bg-white transition-all"
                                                    placeholder="0.00"
                                                    required
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Method</label>
                                                    <select
                                                        value={paymentData.method}
                                                        onChange={e => setPaymentData({ ...paymentData, method: e.target.value })}
                                                        className="w-full mt-1 bg-gray-50 border-none rounded-xl p-2 text-xs font-bold text-gray-700 focus:ring-2 focus:ring-green-500 focus:bg-white transition-all appearance-none"
                                                    >
                                                        <option value="CASH">💰 Nagad (Cash)</option>
                                                        <option value="BANK_TRANSFER">🏦 Bank Transfer (ConnectIPS)</option>
                                                        <option value="QR">📱 eSewa / Khalti (QR)</option>
                                                        <option value="CHECK">📜 Cheque</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Date</label>
                                                    <input
                                                        type="date"
                                                        value={paymentData.date}
                                                        onChange={e => setPaymentData({ ...paymentData, date: e.target.value })}
                                                        className="w-full mt-1 bg-gray-50 border-none rounded-xl p-2 text-xs font-bold text-gray-700 focus:ring-2 focus:ring-green-500 focus:bg-white transition-all"
                                                    />
                                                </div>
                                            </div>
                                            <input
                                                type="text"
                                                value={paymentData.reference_id}
                                                onChange={e => setPaymentData({ ...paymentData, reference_id: e.target.value })}
                                                className="w-full bg-gray-50 border-none rounded-xl p-3 text-xs font-bold text-gray-700 placeholder-gray-300 focus:ring-2 focus:ring-green-500 focus:bg-white transition-all"
                                                placeholder="Reference ID / Transaction ID"
                                            />
                                            <button
                                                type="submit"
                                                disabled={loading}
                                                className="w-full py-3 bg-green-600 text-white rounded-xl font-black uppercase text-xs tracking-[0.2em] shadow-lg shadow-green-200 hover:bg-green-700 disabled:opacity-50 transition-all"
                                            >
                                                {loading ? 'Processing...' : 'Confirm Installment'}
                                            </button>
                                        </form>
                                    </div>
                                ) : null}

                                <div className="space-y-3">
                                    {expense.payments?.length > 0 ? (
                                        expense.payments.map((payment, idx) => (
                                            <div key={idx} className="bg-gray-50/50 rounded-2xl p-4 border border-gray-100 flex justify-between items-center group hover:bg-white hover:shadow-md transition-all">
                                                <div>
                                                    <div className="text-sm font-black text-gray-900 mb-0.5">{formatCurrency(payment.amount)}</div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest px-1.5 py-0.5 bg-indigo-50 rounded">
                                                            {payment.method === 'BANK_TRANSFER' ? 'IPS' :
                                                                payment.method === 'QR' ? 'eSewa' :
                                                                    payment.method === 'CHECK' ? 'Cheque' :
                                                                        payment.method === 'CASH' ? 'Nagad' : payment.method}
                                                        </span>
                                                        <span className="text-[10px] text-gray-400 font-bold">{new Date(payment.date).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="text-right">
                                                        {payment.reference_id && (
                                                            <div className="text-[9px] font-black text-gray-300 uppercase tracking-widest group-hover:text-indigo-400 transition-colors">#{payment.reference_id}</div>
                                                        )}
                                                        <div className="text-[10px] text-green-600 font-black uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity mt-1">Confirmed</div>
                                                    </div>
                                                    <button
                                                        onClick={async () => {
                                                            if (window.confirm('Delete this payment installment?')) {
                                                                try {
                                                                    await dashboardService.deletePayment(payment.id);
                                                                    refreshData();
                                                                } catch (error) {
                                                                    alert('Failed to delete payment');
                                                                }
                                                            }
                                                        }}
                                                        className="p-2 text-red-100 group-hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                        title="Delete Payment"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="py-12 border-2 border-dashed border-gray-100 rounded-2xl text-center">
                                            <div className="text-[10px] font-black text-gray-300 uppercase tracking-widest">No Payments Recorded Yet</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <button
                        onClick={() => { if (window.confirm('Delete this expense?')) dashboardService.deleteExpense(expense.id).then(() => { refreshData(); onClose(); }) }}
                        className="px-6 py-2.5 text-xs font-black text-red-400 uppercase tracking-widest hover:text-red-600 transition-colors"
                    >
                        Delete Record
                    </button>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-6 py-2.5 text-xs font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors">Close</button>
                        {expense.balance_due > 0 && !isPaymentFormOpen && (
                            <button
                                onClick={() => setIsPaymentFormOpen(true)}
                                className={`px-8 py-2.5 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-lg transition-all flex items-center gap-2 ${(() => {
                                    const fs = dashboardData.funding?.find(f => f.id === expense.funding_source);
                                    return fs?.source_type === 'LOAN' ? 'bg-orange-600 hover:bg-orange-700 shadow-orange-100' :
                                        fs?.source_type === 'BORROWED' ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-100' :
                                            'bg-green-600 hover:bg-green-700 shadow-green-100';
                                })()}`}
                            >
                                <span>Pay {formatCurrency(expense.balance_due)}</span>
                                {expense.funding_source && (
                                    <span className="opacity-75 font-medium border-l border-white/20 pl-2 flex items-center gap-1">
                                        <span className="max-w-[80px] truncate">{expense.funding_source_name?.split(' ')[0]}</span>
                                        <span className="opacity-50">•</span>
                                        {(() => {
                                            const fs = dashboardData.funding?.find(f => f.id === expense.funding_source);
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
                        <button
                            className="px-8 py-2.5 bg-gray-900 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-gray-200 hover:bg-black transition-all"
                        >
                            Edit Expense
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default ExpenseDetailModal;
