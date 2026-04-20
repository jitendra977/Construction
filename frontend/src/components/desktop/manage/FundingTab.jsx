import React, { useState } from 'react';
import { dashboardService } from '../../../services/api';
import Modal from '../../common/Modal';
import { useConstruction } from '../../../context/ConstructionContext';
import ConfirmModal from '../../common/ConfirmModal';
import ExpenseDetailModal from '../../common/ExpenseDetailModal';

const TYPE_CONFIG = {
    OWN_MONEY: { label: 'Personal Savings', icon: '💰', accent: '#10b981' },
    LOAN:      { label: 'Bank Loan',         icon: '🏦', accent: '#3b82f6' },
    BORROWED:  { label: 'Borrowed',          icon: '🤝', accent: '#a855f7' },
    OTHER:     { label: 'Other',             icon: '📁', accent: '#6b7280' },
};

const FundingTab = ({ searchQuery = '' }) => {
    const { dashboardData, refreshData, formatCurrency } = useConstruction();
    const [isModalOpen,  setIsModalOpen]  = useState(false);
    const [editingItem,  setEditingItem]  = useState(null);
    const [formData,     setFormData]     = useState({});
    const [loading,      setLoading]      = useState(false);
    const [depositOpen,  setDepositOpen]  = useState(false);
    const [activeSource, setActiveSource] = useState(null);
    const [statementSrc, setStatementSrc] = useState(null);
    const [isExpenseDetailOpen, setIsExpenseDetailOpen] = useState(false);
    const [selectedExpenseId,   setSelectedExpenseId]   = useState(null);
    const [depositForm, setDepositForm] = useState({ amount: '', date: new Date().toISOString().split('T')[0], description: '' });

    const [confirmConfig, setConfirmConfig] = useState({ isOpen: false });
    const showConfirm = (cfg) => setConfirmConfig({ ...cfg, isOpen: true });
    const closeConfirm = () => setConfirmConfig(c => ({ ...c, isOpen: false }));

    const funding = dashboardData.funding?.filter(f =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.source_type.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    const totals = funding.reduce((acc, f) => ({
        capital:  acc.capital  + Number(f.total_credited ?? f.amount ?? 0),
        spent:    acc.spent    + Number(f.total_debited ?? 0),
        balance:  acc.balance  + Number(f.current_balance ?? 0),
    }), { capital: 0, spent: 0, balance: 0 });

    /* ─── handlers ─────────────────────────────────────────────── */
    const openAdd = () => {
        setEditingItem(null);
        setFormData({ source_type: 'OWN_MONEY', received_date: new Date().toISOString().split('T')[0], amount: '', interest_rate: 0 });
        setIsModalOpen(true);
    };
    const openEdit = (f) => { setEditingItem(f); setFormData(f); setIsModalOpen(true); };

    const handleSubmit = async (e) => {
        e.preventDefault(); setLoading(true);
        try {
            if (editingItem) await dashboardService.updateFundingSource(editingItem.id, formData);
            else await dashboardService.createFundingSource(formData);
            setIsModalOpen(false); refreshData();
        } catch { alert('Save failed.'); } finally { setLoading(false); }
    };

    const handleDelete = (id) => showConfirm({
        title: 'Remove Funding Account?',
        message: 'This will permanently remove the account and ALL its transaction history.',
        confirmText: 'Yes, Remove', type: 'danger',
        onConfirm: async () => {
            try { await dashboardService.deleteFundingSource(id); refreshData(); closeConfirm(); }
            catch { alert('Delete failed.'); closeConfirm(); }
        }
    });

    const openDeposit = (f) => {
        setActiveSource(f);
        setDepositForm({ amount: '', date: new Date().toISOString().split('T')[0], description: '' });
        setDepositOpen(true);
    };

    const handleDeposit = async (e) => {
        e.preventDefault(); setLoading(true);
        try {
            await dashboardService.createFundingTransaction({
                funding_source: activeSource.id,
                amount: parseFloat(depositForm.amount),
                transaction_type: 'CREDIT',
                date: depositForm.date,
                description: depositForm.description || 'Deposit',
            });
            setDepositOpen(false); refreshData();
        } catch { alert('Deposit failed.'); } finally { setLoading(false); }
    };

    const handleSync = async (id) => {
        try { await dashboardService.recalculateFundingBalance(id); refreshData(); }
        catch { alert('Sync failed.'); }
    };

    const handleDeleteTxn = (txn) => showConfirm({
        title: 'Delete Transaction?',
        message: 'This transaction entry will be removed and the balance will be adjusted.',
        confirmText: 'Delete', type: 'danger',
        onConfirm: async () => {
            try {
                await dashboardService.deleteFundingTransaction(txn.id);
                setStatementSrc(null); refreshData(); closeConfirm();
            } catch { closeConfirm(); }
        }
    });

    // Build running-balance ledger (newest first for display)
    const buildLedger = (src) => {
        const sorted = [...(src.transactions ?? [])].sort((a, b) => new Date(a.date) - new Date(b.date) || a.id - b.id);
        let run = 0;
        return sorted.map(t => {
            run += t.transaction_type === 'CREDIT' ? Number(t.amount) : -Number(t.amount);
            return { ...t, running: run };
        }).reverse();
    };
    return (
        <div className="space-y-6">
            {/* ── Summary Strip ──────────────── */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center justify-between">
                <div className="flex gap-10">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Net Available</p>
                        <p className={`text-xl font-bold ${totals.balance >= 0 ? 'text-slate-900' : 'text-red-600'}`}>
                            {formatCurrency(totals.balance)}
                        </p>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Total Capital</p>
                        <p className="text-xl font-bold text-emerald-600">{formatCurrency(totals.capital)}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Disbursed</p>
                        <p className="text-xl font-bold text-red-600">{formatCurrency(totals.spent)}</p>
                    </div>
                </div>
            </div>

            {/* ── Header ──────────────────────────────────── */}
            <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Accounts</h3>
                <button onClick={openAdd}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--t-primary)] text-white rounded-xl font-bold text-xs hover:opacity-90 transition-all">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/></svg>
                    Add Account
                </button>
            </div>

            {/* ── Account list ─────────────────────────────── */}
            {funding.length === 0 ? (
                <div className="py-14 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 bg-slate-50">
                    <p className="font-medium">No accounts found.</p>
                    <p className="text-[10px] mt-1 uppercase tracking-widest">Click 'Add Account' to begin</p>
                </div>
            ) : (
                <div className="space-y-2">
                {funding.map(f => {
                    const cfg  = TYPE_CONFIG[f.source_type] || TYPE_CONFIG.OTHER;
                    const alloc = Number(f.total_credited ?? f.amount ?? 0);
                    const spent = Number(f.total_debited ?? 0);
                    const bal   = Number(f.current_balance ?? 0);
                    const pct   = alloc > 0 ? Math.min(100, Math.max(0, (bal / alloc) * 100)) : 0;
                    const overdwn = bal < 0;

                    return (
                        <div key={f.id} className="bg-white border border-slate-200 rounded-lg hover:border-indigo-200 transition-all group">
                            <div className="px-5 py-4 flex items-center justify-between gap-6">
                                {/* Left: Account Profile */}
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0 border border-slate-100 bg-slate-50"
                                         style={{ color: cfg.accent }}>
                                        {cfg.icon}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-slate-900 truncate">{f.name}</p>
                                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-slate-100 bg-slate-50 text-slate-500 uppercase tracking-tighter">
                                                {f.source_type}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                                            Received {new Date(f.received_date).toLocaleDateString()} • {f.interest_rate || 0}% Interest
                                        </p>
                                    </div>
                                </div>

                                {/* Middle: Mini Progress */}
                                <div className="hidden lg:flex flex-col items-center gap-1.5 w-32">
                                    <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full transition-all duration-700 ${overdwn ? 'bg-red-500' : 'bg-emerald-500'}`} 
                                             style={{ width: `${overdwn ? 100 : pct}%` }} />
                                    </div>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase">{overdwn ? 'Overdrawn' : `${Math.round(pct)}% Used`}</span>
                                </div>

                                {/* Right: Balance & Primary Actions */}
                                <div className="flex items-center gap-8">
                                    <div className="text-right">
                                        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Current Balance</p>
                                        <p className={`text-base font-bold ${overdwn ? 'text-red-600' : 'text-slate-900'}`}>
                                            {formatCurrency(bal)}
                                        </p>
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => setStatementSrc(f)}
                                            className="px-4 py-2 rounded-lg text-xs font-bold text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors">
                                            Statement
                                        </button>
                                        <button onClick={() => openDeposit(f)}
                                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors shadow-sm">
                                            Deposit
                                        </button>
                                        
                                        {/* Row Dropdown (simplified as a compact button group for reliability) */}
                                        <div className="h-8 w-px bg-slate-100 mx-1" />
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => handleSync(f.id)} className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all" title="Sync Balance">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                                            </button>
                                            <button onClick={() => openEdit(f)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                                            </button>
                                            <button onClick={() => handleDelete(f.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
                </div>
            )}

            {/* ══ STATEMENT MODAL ══════════════════════════════════ */}
            <Modal isOpen={!!statementSrc} onClose={() => setStatementSrc(null)}
                title={`Statement — ${statementSrc?.name}`} maxWidth="max-w-2xl">
                {statementSrc && (() => {
                    const ledger  = buildLedger(statementSrc);
                    const balance = Number(statementSrc.current_balance ?? 0);
                    const alloc   = Number(statementSrc.total_credited ?? statementSrc.amount ?? 0);
                    const spent   = Number(statementSrc.total_debited ?? 0);
                    return (
                        <div className="space-y-4">
                            {/* Summary chips */}
                            <div className="grid grid-cols-3 gap-4">
                                {[
                                    { label: 'Total Deposited', value: alloc,    clr: 'text-emerald-600' },
                                    { label: 'Total Spent',     value: spent,    clr: 'text-red-600'     },
                                    { label: 'Balance',         value: balance,  clr: balance < 0 ? 'text-red-600' : 'text-indigo-600' },
                                ].map(({ label, value, clr }) => (
                                    <div key={label} className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
                                        <p className={`text-sm font-bold mt-1.5 ${clr}`}>{value < 0 ? '−' : ''}{formatCurrency(Math.abs(value))}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Ledger */}
                            <div className="max-h-[50vh] overflow-y-auto rounded-xl border border-[var(--t-border)] overflow-hidden">
                                <table className="w-full text-left text-xs">
                                    <thead className="sticky top-0 bg-slate-50 z-10">
                                        <tr className="border-b border-slate-200">
                                            <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Date</th>
                                            <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Transaction Details</th>
                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-emerald-600 text-right">Credit</th>
                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-red-600 text-right">Debit</th>
                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-900 text-right">Balance</th>
                                            <th className="px-2 py-3"/>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--t-border)]">
                                        {ledger.length === 0 ? (
                                            <tr><td colSpan={6} className="py-10 text-center text-[var(--t-text3)] italic">No transactions yet.</td></tr>
                                        ) : ledger.map((t, i) => {
                                            const isCredit = t.transaction_type === 'CREDIT';
                                            const balNeg   = t.running < 0;
                                            return (
                                                <tr key={t.id ?? i} className="hover:bg-slate-50 transition-colors group">
                                                    <td className="px-3 py-3 font-medium text-slate-500 whitespace-nowrap">
                                                        {new Date(t.date).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'2-digit' })}
                                                    </td>
                                                    <td className="px-3 py-3">
                                                        <div className="flex items-center gap-3">
                                                            <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[8px] font-bold ${isCredit ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                                                {isCredit ? 'C' : 'D'}
                                                            </span>
                                                            <span className="text-slate-700 font-medium">{t.description}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-bold text-emerald-600">
                                                        {isCredit ? formatCurrency(t.amount) : ''}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-bold text-red-600">
                                                        {!isCredit ? formatCurrency(t.amount) : ''}
                                                    </td>
                                                    <td className={`px-4 py-3 text-right font-bold ${balNeg ? 'text-red-600' : 'text-slate-900'}`}>
                                                        {balNeg ? '−' : ''}{formatCurrency(Math.abs(t.running))}
                                                    </td>
                                                    <td className="px-2 py-2.5 text-right">
                                                        {!t.payment ? (
                                                            <button onClick={() => handleDeleteTxn(t)}
                                                                className="opacity-0 group-hover:opacity-100 text-[9px] text-red-500 hover:underline transition-opacity font-bold">
                                                                Del
                                                            </button>
                                                        ) : t.expense_id ? (
                                                            <button onClick={() => { setSelectedExpenseId(t.expense_id); setIsExpenseDetailOpen(true); }}
                                                                className="opacity-0 group-hover:opacity-100 text-[9px] text-[var(--t-primary)] hover:underline transition-opacity font-bold">
                                                                View
                                                            </button>
                                                        ) : null}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex justify-between items-center bg-slate-50 -mx-6 -mb-6 px-6 py-4 border-t border-slate-200">
                                <div className="flex items-center gap-4">
                                    <button onClick={() => window.print()}
                                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold text-slate-500 hover:text-indigo-600 hover:bg-white border border-transparent hover:border-slate-200 transition-all uppercase tracking-wider">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
                                        Print Statement
                                    </button>
                                    <p className="text-[9px] text-slate-400 uppercase tracking-tight">C=Deposit · D=Debit</p>
                                </div>
                                <button onClick={() => { setStatementSrc(null); openDeposit(statementSrc); }}
                                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold text-xs hover:bg-emerald-700 shadow-sm transition-all">
                                    + Deposit Funds
                                </button>
                            </div>
                        </div>
                    );
                })()}
            </Modal>

            {/* ══ DEPOSIT MODAL ════════════════════════════════════ */}
            <Modal isOpen={depositOpen} onClose={() => setDepositOpen(false)}
                title={`Deposit to ${activeSource?.name}`}>
                <form onSubmit={handleDeposit} className="space-y-4">
                    {/* Current balance display */}
                    <div className="flex items-center justify-between bg-[var(--t-surface2)] border border-[var(--t-border)] rounded-xl px-4 py-3">
                        <span className="text-xs font-bold text-[var(--t-text3)] uppercase tracking-widest">Current Balance</span>
                        <span className="font-black text-[var(--t-primary)]">{formatCurrency(activeSource?.current_balance ?? 0)}</span>
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-[var(--t-text3)] mb-1.5">Amount (Rs.)</label>
                        <input type="number" min="1" step="1" value={depositForm.amount}
                            onChange={e => setDepositForm({ ...depositForm, amount: e.target.value })}
                            className="w-full rounded-xl border border-[var(--t-border)] bg-[var(--t-surface)] p-3 text-2xl font-black text-[var(--t-primary)] font-mono outline-none focus:border-[var(--t-primary)] transition-colors"
                            placeholder="0" required autoFocus/>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-[var(--t-text3)] mb-1.5">Date</label>
                            <input type="date" value={depositForm.date}
                                onChange={e => setDepositForm({ ...depositForm, date: e.target.value })}
                                className="w-full rounded-xl border border-[var(--t-border)] bg-[var(--t-surface)] p-3 outline-none focus:border-[var(--t-primary)] transition-colors" required/>
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-[var(--t-text3)] mb-1.5">Narration</label>
                            <input type="text" value={depositForm.description}
                                onChange={e => setDepositForm({ ...depositForm, description: e.target.value })}
                                className="w-full rounded-xl border border-[var(--t-border)] bg-[var(--t-surface)] p-3 outline-none focus:border-[var(--t-primary)] transition-colors"
                                placeholder="e.g. Cheque deposit"/>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={() => setDepositOpen(false)}
                            className="px-5 py-2.5 font-bold text-slate-500 rounded-xl hover:bg-slate-50 transition-colors text-xs uppercase tracking-wider">Cancel</button>
                        <button type="submit" disabled={loading}
                            className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md text-xs uppercase tracking-widest">
                            {loading ? 'Processing...' : 'Confirm Deposit'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* ══ ADD / EDIT ACCOUNT MODAL ═════════════════════════ */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}
                title={editingItem ? 'Edit Account' : 'Add Funding Account'}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-xs font-bold uppercase tracking-widest text-[var(--t-text3)] mb-1.5">Account Name</label>
                            <input type="text" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full rounded-xl border border-[var(--t-border)] bg-[var(--t-surface)] p-3 outline-none focus:border-[var(--t-primary)] transition-colors"
                                placeholder="e.g. Nabil Bank Loan" required/>
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-[var(--t-text3)] mb-1.5">Type</label>
                            <select value={formData.source_type || 'OWN_MONEY'} onChange={e => setFormData({ ...formData, source_type: e.target.value })}
                                className="w-full rounded-xl border border-[var(--t-border)] bg-[var(--t-surface)] p-3 outline-none appearance-none focus:border-[var(--t-primary)] transition-colors" required>
                                <option value="OWN_MONEY">💰 Personal Savings</option>
                                <option value="LOAN">🏦 Bank Loan</option>
                                <option value="BORROWED">🤝 Borrowed</option>
                                <option value="OTHER">📁 Other</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-[var(--t-text3)] mb-1.5">Initial Amount (Rs.)</label>
                            <input type="number" value={formData.amount || ''} onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                className="w-full rounded-xl border border-[var(--t-border)] bg-[var(--t-surface)] p-3 outline-none font-mono font-bold focus:border-[var(--t-primary)] transition-colors"
                                placeholder="0" required/>
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-[var(--t-text3)] mb-1.5">Interest Rate (% p.a.)</label>
                            <input type="number" step="0.01" value={formData.interest_rate || 0} onChange={e => setFormData({ ...formData, interest_rate: e.target.value })}
                                className="w-full rounded-xl border border-[var(--t-border)] bg-[var(--t-surface)] p-3 outline-none focus:border-[var(--t-primary)] transition-colors disabled:opacity-40"
                                placeholder="0.00" disabled={formData.source_type === 'OWN_MONEY'}/>
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-[var(--t-text3)] mb-1.5">Date Received</label>
                            <input type="date" value={formData.received_date || ''} onChange={e => setFormData({ ...formData, received_date: e.target.value })}
                                className="w-full rounded-xl border border-[var(--t-border)] bg-[var(--t-surface)] p-3 outline-none focus:border-[var(--t-primary)] transition-colors" required/>
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-[var(--t-text3)] mb-1.5">Payment Method</label>
                            <select value={formData.default_payment_method || 'CASH'} onChange={e => setFormData({ ...formData, default_payment_method: e.target.value })}
                                className="w-full rounded-xl border border-[var(--t-border)] bg-[var(--t-surface)] p-3 outline-none appearance-none focus:border-[var(--t-primary)] transition-colors" required>
                                <option value="CASH">💵 Cash</option>
                                <option value="BANK_TRANSFER">🏦 Bank Transfer</option>
                                <option value="CHECK">📜 Cheque</option>
                                <option value="UPI">📱 eSewa / Khalti</option>
                            </select>
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-bold uppercase tracking-widest text-[var(--t-text3)] mb-1.5">Notes</label>
                            <textarea value={formData.notes || ''} onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                className="w-full rounded-xl border border-[var(--t-border)] bg-[var(--t-surface)] p-3 outline-none resize-none focus:border-[var(--t-primary)] transition-colors"
                                rows="2" placeholder="Repayment terms, EMI details..."/>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-1">
                        <button type="button" onClick={() => setIsModalOpen(false)}
                            className="px-5 py-2.5 font-bold text-[var(--t-text2)] rounded-xl bg-[var(--t-surface3)] hover:bg-[var(--t-surface2)] transition-colors">Cancel</button>
                        <button type="submit" disabled={loading}
                            className="px-6 py-2.5 bg-[var(--t-primary)] text-white rounded-xl font-black hover:opacity-90 disabled:opacity-50 transition-all">
                            {loading ? 'Saving...' : editingItem ? 'Update' : 'Add Account'}
                        </button>
                    </div>
                </form>
            </Modal>

            <ConfirmModal isOpen={confirmConfig.isOpen} title={confirmConfig.title}
                message={confirmConfig.message} confirmText={confirmConfig.confirmText}
                onConfirm={confirmConfig.onConfirm} onCancel={closeConfirm}
                type={confirmConfig.type || 'warning'}/>

            <ExpenseDetailModal isOpen={isExpenseDetailOpen}
                onClose={() => setIsExpenseDetailOpen(false)} expenseId={selectedExpenseId}/>
        </div>
    );
};

export default FundingTab;
