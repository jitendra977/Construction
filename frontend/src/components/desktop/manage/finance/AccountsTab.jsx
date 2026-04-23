import React, { useState, useEffect } from 'react';
import { financeService } from '../../../../services/api';
import AccountFormModal from './AccountFormModal';
import BankTransferModal from './BankTransferModal';
import { useConstruction } from '../../../../context/ConstructionContext';
import FundingTab from '../FundingTab';

/* -------------------------------------------------------------------------- */
/* Type config — plain English labels + colours + icons                        */
/* -------------------------------------------------------------------------- */
const TYPE_CONFIG = {
    ASSET: {
        label: 'Cash & Bank Accounts',
        sublabel: 'Money you currently have — in hand or in the bank',
        icon: '🏦',
        color: 'emerald',
        borderClass: 'border-emerald-500/30',
        bgClass: 'bg-emerald-500/5',
        badgeClass: 'bg-emerald-500/10 text-emerald-700',
        balanceClass: 'text-emerald-600',
    },
    LIABILITY: {
        label: 'Liabilities — What You Owe',
        sublabel: 'Accounts Payable, outstanding loans, and credit from vendors',
        icon: '📋',
        color: 'rose',
        borderClass: 'border-rose-500/30',
        bgClass: 'bg-rose-500/5',
        badgeClass: 'bg-rose-500/10 text-rose-700',
        balanceClass: 'text-rose-600',
    },
    EQUITY: {
        label: 'Owner Capital',
        sublabel: 'Your personal investment and retained earnings in the project',
        icon: '🏛️',
        color: 'violet',
        borderClass: 'border-violet-500/30',
        bgClass: 'bg-violet-500/5',
        badgeClass: 'bg-violet-500/10 text-violet-700',
        balanceClass: 'text-violet-600',
    },
    REVENUE: {
        label: 'Income / Revenue',
        sublabel: 'Money received — from clients, grants, or project income',
        icon: '💹',
        color: 'sky',
        borderClass: 'border-sky-500/30',
        bgClass: 'bg-sky-500/5',
        badgeClass: 'bg-sky-500/10 text-sky-700',
        balanceClass: 'text-sky-600',
    },
    EXPENSE: {
        label: 'Expense Accounts',
        sublabel: 'Categories of costs: materials, labour, permits, overheads',
        icon: '📦',
        color: 'amber',
        borderClass: 'border-amber-500/30',
        bgClass: 'bg-amber-500/5',
        badgeClass: 'bg-amber-500/10 text-amber-700',
        balanceClass: 'text-amber-700',
    },
};

const TYPE_ORDER = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'];

/* -------------------------------------------------------------------------- */
/* AccountCard                                                                 */
/* -------------------------------------------------------------------------- */
const AccountCard = ({ account, cfg, onEdit, t }) => {
    const { formatCurrency } = useConstruction();
    const balance = parseFloat(account.balance || 0);
    const isNegative = balance < 0;
    const projectBalance = account.linked_funding_source_balance;

    return (
        <div className={`bg-[var(--t-surface)] rounded-2xl border ${cfg.borderClass} p-5 hover:shadow-md transition-all group`}>
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-md tracking-wider ${cfg.badgeClass}`}>
                        {account.code}
                    </span>
                    {!account.is_active && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 bg-[var(--t-surface2)] text-[var(--t-text3)] rounded-md uppercase tracking-wide">
                            Inactive
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${account.is_active ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]' : 'bg-[var(--t-border)]'}`} />
                    <button onClick={() => onEdit(account)} className="p-1.5 text-[var(--t-text3)] hover:text-[var(--t-primary)] hover:bg-[var(--t-primary)]/10 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </button>
                </div>
            </div>

            {/* Name + description */}
            <h4 className="font-black text-[var(--t-text)] text-base leading-tight mb-1 truncate">{account.name}</h4>
            
            {account.linked_funding_source_name && (
                <div className="mb-4">
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-indigo-50/50 border border-indigo-100/50 w-fit">
                        <span className="text-[8px] font-black tracking-[0.1em] text-indigo-400 uppercase">{t.source}:</span>
                        <span className="text-[9px] font-bold text-indigo-600 truncate max-w-[120px]">
                            {account.linked_funding_source_name}
                        </span>
                    </div>
                    {projectBalance !== null && (
                        <div className="mt-1 ml-1 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                            <p className="text-[10px] font-bold text-[var(--t-text3)]">
                                {t.alloc}: <span className="text-indigo-600 font-black">{formatCurrency(projectBalance)}</span>
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Balance */}
            <div className={`pt-3 border-t ${cfg.borderClass} flex justify-between items-center`}>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--t-text3)]">{t.bal}</span>
                <span className={`text-lg font-black font-mono ${isNegative ? 'text-rose-500' : cfg.balanceClass}`}>
                    {formatCurrency(balance)}
                </span>
            </div>
        </div>
    );
};

/* -------------------------------------------------------------------------- */
/* AccountsTab                                                                 */
/* -------------------------------------------------------------------------- */
const AccountsTab = ({ searchQuery }) => {
    const { formatCurrency } = useConstruction();
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState(null);
    const [lang, setLang] = useState('en'); // 'en' or 'np'

    const t = {
        en: {
            cash: "Total Cash & Bank",
            liab: "Outstanding Liabilities",
            net: "Net Position",
            code: "Code",
            bal: "Current Balance",
            alloc: "Allocated to Project",
            source: "Capital Source",
            new: "+ New Account",
            move: "⇄ Move Money",
            search: "Search accounts...",
        },
        np: {
            cash: "कुल नगद र बैंक (Total Cash)",
            liab: "बाँकी दायित्व (Total Liabilities)",
            net: "खुद स्थिति (Net Position)",
            code: "कोड",
            bal: "हालको मौज्दात (Current Balance)",
            alloc: "आयोजनाका लागि विनियोजित",
            source: "पुँजीको स्रोत (Capital Source)",
            new: "+ नयाँ खाता थप्नुहोस्",
            move: "⇄ रकम स्थानान्तरण",
            search: "खाता खोज्नुहोस्...",
        }
    }[lang];

    const fetchAccounts = async () => {
        setLoading(true);
        try {
            const res = await financeService.getAccounts();
            setAccounts(res.data);
        } catch (err) {
            console.error('Error fetching accounts', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAccounts(); }, []);

    const filtered = accounts.filter(a =>
        (a.name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (a.code?.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const grouped = filtered.reduce((acc, cur) => {
        const type = cur.account_type || 'EXPENSE';
        if (!acc[type]) acc[type] = [];
        acc[type].push(cur);
        return acc;
    }, {});

    /* Total asset vs liability for a quick balance bar */
    const totalAssets = accounts.filter(a => a.account_type === 'ASSET').reduce((s, a) => s + parseFloat(a.balance || 0), 0);
    const totalLiabilities = accounts.filter(a => a.account_type === 'LIABILITY').reduce((s, a) => s + parseFloat(a.balance || 0), 0);

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 border-4 border-[var(--t-primary)] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-[var(--t-text3)]">Loading chart of accounts…</p>
        </div>
    );

    return (
        <div className="space-y-8">
            {/* Header with Search & Actions */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-2">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="flex bg-[var(--t-surface2)] p-1 rounded-xl border border-[var(--t-border)]">
                        <button onClick={() => setLang('en')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${lang === 'en' ? 'bg-[var(--t-primary)] text-white shadow-sm' : 'text-[var(--t-text3)] hover:text-[var(--t-text)]'}`}>EN</button>
                        <button onClick={() => setLang('np')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${lang === 'np' ? 'bg-[var(--t-primary)] text-white shadow-sm' : 'text-[var(--t-text3)] hover:text-[var(--t-text)]'}`}>नेपाली</button>
                    </div>
                    <div className="relative flex-1 md:w-64">
                        <span className="absolute left-3 top-2.5 opacity-40">🔍</span>
                        <input
                            type="text"
                            placeholder={t.search}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[var(--t-surface)] border border-[var(--t-border)] pl-9 pr-4 py-2 rounded-xl text-sm font-bold focus:border-[var(--t-primary)] outline-none transition-all"
                        />
                    </div>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <button
                        onClick={() => setIsTransferModalOpen(true)}
                        className="px-4 py-2 bg-[var(--t-surface2)] text-[var(--t-text)] border border-[var(--t-border)] rounded-xl text-sm font-bold hover:bg-[var(--t-border)] transition-colors flex items-center gap-2"
                    >
                        {t.move}
                    </button>
                    <button
                        onClick={() => { setEditingAccount(null); setIsAccountModalOpen(true); }}
                        className="px-4 py-2 bg-[var(--t-primary)] text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity flex items-center gap-2"
                    >
                        {t.new}
                    </button>
                </div>
            </div>

            {/* ── Quick health bar ── */}
            {(totalAssets !== 0 || totalLiabilities !== 0) && (
                <div className="bg-[var(--t-surface)] rounded-2xl border border-[var(--t-border)] p-5 flex flex-col sm:flex-row gap-6">
                    <div className="flex-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--t-text3)] mb-1">{t.cash}</p>
                        <p className={`text-2xl font-black ${totalAssets >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {formatCurrency(totalAssets)}
                        </p>
                    </div>
                    <div className="flex-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--t-text3)] mb-1">{t.liab}</p>
                        <p className="text-2xl font-black text-rose-600">
                            {formatCurrency(totalLiabilities)}
                        </p>
                    </div>
                    <div className="flex-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--t-text3)] mb-1">{t.net}</p>
                        <p className={`text-2xl font-black ${totalAssets - totalLiabilities >= 0 ? 'text-[var(--t-text)]' : 'text-rose-600'}`}>
                            {formatCurrency(totalAssets - totalLiabilities)}
                        </p>
                    </div>
                </div>
            )}
            
            {/* ── Account groups ── */}
            {TYPE_ORDER.map(type => {
                const list = grouped[type];
                if (!list || list.length === 0) return null;
                const cfg = TYPE_CONFIG[type];
                return (
                    <div key={type} className="space-y-3">
                        {/* Section header */}
                        <div className={`flex items-center gap-3 p-3 rounded-xl ${cfg.bgClass} border ${cfg.borderClass}`}>
                            <span className="text-xl">{cfg.icon}</span>
                            <div>
                                <h3 className="text-sm font-black text-[var(--t-text)]">{cfg.label}</h3>
                                <p className="text-[11px] text-[var(--t-text3)]">{cfg.sublabel}</p>
                            </div>
                            <span className={`ml-auto text-xs font-bold px-2.5 py-1 rounded-full ${cfg.badgeClass}`}>
                                {list.length} account{list.length !== 1 ? 's' : ''}
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {list.map(account => (
                                <AccountCard key={account.id} account={account} cfg={cfg} onEdit={(acc) => { setEditingAccount(acc); setIsAccountModalOpen(true); }} t={t} />
                            ))}
                        </div>
                    </div>
                );
            })}

            {/* ── Empty state ── */}
            {filtered.length === 0 && (
                <div className="text-center py-20 bg-[var(--t-surface2)]/30 border-2 border-dashed border-[var(--t-border)] rounded-2xl">
                    <div className="text-5xl mb-4 opacity-20">📂</div>
                    <h3 className="font-black text-[var(--t-text2)] text-lg">No Accounts Found</h3>
                    <p className="text-sm text-[var(--t-text3)] mt-1">
                        {searchQuery ? 'Try a different search term.' : 'Click "+ New Account" to create your first ledger account.'}
                    </p>
                </div>
            )}

            <AccountFormModal
                isOpen={isAccountModalOpen}
                onClose={() => { setIsAccountModalOpen(false); setEditingAccount(null); fetchAccounts(); }}
                account={editingAccount}
            />
            <BankTransferModal
                isOpen={isTransferModalOpen}
                onClose={() => { setIsTransferModalOpen(false); fetchAccounts(); }}
                accounts={accounts.filter(a => a.account_type === 'ASSET')}
            />

            <div className="mt-16 pt-8 border-t-2 border-dashed border-[var(--t-border)]">
                <FundingTab />
            </div>
        </div>
    );
};

export default AccountsTab;
