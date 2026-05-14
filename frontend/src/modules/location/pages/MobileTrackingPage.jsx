/**
 * MobileTrackingPage
 * ───────────────────
 * Worker's personal GPS status page on mobile.
 * Shows: on-site indicator, geofence name, GPS accuracy, last ping, coords.
 * Reads from MobileTrackerContext — no second GPS watch started.
 */
import React, { useState, useEffect } from 'react';
import { useMobileTracker } from '../context/MobileTrackerContext';

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtTime(date) {
    if (!date) return '—';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function fmtAgo(date) {
    if (!date) return null;
    const s = Math.round((Date.now() - date.getTime()) / 1000);
    if (s < 60) return `${s}s ago`;
    return `${Math.floor(s / 60)}m ${s % 60}s ago`;
}

function AccuracyBar({ accuracy }) {
    // 0-10m = great, 10-25m = good, 25-50m = fair, >50m = poor
    const pct = Math.max(0, Math.min(100, ((50 - accuracy) / 50) * 100));
    const color = accuracy <= 10 ? '#10b981' : accuracy <= 25 ? '#f59e0b' : '#ef4444';
    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: color }}
                />
            </div>
            <span className="text-xs font-bold tabular-nums" style={{ color }}>
                ±{Math.round(accuracy)}m
            </span>
        </div>
    );
}

// ── Status card config ────────────────────────────────────────────────────────
const STATUS_CONFIG = {
    idle: {
        bg: 'from-gray-100 to-gray-50',
        dot: '#9ca3af',
        pulse: false,
        icon: '📡',
        title: 'Waiting for GPS…',
        subtitle: 'Acquiring your position',
    },
    tracking: {
        bg: 'from-blue-50 to-indigo-50',
        dot: '#3b82f6',
        pulse: true,
        icon: '📡',
        title: 'Tracking Active',
        subtitle: 'Searching for a site boundary',
    },
    on_site: {
        bg: 'from-emerald-50 to-green-50',
        dot: '#10b981',
        pulse: true,
        icon: '✅',
        title: 'On-Site',
        subtitle: null,   // replaced by geofenceName
    },
    off_site: {
        bg: 'from-gray-50 to-slate-50',
        dot: '#6b7280',
        pulse: false,
        icon: '🏠',
        title: 'Off-Site',
        subtitle: 'Not inside any project boundary',
    },
    error: {
        bg: 'from-red-50 to-orange-50',
        dot: '#ef4444',
        pulse: false,
        icon: '⚠️',
        title: 'GPS Error',
        subtitle: null,   // replaced by error message
    },
};

// ── Live "ago" ticker ─────────────────────────────────────────────────────────
function LiveAgo({ date }) {
    const [, tick] = useState(0);
    useEffect(() => {
        const id = setInterval(() => tick(n => n + 1), 1000);
        return () => clearInterval(id);
    }, []);
    return <span>{fmtAgo(date)}</span>;
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function MobileTrackingPage() {
    const tracker = useMobileTracker();

    if (!tracker) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <p className="text-gray-400 text-sm">Tracking not available.</p>
            </div>
        );
    }

    const {
        permission, position, status, geofenceName,
        error, lastPingAt, pingCount, requestPermission,
    } = tracker;

    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.idle;

    return (
        <div
            className="min-h-screen pb-32 pt-6 px-4"
            style={{ background: 'var(--t-bg)', color: 'var(--t-text)' }}
        >
            {/* ── Page title ── */}
            <div className="mb-6">
                <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--t-text)' }}>
                    My Location
                </h1>
                <p className="text-xs mt-0.5" style={{ color: 'var(--t-text3)' }}>
                    GPS tracking · automatic site check-in
                </p>
            </div>

            {/* ── Main status card ── */}
            <div className={`rounded-3xl p-6 mb-4 bg-gradient-to-br ${cfg.bg} border border-white/80 shadow-sm`}>
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        {/* Pulsing dot */}
                        <div className="relative flex items-center justify-center w-5 h-5">
                            {cfg.pulse && (
                                <span
                                    className="absolute inline-flex h-full w-full rounded-full opacity-40 animate-ping"
                                    style={{ background: cfg.dot }}
                                />
                            )}
                            <span
                                className="relative inline-flex rounded-full w-3 h-3"
                                style={{ background: cfg.dot }}
                            />
                        </div>
                        <span className="text-4xl">{cfg.icon}</span>
                    </div>
                    <div
                        className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full"
                        style={{
                            background: `${cfg.dot}20`,
                            color: cfg.dot,
                            border: `1px solid ${cfg.dot}40`,
                        }}
                    >
                        {status.replace('_', '-')}
                    </div>
                </div>

                <h2 className="text-2xl font-black text-gray-900 mb-1">{cfg.title}</h2>

                {status === 'on_site' && geofenceName && (
                    <p className="text-emerald-700 font-bold text-sm">{geofenceName}</p>
                )}
                {status === 'error' && error && (
                    <p className="text-red-600 text-sm font-medium">{error}</p>
                )}
                {status !== 'on_site' && status !== 'error' && (
                    <p className="text-gray-500 text-sm">{cfg.subtitle}</p>
                )}

                {/* GPS accuracy bar */}
                {position && (
                    <div className="mt-4">
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">GPS Accuracy</div>
                        <AccuracyBar accuracy={position.accuracy} />
                    </div>
                )}
            </div>

            {/* ── Permission denied banner ── */}
            {permission === 'denied' && (
                <div className="rounded-2xl p-4 mb-4 bg-red-50 border border-red-200">
                    <p className="text-sm font-bold text-red-700 mb-1">📵 GPS Permission Denied</p>
                    <p className="text-xs text-red-600 mb-3">
                        Go to your browser settings → Site permissions → Location → Allow for this site.
                    </p>
                    <button
                        onClick={requestPermission}
                        className="w-full py-2.5 bg-red-600 text-white text-sm font-black rounded-xl hover:bg-red-700 transition-colors active:scale-95"
                    >
                        Try Again
                    </button>
                </div>
            )}

            {/* ── Permission prompt banner ── */}
            {permission === 'prompt' && (
                <div className="rounded-2xl p-4 mb-4 bg-blue-50 border border-blue-200">
                    <p className="text-sm font-bold text-blue-700 mb-1">📍 Enable Location</p>
                    <p className="text-xs text-blue-600 mb-3">
                        Allow GPS access so your check-in is recorded automatically when you arrive on-site.
                    </p>
                    <button
                        onClick={requestPermission}
                        className="w-full py-2.5 bg-blue-600 text-white text-sm font-black rounded-xl hover:bg-blue-700 transition-colors active:scale-95"
                    >
                        Enable GPS Tracking
                    </button>
                </div>
            )}

            {/* ── Stats grid ── */}
            <div className="grid grid-cols-2 gap-3 mb-4">
                {/* Last ping */}
                <div
                    className="rounded-2xl p-4"
                    style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)' }}
                >
                    <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: 'var(--t-text3)' }}>
                        Last Ping
                    </p>
                    <p className="text-sm font-black" style={{ color: 'var(--t-text)' }}>
                        {fmtTime(lastPingAt)}
                    </p>
                    {lastPingAt && (
                        <p className="text-[10px] mt-0.5" style={{ color: 'var(--t-text3)' }}>
                            <LiveAgo date={lastPingAt} />
                        </p>
                    )}
                </div>

                {/* Total pings */}
                <div
                    className="rounded-2xl p-4"
                    style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)' }}
                >
                    <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: 'var(--t-text3)' }}>
                        Pings Sent
                    </p>
                    <p className="text-2xl font-black" style={{ color: 'var(--t-primary)' }}>
                        {pingCount}
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--t-text3)' }}>this session</p>
                </div>
            </div>

            {/* ── Coordinates ── */}
            {position && (
                <div
                    className="rounded-2xl p-4 mb-4"
                    style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)' }}
                >
                    <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: 'var(--t-text3)' }}>
                        GPS Coordinates
                    </p>
                    <div className="font-mono text-xs space-y-1" style={{ color: 'var(--t-text)' }}>
                        <div className="flex justify-between">
                            <span style={{ color: 'var(--t-text3)' }}>Latitude</span>
                            <span className="font-bold">{position.lat.toFixed(6)}°</span>
                        </div>
                        <div className="flex justify-between">
                            <span style={{ color: 'var(--t-text3)' }}>Longitude</span>
                            <span className="font-bold">{position.lon.toFixed(6)}°</span>
                        </div>
                        <div className="flex justify-between">
                            <span style={{ color: 'var(--t-text3)' }}>Accuracy</span>
                            <span className="font-bold">±{Math.round(position.accuracy)} m</span>
                        </div>
                        {position.heading != null && (
                            <div className="flex justify-between">
                                <span style={{ color: 'var(--t-text3)' }}>Heading</span>
                                <span className="font-bold">{Math.round(position.heading)}°</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── How it works ── */}
            <div
                className="rounded-2xl p-4"
                style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)' }}
            >
                <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: 'var(--t-text3)' }}>
                    How it works
                </p>
                <div className="space-y-2.5">
                    {[
                        ['📡', 'Auto check-in', 'GPS detects when you enter a site boundary and logs your arrival time.'],
                        ['🔋', 'Battery-friendly', 'Pings only when you move 15 m+ or every 45 seconds. No battery drain.'],
                        ['🔒', 'Private', 'Your position is only visible to your site manager while on-site.'],
                    ].map(([icon, title, desc]) => (
                        <div key={title} className="flex gap-3">
                            <span className="text-lg shrink-0 mt-0.5">{icon}</span>
                            <div>
                                <p className="text-xs font-bold" style={{ color: 'var(--t-text)' }}>{title}</p>
                                <p className="text-[10px] leading-relaxed" style={{ color: 'var(--t-text3)' }}>{desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
