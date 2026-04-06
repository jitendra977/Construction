import React, { useState } from 'react';
import { dashboardService, getMediaUrl } from '../../services/api';
import Modal from '../common/Modal';
import { useConstruction } from '../../context/ConstructionContext';
import ConfirmModal from '../common/ConfirmModal';

const MobileSupplierList = ({ searchQuery = '' }) => {
    const { dashboardData, refreshData } = useConstruction();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({});
    const [loading, setLoading] = useState(false);

    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [activeSupplier, setActiveSupplier] = useState(null);
    const [paymentFormData, setPaymentFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        method: 'CASH',
        reference_id: '',
        funding_source: '',
        notes: ''
    });

    // Confirmation Modal System
    const [confirmConfig, setConfirmConfig] = useState({ isOpen: false });
    const showConfirm = (config) => setConfirmConfig({ ...config, isOpen: true });
    const closeConfirm = () => setConfirmConfig({ ...confirmConfig, isOpen: false });

    const filteredSuppliers = dashboardData.suppliers?.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.contact_person?.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    const handleOpenModal = (item = null) => {
        setEditingItem(item);
        if (item) {
            setFormData(item);
        } else {
            setFormData({ is_active: true });
        }
        setIsModalOpen(true);
    };

    const handleDelete = (id) => {
        showConfirm({
            title: "Delete Material Supplier?",
            message: "Are you sure you want to permanently remove this supplier from your vendor records? This will affect your procurement history and outstanding balance tracking. This action cannot be undone.",
            confirmText: "Yes, Delete Supplier",
            type: "danger",
            onConfirm: async () => {
                try {
                    await dashboardService.deleteSupplier(id);
                    refreshData();
                    closeConfirm();
                } catch (error) {
                    alert("Delete failed. This item might be linked to other records.");
                    closeConfirm();
                }
            }
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Use FormData for file upload support
            const data = new FormData();
            Object.keys(formData).forEach(key => {
                if (formData[key] !== null && formData[key] !== undefined) {
                    if (key === 'photo' && formData[key] instanceof File) {
                        data.append('photo', formData[key]);
                    } else if (key !== 'photo') {
                        data.append(key, formData[key]);
                    }
                }
            });

            if (editingItem) await dashboardService.updateSupplier(editingItem.id, data);
            else await dashboardService.createSupplier(data);

            setIsModalOpen(false);
            refreshData();
        } catch (error) {
            alert("Save failed. Please check your data.");
        } finally {
            setLoading(false);
        }
    };

    const handleOpenPaymentModal = (supplier) => {
        setActiveSupplier(supplier);
        setPaymentFormData({
            amount: supplier.balance_due > 0 ? supplier.balance_due : '',
            date: new Date().toISOString().split('T')[0],
            method: 'CASH',
            reference_id: '',
            funding_source: '',
            notes: ''
        });
        setIsPaymentModalOpen(true);
    };

    const handleOpenHistoryModal = (supplier) => {
        setActiveSupplier(supplier);
        setIsHistoryModalOpen(true);
    };

    const getSupplierHistory = (supplierId) => {
        if (!supplierId || !dashboardData?.expenses) return [];
        let history = [];
        const supplierExpenses = dashboardData.expenses.filter(exp => exp.supplier === supplierId && exp.balance_due !== undefined);
        supplierExpenses.forEach(exp => {
            history.push({ id: `exp-${exp.id}`, date: exp.date, type: 'BILL', title: exp.title, amount: exp.amount, status: exp.status, notes: exp.notes });
            if (exp.payments && exp.payments.length > 0) {
                exp.payments.forEach(payment => {
                    history.push({ id: `pay-${payment.id}`, date: payment.date, type: 'PAYMENT', title: `Payment: ${exp.title}`, amount: payment.amount, method: payment.method, notes: payment.notes });
                });
            }
        });
        return history.sort((a, b) => new Date(b.date) - new Date(a.date));
    };

    const handlePaymentSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            let categoryId = dashboardData.budgetCategories?.find(c => c.name.toLowerCase().includes('material'))?.id;
            if (!categoryId && dashboardData.budgetCategories?.length > 0) categoryId = dashboardData.budgetCategories[0].id;

            let targetExpenseId = null;
            const unpaidExpenses = dashboardData.expenses?.filter(exp => exp.supplier === activeSupplier.id && exp.balance_due > 0);

            if (unpaidExpenses && unpaidExpenses.length > 0) {
                targetExpenseId = unpaidExpenses[0].id;
            } else {
                const expenseRes = await dashboardService.createExpense({
                    title: `Material Payment/Advance: ${activeSupplier.name}`,
                    amount: parseFloat(paymentFormData.amount),
                    expense_type: 'MATERIAL',
                    category: categoryId,
                    supplier: activeSupplier.id,
                    date: paymentFormData.date,
                    is_paid: false,
                    paid_to: activeSupplier.name,
                    funding_source: paymentFormData.funding_source
                });
                targetExpenseId = expenseRes.data.id;
            }

            await dashboardService.createPayment({
                expense: targetExpenseId,
                funding_source: paymentFormData.funding_source,
                amount: parseFloat(paymentFormData.amount),
                date: paymentFormData.date,
                method: paymentFormData.method,
                reference_id: paymentFormData.reference_id,
                notes: paymentFormData.notes
            });

            setIsPaymentModalOpen(false);
            refreshData();
        } catch (error) {
            console.error("Payment failed", error);
            alert("Payment failed. Make sure you selected a funding source.");
        } finally {
            setLoading(false);
        }
    };

    const [expandedId, setExpandedId] = useState(null);

    return (
        <div className="space-y-2 pb-[120px]">
            {filteredSuppliers.length === 0 && (
                <div className="text-center py-14 text-[var(--t-text3)]">
                    <div className="text-3xl mb-2">🏢</div>
                    <p className="text-sm font-semibold">No suppliers found</p>
                </div>
            )}
                {filteredSuppliers.map(s => {
                    const balanceDue = Number(s.balance_due) || 0;
                    const hasDue = balanceDue > 0;

                    return (
                        <div key={s.id} 
                            onClick={() => handleOpenHistoryModal(s)}
                            className="bg-[var(--t-surface)] border-b border-[var(--t-border)] p-3 flex items-center justify-between hover:bg-[var(--t-surface2)] active:bg-[var(--t-surface2)] cursor-pointer transition-colors"
                        >
                            {/* Left: Supplier Info */}
                            <div className="flex flex-col min-w-0 pr-3">
                                <span className="font-bold text-[14px] text-[var(--t-text)] truncate">{s.name}</span>
                                <span className="text-[11px] text-[var(--t-text3)] truncate">{s.category || 'General'}</span>
                            </div>
                            
                            {/* Right: Amounts and Action inline */}
                            <div className="flex items-center gap-3 shrink-0">
                                <div className="text-right flex flex-col justify-center">
                                    <span className={`font-black text-[15px] leading-none ${hasDue ? 'text-[var(--t-danger)]' : 'text-emerald-500'}`}>
                                        {hasDue ? balanceDue.toLocaleString() : 'Clear'}
                                    </span>
                                    <span className="text-[9px] uppercase font-bold text-[var(--t-text3)] mt-[2px]">
                                        {hasDue ? 'Due' : 'Status'}
                                    </span>
                                </div>
                                
                                {hasDue && (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleOpenPaymentModal(s); }}
                                        className="h-7 px-3 text-[10px] font-bold uppercase bg-[var(--t-primary)]/10 text-[var(--t-primary)] rounded-md border border-[var(--t-primary)]/20 active:scale-95 transition-all"
                                    >
                                        Pay
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            
            {/* Add New FAB */}
            <div className="fixed bottom-24 right-4 z-10">
                <button
                    onClick={() => handleOpenModal()}
                    className="w-14 h-14 bg-[var(--t-primary)] text-white rounded-full flex items-center justify-center shadow-[0_8px_16px_rgba(0,0,0,0.3)] hover:scale-105 active:scale-95 transition-all outline-none"
                    style={{ boxShadow: '0 8px 16px color-mix(in srgb, var(--t-primary) 40%, transparent)' }}
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                </button>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`${editingItem ? 'Edit' : 'Add'} Supplier`}>
                <form onSubmit={handleSubmit} className="space-y-4 p-1">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-1">
                            <label className="block text-sm font-semibold text-[var(--t-text2)] mb-1">Company/Supplier Name</label>
                            <input
                                type="text"
                                value={formData.name || ''}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full rounded-xl border-[var(--t-border)] shadow-sm focus:ring-2 focus:ring-[var(--t-primary)] p-3 border outline-none"
                                placeholder="e.g. ABC Hardware"
                                required
                            />
                        </div>
                        <div className="col-span-1">
                            <label className="block text-sm font-semibold text-[var(--t-text2)] mb-1">Category</label>
                            <input
                                type="text"
                                value={formData.category || ''}
                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                                className="w-full rounded-xl border-[var(--t-border)] shadow-sm focus:ring-2 focus:ring-[var(--t-primary)] p-3 border outline-none"
                                placeholder="e.g. Cement, Steel"
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-[var(--t-text2)] mb-1">PAN/VAT Number</label>
                            <input
                                type="text"
                                value={formData.pan_number || ''}
                                onChange={e => setFormData({ ...formData, pan_number: e.target.value })}
                                className="w-full rounded-xl border-[var(--t-border)] shadow-sm focus:ring-2 focus:ring-[var(--t-primary)] p-3 border outline-none font-mono"
                                placeholder="9-digit number"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-[var(--t-text2)] mb-1">Address</label>
                            <input
                                type="text"
                                value={formData.address || ''}
                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                                className="w-full rounded-xl border-[var(--t-border)] shadow-sm focus:ring-2 focus:ring-[var(--t-primary)] p-3 border outline-none"
                                placeholder="Location"
                            />
                        </div>
                    </div>

                    <div className="p-4 bg-[var(--t-surface2)] rounded-2xl border border-[var(--t-border)] space-y-3">
                        <h4 className="text-[10px] font-bold text-[var(--t-text3)] uppercase tracking-widest">Banking Information</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[11px] font-bold text-[var(--t-text2)] uppercase mb-1">Bank Name</label>
                                <input
                                    type="text"
                                    value={formData.bank_name || ''}
                                    onChange={e => setFormData({ ...formData, bank_name: e.target.value })}
                                    className="w-full rounded-lg border-[var(--t-border)] shadow-sm focus:ring-1 focus:ring-[var(--t-primary)] p-2 text-sm border outline-none bg-[var(--t-surface)]"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-[var(--t-text2)] uppercase mb-1">Account Number</label>
                                <input
                                    type="text"
                                    value={formData.account_number || ''}
                                    onChange={e => setFormData({ ...formData, account_number: e.target.value })}
                                    className="w-full rounded-lg border-[var(--t-border)] shadow-sm focus:ring-1 focus:ring-[var(--t-primary)] p-2 text-sm border outline-none bg-[var(--t-surface)] font-mono"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-[var(--t-text2)] mb-1">Contact Person</label>
                            <input
                                type="text"
                                value={formData.contact_person || ''}
                                onChange={e => setFormData({ ...formData, contact_person: e.target.value })}
                                className="w-full rounded-xl border-[var(--t-border)] shadow-sm focus:ring-2 focus:ring-[var(--t-primary)] p-3 border outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-[var(--t-text2)] mb-1">Phone Number</label>
                            <input
                                type="text"
                                value={formData.phone || ''}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                className="w-full rounded-xl border-[var(--t-border)] shadow-sm focus:ring-2 focus:ring-[var(--t-primary)] p-3 border outline-none"
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-1">
                            <label className="block text-sm font-semibold text-[var(--t-text2)] mb-1">Email Address</label>
                            <input
                                type="email"
                                value={formData.email || ''}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                className="w-full rounded-xl border-[var(--t-border)] shadow-sm focus:ring-2 focus:ring-[var(--t-primary)] p-3 border outline-none"
                                placeholder="supplier@example.com"
                            />
                        </div>
                        <div className="col-span-1">
                            <label className="block text-sm font-semibold text-[var(--t-text2)] mb-1">Branch Location</label>
                            <input
                                type="text"
                                value={formData.branch || ''}
                                onChange={e => setFormData({ ...formData, branch: e.target.value })}
                                className="w-full rounded-xl border-[var(--t-border)] shadow-sm focus:ring-2 focus:ring-[var(--t-primary)] p-3 border outline-none"
                                placeholder="Main Branch"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-[var(--t-text2)] mb-1">Supplier Logo/Photo</label>
                        <div className="flex items-center gap-4">
                            {(formData.photo || editingItem?.photo) && (
                                <img
                                    src={formData.photo instanceof File ? URL.createObjectURL(formData.photo) : getMediaUrl(formData.photo || editingItem?.photo)}
                                    className="w-12 h-12 rounded-full object-cover border-2 border-[var(--t-border)]"
                                    alt="Preview"
                                />
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                onChange={e => setFormData({ ...formData, photo: e.target.files[0] })}
                                className="text-xs text-[var(--t-text2)] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[var(--t-nav-active-bg)] file:text-[var(--t-nav-active-text)] hover:file:bg-[var(--t-nav-active-bg)]"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-8">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-sm font-bold text-[var(--t-text2)] hover:text-[var(--t-text2)]">Cancel</button>
                        <button type="submit" disabled={loading} className="px-8 py-2.5 bg-[var(--t-primary)] text-white rounded-xl font-bold shadow-lg shadow-[var(--t-primary)]/20 hover:bg-[var(--t-primary2)] disabled:opacity-50 transition-all">
                            {loading ? 'Saving...' : (editingItem ? 'Update Supplier' : 'Create Supplier')}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Payment Modal */}
            <Modal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} title={`Pay Supplier: ${activeSupplier?.name}`}>
                <div className="space-y-6">
                    <form onSubmit={handlePaymentSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-[var(--t-text2)] mb-1">Paying Amount (Rs.)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={paymentFormData.amount}
                                    onChange={e => setPaymentFormData({ ...paymentFormData, amount: e.target.value })}
                                    className="w-full rounded-xl border-[var(--t-border)] shadow-sm focus:ring-2 focus:ring-green-500 p-3 border outline-none font-bold text-green-600"
                                    required
                                />
                                {activeSupplier?.balance_due > 0 && (
                                    <p className="text-[10px] text-[var(--t-danger)] mt-1 font-bold">Unpaid Dues: {activeSupplier?.balance_due?.toLocaleString()}</p>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-[var(--t-text2)] mb-1">Date</label>
                                <input
                                    type="date"
                                    value={paymentFormData.date}
                                    onChange={e => setPaymentFormData({ ...paymentFormData, date: e.target.value })}
                                    className="w-full rounded-xl border-[var(--t-border)] shadow-sm focus:ring-2 focus:ring-[var(--t-primary)] p-3 border outline-none"
                                    required
                                />
                            </div>
                        </div>

                        <div className="bg-[var(--t-surface2)] p-5 rounded-2xl border border-[var(--t-border)] mt-4">
                            <label className="block text-[10px] font-black text-[var(--t-text3)] uppercase tracking-[0.2em] mb-3 ml-1">Funding Source (Where did money come from?)</label>
                            <select
                                value={paymentFormData.funding_source}
                                onChange={e => setPaymentFormData({ ...paymentFormData, funding_source: e.target.value })}
                                className="w-full rounded-xl border-[var(--t-border)] shadow-sm focus:ring-2 focus:ring-[var(--t-primary)] p-3 border outline-none appearance-none bg-[var(--t-surface)] font-black text-[var(--t-text)]"
                                required
                            >
                                <option value="">Select Account / Funding Source</option>
                                {dashboardData.funding?.map(f => (
                                    <option key={f.id} value={f.id}>
                                        {f.source_type === 'LOAN' ? '🏦 Karja: ' : f.source_type === 'OWN_MONEY' ? '💰 Bachat: ' : '🤝 Saapathi: '}
                                        {f.name} (Avl: Rs. {f.current_balance?.toLocaleString()})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-[var(--t-text2)] mb-1">Method</label>
                                <select
                                    value={paymentFormData.method}
                                    onChange={e => setPaymentFormData({ ...paymentFormData, method: e.target.value })}
                                    className="w-full rounded-xl border-[var(--t-border)] shadow-sm focus:ring-2 focus:ring-[var(--t-primary)] p-3 border outline-none bg-[var(--t-surface)] font-medium"
                                    required
                                >
                                    <option value="CASH">💰 Nagad (Cash)</option>
                                    <option value="BANK_TRANSFER">🏦 Bank / ConnectIPS</option>
                                    <option value="QR">📱 eSewa / Khalti (QR)</option>
                                    <option value="CHECK">📜 Cheque</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-[var(--t-text2)] mb-1">Reference ID</label>
                                <input
                                    type="text"
                                    value={paymentFormData.reference_id}
                                    onChange={e => setPaymentFormData({ ...paymentFormData, reference_id: e.target.value })}
                                    className="w-full rounded-xl border-[var(--t-border)] shadow-sm focus:ring-2 focus:ring-[var(--t-primary)] p-3 border outline-none"
                                    placeholder="Txn ID / Check #"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-[var(--t-text2)] mb-1">Remarks / Notes</label>
                                <textarea
                                    value={paymentFormData.notes}
                                    onChange={e => setPaymentFormData({ ...paymentFormData, notes: e.target.value })}
                                    className="w-full rounded-xl border-[var(--t-border)] shadow-sm focus:ring-2 focus:ring-[var(--t-primary)] p-3 border outline-none min-h-[80px]"
                                    placeholder="Optional payment remarks..."
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-8">
                            <button type="button" onClick={() => setIsPaymentModalOpen(false)} className="px-6 py-2.5 text-sm font-bold text-[var(--t-text2)] hover:text-[var(--t-text2)]">Cancel</button>
                            <button type="submit" disabled={loading} className="px-8 py-2.5 bg-green-600 text-white rounded-xl font-bold shadow-lg shadow-green-500/20 hover:bg-green-700 disabled:opacity-50 transition-all flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                {loading ? 'Processing...' : 'Make Payment'}
                            </button>
                        </div>
                    </form>
                </div>
            </Modal>

            {/* History Modal */}
            <Modal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} title={`Payment History: ${activeSupplier?.name}`}>
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                    {activeSupplier && getSupplierHistory(activeSupplier.id).length > 0 ? (
                        getSupplierHistory(activeSupplier.id).map(txn => (
                            <div key={txn.id} className="flex justify-between items-center p-3 border-b border-[var(--t-border)] last:border-0 hover:bg-[var(--t-surface2)] rounded-lg transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg ${txn.type === 'BILL' ? 'bg-[var(--t-danger)]/10 text-[var(--t-danger)] border border-[var(--t-danger)]/20' : 'bg-green-500/10 text-green-500 border border-green-500/20'}`}>
                                        {txn.type === 'BILL' ? '🧾' : '💸'}
                                    </div>
                                    <div>
                                        <div className="font-bold text-sm text-[var(--t-text)]">{txn.title}</div>
                                        <div className="text-[10px] text-[var(--t-text2)] font-bold uppercase tracking-wider">
                                            {new Date(txn.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            {txn.type === 'PAYMENT' && ` • ${txn.method?.replace('_', ' ')}`}
                                            {txn.type === 'BILL' && ` • ${txn.status}`}
                                        </div>
                                        {txn.notes && <div className="text-xs text-[var(--t-text2)] italic mt-0.5 max-w-[200px] truncate" title={txn.notes}>Txn Note: {txn.notes}</div>}
                                    </div>
                                </div>
                                <div className={`font-black tracking-tight text-right ${txn.type === 'BILL' ? 'text-[var(--t-danger)]' : 'text-green-600'}`}>
                                    <div className="text-sm">{txn.type === 'BILL' ? '+' : '-'}{Number(txn.amount).toLocaleString('en-IN')}</div>
                                    <div className="text-[8px] uppercase tracking-wider opacity-70">{txn.type}</div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="py-8 text-center text-[var(--t-text3)] italic text-sm">No transaction history found.</div>
                    )}
                </div>
                <div className="mt-6 pt-4 border-t border-[var(--t-border)]">
                    <div className="bg-[var(--t-surface2)] rounded-xl p-4 space-y-2">
                        <div className="flex justify-between items-center"><span className="text-[var(--t-text2)] font-bold text-[10px] uppercase tracking-wider">Total Billed:</span><span className="font-bold text-[var(--t-text)]">Rs. {Number(activeSupplier?.total_billed || 0).toLocaleString()}</span></div>
                        <div className="flex justify-between items-center"><span className="text-[var(--t-text2)] font-bold text-[10px] uppercase tracking-wider">Total Paid:</span><span className="font-bold text-green-600">Rs. {Number(activeSupplier?.total_paid || 0).toLocaleString()}</span></div>
                        <div className="flex justify-between items-center pt-2 border-t border-[var(--t-border)] mt-2"><span className="text-[var(--t-danger)] font-black text-xs uppercase tracking-widest">Balance Due:</span><span className="font-black text-[var(--t-danger)] text-lg">Rs. {Number(activeSupplier?.balance_due || 0).toLocaleString()}</span></div>
                    </div>
                </div>
                <div className="flex justify-end gap-3 mt-4">
                    <button type="button" onClick={() => setIsHistoryModalOpen(false)} className="px-6 py-2.5 bg-[var(--t-surface3)] text-[var(--t-text2)] rounded-xl font-bold hover:bg-gray-200 transition-colors">Close</button>
                    <button type="button" onClick={() => { setIsHistoryModalOpen(false); handleOpenPaymentModal(activeSupplier); }} className="px-6 py-2.5 bg-[var(--t-primary)] text-white rounded-xl font-bold hover:bg-[var(--t-primary2)] transition-colors shadow-lg shadow-[var(--t-primary)]/20">Pay Now</button>
                </div>
            </Modal>

            <ConfirmModal 
                isOpen={confirmConfig.isOpen}
                title={confirmConfig.title}
                message={confirmConfig.message}
                confirmText={confirmConfig.confirmText}
                onConfirm={confirmConfig.onConfirm}
                onCancel={closeConfirm}
                type={confirmConfig.type || 'warning'}
            />
        </div >
    );
};
export default MobileSupplierList;
