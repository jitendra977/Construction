import React, { useEffect, useState } from 'react';
import { TrendingUp, AlertTriangle, RefreshCw, Loader2, DollarSign } from 'lucide-react';
import { analyticsService } from '../../services/api';

const riskColor = {
    LOW: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600',
    MEDIUM: 'border-amber-500/20 bg-amber-500/10 text-amber-600',
    HIGH: 'border-rose-500/20 bg-rose-500/10 text-rose-600',
};

const riskBadge = {
    LOW: 'text-emerald-500',
    MEDIUM: 'text-amber-500',
    HIGH: 'text-rose-500',
};

/**
 * Dashboard widget: per-category budget forecasts with risk level,
 * daily burn, and days-to-exhaustion.
 */
const ForecastWidget = () => {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const { data } = await analyticsService.getForecasts();
            setRows(Array.isArray(data) ? data : data.results || []);
        } finally {
            setLoading(false);
        }
    };

    const refresh = async () => {
        setRefreshing(true);
        try {
            await analyticsService.refreshForecasts();
            await load();
        } finally {
            setRefreshing(false);
        }
    };

    useEffect(() => { load(); }, []);

    return (
        <div className="bg-[var(--t-surface)] rounded-2xl border border-[var(--t-border)] p-6 shadow-sm h-full flex flex-col">
            <div className="flex items-center justify-between mb-5">
                <div>
                    <h3 className="text-sm font-black text-[var(--t-text)] uppercase tracking-tight flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-blue-500" /> Budget Forecast
                    </h3>
                    <p className="text-[10px] text-[var(--t-text3)] font-bold">Category exhaustion & burn rates</p>
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
                <div className="flex-1 py-8 flex flex-col items-center justify-center gap-2 text-[var(--t-text3)]">
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <p className="text-[10px] font-bold uppercase tracking-widest">Calculating trajectory...</p>
                </div>
            ) : rows.length === 0 ? (
                <div className="flex-1 py-8 text-center flex flex-col items-center justify-center text-[var(--t-text3)] border-2 border-dashed border-[var(--t-border)] rounded-xl">
                    <DollarSign className="w-8 h-8 opacity-20 mb-2" />
                    <p className="text-xs font-bold">No active forecasts.</p>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto space-y-3">
                    {rows.map((r) => (
                        <div
                            key={r.id}
                            className="group flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl border border-[var(--t-border)] bg-[var(--t-surface2)] hover:border-[var(--t-primary)]/30 hover:shadow-md transition-all"
                        >
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="font-black text-sm text-[var(--t-text)] truncate">{r.category_name}</div>
                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${riskColor[r.risk_level] || riskColor.LOW}`}>
                                        {r.risk_level} RISK
                                    </span>
                                </div>
                                <div className="text-[10px] text-[var(--t-text2)] font-semibold flex items-center gap-2 flex-wrap">
                                    <span className="bg-[var(--t-surface3)] px-2 py-1 rounded-md">Burn: NPR {fmt(r.daily_burn_rate)}/day</span>
                                    <span className="opacity-70">Confidence: {Math.round((r.confidence || 0) * 100)}%</span>
                                </div>
                            </div>
                            
                            <div className="text-left sm:text-right w-full sm:w-auto shrink-0 bg-[var(--t-bg)] border border-[var(--t-border)] p-2.5 rounded-lg">
                                {r.projected_overrun > 0 ? (
                                    <div className="inline-flex items-center gap-1.5 text-xs font-black text-rose-500">
                                        <AlertTriangle className="w-3.5 h-3.5" />
                                        +NPR {fmt(r.projected_overrun)} over
                                    </div>
                                ) : (
                                    <div className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-500">
                                        <TrendingUp className="w-3.5 h-3.5" />
                                        On track
                                    </div>
                                )}
                                
                                {r.days_to_exhaustion !== null && r.days_to_exhaustion !== undefined && (
                                    <div className="text-[10px] font-bold text-[var(--t-text3)] mt-1 uppercase tracking-wider">
                                        {r.days_to_exhaustion} days remaining
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

function fmt(n) {
    const num = Number(n) || 0;
    return num.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export default ForecastWidget;

