import React, { useEffect, useState } from 'react';
import { Bell, AlertTriangle, Info, Check, RefreshCw, Zap } from 'lucide-react';
import { analyticsService } from '../../services/api';

const severityStyles = {
    INFO: 'border-blue-100 bg-blue-50/50 text-blue-800',
    WARNING: 'border-amber-100 bg-amber-50/50 text-amber-800',
    CRITICAL: 'border-rose-100 bg-rose-50/50 text-rose-800',
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
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                    <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mb-3">
                        <Check className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-black text-[var(--t-text2)] uppercase tracking-widest">System Clear</p>
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
                                    <span className="text-[9px] font-bold text-[var(--t-text3)] whitespace-nowrap opacity-50">
                                        {new Date(a.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                                <p className="text-[11px] text-[var(--t-text2)] mt-1 leading-relaxed">{a.message}</p>
                                
                                {!a.is_resolved && (
                                    <button
                                        onClick={() => resolve(a.id)}
                                        className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border border-[var(--t-border)] bg-[var(--t-surface)] text-[var(--t-text3)] hover:text-[var(--t-primary)] hover:border-[var(--t-primary)] transition-all"
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
