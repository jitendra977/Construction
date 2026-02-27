import React, { useState } from 'react';
import { dashboardService, getMediaUrl } from '../../../services/api';
import Modal from '../../common/Modal';
import { useConstruction } from '../../../context/ConstructionContext';

const SuppliersTab = ({ searchQuery = '' }) => {
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

    const handleDelete = async (id) => {
        if (!window.confirm(`Are you sure you want to delete this Supplier?`)) return;
        try {
            await dashboardService.deleteSupplier(id);
            refreshData();
        } catch (error) {
            alert("Delete failed. This item might be linked to other records.");
        }
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

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-2">
                <p className="text-sm text-gray-500">Manage material suppliers, contact persons, and payment credentials.</p>
                <button
                    onClick={() => handleOpenModal()}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors shadow-sm"
                >
                    + Add New Supplier
                </button>
            </div>

            {/* Desktop View: Table */}
            <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Supplier Profile</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Contact Details</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Billing & Payments</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filteredSuppliers.map(s => {
                            const percent = s.total_billed > 0 ? (s.total_paid / s.total_billed) * 100 : 0;
                            return (
                                <tr key={s.id} className="hover:bg-gray-50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            {s.photo ? (
                                                <img
                                                    src={getMediaUrl(s.photo)}
                                                    alt={s.name}
                                                    className="w-10 h-10 rounded-full object-cover border border-indigo-100 shadow-sm"
                                                />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold border border-indigo-100 shadow-sm">
                                                    {s.name.charAt(0)}
                                                </div>
                                            )}
                                            <div className="flex flex-col gap-1">
                                                <div className="font-bold text-gray-900 leading-tight">{s.name}</div>
                                                <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[10px] font-bold uppercase w-fit border border-indigo-100">
                                                    {s.category || 'General'}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <div className="text-gray-900 font-semibold text-sm">{s.contact_person}</div>
                                            <div className="text-gray-500 text-xs flex items-center gap-1 mt-0.5">
                                                <span>{s.phone}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <div className="flex justify-between items-baseline mb-1">
                                                <span className="text-sm font-black text-gray-900">{s.total_paid?.toLocaleString()}</span>
                                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">of {s.total_billed?.toLocaleString()}</span>
                                            </div>
                                            <div className="w-full bg-gray-100 h-1 rounded-full overflow-hidden">
                                                <div className="bg-indigo-600 h-full transition-all duration-700" style={{ width: `${percent}%` }} />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleOpenPaymentModal(s)} className="text-green-600 hover:text-green-900 font-bold text-[10px] uppercase tracking-wider bg-green-50 hover:bg-green-100 px-2 py-1 rounded">Pay</button>
                                            <button onClick={() => handleOpenHistoryModal(s)} className="text-blue-600 hover:text-blue-900 font-bold text-[10px] uppercase tracking-wider bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded">History</button>
                                            <button onClick={() => handleOpenModal(s)} className="text-indigo-600 hover:text-indigo-900 font-bold text-[10px] uppercase tracking-wider">Edit</button>
                                            <button onClick={() => handleDelete(s.id)} className="text-red-500 hover:text-red-700 font-bold text-[10px] uppercase tracking-wider">Delete</button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredSuppliers.length === 0 && (
                            <tr>
                                <td colSpan="4" className="px-6 py-10 text-center text-gray-400 italic text-sm">No suppliers found matching your query.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile View: Cards */}
            <div className="lg:hidden space-y-4">
                {filteredSuppliers.map(s => {
                    const percent = s.total_billed > 0 ? (s.total_paid / s.total_billed) * 100 : 0;
                    return (
                        <div key={s.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col gap-4">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    {s.photo ? (
                                        <img
                                            src={getMediaUrl(s.photo)}
                                            alt={s.name}
                                            className="w-10 h-10 rounded-full object-cover border border-indigo-100 shadow-sm"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold border border-indigo-100 shadow-sm">
                                            {s.name.charAt(0)}
                                        </div>
                                    )}
                                    <div>
                                        <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest px-1.5 py-0.5 bg-indigo-50 rounded leading-none mb-2 inline-block">#{s.category || 'General'}</span>
                                        <h3 className="font-bold text-gray-900 text-base leading-tight">{s.name}</h3>
                                        <div className="text-[10px] text-gray-500 font-medium mt-1">{s.phone}</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Total Bill</div>
                                    <div className="text-sm font-black text-gray-900 leading-none">{s.total_billed?.toLocaleString()}</div>
                                </div>
                            </div>

                            <div className="bg-gray-50 rounded-2xl p-4">
                                <div className="flex justify-between items-end mb-2">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter leading-none mb-1">Total Paid</span>
                                        <span className="text-lg font-black text-emerald-600 leading-none">{s.total_paid?.toLocaleString()}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] font-black text-indigo-600 uppercase tracking-tight">{Math.round(percent)}% CLEARED</span>
                                    </div>
                                </div>
                                <div className="w-full bg-white h-2 rounded-full overflow-hidden border border-gray-100 p-0.5 mb-2">
                                    <div className="bg-indigo-500 h-full rounded-full transition-all duration-1000" style={{ width: `${percent}%` }} />
                                </div>
                                {Number(s.balance_due) > 0 && (
                                    <div className="flex justify-between items-center text-[10px] font-black border-t border-gray-200 pt-2 mt-2">
                                        <span className="text-red-500 uppercase tracking-tighter">Outstanding Balance</span>
                                        <span className="text-red-600 font-black">{s.balance_due?.toLocaleString()}</span>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3 pb-3 border-b border-gray-100 mb-3">
                                <button onClick={() => handleOpenPaymentModal(s)} className="col-span-1 py-2.5 bg-green-50 text-green-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-all border border-green-200">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    Pay
                                </button>
                                <button onClick={() => handleOpenHistoryModal(s)} className="col-span-1 py-2.5 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-all border border-blue-200">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                    History
                                </button>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => handleOpenModal(s)} className="py-2.5 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-all">
                                    Edit Supplier
                                </button>
                                <button onClick={() => handleDelete(s.id)} className="py-2.5 bg-red-50 text-red-600 rounded-xl text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-all">
                                    Delete
                                </button>
                            </div>
                        </div>
                    );
                })}
                {filteredSuppliers.length === 0 && (
                    <div className="py-10 text-center text-gray-400 italic bg-white rounded-2xl border-2 border-dashed border-gray-100">
                        No suppliers found matching your query.
                    </div>
                )}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`${editingItem ? 'Edit' : 'Add'} Supplier`}>
                <form onSubmit={handleSubmit} className="space-y-4 p-1">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-1">
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Company/Supplier Name</label>
                            <input
                                type="text"
                                value={formData.name || ''}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none"
                                placeholder="e.g. ABC Hardware"
                                required
                            />
                        </div>
                        <div className="col-span-1">
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
                            <input
                                type="text"
                                value={formData.category || ''}
                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                                className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none"
                                placeholder="e.g. Cement, Steel"
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">PAN/VAT Number</label>
                            <input
                                type="text"
                                value={formData.pan_number || ''}
                                onChange={e => setFormData({ ...formData, pan_number: e.target.value })}
                                className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none font-mono"
                                placeholder="9-digit number"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Address</label>
                            <input
                                type="text"
                                value={formData.address || ''}
                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                                className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none"
                                placeholder="Location"
                            />
                        </div>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3">
                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Banking Information</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Bank Name</label>
                                <input
                                    type="text"
                                    value={formData.bank_name || ''}
                                    onChange={e => setFormData({ ...formData, bank_name: e.target.value })}
                                    className="w-full rounded-lg border-gray-200 shadow-sm focus:ring-1 focus:ring-indigo-500 p-2 text-sm border outline-none bg-white"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Account Number</label>
                                <input
                                    type="text"
                                    value={formData.account_number || ''}
                                    onChange={e => setFormData({ ...formData, account_number: e.target.value })}
                                    className="w-full rounded-lg border-gray-200 shadow-sm focus:ring-1 focus:ring-indigo-500 p-2 text-sm border outline-none bg-white font-mono"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Contact Person</label>
                            <input
                                type="text"
                                value={formData.contact_person || ''}
                                onChange={e => setFormData({ ...formData, contact_person: e.target.value })}
                                className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Phone Number</label>
                            <input
                                type="text"
                                value={formData.phone || ''}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none"
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-1">
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Email Address</label>
                            <input
                                type="email"
                                value={formData.email || ''}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none"
                                placeholder="supplier@example.com"
                            />
                        </div>
                        <div className="col-span-1">
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Branch Location</label>
                            <input
                                type="text"
                                value={formData.branch || ''}
                                onChange={e => setFormData({ ...formData, branch: e.target.value })}
                                className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none"
                                placeholder="Main Branch"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Supplier Logo/Photo</label>
                        <div className="flex items-center gap-4">
                            {(formData.photo || editingItem?.photo) && (
                                <img
                                    src={formData.photo instanceof File ? URL.createObjectURL(formData.photo) : getMediaUrl(formData.photo || editingItem?.photo)}
                                    className="w-12 h-12 rounded-full object-cover border-2 border-indigo-100"
                                    alt="Preview"
                                />
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                onChange={e => setFormData({ ...formData, photo: e.target.files[0] })}
                                className="text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-8">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700">Cancel</button>
                        <button type="submit" disabled={loading} className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 transition-all">
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
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Paying Amount (Rs.)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={paymentFormData.amount}
                                    onChange={e => setPaymentFormData({ ...paymentFormData, amount: e.target.value })}
                                    className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-green-500 p-3 border outline-none font-bold text-green-600"
                                    required
                                />
                                {activeSupplier?.balance_due > 0 && (
                                    <p className="text-[10px] text-red-500 mt-1 font-bold">Unpaid Dues: {activeSupplier?.balance_due?.toLocaleString()}</p>
                                )}
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

                        <div className="bg-gray-50/50 p-5 rounded-2xl border border-gray-100 mt-4">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 ml-1">Funding Source (Where did money come from?)</label>
                            <select
                                value={paymentFormData.funding_source}
                                onChange={e => setPaymentFormData({ ...paymentFormData, funding_source: e.target.value })}
                                className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none appearance-none bg-white font-black text-gray-900"
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
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Remarks / Notes</label>
                                <textarea
                                    value={paymentFormData.notes}
                                    onChange={e => setPaymentFormData({ ...paymentFormData, notes: e.target.value })}
                                    className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none min-h-[80px]"
                                    placeholder="Optional payment remarks..."
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-8">
                            <button type="button" onClick={() => setIsPaymentModalOpen(false)} className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700">Cancel</button>
                            <button type="submit" disabled={loading} className="px-8 py-2.5 bg-green-600 text-white rounded-xl font-bold shadow-lg shadow-green-200 hover:bg-green-700 disabled:opacity-50 transition-all flex items-center gap-2">
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
                            <div key={txn.id} className="flex justify-between items-center p-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 rounded-lg transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg ${txn.type === 'BILL' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-600 border border-green-100'}`}>
                                        {txn.type === 'BILL' ? '🧾' : '💸'}
                                    </div>
                                    <div>
                                        <div className="font-bold text-sm text-gray-900">{txn.title}</div>
                                        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                                            {new Date(txn.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            {txn.type === 'PAYMENT' && ` • ${txn.method?.replace('_', ' ')}`}
                                            {txn.type === 'BILL' && ` • ${txn.status}`}
                                        </div>
                                        {txn.notes && <div className="text-xs text-gray-500 italic mt-0.5 max-w-[200px] truncate" title={txn.notes}>Txn Note: {txn.notes}</div>}
                                    </div>
                                </div>
                                <div className={`font-black tracking-tight text-right ${txn.type === 'BILL' ? 'text-red-500' : 'text-green-600'}`}>
                                    <div className="text-sm">{txn.type === 'BILL' ? '+' : '-'}{Number(txn.amount).toLocaleString('en-IN')}</div>
                                    <div className="text-[8px] uppercase tracking-wider opacity-70">{txn.type}</div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="py-8 text-center text-gray-400 italic text-sm">No transaction history found.</div>
                    )}
                </div>
                <div className="mt-6 pt-4 border-t border-gray-100">
                    <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                        <div className="flex justify-between items-center"><span className="text-gray-500 font-bold text-[10px] uppercase tracking-wider">Total Billed:</span><span className="font-bold text-gray-900">Rs. {Number(activeSupplier?.total_billed || 0).toLocaleString()}</span></div>
                        <div className="flex justify-between items-center"><span className="text-gray-500 font-bold text-[10px] uppercase tracking-wider">Total Paid:</span><span className="font-bold text-green-600">Rs. {Number(activeSupplier?.total_paid || 0).toLocaleString()}</span></div>
                        <div className="flex justify-between items-center pt-2 border-t border-gray-200 mt-2"><span className="text-red-500 font-black text-xs uppercase tracking-widest">Balance Due:</span><span className="font-black text-red-600 text-lg">Rs. {Number(activeSupplier?.balance_due || 0).toLocaleString()}</span></div>
                    </div>
                </div>
                <div className="flex justify-end gap-3 mt-4">
                    <button type="button" onClick={() => setIsHistoryModalOpen(false)} className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors">Close</button>
                    <button type="button" onClick={() => { setIsHistoryModalOpen(false); handleOpenPaymentModal(activeSupplier); }} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200">Pay Now</button>
                </div>
            </Modal>
        </div >
    );
};
export default SuppliersTab;
