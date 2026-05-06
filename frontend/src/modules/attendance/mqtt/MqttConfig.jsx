/**
 * MqttConfig.jsx
 * ══════════════
 * Self-contained MQTT broker configuration panel.
 *
 * Lives in its own file so the MQTT integration can be updated without
 * touching SettingsTab.jsx or any other attendance UI.
 *
 * Features:
 *  • Broker host / port / WebSocket port
 *  • Topic pattern with wildcard hint
 *  • Optional username / password credentials
 *  • TLS toggle
 *  • Enable / disable the listener for this project
 *  • "Test Connection" — TCP ping with latency display
 *  • Live status pill (connected / disconnected / error / unknown)
 *  • Recent scan events table (last 10 rows, auto-refreshes every 8 s)
 *
 * Props:
 *   projectId  {number}  required
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import mqttService from '../../../services/mqttService';

// ══════════════════════════════════════════════════════════════════════════════
// Tiny UI atoms
// ══════════════════════════════════════════════════════════════════════════════

const s = {
    card: {
        background:   'var(--t-surface)',
        border:       '1.5px solid var(--t-border)',
        borderRadius: 16,
        padding:      24,
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 13, fontWeight: 800, color: 'var(--t-text2)',
        textTransform: 'uppercase', letterSpacing: '.06em',
        marginBottom: 18,
    },
    row: { marginBottom: 18 },
    label: {
        display: 'block', fontSize: 11, fontWeight: 700,
        color: 'var(--t-text3)', marginBottom: 6,
        textTransform: 'uppercase', letterSpacing: '.05em',
    },
    hint: { fontSize: 11, color: 'var(--t-text3)', marginTop: 4, lineHeight: 1.4 },
    input: {
        padding: '11px 14px', borderRadius: 10, fontSize: 14,
        width: '100%', boxSizing: 'border-box',
        border: '1.5px solid var(--t-border)',
        background: 'var(--t-surface)', color: 'var(--t-text)',
        outline: 'none', transition: 'border-color .15s',
    },
    inputSmall: {
        padding: '11px 14px', borderRadius: 10, fontSize: 14,
        width: '100%', boxSizing: 'border-box',
        border: '1.5px solid var(--t-border)',
        background: 'var(--t-surface)', color: 'var(--t-text)',
        outline: 'none',
    },
    row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 },
    row3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 18 },
    btnPrimary: {
        padding: '11px 22px', borderRadius: 10, fontSize: 14, fontWeight: 700,
        background: 'var(--t-accent)', color: '#fff',
        border: 'none', cursor: 'pointer',
    },
    btnSecondary: {
        padding: '11px 22px', borderRadius: 10, fontSize: 14, fontWeight: 600,
        background: 'var(--t-surface2)', color: 'var(--t-text)',
        border: '1.5px solid var(--t-border)', cursor: 'pointer',
        marginRight: 10,
    },
    btnDanger: {
        padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
        background: 'transparent', color: 'var(--t-red, #e53)',
        border: '1.5px solid var(--t-red, #e53)', cursor: 'pointer',
    },
};

const Input = ({ label, hint, value, onChange, type = 'text', placeholder, ...rest }) => (
    <div style={s.row}>
        {label && <label style={s.label}>{label}</label>}
        <input
            type={type}
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            style={s.input}
            {...rest}
        />
        {hint && <p style={s.hint}>{hint}</p>}
    </div>
);

const NumberInput = ({ label, hint, value, onChange, min, max, placeholder }) => (
    <div>
        {label && <label style={s.label}>{label}</label>}
        <input
            type="number"
            value={value ?? ''}
            onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)}
            min={min}
            max={max}
            placeholder={placeholder}
            style={s.inputSmall}
        />
        {hint && <p style={s.hint}>{hint}</p>}
    </div>
);

const Toggle = ({ label, hint, value, onChange }) => (
    <div style={s.row}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <div
                onClick={() => onChange(!value)}
                style={{
                    width: 42, height: 24, borderRadius: 12,
                    background: value ? 'var(--t-accent)' : 'var(--t-border)',
                    position: 'relative', flexShrink: 0, transition: 'background .2s',
                }}
            >
                <div style={{
                    position: 'absolute', top: 3, left: value ? 21 : 3,
                    width: 18, height: 18, borderRadius: '50%',
                    background: '#fff', transition: 'left .2s',
                }} />
            </div>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--t-text)' }}>{label}</span>
        </label>
        {hint && <p style={{ ...s.hint, marginLeft: 52 }}>{hint}</p>}
    </div>
);

// Status pill colours
const STATUS_COLOR = {
    connected:    { bg: '#e6f9f0', text: '#0a7a40' },
    disconnected: { bg: '#f3f3f3', text: '#888' },
    error:        { bg: '#fff0f0', text: '#c0392b' },
    unknown:      { bg: '#fffbe6', text: '#b8860b' },
};

const StatusPill = ({ status }) => {
    const c = STATUS_COLOR[status] || STATUS_COLOR.unknown;
    return (
        <span style={{
            display: 'inline-block', padding: '3px 12px', borderRadius: 20,
            fontSize: 12, fontWeight: 700,
            background: c.bg, color: c.text,
        }}>
            {status || 'unknown'}
        </span>
    );
};

const EVENT_COLOR = {
    success:  '#0a7a40',
    rejected: '#b8860b',
    unknown:  '#888',
    invalid:  '#c0392b',
};

// ══════════════════════════════════════════════════════════════════════════════
// Main component
// ══════════════════════════════════════════════════════════════════════════════

export default function MqttConfig({ projectId }) {
    const [config, setConfig]         = useState(null);
    const [form,   setForm]           = useState(null);
    const [dirty,  setDirty]          = useState(false);
    const [saving, setSaving]         = useState(false);
    const [testing, setTesting]       = useState(false);
    const [testResult, setTestResult] = useState(null);   // { success, message, latency_ms }
    const [events, setEvents]         = useState([]);
    const [loading, setLoading]       = useState(true);
    const [error,   setError]         = useState('');
    const [newPassword, setNewPassword] = useState('');
    const pollRef = useRef(null);

    // ── Load config ───────────────────────────────────────────────────────────
    const loadConfig = useCallback(async () => {
        try {
            const data = await mqttService.getConfig(projectId);
            setConfig(data);
            setForm({
                broker_host: data.broker_host,
                broker_port: data.broker_port,
                ws_port:     data.ws_port,
                topic:       data.topic,
                username:    data.username,
                use_tls:     data.use_tls,
                is_enabled:  data.is_enabled,
            });
            setError('');
        } catch (e) {
            setError('Failed to load MQTT configuration.');
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    // ── Poll status ───────────────────────────────────────────────────────────
    const pollStatus = useCallback(async () => {
        try {
            const data = await mqttService.getStatus(projectId);
            setConfig((prev) => prev ? { ...prev, ...data.config } : data.config);
            setEvents(data.recent_events || []);
        } catch (_) { /* silent — status is best-effort */ }
    }, [projectId]);

    useEffect(() => {
        loadConfig();
    }, [loadConfig]);

    useEffect(() => {
        pollRef.current = setInterval(pollStatus, 8000);
        pollStatus();
        return () => clearInterval(pollRef.current);
    }, [pollStatus]);

    // ── Form helpers ──────────────────────────────────────────────────────────
    const set = (field) => (value) => {
        setForm((f) => ({ ...f, [field]: value }));
        setDirty(true);
        setTestResult(null);
    };

    // ── Save ──────────────────────────────────────────────────────────────────
    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = { ...form };
            if (newPassword) payload.password = newPassword;
            const updated = await mqttService.updateConfig(projectId, payload);
            setConfig(updated);
            setDirty(false);
            setNewPassword('');
            setError('');
        } catch (e) {
            setError(e?.response?.data?.error || 'Save failed — check console.');
        } finally {
            setSaving(false);
        }
    };

    // ── Test connection ───────────────────────────────────────────────────────
    const handleTest = async () => {
        setTesting(true);
        setTestResult(null);
        try {
            const result = await mqttService.testConnection(projectId, {
                broker_host: form.broker_host,
                broker_port: form.broker_port,
            });
            setTestResult(result);
        } catch (e) {
            setTestResult({ success: false, message: e?.response?.data?.message || 'Request failed' });
        } finally {
            setTesting(false);
        }
    };

    // ── Reset ─────────────────────────────────────────────────────────────────
    const handleReset = () => {
        if (!config) return;
        setForm({
            broker_host: config.broker_host,
            broker_port: config.broker_port,
            ws_port:     config.ws_port,
            topic:       config.topic,
            username:    config.username,
            use_tls:     config.use_tls,
            is_enabled:  config.is_enabled,
        });
        setNewPassword('');
        setDirty(false);
        setTestResult(null);
    };

    // ── Render ────────────────────────────────────────────────────────────────
    if (loading) return <div style={{ padding: 32, color: 'var(--t-text3)' }}>Loading MQTT config…</div>;

    return (
        <div style={{ maxWidth: 720 }}>

            {/* ── Status bar ─────────────────────────────────────────────── */}
            <div style={{
                ...s.card,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 20px',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--t-text2)' }}>
                        MQTT Listener
                    </span>
                    <StatusPill status={config?.connection_status} />
                    {config?.last_connected_at && (
                        <span style={{ fontSize: 11, color: 'var(--t-text3)' }}>
                            last connected {new Date(config.last_connected_at).toLocaleTimeString()}
                        </span>
                    )}
                </div>
                {config?.listener_pid && (
                    <span style={{ fontSize: 11, color: 'var(--t-text3)' }}>PID {config.listener_pid}</span>
                )}
            </div>

            {config?.last_error_message && (
                <div style={{
                    background: '#fff0f0', border: '1px solid #f5c6c6',
                    borderRadius: 10, padding: '10px 16px', marginBottom: 16,
                    fontSize: 13, color: '#c0392b',
                }}>
                    <strong>Last error:</strong> {config.last_error_message}
                </div>
            )}

            {error && (
                <div style={{
                    background: '#fff0f0', borderRadius: 10, padding: '10px 16px',
                    marginBottom: 16, fontSize: 13, color: '#c0392b',
                }}>
                    {error}
                </div>
            )}

            {/* ── Broker settings ────────────────────────────────────────── */}
            <div style={s.card}>
                <div style={s.sectionTitle}>Broker Settings</div>

                <Toggle
                    label="Enable MQTT listener for this project"
                    hint="When disabled, the mqtt_listener management command will skip this project."
                    value={form?.is_enabled ?? true}
                    onChange={set('is_enabled')}
                />

                <Input
                    label="Broker Host"
                    hint="Hostname or IP of your MQTT broker (e.g. 192.168.1.100 or mqtt.example.com)"
                    value={form?.broker_host}
                    onChange={set('broker_host')}
                    placeholder="localhost"
                />

                <div style={s.row3}>
                    <NumberInput
                        label="TCP Port"
                        hint="Standard: 1883 · TLS: 8883"
                        value={form?.broker_port}
                        onChange={set('broker_port')}
                        min={1} max={65535}
                        placeholder="1883"
                    />
                    <NumberInput
                        label="WebSocket Port"
                        hint="Browser clients connect here (Mosquitto default: 9001)"
                        value={form?.ws_port}
                        onChange={set('ws_port')}
                        min={1} max={65535}
                        placeholder="9001"
                    />
                    <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 2 }}>
                        <Toggle
                            label="TLS / SSL"
                            hint="Enable for encrypted connections"
                            value={form?.use_tls ?? false}
                            onChange={set('use_tls')}
                        />
                    </div>
                </div>

                <Input
                    label="Subscribe Topic"
                    hint="Use + for single-level wildcard, # for multi-level.  e.g. nfc/+/state"
                    value={form?.topic}
                    onChange={set('topic')}
                    placeholder="nfc/+/state"
                />
            </div>

            {/* ── Credentials ────────────────────────────────────────────── */}
            <div style={s.card}>
                <div style={s.sectionTitle}>Credentials (optional)</div>
                <div style={s.row2}>
                    <div>
                        <Input
                            label="Username"
                            value={form?.username}
                            onChange={set('username')}
                            placeholder="mqttuser"
                        />
                    </div>
                    <div>
                        <label style={s.label}>
                            Password {config?.has_password ? '(stored — leave blank to keep)' : ''}
                        </label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => { setNewPassword(e.target.value); setDirty(true); }}
                            placeholder={config?.has_password ? '••••••••' : 'no password set'}
                            style={s.input}
                            autoComplete="new-password"
                        />
                        <p style={s.hint}>
                            Stored in plaintext — use a dedicated broker user with minimal ACL.
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Test connection ─────────────────────────────────────────── */}
            <div style={s.card}>
                <div style={s.sectionTitle}>Test Connection</div>
                <p style={{ ...s.hint, marginBottom: 14 }}>
                    Opens a TCP socket to <strong>{form?.broker_host}:{form?.broker_port}</strong> and
                    measures latency.  Uses the values in the form above (save first if you changed them,
                    or test the unsaved values directly).
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <button style={s.btnSecondary} onClick={handleTest} disabled={testing}>
                        {testing ? 'Testing…' : '⚡ Test Connection'}
                    </button>
                    {testResult && (
                        <span style={{
                            fontSize: 13, fontWeight: 600,
                            color: testResult.success ? '#0a7a40' : '#c0392b',
                        }}>
                            {testResult.success
                                ? `✓ ${testResult.message}  (${testResult.latency_ms} ms)`
                                : `✗ ${testResult.message}`}
                        </span>
                    )}
                </div>
            </div>

            {/* ── Save / Reset buttons ────────────────────────────────────── */}
            {dirty && (
                <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
                    <button style={s.btnPrimary} onClick={handleSave} disabled={saving}>
                        {saving ? 'Saving…' : 'Save Changes'}
                    </button>
                    <button style={s.btnSecondary} onClick={handleReset} disabled={saving}>
                        Discard
                    </button>
                </div>
            )}
            {!dirty && (
                <div style={{ marginBottom: 24 }}>
                    <button style={s.btnPrimary} onClick={handleSave} disabled={saving}>
                        {saving ? 'Saving…' : 'Save'}
                    </button>
                </div>
            )}

            {/* ── Recent scan events ──────────────────────────────────────── */}
            <div style={s.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <span style={s.sectionTitle}>Recent Scan Events</span>
                    <span style={{ fontSize: 11, color: 'var(--t-text3)' }}>auto-refreshes every 8 s</span>
                </div>

                {events.length === 0 ? (
                    <p style={{ ...s.hint, textAlign: 'center', padding: '20px 0' }}>
                        No scan events yet — waiting for NFC taps.
                    </p>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                            <tr style={{ borderBottom: '1.5px solid var(--t-border)' }}>
                                {['Time', 'UID', 'Worker', 'Result', 'Topic'].map((h) => (
                                    <th key={h} style={{
                                        padding: '6px 10px', textAlign: 'left',
                                        fontSize: 11, fontWeight: 700,
                                        color: 'var(--t-text3)', textTransform: 'uppercase',
                                    }}>
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {events.map((evt) => (
                                <tr key={evt.id} style={{ borderBottom: '1px solid var(--t-border)' }}>
                                    <td style={{ padding: '8px 10px', whiteSpace: 'nowrap', color: 'var(--t-text3)' }}>
                                        {new Date(evt.received_at).toLocaleTimeString()}
                                    </td>
                                    <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontSize: 12 }}>
                                        {evt.nfc_uid || '—'}
                                    </td>
                                    <td style={{ padding: '8px 10px' }}>
                                        {evt.worker_name || <span style={{ color: 'var(--t-text3)' }}>unknown</span>}
                                    </td>
                                    <td style={{ padding: '8px 10px' }}>
                                        <span style={{
                                            fontWeight: 700, fontSize: 12,
                                            color: EVENT_COLOR[evt.event_type] || '#888',
                                        }}>
                                            {evt.event_type}
                                        </span>
                                        {evt.message && (
                                            <span style={{ color: 'var(--t-text3)', marginLeft: 8, fontSize: 12 }}>
                                                — {evt.message}
                                            </span>
                                        )}
                                    </td>
                                    <td style={{ padding: '8px 10px', color: 'var(--t-text3)', fontSize: 11 }}>
                                        {evt.topic}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

        </div>
    );
}
