/**
 * ProfilePage — fully functional profile management.
 * Tabs: Profile (personal info + avatar), Security (password + email), Activity (log)
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { useConstruction } from '../../../context/ConstructionContext';
import { useAccounts } from '../context/AccountsContext';
import { useSearchParams } from 'react-router-dom';
import accountsApi from '../services/accountsApi';
import { mediaUrl } from '../../../services/createApiClient';
import Avatar from '../components/shared/Avatar';
import Badge from '../components/shared/Badge';

// ── Shared style constants ─────────────────────────────────────────────────────
const inputStyle = {
    width: '100%', padding: '8px 12px', fontSize: 13, borderRadius: 10,
    border: '1px solid var(--t-border)', background: 'var(--t-bg)',
    color: 'var(--t-text)', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
};
const labelStyle = {
    display: 'block', fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
    letterSpacing: '0.07em', color: 'var(--t-text3)', marginBottom: 4,
};
const cardStyle = {
    borderRadius: 14, border: '1px solid var(--t-border)',
    background: 'var(--t-surface)', padding: 24, marginBottom: 20,
};
const sectionTitle = {
    margin: '0 0 16px', fontSize: 13, fontWeight: 900, color: 'var(--t-text)',
    textTransform: 'uppercase', letterSpacing: '0.06em',
};

const ROLE_COLORS = {
    SUPER_ADMIN: '#ef4444', HOME_OWNER: '#f97316',
    LEAD_ENGINEER: '#3b82f6', CONTRACTOR: '#8b5cf6', VIEWER: '#6b7280',
};

const ACTION_ICONS = {
    LOGIN: '🔐', LOGOUT: '🚪', CREATE: '✨', UPDATE: '✏️',
    DELETE: '🗑️', VIEW: '👁️', APPROVE: '✅', REJECT: '❌', PAY: '💰',
};
const ACTION_COLORS = {
    LOGIN: '#10b981', LOGOUT: '#6b7280', CREATE: '#6366f1', UPDATE: '#f59e0b',
    DELETE: '#ef4444', VIEW: '#3b82f6', APPROVE: '#10b981', REJECT: '#ef4444', PAY: '#f97316',
};

// ── Feedback banner ────────────────────────────────────────────────────────────
function Feedback({ msg }) {
    if (!msg) return null;
    const ok = msg.type === 'success';
    return (
        <div style={{
            padding: '10px 16px', borderRadius: 10, marginBottom: 16, fontSize: 13, fontWeight: 600,
            background: ok ? '#10b98118' : '#ef444418',
            color: ok ? '#10b981' : '#ef4444',
            border: `1px solid ${ok ? '#10b98130' : '#ef444430'}`,
        }}>
            {ok ? '✅' : '❌'} {msg.text}
        </div>
    );
}

// ── Profile Tab ────────────────────────────────────────────────────────────────
function ProfileTab({ user, updateProfile, refreshStats }) {
    const [form, setForm] = useState({
        first_name: '', last_name: '', bio: '',
        phone_number: '', address: '',
        preferred_language: 'en', notifications_enabled: true,
    });
    const [avatarPreview, setAvatarPreview] = useState(null);
    const [avatarFile,    setAvatarFile]    = useState(null);
    const [busy, setBusy] = useState(false);
    const [msg,  setMsg]  = useState(null);
    const fileRef = useRef();

    useEffect(() => {
        if (user) {
            setForm({
                first_name:            user.first_name            || '',
                last_name:             user.last_name             || '',
                bio:                   user.bio                   || '',
                phone_number:          user.phone_number          || '',
                address:               user.address               || '',
                preferred_language:    user.preferred_language    || 'en',
                notifications_enabled: user.notifications_enabled ?? true,
            });
        }
    }, [user]);

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            setMsg({ type: 'error', text: 'Image must be under 5 MB.' });
            return;
        }
        setAvatarFile(file);
        setAvatarPreview(URL.createObjectURL(file));
        setMsg(null);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setBusy(true); setMsg(null);
        try {
            let payload;
            if (avatarFile) {
                payload = new FormData();
                Object.entries(form).forEach(([k, v]) => payload.append(k, v));
                payload.append('profile_image', avatarFile);
            } else {
                payload = { ...form };
            }
            await updateProfile(payload);
            refreshStats?.();
            setMsg({ type: 'success', text: 'Profile updated successfully!' });
            setAvatarFile(null);
        } catch (err) {
            setMsg({ type: 'error', text: err?.response?.data?.detail || err?.response?.data?.error || 'Update failed.' });
        } finally {
            setBusy(false);
        }
    };

    const currentAvatarUrl = avatarPreview || (user?.profile_image ? mediaUrl(user.profile_image) : null);

    return (
        <form onSubmit={handleSave}>
            <Feedback msg={msg} />

            {/* Avatar card */}
            <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 20 }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                    {currentAvatarUrl ? (
                        <img src={currentAvatarUrl} alt="avatar"
                            style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '3px solid #6366f1' }}
                            onError={e => { e.target.style.display = 'none'; }}
                        />
                    ) : (
                        <Avatar user={user} size="xl" />
                    )}
                    <button type="button" onClick={() => fileRef.current?.click()} title="Change photo"
                        style={{ position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: '50%', background: '#6366f1', color: '#fff', border: '2px solid var(--t-bg)', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        📷
                    </button>
                    <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
                </div>
                <div>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--t-text)' }}>Profile Photo</p>
                    <p style={{ margin: '2px 0 8px', fontSize: 12, color: 'var(--t-text3)' }}>JPG, PNG or GIF — max 5 MB</p>
                    <button type="button" onClick={() => fileRef.current?.click()}
                        style={{ padding: '5px 14px', borderRadius: 8, border: '1px solid var(--t-border)', background: 'transparent', color: 'var(--t-text)', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                        {avatarFile ? '📁 ' + avatarFile.name.slice(0, 22) : 'Choose Photo'}
                    </button>
                </div>
            </div>

            {/* Personal info */}
            <div style={cardStyle}>
                <p style={sectionTitle}>Personal Information</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                    <div>
                        <label style={labelStyle}>First Name</label>
                        <input style={inputStyle} value={form.first_name}
                            onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
                            placeholder="First name" />
                    </div>
                    <div>
                        <label style={labelStyle}>Last Name</label>
                        <input style={inputStyle} value={form.last_name}
                            onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
                            placeholder="Last name" />
                    </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>Phone Number</label>
                    <input style={inputStyle} value={form.phone_number}
                        onChange={e => setForm(f => ({ ...f, phone_number: e.target.value }))}
                        placeholder="+977-XXXXXXXXXX" />
                </div>
                <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>Address</label>
                    <input style={inputStyle} value={form.address}
                        onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                        placeholder="City, District, Nepal" />
                </div>
                <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>Bio</label>
                    <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }}
                        value={form.bio}
                        onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                        placeholder="Short bio about yourself…" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                        <label style={labelStyle}>Preferred Language</label>
                        <select style={inputStyle} value={form.preferred_language}
                            onChange={e => setForm(f => ({ ...f, preferred_language: e.target.value }))}>
                            <option value="en">English</option>
                            <option value="ne">नेपाली</option>
                        </select>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 20 }}>
                        <input type="checkbox" id="notif" checked={form.notifications_enabled}
                            onChange={e => setForm(f => ({ ...f, notifications_enabled: e.target.checked }))}
                            style={{ width: 16, height: 16, cursor: 'pointer' }} />
                        <label htmlFor="notif" style={{ fontSize: 12, fontWeight: 700, color: 'var(--t-text)', cursor: 'pointer' }}>
                            Enable Notifications
                        </label>
                    </div>
                </div>
            </div>

            <button type="submit" disabled={busy}
                style={{ padding: '10px 28px', borderRadius: 10, background: '#6366f1', color: '#fff', fontWeight: 900, fontSize: 13, border: 'none', cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1 }}>
                {busy ? 'Saving…' : '💾 Save Profile'}
            </button>
        </form>
    );
}

// ── Security Tab ───────────────────────────────────────────────────────────────
function SecurityTab({ user, setUser }) {
    const [msg,  setMsg]  = useState(null);
    const [busy, setBusy] = useState(false);

    // Password form
    const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
    const setPw = (k, v) => setPwForm(p => ({ ...p, [k]: v }));

    const handlePasswordSave = async (e) => {
        e.preventDefault();
        if (pwForm.new_password !== pwForm.confirm_password) {
            setMsg({ type: 'error', text: 'New passwords do not match.' }); return;
        }
        if (pwForm.new_password.length < 8) {
            setMsg({ type: 'error', text: 'New password must be at least 8 characters.' }); return;
        }
        setBusy(true); setMsg(null);
        try {
            await accountsApi.changePassword({
                current_password: pwForm.current_password,
                new_password:     pwForm.new_password,
            });
            setPwForm({ current_password: '', new_password: '', confirm_password: '' });
            setMsg({ type: 'success', text: 'Password changed successfully!' });
        } catch (err) {
            setMsg({ type: 'error', text: err?.response?.data?.error || 'Password change failed.' });
        } finally {
            setBusy(false);
        }
    };

    // Email form
    const [emailForm, setEmailForm] = useState({ current_password: '', new_email: '' });
    const setEm = (k, v) => setEmailForm(p => ({ ...p, [k]: v }));

    const handleEmailSave = async (e) => {
        e.preventDefault();
        if (!emailForm.new_email.includes('@')) {
            setMsg({ type: 'error', text: 'Please enter a valid email address.' }); return;
        }
        setBusy(true); setMsg(null);
        try {
            const res = await accountsApi.changeEmail({
                current_password: emailForm.current_password,
                new_email:        emailForm.new_email,
            });
            const newEmail = res.data?.email || emailForm.new_email;
            setEmailForm({ current_password: '', new_email: '' });
            setMsg({ type: 'success', text: `Email updated to ${newEmail}` });
            // Reflect change in context user object immediately
            setUser?.(prev => prev ? { ...prev, email: newEmail } : prev);
        } catch (err) {
            setMsg({ type: 'error', text: err?.response?.data?.error || 'Email change failed.' });
        } finally {
            setBusy(false);
        }
    };

    return (
        <div>
            <Feedback msg={msg} />

            {/* Account info card */}
            <div style={cardStyle}>
                <p style={sectionTitle}>Account Information</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {[
                        { label: 'Email',      value: user?.email    || '—' },
                        { label: 'Username',   value: user?.username || '—' },
                        { label: 'Status',     value: user?.is_active   ? 'Active'       : 'Inactive'      },
                        { label: 'Verified',   value: user?.is_verified ? '✅ Verified'  : '⚠️ Not verified' },
                        {
                            label: 'Joined',
                            value: user?.date_joined
                                ? new Date(user.date_joined).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: '2-digit' })
                                : '—',
                        },
                        {
                            label: 'Last Login',
                            value: user?.frontend_last_login
                                ? new Date(user.frontend_last_login).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
                                : '—',
                        },
                    ].map(({ label, value }) => (
                        <div key={label} style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--t-bg)', border: '1px solid var(--t-border)' }}>
                            <p style={{ margin: 0, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--t-text3)', marginBottom: 2 }}>{label}</p>
                            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--t-text)', wordBreak: 'break-all' }}>{value}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Change Password */}
            <form onSubmit={handlePasswordSave}>
                <div style={cardStyle}>
                    <p style={sectionTitle}>🔑 Change Password</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {[
                            { key: 'current_password', label: 'Current Password',    placeholder: 'Enter your current password' },
                            { key: 'new_password',      label: 'New Password',         placeholder: 'Min. 8 characters'           },
                            { key: 'confirm_password',  label: 'Confirm New Password', placeholder: 'Repeat new password'          },
                        ].map(({ key, label, placeholder }) => (
                            <div key={key}>
                                <label style={labelStyle}>{label}</label>
                                <input type="password" style={inputStyle} required
                                    value={pwForm[key]} onChange={e => setPw(key, e.target.value)}
                                    placeholder={placeholder} />
                            </div>
                        ))}
                    </div>
                    <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 10, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', fontSize: 11, color: 'var(--t-text3)' }}>
                        💡 Password must be at least 8 characters. You'll stay logged in but use the new password next time.
                    </div>
                </div>
                <button type="submit" disabled={busy}
                    style={{ padding: '10px 28px', borderRadius: 10, background: '#6366f1', color: '#fff', fontWeight: 900, fontSize: 13, border: 'none', cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1, marginBottom: 24 }}>
                    {busy ? 'Changing…' : '🔑 Change Password'}
                </button>
            </form>

            {/* Change Email */}
            <form onSubmit={handleEmailSave}>
                <div style={cardStyle}>
                    <p style={sectionTitle}>📧 Change Email</p>
                    <p style={{ margin: '0 0 16px', fontSize: 12, color: 'var(--t-text3)' }}>
                        Your email is your login identifier. Confirm your password before changing it.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div>
                            <label style={labelStyle}>New Email Address</label>
                            <input type="email" style={inputStyle} required
                                value={emailForm.new_email}
                                onChange={e => setEm('new_email', e.target.value)}
                                placeholder="new@example.com" />
                        </div>
                        <div>
                            <label style={labelStyle}>Current Password (to confirm)</label>
                            <input type="password" style={inputStyle} required
                                value={emailForm.current_password}
                                onChange={e => setEm('current_password', e.target.value)}
                                placeholder="Enter current password to confirm" />
                        </div>
                    </div>
                </div>
                <button type="submit" disabled={busy}
                    style={{ padding: '10px 28px', borderRadius: 10, background: '#f97316', color: '#fff', fontWeight: 900, fontSize: 13, border: 'none', cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1 }}>
                    {busy ? 'Updating…' : '📧 Update Email'}
                </button>
            </form>
        </div>
    );
}

// ── Activity Tab ───────────────────────────────────────────────────────────────
function ActivityTab({ user }) {
    const [logs,    setLogs]    = useState([]);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState(null);
    const [filter,  setFilter]  = useState('ALL');
    const [days,    setDays]    = useState('30');

    const load = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const params = { days };
            if (filter !== 'ALL') params.action = filter;
            if (user?.id) params.user_id = user.id;
            const res = await accountsApi.getActivityLogs(params);
            setLogs(res.data?.results ?? res.data ?? []);
        } catch {
            setError('Failed to load activity logs.');
        } finally {
            setLoading(false);
        }
    }, [filter, days, user?.id]);

    useEffect(() => { load(); }, [load]);

    const ACTIONS = ['ALL', 'LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'DELETE', 'VIEW', 'APPROVE', 'PAY'];

    return (
        <div>
            {/* Filters */}
            <div style={{ ...cardStyle, padding: 16, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1 }}>
                    {ACTIONS.map(a => (
                        <button key={a} onClick={() => setFilter(a)}
                            style={{ padding: '4px 12px', borderRadius: 99, cursor: 'pointer', fontSize: 11, fontWeight: 700, transition: 'all 0.15s',
                                background: filter === a ? (ACTION_COLORS[a] || '#6366f1') : 'transparent',
                                color:      filter === a ? '#fff' : 'var(--t-text3)',
                                border:     `1px solid ${filter === a ? 'transparent' : 'var(--t-border)'}`,
                            }}>
                            {a === 'ALL' ? 'All' : `${ACTION_ICONS[a] || ''} ${a}`}
                        </button>
                    ))}
                </div>
                <select value={days} onChange={e => setDays(e.target.value)}
                    style={{ ...inputStyle, width: 'auto', padding: '4px 10px', fontSize: 12 }}>
                    <option value="7">Last 7 days</option>
                    <option value="30">Last 30 days</option>
                    <option value="90">Last 90 days</option>
                    <option value="365">Last year</option>
                </select>
            </div>

            {loading && (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--t-text3)', fontSize: 13 }}>
                    Loading activity…
                </div>
            )}
            {error && (
                <div style={{ padding: '12px 16px', borderRadius: 10, background: '#ef444418', color: '#ef4444', fontSize: 13, fontWeight: 600, border: '1px solid #ef444430' }}>
                    ❌ {error}
                </div>
            )}
            {!loading && !error && logs.length === 0 && (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--t-text3)', fontSize: 13 }}>
                    No activity found for this period.
                </div>
            )}
            {!loading && logs.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {logs.map((log, i) => {
                        const clr = ACTION_COLORS[log.action] || '#6b7280';
                        const ico = ACTION_ICONS[log.action]  || '📋';
                        const ts  = new Date(log.timestamp);
                        return (
                            <div key={log.id || i} style={{ ...cardStyle, marginBottom: 0, padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                                <div style={{ width: 36, height: 36, borderRadius: 10, background: clr + '18', border: `1px solid ${clr}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                                    {ico}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
                                        <span style={{ fontSize: 11, fontWeight: 800, color: clr, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{log.action}</span>
                                        <span style={{ fontSize: 11, color: 'var(--t-text3)' }}>·</span>
                                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--t-text2)' }}>{log.model_name}</span>
                                        {log.object_repr && (
                                            <>
                                                <span style={{ fontSize: 11, color: 'var(--t-text3)' }}>·</span>
                                                <span style={{ fontSize: 11, color: 'var(--t-text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>{log.object_repr}</span>
                                            </>
                                        )}
                                        {log.success === false && (
                                            <span style={{ fontSize: 10, fontWeight: 800, color: '#ef4444', background: '#ef444418', border: '1px solid #ef444430', borderRadius: 99, padding: '1px 7px' }}>FAILED</span>
                                        )}
                                    </div>
                                    {log.description && (
                                        <p style={{ margin: 0, fontSize: 12, color: 'var(--t-text3)' }}>{log.description}</p>
                                    )}
                                    {log.endpoint && (
                                        <p style={{ margin: '2px 0 0', fontSize: 10, color: 'var(--t-text3)', fontFamily: 'monospace' }}>
                                            {log.method} {log.endpoint}
                                        </p>
                                    )}
                                </div>
                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                    <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: 'var(--t-text2)' }}>
                                        {ts.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                    <p style={{ margin: '1px 0 0', fontSize: 10, color: 'var(--t-text3)' }}>
                                        {ts.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                                    </p>
                                    {log.ip_address && (
                                        <p style={{ margin: '1px 0 0', fontSize: 9, color: 'var(--t-text3)', fontFamily: 'monospace' }}>{log.ip_address}</p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ── Main ProfilePage ───────────────────────────────────────────────────────────
export default function ProfilePage() {
    const { user, updateProfile, setUser } = useConstruction();
    const { refreshStats }                  = useAccounts();
    const [params]                          = useSearchParams();

    const defaultTab = params.get('tab') === 'security' ? 'security'
                     : params.get('tab') === 'activity'  ? 'activity'
                     : 'profile';
    const [tab, setTab] = useState(defaultTab);

    if (!user) return null;

    const TABS = [
        { key: 'profile',  label: '👤 Profile'  },
        { key: 'security', label: '🔑 Security' },
        { key: 'activity', label: '📋 Activity' },
    ];

    return (
        <div style={{ maxWidth: 760, margin: '0 auto' }}>

            {/* ── User banner ──────────────────────────────────────────── */}
            <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
                <div style={{ flexShrink: 0 }}>
                    {user.profile_image
                        ? <img src={mediaUrl(user.profile_image)} alt="avatar"
                            style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '3px solid #6366f1' }}
                            onError={e => { e.target.style.display = 'none'; }}
                          />
                        : <Avatar user={user} size="xl" />
                    }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 20, fontWeight: 900, color: 'var(--t-text)' }}>
                        {`${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username}
                    </p>
                    <p style={{ margin: '2px 0 6px', fontSize: 13, color: 'var(--t-text3)' }}>{user.email}</p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {user.role && <Badge label={user.role.name} color={ROLE_COLORS[user.role.code] || '#6b7280'} />}
                        <Badge label={user.is_active ? 'Active' : 'Inactive'} color={user.is_active ? '#10b981' : '#ef4444'} />
                        {user.is_system_admin && <Badge label="System Admin" color="#ef4444" />}
                        {user.is_verified && <Badge label="Verified" color="#10b981" />}
                    </div>
                    {user.bio && (
                        <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--t-text3)', fontStyle: 'italic' }}>{user.bio}</p>
                    )}
                    <p style={{ margin: '4px 0 0', fontSize: 10, color: 'var(--t-text3)' }}>
                        Joined {user.date_joined
                            ? new Date(user.date_joined).toLocaleDateString('en-IN', { year: 'numeric', month: 'long' })
                            : '—'}
                        {user.frontend_last_login
                            ? ` · Last login ${new Date(user.frontend_last_login).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`
                            : ''}
                        {user.phone_number ? ` · 📞 ${user.phone_number}` : ''}
                    </p>
                </div>
            </div>

            {/* ── Tab bar ──────────────────────────────────────────────── */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 20, padding: '4px', borderRadius: 12, background: 'var(--t-surface)', border: '1px solid var(--t-border)', width: 'fit-content' }}>
                {TABS.map(({ key, label }) => (
                    <button key={key} onClick={() => setTab(key)}
                        style={{ padding: '6px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, transition: 'all 0.15s',
                            background: tab === key ? '#6366f1' : 'transparent',
                            color:      tab === key ? '#fff'    : 'var(--t-text3)',
                        }}>
                        {label}
                    </button>
                ))}
            </div>

            {/* ── Tab content ──────────────────────────────────────────── */}
            {tab === 'profile'  && <ProfileTab  user={user} updateProfile={updateProfile} refreshStats={refreshStats} />}
            {tab === 'security' && <SecurityTab user={user} setUser={setUser} />}
            {tab === 'activity' && <ActivityTab user={user} />}
        </div>
    );
}
