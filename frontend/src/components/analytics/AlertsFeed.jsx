import React, { useEffect, useState } from 'react';
import { Bell, AlertTriangle, Info, Check, RefreshCw, Zap } from 'lucide-react';
import { analyticsService } from '../../services/api';

const severityStyles = {
    INFO: 'border-blue-500/20 bg-blue-500/10 text-blue-500',
    WARNING: 'border-amber-500/20 bg-amber-500/10 text-amber-500',
    CRITICAL: 'border-rose-500/20 bg-rose-500/10 text-rose-500',
};

const SeverityIcon = ({ s, className }) => {
    if (s === 'CRITICAL') return <Zap className={className} />;
    if (s === 'WARNING') return <AlertTriangle className={className} />;
    return <Info className={className} />;
};

const AlertsFeed = ({ initialResolved = false }) => {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showResolved, setShowResolved] = useState(initialResolved);

    const load = async () => {
        setLoading(true);
        try {
            const { data } = await analyticsService.getAlerts({
                resolved: showResolved ? 'true' : 'false',
            });
            setRows(Array.isArray(data) ? data : data.results || []);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [showResolved]);

    const resolve = async (id) => {
        await analyticsService.resolveAlert(id);
        load();
    };

    return (
        <div className="flex flex-col h-full">
            {rows.length === 0 && !loading ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-[var(--t-border)] rounded-xl m-4">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-3">
                        <Check className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-black text-[var(--t-text)] uppercase tracking-widest">System Clear</p>
                    <p className="text-[10px] text-[var(--t-text3)] font-bold mt-1">No critical financial risks detected.</p>
                </div>
            ) : (
                <div className="divide-y divide-[var(--t-border)]">
                    {rows.map((a) => (
                        <div
                            key={a.id}
                            className={`flex items-start gap-3 p-5 transition-all hover:bg-[var(--t-surface2)] ${a.is_resolved ? 'opacity-50 grayscale' : ''}`}
                        >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${severityStyles[a.severity] || severityStyles.INFO}`}>
                                <SeverityIcon s={a.severity} className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-xs font-black text-[var(--t-text)] uppercase tracking-tight truncate">{a.title}</p>
                                    <span className="text-[9px] font-bold text-[var(--t-text3)] whitespace-nowrap">
                                        {new Date(a.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                                <p className="text-[11px] text-[var(--t-text2)] mt-1.5 leading-relaxed">{a.message}</p>
                                
                                {!a.is_resolved && (
                                    <button
                                        onClick={() => resolve(a.id)}
                                        className="mt-3 inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border border-[var(--t-border)] bg-[var(--t-surface2)] text-[var(--t-text3)] hover:text-[var(--t-primary)] hover:border-[var(--t-primary)] transition-all"
                                    >
                                        <Check className="w-3 h-3" /> Mark Resolved
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AlertsFeed;
