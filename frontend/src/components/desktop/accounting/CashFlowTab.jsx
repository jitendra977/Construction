import React, { useState, useEffect } from 'react';
import { accountingService } from '../../../services/api';

const fmt = (v) => 'NPR ' + Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

const CashFlowTab = ({ lang, projectId }) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const labels = {
        en: {
            title: 'Cash Flow Statement',
            desc: 'Monthly inflows vs outflows — last 6 months',
            month: 'Month', inflows: 'Inflows', outflows: 'Outflows', net: 'Net',
            runningBal: 'Running Balance',
            totalIn: 'Total Inflows (6 mo)', totalOut: 'Total Outflows (6 mo)', netFlow: 'Net Cash Flow',
            noData: 'No cash flow data available.',
        },
        np: {
            title: 'नगद प्रवाह विवरण',
            desc: 'मासिक प्राप्ति बनाम खर्च — पछिल्लो ६ महिना',
            month: 'महिना', inflows: 'प्राप्ति', outflows: 'खर्च', net: 'खुद',
            runningBal: 'संचित मौज्दात',
            totalIn: 'कुल प्राप्ति (६ म.)', totalOut: 'कुल खर्च (६ म.)', netFlow: 'खुद नगद प्रवाह',
            noData: 'नगद प्रवाह डेटा उपलब्ध छैन।',
        },
    }[lang];

    useEffect(() => {
        setLoading(true);
        setError(null);
        accountingService.getReport('cash_flow', projectId, 6)
            .then(res => {
                const rows = res.data?.data || res.data || [];
                setData(Array.isArray(rows) ? rows : []);
            })
            .catch(err => { setError('Failed to load cash flow data.'); console.error(err); })
            .finally(() => setLoading(false));
    }, [projectId]);

    if (loading) return <div className="p-10 text-center text-[var(--t-text3)] text-sm">Loading cash flow...</div>;
    if (error) return <div className="p-10 text-center text-red-500 text-sm">{error}</div>;

    const totalIn = data.reduce((s, m) => s + Number(m.inflows || 0), 0);
    const totalOut = data.reduce((s, m) => s + Number(m.outflows || 0), 0);
    const netTotal = totalIn - totalOut;

    // Compute running balance
    let running = 0;
    const rows = data.map(m => {
        const net = Number(m.inflows || 0) - Number(m.outflows || 0);
        running += net;
        return { ...m, net, runningBalance: running };
    });

    const maxAbsNet = rows.length > 0 ? Math.max(...rows.map(r => Math.abs(r.net)), 1) : 1;

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-base font-black text-[var(--t-text)]">{labels.title}</h3>
                <p className="text-sm text-[var(--t-text3)]">{labels.desc}</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-1">{labels.totalIn}</p>
                    <p className="text-xl font-black text-emerald-800">{fmt(totalIn)}</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-red-700 mb-1">{labels.totalOut}</p>
                    <p className="text-xl font-black text-red-800">{fmt(totalOut)}</p>
                </div>
                <div className={`border rounded-xl p-4 ${netTotal >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                    <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${netTotal >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{labels.netFlow}</p>
                    <p className={`text-xl font-black ${netTotal >= 0 ? 'text-emerald-800' : 'text-red-800'}`}>{fmt(netTotal)}</p>
                </div>
            </div>

            {/* Table */}
            {data.length === 0 ? (
                <div className="p-8 border-2 border-dashed border-[var(--t-border)] rounded-xl text-center text-[var(--t-text3)] text-sm">{labels.noData}</div>
            ) : (
                <div className="bg-[var(--t-surface)] border border-[var(--t-border)] rounded-xl shadow-sm overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead>
                            <tr className="bg-[var(--t-surface2)] border-b border-[var(--t-border)]">
                                <th className="px-4 py-3 text-xs font-black uppercase tracking-wider text-[var(--t-text3)]">{labels.month}</th>
                                <th className="px-4 py-3 text-xs font-black uppercase tracking-wider text-right text-emerald-600">{labels.inflows}</th>
                                <th className="px-4 py-3 text-xs font-black uppercase tracking-wider text-right text-red-500">{labels.outflows}</th>
                                <th className="px-4 py-3 text-xs font-black uppercase tracking-wider text-right text-[var(--t-text3)]">{labels.net}</th>
                                <th className="px-4 py-3 text-xs font-black uppercase tracking-wider text-[var(--t-text3)]">Flow Bar</th>
                                <th className="px-4 py-3 text-xs font-black uppercase tracking-wider text-right text-[var(--t-text3)]">{labels.runningBal}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--t-border)]">
                            {rows.map((m, i) => (
                                <tr key={m.month || i} className="hover:bg-[var(--t-surface2)] transition-colors">
                                    <td className="px-4 py-3 text-sm font-semibold text-[var(--t-text)]">{m.month}</td>
                                    <td className="px-4 py-3 text-sm font-bold text-emerald-600 text-right">{fmt(m.inflows)}</td>
                                    <td className="px-4 py-3 text-sm font-bold text-red-500 text-right">{fmt(m.outflows)}</td>
                                    <td className="px-4 py-3 text-sm font-black text-right">
                                        <span className={m.net >= 0 ? 'text-emerald-700' : 'text-red-600'}>
                                            {m.net >= 0 ? '+' : ''}{fmt(m.net)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 w-32">
                                        <div className="flex items-center gap-1 h-4">
                                            <div className="flex-1 h-2 bg-[var(--t-surface2)] rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-500 ${m.net >= 0 ? 'bg-emerald-500' : 'bg-red-400'}`}
                                                    style={{ width: `${Math.round((Math.abs(m.net) / maxAbsNet) * 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    </td>
                                    <td className={`px-4 py-3 text-sm font-bold text-right ${m.runningBalance >= 0 ? 'text-[var(--t-text2)]' : 'text-red-600'}`}>
                                        {fmt(m.runningBalance)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="bg-[var(--t-surface2)] border-t-2 border-[var(--t-border)]">
                                <td className="px-4 py-3 text-xs font-black uppercase tracking-wider text-[var(--t-text)]">Total</td>
                                <td className="px-4 py-3 text-sm font-black text-emerald-700 text-right">{fmt(totalIn)}</td>
                                <td className="px-4 py-3 text-sm font-black text-red-600 text-right">{fmt(totalOut)}</td>
                                <td className={`px-4 py-3 text-sm font-black text-right ${netTotal >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                                    {netTotal >= 0 ? '+' : ''}{fmt(netTotal)}
                                </td>
                                <td />
                                <td className="px-4 py-3 text-sm font-black text-right text-[var(--t-text)]">{fmt(running)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}
        </div>
    );
};

export default CashFlowTab;
