/**
 * NfcDevicesPanel.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Shows the NFC device fleet for a project and lets admins push the full
 * worker list to individual devices or all at once.
 *
 * Problem it solves:
 *   When a device's local user table is empty (e.g. first boot, after reset)
 *   door/relay/buzzer returns "UNAUTHORIZED" even though workers are enrolled
 *   in Django.  This panel lets you instantly sync the worker list to the
 *   device without waiting for an MQTT reconnect cycle.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { attendanceService } from '../../services/attendanceService';

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeSince(iso) {
    if (!iso) return 'never';
    const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
    if (diff < 60)   return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

function isOnline(last_seen, minutes = 10) {
    if (!last_seen) return false;
    return (Date.now() - new Date(last_seen)) < minutes * 60 * 1000;
}

const MODE_COLOR = {
    door_lock:  '#6366f1',
    attendance: '#059669',
    hybrid:     '#d97706',
};

const MODE_LABEL = {
    door_lock:  '🔐 Door Lock',
    attendance: '📋 Attendance',
    hybrid:     '⚡ Hybrid',
};

// ── Device card ───────────────────────────────────────────────────────────────

function DeviceCard({ device, projectId, onPushed }) {
    const [pushing, setPushing] = useState(false);
    const [result,  setResult]  = useState(null);  // { ok, workers, error }
    const online = isOnline(device.last_seen);

    const handlePush = async () => {
        setPushing(true);
        setResult(null);
        try {
            const res = await attendanceService.pushUsersToDevice(projectId, device.mac);
            setResult({ ok: true, workers: res.workers });
            onPushed && onPushed(device.mac, res.workers);
        } catch (err) {
            const msg = err?.response?.data?.error || err.message || 'Push failed';
            setResult({ ok: false, error: msg });
        } finally {
            setPushing(false);
        }
    };

    return (
        <div style={{
            background: 'var(--t-surface)',
            border: `1.5px solid ${online ? '#22c55e33' : 'var(--t-border)'}`,
            borderRadius: 14,
            padding: '16px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
        }}>
            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: online ? '#22c55e' : '#d1d5db',
                    flexShrink: 0,
                    boxShadow: online ? '0 0 6px #22c55e88' : 'none',
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--t-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {device.device_name || 'Unnamed Device'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--t-text3)', fontFamily: 'monospace' }}>
                        {device.mac}  ·  {device.ip_address || '—'}
                    </div>
                </div>
                <span style={{
                    fontSize: 11, fontWeight: 700, padding: '2px 8px',
                    borderRadius: 20,
                    background: (MODE_COLOR[device.device_mode] || '#94a3b8') + '22',
                    color: MODE_COLOR[device.device_mode] || '#94a3b8',
                }}>
                    {MODE_LABEL[device.device_mode] || device.device_mode || 'unknown'}
                </span>
            </div>

            {/* Stats row */}
            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--t-text3)' }}>
                <span>fw {device.firmware_version || '—'}</span>
                <span>gate: {device.gate_id || '—'}</span>
                <span>scans: {device.total_scans ?? 0}</span>
                <span style={{ marginLeft: 'auto' }}>seen {timeSince(device.last_seen)}</span>
            </div>

            {/* Push button + result */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                    onClick={handlePush}
                    disabled={pushing}
                    style={{
                        padding: '7px 18px',
                        borderRadius: 8,
                        border: 'none',
                        background: pushing ? 'var(--t-border)' : '#6366f1',
                        color: pushing ? 'var(--t-text3)' : '#fff',
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: pushing ? 'not-allowed' : 'pointer',
                        transition: 'background .2s',
                    }}
                >
                    {pushing ? '⏳ Pushing…' : '📤 Push Members'}
                </button>

                {result && (
                    <span style={{
                        fontSize: 12, fontWeight: 700,
                        color: result.ok ? '#059669' : '#ef4444',
                    }}>
                        {result.ok
                            ? `✓ ${result.workers} workers synced`
                            : `✗ ${result.error}`}
                    </span>
                )}
            </div>
        </div>
    );
}

// ── Main panel ────────────────────────────────────────────────────────────────

export default function NfcDevicesPanel({ projectId }) {
    const [devices,     setDevices]     = useState([]);
    const [loading,     setLoading]     = useState(false);
    const [error,       setError]       = useState(null);
    const [pushingAll,  setPushingAll]  = useState(false);
    const [pushAllResult, setPushAllResult] = useState(null);

    const load = useCallback(async () => {
        if (!projectId) return;
        setLoading(true);
        setError(null);
        try {
            const data = await attendanceService.getNfcDevices(projectId);
            setDevices(data.devices || []);
        } catch (err) {
            setError(err?.response?.data?.error || 'Failed to load devices');
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => { load(); }, [load]);

    const handlePushAll = async () => {
        setPushingAll(true);
        setPushAllResult(null);
        try {
            const res = await attendanceService.pushUsersToDevice(projectId, null);
            setPushAllResult({ ok: true, workers: res.workers, pushed: res.pushed });
        } catch (err) {
            const msg = err?.response?.data?.error || err.message || 'Push failed';
            setPushAllResult({ ok: false, error: msg });
        } finally {
            setPushingAll(false);
        }
    };

    const onlineCount = devices.filter(d => isOnline(d.last_seen)).length;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div>
                    <div style={{ fontWeight: 900, fontSize: 17, color: 'var(--t-text)' }}>
                        📡 NFC Devices
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--t-text3)', marginTop: 2 }}>
                        {loading ? 'Loading…'
                            : devices.length === 0 ? 'No devices registered yet'
                            : `${devices.length} device${devices.length !== 1 ? 's' : ''} · ${onlineCount} online`}
                    </div>
                </div>

                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                    {/* Push-all button */}
                    {devices.length > 0 && (
                        <button
                            onClick={handlePushAll}
                            disabled={pushingAll}
                            title="Push full worker list to every device in this project"
                            style={{
                                padding: '7px 16px',
                                borderRadius: 8,
                                border: 'none',
                                background: pushingAll ? 'var(--t-border)' : '#059669',
                                color: pushingAll ? 'var(--t-text3)' : '#fff',
                                fontWeight: 700,
                                fontSize: 13,
                                cursor: pushingAll ? 'not-allowed' : 'pointer',
                            }}
                        >
                            {pushingAll ? '⏳ Pushing…' : '📤 Push to All Devices'}
                        </button>
                    )}

                    {/* Refresh */}
                    <button
                        onClick={load}
                        disabled={loading}
                        style={{
                            padding: '7px 12px',
                            borderRadius: 8,
                            border: '1.5px solid var(--t-border)',
                            background: 'var(--t-surface)',
                            color: 'var(--t-text)',
                            fontWeight: 700,
                            fontSize: 13,
                            cursor: loading ? 'not-allowed' : 'pointer',
                        }}
                    >
                        🔄
                    </button>
                </div>
            </div>

            {/* Push-all result banner */}
            {pushAllResult && (
                <div style={{
                    padding: '10px 14px',
                    borderRadius: 10,
                    background: pushAllResult.ok ? '#f0fdf4' : '#fef2f2',
                    border: `1px solid ${pushAllResult.ok ? '#86efac' : '#fca5a5'}`,
                    color: pushAllResult.ok ? '#166534' : '#991b1b',
                    fontWeight: 600,
                    fontSize: 13,
                }}>
                    {pushAllResult.ok
                        ? `✓ Pushed ${pushAllResult.workers} workers to ${pushAllResult.pushed} device(s). Cards will be accepted within seconds.`
                        : `✗ ${pushAllResult.error}`}
                </div>
            )}

            {/* Error */}
            {error && (
                <div style={{ color: '#ef4444', fontSize: 13, fontWeight: 600 }}>{error}</div>
            )}

            {/* No devices yet */}
            {!loading && devices.length === 0 && !error && (
                <div style={{
                    padding: '28px 20px',
                    textAlign: 'center',
                    background: 'var(--t-surface)',
                    borderRadius: 14,
                    border: '1.5px dashed var(--t-border)',
                    color: 'var(--t-text3)',
                    fontSize: 13,
                }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>📡</div>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>No NFC devices seen yet</div>
                    <div>Devices appear here automatically once they connect to MQTT and announce themselves.</div>
                    <div style={{ marginTop: 6 }}>Make sure the MQTT listener is running and the device is powered on.</div>
                </div>
            )}

            {/* Device list */}
            {devices.map(device => (
                <DeviceCard
                    key={device.mac}
                    device={device}
                    projectId={projectId}
                    onPushed={(mac, count) => {
                        setDevices(prev => prev.map(d =>
                            d.mac === mac ? { ...d, _lastPush: count } : d
                        ));
                    }}
                />
            ))}

            {/* How it works hint */}
            {devices.length > 0 && (
                <div style={{
                    fontSize: 11, color: 'var(--t-text3)', lineHeight: 1.6,
                    padding: '8px 12px',
                    background: 'var(--t-bg)',
                    borderRadius: 8,
                }}>
                    <strong>How it works:</strong> "Push Members" sends the full active worker list to that device via MQTT.
                    The device stores it locally — cards work instantly even when the server is offline.
                    Devices also auto-sync whenever they reconnect to the broker.
                </div>
            )}
        </div>
    );
}
