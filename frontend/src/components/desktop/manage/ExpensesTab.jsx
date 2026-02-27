import React, { useState } from 'react';
import { dashboardService } from '../../../services/api';
import Modal from '../../common/Modal';
import { useConstruction } from '../../../context/ConstructionContext';
import ExpenseDetailModal from '../../common/ExpenseDetailModal';

// Redesigned Sub-components
import SummaryCards from './expenses/SummaryCards';
import CategoryUtilization from './expenses/CategoryUtilization';
import ExpenseActions from './expenses/ExpenseActions';
import ExpenseList from './expenses/ExpenseList';

const ExpensesTab = ({ searchQuery: initialSearchQuery = '' }) => {
    const { dashboardData, refreshData, formatCurrency, budgetStats } = useConstruction();
    const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
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
        <div className="max-w-[1400px] mx-auto px-1 py-4 space-y-10 animate-in fade-in duration-700">
            {/* 1. Header & Quick Summary */}
            <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Financial Overview</h2>
                <p className="text-sm text-gray-500 max-w-2xl font-medium">
                    Monitor project spending, manage vendor disbursements, and track budget utilization across all construction phases.
                </p>
            </div>

            {/* 2. Top Summary Metrics Cards */}
            <SummaryCards
                budgetStats={budgetStats}
                dashboardData={dashboardData}
                formatCurrency={formatCurrency}
            />

            {/* 3. Budget Utilization Visualization */}
            <CategoryUtilization
                budgetStats={budgetStats}
                formatCurrency={formatCurrency}
            />

            {/* 4. Search & Action Controls */}
            <ExpenseActions
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                handleOpenModal={handleOpenModal}
            />

            {/* 5. Main Expense List */}
            <ExpenseList
                expenses={filteredExpenses}
                handleViewDetail={handleViewDetail}
                handleOpenPaymentModal={handleOpenPaymentModal}
                handleOpenModal={handleOpenModal}
                handleDelete={handleDelete}
                formatCurrency={formatCurrency}
                dashboardData={dashboardData}
            />

            {/* MODALS SECTION */}

            {/* Expense Create/Edit Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`${editingItem ? 'Edit' : 'Add'} Expense`}>
                <form onSubmit={handleSubmit} className="space-y-6 p-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Expense Title</label>
                            <input
                                type="text"
                                value={formData.title || ''}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                className="w-full rounded-2xl border-gray-100 bg-gray-50/50 shadow-sm focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 p-4 border outline-none font-bold transition-all"
                                placeholder="e.g. 50 Bags Cement"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Expense Type</label>
                            <div className="relative">
                                <select
                                    value={formData.expense_type || 'MATERIAL'}
                                    onChange={e => setFormData({ ...formData, expense_type: e.target.value })}
                                    className="w-full rounded-2xl border-gray-100 bg-gray-50/50 shadow-sm focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 p-4 border outline-none appearance-none font-bold transition-all"
                                    required
                                >
                                    <option value="MATERIAL">🏗️ Material Purchase</option>
                                    <option value="LABOR">👷 Labor/Worker Payment</option>
                                    <option value="FEES">📜 Professional Fees</option>
                                    <option value="GOVT">🏛️ Government/Permit Fees</option>
                                    <option value="OTHER">📁 Other</option>
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Transaction Date</label>
                            <input
                                type="date"
                                value={formData.date || ''}
                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                                className="w-full rounded-2xl border-gray-100 bg-gray-50/50 shadow-sm focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 p-4 border outline-none font-bold transition-all"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Total Amount (Rs.)</label>
                            <input
                                type="number"
                                value={formData.amount || 0}
                                onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                className={`w-full rounded-2xl border-gray-100 bg-gray-50/50 shadow-sm focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 p-4 border outline-none font-black text-indigo-600 ${formData.expense_type === 'MATERIAL' && formData.material ? 'opacity-60 cursor-not-allowed bg-gray-100' : ''}`}
                                disabled={formData.expense_type === 'MATERIAL' && !!formData.material}
                                required
                            />
                            {formData.expense_type === 'MATERIAL' && formData.material && (
                                <p className="text-[10px] text-indigo-500 mt-2 font-bold italic px-1">💸 System calculated: Qty × Unit Price</p>
                            )}
                        </div>
                    </div>

                    {/* Inventory Integration Block */}
                    {formData.expense_type === 'MATERIAL' && (
                        <div className="bg-gradient-to-br from-indigo-50/50 to-blue-50/50 p-6 rounded-[2rem] border border-indigo-100/50 space-y-6 shadow-sm">
                            <h3 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] flex items-center gap-3">
                                <div className="p-1.5 bg-indigo-500 text-white rounded-lg">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                                </div>
                                Stock Inventory Connector
                            </h3>
                            <div>
                                <label className="block text-[11px] font-bold text-indigo-900/60 mb-2">Link to Catalog Item</label>
                                <div className="relative">
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
                                        className="w-full rounded-2xl border-white bg-white/60 shadow-sm focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 p-4 border outline-none appearance-none font-bold"
                                    >
                                        <option value="">Standard Expense (No Stock Sync)</option>
                                        {dashboardData.materials?.map(m => (
                                            <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-300">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                    </div>
                                </div>
                            </div>
                            {formData.material && (
                                <div className="grid grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-4">
                                    <div className="bg-white/40 p-1 rounded-3xl">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-4">Quantity ({formData.unit || 'Units'})</label>
                                        <input
                                            type="number"
                                            value={formData.quantity || ''}
                                            onChange={e => {
                                                const qty = parseFloat(e.target.value) || 0;
                                                const up = parseFloat(formData.unit_price) || 0;
                                                setFormData({ ...formData, quantity: e.target.value, amount: (qty * up).toFixed(2) });
                                            }}
                                            className="w-full bg-transparent border-none focus:ring-0 p-3 px-4 font-black text-gray-900 text-lg"
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div className="bg-white/40 p-1 rounded-3xl">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-4">Unit Price (Rs.)</label>
                                        <input
                                            type="number"
                                            value={formData.unit_price || ''}
                                            onChange={e => {
                                                const up = parseFloat(e.target.value) || 0;
                                                const qty = parseFloat(formData.quantity) || 0;
                                                setFormData({ ...formData, unit_price: e.target.value, amount: (qty * up).toFixed(2) });
                                            }}
                                            className="w-full bg-transparent border-none focus:ring-0 p-3 px-4 font-black text-emerald-600 text-lg"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Recipient (Vendor/Person)</label>
                            {formData.expense_type === 'MATERIAL' ? (
                                <div className="relative">
                                    <select
                                        value={formData.supplier || ''}
                                        onChange={e => {
                                            const s = dashboardData.suppliers?.find(sup => sup.id === parseInt(e.target.value));
                                            setFormData({ ...formData, supplier: e.target.value, paid_to: s ? s.name : formData.paid_to });
                                        }}
                                        className="w-full rounded-2xl border-gray-100 bg-gray-50/50 shadow-sm focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 p-4 border outline-none appearance-none font-bold"
                                    >
                                        <option value="">Select Supplier</option>
                                        {dashboardData.suppliers?.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
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
                                            setFormData({ ...formData, contractor: e.target.value, paid_to: c ? c.name : formData.paid_to });
                                        }}
                                        className="w-full rounded-2xl border-gray-100 bg-gray-50/50 shadow-sm focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 p-4 border outline-none appearance-none font-bold"
                                    >
                                        <option value="">Select Contractor</option>
                                        {dashboardData.contractors?.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                    </div>
                                </div>
                            ) : (
                                <input
                                    type="text"
                                    value={formData.paid_to || ''}
                                    onChange={e => setFormData({ ...formData, paid_to: e.target.value })}
                                    className="w-full rounded-2xl border-gray-100 bg-gray-50/50 shadow-sm focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 p-4 border outline-none font-bold placeholder:font-medium"
                                    placeholder="Who was paid?"
                                />
                            )}
                        </div>
                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Category Assignment</label>
                            <div className="relative">
                                <select
                                    value={formData.category || ''}
                                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                                    className="w-full rounded-2xl border-gray-100 bg-gray-50/50 shadow-sm focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 p-4 border outline-none appearance-none font-bold"
                                    required
                                >
                                    <option value="">Select Category</option>
                                    {dashboardData.budgetCategories?.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Project Phase Attachment</label>
                            <div className="relative">
                                <select
                                    value={formData.phase || ''}
                                    onChange={e => setFormData({ ...formData, phase: e.target.value })}
                                    className="w-full rounded-2xl border-gray-100 bg-gray-50/50 shadow-sm focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 p-4 border outline-none appearance-none font-bold"
                                >
                                    <option value="">General Project Cost</option>
                                    {dashboardData.phases?.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Specific Area/Room</label>
                            <div className="relative">
                                <select
                                    value={formData.room || ''}
                                    onChange={e => setFormData({ ...formData, room: e.target.value })}
                                    className="w-full rounded-2xl border-gray-100 bg-gray-50/50 shadow-sm focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 p-4 border outline-none appearance-none font-bold"
                                >
                                    <option value="">Not Specific to Area</option>
                                    {dashboardData.rooms?.map(r => (
                                        <option key={r.id} value={r.id}>{r.name} ({r.floor_name})</option>
                                    ))}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-[2rem] border-2 border-dashed border-gray-100 space-y-4 shadow-sm">
                        <label className="block text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] ml-1">Payment/Funding Source</label>
                        <div className="relative">
                            <select
                                value={formData.funding_source || ''}
                                onChange={e => setFormData({ ...formData, funding_source: e.target.value })}
                                className="w-full rounded-2xl border-transparent bg-gray-50 p-4 border outline-none appearance-none font-black text-gray-900 shadow-inner"
                                required
                            >
                                <option value="">Assign funding account...</option>
                                {dashboardData.funding?.map(f => (
                                    <option key={f.id} value={f.id}>
                                        {f.source_type === 'LOAN' ? '🏦' : f.source_type === 'OWN_MONEY' ? '💰' : '🤝'} {f.name}
                                    </option>
                                ))}
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                            </div>
                        </div>
                        {formData.funding_source && (
                            <div className="flex items-center justify-between px-3 animate-in fade-in slide-in-from-left-2">
                                <span className="text-[10px] font-bold text-gray-400 italic">Account Status</span>
                                {(() => {
                                    const fs = dashboardData.funding?.find(f => f.id === parseInt(formData.funding_source));
                                    if (!fs) return null;
                                    return (
                                        <div className="flex items-center gap-3">
                                            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${fs.source_type === 'LOAN' ? 'bg-orange-100 text-orange-600' :
                                                    fs.source_type === 'OWN_MONEY' ? 'bg-emerald-100 text-emerald-600' :
                                                        'bg-purple-100 text-purple-600'
                                                }`}>
                                                {fs.source_type}
                                            </span>
                                            <span className="text-[12px] font-black text-gray-900">Avl: {formatCurrency(fs.current_balance)}</span>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-4 mt-10">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="px-8 py-3.5 text-xs font-black uppercase tracking-[0.2em] text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-2xl transition-all"
                        >
                            Discard
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-10 py-3.5 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 hover:bg-indigo-700 hover:-translate-y-0.5 disabled:opacity-50 transition-all active:scale-95"
                        >
                            {loading ? 'Processing...' : (editingItem ? 'Update Change' : 'Confirm Expense')}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Payment Modal */}
            <Modal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} title="Record Transaction">
                <div className="space-y-8 p-1">
                    {/* Source Context Card */}
                    {activeExpense?.funding_source && (
                        <div className={`p-6 rounded-3xl border flex flex-col gap-4 relative overflow-hidden ${(() => {
                            const fs = dashboardData.funding?.find(f => f.id === activeExpense.funding_source);
                            return fs?.source_type === 'LOAN' ? 'bg-orange-50 border-orange-100 text-orange-800' :
                                fs?.source_type === 'BORROWED' ? 'bg-purple-50 border-purple-100 text-purple-800' :
                                    'bg-green-50 border-green-100 text-green-800';
                        })()}`}>
                            <div className="flex justify-between items-start z-10">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-white/80 backdrop-blur-md rounded-2xl shadow-sm">
                                        <svg className="w-6 h-6 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 leading-none mb-1">Source Account</span>
                                        <span className="text-sm font-black uppercase tracking-tight">{activeExpense.funding_source_name}</span>
                                    </div>
                                </div>
                                <div className="text-right flex flex-col">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 leading-none mb-1">Available Funds</span>
                                    <span className="text-lg font-black tracking-tight">
                                        {formatCurrency(dashboardData.funding?.find(f => f.id === activeExpense.funding_source)?.current_balance || 0)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Transaction History Flow */}
                    {activeExpense?.payments?.length > 0 && (
                        <div className="bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-4 ml-1">Previous Payments</h4>
                            <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                {activeExpense.payments.map((p, idx) => (
                                    <div key={idx} className="flex justify-between items-center bg-white p-4 rounded-2xl border border-gray-50 shadow-sm transition-hover">
                                        <div className="flex flex-col">
                                            <span className="text-[13px] font-black text-gray-900">{formatCurrency(p.amount)}</span>
                                            <span className="text-[10px] text-gray-400 font-bold mt-0.5 uppercase tracking-widest">
                                                {p.method} • {new Date(p.date).toLocaleDateString()}
                                            </span>
                                        </div>
                                        {p.reference_id && <div className="px-3 py-1 bg-indigo-50 text-indigo-500 text-[9px] font-black rounded-lg border border-indigo-100 uppercase tracking-tighter">#{p.reference_id}</div>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <form onSubmit={handlePaymentSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Disbursement Amount</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    max={activeExpense?.balance_due}
                                    value={paymentFormData.amount}
                                    onChange={e => setPaymentFormData({ ...paymentFormData, amount: e.target.value })}
                                    className="w-full rounded-2xl border-gray-100 bg-emerald-50/30 p-4 border focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 outline-none font-black text-emerald-600 text-xl shadow-inner transition-all"
                                    required
                                />
                                <div className="flex justify-between mt-2 px-1">
                                    <span className="text-[10px] text-gray-400 font-bold uppercase">Pending balance</span>
                                    <span className="text-[10px] text-rose-500 font-black uppercase">{formatCurrency(activeExpense?.balance_due)}</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Date of payment</label>
                                <input
                                    type="date"
                                    value={paymentFormData.date}
                                    onChange={e => setPaymentFormData({ ...paymentFormData, date: e.target.value })}
                                    className="w-full rounded-2xl border-gray-100 bg-gray-50/50 p-4 border focus:ring-4 focus:ring-indigo-100 outline-none font-bold"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Disbursement Method</label>
                                <div className="relative">
                                    <select
                                        value={paymentFormData.method}
                                        onChange={e => setPaymentFormData({ ...paymentFormData, method: e.target.value })}
                                        className="w-full rounded-2xl border-gray-100 bg-gray-50/50 p-4 border focus:ring-4 focus:ring-indigo-100 outline-none appearance-none font-black text-gray-900"
                                        required
                                    >
                                        <option value="CASH">💰 Nagad (Cash)</option>
                                        <option value="BANK_TRANSFER">🏦 Bank / ConnectIPS</option>
                                        <option value="QR">📱 eSewa / Khalti (QR)</option>
                                        <option value="CHECK">📜 Cheque</option>
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Reference / Txn ID</label>
                                <input
                                    type="text"
                                    value={paymentFormData.reference_id}
                                    onChange={e => setPaymentFormData({ ...paymentFormData, reference_id: e.target.value })}
                                    className="w-full rounded-2xl border-gray-100 bg-gray-50/50 p-4 border focus:ring-4 focus:ring-indigo-100 outline-none font-bold"
                                    placeholder="e.g. eSewa ID / Check #"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-4 mt-10">
                            <button
                                type="button"
                                onClick={() => setIsPaymentModalOpen(false)}
                                className="px-8 py-3.5 text-xs font-black uppercase tracking-[0.2em] text-gray-400 hover:text-gray-900 rounded-2xl transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-10 py-3.5 bg-emerald-600 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-emerald-100 hover:bg-emerald-700 hover:-translate-y-0.5 active:scale-95 transition-all disabled:opacity-50"
                            >
                                {loading ? 'Processing...' : 'Confirm Payment'}
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
