import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { dashboardService } from '../../../services/api';
import Modal from '../../common/Modal';
import { useConstruction } from '../../../context/ConstructionContext';
import ExpenseDetailModal from '../../common/ExpenseDetailModal';
import PdfExportButton from '../../common/PdfExportButton';
import ConfirmModal from '../../common/ConfirmModal';
import ProofViewer from '../../common/ProofViewer';

// Redesigned Sub-components
import SummaryCards from './expenses/SummaryCards';
import ExpenseActions from './expenses/ExpenseActions';
import ExpenseList from './expenses/ExpenseList';
import UnifiedPaymentList from './expenses/UnifiedPaymentList';
import { EmailLogHistoryModal, EmailConfirmationModal } from './expenses/PaymentModals';

const ExpensesTab = ({ searchQuery: initialSearchQuery = '', initialViewMode = 'expenses' }) => {
    const { dashboardData, refreshData, formatCurrency, budgetStats } = useConstruction();
    const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedExpenseId, setSelectedExpenseId] = useState(null);
    const [viewingPhoto, setViewingPhoto] = useState(null);
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
        proof_photo: null,
        send_receipt: true
    });
    const [photoPreview, setPhotoPreview] = useState(null);
    const [viewMode, setViewMode] = useState(initialViewMode); // 'expenses' or 'payments'
    const [emailState, setEmailState] = useState({}); // { [paymentId]: 'idle' | 'sending' | 'sent' | 'error' }
    const [emailLogs, setEmailLogs] = useState([]);
    const [fetchingLogs, setFetchingLogs] = useState(false);
    
    // Modal states for Payments
    const [confirmation, setConfirmation] = useState({ isOpen: false, status: 'success', message: '' });
    const [historyModal, setHistoryModal] = useState({ isOpen: false, logs: [], title: '' });

    const [paymentStatus, setPaymentStatus] = useState('IDLE'); // IDLE, PROCESSING, SUCCESS, ERROR
    const [paymentMethodFilter, setPaymentMethodFilter] = useState('ALL');
    const [fundingSourceFilter, setFundingSourceFilter] = useState('ALL');

    // Advanced Expense Filters
    const [expenseStatusFilter, setExpenseStatusFilter] = useState('ALL'); // ALL, PAID, PARTIAL, DUE
    const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('ALL');
    
    // Default to current month range (Local Time Safe)
    const [expenseDateFilter, setExpenseDateFilter] = useState(() => {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        const formatDate = (date) => {
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        };
        
        return {
            start: formatDate(firstDay),
            end: formatDate(lastDay)
        };
    });

    // Confirmation Modal System
    const [confirmConfig, setConfirmConfig] = useState({ isOpen: false });
    const showConfirm = (config) => setConfirmConfig({ ...config, isOpen: true });
    const closeConfirm = () => setConfirmConfig({ ...confirmConfig, isOpen: false });

    const filteredExpenses = useMemo(() => {
        let result = dashboardData.expenses || [];

        // 1. Search Query Filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(e =>
                e.title.toLowerCase().includes(query) ||
                e.paid_to?.toLowerCase().includes(query) ||
                e.category_name?.toLowerCase().includes(query)
            );
        }

        // 2. Status Filter
        if (expenseStatusFilter !== 'ALL') {
            result = result.filter(e => {
                if (expenseStatusFilter === 'PAID') return e.status === 'PAID';
                if (expenseStatusFilter === 'PARTIAL') return e.status === 'PARTIAL';
                if (expenseStatusFilter === 'DUE') return e.status === 'UNPAID' || e.status === 'PARTIAL';
                return true;
            });
        }

        // 3. Category Filter
        if (expenseCategoryFilter !== 'ALL') {
            result = result.filter(e => e.category === parseInt(expenseCategoryFilter));
        }

        // 4. Date Range Filter
        if (expenseDateFilter.start) {
            result = result.filter(e => e.date >= expenseDateFilter.start);
        }
        if (expenseDateFilter.end) {
            result = result.filter(e => e.date <= expenseDateFilter.end);
        }

        return result;
    }, [dashboardData.expenses, searchQuery, expenseStatusFilter, expenseCategoryFilter, expenseDateFilter]);

    // Metadata for PDF export based on active filters
    const filterMetadata = useMemo(() => {
        let parts = [];
        if (expenseStatusFilter !== 'ALL') parts.push(`Status: ${expenseStatusFilter}`);
        if (expenseCategoryFilter !== 'ALL') {
            const cat = dashboardData.budgetCategories?.find(c => c.id === parseInt(expenseCategoryFilter));
            parts.push(`Category: ${cat?.name || 'Unknown'}`);
        }
        if (expenseDateFilter.start || expenseDateFilter.end) {
            parts.push(`Period: ${expenseDateFilter.start || '...'} to ${expenseDateFilter.end || 'Now'}`);
        }
        if (searchQuery) parts.push(`Query: "${searchQuery}"`);
        
        return parts.length > 0 ? `Filtered by: ${parts.join(' | ')}` : "Complete Project Statement";
    }, [expenseStatusFilter, expenseCategoryFilter, expenseDateFilter, searchQuery, dashboardData.budgetCategories]);

    const fetchLogs = useCallback(async () => {
        setFetchingLogs(true);
        try {
            const res = await dashboardService.getEmailLogs();
            setEmailLogs(res.data || []);
        } catch (err) {
            console.error("Failed to fetch email logs", err);
        } finally {
            setFetchingLogs(false);
        }
    }, []);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const flattenedPayments = useMemo(() => {
        if (!dashboardData?.expenses) return [];
        let payments = [];
        dashboardData.expenses.forEach(exp => {
            if (exp.payments && exp.payments.length > 0) {
                exp.payments.forEach(payment => {
                    const fundingSource = dashboardData.funding?.find(f => f.id === payment.funding_source);
                    const logs = emailLogs.filter(log => log.payment === payment.id);
                    payments.push({
                        ...payment,
                        expense_title: exp.title,
                        paid_to_resolved: exp.paid_to || exp.contractor_name || exp.supplier_name || 'Self/Other',
                        is_linked: !!(exp.contractor || exp.supplier),
                        category_name: exp.category_name,
                        funding_source_name: fundingSource ? fundingSource.name : 'Unknown',
                        expense_type: exp.expense_type,
                        has_email_recipient: !!(exp.supplier_name || exp.contractor_name || exp.paid_to),
                        email_history: logs,
                        is_email_sent: logs.some(l => l.status === 'SENT')
                    });
                });
            }
        });
        payments.sort((a, b) => new Date(b.date) - new Date(a.date));
        let result = payments;
        if (paymentMethodFilter !== 'ALL') {
            result = result.filter(p => p.method === paymentMethodFilter);
        }
        if (fundingSourceFilter !== 'ALL') {
            result = result.filter(p => p.funding_source === parseInt(fundingSourceFilter));
        }
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(p =>
                p.expense_title?.toLowerCase().includes(query) ||
                p.paid_to_resolved?.toLowerCase().includes(query) ||
                p.method?.toLowerCase().includes(query) ||
                p.reference_id?.toLowerCase().includes(query)
            );
        }
        return result;
    }, [dashboardData, searchQuery, emailLogs, paymentMethodFilter, fundingSourceFilter]);

    const handleSendReceipt = useCallback(async (paymentId, pInfo) => {
        setEmailState(prev => ({ ...prev, [paymentId]: 'sending' }));
        try {
            await dashboardService.emailPaymentReceipt(paymentId);
            setEmailState(prev => ({ ...prev, [paymentId]: 'sent' }));
            fetchLogs();
            setConfirmation({
                isOpen: true,
                status: 'success',
                message: `The payment receipt has been successfully delivered to the recipient for: ${pInfo.expense_title}.`
            });
        } catch (err) {
            const msg = err?.response?.data?.error || 'Failed to connect to the email server. Please check your credentials or network.';
            setEmailState(prev => ({ ...prev, [paymentId]: 'error' }));
            fetchLogs();
            setConfirmation({
                isOpen: true,
                status: 'error',
                message: msg
            });
        }
    }, [fetchLogs]);

    const getMethodColor = (method) => {
        const colors = {
            'CASH': 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
            'BANK_TRANSFER': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
            'CHECK': 'bg-purple-500/10 text-purple-500 border-purple-500/20',
            'QR': 'bg-pink-500/10 text-pink-500 border-pink-500/20'
        };
        return colors[method] || 'bg-[var(--t-surface3)] text-[var(--t-text2)] border-[var(--t-border)]';
    };

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
            reference_id: '',
            send_receipt: true
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
            formData.append('send_receipt', paymentFormData.send_receipt);
            if (paymentFormData.proof_photo) {
                formData.append('proof_photo', paymentFormData.proof_photo);
            }

            setPaymentStatus('PROCESSING');
            await dashboardService.createPayment(formData);
            setPaymentStatus('SUCCESS');
            setPhotoPreview(null);
            refreshData();
            
            // Auto-close after 2 seconds
            setTimeout(() => {
                setIsPaymentModalOpen(false);
                setPaymentStatus('IDLE');
            }, 2000);
        } catch (error) {
            console.error("Payment error:", error);
            setPaymentStatus('ERROR');
            setTimeout(() => setPaymentStatus('IDLE'), 3000);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-[1400px] mx-auto px-1 py-4 space-y-10 animate-in fade-in duration-700">
            {/* 1. Header & Quick Summary */}
            <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-black text-[var(--t-text)] uppercase tracking-tight">Expenses & Dues</h2>
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
                viewMode={viewMode}
                setViewMode={setViewMode}
                
                // Expense Filters
                expenseStatusFilter={expenseStatusFilter}
                setExpenseStatusFilter={setExpenseStatusFilter}
                expenseCategoryFilter={expenseCategoryFilter}
                setExpenseCategoryFilter={setExpenseCategoryFilter}
                expenseDateFilter={expenseDateFilter}
                setExpenseDateFilter={setExpenseDateFilter}
                budgetCategories={dashboardData.budgetCategories || []}

                // Payment Filters
                paymentMethodFilter={paymentMethodFilter}
                setPaymentMethodFilter={setPaymentMethodFilter}
                fundingSourceFilter={fundingSourceFilter}
                setFundingSourceFilter={setFundingSourceFilter}
                fundingSources={dashboardData.funding || []}
                
                exportData={{
                    columns: ['Date', 'Title', 'Category', 'Paid To', 'Phase', 'Amount (Rs.)', 'Status'],
                    rows: filteredExpenses.map(e => [
                        new Date(e.date).toLocaleDateString(),
                        e.title,
                        e.category_name || 'N/A',
                        e.paid_to || 'N/A',
                        dashboardData.phases?.find(p => p.id === e.phase)?.name || 'N/A',
                        Number(e.amount).toLocaleString('en-IN'),
                        e.status === 'PAID' ? 'FULLY PAID' : `DUE: ${Number(e.balance_due).toLocaleString('en-IN')}`
                    ]),
                    summaryData: {
                        totalAmount: formatCurrency(filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0)),
                        totalPaid: formatCurrency(filteredExpenses.reduce((sum, e) => sum + Number(e.total_paid || 0), 0)),
                        totalDue: formatCurrency(filteredExpenses.reduce((sum, e) => sum + Number(e.balance_due), 0))
                    },
                    projectInfo: {
                        name: dashboardData.project?.name,
                        owner: dashboardData.project?.owner_name,
                        filterMetadata: filterMetadata
                    }
                }}
            />

            {/* 5. Main Content Area */}
            {viewMode === 'expenses' ? (
                <>
                    <div className="flex items-center gap-2 mb-4 px-1">
                        <span className="text-[10px] font-bold text-[var(--t-primary)] uppercase tracking-widest bg-[var(--t-primary)]/5 px-2 py-1 rounded">
                            Active Scope: {filterMetadata}
                        </span>
                        <span className="text-[10px] font-['DM_Mono',monospace] text-[var(--t-text3)] uppercase">
                            ({filteredExpenses.length} Records Found)
                        </span>
                    </div>

                    <ExpenseList
                        expenses={filteredExpenses}
                        handleViewDetail={handleViewDetail}
                        handleOpenPaymentModal={handleOpenPaymentModal}
                        handleOpenModal={handleOpenModal}
                        handleDelete={handleDelete}
                        formatCurrency={formatCurrency}
                        dashboardData={dashboardData}
                    />
                </>
            ) : (
                <UnifiedPaymentList
                    payments={flattenedPayments}
                    handleSendReceipt={handleSendReceipt}
                    openHistoryModal={(logs, title) => setHistoryModal({ isOpen: true, logs, title })}
                    getMethodColor={getMethodColor}
                    emailState={emailState}
                />
            )}

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
                                        
                                        {p.proof_photo && (
                                            <button 
                                                onClick={() => setViewingPhoto(p.proof_photo)}
                                                className="w-8 h-8 rounded-lg bg-[var(--t-surface2)] border border-[var(--t-border)] flex items-center justify-center text-[var(--t-primary)] hover:bg-[var(--t-primary)]/10 transition-all active:scale-90"
                                                title="View Verification Evidence"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                            </button>
                                        )}
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

                        <div className="bg-[var(--t-surface2)] p-6 rounded-[2rem] border border-[var(--t-border)] flex items-center justify-between group hover:border-[var(--t-primary)] transition-all">
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-sm transition-all ${paymentFormData.send_receipt ? 'bg-green-500/10 text-green-500' : 'bg-[var(--t-surface3)] text-[var(--t-text3)]'}`}>
                                    {paymentFormData.send_receipt ? '📧' : '🚫'}
                                </div>
                                <div>
                                    <h4 className="text-[11px] font-black uppercase tracking-widest text-[var(--t-text)] leading-none italic">Send Email Receipt</h4>
                                    <p className="text-[9px] text-[var(--t-text3)] font-bold uppercase tracking-tighter mt-1 opacity-60">Automatically deliver PDF to recipient</p>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    className="sr-only peer"
                                    checked={paymentFormData.send_receipt}
                                    onChange={e => setPaymentFormData({ ...paymentFormData, send_receipt: e.target.checked })}
                                />
                                <div className="w-11 h-6 bg-[var(--t-surface3)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--t-primary)]"></div>
                            </label>
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

                        {/* Payment Progress Overlay */}
                        {(paymentStatus === 'PROCESSING' || paymentStatus === 'SUCCESS' || paymentStatus === 'ERROR') && (
                            <div className="absolute inset-0 bg-[var(--t-surface2)]/95 backdrop-blur-md z-[100] flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-300">
                                {paymentStatus === 'PROCESSING' && (
                                    <div className="space-y-6">
                                        <div className="relative">
                                            <div className="w-20 h-20 border-4 border-[var(--t-primary)]/20 border-t-[var(--t-primary)] rounded-full animate-spin mx-auto"></div>
                                            <div className="absolute inset-0 flex items-center justify-center text-2xl animate-pulse">💸</div>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black text-[var(--t-text)] uppercase tracking-tighter italic">Processing Payment...</h3>
                                            <p className="text-xs text-[var(--t-text3)] font-bold uppercase tracking-widest mt-2">{paymentFormData.send_receipt ? 'Generating & delivering PDF receipt' : 'Recording transaction records'}</p>
                                        </div>
                                    </div>
                                )}

                                {paymentStatus === 'SUCCESS' && (
                                    <div className="space-y-6 animate-in zoom-in duration-500">
                                        <div className="w-24 h-24 bg-green-500 text-white rounded-full flex items-center justify-center text-5xl shadow-2xl shadow-green-500/40 mx-auto transform scale-110">
                                            ✓
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black text-green-600 uppercase tracking-tighter italic">Success!</h3>
                                            <p className="text-sm text-[var(--t-text2)] font-bold uppercase tracking-widest mt-2">Payment recorded successfully</p>
                                            {paymentFormData.send_receipt && <p className="text-[10px] text-green-500 font-black mt-2 bg-green-500/10 px-3 py-1 rounded-full inline-block">Receipt sent to recipient email</p>}
                                        </div>
                                    </div>
                                )}

                                {paymentStatus === 'ERROR' && (
                                    <div className="space-y-6 animate-in shake duration-500">
                                        <div className="w-20 h-20 bg-red-500 text-white rounded-full flex items-center justify-center text-4xl shadow-2xl shadow-red-500/40 mx-auto">
                                            ✕
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black text-red-600 uppercase tracking-tighter italic">Payment Failed</h3>
                                            <p className="text-xs text-[var(--t-text2)] font-bold uppercase tracking-widest mt-2">Please check your connection and try again</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

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

            {/* Payment Audit Modals */}
            <EmailConfirmationModal 
                isOpen={confirmation.isOpen} 
                onClose={() => setConfirmation({ ...confirmation, isOpen: false })} 
                result={{ status: confirmation.status, message: confirmation.message }}
            />
            
            <EmailLogHistoryModal 
                isOpen={historyModal.isOpen} 
                onClose={() => setHistoryModal({ ...historyModal, isOpen: false })} 
                logs={historyModal.logs} 
                paymentTitle={historyModal.title}
            />
            <ProofViewer 
                photo={viewingPhoto} 
                onClose={() => setViewingPhoto(null)} 
            />
        </div>
    );
};

export default ExpensesTab;
