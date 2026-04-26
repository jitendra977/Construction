/**
 * ProfilePage — edit current user's profile and change password.
 */
import { useState, useRef, useEffect } from 'react';
import { useConstruction } from '../../../context/ConstructionContext';
import { useAccounts } from '../context/AccountsContext';
import { useSearchParams } from 'react-router-dom';
import accountsApi from '../services/accountsApi';
import Avatar from '../components/shared/Avatar';
import Badge from '../components/shared/Badge';

const inp = `
    width: 100%; padding: 8px 12px; font-size: 13px; border-radius: 10px;
    border: 1px solid var(--t-border); background: var(--t-bg); color: var(--t-text);
    outline: none; font-family: inherit; box-sizing: border-box;
`;
const lbl = `
    display: block; font-size: 10px; font-weight: 800; text-transform: uppercase;
    letter-spacing: 0.07em; color: var(--t-text3); margin-bottom: 4px;
`;

const ROLE_COLORS = { SUPER_ADMIN:'#ef4444', HOME_OWNER:'#f97316', LEAD_ENGINEER:'#3b82f6', CONTRACTOR:'#8b5cf6', VIEWER:'#6b7280' };

export default function ProfilePage() {
    const { user, updateProfile } = useConstruction();
    const { refreshStats }        = useAccounts();
    const [params]                = useSearchParams();

    const [tab, setTab]   = useState(params.get('tab') === 'security' ? 'security' : 'profile');
    const [busy, setBusy] = useState(false);
    const [msg,  setMsg]  = useState(null); // {type:'success'|'error', text}

    // ── Profile form ──────────────────────────────────────────────────────────
    const [form, setForm] = useState({
        first_name: '', last_name: '', bio: '',
        phone_number: '', address: '',
        preferred_language: 'en', notifications_enabled: true,
    });
    const [avatarPreview, setAvatarPreview] = useState(null);
    const [avatarFile,    setAvatarFile]    = useState(null);
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
        setAvatarFile(file);
        setAvatarPreview(URL.createObjectURL(file));
    };

    const handleProfileSave = async (e) => {
        e.preventDefault();
        setBusy(true); setMsg(null);
        try {
            let payload;
            if (avatarFile) {
                payload = new FormData();
                Object.entries(form).forEach(([k, v]) => payload.append(k, v));
                payload.append('profile_image', avatarFile);
            } else {
                payload = form;
            }
            await updateProfile(payload);
            refreshStats();
            setMsg({ type: 'success', text: 'Profile updated successfully!' });
            setAvatarFile(null);
        } catch (err) {
            setMsg({ type: 'error', text: err?.response?.data?.detail || 'Update failed.' });
        } finally {
            setBusy(false);
        }
    };

    // ── Password form ─────────────────────────────────────────────────────────
    const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
    const setPw = (k, v) => setPwForm(p => ({ ...p, [k]: v }));

    const handlePasswordSave = async (e) => {
        e.preventDefault();
        if (pwForm.new_password !== pwForm.confirm_password) {
            setMsg({ type: 'error', text: 'New passwords do not match.' });
            return;
        }
        if (pwForm.new_password.length < 8) {
            setMsg({ type: 'error', text: 'New password must be at least 8 characters.' });
            return;
        }
        setBusy(true); setMsg(null);
        try {
            await accountsApi.changePassword({
                current_password: pwForm.current_password,
                new_password:     pwForm.new_password,
            });
            setPwForm({ current_password: '', new_password: '', confirm_password: '' });
            setMsg({ type: 'success', text: 'Password changed! Please log in again next time.' });
        } catch (err) {
            setMsg({ type: 'error', text: err?.response?.data?.error || 'Password change failed.' });
        } finally {
            setBusy(false);
        }
    };

    if (!user) return null;

    const cardStyle = { borderRadius: 14, border: '1px solid var(--t-border)', background: 'var(--t-surface)', padding: 24, marginBottom: 20 };
    const inputStyle = { ...{ width: '100%', padding: '8px 12px', fontSize: 13, borderRadius: 10, border: '1px solid var(--t-border)', background: 'var(--t-bg)', color: 'var(--t-text)', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' } };
    const labelStyle = { display: 'block', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--t-text3)', marginBottom: 4 };

    return (
        <div style={{ maxWidth: 760, margin: '0 auto' }}>

            {/* ── User banner ────────────────────────────────────────── */}
            <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
                <div style={{ position: 'relative' }}>
                    {avatarPreview
                        ? <img src={avatarPreview} alt="preview" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '3px solid #6366f1' }} />
                        : <Avatar user={user} size="xl" />
                    }
                    <button onClick={() => fileRef.current?.click()}
                        style={{ position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderRadius: '50%', background: '#6366f1', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        ✏️
                    </button>
                    <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 20, fontWeight: 900, color: 'var(--t-text)' }}>
                        {`${user.first_name} ${user.last_name}`.trim() || user.username}
                    </p>
                    <p style={{ margin: '2px 0 6px', fontSize: 13, color: 'var(--t-text3)' }}>{user.email}</p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {user.role && <Badge label={user.role.name} color={ROLE_COLORS[user.role.code] || '#6b7280'} />}
                        <Badge label={user.is_active ? 'Active' : 'Inactive'} color={user.is_active ? '#10b981' : '#ef4444'} />
                        {user.is_system_admin && <Badge label="System Admin" color="#ef4444" />}
                    </div>
                    <p style={{ margin: '6px 0 0', fontSize: 10, color: 'var(--t-text3)' }}>
                        Joined {user.date_joined ? new Date(user.date_joined).toLocaleDateString('en-IN', { year: 'numeric', month: 'long' }) : '—'}
                        {user.frontend_last_login ? ` · Last login ${new Date(user.frontend_last_login).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}` : ''}
                    </p>
                </div>
            </div>

            {/* ── Tabs ───────────────────────────────────────────────── */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 20, padding: '4px', borderRadius: 12, background: 'var(--t-surface)', border: '1px solid var(--t-border)', width: 'fit-content' }}>
                {[['profile','👤 Profile'],['security','🔑 Security']].map(([key, label]) => (
                    <button key={key} onClick={() => { setTab(key); setMsg(null); }}
                        style={{ padding: '6px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, transition: 'all 0.15s',
                            background: tab === key ? '#6366f1' : 'transparent',
                            color:      tab === key ? '#fff'    : 'var(--t-text3)',
                        }}>
                        {label}
                    </button>
                ))}
            </div>

            {/* ── Feedback message ─────────────────────────────────── */}
            {msg && (
                <div style={{ padding: '10px 16px', borderRadius: 10, marginBottom: 16, fontSize: 13, fontWeight: 600,
                    background: msg.type === 'success' ? '#10b98118' : '#ef444418',
                    color:      msg.type === 'success' ? '#10b981'   : '#ef4444',
                    border:     `1px solid ${msg.type === 'success' ? '#10b98130' : '#ef444430'}`,
                }}>
                    {msg.type === 'success' ? '✅' : '❌'} {msg.text}
                </div>
            )}

            {/* ── Profile tab ────────────────────────────────────────── */}
            {tab === 'profile' && (
                <form onSubmit={handleProfileSave}>
                    <div style={cardStyle}>
                        <p style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 900, color: 'var(--t-text)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Personal Information</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                            <div>
                                <label style={labelStyle}>First Name</label>
                                <input style={inputStyle} value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} placeholder="First name" />
                            </div>
                            <div>
                                <label style={labelStyle}>Last Name</label>
                                <input style={inputStyle} value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} placeholder="Last name" />
                            </div>
                        </div>
                        <div style={{ marginBottom: 16 }}>
                            <label style={labelStyle}>Phone Number</label>
                            <input style={inputStyle} value={form.phone_number} onChange={e => setForm(f => ({ ...f, phone_number: e.target.value }))} placeholder="+977-XXXXXXXXXX" />
                        </div>
                        <div style={{ marginBottom: 16 }}>
                            <label style={labelStyle}>Address</label>
                            <input style={inputStyle} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="City, District, Nepal" />
                        </div>
                        <div style={{ marginBottom: 16 }}>
                            <label style={labelStyle}>Bio</label>
                            <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }} value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} placeholder="Short bio about yourself…" />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <div>
                                <label style={labelStyle}>Preferred Language</label>
                                <select style={inputStyle} value={form.preferred_language} onChange={e => setForm(f => ({ ...f, preferred_language: e.target.value }))}>
                                    <option value="en">English</option>
                                    <option value="ne">नेपाली</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 20 }}>
                                <input type="checkbox" id="notif" checked={form.notifications_enabled} onChange={e => setForm(f => ({ ...f, notifications_enabled: e.target.checked }))} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                                <label htmlFor="notif" style={{ fontSize: 12, fontWeight: 700, color: 'var(--t-text)', cursor: 'pointer' }}>Enable Notifications</label>
                            </div>
                        </div>
                    </div>
                    <button type="submit" disabled={busy}
                        style={{ padding: '10px 28px', borderRadius: 10, background: '#6366f1', color: '#fff', fontWeight: 900, fontSize: 13, border: 'none', cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
                        {busy ? 'Saving…' : '💾 Save Profile'}
                    </button>
                </form>
            )}

            {/* ── Security tab ─────────────────────────────────────────── */}
            {tab === 'security' && (
                <form onSubmit={handlePasswordSave}>
                    <div style={cardStyle}>
                        <p style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 900, color: 'var(--t-text)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Change Password</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            {[
                                { key: 'current_password', label: 'Current Password',  placeholder: 'Enter current password' },
                                { key: 'new_password',     label: 'New Password',      placeholder: 'Min. 8 characters'      },
                                { key: 'confirm_password', label: 'Confirm New Password', placeholder: 'Repeat new password'  },
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
                            💡 Password must be at least 8 characters. You'll remain logged in but use the new password next time.
                        </div>
                    </div>
                    <button type="submit" disabled={busy}
                        style={{ padding: '10px 28px', borderRadius: 10, background: '#6366f1', color: '#fff', fontWeight: 900, fontSize: 13, border: 'none', cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
                        {busy ? 'Changing…' : '🔑 Change Password'}
                    </button>
                </form>
            )}
        </div>
    );
}
