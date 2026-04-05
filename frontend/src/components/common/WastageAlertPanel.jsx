import React, { useState, useEffect, useCallback } from 'react';
import { dashboardService } from '../../services/api';

const STATUS_CONFIG = {
    CRITICAL: {
        label: 'Critical',
        bg: 'bg-[var(--t-danger)]/10',
        border: 'border-[var(--t-danger)]/30',
        text: 'text-[var(--t-danger)]',
        dot: 'bg-[var(--t-danger)]',
        icon: '🔴',
    },
    WARNING: {
        label: 'Warning',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/30',
        text: 'text-amber-500',
        dot: 'bg-amber-500',
        icon: '🟡',
    },
    OK: {
        label: 'OK',
        bg: 'bg-[var(--t-primary2)]/10',
        border: 'border-[var(--t-primary2)]/30',
        text: 'text-[var(--t-primary2)]',
        dot: 'bg-[var(--t-primary2)]',
        icon: '🟢',
    },
    NO_THRESHOLD: {
        label: 'No Threshold',
        bg: 'bg-[var(--t-surface2)]',
        border: 'border-[var(--t-border)]',
        text: 'text-[var(--t-text3)]',
        dot: 'bg-[var(--t-border)]',
        icon: '⚪',
    },
};

/**
 * WastageAlertPanel
 * Displays a full wastage tracker table + alert banner with resolve capability.
 * Props:
 *  - compact (bool): shows only the banner row, no full table (for dashboard use)
 *  - onResolved (fn): optional callback after resolving an alert
 */
const WastageAlertPanel = ({ compact = false, onResolved }) => {
    const [dashboard, setDashboard] = useState(null);
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [resolving, setResolving] = useState(null);
    const [resolveNote, setResolveNote] = useState('');
    const [resolveTarget, setResolveTarget] = useState(null);
    const [showResolved, setShowResolved] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [dashRes, alertRes] = await Promise.all([
                dashboardService.getWastageDashboard(),
                dashboardService.getWastageAlerts({ is_resolved: showResolved }),
            ]);
            setDashboard(dashRes.data);
            // Handle both paginated {results:[...]} and plain array responses
            const alertData = alertRes.data?.results || alertRes.data || [];
            setAlerts(Array.isArray(alertData) ? alertData : []);
        } catch (err) {
            console.error('Wastage fetch failed', err);
            // Set safe defaults so the component doesn't crash
            setDashboard(null);
            setAlerts([]);
        } finally {
            setLoading(false);
        }
    }, [showResolved]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleResolve = async (alertItem) => {
        setResolving(alertItem.id);
        try {
            await dashboardService.resolveWastageAlert(alertItem.id, resolveNote);
            setResolveTarget(null);
            setResolveNote('');
            fetchData();
            onResolved?.();
        } catch (err) {
            console.error('Resolve failed', err);
            window.alert('Failed to resolve alert.');
        } finally {
            setResolving(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-[var(--t-primary)] border-t-transparent" />
            </div>
        );
    }

    if (!dashboard) return null;

    const hasCritical = (dashboard.critical_count || 0) > 0;
    const hasWarning = (dashboard.warning_count || 0) > 0;
    const openAlerts = (alerts || []).filter(a => !a.is_resolved);

    // ── Compact Banner Mode (for DesktopHome sidebar / action required section) ──
    if (compact) {
        if (!hasCritical && !hasWarning) return null;
        return (
            <div className={`rounded-2xl border overflow-hidden ${hasCritical ? 'border-[var(--t-danger)]/30 bg-[var(--t-danger)]/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
                <div className={`px-5 py-3 flex items-center justify-between border-b ${hasCritical ? 'border-[var(--t-danger)]/10' : 'border-amber-500/10'}`}>
                    <div className="flex items-center gap-2">
                        <span className="text-lg">{hasCritical ? '🔴' : '🟡'}</span>
                        <span className={`text-xs font-black uppercase tracking-widest ${hasCritical ? 'text-[var(--t-danger)]' : 'text-amber-500'}`}>
                            Wastage Alert {hasCritical ? `— ${dashboard.critical_count} Critical` : `— ${dashboard.warning_count} Warning`}
                        </span>
                    </div>
                    {dashboard.est_cost_lost > 0 && (
                        <span className="text-[10px] font-black text-[var(--t-text3)] uppercase">
                            ~Rs. {dashboard.est_cost_lost.toLocaleString()} lost
                        </span>
                    )}
                </div>
                <div className="px-5 py-3 space-y-2 max-h-48 overflow-y-auto">
                    {openAlerts.slice(0, 5).map(alert => {
                        const cfg = STATUS_CONFIG[alert.severity] || STATUS_CONFIG.OK;
                        return (
                            <div key={alert.id} className="flex items-center justify-between gap-3">
                                <div className="flex flex-col min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`}></span>
                                        <span className="text-xs font-bold text-[var(--t-text)] truncate">{alert.material_name}</span>
                                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${cfg.bg} ${cfg.text} uppercase flex-shrink-0`}>
                                            {alert.wastage_pct}%
                                        </span>
                                    </div>
                                    {alert.transaction_purpose && (
                                        <span className="text-[9px] text-[var(--t-text2)] leading-tight mt-0.5 line-clamp-1 italic">
                                            "{alert.transaction_purpose}" {alert.transaction_qty ? `(${alert.transaction_qty} ${alert.material_unit})` : ''}
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={() => setResolveTarget(alert)}
                                    className="text-[9px] font-black text-[var(--t-text3)] hover:text-[var(--t-primary)] uppercase tracking-widest flex-shrink-0">
                                    Resolve
                                </button>
                            </div>
                        );
                    })}
                    {openAlerts.length > 5 && (
                        <p className="text-[10px] text-[var(--t-text3)] italic pl-3">+{openAlerts.length - 5} more alerts</p>
                    )}
                </div>

                {/* Inline resolve modal */}
                {resolveTarget && (
                    <ResolveModal
                        alert={resolveTarget}
                        note={resolveNote}
                        onNoteChange={setResolveNote}
                        onConfirm={() => handleResolve(resolveTarget)}
                        onCancel={() => { setResolveTarget(null); setResolveNote(''); }}
                        resolving={resolving === resolveTarget?.id}
                    />
                )}
            </div>
        );
    }

    // ── Full Panel Mode (for MaterialsTab) ──
    return (
        <div className="space-y-6">
            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Open Alerts" value={dashboard.open_count} color="text-[var(--t-danger)]" icon="🚨" />
                <StatCard label="Critical" value={dashboard.critical_count} color="text-[var(--t-danger)]" icon="🔴" />
                <StatCard label="Warning" value={dashboard.warning_count} color="text-amber-500" icon="🟡" />
                <StatCard
                    label="Est. Cost Lost"
                    value={`Rs. ${Number(dashboard.est_cost_lost).toLocaleString()}`}
                    color="text-[var(--t-text)]"
                    icon="💸"
                    small
                />
            </div>

            {/* Worst Material Banner */}
            {dashboard.worst_material && (
                <div className="flex items-center gap-4 bg-[var(--t-danger)]/5 border border-[var(--t-danger)]/20 rounded-2xl px-5 py-4">
                    <span className="text-2xl">⚠️</span>
                    <div className="flex-1">
                        <div className="text-[10px] font-black text-[var(--t-text3)] uppercase tracking-widest">Worst Offender</div>
                        <div className="text-base font-black text-[var(--t-danger)]">{dashboard.worst_material.name}</div>
                        <div className="text-xs text-[var(--t-text2)]">
                            {dashboard.worst_material.wastage_pct}% wastage — {dashboard.worst_material.severity}
                        </div>
                    </div>
                </div>
            )}

            {/* Full Tracker Table */}
            <div className="bg-[var(--t-surface)] rounded-2xl border border-[var(--t-border)] overflow-hidden">
                <div className="px-6 py-4 border-b border-[var(--t-border)] flex items-center justify-between bg-[var(--t-surface2)]/50">
                    <div>
                        <div className="text-[10px] font-black text-[var(--t-text3)] uppercase tracking-widest">Material Wastage Tracker</div>
                        <h2 className="text-lg font-black text-[var(--t-text)] mt-0.5">Waste vs. Threshold Analysis</h2>
                    </div>
                    <button
                        onClick={() => setShowResolved(v => !v)}
                        className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border transition-all ${showResolved ? 'bg-[var(--t-primary)]/10 border-[var(--t-primary)]/30 text-[var(--t-primary)]' : 'bg-[var(--t-surface)] border-[var(--t-border)] text-[var(--t-text3)]'}`}
                    >
                        {showResolved ? 'Showing Resolved' : 'Show Resolved'}
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-[var(--t-surface2)] text-[10px] font-black uppercase text-[var(--t-text3)] tracking-wider">
                            <tr>
                                <th className="px-6 py-3">Material</th>
                                <th className="px-6 py-3 text-center">Delivered</th>
                                <th className="px-6 py-3 text-center">Wasted</th>
                                <th className="px-6 py-3 text-center">Wastage %</th>
                                <th className="px-6 py-3 text-center">Threshold</th>
                                <th className="px-6 py-3 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--t-border)]">
                            {(dashboard.materials_summary || []).map((mat) => {
                                const cfg = STATUS_CONFIG[mat.status] || STATUS_CONFIG.NO_THRESHOLD;
                                return (
                                    <tr key={mat.material_id} className="hover:bg-[var(--t-surface2)]/60 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-[var(--t-text)] text-sm">{mat.material_name}</div>
                                            {mat.latest_wastage_reason && (
                                                <div className="text-[10px] text-[var(--t-text3)] italic mt-0.5 line-clamp-1 max-w-[150px]" title={mat.latest_wastage_reason}>
                                                    Latest: "{mat.latest_wastage_reason}"
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center text-sm text-[var(--t-text2)]">
                                            {mat.total_delivered} <span className="text-[10px] uppercase text-[var(--t-text3)]">{mat.unit}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center text-sm font-bold text-[var(--t-danger)]">
                                            {mat.total_wasted} <span className="text-[10px] uppercase text-[var(--t-text3)]">{mat.unit}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <WastagePctBar pct={mat.wastage_pct} status={mat.status} />
                                        </td>
                                        <td className="px-6 py-4 text-center text-xs text-[var(--t-text2)]">
                                            {mat.warning_threshold != null
                                                ? <span>{mat.warning_threshold}% / {mat.critical_threshold}%</span>
                                                : <span className="text-[var(--t-text3)] italic">Not set</span>
                                            }
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center gap-1.5 text-[9px] font-black uppercase px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.border} ${cfg.text}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${mat.status === 'CRITICAL' ? 'animate-ping' : ''}`}></span>
                                                {cfg.label}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                            {(dashboard.materials_summary || []).length === 0 && (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-[var(--t-text3)] text-sm font-bold">
                                        No material data available. Add materials and record WASTAGE transactions to track.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Open Alerts List */}
            {openAlerts.length > 0 && (
                <div className="bg-[var(--t-surface)] rounded-2xl border border-[var(--t-border)] overflow-hidden">
                    <div className="px-6 py-4 border-b border-[var(--t-border)] bg-[var(--t-surface2)]/50 flex items-center gap-2">
                        <span className="text-lg">🚨</span>
                        <h2 className="text-sm font-black text-[var(--t-text)] uppercase tracking-wider">Open Alerts</h2>
                        <span className="ml-auto bg-[var(--t-danger)]/10 text-[var(--t-danger)] text-[10px] font-black px-2.5 py-0.5 rounded-full border border-[var(--t-danger)]/20">
                            {openAlerts.length}
                        </span>
                    </div>
                    <div className="divide-y divide-[var(--t-border)]">
                        {openAlerts.map(alert => {
                            const cfg = STATUS_CONFIG[alert.severity];
                            return (
                                <div key={alert.id} className={`flex items-center justify-between px-6 py-4 gap-4 ${cfg.bg}`}>
                                    <div className="flex items-center gap-3 min-w-0">
                                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot} ${alert.severity === 'CRITICAL' ? 'animate-pulse' : ''}`}></span>
                                        <div className="min-w-0">
                                            <div className="font-bold text-sm text-[var(--t-text)] truncate">{alert.material_name}</div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <div className={`text-[10px] font-black uppercase tracking-widest ${cfg.text}`}>
                                                    {alert.severity} — {alert.wastage_pct}% wastage
                                                </div>
                                                <span className="text-[10px] text-[var(--t-text3)]">•</span>
                                                <div className="text-[10px] text-[var(--t-text3)]">
                                                    Triggered: {new Date(alert.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </div>
                                            </div>
                                            {(alert.transaction_purpose || alert.transaction_notes) && (
                                                <div className="mt-2 bg-white/40 dark:bg-black/10 p-2 rounded-xl border border-black/5">
                                                    <div className="text-[10px] font-black text-[var(--t-text2)] uppercase tracking-tight mb-1">Source Trigger:</div>
                                                    <div className="text-xs text-[var(--t-text)] italic leading-relaxed">
                                                        "{alert.transaction_purpose || alert.transaction_notes}"
                                                    </div>
                                                    {alert.transaction_qty && (
                                                        <div className="text-[10px] font-bold text-[var(--t-danger)] mt-1">
                                                            Loss: {alert.transaction_qty} {alert.material_unit}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setResolveTarget(alert)}
                                        className="flex-shrink-0 px-4 py-1.5 bg-[var(--t-surface)] border border-[var(--t-border)] hover:border-[var(--t-primary)] hover:text-[var(--t-primary)] text-[var(--t-text2)] text-[10px] font-black uppercase tracking-widest rounded-lg transition-all"
                                    >
                                        ✓ Resolve
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Quick Guide (Nepali) */}
            <div className="bg-[var(--t-primary)]/5 border border-[var(--t-primary)]/10 rounded-2xl p-6 mt-8">
                <div className="flex items-center gap-2 mb-4">
                    <span className="text-xl">💡</span>
                    <h3 className="text-sm font-black text-[var(--t-primary)] uppercase tracking-wider">सामाग्री खेर जाने (Wastage) व्यवस्थापन निर्देशिका</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                        <div className="flex gap-3">
                            <span className="w-5 h-5 rounded-full bg-[var(--t-primary)]/10 text-[var(--t-primary)] flex items-center justify-center text-[10px] font-black flex-shrink-0">१</span>
                            <p className="text-xs text-[var(--t-text2)] leading-relaxed">
                                <strong className="text-[var(--t-text)] block mb-0.5">अनुगमन (Monitoring):</strong>
                                ड्यासबोर्डमा सामाग्री खेर गएको अलर्ट (जस्तै: Cement {'>'} ८%) देखा पर्नेछ। रातो रङले खतराको संकेत गर्दछ।
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <span className="w-5 h-5 rounded-full bg-[var(--t-primary)]/10 text-[var(--t-primary)] flex items-center justify-center text-[10px] font-black flex-shrink-0">२</span>
                            <p className="text-xs text-[var(--t-text2)] leading-relaxed">
                                <strong className="text-[var(--t-text)] block mb-0.5">विवरण (Details):</strong>
                                यस 'Wastage Tracker' तालिकामा कुन सामाग्री कति प्रतिशत खेर गयो र कति पैसाको नोक्सान भयो हेर्न सकिन्छ।
                            </p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div className="flex gap-3">
                            <span className="w-5 h-5 rounded-full bg-[var(--t-primary)]/10 text-[var(--t-primary)] flex items-center justify-center text-[10px] font-black flex-shrink-0">३</span>
                            <p className="text-xs text-[var(--t-text2)] leading-relaxed">
                                <strong className="text-[var(--t-text)] block mb-0.5">दर्ता (Recording):</strong>
                                सामाग्री खेर जाँदा (फुटेको वा बिग्रिएको), सामाग्रीको 'Transaction' मा गएर <strong>'Wastage/Loss'</strong> छनौट गरी कति खेर गयो भर्नुहोस्।
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <span className="w-5 h-5 rounded-full bg-[var(--t-primary)]/10 text-[var(--t-primary)] flex items-center justify-center text-[10px] font-black flex-shrink-0">४</span>
                            <p className="text-xs text-[var(--t-text2)] leading-relaxed">
                                <strong className="text-[var(--t-text)] block mb-0.5">समाधान (Resolve):</strong>
                                समस्याको कारण पत्ता लगाएपछि <strong>'Resolve'</strong> बटन थिचेर के सुधार गरियो (जस्तै: "पालले छोपियो") लेखी अलर्ट हटाउनुहोस्।
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Resolve Modal */}

            {resolveTarget && (
                <ResolveModal
                    alert={resolveTarget}
                    note={resolveNote}
                    onNoteChange={setResolveNote}
                    onConfirm={() => handleResolve(resolveTarget)}
                    onCancel={() => { setResolveTarget(null); setResolveNote(''); }}
                    resolving={resolving === resolveTarget?.id}
                />
            )}
        </div>
    );
};

// ── Sub-components ──

const StatCard = ({ label, value, color, icon, small = false }) => (
    <div className="bg-[var(--t-surface)] border border-[var(--t-border)] rounded-2xl p-4 flex flex-col gap-2">
        <div className="flex items-center gap-2">
            <span className="text-lg">{icon}</span>
            <span className="text-[10px] font-black text-[var(--t-text3)] uppercase tracking-widest">{label}</span>
        </div>
        <div className={`${small ? 'text-base' : 'text-2xl'} font-black ${color}`}>{value}</div>
    </div>
);

const WastagePctBar = ({ pct, status }) => {
    const colors = {
        CRITICAL: 'bg-[var(--t-danger)]',
        WARNING: 'bg-amber-500',
        OK: 'bg-[var(--t-primary2)]',
        NO_THRESHOLD: 'bg-[var(--t-border)]',
    };
    const textColors = {
        CRITICAL: 'text-[var(--t-danger)]',
        WARNING: 'text-amber-500',
        OK: 'text-[var(--t-primary2)]',
        NO_THRESHOLD: 'text-[var(--t-text3)]',
    };
    const clampedPct = Math.min(pct, 100);
    return (
        <div className="flex flex-col items-center gap-1">
            <span className={`text-sm font-black ${textColors[status] || textColors.NO_THRESHOLD}`}>{pct}%</span>
            <div className="w-20 h-1.5 bg-[var(--t-surface2)] rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-700 ${colors[status] || colors.NO_THRESHOLD}`}
                    style={{ width: `${clampedPct}%` }}
                />
            </div>
        </div>
    );
};

const ResolveModal = ({ alert, note, onNoteChange, onConfirm, onCancel, resolving }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onCancel}>
        <div
            className="bg-[var(--t-surface)] rounded-2xl border border-[var(--t-border)] shadow-2xl max-w-md w-full p-6 space-y-4"
            onClick={e => e.stopPropagation()}
        >
            <div className="flex items-center gap-3">
                <span className="text-2xl">✅</span>
                <div>
                    <h3 className="text-base font-black text-[var(--t-text)]">Resolve Alert</h3>
                    <p className="text-xs text-[var(--t-text2)]">{alert.material_name} — {alert.wastage_pct}% wastage</p>
                    {alert.transaction_purpose && (
                        <p className="text-[10px] text-[var(--t-text3)] italic mt-1 bg-[var(--t-surface2)] px-2 py-1 rounded inline-block">
                            Issue: "{alert.transaction_purpose}"
                        </p>
                    )}
                </div>
            </div>
            <div>
                <label className="block text-xs font-bold text-[var(--t-text2)] mb-2 uppercase tracking-wider">Resolution Note (Optional)</label>
                <textarea
                    value={note}
                    onChange={e => onNoteChange(e.target.value)}
                    placeholder="e.g. Acceptable spillage during pour, accounted for..."
                    className="w-full px-4 py-3 border border-[var(--t-border)] rounded-xl bg-[var(--t-bg)] text-sm text-[var(--t-text)] outline-none focus:ring-2 focus:ring-[var(--t-primary)] min-h-[80px] leading-relaxed resize-none"
                />
            </div>
            <div className="flex justify-end gap-3">
                <button
                    onClick={onCancel}
                    className="px-5 py-2 text-xs font-black text-[var(--t-text3)] uppercase tracking-widest hover:text-[var(--t-text)]"
                >
                    Cancel
                </button>
                <button
                    onClick={onConfirm}
                    disabled={resolving}
                    className="px-6 py-2 bg-[var(--t-primary)] text-[var(--t-bg)] rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-[var(--t-primary)]/20 hover:opacity-90 hover:-translate-y-0.5 transition-all disabled:opacity-50"
                >
                    {resolving ? 'Resolving...' : '✓ Mark Resolved'}
                </button>
            </div>
        </div>
    </div>
);

export default WastageAlertPanel;
