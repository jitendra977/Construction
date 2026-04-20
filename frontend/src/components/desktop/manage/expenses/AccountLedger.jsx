import React, { useMemo } from 'react';

const AccountLedger = ({ dashboardData, formatCurrency }) => {
    const ledgerEntries = useMemo(() => {
        let entries = [];

        // 1. Add Funding Deposits (Credits)
        dashboardData.funding?.forEach(source => {
            source.transactions?.forEach(tx => {
                entries.push({
                    date: tx.date,
                    type: tx.transaction_type, // CREDIT or DEBIT
                    description: tx.description || `Funding: ${source.name}`,
                    category: 'CAPITAL',
                    account: source.name,
                    amount: Number(tx.amount),
                    reference: tx.id,
                    is_incoming: tx.transaction_type === 'CREDIT'
                });
            });
        });

        // 2. Add Payments (Debits)
        dashboardData.expenses?.forEach(exp => {
            exp.payments?.forEach(p => {
                const source = dashboardData.funding?.find(f => f.id === p.funding_source);
                entries.push({
                    date: p.date,
                    type: 'DEBIT',
                    description: `Payment for: ${exp.title}`,
                    category: exp.category_name,
                    account: source ? source.name : 'Unknown Account',
                    amount: Number(p.amount),
                    reference: `PAY-${p.id}`,
                    is_incoming: false,
                    recipient: exp.paid_to
                });
            });
        });

        // Sort by date descending
        return entries.sort((a, b) => new Date(b.date) - new Date(a.date));
    }, [dashboardData]);

    return (
        <div className="bg-[var(--t-surface)] border border-[var(--t-border)] rounded-[2px] overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-6 border-b border-[var(--t-border)] bg-[var(--t-surface2)] flex justify-between items-center">
                <div>
                    <h3 className="text-sm font-black text-[var(--t-text)] uppercase tracking-widest">Main Financial Ledger</h3>
                    <p className="text-[10px] text-[var(--t-text3)] font-bold uppercase mt-1">Audit-ready cash flow statement</p>
                </div>
                <div className="flex gap-4">
                    <div className="text-right">
                        <div className="text-[9px] font-black text-[var(--t-text3)] uppercase mb-1">Total Inflow</div>
                        <div className="text-lg font-['Bebas_Neue',sans-serif] text-[var(--t-primary)] tracking-wider">
                            {formatCurrency(ledgerEntries.filter(e => e.is_incoming).reduce((sum, e) => sum + e.amount, 0))}
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-[9px] font-black text-[var(--t-text3)] uppercase mb-1">Total Outflow</div>
                        <div className="text-lg font-['Bebas_Neue',sans-serif] text-[var(--t-danger)] tracking-wider">
                            {formatCurrency(ledgerEntries.filter(e => !e.is_incoming).reduce((sum, e) => sum + e.amount, 0))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-[var(--t-surface3)]/50 border-b border-[var(--t-border)]">
                            <th className="px-6 py-4 text-[10px] font-black text-[var(--t-text3)] uppercase tracking-widest">Date</th>
                            <th className="px-6 py-4 text-[10px] font-black text-[var(--t-text3)] uppercase tracking-widest">Description & Account</th>
                            <th className="px-6 py-4 text-[10px] font-black text-[var(--t-text3)] uppercase tracking-widest">Category</th>
                            <th className="px-6 py-4 text-[10px] font-black text-[var(--t-text3)] uppercase tracking-widest text-right">Debit (Out)</th>
                            <th className="px-6 py-4 text-[10px] font-black text-[var(--t-text3)] uppercase tracking-widest text-right">Credit (In)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--t-border)]/50">
                        {ledgerEntries.map((entry, idx) => (
                            <tr key={idx} className="hover:bg-[var(--t-surface2)] transition-colors group">
                                <td className="px-6 py-4 text-[11px] font-['DM_Mono',monospace] text-[var(--t-text2)]">
                                    {new Date(entry.date).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-[12px] font-bold text-[var(--t-text)]">{entry.description}</div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[9px] font-black text-[var(--t-primary)] uppercase bg-[var(--t-primary)]/5 px-2 py-0.5 rounded">
                                            {entry.account}
                                        </span>
                                        {entry.recipient && (
                                            <span className="text-[9px] font-bold text-[var(--t-text3)] uppercase">To: {entry.recipient}</span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${
                                        entry.category === 'CAPITAL' 
                                        ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' 
                                        : 'bg-[var(--t-surface2)] text-[var(--t-text3)] border-[var(--t-border)]'
                                    }`}>
                                        {entry.category}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {!entry.is_incoming && (
                                        <span className="text-[14px] font-['Bebas_Neue',sans-serif] text-[var(--t-danger)] tracking-wider">
                                            {formatCurrency(entry.amount)}
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {entry.is_incoming && (
                                        <span className="text-[14px] font-['Bebas_Neue',sans-serif] text-[var(--t-primary)] tracking-wider">
                                            {formatCurrency(entry.amount)}
                                        </span>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {ledgerEntries.length === 0 && (
                            <tr>
                                <td colSpan="5" className="px-6 py-20 text-center">
                                    <div className="text-[10px] font-black text-[var(--t-text3)] uppercase tracking-[0.4em]">No financial transactions recorded yet</div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AccountLedger;
