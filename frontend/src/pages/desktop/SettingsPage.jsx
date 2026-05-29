/**
 * SettingsPage — standalone settings hub at /dashboard/desktop/settings
 *
 * Sections
 * ────────────────────────────────────────────────────────
 *  1. Appearance       — dark/light theme, UI density, accent colour
 *  2. Notifications    — email alerts, sound, in-app banners
 *  3. Language         — UI language, date format, currency
 *  4. Security         — recent logins, 2-FA status (read-only)
 *  5. System Info      — API URL, env, Sentry, version
 *  6. Data & Cache     — export profile JSON, clear localStorage
 *
 * Profile-backed settings (notifications_enabled, preferred_language) are
 * persisted to the backend via PATCH /auth/profile/.
 * UI-only settings are stored in localStorage.
 */
import { useState, useEffect, useCallback } from 'react';
import { useConstruction } from '../../context/ConstructionContext';
import { useTheme }         from '../../context/ThemeContext';
import accountsApi          from '../../modules/accounts/services/accountsApi';

// ── Shared styles ──────────────────────────────────────────────────────────────
const card = {
    borderRadius: 14,
    border: '1px solid var(--t-border)',
    background: 'var(--t-surface)',
    padding: 24,
    marginBottom: 20,
};
const sectionTitle = {
    margin: '0 0 4px',
    fontSize: 13, fontWeight: 900,
    color: 'var(--t-text)',
    textTransform: 'uppercase', letterSpacing: '0.06em',
};
const sectionSub = {
    margin: '0 0 20px',
    fontSize: 12, color: 'var(--t-text3)',
};
const row = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 0',
    borderBottom: '1px solid var(--t-border)',
};
const rowLast = { ...row, borderBottom: 'none' };
const rowLabel = { fontSize: 13, fontWeight: 700, color: 'var(--t-text)' };
const rowSub   = { fontSize: 11, color: 'var(--t-text3)', marginTop: 2 };
const inputStyle = {
    padding: '7px 12px', fontSize: 13, borderRadius: 10,
    border: '1px solid var(--t-border)', background: 'var(--t-bg)',
    color: 'var(--t-text)', outline: 'none', fontFamily: 'inherit',
};

// ── Toggle switch ──────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, disabled = false }) {
    return (
        <div
            onClick={() => !disabled && onChange(!checked)}
            style={{
                width: 44, height: 24, borderRadius: 99,
                cursor: disabled ? 'not-allowed' : 'pointer',
                background: checked ? '#6366f1' : 'var(--t-border)',
                position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                opacity: disabled ? 0.5 : 1,
            }}
        >
            <div style={{
                position: 'absolute', top: 3, left: checked ? 23 : 3,
                width: 18, height: 18, borderRadius: '50%',
                background: '#fff', transition: 'left 0.2s',
                boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
            }} />
        </div>
    );
}

// ── Feedback banner ────────────────────────────────────────────────────────────
function Feedback({ msg }) {
    if (!msg) return null;
    const ok = msg.type === 'success';
    return (
        <div style={{
            padding: '10px 16px', borderRadius: 10, marginBottom: 16,
            fontSize: 13, fontWeight: 600,
            background: ok ? '#10b98118' : '#ef444418',
            color:      ok ? '#10b981'   : '#ef4444',
            border:     `1px solid ${ok ? '#10b98130' : '#ef444430'}`,
        }}>
            {ok ? '✅' : '❌'} {msg.text}
        </div>
    );
}

// ── 1. Appearance ─────────────────────────────────────────────────────────────
function AppearanceSection() {
    const { theme, toggleTheme } = useTheme();
    const [density, setDensity]  = useState(() => localStorage.getItem('ui-density')  || 'comfortable');
    const [accent,  setAccent]   = useState(() => localStorage.getItem('ui-accent')   || '#6366f1');

    const ACCENTS = [
        { color: '#6366f1', label: 'Indigo'  },
        { color: '#3b82f6', label: 'Blue'    },
        { color: '#10b981', label: 'Emerald' },
        { color: '#f97316', label: 'Orange'  },
        { color: '#ef4444', label: 'Red'     },
        { color: '#8b5cf6', label: 'Violet'  },
    ];

    const handleDensity = (val) => { setDensity(val); localStorage.setItem('ui-density', val); };
    const handleAccent  = (color) => {
        setAccent(color);
        localStorage.setItem('ui-accent', color);
        document.documentElement.style.setProperty('--accent', color);
    };

    return (
        <div style={card}>
            <p style={sectionTitle}>🎨 Appearance</p>
            <p style={sectionSub}>Customise how the app looks on your device.</p>

            <div style={row}>
                <div>
                    <p style={rowLabel}>Dark Mode</p>
                    <p style={rowSub}>Switch between light and dark interface.</p>
                </div>
                <Toggle checked={theme === 'dark'} onChange={toggleTheme} />
            </div>

            <div style={row}>
                <div>
                    <p style={rowLabel}>UI Density</p>
                    <p style={rowSub}>Controls spacing in tables and lists.</p>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                    {['compact', 'comfortable', 'spacious'].map(d => (
                        <button key={d} onClick={() => handleDensity(d)}
                            style={{
                                padding: '5px 12px', borderRadius: 8, cursor: 'pointer',
                                fontSize: 11, fontWeight: 700, border: 'none', transition: 'all 0.15s',
                                background: density === d ? '#6366f1' : 'var(--t-bg)',
                                color:      density === d ? '#fff'    : 'var(--t-text3)',
                                textTransform: 'capitalize',
                            }}>
                            {d}
                        </button>
                    ))}
                </div>
            </div>

            <div style={rowLast}>
                <div>
                    <p style={rowLabel}>Accent Colour</p>
                    <p style={rowSub}>Primary colour for buttons and highlights.</p>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {ACCENTS.map(({ color, label }) => (
                        <button key={color} title={label} onClick={() => handleAccent(color)}
                            style={{
                                width: 24, height: 24, borderRadius: '50%',
                                background: color, border: 'none', cursor: 'pointer',
                                outline: accent === color ? `3px solid ${color}` : '3px solid transparent',
                                outlineOffset: 2, transition: 'outline 0.15s',
                            }}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

// ── 2. Notifications ──────────────────────────────────────────────────────────
function NotificationsSection({ user, updateProfile }) {
    const [msg,  setMsg]  = useState(null);
    const [busy, setBusy] = useState(false);
    const [prefs, setPrefs] = useState({
        notifications_enabled: user?.notifications_enabled ?? true,
        sound_enabled:         JSON.parse(localStorage.getItem('notif-sound')  ?? 'true'),
        email_alerts:          JSON.parse(localStorage.getItem('notif-email')  ?? 'true'),
        banner_alerts:         JSON.parse(localStorage.getItem('notif-banner') ?? 'true'),
    });

    useEffect(() => {
        if (user) setPrefs(p => ({ ...p, notifications_enabled: user.notifications_enabled ?? true }));
    }, [user]);

    const handleToggle = async (key, val) => {
        setPrefs(p => ({ ...p, [key]: val }));
        if (key === 'sound_enabled')  localStorage.setItem('notif-sound',  JSON.stringify(val));
        if (key === 'email_alerts')   localStorage.setItem('notif-email',  JSON.stringify(val));
        if (key === 'banner_alerts')  localStorage.setItem('notif-banner', JSON.stringify(val));
        if (key === 'notifications_enabled') {
            setBusy(true); setMsg(null);
            try {
                await updateProfile({ notifications_enabled: val });
                setMsg({ type: 'success', text: `Notifications ${val ? 'enabled' : 'disabled'}.` });
            } catch {
                setMsg({ type: 'error', text: 'Failed to update notification preference.' });
                setPrefs(p => ({ ...p, [key]: !val }));
            } finally {
                setBusy(false);
            }
        }
    };

    const ITEMS = [
        { key: 'notifications_enabled', label: 'In-App Notifications', sub: 'Task updates, approvals, and system alerts inside the app.' },
        { key: 'email_alerts',          label: 'Email Alerts',          sub: 'Receive digest emails for approvals and critical changes.'   },
        { key: 'sound_enabled',         label: 'Notification Sounds',   sub: 'Play a chime when a new alert arrives.'                     },
        { key: 'banner_alerts',         label: 'Banner Notifications',  sub: 'Show slide-in banners for real-time updates.'               },
    ];

    return (
        <div style={card}>
            <p style={sectionTitle}>🔔 Notifications</p>
            <p style={sectionSub}>Choose what alerts you want to receive.</p>
            <Feedback msg={msg} />
            {ITEMS.map(({ key, label, sub }, i) => (
                <div key={key} style={i < ITEMS.length - 1 ? row : rowLast}>
                    <div>
                        <p style={rowLabel}>{label}</p>
                        <p style={rowSub}>{sub}</p>
                    </div>
                    <Toggle checked={prefs[key]} onChange={val => handleToggle(key, val)} disabled={busy} />
                </div>
            ))}
        </div>
    );
}

// ── 3. Language & Regional ────────────────────────────────────────────────────
function LanguageSection({ user, updateProfile }) {
    const [msg,      setMsg]      = useState(null);
    const [busy,     setBusy]     = useState(false);
    const [lang,     setLang]     = useState(user?.preferred_language || 'en');
    const [dateFmt,  setDateFmt]  = useState(() => localStorage.getItem('date-format') || 'DD/MM/YYYY');
    const [currency, setCurrency] = useState(() => localStorage.getItem('currency')    || 'NPR');

    useEffect(() => { if (user?.preferred_language) setLang(user.preferred_language); }, [user]);

    const handleLangSave = async () => {
        setBusy(true); setMsg(null);
        try {
            await updateProfile({ preferred_language: lang });
            setMsg({ type: 'success', text: 'Language preference saved.' });
        } catch {
            setMsg({ type: 'error', text: 'Failed to save language preference.' });
        } finally { setBusy(false); }
    };

    return (
        <div style={card}>
            <p style={sectionTitle}>🌐 Language & Regional</p>
            <p style={sectionSub}>Set your preferred language and display formats.</p>
            <Feedback msg={msg} />

            <div style={row}>
                <div>
                    <p style={rowLabel}>Interface Language</p>
                    <p style={rowSub}>Saved to your profile — applies on next login.</p>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <select value={lang} onChange={e => setLang(e.target.value)} style={inputStyle}>
                        <option value="en">English</option>
                        <option value="ne">नेपाली</option>
                    </select>
                    <button onClick={handleLangSave} disabled={busy}
                        style={{ padding: '7px 14px', borderRadius: 10, background: '#6366f1', color: '#fff', fontWeight: 800, fontSize: 12, border: 'none', cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1 }}>
                        {busy ? '…' : 'Save'}
                    </button>
                </div>
            </div>

            <div style={row}>
                <div>
                    <p style={rowLabel}>Date Format</p>
                    <p style={rowSub}>How dates are displayed across the app.</p>
                </div>
                <select value={dateFmt} onChange={e => { setDateFmt(e.target.value); localStorage.setItem('date-format', e.target.value); }} style={inputStyle}>
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
                </select>
            </div>

            <div style={rowLast}>
                <div>
                    <p style={rowLabel}>Currency Display</p>
                    <p style={rowSub}>Symbol used when showing monetary amounts.</p>
                </div>
                <select value={currency} onChange={e => { setCurrency(e.target.value); localStorage.setItem('currency', e.target.value); }} style={inputStyle}>
                    <option value="NPR">NPR (रू)</option>
                    <option value="USD">USD ($)</option>
                    <option value="INR">INR (₹)</option>
                    <option value="EUR">EUR (€)</option>
                </select>
            </div>
        </div>
    );
}

// ── 4. Security ───────────────────────────────────────────────────────────────
function SecuritySection({ user }) {
    const [sessions, setSessions] = useState(null);
    const [loading,  setLoading]  = useState(false);

    const loadSessions = useCallback(async () => {
        setLoading(true);
        try {
            const res  = await accountsApi.getActivityLogs({ action: 'LOGIN', days: 30 });
            const logs = res.data?.results ?? res.data ?? [];
            const seen = new Set();
            const deduped = logs.filter(l => {
                if (!l.ip_address || seen.has(l.ip_address)) return false;
                seen.add(l.ip_address); return true;
            }).slice(0, 5);
            setSessions(deduped);
        } catch { setSessions([]); }
        finally  { setLoading(false); }
    }, []);

    useEffect(() => { loadSessions(); }, [loadSessions]);

    return (
        <div style={card}>
            <p style={sectionTitle}>🔒 Security</p>
            <p style={sectionSub}>Recent logins and account security settings.</p>

            <div style={row}>
                <div>
                    <p style={rowLabel}>Two-Factor Authentication</p>
                    <p style={rowSub}>Add an extra layer of login security.</p>
                </div>
                <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 99, background: '#f59e0b18', color: '#f59e0b', border: '1px solid #f59e0b30' }}>
                    Coming Soon
                </span>
            </div>

            <div style={row}>
                <div>
                    <p style={rowLabel}>Biometric Face Sign-in</p>
                    <p style={rowSub}>Train and enable secure facial recognition login.</p>
                </div>
                <button 
                    onClick={() => window.location.href = '/dashboard/desktop/biometrics'}
                    style={{ 
                        padding: '7px 16px', borderRadius: 10, 
                        background: 'rgba(99,102,241,0.1)', color: '#6366f1', 
                        fontWeight: 800, fontSize: 12, 
                        border: '1px solid rgba(99,102,241,0.25)', cursor: 'pointer' 
                    }}
                >
                    Configure
                </button>
            </div>

            <div style={row}>
                <div>
                    <p style={rowLabel}>JWT Token Expiry</p>
                    <p style={rowSub}>Access tokens expire after 60 min · Refresh tokens last 7 days.</p>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--t-text3)' }}>60 min / 7 days</span>
            </div>

            <div style={{ ...rowLast, flexDirection: 'column', alignItems: 'flex-start', gap: 12 }}>
                <div>
                    <p style={rowLabel}>Recent Logins (last 30 days)</p>
                    <p style={rowSub}>Unique IP addresses seen logging in as you.</p>
                </div>
                {loading && <p style={{ fontSize: 12, color: 'var(--t-text3)' }}>Loading…</p>}
                {!loading && sessions?.length === 0 && <p style={{ fontSize: 12, color: 'var(--t-text3)' }}>No login history found.</p>}
                {!loading && sessions && sessions.length > 0 && (
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {sessions.map((s, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 10, background: 'var(--t-bg)', border: '1px solid var(--t-border)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <span style={{ fontSize: 16 }}>💻</span>
                                    <div>
                                        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: 'var(--t-text)', fontFamily: 'monospace' }}>{s.ip_address || 'Unknown IP'}</p>
                                        <p style={{ margin: 0, fontSize: 11, color: 'var(--t-text3)' }}>{s.endpoint || 'Login'}</p>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: 'var(--t-text2)' }}>
                                        {new Date(s.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                    </p>
                                    <p style={{ margin: 0, fontSize: 10, color: 'var(--t-text3)' }}>
                                        {new Date(s.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ── 5. System Info ────────────────────────────────────────────────────────────
function SystemInfoSection() {
    const API_URL   = import.meta.env.VITE_API_URL   || 'http://localhost:8000/api/v1';
    const sentryDSN = import.meta.env.VITE_SENTRY_DSN;
    const env       = import.meta.env.MODE;
    const ENV_COLORS = { development: '#f59e0b', production: '#10b981', staging: '#3b82f6' };
    const envColor   = ENV_COLORS[env] || '#6b7280';

    const INFO_ROWS = [
        { label: 'API Endpoint',     value: API_URL,                                              mono: true  },
        { label: 'Environment',      value: env,                                                  badge: true },
        { label: 'App Version',      value: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '—', mono: true },
        { label: 'Error Tracking',   value: sentryDSN ? '✅ Sentry active' : '⚠️ Sentry not configured', color: sentryDSN ? '#10b981' : '#f59e0b' },
        { label: 'Auth Strategy',    value: 'JWT (SimpleJWT)',                                    mono: true  },
        { label: 'Browser',          value: navigator.userAgent.split(' ').slice(-2).join(' '),   mono: true  },
    ];

    return (
        <div style={card}>
            <p style={sectionTitle}>ℹ️ System Information</p>
            <p style={sectionSub}>Read-only technical details about this installation.</p>
            {INFO_ROWS.map(({ label, value, mono, badge, color }, i) => (
                <div key={label} style={i < INFO_ROWS.length - 1 ? row : rowLast}>
                    <p style={{ ...rowLabel, minWidth: 180 }}>{label}</p>
                    {badge ? (
                        <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 99, background: `${envColor}18`, color: envColor, border: `1px solid ${envColor}30`, textTransform: 'uppercase' }}>
                            {value}
                        </span>
                    ) : (
                        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: color || 'var(--t-text2)', fontFamily: mono ? 'monospace' : 'inherit', wordBreak: 'break-all', textAlign: 'right', maxWidth: 340 }}>
                            {value}
                        </p>
                    )}
                </div>
            ))}
        </div>
    );
}

// ── 6. Data & Cache ───────────────────────────────────────────────────────────
function DataSection({ user }) {
    const [cleared, setCleared] = useState(false);
    const KEEP_KEYS = ['app-theme', 'token', 'refresh_token', 'access_token'];

    const handleClearCache = () => {
        Object.keys(localStorage).filter(k => !KEEP_KEYS.includes(k)).forEach(k => localStorage.removeItem(k));
        setCleared(true);
        setTimeout(() => setCleared(false), 3000);
    };

    const handleExport = () => {
        if (!user) return;
        const blob = new Blob([JSON.stringify({
            exported_at: new Date().toISOString(),
            user: {
                id: user.id, username: user.username, email: user.email,
                first_name: user.first_name, last_name: user.last_name,
                phone_number: user.phone_number, bio: user.bio,
                address: user.address, date_joined: user.date_joined,
                role: user.role?.name, is_active: user.is_active,
            },
            local_settings: {
                theme:       localStorage.getItem('app-theme'),
                density:     localStorage.getItem('ui-density'),
                accent:      localStorage.getItem('ui-accent'),
                date_format: localStorage.getItem('date-format'),
                currency:    localStorage.getItem('currency'),
            },
        }, null, 2)], { type: 'application/json' });
        const a    = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `constructpro-settings-${new Date().toISOString().slice(0, 10)}.json` });
        a.click();
        URL.revokeObjectURL(a.href);
    };

    return (
        <div style={card}>
            <p style={sectionTitle}>🗄️ Data & Cache</p>
            <p style={sectionSub}>Manage local data and export your account information.</p>

            <div style={row}>
                <div>
                    <p style={rowLabel}>Export My Data</p>
                    <p style={rowSub}>Download a JSON copy of your profile and local preferences.</p>
                </div>
                <button onClick={handleExport}
                    style={{ padding: '7px 16px', borderRadius: 10, background: '#6366f118', color: '#6366f1', fontWeight: 800, fontSize: 12, border: '1px solid #6366f130', cursor: 'pointer' }}>
                    ⬇️ Export
                </button>
            </div>

            <div style={rowLast}>
                <div>
                    <p style={rowLabel}>Clear Local Cache</p>
                    <p style={rowSub}>Removes UI preferences and cached filters. Login session and theme are kept.</p>
                </div>
                <button onClick={handleClearCache}
                    style={{ padding: '7px 16px', borderRadius: 10, fontWeight: 800, fontSize: 12, cursor: 'pointer', transition: 'all 0.3s',
                        background: cleared ? '#10b98118' : '#ef444418',
                        color:      cleared ? '#10b981'   : '#ef4444',
                        border:     `1px solid ${cleared ? '#10b98130' : '#ef444430'}`,
                    }}>
                    {cleared ? '✅ Cleared!' : '🗑️ Clear Cache'}
                </button>
            </div>
        </div>
    );
}

// ── Main SettingsPage ──────────────────────────────────────────────────────────
const SECTION_TABS = [
    { key: 'appearance',    icon: '🎨', label: 'Appearance'    },
    { key: 'notifications', icon: '🔔', label: 'Notifications' },
    { key: 'language',      icon: '🌐', label: 'Language'      },
    { key: 'security',      icon: '🔒', label: 'Security'      },
    { key: 'system',        icon: 'ℹ️', label: 'System Info'   },
    { key: 'data',          icon: '🗄️', label: 'Data & Cache'  },
];

export default function SettingsPage() {
    const { user, updateProfile } = useConstruction();
    const [activeSection, setActiveSection] = useState('appearance');

    return (
        <div style={{ minHeight: '100%', background: 'var(--t-bg)' }}>

            {/* ── Page header ────────────────────────────────────────────── */}
            <div style={{ background: 'var(--t-surface)', borderBottom: '1px solid var(--t-border)', padding: '16px 28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, border: '1px solid rgba(99,102,241,0.2)' }}>
                        ⚙️
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: 'var(--t-text)', lineHeight: 1 }}>Settings</h1>
                        <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--t-text3)' }}>
                            Manage your preferences, appearance, and system configuration
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Body ───────────────────────────────────────────────────── */}
            <div style={{ display: 'flex', gap: 0, maxWidth: 1100, margin: '0 auto', padding: 28 }}>

                {/* Left sidebar nav */}
                <div style={{ width: 196, flexShrink: 0, marginRight: 28 }}>
                    <div style={{ position: 'sticky', top: 80, borderRadius: 14, border: '1px solid var(--t-border)', background: 'var(--t-surface)', overflow: 'hidden' }}>
                        {SECTION_TABS.map(({ key, icon, label }) => (
                            <button key={key} onClick={() => setActiveSection(key)}
                                style={{
                                    width: '100%', padding: '11px 16px',
                                    display: 'flex', alignItems: 'center', gap: 10,
                                    background: activeSection === key ? 'rgba(99,102,241,0.1)' : 'transparent',
                                    color:      activeSection === key ? '#6366f1'               : 'var(--t-text3)',
                                    border: 'none',
                                    borderLeft: activeSection === key ? '3px solid #6366f1' : '3px solid transparent',
                                    cursor: 'pointer', textAlign: 'left',
                                    fontSize: 12, fontWeight: 700,
                                    transition: 'all 0.15s',
                                }}>
                                <span style={{ fontSize: 14 }}>{icon}</span>
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    {activeSection === 'appearance'    && <AppearanceSection />}
                    {activeSection === 'notifications' && <NotificationsSection user={user} updateProfile={updateProfile} />}
                    {activeSection === 'language'      && <LanguageSection user={user} updateProfile={updateProfile} />}
                    {activeSection === 'security'      && <SecuritySection user={user} />}
                    {activeSection === 'system'        && <SystemInfoSection />}
                    {activeSection === 'data'          && <DataSection user={user} />}
                </div>
            </div>
        </div>
    );
}
