import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, RefreshCw, BarChart2 } from 'lucide-react';
import { analyticsService } from '../../services/api';

/**
 * Table of supplier × material rate trends. Rows are sorted by biggest
 * month-over-month change (positive first) to surface the costliest shifts.
 */
const RateTrendTable = () => {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const { data } = await analyticsService.getRateTrends();
            setRows(Array.isArray(data) ? data : data.results || []);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const refresh = async () => {
        setRefreshing(true);
        try {
            await analyticsService.refreshRateTrends();
            await load();
        } finally {
            setRefreshing(false);
        }
    };

    return (
        <div className="bg-[var(--t-surface)] rounded-2xl border border-[var(--t-border)] p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
                <div>
                    <h3 className="text-sm font-black text-[var(--t-text)] uppercase tracking-tight flex items-center gap-2">
                        <BarChart2 className="w-4 h-4 text-emerald-600" /> Market Rate Trends
                    </h3>
                    <p className="text-[10px] text-[var(--t-text3)] font-bold">Supplier price shifts over last 30 days</p>
                </div>
                <button
                    onClick={refresh}
                    disabled={refreshing}
                    className="p-2 rounded-lg bg-[var(--t-surface2)] hover:bg-[var(--t-border)] transition-colors disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 text-[var(--t-text2)] ${refreshing ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {loading ? (
                <div className="py-8 flex flex-col items-center justify-center gap-2 text-[var(--t-text3)]">
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <p className="text-[10px] font-bold uppercase tracking-widest">Scanning market...</p>
                </div>
            ) : rows.length === 0 ? (
                <div className="py-8 text-center text-sm text-[var(--t-text3)] border-2 border-dashed border-[var(--t-border)] rounded-xl">
                    No trend data yet. Collect more transactions to see trends.
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-[11px]">
                        <thead>
                            <tr className="text-left text-[var(--t-text3)] font-black uppercase tracking-widest border-b border-[var(--t-border)]">
                                <th className="pb-2">Material</th>
                                <th className="pb-2">Supplier</th>
                                <th className="pb-2 text-right">Avg 30d</th>
                                <th className="pb-2 text-right">Trend</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--t-border)]">
                            {rows.map((r) => {
                                const up = r.change_pct_last_month >= 0;
                                return (
                                    <tr key={r.id} className="hover:bg-[var(--t-surface2)] transition-colors group">
                                        <td className="py-2.5 font-bold text-[var(--t-text)]">{r.material_name}</td>
                                        <td className="py-2.5 text-[var(--t-text3)]">{r.supplier_name}</td>
                                        <td className="py-2.5 text-right font-black text-[var(--t-text2)]">NPR {fmt(r.avg_rate_30d)}</td>
                                        <td className={`py-2.5 text-right font-black ${up ? 'text-rose-600' : 'text-emerald-600'}`}>
                                            <div className="flex items-center justify-end gap-1">
                                                {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                                {r.change_pct_last_month?.toFixed(1)}%
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

function fmt(n) {
    return (Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export default RateTrendTable;
