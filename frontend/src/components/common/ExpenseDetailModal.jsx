import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { useConstruction } from '../../context/ConstructionContext';
import { dashboardService, getMediaUrl } from '../../services/api';
import ConfirmModal from './ConfirmModal';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import ProofViewer from './ProofViewer';

const ExpenseDetailModal = ({ isOpen, onClose, expenseId }) => {
    const { dashboardData, refreshData, formatCurrency } = useConstruction();
    const [isPaymentFormOpen, setIsPaymentFormOpen] = useState(false);
    const [viewingPhoto, setViewingPhoto] = useState(null);
    const [loading, setLoading] = useState(false);

    // Confirmation Modal System
    const [confirmConfig, setConfirmConfig] = useState({ isOpen: false });
    const showConfirm = (config) => setConfirmConfig({ ...config, isOpen: true });
    const closeConfirm = () => setConfirmConfig({ ...confirmConfig, isOpen: false });

    const expense = dashboardData.expenses?.find(e => e.id === expenseId);

    const [paymentData, setPaymentData] = useState({
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        method: 'CASH',
        reference_id: '',
        funding_source: '',
        proof_photo: null
    });
    const [photoPreview, setPhotoPreview] = useState(null);
    const [isExporting, setIsExporting] = useState(false);

    const handleExportVoucher = () => {
        try {
            setIsExporting(true);
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.width;
            
            // Header
            doc.setFillColor(30, 30, 30);
            doc.rect(0, 0, pageWidth, 40, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(20);
            doc.text("EXPENSE VOUCHER", 14, 18);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`Voucher ID: #EXP-${expense.id}`, 14, 25);
            doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 31);
            
            // Financials Grid
            doc.setTextColor(60, 60, 60);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text("FINANCIAL SUMMARY", 14, 55);
            
            autoTable(doc, {
                startY: 60,
                head: [['Field', 'Value']],
                body: [
                    ['Expense Title', expense.title],
                    ['Category', expense.category_name],
                    ['Source Account', expense.funding_source_name || 'General Funds'],
                    ['Paid To', expense.paid_to || 'N/A'],
                    ['Total Amount', formatCurrency(expense.amount)],
                    ['Amount Paid', formatCurrency(expense.total_paid)],
                    ['Balance Due', formatCurrency(expense.balance_due)],
                    ['Status', expense.status]
                ],
                theme: 'grid',
                headStyles: { fillColor: [79, 70, 229] }
            });

            // Payment History
            if (expense.payments?.length > 0) {
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text("PAYMENT HISTORY", 14, doc.lastAutoTable.finalY + 15);
                
                autoTable(doc, {
                    startY: doc.lastAutoTable.finalY + 20,
                    head: [['Date', 'Method', 'Reference', 'Amount']],
                    body: expense.payments.map(p => [
                        new Date(p.date).toLocaleDateString(),
                        p.method,
                        p.reference_id || '-',
                        formatCurrency(p.amount)
                    ]),
                    headStyles: { fillColor: [34, 197, 94] }
                });
            }

            // Footer
            const finalY = doc.lastAutoTable.finalY + 40;
            doc.line(14, finalY, 80, finalY);
            doc.text("Authorized Signature", 14, finalY + 5);
            
            doc.save(`voucher_${expense.id}_${expense.title.replace(/\s+/g, '_').toLowerCase()}.pdf`);
        } catch (error) {
            console.error("Voucher Export Failed:", error);
            alert("Could not generate voucher.");
        } finally {
            setIsExporting(false);
        }
    };

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

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setPaymentData({ ...paymentData, proof_photo: file });
            const reader = new FileReader();
            reader.onloadend = () => setPhotoPreview(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const handlePaymentSubmit = async (e) => {
        e.preventDefault();
        
        if (!paymentData.proof_photo) {
            alert('Security Requirement: Payment proof photo is mandatory to record this transaction.');
            return;
        }

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('expense', expense.id);
            formData.append('funding_source', paymentData.funding_source);
            formData.append('amount', parseFloat(paymentData.amount));
            formData.append('date', paymentData.date);
            formData.append('method', paymentData.method);
            formData.append('reference_id', paymentData.reference_id);
            if (paymentData.proof_photo) {
                formData.append('proof_photo', paymentData.proof_photo);
            }

            await dashboardService.createPayment(formData);
            setIsPaymentFormOpen(false);
            setPhotoPreview(null);
            refreshData();
        } catch (error) {
            alert('Payment failed.');
        } finally {
            setLoading(false);
        }
    };

    const getTypeStyle = (type) => {
        switch (type) {
            case 'MATERIAL': return 'bg-[var(--t-info)]/10 border-[var(--t-info)]/30 text-[var(--t-info)]';
            case 'LABOR':    return 'bg-[var(--t-warn)]/10 border-[var(--t-warn)]/30 text-[var(--t-warn)]';
            case 'FEES':     return 'bg-[var(--t-primary)]/10 border-[var(--t-primary)]/30 text-[var(--t-primary)]';
            default:         return 'bg-[var(--t-surface2)] border-[var(--t-border)] text-[var(--t-text3)]';
        }
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'PAID':    return { dot: 'bg-[var(--t-primary)]', badge: 'border-[var(--t-primary)]/40 text-[var(--t-primary)]' };
            case 'PARTIAL': return { dot: 'bg-[var(--t-warn)]',    badge: 'border-[var(--t-warn)]/40 text-[var(--t-warn)]' };
            default:        return { dot: 'bg-[var(--t-danger)]',  badge: 'border-[var(--t-danger)]/40 text-[var(--t-danger)]' };
        }
    };

    if (!expense) return null;
    const ss = getStatusStyle(expense.status);

    return (
        <>
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={expense.title} 
            maxWidth="max-w-3xl"
            footer={
                <div className="flex justify-between items-center w-full px-2">
                    <button
                        onClick={() => {
                            showConfirm({
                                title: "Void Expense Record?",
                                message: "Closing this record will remove it from all ledger books. This action is permanent.",
                                confirmText: "Permanently Void",
                                type: "danger",
                                onConfirm: async () => {
                                    try {
                                        await dashboardService.deleteExpense(expense.id);refreshData();closeConfirm();onClose();
                                    } catch (error) { alert('Action failed'); closeConfirm(); }
                                }
                            });
                        }}
                        className="text-[10px] font-['DM_Mono',monospace] font-bold text-[var(--t-danger)] uppercase tracking-[0.2em] hover:brightness-110 transition-all"
                    >
                        Void Record
                    </button>
                    <div className="flex gap-4">
                        <button onClick={onClose} className="px-6 py-2.5 text-[10px] font-['DM_Mono',monospace] font-bold text-[var(--t-text3)] uppercase tracking-[0.2em] hover:text-[var(--t-text)] transition-all">Close</button>
                        <button className="px-8 py-2.5 bg-[var(--t-text)] text-[var(--t-bg)] rounded-[2px] font-['DM_Mono',monospace] font-bold uppercase text-[10px] tracking-[0.2em] hover:brightness-110 active:scale-95 transition-all shadow-xl shadow-black/10">
                            Edit Entry
                        </button>
                    </div>
                </div>
            }
        >
            <div className="space-y-10 pb-6 px-2">
                {/* 1. Header Metadata */}
                <div className="flex justify-between items-end border-b border-[var(--t-border)] pb-6">
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-[1px] text-[9px] font-['DM_Mono',monospace] uppercase tracking-[0.2em] border ${ss.badge}`}>
                                <div className={`w-1.5 h-1.5 rounded-full mr-2 ${ss.dot}`} />
                                {expense.status}
                            </span>
                            <span className={`px-2.5 py-1 rounded-[1px] text-[9px] font-['DM_Mono',monospace] tracking-[0.2em] uppercase border ${getTypeStyle(expense.expense_type)}`}>
                                {expense.expense_type}
                            </span>
                        </div>
                        <div className="text-[11px] font-['DM_Mono',monospace] text-[var(--t-text3)] uppercase tracking-[0.3em]">
                            Ref: EX-{expense.id.toString().padStart(5, '0')} | {expense.category_name}
                        </div>
                    </div>
                    
                    <button
                        onClick={handleExportVoucher}
                        disabled={isExporting}
                        className="flex items-center gap-3 px-4 py-2 border border-[var(--t-border)] text-[var(--t-text)] hover:bg-[var(--t-surface2)] rounded-[1px] text-[10px] font-['DM_Mono',monospace] font-bold uppercase tracking-[0.2em] transition-all"
                    >
                        <svg className={`w-4 h-4 ${isExporting ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        {isExporting ? 'Generating...' : 'PDF Voucher'}
                    </button>
                </div>

                {/* 2. Financial Breakdown */}
                <div className="bg-[var(--t-surface2)] p-6 rounded-[2px] border border-[var(--t-border)]">
                    <div className="grid grid-cols-3 gap-8">
                        <div>
                            <div className="text-[9px] font-['DM_Mono',monospace] font-bold text-[var(--t-text3)] uppercase tracking-[0.3em] mb-2 text-center">Total Bill Amount</div>
                            <div className="text-3xl font-['Bebas_Neue',sans-serif] text-[var(--t-text)] tracking-wider text-center">{formatCurrency(expense.amount)}</div>
                        </div>
                        <div className="border-l border-[var(--t-border)]">
                            <div className="text-[9px] font-['DM_Mono',monospace] font-bold text-[var(--t-text3)] uppercase tracking-[0.3em] mb-2 text-center text-[var(--t-primary)]">Disbursed (Paid)</div>
                            <div className="text-3xl font-['Bebas_Neue',sans-serif] text-[var(--t-primary)] tracking-wider text-center">{formatCurrency(expense.total_paid)}</div>
                        </div>
                        <div className="border-l border-[var(--t-border)]">
                            <div className="text-[9px] font-['DM_Mono',monospace] font-bold text-[var(--t-text3)] uppercase tracking-[0.3em] mb-2 text-center text-[var(--t-danger)]">Outstanding Liability</div>
                            <div className="text-3xl font-['Bebas_Neue',sans-serif] text-[var(--t-danger)] tracking-wider text-center">{formatCurrency(expense.balance_due)}</div>
                        </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="mt-8 overflow-hidden h-1.5 bg-[var(--t-surface3)] rounded-full">
                        <div 
                            className="bg-[var(--t-primary)] h-full transition-all duration-1000"
                            style={{ width: `${Math.min(100, (expense.total_paid / expense.amount) * 100)}%` }}
                        />
                    </div>
                </div>

                {/* 3. Detailed Information */}
                <section className="space-y-6">
                    <h3 className="text-[10px] font-['DM_Mono',monospace] font-bold text-[var(--t-text2)] uppercase tracking-[0.4em] flex items-center gap-4">
                        Entry Logistics
                        <div className="h-px flex-1 bg-[var(--t-border)]" />
                    </h3>
                    <div className="grid grid-cols-2 gap-x-12 gap-y-6">
                        <div className="flex justify-between items-center group">
                            <span className="text-[9px] font-['DM_Mono',monospace] text-[var(--t-text3)] uppercase tracking-[0.2em]">Recipient / Paid To</span>
                            <span className="text-xs font-bold text-[var(--t-text)] tracking-tight uppercase">{expense.paid_to || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between items-center group">
                            <span className="text-[9px] font-['DM_Mono',monospace] text-[var(--t-text3)] uppercase tracking-[0.2em]">Funding Source</span>
                            <span className="text-xs font-bold text-[var(--t-info)] tracking-tight uppercase">{expense.funding_source_name || 'System Balance'}</span>
                        </div>
                        <div className="flex justify-between items-center group">
                            <span className="text-[9px] font-['DM_Mono',monospace] text-[var(--t-text3)] uppercase tracking-[0.2em]">Ledger Date</span>
                            <span className="text-xs font-bold text-[var(--t-text)] tracking-tight uppercase">{new Date(expense.date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between items-center group">
                            <span className="text-[9px] font-['DM_Mono',monospace] text-[var(--t-text3)] uppercase tracking-[0.2em]">Project Phase</span>
                            <span className="text-xs font-bold text-[var(--t-text)] tracking-tight uppercase">{expense.phase_name || 'General Operations'}</span>
                        </div>
                        {expense.expense_type === 'MATERIAL' && (
                            <div className="col-span-2 p-4 bg-[var(--t-info)]/5 border border-[var(--t-info)]/10 flex justify-between items-center group">
                                <span className="text-[9px] font-['DM_Mono',monospace] text-[var(--t-info)] font-bold uppercase tracking-[0.2em]">Associated Material Record</span>
                                <span className="text-xs font-bold text-[var(--t-info)] tracking-tight uppercase">{expense.material_name} ({expense.quantity} {expense.unit})</span>
                            </div>
                        )}
                    </div>
                </section>

                {/* 4. Payment History Table */}
                <section className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h3 className="text-[10px] font-['DM_Mono',monospace] font-bold text-[var(--t-text2)] uppercase tracking-[0.4em] flex items-center gap-4 flex-1">
                            Payment Journal
                            <div className="h-px flex-1 bg-[var(--t-border)]" />
                        </h3>
                        {expense.balance_due > 0 && !isPaymentFormOpen && (
                            <button 
                                onClick={() => setIsPaymentFormOpen(true)}
                                className="ml-6 py-2 px-4 border border-[var(--t-primary)] text-[var(--t-primary)] hover:bg-[var(--t-primary)]/10 text-[9px] font-['DM_Mono',monospace] font-bold uppercase tracking-[0.3em] transition-all"
                            >
                                + New Installment
                            </button>
                        )}
                    </div>

                    {/* Inline Payment Entry */}
                    {isPaymentFormOpen && (
                        <div className="bg-[var(--t-surface2)] p-6 rounded-[2px] border border-[var(--t-warn)]/30 animate-in fade-in slide-in-from-top-4 duration-300">
                            <div className="flex justify-between items-center mb-6">
                                <span className="text-[10px] font-['DM_Mono',monospace] font-bold text-[var(--t-warn)] uppercase tracking-[0.3em]">Security Check: Post New Payment</span>
                                <button onClick={() => setIsPaymentFormOpen(false)} className="text-[var(--t-text3)] hover:text-[var(--t-danger)] transition-colors">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                            <form onSubmit={handlePaymentSubmit} className="grid grid-cols-2 gap-6">
                                <div className="col-span-2">
                                    <label className="text-[9px] font-['DM_Mono',monospace] font-bold text-[var(--t-text3)] uppercase mb-2 block tracking-widest">Disbursement Amount</label>
                                    <input
                                        type="number"
                                        max={expense.balance_due}
                                        value={paymentData.amount}
                                        onChange={e => setPaymentData({ ...paymentData, amount: e.target.value })}
                                        className="w-full bg-[var(--t-surface)] border border-[var(--t-border)] text-xl font-['Bebas_Neue',sans-serif] tracking-widest text-[var(--t-text)] p-3 outline-none focus:border-[var(--t-primary)]"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-[9px] font-['DM_Mono',monospace] font-bold text-[var(--t-text3)] uppercase mb-2 block tracking-widest">Source Account</label>
                                    <select
                                        value={paymentData.funding_source}
                                        onChange={e => setPaymentData({ ...paymentData, funding_source: e.target.value })}
                                        className="w-full bg-[var(--t-surface)] border border-[var(--t-border)] text-[10px] font-['DM_Mono',monospace] font-bold text-[var(--t-text2)] uppercase tracking-widest p-3 outline-none"
                                        required
                                    >
                                        <option value="">Choose Account</option>
                                        {dashboardData.funding?.filter(f => parseFloat(paymentData.amount || 0) <= parseFloat(f.current_balance || 0)).map(f => (
                                            <option key={f.id} value={f.id}>{f.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[9px] font-['DM_Mono',monospace] font-bold text-[var(--t-text3)] uppercase mb-2 block tracking-widest">Payment Method</label>
                                    <select
                                        value={paymentData.method}
                                        onChange={e => setPaymentData({ ...paymentData, method: e.target.value })}
                                        className="w-full bg-[var(--t-surface)] border border-[var(--t-border)] text-[10px] font-['DM_Mono',monospace] font-bold text-[var(--t-text2)] uppercase tracking-widest p-3 outline-none"
                                    >
                                        <option value="CASH">Liquid Cash</option>
                                        <option value="BANK_TRANSFER">Direct Bank</option>
                                        <option value="QR">Instant QR</option>
                                        <option value="CHECK">Physical Check</option>
                                    </select>
                                </div>

                                <div className="col-span-2 space-y-3">
                                    <label className="text-[9px] font-['DM_Mono',monospace] font-bold text-[var(--t-warn)] uppercase block tracking-widest flex justify-between">
                                        Proof of Payment (Mandatory)
                                        <span className="text-[var(--t-danger)]">* Required</span>
                                    </label>
                                    <div className="flex items-center gap-6 p-4 bg-[var(--t-surface)] border-2 border-dashed border-[var(--t-border)] rounded-[2px] transition-all hover:border-[var(--t-primary)]/50 group">
                                        <div className="flex-1">
                                            <input 
                                                type="file" 
                                                accept="image/*" 
                                                onChange={handlePhotoChange}
                                                className="hidden" 
                                                id="payment-proof-upload"
                                            />
                                            <label 
                                                htmlFor="payment-proof-upload" 
                                                className="cursor-pointer flex flex-col items-center gap-2"
                                            >
                                                <svg className="w-8 h-8 text-[var(--t-text3)] group-hover:text-[var(--t-primary)] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                <span className="text-[10px] font-['DM_Mono',monospace] font-bold text-[var(--t-text3)] uppercase tracking-widest">
                                                    {paymentData.proof_photo ? paymentData.proof_photo.name : 'Select or Capture Receipt'}
                                                </span>
                                            </label>
                                        </div>
                                        {photoPreview && (
                                            <div className="w-20 h-20 rounded-[2px] overflow-hidden border border-[var(--t-border)] shadow-sm bg-white">
                                                <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <button type="submit" disabled={loading} className="col-span-2 py-4 bg-[var(--t-primary)] text-white font-['DM_Mono',monospace] font-black uppercase text-[11px] tracking-[0.4em] hover:brightness-110 transition-all shadow-lg shadow-[var(--t-primary)]/20">
                                    {loading ? 'Processing...' : 'Authorize Transaction'}
                                </button>
                            </form>
                        </div>
                    )}

                    <div className="bg-[var(--t-surface)] border border-[var(--t-border)] rounded-[1px] overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[var(--t-surface2)] border-b border-[var(--t-border)]">
                                    <th className="px-6 py-4 text-[10px] font-['DM_Mono',monospace] text-[var(--t-text3)] uppercase tracking-[0.2em]">Transaction Date</th>
                                    <th className="px-6 py-4 text-[10px] font-['DM_Mono',monospace] text-[var(--t-text3)] uppercase tracking-[0.2em]">Modality</th>
                                    <th className="px-6 py-4 text-[10px] font-['DM_Mono',monospace] text-[var(--t-text3)] uppercase tracking-[0.2em]">Legal Proof</th>
                                    <th className="px-6 py-4 text-[10px] font-['DM_Mono',monospace] text-[var(--t-text3)] uppercase tracking-[0.2em] text-right">Settlement</th>
                                    <th className="px-6 py-4 text-[10px] font-['DM_Mono',monospace] text-[var(--t-text3)] uppercase tracking-[0.2em] text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--t-border)]">
                                {expense.payments?.length > 0 ? (
                                    expense.payments.map((p, idx) => (
                                        <tr key={idx} className="hover:bg-[var(--t-surface2)] transition-colors group">
                                            <td className="px-6 py-4 text-[11px] font-['DM_Mono',monospace] text-[var(--t-text2)]">
                                                {new Date(p.date).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="px-2 py-0.5 bg-[var(--t-surface3)] text-[9px] font-['DM_Mono',monospace] font-bold text-[var(--t-text3)] uppercase tracking-widest border border-[var(--t-border)]">
                                                    {p.method}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {p.proof_photo ? (
                                                    <button 
                                                        onClick={() => setViewingPhoto(p.proof_photo)}
                                                        className="flex items-center gap-1.5 text-[9px] font-['DM_Mono',monospace] font-bold text-[var(--t-primary)] hover:text-[var(--t-primary)]/70 uppercase tracking-widest group/btn"
                                                    >
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                        View Proof
                                                    </button>
                                                ) : (
                                                    <span className="text-[9px] font-['DM_Mono',monospace] text-gray-300 uppercase italic">No File</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-[14px] font-['Bebas_Neue',sans-serif] text-[var(--t-text)] text-right tracking-[0.05em]">
                                                {formatCurrency(p.amount)}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => {
                                                        showConfirm({
                                                            title: "Void This Transaction?",
                                                            message: "This will revert the paid amount and restore the bill balance. This cannot be undone.",
                                                            confirmText: "Execute Void",
                                                            type: "danger",
                                                            onConfirm: async () => {
                                                                try {
                                                                    await dashboardService.deletePayment(p.id);refreshData();closeConfirm();
                                                                } catch (error) { alert('Failed'); closeConfirm(); }
                                                            }
                                                        });
                                                    }}
                                                    className="text-[9px] font-['DM_Mono',monospace] font-bold text-[var(--t-danger)] uppercase tracking-[0.2em] opacity-40 group-hover:opacity-100 transition-all hover:scale-110"
                                                >
                                                    Void
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-12 text-center text-[10px] font-['DM_Mono',monospace] text-[var(--t-text3)] uppercase tracking-[0.4em]">
                                            Empty Journal Log
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section className="space-y-4">
                    <h3 className="text-[10px] font-['DM_Mono',monospace] font-bold text-[var(--t-text2)] uppercase tracking-[0.4em] flex items-center gap-4">
                        Contextual Narrative
                        <div className="h-px flex-1 bg-[var(--t-border)]" />
                    </h3>
                    <div className="text-xs text-[var(--t-text3)] leading-relaxed italic bg-[var(--t-surface2)] p-6 border-l-2 border-[var(--t-border)]">
                        {expense.notes || "No supplemental documentation or descriptive notes provided for this ledger entry."}
                    </div>
                </section>
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

        <ProofViewer 
            photo={viewingPhoto} 
            onClose={() => setViewingPhoto(null)} 
        />
        </>
    );
};

export default ExpenseDetailModal;
