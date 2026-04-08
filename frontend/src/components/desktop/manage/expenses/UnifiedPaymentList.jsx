import React, { useState } from 'react';
import ProofViewer from '../../../common/ProofViewer';

const UnifiedPaymentList = ({ payments, handleSendReceipt, openHistoryModal, getMethodColor, emailState }) => {
    const [viewingPhoto, setViewingPhoto] = useState(null);
    
    const EmailButton = ({ p }) => {
        const state = emailState[p.id] || 'idle';
        const isSending = state === 'sending';
        const currentIsSent = state === 'sent' || (state === 'idle' && p.is_email_sent);
        const hasLogs = p.email_history && p.email_history.length > 0;
        const lastLog = hasLogs ? p.email_history[0] : null;

        if (!p.has_email_recipient) return null;

        return (
            <div className="flex items-center gap-1">
                <button
                    onClick={() => handleSendReceipt(p.id, p)}
                    disabled={isSending}
                    className={`group relative flex items-center gap-2 px-3 py-1.5 rounded-[1px] text-[9px] font-bold uppercase tracking-wider border transition-all active:scale-95
                        ${currentIsSent
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/20'
                            : 'bg-[var(--t-primary)] text-white border-[var(--t-primary)] hover:brightness-110 shadow-sm'
                        } disabled:opacity-50`}
                >
                    {isSending ? (
                        <><span className="w-3 h-3 border-2 border-current/40 border-t-current rounded-full animate-spin" /> Working...</>
                    ) : (
                        <>{currentIsSent ? '✉️ Resend' : '✉️ Send Receipt'}</>
                    )}
                </button>
                
                {hasLogs && (
                    <button 
                        onClick={() => openHistoryModal(p.email_history, `${p.expense_title} - Rs. ${p.amount}`)}
                        className={`p-1.5 rounded-[1px] border transition-all hover:scale-110
                            ${lastLog.status === 'SENT' ? 'text-green-500 border-green-500/20 bg-green-500/5' : 'text-red-500 border-red-500/20 bg-red-500/5'}`}
                        title="View communication audit trail"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </button>
                )}
            </div>
        );
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-[var(--t-surface)] rounded-[2px] border border-[var(--t-border)] overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-[var(--t-surface2)] border-b border-[var(--t-border)]">
                            <th className="px-8 py-4 text-[10px] font-['DM_Mono',monospace] text-[var(--t-text3)] uppercase tracking-[0.2em]">Timeline</th>
                            <th className="px-8 py-4 text-[10px] font-['DM_Mono',monospace] text-[var(--t-text3)] uppercase tracking-[0.2em]">Beneficiary / Scope</th>
                            <th className="px-8 py-4 text-[10px] font-['DM_Mono',monospace] text-[var(--t-text3)] uppercase tracking-[0.2em]">Channel</th>
                            <th className="px-8 py-4 text-[10px] font-['DM_Mono',monospace] text-[var(--t-text3)] uppercase tracking-[0.2em]">Origin</th>
                            <th className="px-8 py-4 text-[10px] font-['DM_Mono',monospace] text-[var(--t-text3)] uppercase tracking-[0.2em] text-right">Debit Amount</th>
                            <th className="px-8 py-4 text-[10px] font-['DM_Mono',monospace] text-[var(--t-text3)] uppercase tracking-[0.2em] text-center">Proof</th>
                            <th className="px-8 py-4 text-[10px] font-['DM_Mono',monospace] text-[var(--t-text3)] uppercase tracking-[0.2em] text-center">Receipt Logic</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--t-border)]">
                        {payments.length > 0 ? (
                            payments.map(p => (
                                <tr key={p.id} className="hover:bg-[var(--t-surface2)] transition-all group border-b border-[var(--t-border)]/50 last:border-0">
                                    <td className="px-8 py-5 whitespace-nowrap">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-[2px] bg-[var(--t-surface2)] flex flex-col items-center justify-center text-[var(--t-text3)] border border-[var(--t-border)] group-hover:border-[var(--t-primary)] transition-all">
                                                <span className="text-[8px] font-['DM_Mono',monospace] uppercase tracking-tighter leading-none mb-0.5">{new Date(p.date).toLocaleDateString('en-GB', { month: 'short' })}</span>
                                                <span className="text-sm font-bold leading-none">{new Date(p.date).getDate()}</span>
                                            </div>
                                            <div>
                                                <div className="font-bold text-[var(--t-text)] text-[11px] font-['DM_Mono',monospace]">{new Date(p.date).getFullYear()}</div>
                                                <div className="text-[9px] text-[var(--t-text3)] font-['DM_Mono',monospace] uppercase tracking-widest leading-none mt-0.5">{new Date(p.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="font-bold text-[var(--t-text)] text-[13px] uppercase tracking-tight flex items-center gap-2">
                                            {p.paid_to_resolved}
                                            {!p.is_linked && (
                                                <span className="text-[8px] px-1.5 py-0.5 rounded-[1px] border border-orange-500/20 bg-orange-500/10 text-orange-500 font-bold tracking-widest uppercase" title="Not linked to a Supplier/Contractor profile">Unlinked</span>
                                            )}
                                        </div>
                                        <div className="text-[10px] text-[var(--t-text3)] font-['DM_Mono',monospace] uppercase tracking-widest mt-1 opacity-70 truncate max-w-[240px]" title={p.expense_title}>{p.expense_title}</div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className={`px-2 py-0.5 rounded-[1px] text-[9px] font-bold font-['DM_Mono',monospace] uppercase tracking-[0.1em] w-fit mb-1.5 border ${getMethodColor(p.method)}`}>
                                            {p.method.replace('_', ' ')}
                                        </div>
                                        {p.reference_id && (
                                            <div className="text-[10px] text-[var(--t-text3)] font-mono bg-[var(--t-surface3)] px-1.5 py-0.5 rounded border border-[var(--t-border)] w-fit"># {p.reference_id}</div>
                                        )}
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-[1px] border border-[var(--t-border)] text-[9px] font-bold text-[var(--t-text3)] font-['DM_Mono',monospace] uppercase tracking-widest group-hover:border-[var(--t-primary)]/30 transition-colors bg-[var(--t-surface2)]">
                                            <div className="w-1.5 h-1.5 rounded-full bg-[var(--t-primary)]" />
                                            {p.funding_source_name || 'Main Reserve'}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5 text-right font-['Bebas_Neue',sans-serif]">
                                        <span className="text-[var(--t-danger)] font-bold text-[18px] tracking-wide">
                                            - {Number(p.amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex justify-center">
                                            {p.proof_photo ? (
                                                <button 
                                                    onClick={() => setViewingPhoto(p.proof_photo)}
                                                    className="flex flex-col items-center gap-1 group/proof p-2 hover:bg-[var(--t-primary)]/10 rounded-xl transition-all"
                                                >
                                                    <div className="w-7 h-7 rounded-lg bg-[var(--t-surface2)] border border-[var(--t-border)] flex items-center justify-center text-[var(--t-text3)] group-hover/proof:border-[var(--t-primary)]/50 group-hover/proof:text-[var(--t-primary)] transition-all">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                    </div>
                                                    <span className="text-[8px] font-['DM_Mono',monospace] font-bold text-[var(--t-text3)] uppercase tracking-tighter group-hover/proof:text-[var(--t-primary)]">Evidence</span>
                                                </button>
                                            ) : (
                                                <span className="text-[8px] font-['DM_Mono',monospace] text-[var(--t-text3)] opacity-30 uppercase tracking-tighter">No Proof</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex items-center justify-center">
                                            <EmailButton p={p} />
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="7" className="px-6 py-20 text-center">
                                    <div className="flex flex-col items-center opacity-40">
                                        <div className="text-4xl mb-4">💳</div>
                                        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--t-text3)]">No disbursement records found matching your criteria</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <ProofViewer 
                photo={viewingPhoto} 
                onClose={() => setViewingPhoto(null)} 
            />
        </div>
    );
};

export default UnifiedPaymentList;
