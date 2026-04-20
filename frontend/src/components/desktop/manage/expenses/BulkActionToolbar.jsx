import React from 'react';

const BulkActionToolbar = ({ selectedCount, onDelete, onMarkPaid, onClear, formatCurrency, totalAmount }) => {
    return (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-8 duration-500">
            <div className="bg-[var(--t-surface)] border border-[var(--t-primary)] shadow-[0_20px_50px_rgba(0,0,0,0.3)] px-8 py-4 rounded-[2rem] flex items-center gap-10">
                
                {/* Selection Info */}
                <div className="flex items-center gap-4 border-r border-[var(--t-border)] pr-8">
                    <div className="w-10 h-10 rounded-full bg-[var(--t-primary)] text-white flex items-center justify-center font-black text-xs shadow-lg shadow-[var(--t-primary)]/20">
                        {selectedCount}
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-[var(--t-text2)] uppercase tracking-widest">Records Selected</p>
                        <p className="text-[14px] font-['Bebas_Neue',sans-serif] tracking-wider text-[var(--t-text)]">
                            Total: {formatCurrency(totalAmount)}
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    <button 
                        onClick={onMarkPaid}
                        className="flex items-center gap-3 px-6 py-2.5 bg-[var(--t-primary)] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-[var(--t-primary)]/10"
                    >
                        <span>💳</span>
                        Mark as Paid
                    </button>
                    
                    <button 
                        onClick={onDelete}
                        className="flex items-center gap-3 px-6 py-2.5 bg-transparent text-[var(--t-danger)] border border-[var(--t-danger)]/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[var(--t-danger)]/5 active:scale-95 transition-all"
                    >
                        <span>🗑️</span>
                        Batch Delete
                    </button>
                </div>

                {/* Clear */}
                <button 
                    onClick={onClear}
                    className="p-2 text-[var(--t-text3)] hover:text-[var(--t-text)] transition-colors ml-2"
                    title="Clear Selection"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
        </div>
    );
};

export default BulkActionToolbar;
