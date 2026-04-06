const EmailLogHistoryModal = ({ isOpen, onClose, logs, paymentTitle }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[var(--t-surface)] border border-[var(--t-border)] w-full max-w-2xl rounded-2xl shadow-3xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200">
                <div className="px-6 py-5 border-b border-[var(--t-border)] flex justify-between items-center bg-[var(--t-surface2)]">
                    <div>
                        <h3 className="text-lg font-black text-[var(--t-text)] uppercase tracking-tighter italic">Communication History</h3>
                        <p className="text-[10px] text-[var(--t-text3)] font-bold uppercase tracking-widest leading-none mt-1">{paymentTitle}</p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-[var(--t-surface3)] flex items-center justify-center text-[var(--t-text2)] transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                    {logs && logs.length > 0 ? (
                        <div className="space-y-4">
                            {logs.map((log, i) => (
                                <div key={log.id} className="relative pl-8 border-l border-[var(--t-border)] pb-2 last:pb-0">
                                    <div className={`absolute -left-2 top-0 w-4 h-4 rounded-full border-2 border-[var(--t-surface)] shadow-sm ${log.status === 'SENT' ? 'bg-green-500' : 'bg-red-500'}`} />
                                    <div className="bg-[var(--t-surface2)] border border-[var(--t-border)] rounded-xl p-4 shadow-sm hover:border-[var(--t-primary)]/30 transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${log.status === 'SENT' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                                    {log.status}
                                                </span>
                                            </div>
                                            <span className="text-[10px] font-mono text-[var(--t-text3)]">{new Date(log.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <p className="text-xs font-bold text-[var(--t-text)]">To: {log.recipient_name} <span className="font-normal text-[var(--t-text3)]">({log.recipient_email})</span></p>
                                        <p className="text-[10px] text-[var(--t-text2)] mt-1">Subject: {log.subject}</p>
                                        <div className="mt-3 flex items-center gap-2">
                                            <div className="w-5 h-5 rounded-full bg-[var(--t-surface3)] flex items-center justify-center text-[8px] font-bold text-[var(--t-text3)] border border-[var(--t-border)]">
                                                {log.sent_by_username ? log.sent_by_username[0].toUpperCase() : '?'}
                                            </div>
                                            <span className="text-[9px] font-bold text-[var(--t-text3)] uppercase uppercase tracking-wider">Sent By: {log.sent_by_username || 'System'}</span>
                                        </div>
                                        {log.error_message && (
                                            <div className="mt-3 p-3 bg-red-500/5 border border-red-500/10 rounded-lg">
                                                <span className="text-[8px] font-black text-red-500 uppercase tracking-widest block mb-1">Error Detail</span>
                                                <p className="text-[10px] text-red-400 italic font-medium leading-relaxed">{log.error_message}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-10 opacity-40">
                            <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                            <p className="text-sm font-bold uppercase tracking-widest text-[var(--t-text3)]">No Delivery Attempts Yet</p>
                        </div>
                    )}
                </div>
                <div className="p-4 bg-[var(--t-surface2)] border-t border-[var(--t-border)] flex justify-end px-6">
                    <button onClick={onClose} className="px-6 py-2 bg-[var(--t-nav-active-bg)] text-[11px] font-black uppercase tracking-widest text-[var(--t-primary)] rounded-xl border border-[var(--t-border)] hover:bg-[var(--t-surface3)] transition-all">
                        Close Log
                    </button>
                </div>
            </div>
        </div>
    );
};

const EmailConfirmationModal = ({ isOpen, onClose, result }) => {
    if (!isOpen) return null;
    const isSuccess = result.status === 'success';

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-[var(--t-surface)] border border-[var(--t-border)] w-full max-w-sm rounded-3xl shadow-4xl p-8 flex flex-col items-center text-center animate-in zoom-in-95 duration-300">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 border-4 shadow-xl
                    ${isSuccess ? 'bg-green-500/10 border-green-500/30 text-green-500' : 'bg-red-500/10 border-red-500/30 text-red-500'}`}>
                    {isSuccess ? (
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                    ) : (
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                    )}
                </div>
                <h3 className="text-2xl font-black text-[var(--t-text)] uppercase tracking-tighter italic mb-2">
                    {isSuccess ? 'Receipt Sent!' : 'Delivery Failed'}
                </h3>
                <p className="text-sm text-[var(--t-text2)] leading-relaxed font-medium mb-8">
                    {result.message}
                </p>
                <button
                    onClick={onClose}
                    className={`w-full py-4 rounded-2xl text-[12px] font-black uppercase tracking-[0.2em] transition-all shadow-lg active:scale-95
                        ${isSuccess 
                            ? 'bg-green-500 text-white shadow-green-500/20 hover:bg-green-600' 
                            : 'bg-red-500 text-white shadow-red-500/20 hover:bg-red-600'}`}
                >
                    Acknowledge
                </button>
            </div>
        </div>
    );
};

const PaymentsTab = ({ searchQuery = '' }) => {
    const { dashboardData, loading } = useConstruction();
    const [emailState, setEmailState] = useState({}); // { [paymentId]: 'idle' | 'sending' | 'sent' | 'error' }
    const [emailLogs, setEmailLogs] = useState([]);
    const [fetchingLogs, setFetchingLogs] = useState(false);
    
    // Modal states
    const [confirmation, setConfirmation] = useState({ isOpen: false, status: 'success', message: '' });
    const [historyModal, setHistoryModal] = useState({ isOpen: false, logs: [], title: '' });

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
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            return payments.filter(p =>
                p.expense_title?.toLowerCase().includes(query) ||
                p.paid_to_resolved?.toLowerCase().includes(query) ||
                p.method?.toLowerCase().includes(query) ||
                p.reference_id?.toLowerCase().includes(query)
            );
        }
        return payments;
    }, [dashboardData, searchQuery, emailLogs]);

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
            fetchLogs(); // Still fetch logs as we now log failures too
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
                    className={`group relative flex items-center gap-2 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider border transition-all active:scale-95
                        ${currentIsSent
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20'
                            : 'bg-[var(--t-primary)] text-white border-[var(--t-primary)] hover:brightness-110 shadow-lg shadow-[var(--t-primary)]/10'
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
                        onClick={() => setHistoryModal({ 
                            isOpen: true, 
                            logs: p.email_history, 
                            title: `${p.expense_title} - Rs. ${p.amount}` 
                        })}
                        className={`p-1.5 rounded-xl border transition-all hover:scale-110
                            ${lastLog.status === 'SENT' ? 'text-green-500 border-green-500/20 bg-green-500/5' : 'text-red-500 border-red-500/20 bg-red-500/5'}`}
                        title="View communication audit trail"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </button>
                )}
            </div>
        );
    };

    if (loading) {
        return <div className="p-4 bg-[var(--t-surface)] rounded-xl shadow-sm"><Skeleton count={10} height={40} className="mb-2" /></div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-2 px-1">
                <div className="max-w-xl">
                    <h2 className="text-xl font-black text-[var(--t-text)] uppercase tracking-tighter italic leading-none">Financial Disbursements</h2>
                    <p className="text-[10px] text-[var(--t-text3)] font-bold uppercase tracking-widest mt-1">Audit trail for all payments and digital receipts sent to suppliers.</p>
                </div>
                <div className="flex items-center gap-3">
                    {fetchingLogs && (
                        <div className="flex items-center gap-2 text-[10px] text-[var(--t-primary)] font-black uppercase tracking-tighter animate-pulse">
                            <div className="w-2 h-2 rounded-full bg-[var(--t-primary)]" />
                            Live Sync
                        </div>
                    )}
                    <div className="bg-[var(--t-surface2)] text-[var(--t-text)] px-4 py-2 rounded-2xl text-[11px] font-black border border-[var(--t-border)] shadow-sm uppercase tracking-wider">
                        {flattenedPayments.length} Total Records
                    </div>
                </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block bg-[var(--t-surface)] rounded-3xl shadow-2xl border border-[var(--t-border)] overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-[var(--t-surface2)] border-b border-[var(--t-border)]">
                            <th className="px-6 py-5 text-[10px] font-black text-[var(--t-text3)] uppercase tracking-[0.2em] italic">Timeline</th>
                            <th className="px-6 py-5 text-[10px] font-black text-[var(--t-text3)] uppercase tracking-[0.2em] italic">Beneficiary / Scope</th>
                            <th className="px-6 py-5 text-[10px] font-black text-[var(--t-text3)] uppercase tracking-[0.2em] italic">Channel</th>
                            <th className="px-6 py-5 text-[10px] font-black text-[var(--t-text3)] uppercase tracking-[0.2em] italic">Origin</th>
                            <th className="px-6 py-5 text-[10px] font-black text-[var(--t-text3)] uppercase tracking-[0.2em] italic text-right">Debit Amount</th>
                            <th className="px-6 py-5 text-[10px] font-black text-[var(--t-text3)] uppercase tracking-[0.2em] italic text-center">Receipt Logic</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--t-border)]">
                        {flattenedPayments.map(p => (
                            <tr key={p.id} className="hover:bg-[var(--t-surface2)] transition-all group border-b border-[var(--t-border)]/50 last:border-0 font-['Outfit',sans-serif]">
                                <td className="px-6 py-5 whitespace-nowrap">
                                    <div className="flex items-center gap-4">
                                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 flex flex-col items-center justify-center text-emerald-500 border border-emerald-500/30 group-hover:scale-110 transition-transform shadow-lg shadow-emerald-500/5">
                                            <span className="text-[8px] font-black uppercase tracking-tighter leading-none mb-0.5">{new Date(p.date).toLocaleDateString('en-GB', { month: 'short' })}</span>
                                            <span className="text-lg font-black italic leading-none">{new Date(p.date).getDate()}</span>
                                        </div>
                                        <div>
                                            <div className="font-extrabold text-[var(--t-text)] text-sm">{new Date(p.date).getFullYear()}</div>
                                            <div className="text-[10px] text-[var(--t-text3)] font-black uppercase tracking-widest leading-none mt-0.5">{new Date(p.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-5">
                                    <div className="font-black text-[var(--t-text)] text-[13px] uppercase tracking-tight italic flex items-center gap-2">
                                        {p.paid_to_resolved}
                                        {!p.is_linked && (
                                            <span className="text-[8px] px-1.5 py-0.5 rounded border border-orange-500/20 bg-orange-500/10 text-orange-500 font-bold tracking-widest normal-case italic" title="Not linked to a Supplier/Contractor profile">Unlinked</span>
                                        )}
                                    </div>
                                    <div className="text-[10px] text-[var(--t-text2)] font-bold uppercase tracking-widest mt-1 opacity-70 truncate max-w-[240px]" title={p.expense_title}>{p.expense_title}</div>
                                </td>
                                <td className="px-6 py-5">
                                    <div className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-[0.1em] italic w-fit mb-1.5 border shadow-sm ${getMethodColor(p.method)}`}>
                                        {p.method.replace('_', ' ')}
                                    </div>
                                    {p.reference_id && (
                                        <div className="text-[10px] text-[var(--t-text3)] font-mono bg-[var(--t-surface3)] px-1.5 py-0.5 rounded border border-[var(--t-border)] w-fit"># {p.reference_id}</div>
                                    )}
                                </td>
                                <td className="px-6 py-5">
                                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--t-surface2)] border border-[var(--t-border)] text-[10px] font-black text-[var(--t-text2)] uppercase tracking-widest italic shadow-sm group-hover:border-[var(--t-primary)]/30 transition-colors">
                                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--t-primary)] shadow-[0_0_5px_var(--t-primary)]" />
                                        {p.funding_source_name || 'Main Reserve'}
                                    </span>
                                </td>
                                <td className="px-6 py-5 text-right font-['Bebas_Neue',sans-serif]">
                                    <span className="text-[var(--t-danger)] font-black text-2xl tracking-tight">
                                        - {Number(p.amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                    </span>
                                </td>
                                <td className="px-6 py-5">
                                    <div className="flex items-center justify-center">
                                        <EmailButton p={p} />
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Cards (Custom Rich Design) */}
            <div className="lg:hidden grid grid-cols-1 gap-3">
                {flattenedPayments.map(p => (
                    <div key={p.id} className="bg-[var(--t-surface)] border border-[var(--t-border)] rounded-2xl p-4 shadow-lg active:scale-[0.98] transition-transform">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex flex-col items-center justify-center text-orange-500 border border-orange-500/20">
                                    <span className="text-[7px] font-black uppercase leading-none">{new Date(p.date).toLocaleDateString('en-GB', { month: 'short' })}</span>
                                    <span className="text-base font-black italic">{new Date(p.date).getDate()}</span>
                                </div>
                                <div className="min-w-0">
                                    <h4 className="text-[13px] font-black text-[var(--t-text)] uppercase tracking-tighter truncate italic">{p.paid_to_resolved}</h4>
                                    <p className="text-[10px] text-[var(--t-text3)] font-bold truncate tracking-widest uppercase opacity-60 leading-none mt-0.5">{p.expense_title}</p>
                                </div>
                            </div>
                            <span className="text-xl font-black italic text-[var(--t-danger)] font-['Bebas_Neue'] leading-none">-{Number(p.amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                        </div>
                        <div className="flex items-center justify-between pt-3 border-t border-[var(--t-border)]">
                            <div className="flex items-center gap-2">
                                <div className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-wider border ${getMethodColor(p.method)}`}>
                                    {p.method.replace('_', ' ')}
                                </div>
                                <span className="text-[9px] font-bold text-[var(--t-text3)] uppercase">🏦 {p.funding_source_name}</span>
                            </div>
                            <EmailButton p={p} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Modals */}
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
        </div>
    );
};

export default PaymentsTab;
