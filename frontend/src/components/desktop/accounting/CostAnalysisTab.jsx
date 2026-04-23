import React, { useState, useEffect } from 'react';
import { accountingService } from '../../../services/accountingService';

const fmt = (v) => 'NPR ' + Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

const CostAnalysisTab = ({ lang, projectId }) => {
    const [accounts, setAccounts] = useState([]);
    const [bills, setBills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const labels = {
        en: {
            title: 'Cost Analysis',
            desc: 'Spending breakdown by vendor and expense category',
            byVendor: 'Top Vendors by Spend',
            byCategory: 'Expense Accounts (5xxx)',
            vendor: 'Vendor', total: 'Total Billed', bills: 'Bills',
            account: 'Account', code: 'Code', type: 'Type', balance: 'Balance',
            noData: 'No cost data available.',
        },
        np: {
            title: 'लागत विश्लेषण',
            desc: 'सप्लायर र खर्च वर्ग अनुसार खर्चको विवरण',
            byVendor: 'सप्लायर अनुसार खर्च (शीर्ष)',
            byCategory: 'खर्च खाताहरू (5xxx)',
            vendor: 'सप्लायर', total: 'कुल बिल', bills: 'बिल संख्या',
            account: 'खाता', code: 'कोड', type: 'प्रकार', balance: 'मौज्दात',
            noData: 'लागत डेटा उपलब्ध छैन।',
        },
    }[lang];

    useEffect(() => {
        setLoading(true);
        setError(null);
        const acctP = accountingService.getAccounts().then(r => setAccounts(Array.isArray(r.data) ? r.data : []));
        const billsP = projectId
            ? accountingService.getBills(projectId).then(r => setBills(Array.isArray(r.data) ? r.data : []))
            : Promise.resolve();
        Promise.all([acctP, billsP])
            .catch(err => { setError('Failed to load cost analysis.'); console.error(err); })
            .finally(() => setLoading(false));
    }, [projectId]);

    if (loading) return <div className="p-10 text-center text-[var(--t-text3)] text-sm">Loading cost analysis...</div>;
    if (error) return <div className="p-10 text-center text-red-500 text-sm">{error}</div>;

    // Group bills by vendor
    const vendorMap = {};
    bills.forEach(b => {
        const key = b.vendor_name || 'Unknown';
        if (!vendorMap[key]) vendorMap[key] = { total: 0, count: 0 };
        vendorMap[key].total += Number(b.amount || 0);
        vendorMap[key].count += 1;
    });
    const topVendors = Object.entries(vendorMap)
        .map(([name, d]) => ({ name, ...d }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

    const maxVendorTotal = topVendors.length > 0 ? topVendors[0].total : 1;

    // Expense accounts: code starts with 5
    const expenseAccounts = accounts
        .filter(a => String(a.code).startsWith('5'))
        .sort((a, b) => Number(b.balance || 0) - Number(a.balance || 0))
        .slice(0, 5);

    const maxAcctBalance = expenseAccounts.length > 0 ? Number(expenseAccounts[0].balance || 0) : 1;

    const totalBilled = bills.reduce((s, b) => s + Number(b.amount || 0), 0);

    return (
        <div className="space-y-8">
            <div>
                <h3 className="text-base font-black text-[var(--t-text)]">{labels.title}</h3>
                <p className="text-sm text-[var(--t-text3)]">{labels.desc}</p>
            </div>

            {/* Summary strip */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="bg-[var(--t-surface)] border border-[var(--t-border)] rounded-xl shadow-sm p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-[var(--t-text3)] mb-1">Total Billed</p>
                    <p className="text-xl font-black text-[var(--t-text)]">{fmt(totalBilled)}</p>
                </div>
                <div className="bg-[var(--t-surface)] border border-[var(--t-border)] rounded-xl shadow-sm p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-[var(--t-text3)] mb-1">Vendors</p>
                    <p className="text-xl font-black text-[var(--t-text)]">{Object.keys(vendorMap).length}</p>
                </div>
                <div className="bg-[var(--t-surface)] border border-[var(--t-border)] rounded-xl shadow-sm p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-[var(--t-text3)] mb-1">Total Bills</p>
                    <p className="text-xl font-black text-[var(--t-text)]">{bills.length}</p>
                </div>
            </div>

            {/* By Vendor */}
            <section>
                <h4 className="text-sm font-black uppercase tracking-wider text-[var(--t-text)] mb-4">{labels.byVendor}</h4>
                {topVendors.length === 0 ? (
                    <div className="p-8 border-2 border-dashed border-[var(--t-border)] rounded-xl text-center text-[var(--t-text3)] text-sm">{labels.noData}</div>
                ) : (
                    <div className="bg-[var(--t-surface)] border border-[var(--t-border)] rounded-xl shadow-sm overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[var(--t-surface2)] border-b border-[var(--t-border)]">
                                    <th className="px-4 py-3 text-xs font-black uppercase tracking-wider text-[var(--t-text3)]">{labels.vendor}</th>
                                    <th className="px-4 py-3 text-xs font-black uppercase tracking-wider text-[var(--t-text3)]">Spend Bar</th>
                                    <th className="px-4 py-3 text-xs font-black uppercase tracking-wider text-right text-[var(--t-text3)]">{labels.total}</th>
                                    <th className="px-4 py-3 text-xs font-black uppercase tracking-wider text-right text-[var(--t-text3)]">{labels.bills}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--t-border)]">
                                {topVendors.map((v, i) => (
                                    <tr key={v.name} className="hover:bg-[var(--t-surface2)] transition-colors">
                                        <td className="px-4 py-3 text-sm font-semibold text-[var(--t-text)]">
                                            <span className="inline-flex items-center gap-2">
                                                <span className="w-5 h-5 rounded-full bg-[#ea580c]/10 text-[#ea580c] text-xs font-black flex items-center justify-center">{i + 1}</span>
                                                {v.name}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 w-48">
                                            <div className="h-2 bg-[var(--t-surface2)] rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-[#ea580c] rounded-full transition-all duration-700"
                                                    style={{ width: `${Math.round((v.total / maxVendorTotal) * 100)}%` }}
                                                />
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm font-bold text-[var(--t-text)] text-right">{fmt(v.total)}</td>
                                        <td className="px-4 py-3 text-sm text-[var(--t-text3)] text-right">{v.count}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {/* By Expense Account */}
            <section>
                <h4 className="text-sm font-black uppercase tracking-wider text-[var(--t-text)] mb-4">{labels.byCategory}</h4>
                {expenseAccounts.length === 0 ? (
                    <div className="p-8 border-2 border-dashed border-[var(--t-border)] rounded-xl text-center text-[var(--t-text3)] text-sm">{labels.noData}</div>
                ) : (
                    <div className="bg-[var(--t-surface)] border border-[var(--t-border)] rounded-xl shadow-sm overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[var(--t-surface2)] border-b border-[var(--t-border)]">
                                    <th className="px-4 py-3 text-xs font-black uppercase tracking-wider text-[var(--t-text3)]">{labels.code}</th>
                                    <th className="px-4 py-3 text-xs font-black uppercase tracking-wider text-[var(--t-text3)]">{labels.account}</th>
                                    <th className="px-4 py-3 text-xs font-black uppercase tracking-wider text-[var(--t-text3)]">Bar</th>
                                    <th className="px-4 py-3 text-xs font-black uppercase tracking-wider text-right text-[var(--t-text3)]">{labels.balance}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--t-border)]">
                                {expenseAccounts.map(a => (
                                    <tr key={a.id} className="hover:bg-[var(--t-surface2)] transition-colors">
                                        <td className="px-4 py-3 text-xs font-mono font-bold text-[var(--t-text3)]">{a.code}</td>
                                        <td className="px-4 py-3 text-sm font-semibold text-[var(--t-text)]">{a.name}</td>
                                        <td className="px-4 py-3 w-40">
                                            <div className="h-2 bg-[var(--t-surface2)] rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-orange-400 rounded-full transition-all duration-700"
                                                    style={{ width: `${Math.round((Number(a.balance || 0) / maxAcctBalance) * 100)}%` }}
                                                />
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm font-bold text-[var(--t-text)] text-right">{fmt(a.balance)}</td>
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

export default CostAnalysisTab;
