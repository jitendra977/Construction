/**
 * MobileTrackingPage
 * ───────────────────
 * Worker's personal GPS status page on mobile.
 * Shows: on-site indicator, geofence name, GPS accuracy, last ping, coords.
 * Reads from MobileTrackerContext — no second GPS watch started.
 */
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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

// Map error codes → human-readable messages
const ERROR_MESSAGES = {
    denied:      'Location access was denied.',
    unavailable: 'GPS signal is unavailable. Try moving outdoors.',
    timeout:     'GPS timed out. Weak signal or indoors?',
    unsupported: 'This browser does not support GPS.',
    insecure_context: 'HTTPS Required: Geolocation is blocked on non-secure (HTTP) connections.',
};

function AccuracyBar({ accuracy }) {
    const pct   = Math.max(0, Math.min(100, ((50 - accuracy) / 50) * 100));
    const color = accuracy <= 10 ? '#10b981' : accuracy <= 25 ? '#f59e0b' : '#ef4444';
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, height: 4, borderRadius: 99, background: 'var(--t-border)', overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 99, width: `${pct}%`, background: color, transition: 'width 0.5s ease' }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color, minWidth: 40, textAlign: 'right' }}>
                ±{Math.round(accuracy)}m
            </span>
        </div>
    );
}

// ── Status card config ────────────────────────────────────────────────────────
const STATUS_CONFIG = {
    idle: {
        dot: '#9ca3af', pulse: false,
        icon: '📡', title: 'Waiting for GPS…', subtitle: 'Acquiring your position',
    },
    tracking: {
        dot: '#3b82f6', pulse: true,
        icon: '📡', title: 'Tracking Active', subtitle: 'Searching for a site boundary',
    },
    on_site: {
        dot: '#10b981', pulse: true,
        icon: '✅', title: 'On-Site', subtitle: null,
    },
    off_site: {
        dot: '#6b7280', pulse: false,
        icon: '🏠', title: 'Off-Site', subtitle: 'Not inside any project boundary',
    },
    error: {
        dot: '#ef4444', pulse: false,
        icon: '⚠️', title: 'GPS Error', subtitle: null,
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

// ── Card ──────────────────────────────────────────────────────────────────────
function Card({ children, style = {} }) {
    return (
        <div style={{
            background: 'var(--t-surface)',
            border: '1px solid var(--t-border)',
            borderRadius: 16,
            padding: 16,
            ...style,
        }}>
            {children}
        </div>
    );
}

// ── Permission Denied UI ──────────────────────────────────────────────────────
function PermissionDeniedCard({ onRetry, error }) {
    const isAndroid = /Android/i.test(navigator.userAgent);
    const isInsecure = error === 'insecure_context';

    const steps = isInsecure
        ? [
            'Access via HTTPS (preferred)',
            'Or use "localhost" if testing on device',
            'Chrome: Open chrome://flags/#unsafely-treat-insecure-origin-as-secure',
            'Add your IP: http://' + window.location.host + ' to the list and Relaunch'
        ]
        : isAndroid
            ? ['Tap the 🔒 lock icon in the address bar', 'Tap Permissions → Location', 'Switch it to Allow', 'Reload the page']
            : ['Open browser Settings → Privacy & Security', 'Find Site Permissions → Location', 'Allow location for this site', 'Reload the page'];

    return (
        <Card style={{ borderLeft: '3px solid #ef4444' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--t-text)', marginBottom: 4 }}>
                {isInsecure ? '🔒 Security Restriction' : '📵 Location Access Blocked'}
            </p>
            <p style={{ fontSize: 12, color: 'var(--t-text3)', marginBottom: 16, lineHeight: 1.5 }}>
                {isInsecure
                    ? 'Browsers block GPS on non-secure connections (HTTP). You must use HTTPS or authorize this IP in browser flags.'
                    : 'You previously denied GPS access. To enable automatic check-in, follow these steps:'}
            </p>

            <div style={{ marginBottom: 16 }}>
                {steps.map((step, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                        <div style={{
                            width: 20, height: 20, borderRadius: '50%', background: 'var(--t-surface2)',
                            border: '1px solid var(--t-border)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0, fontSize: 9, fontWeight: 800, color: 'var(--t-text3)',
                        }}>
                            {i + 1}
                        </div>
                        <p style={{ fontSize: 12, color: 'var(--t-text2)', lineHeight: 1.5, paddingTop: 1 }}>{step}</p>
                    </div>
                ))}
            </div>

            {!isInsecure && (
                <button
                    onClick={onRetry}
                    style={{
                        width: '100%', padding: '12px 0', borderRadius: 12,
                        background: 'var(--t-primary)', color: '#fff',
                        border: 'none', cursor: 'pointer',
                        fontSize: 13, fontWeight: 700,
                    }}
                >
                    Try Again
                </button>
            )}
        </Card>
    );
}

// ── Permission Prompt UI ──────────────────────────────────────────────────────
function PermissionPromptCard({ onEnable }) {
    return (
        <Card style={{ borderLeft: '3px solid var(--t-primary)' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--t-text)', marginBottom: 4 }}>
                📍 Enable GPS Tracking
            </p>
            <p style={{ fontSize: 12, color: 'var(--t-text3)', marginBottom: 16, lineHeight: 1.5 }}>
                Allow location access so your attendance is recorded automatically when you arrive on-site.
                Your position is only visible to your site manager.
            </p>
            <button
                onClick={onEnable}
                style={{
                    width: '100%', padding: '12px 0', borderRadius: 12,
                    background: 'var(--t-primary)', color: '#fff',
                    border: 'none', cursor: 'pointer',
                    fontSize: 13, fontWeight: 700,
                }}
            >
                Enable GPS Tracking
            </button>
        </Card>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function MobileTrackingPage() {
    const tracker = useMobileTracker();

    if (!tracker) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                <p style={{ fontSize: 13, color: 'var(--t-text3)' }}>Tracking not available.</p>
            </div>
        );
    }

    const {
        permission, position, status, geofenceName,
        error, lastPingAt, pingCount, requestPermission,
    } = tracker;

    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.idle;
    const errMsg = ERROR_MESSAGES[error] || error || null;

    // Show full permission UI if not yet granted
    const needsPermission = permission === 'prompt' || permission === 'unknown';
    const isDenied        = permission === 'denied';

    return (
        <div style={{ minHeight: '100vh', paddingBottom: 110, paddingTop: 24, padding: '24px 16px 110px', background: 'var(--t-bg)', color: 'var(--t-text)' }}>

            {/* ── Page title ── */}
            <div style={{ marginBottom: 20 }}>
                <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--t-text)', letterSpacing: '-0.02em', lineHeight: 1 }}>
                    My Location
                </h1>
                <p style={{ fontSize: 12, color: 'var(--t-text3)', marginTop: 4, fontWeight: 500 }}>
                    GPS tracking · automatic site check-in
                </p>
            </div>

            {/* ── Permission: needs to enable ── */}
            {needsPermission && (
                <div style={{ marginBottom: 16 }}>
                    <PermissionPromptCard onEnable={requestPermission} />
                </div>
            )}

            {/* ── Permission: denied ── */}
            {isDenied && (
                <div style={{ marginBottom: 16 }}>
                    <PermissionDeniedCard onRetry={requestPermission} error={error} />
                </div>
            )}

            {/* ── Main status card ── */}
            <Card style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {/* Pulsing dot */}
                        <div style={{ position: 'relative', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {cfg.pulse && (
                                <span style={{
                                    position: 'absolute', width: '100%', height: '100%', borderRadius: '50%',
                                    background: cfg.dot, opacity: 0.3, animation: 'ping 1.5s cubic-bezier(0,0,0.2,1) infinite',
                                }} />
                            )}
                            <span style={{ width: 10, height: 10, borderRadius: '50%', background: cfg.dot, flexShrink: 0, display: 'block' }} />
                        </div>
                        <span style={{ fontSize: 36, lineHeight: 1 }}>{cfg.icon}</span>
                    </div>
                    <div style={{
                        fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em',
                        padding: '4px 10px', borderRadius: 20,
                        background: `${cfg.dot}18`, color: cfg.dot, border: `1px solid ${cfg.dot}35`,
                    }}>
                        {status.replace('_', '-')}
                    </div>
                </div>

                <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--t-text)', marginBottom: 4 }}>{cfg.title}</p>

                {status === 'on_site' && geofenceName && (
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#10b981' }}>{geofenceName}</p>
                )}
                {status === 'error' && errMsg && (
                    <p style={{ fontSize: 12, color: '#ef4444', fontWeight: 500 }}>{errMsg}</p>
                )}
                {status !== 'on_site' && status !== 'error' && cfg.subtitle && (
                    <p style={{ fontSize: 12, color: 'var(--t-text3)' }}>{cfg.subtitle}</p>
                )}

                {/* GPS accuracy bar */}
                {position && (
                    <div style={{ marginTop: 16 }}>
                        <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--t-text3)', marginBottom: 6 }}>GPS Accuracy</p>
                        <AccuracyBar accuracy={position.accuracy} />
                    </div>
                )}
            </Card>

            {/* ── Stats grid ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                {/* Last ping */}
                <Card>
                    <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--t-text3)', marginBottom: 6 }}>
                        Last Ping
                    </p>
                    <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--t-text)', lineHeight: 1 }}>
                        {fmtTime(lastPingAt)}
                    </p>
                    {lastPingAt && (
                        <p style={{ fontSize: 10, color: 'var(--t-text3)', marginTop: 4 }}>
                            <LiveAgo date={lastPingAt} />
                        </p>
                    )}
                </Card>

                {/* Total pings */}
                <Card>
                    <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--t-text3)', marginBottom: 6 }}>
                        Pings Sent
                    </p>
                    <p style={{ fontSize: 28, fontWeight: 800, color: 'var(--t-primary)', lineHeight: 1 }}>
                        {pingCount}
                    </p>
                    <p style={{ fontSize: 10, color: 'var(--t-text3)', marginTop: 4 }}>this session</p>
                </Card>
            </div>

            {/* ── Coordinates ── */}
            {position && (
                <Card style={{ marginBottom: 12 }}>
                    <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--t-text3)', marginBottom: 12 }}>
                        GPS Coordinates
                    </p>
                    <div style={{ fontFamily: 'monospace', fontSize: 12 }}>
                        {[
                            ['Latitude',  `${position.lat.toFixed(6)}°`],
                            ['Longitude', `${position.lon.toFixed(6)}°`],
                            ['Accuracy',  `±${Math.round(position.accuracy)} m`],
                            ...(position.heading != null ? [['Heading', `${Math.round(position.heading)}°`]] : []),
                        ].map(([lbl, val], i, arr) => (
                            <div key={lbl} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '8px 0',
                                borderBottom: i < arr.length - 1 ? '1px solid var(--t-border)' : 'none',
                            }}>
                                <span style={{ color: 'var(--t-text3)', fontSize: 12 }}>{lbl}</span>
                                <span style={{ fontWeight: 700, color: 'var(--t-text)', fontSize: 12 }}>{val}</span>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* ── How it works ── */}
            <Card>
                <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--t-text3)', marginBottom: 14 }}>
                    How it works
                </p>
                <div>
                    {[
                        ['📡', 'Auto check-in',   'GPS detects when you enter a site boundary and logs your arrival time.'],
                        ['🔋', 'Battery-friendly', 'Pings only when you move 15m+ or every 45 seconds. Minimal battery use.'],
                        ['🔒', 'Private',          'Your position is only visible to your site manager while on-site.'],
                    ].map(([icon, title, desc], i, arr) => (
                        <div key={title} style={{
                            display: 'flex', gap: 12,
                            paddingBottom: i < arr.length - 1 ? 12 : 0,
                            marginBottom: i < arr.length - 1 ? 12 : 0,
                            borderBottom: i < arr.length - 1 ? '1px solid var(--t-border)' : 'none',
                        }}>
                            <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{icon}</span>
                            <div>
                                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--t-text)', marginBottom: 2 }}>{title}</p>
                                <p style={{ fontSize: 11, color: 'var(--t-text3)', lineHeight: 1.5 }}>{desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>

            {/* CSS for ping animation */}
            <style>{`
                @keyframes ping {
                    75%, 100% { transform: scale(2); opacity: 0; }
                }
            `}</style>
        </div>
    );
}
