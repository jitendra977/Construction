import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff, Inbox } from 'lucide-react';
import offlineQueue from '../../services/offlineQueue';

/**
 * Floating chip that shows connectivity state and the number of
 * pending writes in the offline queue.
 */
const OfflineStatus = () => {
    const [online, setOnline] = useState(
        typeof navigator !== 'undefined' ? navigator.onLine : true
    );
    const [pending, setPending] = useState(0);

    const refreshCount = async () => {
        try {
            const rows = await offlineQueue.list();
            setPending(Array.isArray(rows) ? rows.length : 0);
        } catch {
            /* ignore */
        }
    };

    useEffect(() => {
        const on = () => { setOnline(true); setTimeout(refreshCount, 800); };
        const off = () => setOnline(false);
        window.addEventListener('online', on);
        window.addEventListener('offline', off);
        refreshCount();
        const id = setInterval(refreshCount, 10000);
        return () => {
            window.removeEventListener('online', on);
            window.removeEventListener('offline', off);
            clearInterval(id);
        };
    }, []);

    if (online && pending === 0) return null;

    return (
        <div className="fixed bottom-6 left-6 z-40 bg-white border rounded-full shadow px-3 py-1.5 text-xs inline-flex items-center gap-2">
            {online ? (
                <Wifi className="w-3.5 h-3.5 text-green-600" />
            ) : (
                <WifiOff className="w-3.5 h-3.5 text-red-600" />
            )}
            <span>{online ? 'Online' : 'Offline'}</span>
            {pending > 0 && (
                <span className="inline-flex items-center gap-1 text-amber-700">
                    <Inbox className="w-3.5 h-3.5" /> {pending} queued
                </span>
            )}
        </div>
    );
};

export default OfflineStatus;
