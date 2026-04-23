import React, { useEffect, useRef, useState } from 'react';
import { Wifi, WifiOff, RefreshCw, Inbox, CheckCircle } from 'lucide-react';
import offlineQueue from '../../services/offlineQueue';

/**
 * OfflineStatus — connectivity + offline-queue feedback.
 *
 * States:
 *  • Online, queue empty      → invisible (renders nothing)
 *  • Online, queue flushing   → thin syncing strip at top
 *  • Online, queue has items  → amber chip bottom-left
 *  • Offline                  → red banner at top + queued count
 */
const OfflineStatus = () => {
    const [online, setOnline] = useState(
        typeof navigator !== 'undefined' ? navigator.onLine : true
    );
    const [pending, setPending] = useState(0);
    const [syncing, setSyncing] = useState(false);
    const [justSynced, setJustSynced] = useState(false);
    const syncTimer = useRef(null);

    const refreshCount = async () => {
        try {
            const rows = await offlineQueue.list();
            setPending(Array.isArray(rows) ? rows.filter(r => r.status === 'PENDING').length : 0);
        } catch {
            /* IndexedDB unavailable — treat as 0 */
        }
    };

    useEffect(() => {
        const handleOnline = () => {
            setOnline(true);
            setSyncing(true);
            // Give the flush handler in api.js a moment to run, then refresh
            syncTimer.current = setTimeout(async () => {
                await refreshCount();
                setSyncing(false);
                setJustSynced(true);
                setTimeout(() => setJustSynced(false), 3000);
            }, 2500);
        };

        const handleOffline = () => {
            setOnline(false);
            setSyncing(false);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        window.addEventListener('offline-queue-changed', refreshCount);

        // Poll queue count every 15s so the badge stays accurate
        refreshCount();
        const poll = setInterval(refreshCount, 15000);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('offline-queue-changed', refreshCount);
            clearInterval(poll);
            clearTimeout(syncTimer.current);
        };
    }, []);

    // ── Offline banner ───────────────────────────────────────────────
    if (!online) {
        return (
            <div className="fixed top-0 left-0 right-0 z-[9999] bg-red-600 text-white px-4 py-2 flex items-center justify-center gap-3 shadow-lg text-sm font-semibold">
                <WifiOff className="w-4 h-4 shrink-0" />
                <span>
                    Offline — mutations are queued
                    {pending > 0 && (
                        <span className="ml-1 font-black">({pending} pending)</span>
                    )}
                </span>
                <span className="text-red-200 text-xs font-normal hidden sm:inline">
                    · Changes will sync automatically when you reconnect
                </span>
            </div>
        );
    }

    // ── Syncing strip ────────────────────────────────────────────────
    if (syncing) {
        return (
            <div className="fixed top-0 left-0 right-0 z-[9999] bg-blue-600 text-white px-4 py-1.5 flex items-center justify-center gap-2 shadow text-xs font-semibold">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Syncing {pending > 0 ? `${pending} queued operation${pending !== 1 ? 's' : ''}` : 'offline changes'}…
            </div>
        );
    }

    // ── Just synced confirmation ─────────────────────────────────────
    if (justSynced) {
        return (
            <div className="fixed top-0 left-0 right-0 z-[9999] bg-emerald-600 text-white px-4 py-1.5 flex items-center justify-center gap-2 shadow text-xs font-semibold animate-in fade-in slide-in-from-top duration-300">
                <CheckCircle className="w-3.5 h-3.5" />
                Back online — all changes synced
            </div>
        );
    }

    // ── Online, items still pending (queue didn't fully flush) ───────
    if (pending > 0) {
        return (
            <div className="fixed bottom-6 left-6 z-40 bg-white border border-amber-200 rounded-full shadow-lg px-4 py-2 text-xs font-bold text-amber-700 inline-flex items-center gap-2">
                <Inbox className="w-3.5 h-3.5" />
                {pending} operation{pending !== 1 ? 's' : ''} queued
            </div>
        );
    }

    // Online + empty queue → invisible
    return null;
};

export default OfflineStatus;
