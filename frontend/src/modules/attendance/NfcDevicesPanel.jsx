/**
 * NfcDevicesPanel.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Shows the NFC device fleet for a project and lets admins:
 *   • Push the full worker list to individual devices or all at once
 *   • Manually register devices that haven't connected via MQTT yet
 *   • Edit or remove manually registered devices
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

function hasError(device) {
    const e = (device.error_state || '').trim();
    return e !== '' && e.toUpperCase() !== 'OK';
}

const ERROR_COLOR = {
    'No Wi-Fi':       { bg: '#fef2f2', border: '#fca5a5', text: '#991b1b', icon: '📡' },
    'No MQTT':        { bg: '#fff7ed', border: '#fed7aa', text: '#9a3412', icon: '🔌' },
    'PN532 Error':    { bg: '#fef2f2', border: '#fca5a5', text: '#991b1b', icon: '🔧' },
    'Door Left Open': { bg: '#fffbeb', border: '#fde68a', text: '#92400e', icon: '🚪' },
};

function errorStyle(state) {
    return ERROR_COLOR[state] || { bg: '#fef2f2', border: '#fca5a5', text: '#991b1b', icon: '⚠️' };
}

const MODE_COLOR = {
    door_lock:  '#6366f1',
    attendance: '#059669',
    hybrid:     '#d97706',
    unknown:    '#94a3b8',
};

const MODE_LABEL = {
    door_lock:  '🔐 Door Lock',
    attendance: '📋 Attendance',
    hybrid:     '⚡ Hybrid',
    unknown:    '❓ Unknown',
};

// ── Register / Edit Device Modal ──────────────────────────────────────────────

const EMPTY_FORM = { mac: '', device_name: '', gate_id: '', device_mode: 'attendance' };

function RegisterDeviceModal({ projectId, editDevice, onSaved, onClose }) {
    const isEdit = Boolean(editDevice);
    const [form, setForm] = useState(isEdit ? {
        mac:         editDevice.mac,
        device_name: editDevice.device_name || '',
        gate_id:     editDevice.gate_id || '',
        device_mode: editDevice.device_mode || 'attendance',
    } : { ...EMPTY_FORM });
    const [saving, setSaving] = useState(false);
    const [error,  setError]  = useState('');

    const set = (key, val) => setForm(p => ({ ...p, [key]: val }));

    const handleSave = async () => {
        if (!form.mac.trim()) { setError('MAC address is required'); return; }
        setError('');
        setSaving(true);
        try {
            if (isEdit) {
                await attendanceService.updateNfcDevice({ ...form });
            } else {
                await attendanceService.registerNfcDevice({ ...form, project: projectId });
            }
            onSaved();
        } catch (err) {
            const msg = err?.response?.data?.error || err.message || 'Save failed';
            setError(msg);
        } finally {
            setSaving(false);
        }
    };

    const overlay = {
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
    };
    const modal = {
        background: 'var(--t-surface)',
        border: '1.5px solid var(--t-border)',
        borderRadius: 16,
        padding: 28,
        width: '100%', maxWidth: 440,
        display: 'flex', flexDirection: 'column', gap: 18,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    };
    const label = { fontSize: 12, fontWeight: 700, color: 'var(--t-text2)', marginBottom: 4 };
    const input = {
        width: '100%', boxSizing: 'border-box',
        padding: '9px 12px', borderRadius: 8,
        border: '1.5px solid var(--t-border)',
        background: 'var(--t-bg)',
        color: 'var(--t-text)',
        fontSize: 13,
        outline: 'none',
    };

    return (
        <div style={overlay} onClick={e => e.target === e.currentTarget && onClose()}>
            <div style={modal}>
                <div style={{ fontWeight: 900, fontSize: 17, color: 'var(--t-text)' }}>
                    {isEdit ? '✏️ Edit Device' : '➕ Register NFC Device'}
                </div>

                {/* MAC Address */}
                <div>
                    <div style={label}>MAC Address *</div>
                    <input
                        style={{ ...input, fontFamily: 'monospace' }}
                        value={form.mac}
                        onChange={e => set('mac', e.target.value)}
                        placeholder="AABBCCDDEEFF or AA:BB:CC:DD:EE:FF"
                        disabled={isEdit}
                    />
                    {!isEdit && (
                        <div style={{ fontSize: 11, color: 'var(--t-text3)', marginTop: 4 }}>
                            Found on device label, web UI, or MQTT announce payload.
                        </div>
                    )}
                </div>

                {/* Device Name */}
                <div>
                    <div style={label}>Device Name</div>
                    <input
                        style={input}
                        value={form.device_name}
                        onChange={e => set('device_name', e.target.value)}
                        placeholder="e.g. Main Gate, Site A Entry"
                    />
                </div>

                {/* Gate ID */}
                <div>
                    <div style={label}>Gate ID</div>
                    <input
                        style={input}
                        value={form.gate_id}
                        onChange={e => set('gate_id', e.target.value)}
                        placeholder="e.g. main_gate, gate_1 (optional)"
                    />
                </div>

                {/* Device Mode */}
                <div>
                    <div style={label}>Device Mode</div>
                    <select
                        style={{ ...input, cursor: 'pointer' }}
                        value={form.device_mode}
                        onChange={e => set('device_mode', e.target.value)}
                    >
                        <option value="attendance">📋 Attendance — scan events only</option>
                        <option value="door_lock">🔐 Door Lock — relay control only</option>
                        <option value="hybrid">⚡ Hybrid — relay + attendance</option>
                        <option value="unknown">❓ Unknown</option>
                    </select>
                </div>

                {error && (
                    <div style={{
                        padding: '8px 12px', borderRadius: 8,
                        background: '#fef2f2', border: '1px solid #fca5a5',
                        color: '#991b1b', fontSize: 12, fontWeight: 600,
                    }}>
                        {error}
                    </div>
                )}

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <button onClick={onClose} disabled={saving} style={{
                        padding: '8px 18px', borderRadius: 8,
                        border: '1.5px solid var(--t-border)',
                        background: 'var(--t-surface)', color: 'var(--t-text)',
                        fontWeight: 700, fontSize: 13, cursor: 'pointer',
                    }}>
                        Cancel
                    </button>
                    <button onClick={handleSave} disabled={saving} style={{
                        padding: '8px 20px', borderRadius: 8, border: 'none',
                        background: saving ? 'var(--t-border)' : '#6366f1',
                        color: saving ? 'var(--t-text3)' : '#fff',
                        fontWeight: 700, fontSize: 13,
                        cursor: saving ? 'not-allowed' : 'pointer',
                    }}>
                        {saving ? '⏳ Saving…' : isEdit ? '💾 Save Changes' : '✅ Register Device'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Confirm Delete Modal ──────────────────────────────────────────────────────

function ConfirmDeleteModal({ device, onConfirm, onClose, deleting }) {
    const overlay = {
        position: 'fixed', inset: 0, zIndex: 2100,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
    };
    const modal = {
        background: 'var(--t-surface)',
        border: '1.5px solid #fca5a5',
        borderRadius: 14, padding: 24,
        width: '100%', maxWidth: 380,
        display: 'flex', flexDirection: 'column', gap: 16,
    };
    return (
        <div style={overlay} onClick={e => e.target === e.currentTarget && onClose()}>
            <div style={modal}>
                <div style={{ fontWeight: 900, fontSize: 15, color: '#991b1b' }}>🗑 Remove Device</div>
                <div style={{ fontSize: 13, color: 'var(--t-text2)' }}>
                    Remove <strong>{device.device_name || device.mac}</strong> from this project?<br />
                    The device will reappear automatically if it reconnects via MQTT.
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <button onClick={onClose} disabled={deleting} style={{
                        padding: '7px 16px', borderRadius: 8,
                        border: '1.5px solid var(--t-border)',
                        background: 'var(--t-surface)', color: 'var(--t-text)',
                        fontWeight: 700, fontSize: 13, cursor: 'pointer',
                    }}>
                        Cancel
                    </button>
                    <button onClick={onConfirm} disabled={deleting} style={{
                        padding: '7px 16px', borderRadius: 8, border: 'none',
                        background: deleting ? 'var(--t-border)' : '#ef4444',
                        color: '#fff', fontWeight: 700, fontSize: 13,
                        cursor: deleting ? 'not-allowed' : 'pointer',
                    }}>
                        {deleting ? '⏳ Removing…' : '🗑 Remove'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Device card ───────────────────────────────────────────────────────────────

function DeviceCard({ device, projectId, onPushed, onEdit, onDelete }) {
    const [pushing,   setPushing]   = useState(false);
    const [rebooting, setRebooting] = useState(false);
    const [result,    setResult]    = useState(null);
    const online  = isOnline(device.last_seen);
    const inError = hasError(device);
    const eStyle  = inError ? errorStyle(device.error_state) : null;

    const handlePush = async () => {
        setPushing(true);
        setResult(null);
        try {
            const res = await attendanceService.pushUsersToDevice(projectId, device.mac);
            setResult({ ok: true, workers: res.workers });
            onPushed && onPushed(device.mac, res.workers);
        } catch (err) {
            setResult({ ok: false, error: err?.response?.data?.error || err.message || 'Push failed' });
        } finally {
            setPushing(false);
        }
    };

    const handleReboot = async () => {
        if (!window.confirm(`Reboot ${device.device_name || device.mac}?`)) return;
        setRebooting(true);
        setResult(null);
        try {
            await attendanceService.rebootDevice(projectId, device.mac);
            setResult({ ok: true, reboot: true });
        } catch (err) {
            setResult({ ok: false, error: err?.response?.data?.error || err.message || 'Reboot failed' });
        } finally {
            setRebooting(false);
        }
    };

    return (
        <div style={{
            background: 'var(--t-surface)',
            border: `1.5px solid ${inError ? eStyle.border : online ? '#22c55e33' : 'var(--t-border)'}`,
            borderRadius: 14,
            padding: '16px 18px',
            display: 'flex', flexDirection: 'column', gap: 10,
        }}>
            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                    width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                    background: inError ? '#ef4444' : online ? '#22c55e' : '#d1d5db',
                    boxShadow: inError ? '0 0 6px #ef444488' : online ? '0 0 6px #22c55e88' : 'none',
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
                    fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                    background: (MODE_COLOR[device.device_mode] || '#94a3b8') + '22',
                    color: MODE_COLOR[device.device_mode] || '#94a3b8',
                }}>
                    {MODE_LABEL[device.device_mode] || device.device_mode || 'unknown'}
                </span>
                <button onClick={() => onEdit(device)} title="Edit device" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, padding: '2px 4px', color: 'var(--t-text3)' }}>✏️</button>
                <button onClick={() => onDelete(device)} title="Remove device" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, padding: '2px 4px', color: 'var(--t-text3)' }}>🗑</button>
            </div>

            {/* Error banner */}
            {inError && (
                <div style={{
                    display: 'flex', alignItems: 'flex-start', gap: 8,
                    padding: '8px 12px', borderRadius: 8,
                    background: eStyle.bg, border: `1px solid ${eStyle.border}`,
                    color: eStyle.text, fontSize: 12, fontWeight: 600,
                }}>
                    <span style={{ fontSize: 15, flexShrink: 0 }}>{eStyle.icon}</span>
                    <div style={{ flex: 1 }}>
                        <div>{device.error_state}</div>
                        {device.error_since && (
                            <div style={{ fontWeight: 400, marginTop: 2, opacity: 0.8 }}>
                                Since {timeSince(device.error_since)} · Push disabled until resolved
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Stats row */}
            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--t-text3)', flexWrap: 'wrap' }}>
                <span>fw {device.firmware_version || '—'}</span>
                <span>gate: {device.gate_id || '—'}</span>
                <span>scans: {device.total_scans ?? 0}</span>
                <span style={{ marginLeft: 'auto' }}>seen {timeSince(device.last_seen)}</span>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <button
                    onClick={handlePush}
                    disabled={pushing || inError}
                    title={inError ? `Push blocked: ${device.error_state}` : 'Push worker list to this device'}
                    style={{
                        padding: '7px 16px', borderRadius: 8, border: 'none',
                        background: (pushing || inError) ? 'var(--t-border)' : '#6366f1',
                        color: (pushing || inError) ? 'var(--t-text3)' : '#fff',
                        fontWeight: 700, fontSize: 13,
                        cursor: (pushing || inError) ? 'not-allowed' : 'pointer',
                        opacity: inError ? 0.55 : 1,
                    }}
                >
                    {pushing ? '⏳ Pushing…' : inError ? '🚫 Push Blocked' : '📤 Push Members'}
                </button>

                <button
                    onClick={handleReboot}
                    disabled={rebooting}
                    title="Reboot this device"
                    style={{
                        padding: '7px 12px', borderRadius: 8,
                        border: '1.5px solid var(--t-border)',
                        background: 'var(--t-surface)', color: 'var(--t-text2)',
                        fontWeight: 700, fontSize: 12,
                        cursor: rebooting ? 'not-allowed' : 'pointer',
                    }}
                >
                    {rebooting ? '⏳' : '🔄 Reboot'}
                </button>

                {result && (
                    <span style={{ fontSize: 12, fontWeight: 700, color: result.ok ? '#059669' : '#ef4444' }}>
                        {result.ok
                            ? result.reboot ? '✓ Reboot command sent' : `✓ ${result.workers} workers synced`
                            : `✗ ${result.error}`}
                    </span>
                )}
            </div>
        </div>
    );
}

// ── Main panel ────────────────────────────────────────────────────────────────

export default function NfcDevicesPanel({ projectId }) {
    const [devices,        setDevices]        = useState([]);
    const [loading,        setLoading]        = useState(false);
    const [error,          setError]          = useState(null);
    const [pushingAll,     setPushingAll]      = useState(false);
    const [pushAllResult,  setPushAllResult]   = useState(null);

    // Modal state
    const [showRegister,   setShowRegister]    = useState(false);
    const [editDevice,     setEditDevice]      = useState(null);
    const [deleteTarget,   setDeleteTarget]    = useState(null);
    const [deleting,       setDeleting]        = useState(false);

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
        const errorDevices = devices.filter(d => hasError(d));
        try {
            const res = await attendanceService.pushUsersToDevice(projectId, null);
            setPushAllResult({
                ok: true, workers: res.workers, pushed: res.pushed,
                skipped: errorDevices.length,
                skippedNames: errorDevices.map(d => d.device_name || d.mac),
            });
        } catch (err) {
            setPushAllResult({ ok: false, error: err?.response?.data?.error || err.message || 'Push failed' });
        } finally {
            setPushingAll(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await attendanceService.deleteNfcDevice(deleteTarget.mac);
            setDeleteTarget(null);
            load();
        } catch (err) {
            alert(err?.response?.data?.error || 'Delete failed');
        } finally {
            setDeleting(false);
        }
    };

    const onlineCount = devices.filter(d => isOnline(d.last_seen)).length;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Modals */}
            {(showRegister || editDevice) && (
                <RegisterDeviceModal
                    projectId={projectId}
                    editDevice={editDevice}
                    onSaved={() => { setShowRegister(false); setEditDevice(null); load(); }}
                    onClose={() => { setShowRegister(false); setEditDevice(null); }}
                />
            )}
            {deleteTarget && (
                <ConfirmDeleteModal
                    device={deleteTarget}
                    deleting={deleting}
                    onConfirm={handleDelete}
                    onClose={() => setDeleteTarget(null)}
                />
            )}

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

                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => { setEditDevice(null); setShowRegister(true); }}
                        style={{
                            padding: '7px 14px', borderRadius: 8, border: 'none',
                            background: '#6366f1', color: '#fff',
                            fontWeight: 700, fontSize: 13, cursor: 'pointer',
                        }}
                    >
                        ➕ Register Device
                    </button>

                    {devices.length > 0 && (
                        <button
                            onClick={handlePushAll}
                            disabled={pushingAll}
                            style={{
                                padding: '7px 14px', borderRadius: 8, border: 'none',
                                background: pushingAll ? 'var(--t-border)' : '#059669',
                                color: pushingAll ? 'var(--t-text3)' : '#fff',
                                fontWeight: 700, fontSize: 13,
                                cursor: pushingAll ? 'not-allowed' : 'pointer',
                            }}
                        >
                            {pushingAll ? '⏳ Pushing…' : '📤 Push to All'}
                        </button>
                    )}

                    <button
                        onClick={load}
                        disabled={loading}
                        style={{
                            padding: '7px 12px', borderRadius: 8,
                            border: '1.5px solid var(--t-border)',
                            background: 'var(--t-surface)', color: 'var(--t-text)',
                            fontWeight: 700, fontSize: 13,
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
                    padding: '10px 14px', borderRadius: 10,
                    background: pushAllResult.ok ? '#f0fdf4' : '#fef2f2',
                    border: `1px solid ${pushAllResult.ok ? '#86efac' : '#fca5a5'}`,
                    color: pushAllResult.ok ? '#166534' : '#991b1b',
                    fontWeight: 600, fontSize: 13,
                }}>
                    {pushAllResult.ok ? (
                        <div>
                            <div>✓ Pushed {pushAllResult.workers} workers to {pushAllResult.pushed} device(s). Cards will be accepted within seconds.</div>
                            {pushAllResult.skipped > 0 && (
                                <div style={{ marginTop: 4, color: '#92400e', fontWeight: 500 }}>
                                    ⚠ {pushAllResult.skipped} skipped (error): {pushAllResult.skippedNames?.join(', ')}
                                </div>
                            )}
                        </div>
                    ) : `✗ ${pushAllResult.error}`}
                </div>
            )}

            {/* Error */}
            {error && (
                <div style={{ color: '#ef4444', fontSize: 13, fontWeight: 600 }}>{error}</div>
            )}

            {/* Empty state */}
            {!loading && devices.length === 0 && !error && (
                <div style={{
                    padding: '32px 24px', textAlign: 'center',
                    background: 'var(--t-surface)',
                    borderRadius: 14,
                    border: '1.5px dashed var(--t-border)',
                    color: 'var(--t-text3)', fontSize: 13,
                }}>
                    <div style={{ fontSize: 36, marginBottom: 10 }}>📡</div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--t-text)', marginBottom: 6 }}>
                        No NFC devices registered yet
                    </div>
                    <div style={{ marginBottom: 4 }}>
                        Devices appear here automatically once they connect to MQTT and send an announce heartbeat.
                    </div>
                    <div style={{ marginBottom: 16 }}>
                        Don't have a physical device connected yet? Register it manually to test push and access-control features.
                    </div>
                    <button
                        onClick={() => { setEditDevice(null); setShowRegister(true); }}
                        style={{
                            padding: '9px 22px', borderRadius: 8, border: 'none',
                            background: '#6366f1', color: '#fff',
                            fontWeight: 700, fontSize: 14, cursor: 'pointer',
                        }}
                    >
                        ➕ Register Device Manually
                    </button>
                </div>
            )}

            {/* Device cards */}
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
                    onEdit={dev => { setEditDevice(dev); setShowRegister(false); }}
                    onDelete={dev => setDeleteTarget(dev)}
                />
            ))}

            {/* How it works hint */}
            {devices.length > 0 && (
                <div style={{
                    fontSize: 11, color: 'var(--t-text3)', lineHeight: 1.6,
                    padding: '8px 12px', background: 'var(--t-bg)', borderRadius: 8,
                }}>
                    <strong>How it works:</strong> "Push Members" sends the full active worker list to that device via MQTT.
                    The device stores cards locally — scans work even when the server is offline.
                    Devices also auto-sync whenever they reconnect to the broker.
                    Manually registered devices get all push/reboot features immediately; live scan events appear once the device connects.
                </div>
            )}
        </div>
    );
}
