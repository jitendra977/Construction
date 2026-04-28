/**
 * UsersPage — Advanced user management with project assignment & permissions.
 *
 * Features:
 *   • List / search / filter users
 *   • Create user with role + project assignment
 *   • Full edit drawer: basic info, project access, security
 *   • Per-project role selection + granular permission toggles
 *   • Activate / deactivate / delete
 *   • Reset password (admin)
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useAccounts } from '../context/AccountsContext';
import accountsApi from '../services/accountsApi';
import Avatar from '../components/shared/Avatar';
import Badge from '../components/shared/Badge';
import Modal from '../components/shared/Modal';

// ── Style helpers ─────────────────────────────────────────────────────────────
const inp = (extra = {}) => ({
    width: '100%', padding: '8px 12px', fontSize: 13, borderRadius: 10,
    border: '1px solid var(--t-border)', background: 'var(--t-bg)',
    color: 'var(--t-text)', outline: 'none', fontFamily: 'inherit',
    boxSizing: 'border-box', ...extra,
});
const lbl = {
    display: 'block', fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
    letterSpacing: '0.07em', color: 'var(--t-text3)', marginBottom: 4,
};
const fmt  = (iso) => iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtT = (iso) => iso ? new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Never';

const ROLE_COLORS = {
    SUPER_ADMIN: '#ef4444', HOME_OWNER: '#f97316',
    LEAD_ENGINEER: '#3b82f6', CONTRACTOR: '#8b5cf6', VIEWER: '#6b7280',
};

const PROJECT_ROLES = [
    { value: 'OWNER',      label: 'Owner' },
    { value: 'MANAGER',    label: 'Project Manager' },
    { value: 'ENGINEER',   label: 'Engineer' },
    { value: 'SUPERVISOR', label: 'Supervisor' },
    { value: 'CONTRACTOR', label: 'Contractor' },
    { value: 'VIEWER',     label: 'Viewer' },
];

const PROJECT_ROLE_COLORS = {
    OWNER: '#f97316', MANAGER: '#f97316', ENGINEER: '#3b82f6',
    SUPERVISOR: '#8b5cf6', CONTRACTOR: '#10b981', VIEWER: '#64748b',
};

const PERM_LABELS = {
    can_manage_members:   'Manage Team',
    can_manage_finances:  'Manage Finances',
    can_view_finances:    'View Finances',
    can_manage_phases:    'Manage Phases',
    can_manage_structure: 'Manage Structure',
    can_manage_resources: 'Manage Resources',
    can_upload_media:     'Upload Media',
};

// ── Create / Invite form ──────────────────────────────────────────────────────
function InviteForm({ roles, onDone }) {
    const [form, setForm] = useState({
        email: '', username: '', first_name: '', last_name: '',
        role_id: '', password: '',
    });
    const [busy,   setBusy]   = useState(false);
    const [err,    setErr]    = useState('');
    const [result, setResult] = useState(null);
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setBusy(true); setErr('');
        try {
            const res = await accountsApi.inviteUser(form);
            setResult(res.data);
        } catch (ex) {
            setErr(ex?.response?.data?.error || ex?.response?.data?.detail || 'Failed to create user.');
        } finally { setBusy(false); }
    };

    if (result) return (
        <div style={{ padding: 24 }}>
            <div style={{ padding: 16, borderRadius: 12, background: '#10b98112', border: '1px solid #10b98130', marginBottom: 20 }}>
                <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 900, color: '#10b981' }}>✅ User Created!</p>
                <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--t-text3)' }}>{result.message}</p>
                {result.temp_password && (
                    <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--t-bg)', border: '1px solid var(--t-border)' }}>
                        <p style={{ margin: '0 0 2px', fontSize: 10, fontWeight: 800, color: 'var(--t-text3)', textTransform: 'uppercase' }}>Temporary Password (show once)</p>
                        <p style={{ margin: 0, fontFamily: 'monospace', fontSize: 18, fontWeight: 900, color: '#f97316', letterSpacing: 2 }}>{result.temp_password}</p>
                    </div>
                )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { setResult(null); setForm({ email:'',username:'',first_name:'',last_name:'',role_id:'',password:'' }); }}
                    style={{ flex:1, padding:'9px 0', borderRadius:10, border:'1px solid var(--t-border)', background:'var(--t-bg)', color:'var(--t-text)', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                    + Another
                </button>
                <button onClick={onDone}
                    style={{ flex:1, padding:'9px 0', borderRadius:10, background:'#6366f1', color:'#fff', fontSize:12, fontWeight:700, border:'none', cursor:'pointer' }}>
                    Done
                </button>
            </div>
        </div>
    );

    return (
        <form onSubmit={handleSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {err && <div style={{ padding:'8px 12px', borderRadius:8, background:'#ef444412', color:'#ef4444', fontSize:12, fontWeight:600, border:'1px solid #ef444430' }}>❌ {err}</div>}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div><label style={lbl}>First Name</label><input style={inp()} value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder="Ram" /></div>
                <div><label style={lbl}>Last Name</label><input style={inp()} value={form.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Bahadur" /></div>
            </div>
            <div><label style={lbl}>Email <span style={{ color:'#ef4444' }}>*</span></label>
                <input type="email" required style={inp()} value={form.email} onChange={e => set('email', e.target.value)} placeholder="user@example.com" /></div>
            <div><label style={lbl}>Username <span style={{ fontSize:9, color:'var(--t-text3)' }}>(auto if blank)</span></label>
                <input style={inp()} value={form.username} onChange={e => set('username', e.target.value)} placeholder="rambahadur" /></div>
            <div>
                <label style={lbl}>System Role</label>
                <select style={inp()} value={form.role_id} onChange={e => set('role_id', e.target.value)}>
                    <option value="">— No role —</option>
                    {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
            </div>
            <div><label style={lbl}>Password <span style={{ fontSize:9, color:'var(--t-text3)' }}>(auto if blank)</span></label>
                <input style={inp()} value={form.password} onChange={e => set('password', e.target.value)} placeholder="Min. 8 chars" /></div>
            <button type="submit" disabled={busy}
                style={{ padding:'10px 0', borderRadius:10, background:'#6366f1', color:'#fff', fontSize:13, fontWeight:900, border:'none', cursor:'pointer', opacity: busy ? 0.6 : 1 }}>
                {busy ? 'Creating…' : '✉️ Create User'}
            </button>
        </form>
    );
}

// ── Project Access Panel (inside edit drawer) ─────────────────────────────────
function ProjectAccessPanel({ userId }) {
    const [projects, setProjects] = useState([]);
    const [loading,  setLoading]  = useState(true);
    const [saving,   setSaving]   = useState(null);  // project_id being saved
    const [expanded, setExpanded] = useState(null);  // project_id with perms open
    const [err,      setErr]      = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await accountsApi.getUserProjects(userId);
            setProjects(res.data);
        } catch { setErr('Failed to load projects.'); }
        finally   { setLoading(false); }
    }, [userId]);

    useEffect(() => { load(); }, [load]);

    const toggle = async (p) => {
        setSaving(p.project_id);
        try {
            await accountsApi.setUserProject(userId, {
                project_id: p.project_id,
                action: p.is_assigned ? 'remove' : 'add',
                role: 'VIEWER',
            });
            await load();
        } catch (e) {
            setErr(e?.response?.data?.error || 'Failed.');
        } finally { setSaving(null); }
    };

    const setRole = async (p, role) => {
        setSaving(p.project_id);
        try {
            await accountsApi.setUserProject(userId, {
                project_id: p.project_id,
                action: 'add',
                role,
            });
            await load();
        } catch { setErr('Failed to update role.'); }
        finally  { setSaving(null); }
    };

    const setPerm = async (p, field, value) => {
        setSaving(p.project_id);
        try {
            await accountsApi.setUserProject(userId, {
                project_id: p.project_id,
                action: 'add',
                role: p.member_role || 'VIEWER',
                ...p.permissions,
                [field]: value,
            });
            await load();
        } catch { setErr('Failed to update permission.'); }
        finally  { setSaving(null); }
    };

    if (loading) return <div style={{ padding:30, textAlign:'center', color:'var(--t-text3)', fontSize:13 }}>Loading projects…</div>;

    return (
        <div>
            {err && <div style={{ padding:'8px 12px', borderRadius:8, background:'#ef444412', color:'#ef4444', fontSize:12, marginBottom:12 }}>{err}</div>}
            <p style={{ margin:'0 0 12px', fontSize:12, color:'var(--t-text3)' }}>
                Toggle project access, set per-project role, and fine-tune individual permissions.
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {projects.map(p => {
                    const busy = saving === p.project_id;
                    const roleColor = PROJECT_ROLE_COLORS[p.member_role] || '#64748b';
                    const isExpanded = expanded === p.project_id && p.is_assigned;

                    return (
                        <div key={p.project_id} style={{
                            borderRadius:12, border: `1px solid ${p.is_assigned ? roleColor + '40' : 'var(--t-border)'}`,
                            background: p.is_assigned ? `${roleColor}08` : 'var(--t-bg)',
                            overflow:'hidden', transition:'all 0.2s',
                        }}>
                            {/* Row */}
                            <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px' }}>
                                {/* Toggle */}
                                <button onClick={() => toggle(p)} disabled={busy} style={{
                                    width:36, height:20, borderRadius:10, border:'none', cursor:'pointer',
                                    background: p.is_assigned ? '#10b981' : 'var(--t-border)',
                                    position:'relative', flexShrink:0, transition:'background 0.2s',
                                }}>
                                    <span style={{
                                        position:'absolute', top:2, width:16, height:16, borderRadius:'50%',
                                        background:'#fff', transition:'left 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.2)',
                                        left: p.is_assigned ? 18 : 2,
                                    }} />
                                </button>

                                <div style={{ flex:1 }}>
                                    <p style={{ margin:0, fontWeight:800, fontSize:13, color:'var(--t-text)' }}>{p.project_name}</p>
                                    {p.is_assigned && p.member_role && (
                                        <span style={{ fontSize:10, fontWeight:700, color: roleColor }}>{p.member_role}</span>
                                    )}
                                </div>

                                {p.is_assigned && (
                                    <>
                                        <select
                                            value={p.member_role || 'VIEWER'}
                                            onChange={e => setRole(p, e.target.value)}
                                            disabled={busy}
                                            style={{ padding:'4px 8px', borderRadius:7, fontSize:11, fontWeight:700, border:`1px solid ${roleColor}40`, background:`${roleColor}15`, color: roleColor, cursor:'pointer' }}>
                                            {PROJECT_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                                        </select>
                                        <button
                                            onClick={() => setExpanded(isExpanded ? null : p.project_id)}
                                            style={{ padding:'4px 8px', borderRadius:7, fontSize:11, fontWeight:700, border:'1px solid var(--t-border)', background:'var(--t-surface)', color:'var(--t-text3)', cursor:'pointer' }}>
                                            {isExpanded ? '▲ Perms' : '▼ Perms'}
                                        </button>
                                    </>
                                )}
                                {busy && <span style={{ fontSize:11, color:'var(--t-text3)' }}>…</span>}
                            </div>

                            {/* Permission toggles */}
                            {isExpanded && p.permissions && (
                                <div style={{ padding:'10px 14px 14px', borderTop:'1px solid var(--t-border)', display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                                    {Object.entries(PERM_LABELS).map(([field, label]) => {
                                        const on = p.permissions[field];
                                        return (
                                            <button key={field} onClick={() => setPerm(p, field, !on)} disabled={busy}
                                                style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 10px', borderRadius:8, border:`1px solid ${on ? '#10b98140' : 'var(--t-border)'}`, background: on ? '#10b98112' : 'var(--t-surface)', cursor:'pointer', textAlign:'left' }}>
                                                <span style={{ width:10, height:10, borderRadius:3, background: on ? '#10b981' : 'var(--t-border)', flexShrink:0 }} />
                                                <span style={{ fontSize:11, fontWeight:700, color: on ? '#10b981' : 'var(--t-text3)' }}>{label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ── Full user edit drawer ─────────────────────────────────────────────────────
function UserDrawer({ user, roles, onClose, onRefresh }) {
    const [tab,     setTab]     = useState('info');
    const [form,    setForm]    = useState({
        first_name:   user.first_name   || '',
        last_name:    user.last_name    || '',
        phone_number: user.phone_number || '',
        email:        user.email        || '',
        role_id:      user.role?.id     || '',
        bio:          user.bio          || '',
    });
    const [resetPw, setResetPw] = useState('');
    const [busy,    setBusy]    = useState(false);
    const [err,     setErr]     = useState('');
    const [msg,     setMsg]     = useState('');
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const save = async (e) => {
        e.preventDefault();
        setBusy(true); setErr(''); setMsg('');
        try {
            await accountsApi.updateUser(user.id, { ...form, role_id: form.role_id || null });
            setMsg('Saved successfully.');
            onRefresh();
            setTimeout(() => setMsg(''), 2500);
        } catch (ex) {
            setErr(ex?.response?.data?.detail || JSON.stringify(ex?.response?.data) || 'Save failed.');
        } finally { setBusy(false); }
    };

    const resetPassword = async () => {
        if (resetPw.length < 8) { setErr('Password must be at least 8 characters.'); return; }
        setBusy(true); setErr(''); setMsg('');
        try {
            await accountsApi.resetUserPassword(user.id, { new_password: resetPw });
            setMsg('Password reset successfully.'); setResetPw('');
        } catch (ex) { setErr(ex?.response?.data?.error || 'Reset failed.'); }
        finally { setBusy(false); }
    };

    const toggleActive = async () => {
        setBusy(true); setErr('');
        try {
            if (user.is_active) await accountsApi.deactivateUser(user.id);
            else                await accountsApi.activateUser(user.id);
            onRefresh(); onClose();
        } catch { setErr('Failed to change status.'); }
        finally  { setBusy(false); }
    };

    const TABS = [
        { id: 'info',     label: '👤 Info'     },
        { id: 'projects', label: '🗂️ Projects'  },
        { id: 'security', label: '🔐 Security'  },
    ];

    return (
        <div style={{ position:'fixed', inset:0, zIndex:1000, display:'flex' }}>
            {/* Backdrop */}
            <div style={{ flex:1, background:'rgba(0,0,0,0.45)', backdropFilter:'blur(3px)' }} onClick={onClose} />

            {/* Panel */}
            <div style={{ width:480, maxWidth:'95vw', background:'var(--t-surface)', display:'flex', flexDirection:'column', boxShadow:'-8px 0 40px rgba(0,0,0,0.25)', borderLeft:'1px solid var(--t-border)' }}>

                {/* Header */}
                <div style={{ padding:'20px 24px 0', borderBottom:'1px solid var(--t-border)', flexShrink:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:16 }}>
                        <Avatar user={user} size="md" />
                        <div style={{ flex:1, minWidth:0 }}>
                            <p style={{ margin:0, fontWeight:900, fontSize:16, color:'var(--t-text)' }}>
                                {`${user.first_name} ${user.last_name}`.trim() || user.username}
                            </p>
                            <p style={{ margin:'2px 0 0', fontSize:12, color:'var(--t-text3)' }}>{user.email}</p>
                            <div style={{ display:'flex', gap:6, marginTop:4, flexWrap:'wrap' }}>
                                {user.role && <Badge label={user.role.name} color={ROLE_COLORS[user.role.code] || '#6b7280'} />}
                                <Badge label={user.is_active ? 'Active' : 'Inactive'} color={user.is_active ? '#10b981' : '#ef4444'} />
                                {user.assigned_projects_data?.map(p => (
                                    <Badge key={p.id} label={p.name} color="#3b82f6" />
                                ))}
                            </div>
                        </div>
                        <button onClick={onClose} style={{ background:'var(--t-surface2)', border:'1px solid var(--t-border)', borderRadius:8, width:32, height:32, cursor:'pointer', fontSize:16, color:'var(--t-text3)', flexShrink:0 }}>✕</button>
                    </div>

                    {/* Tabs */}
                    <div style={{ display:'flex', gap:0 }}>
                        {TABS.map(t => (
                            <button key={t.id} onClick={() => setTab(t.id)} style={{
                                padding:'8px 18px', fontSize:12, fontWeight:700, cursor:'pointer',
                                border:'none', borderBottom: tab === t.id ? '2px solid #6366f1' : '2px solid transparent',
                                background:'transparent', color: tab === t.id ? '#6366f1' : 'var(--t-text3)',
                                transition:'all 0.15s',
                            }}>{t.label}</button>
                        ))}
                    </div>
                </div>

                {/* Alerts */}
                {(err || msg) && (
                    <div style={{ padding:'10px 24px 0' }}>
                        {err && <div style={{ padding:'8px 12px', borderRadius:8, background:'#ef444412', color:'#ef4444', fontSize:12, fontWeight:600 }}>❌ {err}</div>}
                        {msg && <div style={{ padding:'8px 12px', borderRadius:8, background:'#10b98112', color:'#10b981', fontSize:12, fontWeight:600 }}>✅ {msg}</div>}
                    </div>
                )}

                {/* Tab content */}
                <div style={{ flex:1, overflowY:'auto', padding:24 }}>

                    {/* ── INFO ── */}
                    {tab === 'info' && (
                        <form onSubmit={save} style={{ display:'flex', flexDirection:'column', gap:14 }}>
                            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                                <div><label style={lbl}>First Name</label>
                                    <input style={inp()} value={form.first_name} onChange={e => set('first_name', e.target.value)} /></div>
                                <div><label style={lbl}>Last Name</label>
                                    <input style={inp()} value={form.last_name} onChange={e => set('last_name', e.target.value)} /></div>
                            </div>
                            <div><label style={lbl}>Email</label>
                                <input type="email" style={inp()} value={form.email} onChange={e => set('email', e.target.value)} /></div>
                            <div><label style={lbl}>Phone</label>
                                <input style={inp()} value={form.phone_number} onChange={e => set('phone_number', e.target.value)} placeholder="+977 98XXXXXXXX" /></div>
                            <div>
                                <label style={lbl}>System Role</label>
                                <select style={inp()} value={form.role_id} onChange={e => set('role_id', e.target.value)}>
                                    <option value="">— No role —</option>
                                    {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                </select>
                                <p style={{ margin:'4px 0 0', fontSize:10, color:'var(--t-text3)' }}>System role controls global access. Project role is set per-project in the Projects tab.</p>
                            </div>
                            <div><label style={lbl}>Bio / Note</label>
                                <textarea style={{ ...inp(), resize:'vertical', minHeight:64 }} value={form.bio} onChange={e => set('bio', e.target.value)} placeholder="Short note about this user" /></div>

                            <div style={{ paddingTop:4, borderTop:'1px solid var(--t-border)' }}>
                                <p style={{ margin:'0 0 8px', fontSize:10, fontWeight:700, color:'var(--t-text3)', textTransform:'uppercase' }}>Account Info</p>
                                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                                    {[
                                        ['Username',   `@${user.username}`],
                                        ['Joined',     fmt(user.date_joined)],
                                        ['Last Login', fmtT(user.frontend_last_login)],
                                        ['Superuser',  user.is_superuser ? 'Yes' : 'No'],
                                    ].map(([k, v]) => (
                                        <div key={k} style={{ padding:'8px 10px', borderRadius:8, background:'var(--t-bg)', border:'1px solid var(--t-border)' }}>
                                            <p style={{ margin:0, fontSize:9, fontWeight:700, color:'var(--t-text3)', textTransform:'uppercase' }}>{k}</p>
                                            <p style={{ margin:'2px 0 0', fontSize:12, fontWeight:700, color:'var(--t-text)' }}>{v}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <button type="submit" disabled={busy}
                                style={{ padding:'10px 0', borderRadius:10, background:'#6366f1', color:'#fff', fontSize:13, fontWeight:900, border:'none', cursor:'pointer', opacity: busy ? 0.6 : 1 }}>
                                {busy ? 'Saving…' : '💾 Save Changes'}
                            </button>
                        </form>
                    )}

                    {/* ── PROJECTS ── */}
                    {tab === 'projects' && <ProjectAccessPanel userId={user.id} />}

                    {/* ── SECURITY ── */}
                    {tab === 'security' && (
                        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

                            {/* Reset password */}
                            <div style={{ padding:16, borderRadius:12, border:'1px solid var(--t-border)', background:'var(--t-bg)' }}>
                                <p style={{ margin:'0 0 12px', fontWeight:800, fontSize:13, color:'var(--t-text)' }}>🔑 Reset Password</p>
                                <div style={{ display:'flex', gap:8 }}>
                                    <input type="text" style={inp({ flex:1 })} value={resetPw} onChange={e => setResetPw(e.target.value)} placeholder="New password (min. 8 chars)" />
                                    <button onClick={resetPassword} disabled={busy}
                                        style={{ padding:'8px 16px', borderRadius:10, background:'#f59e0b', color:'#fff', fontSize:12, fontWeight:900, border:'none', cursor:'pointer', flexShrink:0 }}>
                                        Reset
                                    </button>
                                </div>
                            </div>

                            {/* Activate / deactivate */}
                            <div style={{ padding:16, borderRadius:12, border:`1px solid ${user.is_active ? '#ef444430' : '#10b98130'}`, background: user.is_active ? '#ef444408' : '#10b98108' }}>
                                <p style={{ margin:'0 0 4px', fontWeight:800, fontSize:13, color: user.is_active ? '#ef4444' : '#10b981' }}>
                                    {user.is_active ? '🔒 Deactivate Account' : '✅ Activate Account'}
                                </p>
                                <p style={{ margin:'0 0 12px', fontSize:12, color:'var(--t-text3)' }}>
                                    {user.is_active
                                        ? 'Prevent this user from logging in without deleting their data.'
                                        : 'Restore login access for this user.'}
                                </p>
                                <button onClick={toggleActive} disabled={busy}
                                    style={{ padding:'8px 18px', borderRadius:10, fontSize:12, fontWeight:900, border:'none', cursor:'pointer',
                                        background: user.is_active ? '#ef4444' : '#10b981', color:'#fff', opacity: busy ? 0.6 : 1 }}>
                                    {busy ? '…' : user.is_active ? '🔒 Deactivate' : '✅ Activate'}
                                </button>
                            </div>

                            {/* Project memberships summary */}
                            <div style={{ padding:16, borderRadius:12, border:'1px solid var(--t-border)', background:'var(--t-bg)' }}>
                                <p style={{ margin:'0 0 10px', fontWeight:800, fontSize:13, color:'var(--t-text)' }}>🗂️ Project Access Summary</p>
                                {(user.assigned_projects_data || []).length === 0 ? (
                                    <p style={{ margin:0, fontSize:12, color:'var(--t-text3)' }}>Not assigned to any project. Use the Projects tab to grant access.</p>
                                ) : (
                                    <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                                        {(user.assigned_projects_data || []).map(p => (
                                            <Badge key={p.id} label={p.name} color="#3b82f6" />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function UsersPage() {
    const { users, roles, loading, error, load, refreshUsers, refreshStats } = useAccounts();
    const [search,       setSearch]      = useState('');
    const [roleFilter,   setRoleFilter]  = useState('ALL');
    const [statusFilter, setStatus]      = useState('ALL');
    const [projFilter,   setProjFilter]  = useState('ALL');
    const [showInvite,   setShowInvite]  = useState(false);
    const [editing,      setEditing]     = useState(null);
    const [busyId,       setBusyId]      = useState(null);
    const [confirmDel,   setConfirmDel]  = useState(null);

    // Collect unique projects across all users for filter
    const allProjects = useMemo(() => {
        const seen = new Map();
        users.forEach(u => (u.assigned_projects_data || []).forEach(p => {
            if (!seen.has(p.id)) seen.set(p.id, p.name);
        }));
        return [...seen.entries()].map(([id, name]) => ({ id, name }));
    }, [users]);

    const filtered = useMemo(() => users.filter(u => {
        const text = `${u.first_name} ${u.last_name} ${u.username} ${u.email}`.toLowerCase();
        if (search && !text.includes(search.toLowerCase())) return false;
        if (roleFilter   !== 'ALL' && u.role?.code !== roleFilter) return false;
        if (statusFilter === 'ACTIVE'   && !u.is_active) return false;
        if (statusFilter === 'INACTIVE' &&  u.is_active) return false;
        if (projFilter   !== 'ALL' && !(u.assigned_projects_data || []).some(p => String(p.id) === projFilter)) return false;
        return true;
    }), [users, search, roleFilter, statusFilter, projFilter]);

    const handleDelete = async (user) => {
        setBusyId(user.id);
        try {
            await accountsApi.deleteUser(user.id);
            await Promise.all([refreshUsers(), refreshStats()]);
        } catch { /* silent */ } finally { setBusyId(null); setConfirmDel(null); }
    };

    const refresh = useCallback(() => {
        refreshUsers(); refreshStats();
    }, [refreshUsers, refreshStats]);

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>

            {/* ── Error banner ── */}
            {error && (
                <div style={{ marginBottom:20, padding:'12px 16px', borderRadius:12, background:'#ef444412', border:'1px solid #ef444430', color:'#ef4444', fontSize:13, display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ fontSize:18 }}>⚠️</span>
                    <div style={{ flex:1 }}>
                        <p style={{ margin:0, fontWeight:900 }}>Failed to load users</p>
                        <p style={{ margin:0, fontSize:11, opacity:0.8 }}>{error}</p>
                    </div>
                    <button onClick={load} style={{ padding:'6px 12px', borderRadius:8, background:'#ef4444', color:'#fff', border:'none', fontSize:11, fontWeight:700, cursor:'pointer' }}>Retry</button>
                </div>
            )}

            {/* ── Stats strip ── */}
            <div style={{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap' }}>
                {[
                    { label:'Total',    value: users.length,                            color:'#6366f1' },
                    { label:'Active',   value: users.filter(u =>  u.is_active).length,  color:'#10b981' },
                    { label:'Inactive', value: users.filter(u => !u.is_active).length,  color:'#ef4444' },
                    { label:'Shown',    value: filtered.length,                          color:'#f59e0b' },
                ].map(({ label, value, color }) => (
                    <div key={label} style={{ padding:'8px 18px', borderRadius:10, background:`${color}12`, border:`1px solid ${color}25`, textAlign:'center' }}>
                        <p style={{ margin:0, fontSize:20, fontWeight:900, color }}>{value}</p>
                        <p style={{ margin:0, fontSize:9, fontWeight:700, color:'var(--t-text3)', textTransform:'uppercase' }}>{label}</p>
                    </div>
                ))}
                <div style={{ marginLeft:'auto' }}>
                    <button onClick={() => setShowInvite(true)}
                        style={{ padding:'10px 20px', borderRadius:10, background:'#6366f1', color:'#fff', fontSize:13, fontWeight:900, border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:6, height:'100%' }}>
                        ✉️ Create User
                    </button>
                </div>
            </div>

            {/* ── Filters ── */}
            <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
                <input
                    placeholder="🔍 Search name, email, username…"
                    value={search} onChange={e => setSearch(e.target.value)}
                    style={{ flex:1, minWidth:200, padding:'8px 14px', fontSize:13, borderRadius:10, border:'1px solid var(--t-border)', background:'var(--t-bg)', color:'var(--t-text)', outline:'none' }}
                />
                <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
                    style={{ padding:'8px 12px', fontSize:12, borderRadius:10, border:'1px solid var(--t-border)', background:'var(--t-bg)', color:'var(--t-text)', cursor:'pointer' }}>
                    <option value="ALL">All Roles</option>
                    {roles.map(r => <option key={r.code} value={r.code}>{r.name}</option>)}
                </select>
                <select value={statusFilter} onChange={e => setStatus(e.target.value)}
                    style={{ padding:'8px 12px', fontSize:12, borderRadius:10, border:'1px solid var(--t-border)', background:'var(--t-bg)', color:'var(--t-text)', cursor:'pointer' }}>
                    <option value="ALL">All Status</option>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                </select>
                <select value={projFilter} onChange={e => setProjFilter(e.target.value)}
                    style={{ padding:'8px 12px', fontSize:12, borderRadius:10, border:'1px solid var(--t-border)', background:'var(--t-bg)', color:'var(--t-text)', cursor:'pointer' }}>
                    <option value="ALL">All Projects</option>
                    {allProjects.map(p => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
                </select>
            </div>

            {/* ── Table ── */}
            {loading ? (
                <div style={{ textAlign:'center', padding:60, color:'var(--t-text3)' }}>Loading users…</div>
            ) : (
                <div style={{ borderRadius:14, border:'1px solid var(--t-border)', background:'var(--t-surface)', overflow:'hidden' }}>
                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                        <thead>
                            <tr style={{ background:'var(--t-bg)', borderBottom:'1px solid var(--t-border)' }}>
                                {['User', 'Email', 'System Role', 'Projects', 'Status', 'Last Login', 'Actions'].map(h => (
                                    <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:10, fontWeight:900, color:'var(--t-text3)', textTransform:'uppercase', letterSpacing:'0.06em', whiteSpace:'nowrap' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr><td colSpan={7} style={{ textAlign:'center', padding:40, color:'var(--t-text3)', fontSize:13 }}>No users found</td></tr>
                            ) : filtered.map((user, i) => (
                                <tr key={user.id}
                                    style={{ borderBottom:'1px solid var(--t-border)', background: i%2===0 ? 'transparent' : 'rgba(0,0,0,0.01)', cursor:'pointer' }}
                                    onClick={() => setEditing(user)}
                                    onMouseEnter={e => e.currentTarget.style.background = 'var(--t-bg)'}
                                    onMouseLeave={e => e.currentTarget.style.background = i%2===0 ? 'transparent' : 'rgba(0,0,0,0.01)'}>

                                    {/* User */}
                                    <td style={{ padding:'10px 14px' }}>
                                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                                            <Avatar user={user} size="sm" />
                                            <div>
                                                <p style={{ margin:0, fontWeight:700, color:'var(--t-text)', fontSize:13 }}>
                                                    {`${user.first_name} ${user.last_name}`.trim() || user.username}
                                                    {user.is_superuser && <span style={{ marginLeft:6, fontSize:9, padding:'1px 5px', borderRadius:4, background:'#ef444420', color:'#ef4444', fontWeight:800 }}>SUPER</span>}
                                                </p>
                                                <p style={{ margin:0, fontSize:10, color:'var(--t-text3)' }}>@{user.username}</p>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Email */}
                                    <td style={{ padding:'10px 14px', color:'var(--t-text3)', fontSize:12 }}>{user.email}</td>

                                    {/* System role */}
                                    <td style={{ padding:'10px 14px' }}>
                                        {user.role
                                            ? <Badge label={user.role.name} color={ROLE_COLORS[user.role.code] || '#6b7280'} />
                                            : <span style={{ color:'var(--t-text3)', fontSize:11 }}>—</span>}
                                    </td>

                                    {/* Projects */}
                                    <td style={{ padding:'10px 14px' }}>
                                        <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                                            {(user.assigned_projects_data || []).length === 0
                                                ? <span style={{ fontSize:11, color:'var(--t-text3)' }}>None</span>
                                                : (user.assigned_projects_data || []).slice(0,2).map(p => (
                                                    <span key={p.id} style={{ padding:'1px 7px', borderRadius:5, fontSize:10, fontWeight:700, background:'rgba(59,130,246,0.12)', color:'#3b82f6', border:'1px solid rgba(59,130,246,0.2)' }}>{p.name}</span>
                                                ))
                                            }
                                            {(user.assigned_projects_data || []).length > 2 && (
                                                <span style={{ fontSize:10, color:'var(--t-text3)', padding:'1px 4px' }}>+{user.assigned_projects_data.length - 2}</span>
                                            )}
                                        </div>
                                    </td>

                                    {/* Status */}
                                    <td style={{ padding:'10px 14px' }}>
                                        <Badge label={user.is_active ? 'Active' : 'Inactive'} color={user.is_active ? '#10b981' : '#ef4444'} />
                                    </td>

                                    {/* Last login */}
                                    <td style={{ padding:'10px 14px', color:'var(--t-text3)', fontSize:11, whiteSpace:'nowrap' }}>{fmtT(user.frontend_last_login)}</td>

                                    {/* Actions */}
                                    <td style={{ padding:'10px 14px' }} onClick={e => e.stopPropagation()}>
                                        <div style={{ display:'flex', gap:5 }}>
                                            <button onClick={() => setEditing(user)}
                                                style={{ padding:'4px 10px', borderRadius:6, background:'rgba(99,102,241,0.1)', color:'#6366f1', fontSize:10, fontWeight:900, border:'1px solid rgba(99,102,241,0.2)', cursor:'pointer' }}>
                                                ✏️ Edit
                                            </button>
                                            <button onClick={() => setConfirmDel(user)} disabled={busyId === user.id}
                                                style={{ padding:'4px 8px', borderRadius:6, background:'rgba(239,68,68,0.08)', color:'#ef4444', fontSize:10, fontWeight:900, border:'1px solid rgba(239,68,68,0.2)', cursor:'pointer' }}>
                                                🗑️
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ── Create user modal ── */}
            <Modal isOpen={showInvite} onClose={() => setShowInvite(false)} title="Create User" maxWidth="max-w-lg">
                <InviteForm roles={roles} onDone={() => { setShowInvite(false); refresh(); }} />
            </Modal>

            {/* ── Edit drawer ── */}
            {editing && (
                <UserDrawer
                    user={editing}
                    roles={roles}
                    onClose={() => setEditing(null)}
                    onRefresh={refresh}
                />
            )}

            {/* ── Confirm delete ── */}
            <Modal isOpen={!!confirmDel} onClose={() => setConfirmDel(null)} title="Delete User?" maxWidth="max-w-sm">
                {confirmDel && (
                    <div style={{ padding:24 }}>
                        <p style={{ margin:'0 0 6px', fontSize:14, fontWeight:700, color:'var(--t-text)' }}>Delete <strong>{confirmDel.email}</strong>?</p>
                        <p style={{ margin:'0 0 20px', fontSize:12, color:'var(--t-text3)' }}>This cannot be undone. Consider deactivating instead.</p>
                        <div style={{ display:'flex', gap:8 }}>
                            <button onClick={() => setConfirmDel(null)} style={{ flex:1, padding:'9px 0', borderRadius:10, border:'1px solid var(--t-border)', background:'var(--t-bg)', color:'var(--t-text)', fontSize:12, fontWeight:700, cursor:'pointer' }}>Cancel</button>
                            <button onClick={() => handleDelete(confirmDel)} disabled={busyId === confirmDel.id}
                                style={{ flex:1, padding:'9px 0', borderRadius:10, background:'#ef4444', color:'#fff', fontSize:12, fontWeight:900, border:'none', cursor:'pointer' }}>
                                {busyId === confirmDel.id ? 'Deleting…' : '🗑️ Delete'}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
