import React, { useState, useEffect } from 'react';
import { accountingService } from '../../../services/api';

const fmt = (v) => 'NPR ' + Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

const TYPE_COLORS = {
    ASSET: 'bg-blue-100 text-blue-700',
    LIABILITY: 'bg-red-100 text-red-700',
    EQUITY: 'bg-purple-100 text-purple-700',
    REVENUE: 'bg-emerald-100 text-emerald-700',
    EXPENSE: 'bg-orange-100 text-orange-700',
};
const TYPE_ORDER = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'];

const LedgerTab = ({ projectId }) => {
    const [journals, setJournals] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [expanded, setExpanded] = useState(null);
    const [acctView, setAcctView] = useState('all');

    const labels = {
        en: {
            journalTitle: 'Journal Entries',
            journalDesc: 'All recorded accounting transactions',
            accountsTitle: 'Account Balances',
            accountsDesc: 'Chart of accounts with current balances',
            date: 'Date', description: 'Description', source: 'Source', lines: 'Lines',
            debit: 'Debit', credit: 'Credit', account: 'Account',
            code: 'Code', name: 'Name', type: 'Type', balance: 'Balance',
            all: 'All',
            noJournals: 'No journal entries found.',
            noAccounts: 'No accounts found.',
            clickExpand: 'Click a row to view lines',
        },
        np: {
            journalTitle: 'जर्नल प्रविष्टिहरू',
            journalDesc: 'सबै दर्ता गरिएका लेखा कारोबार',
            accountsTitle: 'खाता मौज्दात',
            accountsDesc: 'सबै खाताहरूको अद्यावधिक मौज्दात',
            date: 'मिति', description: 'विवरण', source: 'स्रोत', lines: 'लाइन',
            debit: 'डेबिट', credit: 'क्रेडिट', account: 'खाता',
            code: 'कोड', name: 'नाम', type: 'प्रकार', balance: 'मौज्दात',
            all: 'सबै',
            noJournals: 'कुनै जर्नल प्रविष्टि छैन।',
            noAccounts: 'कुनै खाता फेला परेन।',
            clickExpand: 'लाइन हेर्न पङ्क्ति थिच्नुहोस्',
        },
    }.en;

    useEffect(() => {
        setLoading(true);
        setError(null);
        Promise.all([
            accountingService.getJournalEntries(),
            accountingService.getAccounts(),
        ])
            .then(([jRes, aRes]) => {
                setJournals(Array.isArray(jRes.data) ? jRes.data : []);
                setAccounts(Array.isArray(aRes.data) ? aRes.data : []);
            })
            .catch(err => { setError('Failed to load ledger data.'); console.error(err); })
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="p-10 text-center text-[var(--t-text3)] text-sm">Loading ledger...</div>;
    if (error) return <div className="p-10 text-center text-red-500 text-sm">{error}</div>;

    const grouped = accounts.reduce((acc, a) => {
        if (!acc[a.account_type]) acc[a.account_type] = [];
        acc[a.account_type].push(a);
        return acc;
    }, {});

    const filteredAccts = acctView === 'all'
        ? accounts
        : accounts.filter(a => a.account_type === acctView);

    return (
        <div className="space-y-8">
            {/* Journal Entries */}
            <section>
                <div className="mb-4">
                    <h3 className="text-base font-black text-[var(--t-text)]">{labels.journalTitle}</h3>
                    <p className="text-sm text-[var(--t-text3)]">{labels.journalDesc} — <span className="italic">{labels.clickExpand}</span></p>
                </div>

                {journals.length === 0 ? (
                    <div className="p-8 border-2 border-dashed border-[var(--t-border)] rounded-xl text-center text-[var(--t-text3)] text-sm">{labels.noJournals}</div>
                ) : (
                    <div className="bg-[var(--t-surface)] border border-[var(--t-border)] rounded-xl shadow-sm overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[var(--t-surface2)] border-b border-[var(--t-border)]">
                                    <th className="px-4 py-3 text-xs font-black uppercase tracking-wider text-[var(--t-text3)]">{labels.date}</th>
                                    <th className="px-4 py-3 text-xs font-black uppercase tracking-wider text-[var(--t-text3)]">{labels.description}</th>
                                    <th className="px-4 py-3 text-xs font-black uppercase tracking-wider text-[var(--t-text3)]">{labels.source}</th>
                                    <th className="px-4 py-3 text-xs font-black uppercase tracking-wider text-right text-[var(--t-text3)]">{labels.lines}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {journals.map((j, i) => (
                                    <React.Fragment key={j.id || i}>
                                        <tr
                                            className={`border-b border-[var(--t-border)] cursor-pointer transition-colors ${expanded === (j.id || i) ? 'bg-[var(--t-surface2)]' : 'hover:bg-[var(--t-surface2)]'}`}
                                            onClick={() => setExpanded(prev => prev === (j.id || i) ? null : (j.id || i))}
                                        >
                                            <td className="px-4 py-3 text-sm font-mono text-[var(--t-text2)]">{j.date}</td>
                                            <td className="px-4 py-3 text-sm font-semibold text-[var(--t-text)]">{j.description}</td>
                                            <td className="px-4 py-3 text-xs font-mono text-[var(--t-text3)]">{j.source_document || '—'}</td>
                                            <td className="px-4 py-3 text-right">
                                                <span className="inline-flex items-center gap-1 text-xs font-bold text-[var(--t-text3)]">
                                                    {(j.lines || []).length}
                                                    <span className={`transition-transform ${expanded === (j.id || i) ? 'rotate-90' : ''}`}>›</span>
                                                </span>
                                            </td>
                                        </tr>
                                        {expanded === (j.id || i) && (j.lines || []).length > 0 && (
                                            <tr className="border-b border-[var(--t-border)] bg-[var(--t-surface2)]">
                                                <td colSpan={4} className="px-6 py-3">
                                                    <table className="w-full text-left border-collapse text-xs">
                                                        <thead>
                                                            <tr className="border-b border-[var(--t-border)]">
                                                                <th className="py-2 pr-4 font-black uppercase tracking-wider text-[var(--t-text3)]">{labels.account}</th>
                                                                <th className="py-2 pr-4 font-black uppercase tracking-wider text-[var(--t-text3)]">Type</th>
                                                                <th className="py-2 font-black uppercase tracking-wider text-right text-[var(--t-text3)]">Amount</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-[var(--t-border)]">
                                                            {j.lines.map((ln, li) => (
                                                                <tr key={li}>
                                                                    <td className="py-2 pr-4 text-[var(--t-text)]">{ln.account_name}</td>
                                                                    <td className="py-2 pr-4">
                                                                        <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] uppercase ${ln.entry_type === 'DEBIT' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                                            {ln.entry_type}
                                                                        </span>
                                                                    </td>
                                                                    <td className={`py-2 font-bold text-right ${ln.entry_type === 'DEBIT' ? 'text-blue-700' : 'text-emerald-700'}`}>
                                                                        {fmt(ln.amount)}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {/* Account Balances */}
            <section>
                <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
                    <div>
                        <h3 className="text-base font-black text-[var(--t-text)]">{labels.accountsTitle}</h3>
                        <p className="text-sm text-[var(--t-text3)]">{labels.accountsDesc}</p>
                    </div>
                    <div className="flex flex-wrap gap-1 p-1 bg-[var(--t-surface2)] rounded-xl border border-[var(--t-border)]">
                        <button onClick={() => setAcctView('all')} className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${acctView === 'all' ? 'bg-[var(--t-surface)] text-[var(--t-text)] shadow-sm' : 'text-[var(--t-text3)]'}`}>
                            {labels.all}
                        </button>
                        {TYPE_ORDER.filter(t => grouped[t]?.length > 0).map(t => (
                            <button key={t} onClick={() => setAcctView(t)} className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${acctView === t ? 'bg-[var(--t-surface)] text-[var(--t-text)] shadow-sm' : 'text-[var(--t-text3)]'}`}>
                                {t}
                            </button>
                        ))}
                    </div>
                </div>

                {filteredAccts.length === 0 ? (
                    <div className="p-8 border-2 border-dashed border-[var(--t-border)] rounded-xl text-center text-[var(--t-text3)] text-sm">{labels.noAccounts}</div>
                ) : (
                    <div className="bg-[var(--t-surface)] border border-[var(--t-border)] rounded-xl shadow-sm overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[var(--t-surface2)] border-b border-[var(--t-border)]">
                                    <th className="px-4 py-3 text-xs font-black uppercase tracking-wider text-[var(--t-text3)]">{labels.code}</th>
                                    <th className="px-4 py-3 text-xs font-black uppercase tracking-wider text-[var(--t-text3)]">{labels.name}</th>
                                    <th className="px-4 py-3 text-xs font-black uppercase tracking-wider text-[var(--t-text3)]">{labels.type}</th>
                                    <th className="px-4 py-3 text-xs font-black uppercase tracking-wider text-right text-[var(--t-text3)]">{labels.balance}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--t-border)]">
                                {filteredAccts.map(a => (
                                    <tr key={a.id} className="hover:bg-[var(--t-surface2)] transition-colors">
                                        <td className="px-4 py-3 text-xs font-mono font-bold text-[var(--t-text3)] w-16">{a.code}</td>
                                        <td className="px-4 py-3 text-sm font-semibold text-[var(--t-text)]">{a.name}</td>
                                        <td className="px-4 py-3">
                                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${TYPE_COLORS[a.account_type] || 'bg-gray-100 text-gray-600'}`}>
                                                {a.account_type}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm font-bold text-right text-[var(--t-text)]">{fmt(a.balance)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
};

export default LedgerTab;
