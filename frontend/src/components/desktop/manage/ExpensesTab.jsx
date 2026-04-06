import React, { useState } from 'react';
import { dashboardService } from '../../../services/api';
import Modal from '../../common/Modal';
import { useConstruction } from '../../../context/ConstructionContext';
import ExpenseDetailModal from '../../common/ExpenseDetailModal';
import PdfExportButton from '../../common/PdfExportButton';
import ConfirmModal from '../../common/ConfirmModal';

// Redesigned Sub-components
import SummaryCards from './expenses/SummaryCards';
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
        reference_id: '',
        proof_photo: null
    });
    const [photoPreview, setPhotoPreview] = useState(null);

    // Confirmation Modal System
    const [confirmConfig, setConfirmConfig] = useState({ isOpen: false });
    const showConfirm = (config) => setConfirmConfig({ ...config, isOpen: true });
    const closeConfirm = () => setConfirmConfig({ ...confirmConfig, isOpen: false });

    const filteredExpenses = dashboardData.expenses?.filter(e =>
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.paid_to?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.category_name?.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    // Cascading Filter Logic (Phase-First Workflow)
    const availableTasks = dashboardData.tasks?.filter(t => {
        if (formData.phase && t.phase !== parseInt(formData.phase)) return false;
        return true;
    }) || [];


    const handleOpenModal = (expense = null) => {
        setEditingItem(expense);
        setFormData(expense ? { ...expense } : {
            category: dashboardData.budgetCategories[0]?.id,
            date: new Date().toISOString().split('T')[0],
            expense_type: 'MATERIAL',
            task: null
        });
        setIsModalOpen(true);
    };

    const handleDelete = (id) => {
        showConfirm({
            title: "Delete Expense Record?",
            message: "Are you sure you want to permanently remove this expense line? This will affect your current budget balance and financial history. This action is irreversible.",
            confirmText: "Yes, Delete Record",
            type: "danger",
            onConfirm: async () => {
                try {
                    await dashboardService.deleteExpense(id);
                    refreshData();
                    closeConfirm();
                } catch (error) {
                    alert('Delete failed.');
                    closeConfirm();
                }
            }
        });
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
            else {
                // Ensure paid_to is never empty (Backend requirement)
                if (!dataToSubmit.paid_to) {
                    dataToSubmit.paid_to = dataToSubmit.supplier_name || dataToSubmit.contractor_name || dataToSubmit.title || 'General Expense';
                }
                await dashboardService.createExpense(dataToSubmit);
            }
            setIsModalOpen(false);
            refreshData();
        } catch (error) {
            console.error("Expense operation failed:", error);
            const serverError = error.response?.data;
            let msg = "Failed to save expense.";

            if (serverError) {
                // DRF returns errors as an object: { field: ["error message"] }
                const details = typeof serverError === 'object'
                    ? Object.entries(serverError).map(([k, v]) => `${k}: ${v}`).join(', ')
                    : JSON.stringify(serverError);
                msg += " Reason: " + details;
            }
            alert(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetail = (id) => {
        setSelectedExpenseId(id);
        setIsDetailModalOpen(true);
    };

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setPaymentFormData({ ...paymentFormData, proof_photo: file });
            const reader = new FileReader();
            reader.onloadend = () => setPhotoPreview(reader.result);
            reader.readAsDataURL(file);
        }
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
            const formData = new FormData();
            formData.append('expense', activeExpense.id);
            formData.append('funding_source', paymentFormData.funding_source || activeExpense.funding_source);
            formData.append('amount', parseFloat(paymentFormData.amount));
            formData.append('date', paymentFormData.date);
            formData.append('method', paymentFormData.method);
            formData.append('reference_id', paymentFormData.reference_id);
            if (paymentFormData.proof_photo) {
                formData.append('proof_photo', paymentFormData.proof_photo);
            }

            await dashboardService.createPayment(formData);
            setIsPaymentModalOpen(false);
            setPhotoPreview(null);
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
                <h2 className="text-2xl font-black text-[var(--t-text)] uppercase tracking-tight">Financial Overview</h2>
                <p className="text-sm text-[var(--t-text2)] max-w-2xl font-medium">
                    Monitor project spending, manage vendor disbursements, and track budget utilization across all construction phases.
                </p>
            </div>

            {/* 2. Top Summary Metrics Cards */}
            <SummaryCards
                budgetStats={budgetStats}
                dashboardData={dashboardData}
                formatCurrency={formatCurrency}
            />

            {/* 4. Search & Action Controls */}
            <ExpenseActions
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                handleOpenModal={handleOpenModal}
                exportData={{
                    columns: ['Date', 'Title', 'Category', 'Paid To', 'Phase', 'Amount (Rs.)', 'Status'],
                    rows: filteredExpenses.map(e => [
                        new Date(e.date).toLocaleDateString(),
                        e.title,
                        e.category_name || 'N/A',
                        e.paid_to || 'N/A',
                        dashboardData.phases?.find(p => p.id === e.phase)?.name || 'N/A',
                        Number(e.amount).toLocaleString('en-IN'),
                        e.payment_status === 'PAID' ? 'FULLY PAID' : `DUE: ${Number(e.balance_due).toLocaleString('en-IN')}`
                    ]),
                    summaryData: {
                        totalAmount: formatCurrency(filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0)),
                        totalPaid: formatCurrency(filteredExpenses.reduce((sum, e) => {
                            const paid = e.payments?.reduce((pSum, p) => pSum + Number(p.amount), 0) || 0;
                            return sum + paid;
                        }, 0)),
                        totalDue: formatCurrency(filteredExpenses.reduce((sum, e) => sum + Number(e.balance_due), 0))
                    },
                    projectInfo: {
                        name: dashboardData.project?.name,
                        owner: dashboardData.project?.owner_name || user?.name
                    }
                }}
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
                            <label className="block text-xs font-black text-[var(--t-text3)] uppercase tracking-widest mb-2">Expense Title</label>
                            <input
                                type="text"
                                value={formData.title || ''}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                className="w-full rounded-2xl border-[var(--t-border)] bg-[var(--t-surface2)] shadow-sm focus:ring-4 focus:ring-[var(--t-primary)]/10 focus:border-[var(--t-primary)] p-4 border outline-none font-bold transition-all"
                                placeholder="e.g. 50 Bags Cement"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-black text-[var(--t-text3)] uppercase tracking-widest mb-2">Expense Type</label>
                            <div className="relative">
                                <select
                                    value={formData.expense_type || 'MATERIAL'}
                                    onChange={e => setFormData({ ...formData, expense_type: e.target.value })}
                                    className="w-full rounded-2xl border-[var(--t-border)] bg-[var(--t-surface2)] shadow-sm focus:ring-4 focus:ring-[var(--t-primary)]/10 focus:border-[var(--t-primary)] p-4 border outline-none appearance-none font-bold transition-all"
                                    required
                                >
                                    <option value="MATERIAL">🏗️ Material Purchase</option>
                                    <option value="LABOR">👷 Labor/Worker Payment</option>
                                    <option value="FEES">📜 Professional Fees</option>
                                    <option value="GOVT">🏛️ Government/Permit Fees</option>
                                    <option value="OTHER">📁 Other</option>
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--t-text3)]">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-black text-[var(--t-text3)] uppercase tracking-widest mb-2">Transaction Date</label>
                            <input
                                type="date"
                                value={formData.date || ''}
                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                                className="w-full rounded-2xl border-[var(--t-border)] bg-[var(--t-surface2)] shadow-sm focus:ring-4 focus:ring-[var(--t-primary)]/10 focus:border-[var(--t-primary)] p-4 border outline-none font-bold transition-all"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-black text-[var(--t-text3)] uppercase tracking-widest mb-2">Total Amount (Rs.)</label>
                            <input
                                type="number"
                                value={formData.amount || 0}
                                onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                className={`w-full rounded-2xl border-[var(--t-border)] bg-[var(--t-surface2)] shadow-sm focus:ring-4 focus:ring-[var(--t-primary)]/10 focus:border-[var(--t-primary)] p-4 border outline-none font-black text-[var(--t-primary)] ${formData.expense_type === 'MATERIAL' && formData.material ? 'opacity-60 cursor-not-allowed bg-[var(--t-surface3)]' : ''}`}
                                disabled={formData.expense_type === 'MATERIAL' && !!formData.material}
                                required
                            />
                            {formData.expense_type === 'MATERIAL' && formData.material && (
                                <p className="text-[10px] text-[var(--t-primary)] mt-2 font-bold italic px-1">💸 System calculated: Qty × Unit Price</p>
                            )}
                        </div>
                    </div>

                    {/* Inventory Integration Block */}
                    {formData.expense_type === 'MATERIAL' && (
                        <div className="bg-gradient-to-br from-[var(--t-surface2)] to-[var(--t-surface)] p-6 rounded-[2rem] border border-[var(--t-border)] space-y-6 shadow-sm">
                            <h3 className="text-[10px] font-black text-[var(--t-primary)] uppercase tracking-[0.2em] flex items-center gap-3">
                                <div className="p-1.5 bg-[var(--t-primary)] text-white rounded-lg">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                                </div>
                                Stock Inventory Connector
                            </h3>
                            <div>
                                <label className="block text-[11px] font-bold text-[var(--t-primary)]/60 mb-2">Link to Catalog Item</label>
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
                                    className="w-full rounded-2xl border-[var(--t-border)] bg-[var(--t-surface)]/60 shadow-sm focus:ring-4 focus:ring-[var(--t-primary)]/10 focus:border-[var(--t-primary)] p-4 border outline-none appearance-none font-bold"
                                    >
                                        <option value="">Standard Expense (No Stock Sync)</option>
                                        {dashboardData.materials?.map(m => (
                                            <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--t-text3)]">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                    </div>
                                </div>
                            </div>
                            {formData.material && (
                                <div className="grid grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-4">
                                    <div className="bg-[var(--t-surface)]/40 p-1 rounded-3xl">
                                        <label className="block text-[10px] font-black text-[var(--t-text3)] uppercase tracking-widest mb-1.5 ml-4">Quantity ({formData.unit || 'Units'})</label>
                                        <input
                                            type="number"
                                            value={formData.quantity || ''}
                                            onChange={e => {
                                                const qty = parseFloat(e.target.value) || 0;
                                                const up = parseFloat(formData.unit_price) || 0;
                                                setFormData({ ...formData, quantity: e.target.value, amount: (qty * up).toFixed(2) });
                                            }}
                                            className="w-full bg-transparent border-none focus:ring-0 p-3 px-4 font-black text-[var(--t-text)] text-lg"
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div className="bg-[var(--t-surface)]/40 p-1 rounded-3xl">
                                        <label className="block text-[10px] font-black text-[var(--t-text3)] uppercase tracking-widest mb-1.5 ml-4">Unit Price (Rs.)</label>
                                        <input
                                            type="number"
                                            value={formData.unit_price || ''}
                                            onChange={e => {
                                                const up = parseFloat(e.target.value) || 0;
                                                const qty = parseFloat(formData.quantity) || 0;
                                                setFormData({ ...formData, unit_price: e.target.value, amount: (qty * up).toFixed(2) });
                                            }}
                                            className="w-full bg-transparent border-none focus:ring-0 p-3 px-4 font-black text-[var(--t-primary)] text-lg"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[var(--t-surface2)] p-6 rounded-[2rem] border border-[var(--t-border)] shadow-sm">
                        <div>
                            <label className="block text-xs font-black text-[var(--t-primary)] uppercase tracking-widest mb-2 flex items-center gap-2">
                                <span className="p-1 bg-[var(--t-primary)] text-white rounded text-[10px]">REQUIRED</span>
                                Construction Phase (Kam ko Charan)
                            </label>
                            <div className="relative">
                                <select
                                    value={formData.phase || ''}
                                    onChange={e => {
                                        setFormData({ 
                                            ...formData, 
                                            phase: e.target.value,
                                            task: '' // Reset task if phase changes
                                        });
                                    }}
                                    className="w-full rounded-2xl border-white bg-[var(--t-surface)] shadow-sm focus:ring-4 focus:ring-[var(--t-primary)]/10 focus:border-[var(--t-primary)] p-4 border outline-none appearance-none font-bold text-[var(--t-text)]"
                                    required
                                >
                                    <option value="">Select Phase (e.g. Structure, Finishes)</option>
                                    {dashboardData.phases?.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--t-text3)]">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-black text-[var(--t-primary)] uppercase tracking-widest mb-2">Specific Task (Kun Kam?)</label>
                            <div className="relative">
                                <select
                                    value={formData.task || ''}
                                    onChange={e => {
                                        const taskId = e.target.value;
                                        const selectedTask = dashboardData.tasks?.find(t => t.id === parseInt(taskId));
                                        
                                        if (selectedTask) {
                                            setFormData({ 
                                                ...formData, 
                                                task: taskId,
                                                category: selectedTask.category || formData.category,
                                                phase: selectedTask.phase || formData.phase
                                            });
                                        } else {
                                            setFormData({ ...formData, task: taskId });
                                        }
                                    }}
                                    className="w-full rounded-2xl border-[var(--t-border)] bg-[var(--t-surface)] shadow-sm focus:ring-4 focus:ring-[var(--t-primary)]/10 focus:border-[var(--t-primary)] p-4 border outline-none appearance-none font-bold"
                                >
                                    <option value="">General Phase Cost</option>
                                    {availableTasks.map(t => (
                                        <option key={t.id} value={t.id}>{t.title} {t.phase_name ? `(${t.phase_name})` : ''}</option>
                                    ))}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--t-text3)]">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                </div>
                            </div>
                            <p className="text-[10px] text-[var(--t-primary)] mt-2 font-medium px-1 italic">✨ Suggestion: Pick a task to auto-fill the finance category.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-black text-[var(--t-text3)] uppercase tracking-widest mb-2">Recipient (Vendor/Person)</label>
                            {formData.expense_type === 'MATERIAL' ? (
                                <div className="relative">
                                    <select
                                        value={formData.supplier || ''}
                                        onChange={e => {
                                            const s = dashboardData.suppliers?.find(sup => sup.id === parseInt(e.target.value));
                                            setFormData({ ...formData, supplier: e.target.value, paid_to: s ? s.name : formData.paid_to });
                                        }}
                                        className="w-full rounded-2xl border-[var(--t-border)] bg-[var(--t-surface2)] shadow-sm focus:ring-4 focus:ring-[var(--t-primary)]/10 focus:border-[var(--t-primary)] p-4 border outline-none appearance-none font-bold"
                                    >
                                        <option value="">Select Supplier</option>
                                        {dashboardData.suppliers?.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--t-text3)]">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                    </div>
                                </div>
                            ) : (formData.expense_type === 'LABOR' || formData.expense_type === 'FEES') ? (
                                <div className="relative">
                                    <select
                                        value={formData.contractor || ''}
                                        onChange={e => {
                                            const c = dashboardData.contractors?.find(con => con.id === parseInt(e.target.value));
                                            setFormData({ ...formData, contractor: e.target.value, paid_to: c ? (c.display_name || c.name) : formData.paid_to });
                                        }}
                                        className="w-full rounded-2xl border-[var(--t-border)] bg-[var(--t-surface2)] shadow-sm focus:ring-4 focus:ring-[var(--t-primary)]/10 focus:border-[var(--t-primary)] p-4 border outline-none appearance-none font-bold"
                                    >
                                        <option value="">Select Contractor</option>
                                        {dashboardData.contractors?.map(c => (
                                            <option key={c.id} value={c.id}>{c.display_name || c.name} ({c.role})</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--t-text3)]">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                    </div>
                                </div>
                            ) : (
                                <input
                                    type="text"
                                    value={formData.paid_to || ''}
                                    onChange={e => setFormData({ ...formData, paid_to: e.target.value })}
                                    className="w-full rounded-2xl border-[var(--t-border)] bg-[var(--t-surface2)] shadow-sm focus:ring-4 focus:ring-[var(--t-primary)]/10 focus:border-[var(--t-primary)] p-4 border outline-none font-bold placeholder:font-medium"
                                    placeholder="Who was paid?"
                                />
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-black text-[var(--t-text3)] uppercase tracking-widest mb-2 flex items-center gap-2">
                                <span className="p-1 bg-[var(--t-surface3)] text-[var(--t-text3)] rounded text-[10px]">ACCOUNTING</span>
                                Finance Category
                            </label>
                            <div className="relative">
                                <select
                                    value={formData.category || ''}
                                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                                    className="w-full rounded-2xl border-[var(--t-border)] bg-[var(--t-surface2)] shadow-sm focus:ring-4 focus:ring-[var(--t-primary)]/10 focus:border-[var(--t-primary)] p-4 border outline-none appearance-none font-bold text-[var(--t-text2)]"
                                    required
                                >
                                    <option value="">Select Finance Category</option>
                                    {dashboardData.budgetCategories?.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--t-text3)]">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-[var(--t-surface)] p-6 rounded-[2rem] border-2 border-dashed border-[var(--t-border)] space-y-4 shadow-sm">
                        <label className="block text-[10px] font-black text-[var(--t-primary)] uppercase tracking-[0.2em] ml-1">Payment/Funding Source</label>
                        <div className="relative">
                            <select
                                value={formData.funding_source || ''}
                                onChange={e => setFormData({ ...formData, funding_source: e.target.value })}
                                className="w-full rounded-2xl border-transparent bg-[var(--t-surface2)] p-4 border outline-none appearance-none font-black text-[var(--t-text)] shadow-inner"
                                required
                            >
                                <option value="">Assign funding account...</option>
                                {dashboardData.funding?.map(f => (
                                    <option key={f.id} value={f.id}>
                                        {f.source_type === 'LOAN' ? '🏦' : f.source_type === 'OWN_MONEY' ? '💰' : '🤝'} {f.name}
                                    </option>
                                ))}
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--t-text3)]">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                            </div>
                        </div>
                        {formData.funding_source && (
                            <div className="flex items-center justify-between px-3 animate-in fade-in slide-in-from-left-2">
                                <span className="text-[10px] font-bold text-[var(--t-text3)] italic">Account Status</span>
                                {(() => {
                                    const fs = dashboardData.funding?.find(f => f.id === parseInt(formData.funding_source));
                                    if (!fs) return null;
                                    return (
                                        <div className="flex items-center gap-3">
                                            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${fs.source_type === 'LOAN' ? 'bg-orange-500/10 text-orange-500' :
                                                fs.source_type === 'OWN_MONEY' ? 'bg-green-500/10 text-green-500' :
                                                    'bg-purple-500/10 text-purple-600'
                                                }`}>
                                                {fs.source_type}
                                            </span>
                                            <span className="text-[12px] font-black text-[var(--t-text)]">Avl: {formatCurrency(fs.current_balance)}</span>
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
                            className="px-8 py-3.5 text-xs font-black uppercase tracking-[0.2em] text-[var(--t-text3)] hover:text-[var(--t-text)] hover:bg-[var(--t-surface2)] rounded-2xl transition-all"
                        >
                            Discard
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-10 py-3.5 bg-[var(--t-primary)] text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-[var(--t-primary)]/10 hover:bg-[var(--t-primary2)] hover:-translate-y-0.5 disabled:opacity-50 transition-all active:scale-95"
                        >
                            {loading ? 'Processing...' : (editingItem ? 'Update Change' : 'Confirm Expense')}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Payment Modal */}
            <Modal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} title="Record Transaction">
                <div className="space-y-8 p-1">
                    {/* Transaction History Flow */}
                    {activeExpense?.payments?.length > 0 && (
                        <div className="bg-[var(--t-surface2)] p-6 rounded-[2rem] border border-[var(--t-border)]">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--t-text3)] mb-4 ml-1">Previous Payments</h4>
                            <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                {activeExpense.payments.map((p, idx) => (
                                    <div key={idx} className="flex justify-between items-center bg-[var(--t-surface)] p-4 rounded-2xl border border-[var(--t-border)] shadow-sm transition-hover">
                                        <div className="flex flex-col">
                                            <span className="text-[13px] font-black text-[var(--t-text)]">{formatCurrency(p.amount)}</span>
                                            <span className="text-[10px] text-[var(--t-text3)] font-bold mt-0.5 uppercase tracking-widest">
                                                {p.method} • {new Date(p.date).toLocaleDateString()}
                                            </span>
                                        </div>
                                        {p.reference_id && <div className="px-3 py-1 bg-[var(--t-nav-active-bg)] text-[var(--t-primary)] text-[9px] font-black rounded-lg border border-[var(--t-border)] uppercase tracking-tighter">#{p.reference_id}</div>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <form onSubmit={handlePaymentSubmit} className="space-y-6">
                        {/* Dynamic Funding Source Selector */}
                        <div>
                            <label className="block text-xs font-black text-[var(--t-primary)] uppercase tracking-widest mb-2">Funding Source (Pay From)</label>
                            <div className="relative">
                                <select
                                    value={paymentFormData.funding_source || activeExpense?.funding_source || ''}
                                    onChange={e => {
                                        const newFsId = e.target.value;
                                        const fs = dashboardData.funding?.find(f => f.id === parseInt(newFsId));
                                        setPaymentFormData({ 
                                            ...paymentFormData, 
                                            funding_source: newFsId,
                                            method: fs?.default_payment_method || paymentFormData.method
                                        });
                                    }}
                                    className="w-full rounded-2xl border-[var(--t-border)] bg-[var(--t-surface2)] p-4 border focus:ring-4 focus:ring-[var(--t-primary)]/10 focus:border-[var(--t-primary)] outline-none appearance-none font-bold text-[var(--t-text)]"
                                    required
                                >
                                    <option value="">Select funding account...</option>
                                    {dashboardData.funding?.map(f => (
                                        <option key={f.id} value={f.id} disabled={f.current_balance <= 0}>
                                            {f.source_type === 'LOAN' ? '🏦' : f.source_type === 'OWN_MONEY' ? '💰' : '🤝'} {f.name} (Available: {formatCurrency(f.current_balance)})
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--t-primary)]">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-black text-[var(--t-text3)] uppercase tracking-widest mb-2">Disbursement Amount</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    max={activeExpense?.balance_due}
                                    value={paymentFormData.amount}
                                    onChange={e => setPaymentFormData({ ...paymentFormData, amount: e.target.value })}
                                    className="w-full rounded-2xl border-[var(--t-border)] bg-[var(--t-primary)]/5 p-4 border focus:ring-4 focus:ring-[var(--t-primary)]/10 focus:border-[var(--t-primary)] outline-none font-black text-[var(--t-primary)] text-xl shadow-inner transition-all"
                                    required
                                />
                                <div className="flex justify-between mt-2 px-1">
                                    <span className="text-[10px] text-[var(--t-text3)] font-bold uppercase">Pending balance</span>
                                    <span className="text-[10px] text-rose-500 font-black uppercase">{formatCurrency(activeExpense?.balance_due)}</span>
                                </div>
                                {(() => {
                                    const fsId = paymentFormData.funding_source || activeExpense?.funding_source;
                                    const fs = dashboardData.funding?.find(f => f.id === parseInt(fsId));
                                    if (fs && paymentFormData.amount > fs.current_balance) {
                                        return (
                                            <p className="text-[10px] text-[var(--t-danger)] mt-2 font-bold px-1 bg-[var(--t-danger)]/10 p-2 rounded-lg border border-[var(--t-danger)]/20">
                                                ⚠️ Overdraft Warning: Amount exceeds available balance of {formatCurrency(fs.current_balance)}.
                                            </p>
                                        );
                                    }
                                    return null;
                                })()}
                            </div>
                            <div>
                                <label className="block text-xs font-black text-[var(--t-text3)] uppercase tracking-widest mb-2">Date of payment</label>
                                <input
                                    type="date"
                                    value={paymentFormData.date}
                                    onChange={e => setPaymentFormData({ ...paymentFormData, date: e.target.value })}
                                    className="w-full rounded-2xl border-[var(--t-border)] bg-[var(--t-surface2)] p-4 border focus:ring-4 focus:ring-[var(--t-primary)]/10 outline-none font-bold"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-black text-[var(--t-text3)] uppercase tracking-widest mb-2">Disbursement Method</label>
                                <div className="relative">
                                    <select
                                        value={paymentFormData.method}
                                        onChange={e => setPaymentFormData({ ...paymentFormData, method: e.target.value })}
                                        className="w-full rounded-2xl border-[var(--t-border)] bg-[var(--t-surface2)] p-4 border focus:ring-4 focus:ring-[var(--t-primary)]/10 outline-none font-bold"
                                        required
                                    >
                                        <option value="CASH">💰 Nagad (Cash)</option>
                                        <option value="BANK_TRANSFER">🏦 Bank / ConnectIPS</option>
                                        <option value="QR">📱 eSewa / Khalti (QR)</option>
                                        <option value="CHECK">📜 Cheque</option>
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--t-text3)]">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-[var(--t-text3)] uppercase tracking-widest mb-2">Reference / Txn ID</label>
                                <input
                                    type="text"
                                    value={paymentFormData.reference_id}
                                    onChange={e => setPaymentFormData({ ...paymentFormData, reference_id: e.target.value })}
                                    className="w-full rounded-2xl border-[var(--t-border)] bg-[var(--t-surface2)] p-4 border focus:ring-4 focus:ring-[var(--t-primary)]/10 outline-none font-bold"
                                    placeholder="e.g. eSewa ID / Check #"
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="block text-xs font-black text-[var(--t-text3)] uppercase tracking-widest ml-1">Payment Proof (Screenshot)</label>
                            <div className="flex gap-4 items-center">
                                <label className="flex-1 flex items-center justify-center gap-3 p-4 bg-[var(--t-nav-active-bg)] border-2 border-dashed border-[var(--t-border)] rounded-2xl cursor-pointer hover:bg-[var(--t-nav-active-bg)] transition-all">
                                    <span className="text-2xl">📸</span>
                                    <span className="text-xs font-black text-[var(--t-primary)] uppercase tracking-widest">Upload Receipt Photo</span>
                                    <input type="file" className="hidden" accept="image/*" onChange={handlePhotoChange} />
                                </label>
                                {photoPreview && (
                                    <div className="w-16 h-16 rounded-2xl border-2 border-white shadow-md overflow-hidden relative group">
                                        <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => { setPhotoPreview(null); setPaymentFormData({ ...paymentFormData, proof_photo: null }); }}
                                            className="absolute inset-0 bg-[var(--t-danger)]/90 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] font-black"
                                        >
                                            REMOVE
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end gap-4 mt-10">
                            <button
                                type="button"
                                onClick={() => setIsPaymentModalOpen(false)}
                                className="px-8 py-3.5 text-xs font-black uppercase tracking-[0.2em] text-[var(--t-text3)] hover:text-[var(--t-text)] rounded-2xl transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading || (() => {
                                    const fsId = paymentFormData.funding_source || activeExpense?.funding_source;
                                    const fs = dashboardData.funding?.find(f => f.id === parseInt(fsId));
                                    return fs && paymentFormData.amount > fs.current_balance;
                                })()}
                                className="px-10 py-3.5 bg-[var(--t-primary)] text-[var(--t-bg)] rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-[var(--t-primary)]/10 hover:opacity-90 hover:-translate-y-0.5 active:scale-95 transition-all disabled:opacity-50"
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

            <ConfirmModal 
                isOpen={confirmConfig.isOpen}
                title={confirmConfig.title}
                message={confirmConfig.message}
                confirmText={confirmConfig.confirmText}
                onConfirm={confirmConfig.onConfirm}
                onCancel={closeConfirm}
                type={confirmConfig.type || 'warning'}
            />
        </div>
    );
};

export default ExpensesTab;
