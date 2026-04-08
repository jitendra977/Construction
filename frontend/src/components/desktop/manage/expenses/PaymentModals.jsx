import React from 'react';

export const EmailLogHistoryModal = ({ isOpen, onClose, logs, paymentTitle }) => {
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
                                            <span className="text-[10px] font-mono text-[var(--t-text3)]">{new Date(log.timestamp || log.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <p className="text-xs font-bold text-[var(--t-text)]">To: {log.recipient_name} <span className="font-normal text-[var(--t-text3)]">({log.recipient_email})</span></p>
                                        <p className="text-[10px] text-[var(--t-text2)] mt-1">Subject: {log.subject}</p>
                                        <div className="mt-3 flex items-center gap-2">
                                            <div className="w-5 h-5 rounded-full bg-[var(--t-surface3)] flex items-center justify-center text-[8px] font-bold text-[var(--t-text3)] border border-[var(--t-border)]">
                                                {log.sent_by_username ? log.sent_by_username[0].toUpperCase() : '?'}
                                            </div>
                                            <span className="text-[9px] font-bold text-[var(--t-text3)] uppercase tracking-wider">Sent By: {log.sent_by_username || 'System'}</span>
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

export const EmailConfirmationModal = ({ isOpen, onClose, result }) => {
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
