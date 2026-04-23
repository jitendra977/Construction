import React, { useState, useEffect } from 'react';
import { financeService } from '../../../../services/api';
import JournalEntryFormModal from './JournalEntryFormModal';

/* Source label map — plain English */
const SOURCE_LABELS = {
    BILL: { label: 'Vendor Bill', icon: '🧾', color: 'text-rose-600 bg-rose-500/10 border-rose-500/20' },
    PAYMENT: { label: 'Bill Payment', icon: '💸', color: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20' },
    INVOICE: { label: 'Client Invoice', icon: '📄', color: 'text-sky-600 bg-sky-500/10 border-sky-500/20' },
    RECEIPT: { label: 'Payment Received', icon: '✅', color: 'text-green-600 bg-green-500/10 border-green-500/20' },
    MANUAL: { label: 'Manual Entry', icon: '✏️', color: 'text-violet-600 bg-violet-500/10 border-violet-500/20' },
    INITIAL: { label: 'Opening Balance', icon: '🏁', color: 'text-amber-600 bg-amber-500/10 border-amber-500/20' },
    TRANSFER: { label: 'Internal Transfer', icon: '⇄', color: 'text-indigo-600 bg-indigo-500/10 border-indigo-500/20' },
    EXPENSE: { label: 'Direct Expense', icon: '📦', color: 'text-orange-600 bg-orange-500/10 border-orange-500/20' },
    FUNDING: { label: 'Funding Received', icon: '💰', color: 'text-teal-600 bg-teal-500/10 border-teal-500/20' },
};

const fmt = (n) => `Rs. ${parseFloat(n || 0).toLocaleString('en-IN')}`;

const LedgerTab = ({ searchQuery }) => {
    const [entries, setEntries] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isJournalModalOpen, setIsJournalModalOpen] = useState(false);
    const [expandedId, setExpandedId] = useState(null);

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [entriesRes, accountsRes] = await Promise.all([
                    financeService.getJournalEntries(),
                    financeService.getAccounts()
                ]);
                setEntries(entriesRes.data);
                setAccounts(accountsRes.data);
            } catch (err) {
                console.error('Error fetching ledger data', err);
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, []);

    const filtered = entries.filter(e =>
        (e.description?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (e.reference_id?.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 border-4 border-[var(--t-primary)] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-[var(--t-text3)]">Loading journal entries…</p>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h2 className="text-xl font-black text-[var(--t-text)] flex items-center gap-2">
                        📒 General Ledger
                    </h2>
                    <p className="text-sm text-[var(--t-text2)] mt-1 opacity-80">
                        Every financial event recorded in order. Each entry has a <strong>Debit</strong> (money going to) and a <strong>Credit</strong> (money coming from).
                    </p>
                </div>
                <button
                    onClick={() => setIsJournalModalOpen(true)}
                    className="px-4 py-2 bg-[var(--t-primary)] text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity shrink-0"
                >
                    + Manual Journal Entry
                </button>
            </div>

            {/* ── Quick legend ── */}
            <div className="flex flex-wrap gap-2 text-[10px]">
                {Object.entries(SOURCE_LABELS).map(([key, s]) => (
                    <span key={key} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border font-bold ${s.color}`}>
                        {s.icon} {s.label}
                    </span>
                ))}
            </div>

            {/* ── Debit / Credit explainer ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                    <span className="text-xl">📥</span>
                    <div>
                        <p className="font-black text-emerald-700">Debit (Dr.)</p>
                        <p className="text-[var(--t-text3)] mt-0.5">Money flowing IN to an account — increases assets or expenses.</p>
                    </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl bg-rose-500/5 border border-rose-500/20">
                    <span className="text-xl">📤</span>
                    <div>
                        <p className="font-black text-rose-700">Credit (Cr.)</p>
                        <p className="text-[var(--t-text3)] mt-0.5">Money flowing OUT — decreases assets or records a liability/revenue.</p>
                    </div>
                </div>
            </div>

            {/* ── Entries list ── */}
            {filtered.length === 0 ? (
                <div className="text-center py-16 bg-[var(--t-surface2)]/30 border-2 border-dashed border-[var(--t-border)] rounded-2xl">
                    <div className="text-5xl mb-4 opacity-20">📒</div>
                    <h3 className="font-black text-[var(--t-text2)] text-lg">No Entries Found</h3>
                    <p className="text-sm text-[var(--t-text3)] mt-1">
                        {searchQuery ? 'Try a different search.' : 'Entries appear automatically when bills, payments, and transfers are recorded.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(entry => {
                        const src = SOURCE_LABELS[entry.source] || SOURCE_LABELS.MANUAL;
                        const isOpen = expandedId === entry.id;
                        const totalDebit = parseFloat(entry.total_debit || 0);
                        return (
                            <div key={entry.id} className="bg-[var(--t-surface)] rounded-2xl border border-[var(--t-border)] overflow-hidden">
                                {/* Row header — always visible */}
                                <button
                                    className="w-full flex items-center gap-4 p-4 text-left hover:bg-[var(--t-surface2)]/30 transition-colors"
                                    onClick={() => setExpandedId(isOpen ? null : entry.id)}
                                >
                                    <span className="text-2xl shrink-0">{src.icon}</span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${src.color}`}>
                                                {src.label}
                                            </span>
                                            {entry.reference_id && (
                                                <span className="font-mono text-[10px] text-[var(--t-text3)] bg-[var(--t-surface2)] px-1.5 py-0.5 rounded-md">
                                                    {entry.reference_id}
                                                </span>
                                            )}
                                        </div>
                                        <p className="font-bold text-[var(--t-text)] mt-1 truncate text-sm">{entry.description}</p>
                                    </div>
                                    <div className="shrink-0 text-right">
                                        <p className="font-black text-[var(--t-text)] font-mono text-sm">{fmt(totalDebit)}</p>
                                        <p className="text-[10px] text-[var(--t-text3)] font-mono">{entry.date}</p>
                                    </div>
                                    <span className={`text-[var(--t-text3)] text-xs transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}>▶</span>
                                </button>

                                {/* Expanded journal lines */}
                                {isOpen && entry.lines && (
                                    <div className="border-t border-[var(--t-border)] bg-[var(--t-surface2)]/20 px-4 py-3 space-y-1">
                                        <p className="text-[10px] font-black text-[var(--t-text3)] uppercase tracking-widest mb-3">
                                            Journal Lines (Debit / Credit breakdown)
                                        </p>
                                        <div className="grid grid-cols-[1fr_auto_auto] text-[11px] font-bold text-[var(--t-text3)] uppercase tracking-wide pb-1 border-b border-[var(--t-border)]">
                                            <span>Account</span>
                                            <span className="text-emerald-600 pr-6">Debit (Dr.)</span>
                                            <span className="text-rose-600">Credit (Cr.)</span>
                                        </div>
                                        {entry.lines.map(line => (
                                            <div key={line.id} className="grid grid-cols-[1fr_auto_auto] items-center py-1.5">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${line.entry_type === 'DEBIT' ? 'bg-emerald-500/10 text-emerald-700' : 'bg-rose-500/10 text-rose-700 ml-6'}`}>
                                                        {line.entry_type === 'DEBIT' ? 'Dr' : 'Cr'}
                                                    </span>
                                                    <span className="text-[var(--t-text)] font-medium text-sm truncate">{line.account_name}</span>
                                                    <span className="font-mono text-[10px] text-[var(--t-text3)]">{line.account_code}</span>
                                                </div>
                                                <span className="font-mono font-bold text-emerald-600 pr-6">
                                                    {line.entry_type === 'DEBIT' ? fmt(line.amount) : '—'}
                                                </span>
                                                <span className="font-mono font-bold text-rose-600">
                                                    {line.entry_type === 'CREDIT' ? fmt(line.amount) : '—'}
                                                </span>
                                            </div>
                                        ))}
                                        <div className="grid grid-cols-[1fr_auto_auto] pt-2 border-t border-[var(--t-border)] mt-2">
                                            <span className="text-[10px] font-black text-[var(--t-text3)] uppercase tracking-wide">Total</span>
                                            <span className="font-mono font-black text-emerald-600 pr-6">{fmt(entry.total_debit)}</span>
                                            <span className="font-mono font-black text-rose-600">{fmt(entry.total_credit)}</span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-2 text-[10px]">
                                            {entry.is_balanced
                                                ? <span className="flex items-center gap-1 text-emerald-600 font-bold"><span>✅</span> Balanced entry</span>
                                                : <span className="flex items-center gap-1 text-rose-600 font-bold"><span>⚠️</span> Entry is NOT balanced</span>
                                            }
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            <JournalEntryFormModal
                isOpen={isJournalModalOpen}
                onClose={() => setIsJournalModalOpen(false)}
                accounts={accounts}
            />
        </div>
    );
};

export default LedgerTab;
