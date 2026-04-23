import React, { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, ExternalLink, Loader2 } from 'lucide-react';
import { photoIntelService, getMediaUrl } from '../../services/api';

/**
 * Homeowner-facing feed of high-confidence phase mismatches.
 * Use on the desktop dashboard as a red-flag panel.
 */
const MismatchFeed = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        setLoading(true);
        try {
            const { data } = await photoIntelService.getMismatches();
            setItems(Array.isArray(data) ? data : data.results || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    return (
        <div className="bg-[var(--t-surface)] rounded-[2rem] border border-amber-200 shadow-xl shadow-amber-500/5 overflow-hidden flex flex-col">
            {/* ── Feed Header ── */}
            <div className="px-6 py-5 bg-gradient-to-r from-amber-50 to-transparent border-b border-amber-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <AlertTriangle className="w-5 h-5 text-amber-600 relative z-10" />
                        <span className="absolute inset-0 bg-amber-400 rounded-full animate-ping opacity-20" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-amber-900 uppercase tracking-wider">AI Audit Feed</h3>
                        <p className="text-[10px] font-bold text-amber-700/60 uppercase tracking-widest">Phase Mismatches</p>
                    </div>
                </div>
                <button 
                    onClick={load}
                    className="p-2 rounded-xl hover:bg-amber-100 text-amber-600 transition-colors"
                    title="Refresh Audit"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* ── Feed Content ── */}
            <div className="flex-1 overflow-y-auto max-h-[600px] scrollbar-thin">
                {loading && items.length === 0 ? (
                    <div className="p-8 text-center space-y-3 opacity-40">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-600" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-amber-800">Scanning Site Photos...</p>
                    </div>
                ) : items.length === 0 ? (
                    <div className="p-12 text-center space-y-4">
                        <div className="text-4xl">✨</div>
                        <p className="text-[11px] font-black text-emerald-700 uppercase tracking-widest leading-relaxed">
                            No anomalies detected.<br/>
                            <span className="text-emerald-600/60">AI confirms all progress.</span>
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-amber-50">
                        {items.slice(0, 10).map((a) => (
                            <div key={a.id} className="p-4 hover:bg-amber-50/50 transition-colors group">
                                <div className="flex items-start gap-4">
                                    {a.media_url ? (
                                        <div className="relative w-16 h-16 shrink-0 rounded-2xl overflow-hidden border border-amber-100 shadow-sm">
                                            <img
                                                src={getMediaUrl(a.media_url)}
                                                alt=""
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                                        </div>
                                    ) : (
                                        <div className="w-16 h-16 shrink-0 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-xl">
                                            📸
                                        </div>
                                    )}

                                    <div className="flex-1 min-w-0 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-[11px] font-black text-amber-900 truncate uppercase tracking-tight">
                                                {a.task_title || 'Untitled Activity'}
                                            </h4>
                                            <a href={`/tasks/${a.media?.task || a.media}`} className="text-amber-400 hover:text-amber-600 transition-colors">
                                                <ExternalLink className="w-3.5 h-3.5" />
                                            </a>
                                        </div>

                                        <div className="space-y-1">
                                            <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-widest text-amber-700/60">
                                                <span>AI Observation</span>
                                                <span className="text-amber-600">{Math.round(a.phase_confidence * 100)}% Match</span>
                                            </div>
                                            <div className="h-1 rounded-full bg-amber-100 overflow-hidden">
                                                <div 
                                                    className="h-full bg-amber-500 rounded-full" 
                                                    style={{ width: `${a.phase_confidence * 100}%` }} 
                                                />
                                            </div>
                                        </div>

                                        <p className="text-[10px] font-medium leading-tight text-amber-800/80">
                                            User flagged as <span className="font-black text-amber-900 underline decoration-amber-300 underline-offset-2">{a.task_phase_name || '—'}</span>, 
                                            but AI detected <span className="font-black text-amber-900 underline decoration-amber-300 underline-offset-2">{a.detected_phase_label}</span>.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Feed Footer ── */}
            <div className="px-6 py-4 bg-amber-50/30 border-t border-amber-100">
                <p className="text-[9px] font-bold text-amber-600/60 uppercase tracking-[0.1em] leading-relaxed">
                    AI auditors verify site photos against project schedules daily.
                </p>
            </div>
        </div>
    );
};

export default MismatchFeed;
