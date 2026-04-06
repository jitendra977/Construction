import React, { useMemo, useState, useCallback } from 'react';
import { useConstruction } from '../../../context/ConstructionContext';
import { dashboardService } from '../../../services/api';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

const PaymentsTab = ({ searchQuery = '' }) => {
    const { dashboardData, loading } = useConstruction();
    const [emailState, setEmailState] = useState({}); // { [paymentId]: 'idle' | 'sending' | 'sent' | 'error' }

    const flattenedPayments = useMemo(() => {
        if (!dashboardData?.expenses) return [];
        let payments = [];
        dashboardData.expenses.forEach(exp => {
            if (exp.payments && exp.payments.length > 0) {
                exp.payments.forEach(payment => {
                    const fundingSource = dashboardData.funding?.find(f => f.id === payment.funding_source);
                    payments.push({
                        ...payment,
                        expense_title: exp.title,
                        paid_to: exp.paid_to || exp.contractor_name || exp.supplier_name || 'Self/Other',
                        category_name: exp.category_name,
                        funding_source_name: fundingSource ? fundingSource.name : 'Unknown',
                        expense_type: exp.expense_type,
                        has_email_recipient: !!(exp.supplier_name || exp.contractor_name || exp.paid_to)
                    });
                });
            }
        });
        payments.sort((a, b) => new Date(b.date) - new Date(a.date));
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            return payments.filter(p =>
                p.expense_title?.toLowerCase().includes(query) ||
                p.paid_to?.toLowerCase().includes(query) ||
                p.method?.toLowerCase().includes(query) ||
                p.reference_id?.toLowerCase().includes(query)
            );
        }
        return payments;
    }, [dashboardData, searchQuery]);

    const handleSendReceipt = useCallback(async (paymentId) => {
        setEmailState(prev => ({ ...prev, [paymentId]: 'sending' }));
        try {
            await dashboardService.emailPaymentReceipt(paymentId);
            setEmailState(prev => ({ ...prev, [paymentId]: 'sent' }));
            setTimeout(() => setEmailState(prev => ({ ...prev, [paymentId]: 'idle' })), 4000);
        } catch (err) {
            const msg = err?.response?.data?.error || 'Send failed';
            setEmailState(prev => ({ ...prev, [paymentId]: 'error:' + msg }));
            setTimeout(() => setEmailState(prev => ({ ...prev, [paymentId]: 'idle' })), 5000);
        }
    }, []);

    const getMethodColor = (method) => {
        const colors = {
            'CASH': 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
            'BANK_TRANSFER': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
            'CHECK': 'bg-purple-500/10 text-purple-500 border-purple-500/20',
            'QR': 'bg-pink-500/10 text-pink-500 border-pink-500/20'
        };
        return colors[method] || 'bg-[var(--t-surface3)] text-[var(--t-text2)] border-[var(--t-border)]';
    };

    const EmailButton = ({ paymentId, hasRecipient }) => {
        const state = emailState[paymentId] || 'idle';
        const isSending = state === 'sending';
        const isSent = state === 'sent';
        const isError = state.startsWith('error:');
        const errorMsg = isError ? state.replace('error:', '') : '';

        if (!hasRecipient) return null;

        return (
            <div className="relative">
                <button
                    onClick={() => handleSendReceipt(paymentId)}
                    disabled={isSending || isSent}
                    title="Send payment receipt email to supplier/contractor"
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide border transition-all
                        ${isSent
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 cursor-default'
                            : isError
                                ? 'bg-red-500/10 text-red-500 border-red-500/20'
                                : 'bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20 cursor-pointer'
                        } disabled:opacity-60`}
                >
                    {isSending ? (
                        <><span className="w-3 h-3 border-2 border-blue-400/40 border-t-blue-400 rounded-full animate-spin" /> Sending...</>
                    ) : isSent ? (
                        <>✅ Sent!</>
                    ) : isError ? (
                        <>❌ Failed</>
                    ) : (
                        <>✉️ Send Receipt</>
                    )}
                </button>
                {isError && (
                    <div className="absolute left-0 top-7 z-10 bg-[var(--t-surface)] border border-red-400/30 text-red-400 text-[10px] rounded-lg px-2 py-1.5 shadow-xl w-48 leading-snug">
                        {errorMsg}
                    </div>
                )}
            </div>
        );
    };

    if (loading) {
        return <div className="p-4 bg-[var(--t-surface)] rounded-xl shadow-sm"><Skeleton count={10} height={40} className="mb-2" /></div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-2">
                <p className="text-sm text-[var(--t-text2)]">View all historical payments. Click <strong>Send Receipt</strong> to email a PDF receipt to the supplier or contractor.</p>
                <div className="bg-[var(--t-nav-active-bg)] text-[var(--t-nav-active-text)] px-3 py-1 rounded-lg text-sm font-bold border border-[var(--t-border)] shadow-sm">
                    {flattenedPayments.length} Payments Found
                </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block bg-[var(--t-surface)] rounded-xl shadow-sm border border-[var(--t-border)] overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-[var(--t-surface2)] border-b border-[var(--t-border)]">
                            <th className="px-6 py-4 text-xs font-bold text-[var(--t-text3)] uppercase tracking-wider">Date</th>
                            <th className="px-6 py-4 text-xs font-bold text-[var(--t-text3)] uppercase tracking-wider">Paid To / Expense</th>
                            <th className="px-6 py-4 text-xs font-bold text-[var(--t-text3)] uppercase tracking-wider">Method &amp; Record</th>
                            <th className="px-6 py-4 text-xs font-bold text-[var(--t-text3)] uppercase tracking-wider">Funding Source</th>
                            <th className="px-6 py-4 text-xs font-bold text-[var(--t-text3)] uppercase tracking-wider text-right">Amount Out</th>
                            <th className="px-6 py-4 text-xs font-bold text-[var(--t-text3)] uppercase tracking-wider text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--t-border)]">
                        {flattenedPayments.map(p => (
                            <tr key={p.id} className="hover:bg-[var(--t-surface2)] transition-colors group">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500 border border-green-500/20 shadow-sm">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                        </div>
                                        <div>
                                            <div className="font-bold text-[var(--t-text)]">{new Date(p.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                                            <div className="text-[10px] text-[var(--t-text3)] font-bold uppercase tracking-wider">{new Date(p.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="font-bold text-[var(--t-text)]">{p.paid_to}</div>
                                    <div className="text-xs text-[var(--t-text2)] max-w-[200px] truncate" title={p.expense_title}>{p.expense_title}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider w-fit mb-1 border ${getMethodColor(p.method)}`}>
                                        {p.method.replace('_', ' ')}
                                    </div>
                                    {p.reference_id && (
                                        <div className="text-[10px] text-[var(--t-text3)] font-mono">Ref: {p.reference_id}</div>
                                    )}
                                    {p.notes && (
                                        <div className="text-[10px] text-[var(--t-text2)] italic mt-1 bg-[var(--t-surface2)] px-2 py-0.5 rounded border border-[var(--t-border)] max-w-[200px] truncate" title={p.notes}>Note: {p.notes}</div>
                                    )}
                                    {p.proof_photo && (
                                        <div className="mt-2">
                                            <a
                                                href={p.proof_photo}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-[var(--t-nav-active-bg)] text-[10px] font-bold text-[var(--t-primary)] border border-[var(--t-border)] hover:bg-[var(--t-nav-active-bg)] transition-colors"
                                            >
                                                🖼️ VIEW PROOF
                                            </a>
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--t-surface2)] border border-[var(--t-border)] text-xs font-semibold text-[var(--t-text2)]">
                                        🏦 {p.funding_source_name || 'Main Budget'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <span className="text-[var(--t-danger)] font-black text-lg">
                                        - {Number(p.amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <EmailButton paymentId={p.id} hasRecipient={p.has_email_recipient} />
                                </td>
                            </tr>
                        ))}
                        {flattenedPayments.length === 0 && (
                            <tr>
                                <td colSpan="6" className="px-6 py-10 text-center text-[var(--t-text3)] italic text-sm">No recorded payments found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile List View */}
            <div className="lg:hidden flex flex-col gap-0.5">
                {flattenedPayments.map(p => {
                    const mc = getMethodColor(p.method);
                    return (
                        <div key={p.id} className="bg-[var(--t-surface)] border border-[var(--t-border)] rounded-[2px] p-3 flex items-center gap-3 hover:border-[var(--t-primary)] transition-colors">
                            {/* Date icon */}
                            <div className="w-9 shrink-0 flex flex-col items-center justify-center bg-[var(--t-surface2)] border border-[var(--t-border)] rounded p-1.5">
                                <span className="text-[7px] font-['DM_Mono',monospace] uppercase tracking-wider text-[var(--t-text3)]">
                                    {new Date(p.date).toLocaleDateString('en-GB', { month: 'short' })}
                                </span>
                                <span className="text-[15px] font-['Bebas_Neue',sans-serif] text-[var(--t-text)] leading-none">
                                    {new Date(p.date).getDate()}
                                </span>
                            </div>
                            {/* Middle */}
                            <div className="flex-1 min-w-0">
                                <p className="text-[13px] text-[var(--t-text)] font-semibold truncate leading-tight">{p.paid_to}</p>
                                <p className="text-[9px] text-[var(--t-text3)] font-['DM_Mono',monospace] truncate mt-0.5">{p.expense_title}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={`px-1.5 py-0.5 rounded-[1px] text-[7px] font-['DM_Mono',monospace] uppercase tracking-widest border ${mc}`}>
                                        {p.method.replace('_', ' ')}
                                    </span>
                                    <span className="text-[8px] text-[var(--t-text3)] font-['DM_Mono',monospace] truncate">
                                        🏦 {p.funding_source_name}
                                    </span>
                                </div>
                                {p.reference_id && (
                                    <span className="text-[7px] font-['DM_Mono',monospace] text-[var(--t-text3)] mt-0.5 block">Ref: {p.reference_id}</span>
                                )}
                            </div>
                            {/* Amount + actions */}
                            <div className="text-right shrink-0 flex flex-col items-end gap-1">
                                <p className="text-[16px] text-[var(--t-danger)] font-['Bebas_Neue',sans-serif] tracking-wide leading-none">
                                    -{Number(p.amount).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                                </p>
                                {p.proof_photo && (
                                    <a href={p.proof_photo} target="_blank" rel="noopener noreferrer"
                                        className="text-[7px] font-['DM_Mono',monospace] text-[var(--t-primary)] uppercase tracking-widest border border-[var(--t-primary)]/30 px-1.5 py-0.5 rounded-[1px] hover:bg-[var(--t-primary)]/10 transition-colors">
                                        📸 PROOF
                                    </a>
                                )}
                                {p.has_email_recipient && (
                                    <EmailButton paymentId={p.id} hasRecipient={p.has_email_recipient} />
                                )}
                            </div>
                        </div>
                    );
                })}
                {flattenedPayments.length === 0 && (
                    <div className="ht-empty"><p>No recorded payments found.</p></div>
                )}
            </div>
        </div>
    );
};

export default PaymentsTab;
