import React, { useEffect, useRef, useState } from 'react';
import { Wifi, WifiOff, RefreshCw, Inbox, CheckCircle, X, Trash2, Send } from 'lucide-react';
import offlineQueue from '../../services/offlineQueue';
import api from '../../services/api';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';
const HEALTHCHECK_URL = `${API_URL}/health/`;

/**
 * OfflineStatus — connectivity + offline-queue feedback + Queue Inspector modal.
 */
const OfflineStatus = () => {
    const [online, setOnline] = useState(
        typeof navigator !== 'undefined' ? navigator.onLine : true
    );
    const [pending, setPending] = useState(0);
    const [syncing, setSyncing] = useState(false);
    const [justSynced, setJustSynced] = useState(false);
    const [showInspector, setShowInspector] = useState(false);
    const [queuedItems, setQueuedItems] = useState([]);
    const syncTimer = useRef(null);
    const probeTimer = useRef(null);

    const refreshCount = async () => {
        try {
            const rows = await offlineQueue.list();
            const pendingCount = Array.isArray(rows) ? rows.filter(r => r.status === 'PENDING' || !r.status).length : 0;
            setPending(pendingCount);
            if (showInspector) {
                setQueuedItems(Array.isArray(rows) ? rows : []);
            }
        } catch {
            /* IndexedDB unavailable */
        }
    };

    const loadQueueDetails = async () => {
        try {
            const rows = await offlineQueue.list();
            setQueuedItems(Array.isArray(rows) ? rows : []);
        } catch (_) {}
    };

    const openInspector = async () => {
        await loadQueueDetails();
        setShowInspector(true);
    };

    const handleClearQueue = async () => {
        if (!window.confirm("Are you sure you want to discard all queued offline changes? This cannot be undone.")) return;
        try {
            const rows = await offlineQueue.list();
            for (const row of rows) {
                await offlineQueue.remove(row.id);
            }
            toast.success("Offline queue cleared successfully!");
            setShowInspector(false);
            await refreshCount();
        } catch (_) {
            toast.error("Failed to clear offline queue.");
        }
    };

    const handleForceSync = async () => {
        setSyncing(true);
        toast.info("Starting synchronization of queued operations...");
        try {
            const results = await offlineQueue.flush(api);
            const succeeded = results.filter(r => r.ok).length;
            const failed = results.filter(r => !r.ok).length;
            if (succeeded > 0) {
                toast.success(`Synced ${succeeded} operations successfully!`);
            }
            if (failed > 0) {
                toast.warning(`${failed} operations failed to sync. They remain in the queue.`);
            }
            await refreshCount();
            await loadQueueDetails();
        } catch (_) {
            toast.error("An error occurred during synchronization.");
        } finally {
            setSyncing(false);
        }
    };

    const probeConnectivity = async () => {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);
            const res = await fetch(HEALTHCHECK_URL, {
                method: 'GET',
                cache: 'no-store',
                signal: controller.signal,
                credentials: 'same-origin',
            });
            clearTimeout(timeout);
            return res.ok;
        } catch {
            return false;
        }
    };

    useEffect(() => {
        const verifyAndSetOnline = async () => {
            const ok = await probeConnectivity();
            setOnline(ok);
            return ok;
        };

        const handleOnline = async () => {
            setOnline(true);
            setSyncing(true);
            // Give the flush handler in api.js a moment to run, then refresh
            syncTimer.current = setTimeout(async () => {
                const ok = await verifyAndSetOnline();
                if (!ok) {
                    setSyncing(false);
                    return;
                }
                await refreshCount();
                setSyncing(false);
                setJustSynced(true);
                setTimeout(() => setJustSynced(false), 3000);
            }, 2500);
        };

        const handleOffline = async () => {
            const ok = await probeConnectivity();
            setOnline(ok);
            setSyncing(false);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        window.addEventListener('offline-queue-changed', refreshCount);

        // Initial sync and queue count
        refreshCount();
        verifyAndSetOnline();

        // Poll queue count every 15s so the badge stays accurate
        const poll = setInterval(refreshCount, 15000);
        probeTimer.current = setInterval(verifyAndSetOnline, 30000);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('offline-queue-changed', refreshCount);
            clearInterval(poll);
            clearInterval(probeTimer.current);
            clearTimeout(syncTimer.current);
        };
    }, []);

    return (
        <>
            {/* ── Offline banner ─────────────────────────────────────────────── */}
            {!online && (
                <div 
                    onClick={openInspector}
                    className="fixed top-0 left-0 right-0 z-[9999] bg-red-600 hover:bg-red-700 text-white px-4 py-2 flex items-center justify-center gap-3 shadow-lg text-sm font-semibold cursor-pointer transition-colors"
                >
                    <WifiOff className="w-4 h-4 shrink-0" />
                    <span>
                        Offline — mutations are queued
                        {pending > 0 && (
                            <span className="ml-1 font-black">({pending} pending - Click to view)</span>
                        )}
                    </span>
                    <span className="text-red-200 text-xs font-normal hidden sm:inline">
                        · Click to view or manage offline queue
                    </span>
                </div>
            )}

            {/* ── Syncing strip ──────────────────────────────────────────────── */}
            {syncing && (
                <div className="fixed top-0 left-0 right-0 z-[9999] bg-blue-600 text-white px-4 py-1.5 flex items-center justify-center gap-2 shadow text-xs font-semibold">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Syncing {pending > 0 ? `${pending} queued operation${pending !== 1 ? 's' : ''}` : 'offline changes'}…
                </div>
            )}

            {/* ── Just synced confirmation ───────────────────────────────────── */}
            {justSynced && (
                <div className="fixed top-0 left-0 right-0 z-[9999] bg-emerald-600 text-white px-4 py-1.5 flex items-center justify-center gap-2 shadow text-xs font-semibold animate-in fade-in slide-in-from-top duration-300">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Back online — all changes synced
                </div>
            )}

            {/* ── Online, items still pending (queue didn't fully flush) ─────── */}
            {pending > 0 && (
                <button
                    onClick={openInspector}
                    title="View queued operations"
                    className="fixed bottom-6 left-6 z-40 bg-amber-500 hover:bg-amber-600 text-white border border-amber-400 rounded-full shadow-lg px-4 py-2 text-xs font-bold inline-flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
                >
                    <Inbox className="w-3.5 h-3.5 animate-pulse" />
                    <span>{pending} Operation{pending !== 1 ? 's' : ''} Queued (Manage)</span>
                </button>
            )}

            {/* ── Queue Inspector Modal ────────────────────────────────────── */}
            {showInspector && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                        {/* Header */}
                        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
                            <div className="flex items-center gap-2">
                                <Inbox className="w-5 h-5 text-amber-500" />
                                <div>
                                    <h3 className="font-bold text-white text-sm">Offline Queue Manager</h3>
                                    <p className="text-[10px] text-slate-400 mt-0.5">Inspect or discard pending local mutations</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setShowInspector(false)}
                                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* List */}
                        <div className="p-4 overflow-y-auto flex-1 space-y-2.5">
                            {queuedItems.length === 0 ? (
                                <div className="text-center py-12">
                                    <span className="text-3xl">🎉</span>
                                    <p className="text-slate-400 text-xs font-bold mt-2">No pending offline operations!</p>
                                    <p className="text-[10px] text-slate-500 mt-1">All changes are synchronized with the server.</p>
                                </div>
                            ) : (
                                queuedItems.map((item, idx) => (
                                    <div 
                                        key={item.id || idx} 
                                        className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col gap-1.5"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                                                item.method === 'POST' ? 'bg-blue-900/40 text-blue-400 border border-blue-800/30' :
                                                item.method === 'PUT' ? 'bg-amber-900/40 text-amber-400 border border-amber-800/30' :
                                                item.method === 'DELETE' ? 'bg-red-900/40 text-red-400 border border-red-800/30' :
                                                'bg-slate-800 text-slate-400'
                                            }`}>
                                                {item.method}
                                            </span>
                                            <span className="text-[9px] text-slate-500 tabular-nums font-mono">
                                                {new Date(item.createdAt).toLocaleTimeString()}
                                            </span>
                                        </div>
                                        <p className="text-[11px] font-mono text-slate-300 break-all bg-slate-900/50 p-2 rounded border border-slate-800/30">
                                            {item.url}
                                        </p>
                                        <div className="flex items-center justify-between text-[10px] text-slate-500">
                                            <span>Retries: <b className="text-slate-400 font-bold">{item.tries || 0}/5</b></span>
                                            {item.status && (
                                                <span>Status: <b className="text-amber-500 font-bold">{item.status}</b></span>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Actions */}
                        {queuedItems.length > 0 && (
                            <div className="p-4 bg-slate-950 border-t border-slate-800 flex gap-3">
                                <button
                                    onClick={handleClearQueue}
                                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-red-950 hover:bg-red-900 text-red-400 border border-red-900/40 rounded-xl text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Discard All</span>
                                </button>
                                <button
                                    onClick={handleForceSync}
                                    disabled={!online}
                                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    <Send className="w-3.5 h-3.5" />
                                    <span>Sync Now</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

export default OfflineStatus;
