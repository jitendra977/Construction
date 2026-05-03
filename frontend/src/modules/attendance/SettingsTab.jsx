/**
 * SettingsTab — Project Attendance Configuration
 *
 * Sections:
 *  1. Working Hours  — shift start/end, break, OT threshold, auto-OT
 *  2. Holiday Manager — add/remove/apply project holidays
 *  3. QR Scan Windows — check-in / check-out time windows
 *  4. Leave Policy   — annual leave, sick leave, carry-forward
 *  5. Weekly Off     — off-day picker + auto-mark setting
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import mqtt from 'mqtt';
import attendanceService from '../../services/attendanceService';

// ── Tiny helpers ──────────────────────────────────────────────────────────────
const Row = ({ label, children, hint }) => (
    <div style={{ marginBottom: 18 }}>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--t-text3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.06em' }}>
            {label}
        </label>
        {children}
        {hint && <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--t-text3)' }}>{hint}</p>}
    </div>
);

const Input = ({ value, onChange, type = 'text', style = {}, ...rest }) => (
    <input
        type={type}
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        style={{
            padding: '8px 10px', borderRadius: 8, fontSize: 13, width: '100%', boxSizing: 'border-box',
            border: '1px solid var(--t-border)', background: 'var(--t-surface2)', color: 'var(--t-text)',
            ...style,
        }}
        {...rest}
    />
);

const Toggle = ({ value, onChange, label }) => (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
        <div
            onClick={() => onChange(!value)}
            style={{
                width: 42, height: 24, borderRadius: 12, position: 'relative',
                background: value ? '#f97316' : 'var(--t-border)',
                transition: 'background .2s', flexShrink: 0,
            }}
        >
            <div style={{
                position: 'absolute', top: 3, left: value ? 21 : 3,
                width: 18, height: 18, borderRadius: '50%', background: '#fff',
                transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.3)',
            }} />
        </div>
        {label && <span style={{ fontSize: 13, color: 'var(--t-text)' }}>{label}</span>}
    </label>
);

const SectionCard = ({ title, icon, children }) => (
    <div style={{
        background: 'var(--t-surface)', border: '1px solid var(--t-border)',
        borderRadius: 14, padding: '18px 20px', marginBottom: 16,
    }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 900, color: 'var(--t-text)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>{icon}</span>{title}
        </h3>
        {children}
    </div>
);

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ── Live MQTT Terminal ────────────────────────────────────────────────────────
const LiveMqttTerminal = ({ brokerUrl, topic, username, password }) => {
    const [logs, setLogs]     = useState([]);
    const [status, setStatus] = useState('Disconnected');
    const [wsPort, setWsPort] = useState(9001);
    const containerRef        = useRef(null);
    const clientRef           = useRef(null);

    const isConnected = status === 'Connected';

    const disconnect = () => {
        if (clientRef.current) { clientRef.current.end(true); clientRef.current = null; }
        setStatus('Disconnected');
        setLogs(prev => [...prev, '[System] Disconnected.']);
    };

    const connect = () => {
        const safeBroker = brokerUrl && brokerUrl.trim();
        if (!safeBroker) { setLogs([`[Error] No broker IP set. Fill in MQTT Broker URL below and Save first.`]); return; }
        const wsUrl = `ws://${safeBroker}:${wsPort}`;
        setStatus('Connecting...');
        setLogs([`[System] Connecting to ${wsUrl} ...`]);
        let client;
        try {
            new URL(wsUrl);
            client = mqtt.connect(wsUrl, {
                clientId: `web_${Math.random().toString(16).slice(2, 10)}`,
                keepalive: 30,
                reconnectPeriod: 0,
                username: username || undefined,
                password: password || undefined,
            });
        } catch (e) { setStatus('Error'); setLogs([`[Error] Bad URL: "${wsUrl}"`]); return; }

        client.on('connect', () => {
            setStatus('Connected');
            client.subscribe(topic || 'nfc/#');
            setLogs(prev => [...prev, `[OK] Connected to ${wsUrl}`, `[OK] Subscribed: ${topic || 'nfc/#'}`]);
        });
        client.on('message', (t, msg) => {
            const ts = new Date().toLocaleTimeString();
            let body = msg.toString();
            try { 
                const data = JSON.parse(body);
                if (data.uid) {
                    const cleanUid = data.uid.replace(/\s+/g, '').toUpperCase();
                    window.last_nfc_scan = cleanUid;
                }
                body = JSON.stringify(data, null, 2); 
            } catch (_) {}
            setLogs(prev => [...prev.slice(-99), `[${ts}] ${t}\n${body}`]);
        });
        client.on('error', (err) => {
            setStatus('Error');
            setLogs(prev => [...prev, `[Error] ${err?.message || 'Connection failed'}`]);
            client.end(true);
        });
        client.on('offline', () => setStatus('Offline'));
        client.on('close',   () => { setStatus(s => s === 'Error' ? s : 'Disconnected'); });
        clientRef.current = client;
    };

    useEffect(() => () => { if (clientRef.current) clientRef.current.end(true); }, []);
    useEffect(() => { if (containerRef.current) containerRef.current.scrollTop = containerRef.current.scrollHeight; }, [logs]);

    const dot = { 'Connected':'#22c55e','Connecting...':'#f59e0b','Error':'#ef4444','Offline':'#f59e0b' }[status] || '#64748b';

    const sendTestScan = async () => {
        const uid = window.prompt("Enter NFC UID to test (e.g. 90 47 DB 13):", window.last_nfc_scan || "");
        if (!uid) return;
        setLogs(prev => [...prev, `[Test] Sending mock scan for UID: ${uid} ...`]);
        try {
            const res = await attendanceService.nfcAttendanceScan({ uid });
            setLogs(prev => [...prev, `[Test] Success: ${res.message}`]);
            // Notify global system
            window.dispatchEvent(new CustomEvent('attendance-updated', { detail: res }));
        } catch (err) {
            setLogs(prev => [...prev, `[Error] Test failed: ${err.response?.data?.error || err.message}`]);
        }
    };

    return (
        <div style={{ marginTop: 16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 8 }}>
                <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
                    <label style={{ fontSize:12, fontWeight:700, color:'var(--t-text3)', textTransform:'uppercase', letterSpacing:'.06em' }}>Live Terminal</label>
                    <div style={{ width:7, height:7, borderRadius:'50%', background: dot, boxShadow: isConnected ? `0 0 6px ${dot}` : 'none' }} />
                    <span style={{ fontSize:11, color: dot, fontWeight:600 }}>{status}</span>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap: 6 }}>
                    <button onClick={sendTestScan} style={{ fontSize:10, padding:'3px 10px', borderRadius:5, border:'1px solid #f9731660', background:'#f9731610', color:'#f97316', fontWeight:700, cursor:'pointer' }}>⚡ Test Scan</button>
                    <span style={{ fontSize:10, color:'var(--t-text3)', marginLeft: 8 }}>WS Port</span>
                    <input type="number" value={wsPort} onChange={e => setWsPort(parseInt(e.target.value)||9001)}
                        style={{ width:58, fontSize:11, padding:'2px 6px', borderRadius:5, border:'1px solid var(--t-border)', background:'var(--t-surface2)', color:'var(--t-text)', textAlign:'center' }} />
                    <button onClick={() => setLogs([])} style={{ fontSize:10, padding:'3px 8px', borderRadius:5, border:'1px solid var(--t-border)', background:'var(--t-surface2)', color:'var(--t-text3)', cursor:'pointer' }}>Clear</button>
                    <button onClick={isConnected ? disconnect : connect}
                        style={{ fontSize:11, padding:'4px 14px', borderRadius:6, border:'none', fontWeight:700, cursor:'pointer',
                            background: isConnected ? '#ef4444' : '#22c55e', color:'#fff', transition:'all 0.2s' }}>
                        {isConnected ? 'Disconnect' : 'Connect'}
                    </button>
                </div>
            </div>
            <div ref={containerRef} style={{ background:'#0f172a', padding:12, borderRadius:10, height:200, overflowY:'auto', border:'1px solid var(--t-border)', color:'#38bdf8', fontFamily:'monospace', fontSize:11, lineHeight:1.7, whiteSpace:'pre-wrap' }}>
                {logs.length === 0
                    ? <div style={{ color:'#334155', textAlign:'center', marginTop:70 }}>Press <strong style={{ color:'#22c55e' }}>Connect</strong> to start the live feed</div>
                    : logs.map((log, i) => <div key={i} style={{ color: log.startsWith('[Error]')?'#f87171': log.startsWith('[OK]')?'#4ade80': log.startsWith('[System]')?'#94a3b8':'#38bdf8', borderBottom:'1px solid #1e293b', paddingBottom:4, marginBottom:4 }}>{log}</div>)
                }
            </div>
        </div>
    );
};

// ── Default settings shape ─────────────────────────────────────────────────
const DEFAULT_SETTINGS = {
    shift_start: '08:00',
    shift_end: '17:00',
    break_minutes: 60,
    working_hours_per_day: 8,
    auto_overtime: true,
    weekly_off_days: '6',
    auto_mark_weekend_off: false,
    auto_apply_holiday: true,
    annual_leave_days: 12,
    sick_leave_days: 6,
    leave_carry_forward: false,
    timezone: 'Asia/Kathmandu',
    mqtt_broker_url: '',
    mqtt_port: 1883,
    mqtt_topic: 'nfc/+/state',
    mqtt_username: '',
    mqtt_password: '',
};

export default function SettingsTab({ projectId }) {
    const [settings,    setSettings]    = useState(DEFAULT_SETTINGS);
    const [origSettings,setOrigSettings]= useState(DEFAULT_SETTINGS);
    const [settingsBusy,setSettingsBusy]= useState(false);
    const [settingsSaved,setSettingsSaved]=useState(false);
    const [settingsErr, setSettingsErr] = useState('');

    // ── Scan window state ──────────────────────────────────────────────────
    const [activeTab, setActiveTab] = useState('general');

    const [scanWin,     setScanWin]     = useState(null);
    const [origScanWin, setOrigScanWin] = useState(null);
    const [scanBusy,    setScanBusy]    = useState(false);
    const [scanSaved,   setScanSaved]   = useState(false);
    const [scanErr,     setScanErr]     = useState('');

    // ── Holidays state ─────────────────────────────────────────────────────
    const [holidays,    setHolidays]    = useState([]);
    const [hLoading,    setHLoading]    = useState(false);
    const [hErr,        setHErr]        = useState('');
    const [newHoliday,  setNewHoliday]  = useState({ date: '', name: '', notes: '' });
    const [addingH,     setAddingH]     = useState(false);
    const [applyingId,  setApplyingId]  = useState(null);
    const [deletingId,  setDeletingId]  = useState(null);

    const thisYear = new Date().getFullYear();

    const [settingsLoaded, setSettingsLoaded] = useState(false);
    const [currentTime, setCurrentTime] = useState('');

    // ── Update clock every second ──────────────────────────────────────────
    useEffect(() => {
        const timer = setInterval(() => {
            try {
                const formatter = new Intl.DateTimeFormat([], {
                    hour: '2-digit', minute: '2-digit', second: '2-digit',
                    timeZone: settings.timezone || 'Asia/Kathmandu',
                    hour12: true
                });
                setCurrentTime(formatter.format(new Date()));
            } catch (e) {
                setCurrentTime(new Date().toLocaleTimeString());
            }
        }, 1000);
        return () => clearInterval(timer);
    }, [settings.timezone]);

    // ── Load ───────────────────────────────────────────────────────────────
    const loadSettings = useCallback(async () => {
        if (!projectId) return;
        try {
            const d = await attendanceService.getSettings(projectId);
            setSettings(d);
            setOrigSettings(d);
        } catch { /* use defaults */ }
        finally { setSettingsLoaded(true); }
    }, [projectId]);

    const loadScanWindow = useCallback(async () => {
        if (!projectId) return;
        try {
            const d = await attendanceService.getTimeWindow(projectId);
            setScanWin(d);
            setOrigScanWin(d);
        } catch { setScanWin(null); }
    }, [projectId]);

    const loadHolidays = useCallback(async () => {
        if (!projectId) return;
        setHLoading(true); setHErr('');
        try {
            const list = await attendanceService.getHolidays(projectId, thisYear);
            setHolidays(Array.isArray(list) ? list : []);
        } catch { setHErr('Failed to load holidays.'); }
        finally { setHLoading(false); }
    }, [projectId, thisYear]);

    useEffect(() => {
        loadSettings();
        loadScanWindow();
        loadHolidays();
    }, [loadSettings, loadScanWindow, loadHolidays]);

    // ── Settings save ──────────────────────────────────────────────────────
    const saveSettings = async () => {
        setSettingsBusy(true); setSettingsErr('');
        try {
            const d = await attendanceService.updateSettings(projectId, settings);
            setSettings(d);
            setOrigSettings(d);
            setSettingsSaved(true);
            setTimeout(() => setSettingsSaved(false), 2500);
        } catch { setSettingsErr('Save failed.'); }
        finally { setSettingsBusy(false); }
    };

    // ── Scan window save ───────────────────────────────────────────────────
    const saveScanWindow = async () => {
        setScanBusy(true); setScanErr('');
        try {
            const d = await attendanceService.updateTimeWindow(projectId, { ...scanWin, project: projectId });
            setScanWin(d);
            setOrigScanWin(d);
            setScanSaved(true);
            setTimeout(() => setScanSaved(false), 2500);
        } catch { setScanErr('Save failed.'); }
        finally { setScanBusy(false); }
    };

    // ── Holiday CRUD ───────────────────────────────────────────────────────
    const addHoliday = async () => {
        if (!newHoliday.date || !newHoliday.name.trim()) return;
        setAddingH(true); setHErr('');
        try {
            await attendanceService.createHoliday({
                project: projectId,
                date: newHoliday.date,
                name: newHoliday.name.trim(),
                notes: newHoliday.notes,
                auto_apply: settings.auto_apply_holiday,
            });
            setNewHoliday({ date: '', name: '', notes: '' });
            await loadHolidays();
        } catch (e) {
            setHErr(e?.response?.data?.error || 'Failed to add holiday.');
        } finally { setAddingH(false); }
    };

    const deleteHoliday = async (id) => {
        if (!window.confirm('Delete this holiday? Attendance records will NOT be changed.')) return;
        setDeletingId(id);
        try { await attendanceService.deleteHoliday(id); await loadHolidays(); }
        catch { setHErr('Delete failed.'); }
        finally { setDeletingId(null); }
    };

    const applyHoliday = async (id) => {
        if (!window.confirm('Re-apply: mark ALL active workers as HOLIDAY for this date?')) return;
        setApplyingId(id);
        try {
            const r = await attendanceService.applyHoliday(id);
            setHolidays(prev => prev.map(h => h.id === id ? { ...h, applied: true } : h));
            alert(`✅ Marked ${r.workers_marked} workers as HOLIDAY.`);
        } catch { setHErr('Apply failed.'); }
        finally { setApplyingId(null); }
    };

    // ── Derived dirty flags ────────────────────────────────────────────────
    const settingsDirty = JSON.stringify(settings) !== JSON.stringify(origSettings);
    const scanDirty     = scanWin && origScanWin && JSON.stringify(scanWin) !== JSON.stringify(origScanWin);

    // ── Weekly off day toggler ─────────────────────────────────────────────
    const offDays = (settings.weekly_off_days || '').split(',').map(n => parseInt(n, 10)).filter(n => !isNaN(n));
    const toggleOffDay = (d) => {
        const next = offDays.includes(d) ? offDays.filter(x => x !== d) : [...offDays, d];
        setSettings(s => ({ ...s, weekly_off_days: next.sort().join(',') }));
    };

    const settingsSaveButton = (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <button onClick={saveSettings} disabled={settingsBusy || !settingsDirty} style={{
                padding: '10px 28px', borderRadius: 10, border: 'none',
                background: settingsSaved ? '#22c55e' : settingsDirty ? '#f97316' : 'var(--t-border)',
                color: settingsDirty ? '#fff' : 'var(--t-text3)',
                fontWeight: 800, fontSize: 13, cursor: settingsDirty ? 'pointer' : 'not-allowed',
                transition: 'all .2s',
            }}>
                {settingsBusy ? '⏳ Saving…' : settingsSaved ? '✅ Saved' : '💾 Save Settings'}
            </button>
            {settingsErr && <span style={{ color: '#ef4444', fontSize: 12 }}>{settingsErr}</span>}
            {!settingsDirty && !settingsSaved && (
                <span style={{ fontSize: 12, color: 'var(--t-text3)' }}>No unsaved changes</span>
            )}
        </div>
    );

    if (!projectId) return (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--t-text3)' }}>
            Select a project to configure settings.
        </div>
    );

    return (
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '4px 0 40px' }}>

            {/* ── Settings Header ────────────────────────────────────────────────── */}
            <div style={{ 
                marginBottom: 24, padding: '0 4px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: 'var(--t-text)' }}>⚙️ Project Settings</h2>
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--t-text3)' }}>Configure shift hours, scan rules, and hardware</p>
                </div>
                <div style={{ 
                    textAlign: 'right', padding: '8px 14px', borderRadius: 12, 
                    background: 'var(--t-surface2)', border: '1px solid var(--t-border)'
                }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: '#f97316', textTransform: 'uppercase', marginBottom: 2 }}>Project Local Time</div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--t-text)', fontFamily: 'monospace' }}>
                        {currentTime || '--:--:--'}
                    </div>
                </div>
            </div>

            {/* ── Tab Menu ──────────────────────────────────────────────────────── */}
            <div style={{ 
                display: 'flex', gap: 6, marginBottom: 24, 
                background: 'var(--t-surface2)', padding: 6, borderRadius: 14,
                border: '1px solid var(--t-border)'
            }}>
                {[
                    { id: 'general', label: 'Shift & Policies', icon: '📋' },
                    { id: 'devices', label: 'Hardware & Windows', icon: '📡' },
                    { id: 'holidays', label: 'Holidays', icon: '🎉' },
                ].map(t => (
                    <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        padding: '10px 0', borderRadius: 10, border: 'none', 
                        background: activeTab === t.id ? '#f97316' : 'transparent', 
                        color: activeTab === t.id ? '#fff' : 'var(--t-text3)', 
                        fontWeight: 800, fontSize: 13, cursor: 'pointer', transition: 'all 0.2s'
                    }}>
                        <span>{t.icon}</span> {t.label}
                    </button>
                ))}
            </div>

            {/* ── Tab: General Policies ────────────────────────────────────── */}
            {activeTab === 'general' && (
                <>
                    {/* ── 0. Regional Settings ────────────────────────────────────── */}
                    <SectionCard title="Regional Settings" icon="🌍">
                        <Row label="Project Timezone" hint="All scans and reports will use this timezone">
                            <select 
                                value={settings.timezone} 
                                onChange={e => setSettings(s => ({ ...s, timezone: e.target.value }))}
                                style={{
                                    padding: '8px 10px', borderRadius: 8, fontSize: 13, width: '100%', boxSizing: 'border-box',
                                    border: '1px solid var(--t-border)', background: 'var(--t-surface2)', color: 'var(--t-text)',
                                }}
                            >
                                <option value="Asia/Kathmandu">Asia/Kathmandu (Nepal, +5:45)</option>
                                <option value="Asia/Kolkata">Asia/Kolkata (India, +5:30)</option>
                                <option value="Asia/Dubai">Asia/Dubai (UAE, +4:00)</option>
                                <option value="Asia/Tokyo">Asia/Tokyo (Japan, +9:00)</option>
                                <option value="Asia/Singapore">Asia/Singapore (+8:00)</option>
                                <option value="Europe/London">Europe/London (UTC/BST)</option>
                                <option value="UTC">UTC (Universal Time)</option>
                            </select>
                        </Row>
                    </SectionCard>

                    {/* ── 1. Working Hours ────────────────────────────────────────── */}
                    <SectionCard title="Working Hours" icon="🕐">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                    <Row label="Shift Start">
                        <Input type="time" value={(settings.shift_start || '').slice(0, 5)} onChange={v => setSettings(s => ({ ...s, shift_start: v }))} />
                    </Row>
                    <Row label="Shift End">
                        <Input type="time" value={(settings.shift_end || '').slice(0, 5)} onChange={v => setSettings(s => ({ ...s, shift_end: v }))} />
                    </Row>
                    <Row label="Break (minutes)" hint="Unpaid lunch break deducted from worked hours">
                        <Input type="number" min={0} max={240} value={settings.break_minutes}
                            onChange={v => setSettings(s => ({ ...s, break_minutes: parseInt(v) || 0 }))} />
                    </Row>
                    <Row label="Standard Hours / Day" hint="Hours worked beyond this count as overtime">
                        <Input type="number" min={1} max={24} step={0.5} value={settings.working_hours_per_day}
                            onChange={v => setSettings(s => ({ ...s, working_hours_per_day: parseFloat(v) || 8 }))} />
                    </Row>
                </div>

                <Row label="Auto-Calculate Overtime" hint="When check-in and check-out times are recorded, overtime is computed automatically">
                    <Toggle value={settings.auto_overtime} onChange={v => setSettings(s => ({ ...s, auto_overtime: v }))}
                        label={settings.auto_overtime ? 'Enabled — overtime calculated from scan times' : 'Disabled — enter overtime hours manually'} />
                </Row>

                {/* Preview */}
                {settings.shift_start && settings.shift_end && (
                    <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--t-bg)', border: '1px solid var(--t-border)', fontSize: 12, color: 'var(--t-text3)', marginTop: 4 }}>
                        💡 Shift: <strong style={{ color: 'var(--t-text)' }}>{settings.shift_start} – {settings.shift_end}</strong>
                        {'  '}·  Break: <strong style={{ color: 'var(--t-text)' }}>{settings.break_minutes} min</strong>
                        {'  '}·  OT after: <strong style={{ color: '#f97316' }}>{settings.working_hours_per_day}h</strong>
                    </div>
                )}
            </SectionCard>

            {/* ── 2. Weekly Off Days ──────────────────────────────────────── */}
            <SectionCard title="Weekly Off Days" icon="📅">
                <Row label="Off Days" hint="Workers will NOT be auto-marked on these days">
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                        {DAY_LABELS.map((d, i) => (
                            <button key={i} onClick={() => toggleOffDay(i)} style={{
                                padding: '6px 12px', borderRadius: 8, border: '1.5px solid',
                                borderColor: offDays.includes(i) ? '#f97316' : 'var(--t-border)',
                                background: offDays.includes(i) ? '#f9731618' : 'var(--t-surface2)',
                                color: offDays.includes(i) ? '#f97316' : 'var(--t-text3)',
                                fontWeight: 700, fontSize: 12, cursor: 'pointer',
                            }}>{d}</button>
                        ))}
                    </div>
                </Row>
                <Row label="Auto-Mark Off Days as Holiday" hint="When the daily sheet is loaded on a weekly off day, all workers are auto-set to HOLIDAY">
                    <Toggle value={settings.auto_mark_weekend_off}
                        onChange={v => setSettings(s => ({ ...s, auto_mark_weekend_off: v }))}
                        label={settings.auto_mark_weekend_off ? 'Enabled' : 'Disabled'} />
                </Row>
            </SectionCard>

            {/* ── 3. Leave Policy ─────────────────────────────────────────── */}
            <SectionCard title="Leave Policy" icon="🏖️">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <Row label="Annual Leave Days / Year">
                        <Input type="number" min={0} max={365} value={settings.annual_leave_days}
                            onChange={v => setSettings(s => ({ ...s, annual_leave_days: parseInt(v) || 0 }))} />
                    </Row>
                    <Row label="Sick Leave Days / Year">
                        <Input type="number" min={0} max={365} value={settings.sick_leave_days}
                            onChange={v => setSettings(s => ({ ...s, sick_leave_days: parseInt(v) || 0 }))} />
                    </Row>
                </div>
                <Row label="Leave Carry Forward" hint="Allow unused annual leave to roll into next year">
                    <Toggle value={settings.leave_carry_forward}
                        onChange={v => setSettings(s => ({ ...s, leave_carry_forward: v }))}
                        label={settings.leave_carry_forward ? 'Enabled — unused leave carries forward' : 'Disabled — leave resets each year'} />
                </Row>
            </SectionCard>

            {/* ── Settings Save Button ─────────────────────────────────────── */}
            {settingsSaveButton}
            </>
            )}

            {/* ── Tab: Devices & Scanning ──────────────────────────────────── */}
            {activeTab === 'devices' && (
                <>
                    {/* Live Terminal */}
                    <div style={{ marginBottom: 24 }}>
                        <LiveMqttTerminal 
                            brokerUrl={settings.mqtt_broker_url}
                            topic={settings.mqtt_topic ?? 'nfc/+/state'}
                            username={settings.mqtt_username}
                            password={settings.mqtt_password}
                            settingsReady={settingsLoaded}
                        />
                    </div>

                    {/* ── NFC & MQTT Setup Guide ─────────────────────────────────────── */}
                    <SectionCard title="NFC Scanner & MQTT Setup" icon="🔌">
                <div style={{ marginBottom: 12 }}>
                    <p style={{ fontSize: 13, color: 'var(--t-text3)', margin: '0 0 16px', lineHeight: 1.5 }}>
                        Configure your ESP32 PN532 NFC scanner to connect to this local MQTT broker. The backend listener is already running and waiting for scans.
                    </p>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                        <Row label="MQTT Broker URL (Local IP or Domain)">
                            <Input value={settings.mqtt_broker_url ?? window.location.hostname} onChange={v => setSettings(s => ({ ...s, mqtt_broker_url: v }))} />
                        </Row>
                        <Row label="MQTT Port">
                            <Input type="number" value={settings.mqtt_port ?? 1883} onChange={v => setSettings(s => ({ ...s, mqtt_port: parseInt(v) || 1883 }))} />
                        </Row>
                        <Row label="Topic Format" hint="Use + as wildcard for MAC address">
                            <Input value={settings.mqtt_topic ?? 'nfc/+/state'} onChange={v => setSettings(s => ({ ...s, mqtt_topic: v }))} style={{ fontFamily: 'monospace', fontSize: 12 }} />
                        </Row>
                        <Row label="Username" hint="Leave blank for anonymous">
                            <Input value={settings.mqtt_username ?? ''} onChange={v => setSettings(s => ({ ...s, mqtt_username: v }))} placeholder="(anonymous)" />
                        </Row>
                        <Row label="Password" hint="Leave blank for anonymous">
                            <Input type="password" value={settings.mqtt_password ?? ''} onChange={v => setSettings(s => ({ ...s, mqtt_password: v }))} placeholder="••••••••" />
                        </Row>
                    </div>

                    <Row label="Expected JSON Payload" hint="Publish this payload when a card is tapped. The spaces in the UID are automatically removed by the backend.">
                        <div style={{ 
                            background: '#1a1a2e', padding: 14, borderRadius: 10, 
                            color: '#a5b4fc', fontFamily: 'monospace', fontSize: 12,
                            whiteSpace: 'pre-wrap', border: '1px solid var(--t-border)',
                            lineHeight: 1.5
                        }}>
{`{"result":"Granted","user":"Suica","uid":"01 01 01 12 D9 19 C8 00"}`}
                        </div>
                    </Row>
                </div>
            </SectionCard>
            
            {/* ── Settings Save Button (for MQTT/NFC configs) ──────────────── */}
            {settingsSaveButton}

            {/* ── 4. Scan Time Windows ──────────────────────────────────────── */}
            {scanWin !== null && (
                <SectionCard title="Attendance Scan Windows (NFC & QR)" icon="📡">
                    <Row label="Enable Time Window Enforcement"
                        hint="When ON, QR scans outside the configured windows are rejected">
                        <Toggle
                            value={scanWin?.is_active ?? false}
                            onChange={v => setScanWin(w => ({ ...w, is_active: v }))}
                            label={scanWin?.is_active ? 'Enforcing time windows' : 'All-hours scanning (windows ignored)'}
                        />
                    </Row>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 4 }}>
                        <Row label="Check-In Window Opens">
                            <Input type="time" value={(scanWin?.checkin_start || '').slice(0, 5)}
                                onChange={v => setScanWin(w => ({ ...w, checkin_start: v }))} />
                        </Row>
                        <Row label="Check-In Window Closes">
                            <Input type="time" value={(scanWin?.checkin_end || '').slice(0, 5)}
                                onChange={v => setScanWin(w => ({ ...w, checkin_end: v }))} />
                        </Row>
                        <Row label="Check-Out Window Opens">
                            <Input type="time" value={(scanWin?.checkout_start || '').slice(0, 5)}
                                onChange={v => setScanWin(w => ({ ...w, checkout_start: v }))} />
                        </Row>
                        <Row label="Check-Out Window Closes">
                            <Input type="time" value={(scanWin?.checkout_end || '').slice(0, 5)}
                                onChange={v => setScanWin(w => ({ ...w, checkout_end: v }))} />
                        </Row>
                        <Row label="Late Threshold (min)" hint="Minutes after check-in opens before scan is marked LATE">
                            <Input type="number" min={0} max={180} value={scanWin?.late_threshold_minutes ?? 30}
                                onChange={v => setScanWin(w => ({ ...w, late_threshold_minutes: parseInt(v) || 0 }))} />
                        </Row>
                        <Row label="Early Checkout (min)" hint="Minutes before check-out opens that triggers EARLY flag">
                            <Input type="number" min={0} max={180} value={scanWin?.early_checkout_minutes ?? 30}
                                onChange={v => setScanWin(w => ({ ...w, early_checkout_minutes: parseInt(v) || 0 }))} />
                        </Row>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                        <button onClick={saveScanWindow} disabled={scanBusy || !scanDirty} style={{
                            padding: '10px 24px', borderRadius: 10, border: 'none',
                            background: scanSaved ? '#22c55e' : scanDirty ? '#f97316' : 'var(--t-border)',
                            color: scanDirty ? '#fff' : 'var(--t-text3)',
                            fontWeight: 800, fontSize: 13, cursor: scanDirty ? 'pointer' : 'not-allowed',
                            transition: 'all .2s',
                        }}>
                            {scanBusy ? '⏳ Saving…' : scanSaved ? '✅ Saved' : '💾 Save Scan Windows'}
                        </button>
                        {scanErr && <span style={{ color: '#ef4444', fontSize: 12 }}>{scanErr}</span>}
                    </div>
                </SectionCard>
            )}
                </>
            )}

            {/* ── Tab: Holidays ────────────────────────────────────────────── */}
            {activeTab === 'holidays' && (
                <>
                    {/* ── 5. Holiday Manager ──────────────────────────────────────── */}
                    <SectionCard title={`Holiday Manager — ${thisYear}`} icon="🎉">
                <Row label="Auto-Apply Holidays to Attendance"
                    hint="When you add a holiday, all active workers are automatically marked as HOLIDAY for that date">
                    <Toggle value={settings.auto_apply_holiday}
                        onChange={v => setSettings(s => ({ ...s, auto_apply_holiday: v }))}
                        label={settings.auto_apply_holiday ? 'Auto-apply enabled' : 'Manual apply only'} />
                </Row>

                {/* Add holiday form */}
                <div style={{
                    border: '1px solid var(--t-border)', borderRadius: 10,
                    padding: '14px', background: 'var(--t-bg)', marginBottom: 14,
                }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 8, marginBottom: 8 }}>
                        <Input type="date" value={newHoliday.date}
                            onChange={v => setNewHoliday(h => ({ ...h, date: v }))}
                            style={{ fontSize: 13 }} />
                        <Input type="text" placeholder="Holiday name (e.g. Dashain)" value={newHoliday.name}
                            onChange={v => setNewHoliday(h => ({ ...h, name: v }))} />
                    </div>
                    <Input type="text" placeholder="Notes (optional)" value={newHoliday.notes}
                        onChange={v => setNewHoliday(h => ({ ...h, notes: v }))} style={{ marginBottom: 8 }} />
                    <button
                        onClick={addHoliday}
                        disabled={addingH || !newHoliday.date || !newHoliday.name.trim()}
                        style={{
                            padding: '8px 20px', borderRadius: 9, border: 'none',
                            background: (newHoliday.date && newHoliday.name.trim()) ? '#f97316' : 'var(--t-border)',
                            color: (newHoliday.date && newHoliday.name.trim()) ? '#fff' : 'var(--t-text3)',
                            fontWeight: 800, fontSize: 13, cursor: 'pointer',
                        }}
                    >
                        {addingH ? '⏳ Adding…' : `➕ Add${settings.auto_apply_holiday ? ' & Apply' : ''}`}
                    </button>
                </div>

                {hErr && <p style={{ color: '#ef4444', fontSize: 12, margin: '0 0 8px' }}>{hErr}</p>}

                {/* Holiday list */}
                {hLoading ? (
                    <p style={{ fontSize: 12, color: 'var(--t-text3)', textAlign: 'center', padding: 16 }}>Loading…</p>
                ) : holidays.length === 0 ? (
                    <p style={{ fontSize: 12, color: 'var(--t-text3)', textAlign: 'center', padding: 16 }}>
                        No holidays defined for {thisYear}. Add one above.
                    </p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {holidays.map(h => {
                            const d = new Date(h.date + 'T00:00');
                            const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                            return (
                                <div key={h.id} style={{
                                    display: 'flex', alignItems: 'center', gap: 10,
                                    padding: '10px 14px', borderRadius: 10,
                                    background: 'var(--t-surface2)', border: '1px solid var(--t-border)',
                                }}>
                                    {/* Date badge */}
                                    <div style={{
                                        minWidth: 64, textAlign: 'center', padding: '4px 8px',
                                        borderRadius: 8, background: '#f9731618',
                                        border: '1px solid #f9731440',
                                        fontSize: 11, fontWeight: 800, color: '#f97316',
                                        lineHeight: 1.3,
                                    }}>
                                        {dayLabel}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ margin: 0, fontWeight: 800, fontSize: 13, color: 'var(--t-text)' }}>{h.name}</p>
                                        {h.notes && <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--t-text3)' }}>{h.notes}</p>}
                                    </div>
                                    {/* Applied badge */}
                                    <div style={{
                                        padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 800,
                                        background: h.applied ? '#022c2240' : '#1c140040',
                                        color: h.applied ? '#10b981' : '#f59e0b',
                                        border: `1px solid ${h.applied ? '#10b98140' : '#f59e0b40'}`,
                                        whiteSpace: 'nowrap',
                                    }}>
                                        {h.applied ? '✓ Applied' : '⚠ Pending'}
                                    </div>
                                    {/* Apply button (if not applied or re-apply) */}
                                    <button
                                        onClick={() => applyHoliday(h.id)}
                                        disabled={applyingId === h.id}
                                        title="Mark all workers as HOLIDAY for this date"
                                        style={{
                                            padding: '5px 10px', borderRadius: 7, border: '1px solid var(--t-border)',
                                            background: 'var(--t-surface)', color: 'var(--t-text3)',
                                            fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                                        }}
                                    >
                                        {applyingId === h.id ? '⏳' : '⚡ Apply'}
                                    </button>
                                    {/* Delete */}
                                    <button
                                        onClick={() => deleteHoliday(h.id)}
                                        disabled={deletingId === h.id}
                                        title="Delete this holiday"
                                        style={{
                                            width: 28, height: 28, borderRadius: 7, border: '1px solid var(--t-border)',
                                            background: 'var(--t-surface)', color: '#ef4444',
                                            fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}
                                    >
                                        {deletingId === h.id ? '⏳' : '✕'}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </SectionCard>
                </>
            )}

        </div>
    );
}
