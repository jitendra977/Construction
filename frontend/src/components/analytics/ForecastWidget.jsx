import React, { useEffect, useState } from 'react';
import { TrendingUp, AlertTriangle, RefreshCw, Loader2 } from 'lucide-react';
import { analyticsService } from '../../services/api';

const riskColor = {
    LOW: 'bg-green-50 text-green-700 border-green-200',
    MEDIUM: 'bg-amber-50 text-amber-800 border-amber-200',
    HIGH: 'bg-red-50 text-red-700 border-red-200',
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
        <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold inline-flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-600" /> Budget Forecast
                </h3>
                <button
                    onClick={refresh}
                    disabled={refreshing}
                    className="text-xs inline-flex items-center gap-1 text-gray-500 hover:text-gray-700 disabled:opacity-60"
                >
                    <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
                    {refreshing ? 'Refreshing…' : 'Refresh'}
                </button>
            </div>
            {loading ? (
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                </div>
            ) : rows.length === 0 ? (
                <div className="text-sm text-gray-500">
                    No forecasts yet. Click Refresh to compute.
                </div>
            ) : (
                <ul className="space-y-2">
                    {rows.map((r) => (
                        <li
                            key={r.id}
                            className={`flex items-center justify-between gap-3 p-2 rounded border ${riskColor[r.risk_level] || riskColor.LOW}`}
                        >
                            <div className="min-w-0">
                                <div className="font-medium truncate">{r.category_name}</div>
                                <div className="text-xs opacity-80">
                                    Burn: Rs. {fmt(r.daily_burn_rate)}/day ·
                                    Confidence: {Math.round((r.confidence || 0) * 100)}%
                                </div>
                            </div>
                            <div className="text-right text-xs">
                                {r.projected_overrun > 0 ? (
                                    <span className="inline-flex items-center gap-1 font-semibold">
                                        <AlertTriangle className="w-3 h-3" />
                                        +Rs. {fmt(r.projected_overrun)}
                                    </span>
                                ) : (
                                    <span className="text-green-700">On track</span>
                                )}
                                {r.days_to_exhaustion !== null && r.days_to_exhaustion !== undefined && (
                                    <div className="opacity-75">
                                        {r.days_to_exhaustion} days left
                                    </div>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

function fmt(n) {
    const num = Number(n) || 0;
    return num.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export default ForecastWidget;
