import React, { useState } from 'react';
import { useConstruction } from '../../context/ConstructionContext';
import { dashboardService } from '../../services/api';
import Modal from '../common/Modal';

const AddExpenseModal = ({ isOpen, onClose }) => {
    const { dashboardData, refreshData, formatCurrency } = useConstruction();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        expense_type: 'MATERIAL',
        category: dashboardData.budgetCategories[0]?.id || '',
        funding_source: dashboardData.funding[0]?.id || '',
        paid_to: '',
        phase: '',
        supplier: '',
        contractor: '',
        room: '',
    });

    const [recordPaymentNow, setRecordPaymentNow] = useState(true);
    const [paymentDetails, setPaymentDetails] = useState({
        method: 'CASH',
        reference_id: '',
        notes: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const dataToSubmit = { ...formData };
            // Sanitize
            ['phase', 'category', 'funding_source', 'supplier', 'contractor', 'room'].forEach(key => {
                if (dataToSubmit[key] === '') dataToSubmit[key] = null;
            });

            const expenseRes = await dashboardService.createExpense(dataToSubmit);
            const expenseId = expenseRes.data.id;

            // Record payment if toggled
            if (recordPaymentNow && expenseId) {
                await dashboardService.createPayment({
                    expense: expenseId,
                    amount: parseFloat(formData.amount),
                    date: formData.date,
                    funding_source: formData.funding_source,
                    method: paymentDetails.method,
                    reference_id: paymentDetails.reference_id,
                    notes: paymentDetails.notes
                });
            }

            refreshData();
            onClose();
            // Reset form
            setFormData({
                title: '',
                amount: '',
                date: new Date().toISOString().split('T')[0],
                expense_type: 'MATERIAL',
                category: dashboardData.budgetCategories[0]?.id || '',
                funding_source: dashboardData.funding[0]?.id || '',
                paid_to: '',
                phase: '',
                supplier: '',
                contractor: '',
                room: '',
            });
            setPaymentDetails({
                method: 'CASH',
                reference_id: '',
                notes: ''
            });
        } catch (error) {
            alert('Failed to save expense and/or payment. Please check your inputs.');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add New Expense">
            <form onSubmit={handleSubmit} className="space-y-5 p-1">
                <div className="space-y-4">
                    {/* Amount Highlight */}
                    <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                        <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1 ml-1">Expense Amount (Rs.)</label>
                        <input
                            type="number"
                            value={formData.amount}
                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                            className="w-full bg-transparent border-none p-0 text-3xl font-black text-indigo-600 focus:ring-0 placeholder-indigo-200"
                            placeholder="0.00"
                            required
                        />
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">What was this for?</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="w-full bg-gray-50 border-none rounded-xl p-3.5 text-sm font-black text-gray-900 focus:ring-2 focus:ring-indigo-500 transition-all"
                                placeholder="e.g. 10 Bags of Cement"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Type</label>
                                <select
                                    value={formData.expense_type}
                                    onChange={(e) => {
                                        const type = e.target.value;
                                        setFormData({
                                            ...formData,
                                            expense_type: type,
                                            supplier: '',
                                            contractor: '',
                                            paid_to: ''
                                        });
                                    }}
                                    className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-indigo-500 appearance-none transition-all"
                                >
                                    <option value="MATERIAL">📦 Material</option>
                                    <option value="LABOR">👷 Labor</option>
                                    <option value="FEES">📋 Fees</option>
                                    <option value="OTHER">✨ Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Date</label>
                                <input
                                    type="date"
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-indigo-500 transition-all"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Category</label>
                                <select
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-indigo-500 appearance-none transition-all"
                                    required
                                >
                                    <option value="">Select Category</option>
                                    {dashboardData.budgetCategories?.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Debit From</label>
                                <select
                                    value={formData.funding_source}
                                    onChange={(e) => setFormData({ ...formData, funding_source: e.target.value })}
                                    className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm font-black text-indigo-600 focus:ring-2 focus:ring-indigo-500 appearance-none transition-all"
                                    required
                                >
                                    <option value="">Select Account</option>
                                    {dashboardData.funding?.map(f => (
                                        <option key={f.id} value={f.id}>
                                            {f.name} (Avl: {formatCurrency(f.current_balance)})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Phase</label>
                                <select
                                    value={formData.phase}
                                    onChange={(e) => setFormData({ ...formData, phase: e.target.value })}
                                    className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-indigo-500 appearance-none transition-all"
                                >
                                    <option value="">General Project</option>
                                    {dashboardData.phases?.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Room / Area</label>
                                <select
                                    value={formData.room}
                                    onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                                    className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-indigo-500 appearance-none transition-all"
                                >
                                    <option value="">N/A</option>
                                    {dashboardData.rooms?.map(r => (
                                        <option key={r.id} value={r.id}>{r.name} ({r.floor_name})</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                                {formData.expense_type === 'MATERIAL' ? 'Supplier Name / Vendor' :
                                    (formData.expense_type === 'LABOR' || formData.expense_type === 'FEES') ? 'Contractor / Personnel Name' :
                                        'Recipient / Paid To'}
                            </label>
                            {formData.expense_type === 'MATERIAL' ? (
                                <div className="relative">
                                    <select
                                        value={formData.supplier || ''}
                                        onChange={e => {
                                            const s = dashboardData.suppliers?.find(sup => sup.id === parseInt(e.target.value));
                                            setFormData({ ...formData, supplier: e.target.value, paid_to: s ? s.name : '' });
                                        }}
                                        className="w-full bg-gray-50 border-none rounded-xl p-3.5 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-indigo-500 appearance-none transition-all"
                                    >
                                        <option value="">Select Supplier List</option>
                                        {dashboardData.suppliers?.map(s => (
                                            <option key={s.id} value={s.id}>{s.name} ({s.category || 'General'})</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                    </div>
                                </div>
                            ) : (formData.expense_type === 'LABOR' || formData.expense_type === 'FEES') ? (
                                <div className="relative">
                                    <select
                                        value={formData.contractor || ''}
                                        onChange={e => {
                                            const c = dashboardData.contractors?.find(con => con.id === parseInt(e.target.value));
                                            setFormData({ ...formData, contractor: e.target.value, paid_to: c ? c.name : '' });
                                        }}
                                        className="w-full bg-gray-50 border-none rounded-xl p-3.5 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-indigo-500 appearance-none transition-all"
                                    >
                                        <option value="">Select Contractor List</option>
                                        {dashboardData.contractors?.map(c => (
                                            <option key={c.id} value={c.id}>{c.name} ({c.role || 'Personnel'})</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                    </div>
                                </div>
                            ) : (
                                <input
                                    type="text"
                                    value={formData.paid_to}
                                    onChange={(e) => setFormData({ ...formData, paid_to: e.target.value })}
                                    className="w-full bg-gray-50 border-none rounded-xl p-3.5 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-indigo-500 transition-all font-sans"
                                    placeholder="Enter full name of recipient"
                                />
                            )}
                        </div>

                        {/* Payment Toggle */}
                        <div className="pt-2">
                            <label className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 active:bg-gray-100 transition-all cursor-pointer">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${recordPaymentNow ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-200 text-gray-400'}`}>
                                        {recordPaymentNow ? '✅' : '⏳'}
                                    </div>
                                    <div>
                                        <div className="text-sm font-black text-gray-900">Record Payment Now</div>
                                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Debit balance from account immediately</div>
                                    </div>
                                </div>
                                <div className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ring-2 ring-transparent ring-offset-2">
                                    <input
                                        type="checkbox"
                                        className="sr-only"
                                        checked={recordPaymentNow}
                                        onChange={() => setRecordPaymentNow(!recordPaymentNow)}
                                    />
                                    <span
                                        className={`${recordPaymentNow ? 'bg-emerald-500' : 'bg-gray-300'
                                            } inline-block h-6 w-11 rounded-full transition-colors duration-200 ease-in-out`}
                                    />
                                    <span
                                        className={`${recordPaymentNow ? 'translate-x-6' : 'translate-x-1'
                                            } absolute inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ease-in-out`}
                                    />
                                </div>
                            </label>
                        </div>

                        {/* Payment Details (Conditional) */}
                        {recordPaymentNow && (
                            <div className="space-y-3 p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100/50 animate-in fade-in slide-in-from-top-2">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1.5 ml-1">Method</label>
                                        <select
                                            value={paymentDetails.method}
                                            onChange={(e) => setPaymentDetails({ ...paymentDetails, method: e.target.value })}
                                            className="w-full bg-white border-none rounded-xl p-3 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-emerald-500 appearance-none transition-all"
                                        >
                                            <option value="CASH">💰 Cash</option>
                                            <option value="BANK_TRANSFER">🏦 Bank</option>
                                            <option value="QR">📱 QR Pay</option>
                                            <option value="CHECK">📜 Cheque</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1.5 ml-1">Ref ID / Notes</label>
                                        <input
                                            type="text"
                                            value={paymentDetails.reference_id}
                                            onChange={(e) => setPaymentDetails({ ...paymentDetails, reference_id: e.target.value })}
                                            className="w-full bg-white border-none rounded-xl p-3 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-emerald-500 transition-all"
                                            placeholder="Txn ID / Chq #"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex gap-3 pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-4 text-xs font-black text-gray-400 uppercase tracking-[0.2em] hover:text-gray-600 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className={`flex-[2] py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl active:scale-95 transition-all disabled:opacity-50 ${recordPaymentNow ? 'bg-emerald-600 text-white shadow-emerald-100' : 'bg-indigo-600 text-white shadow-indigo-100'}`}>
                        {loading ? 'Processing...' : (recordPaymentNow ? 'Pay & Record' : 'Record Only')}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default AddExpenseModal;
