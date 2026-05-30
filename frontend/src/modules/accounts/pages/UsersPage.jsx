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
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useAccounts } from '../context/AccountsContext';
import accountsApi from '../services/accountsApi';
import * as faceapi from '@vladmandic/face-api';

function beep(type) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    if (type === 'tick') {
      o.type = 'sine'; o.frequency.value = 880;
      g.gain.setValueAtTime(0.08, ctx.currentTime);
      g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
      o.start(); o.stop(ctx.currentTime + 0.1);
    } else if (type === 'success') {
      o.type = 'sine';
      o.frequency.setValueAtTime(523, ctx.currentTime);
      o.frequency.setValueAtTime(783, ctx.currentTime + 0.12);
      o.frequency.setValueAtTime(1046, ctx.currentTime + 0.24);
      g.gain.setValueAtTime(0.1, ctx.currentTime);
      g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
      o.start(); o.stop(ctx.currentTime + 0.5);
    } else if (type === 'error') {
      o.type = 'sawtooth'; o.frequency.value = 120;
      g.gain.setValueAtTime(0.1, ctx.currentTime);
      g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
      o.start(); o.stop(ctx.currentTime + 0.3);
    }
  } catch (_) {}
}
import Avatar from '../components/shared/Avatar';
import Badge from '../components/shared/Badge';
import Modal from '../components/shared/Modal';
import {
    PROJECT_PERMISSION_META,
    PROJECT_ROLE_COLOR_MAP,
    normalizeProjectRoles,
    getProjectRoleByCode,
    buildProjectRoleDefaults,
} from '../utils/projectRoles';

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
const parseApiError = (ex, fallback) => {
    const data = ex?.response?.data;
    if (!data) return fallback;
    if (typeof data === 'string') return data;
    if (data.detail) return data.detail;
    if (data.error) return data.error;
    const entries = Object.entries(data)
        .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
        .join(' | ');
    return entries || fallback;
};

const ROLE_COLORS = {
    SUPER_ADMIN: '#ef4444', HOME_OWNER: '#f97316',
    LEAD_ENGINEER: '#3b82f6', CONTRACTOR: '#8b5cf6', VIEWER: '#6b7280',
};

const SYSTEM_PERM_LABELS = {
    can_view_projects:        'View Projects',
    can_manage_projects:      'Manage Projects',
    can_view_dashboard:       'View Dashboard',
    can_view_profile:         'View Profile',
    can_manage_admin_config:  'Manage Admin Config',
    can_view_phases:          'View Phases',
    can_manage_phases:        'Manage Phases',
    can_view_finances:        'View Finance',
    can_manage_finances:      'Manage Finance',
    can_view_structure:       'View Structure',
    can_manage_structure:     'Manage Structure',
    can_view_resources:       'View Resources',
    can_manage_resources:     'Manage Resources',
    can_view_workforce:       'View Workforce',
    can_manage_workforce:     'Manage Workforce',
    can_manage_users:         'Manage Users',
    can_manage_settings:      'Manage Settings',
    can_manage_data_transfer: 'Data Transfer',
};

const getEnabledSystemPermissions = (user) =>
    Object.entries(SYSTEM_PERM_LABELS).filter(([key]) => user?.[key]);

function useIsMobileAccounts() {
    const [mobile, setMobile] = useState(() => window.innerWidth < 1024);
    useEffect(() => {
        const fn = () => setMobile(window.innerWidth < 1024);
        window.addEventListener('resize', fn);
        return () => window.removeEventListener('resize', fn);
    }, []);
    return mobile;
}

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
function ProjectAccessPanel({ userId, activeProjectId, onUserRefresh }) {
    const [projects, setProjects] = useState([]);
    const [projectRoles, setProjectRoles] = useState([]);
    const [loading,  setLoading]  = useState(true);
    const [saving,   setSaving]   = useState(null);  // project_id being saved
    const [expanded, setExpanded] = useState(null);  // project_id with perms open
    const [err,      setErr]      = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [projectRes, rolesRes] = await Promise.all([
                accountsApi.getUserProjects(userId),
                accountsApi.getProjectRoles().catch(() => ({ data: [] })),
            ]);
            setProjects(projectRes.data);
            setProjectRoles(normalizeProjectRoles(rolesRes.data));
        } catch { setErr('Failed to load projects.'); }
        finally   { setLoading(false); }
    }, [userId]);

    useEffect(() => { load(); }, [load]);

    const setActiveProject = async (projectId) => {
        setSaving(projectId || 'active');
        setErr('');
        try {
            await accountsApi.updateUser(userId, { active_project_id: projectId || null });
            await Promise.all([load(), onUserRefresh?.()]);
        } catch (e) {
            setErr(parseApiError(e, 'Failed to update active project.'));
        } finally {
            setSaving(null);
        }
    };

    const toggle = async (p) => {
        setSaving(p.project_id);
        try {
            await accountsApi.setUserProject(userId, {
                project_id: p.project_id,
                action: p.is_assigned ? 'remove' : 'add',
                role: 'VIEWER',
            });
            if (p.is_assigned && String(activeProjectId) === String(p.project_id)) {
                await accountsApi.updateUser(userId, { active_project_id: null });
                await onUserRefresh?.();
            }
            await load();
        } catch (e) {
            setErr(parseApiError(e, 'Failed.'));
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
        } catch (e) { setErr(parseApiError(e, 'Failed to update role.')); }
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
        } catch (e) { setErr(parseApiError(e, 'Failed to update permission.')); }
        finally  { setSaving(null); }
    };

    if (loading) return <div style={{ padding:30, textAlign:'center', color:'var(--t-text3)', fontSize:13 }}>Loading projects…</div>;

    return (
        <div>
            {err && <div style={{ padding:'8px 12px', borderRadius:8, background:'#ef444412', color:'#ef4444', fontSize:12, marginBottom:12 }}>{err}</div>}
            <p style={{ margin:'0 0 12px', fontSize:12, color:'var(--t-text3)' }}>
                Toggle project access, set the project role, and fine-tune the current permission overrides.
            </p>
            <div style={{ marginBottom:12, padding:'12px 14px', borderRadius:12, border:'1px solid rgba(59,130,246,0.16)', background:'rgba(239,246,255,0.88)' }}>
                <p style={{ margin:0, fontSize:12, fontWeight:900, color:'var(--t-text)' }}>Project role only / केवल प्रोजेक्ट रोल</p>
                <p style={{ margin:'4px 0 0', fontSize:11, lineHeight:1.6, color:'var(--t-text3)' }}>
                    This tab assigns one project role and its overrides inside this user’s assigned projects. The project-role templates are managed from Roles & Templates page. यो tab ले project-भित्र assign गरिएको role र override access नियन्त्रण गर्छ। Template भने Roles & Templates page बाट manage हुन्छ।
                </p>
            </div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, marginBottom:12, padding:'12px 14px', borderRadius:12, border:'1px solid var(--t-border)', background:'var(--t-bg)' }}>
                <div>
                    <p style={{ margin:0, fontSize:10, fontWeight:800, color:'var(--t-text3)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Active Project</p>
                    <p style={{ margin:'3px 0 0', fontSize:13, fontWeight:700, color:'var(--t-text)' }}>
                        {projects.find(p => String(p.project_id) === String(activeProjectId) && p.is_assigned)?.project_name || 'No active project'}
                    </p>
                </div>
                <button
                    onClick={() => setActiveProject(null)}
                    disabled={!activeProjectId || saving === 'active'}
                    style={{
                        padding:'7px 12px', borderRadius:8, border:'1px solid var(--t-border)',
                        background:'var(--t-surface)', color:'var(--t-text)', fontSize:11, fontWeight:800,
                        cursor: (!activeProjectId || saving === 'active') ? 'not-allowed' : 'pointer',
                        opacity: (!activeProjectId || saving === 'active') ? 0.5 : 1,
                    }}>
                    Clear Active
                </button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {projects.map(p => {
                    const busy = saving === p.project_id;
                    const roleMeta = getProjectRoleByCode(projectRoles, p.member_role || 'VIEWER');
                    const roleColor = roleMeta.color || PROJECT_ROLE_COLOR_MAP[p.member_role] || '#64748b';
                    const isExpanded = expanded === p.project_id && p.is_assigned;
                    const isActive = String(activeProjectId) === String(p.project_id);
                    const defaultPerms = buildProjectRoleDefaults(roleMeta);
                    const defaultEnabled = PROJECT_PERMISSION_META.filter(perm => defaultPerms[perm.key]);
                    const currentEnabled = PROJECT_PERMISSION_META.filter(perm => p.permissions?.[perm.key]);

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
                                    <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:4 }}>
                                        {p.is_assigned && p.member_role && (
                                            <span style={{ fontSize:10, fontWeight:700, color: roleColor }}>{roleMeta.name}</span>
                                        )}
                                        {isActive && (
                                            <span style={{ fontSize:10, fontWeight:800, color:'#2563eb', background:'#dbeafe', border:'1px solid #bfdbfe', borderRadius:999, padding:'1px 7px' }}>
                                                Active Project
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {p.is_assigned && (
                                    <>
                                        <button
                                            onClick={() => setActiveProject(isActive ? null : p.project_id)}
                                            disabled={busy}
                                            style={{
                                                padding:'4px 8px', borderRadius:7, fontSize:11, fontWeight:800,
                                                border:`1px solid ${isActive ? '#2563eb40' : 'var(--t-border)'}`,
                                                background:isActive ? '#dbeafe' : 'var(--t-surface)',
                                                color:isActive ? '#2563eb' : 'var(--t-text3)', cursor:'pointer'
                                            }}>
                                            {isActive ? '✓ Active' : 'Set Active'}
                                        </button>
                                        <select
                                            value={p.member_role || 'VIEWER'}
                                            onChange={e => setRole(p, e.target.value)}
                                            disabled={busy}
                                            style={{ padding:'4px 8px', borderRadius:7, fontSize:11, fontWeight:700, border:`1px solid ${roleColor}40`, background:`${roleColor}15`, color: roleColor, cursor:'pointer' }}>
                                            {projectRoles.map(r => <option key={r.code} value={r.code}>{`${r.icon} ${r.name}`}</option>)}
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
                                <div style={{ padding:'12px 14px 14px', borderTop:'1px solid var(--t-border)' }}>
                                    <div style={{ padding:'12px', borderRadius:10, border:'1px solid var(--t-border)', background:'var(--t-surface)', marginBottom:12 }}>
                                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, marginBottom:6, flexWrap:'wrap' }}>
                                            <div>
                                                <p style={{ margin:0, fontSize:12, fontWeight:900, color:'var(--t-text)' }}>
                                                    {roleMeta?.icon} {roleMeta?.name} Default Preset
                                                </p>
                                                <p style={{ margin:'3px 0 0', fontSize:11, color:'var(--t-text3)' }}>
                                                    {roleMeta?.description || 'Default permissions for this project role'}
                                                </p>
                                            </div>
                                            <span style={{ fontSize:11, fontWeight:800, color:roleColor }}>
                                                {defaultEnabled.length}/{PROJECT_PERMISSION_META.length} enabled by default
                                            </span>
                                        </div>
                                    <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                                        {defaultEnabled.map(perm => (
                                                <span key={perm.key} style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'3px 8px', borderRadius:6, fontSize:11, fontWeight:700, border:'1px solid #22c55e40', background:'#f0fdf4', color:'#15803d' }}>
                                                    <span>{perm.icon}</span>{perm.label}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {currentEnabled.length > 0 && (
                                        <div style={{ marginBottom:12, padding:'12px', borderRadius:10, border:'1px solid var(--t-border)', background:'var(--t-bg)' }}>
                                            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, marginBottom:6, flexWrap:'wrap' }}>
                                                <div>
                                                    <p style={{ margin:0, fontSize:12, fontWeight:900, color:'var(--t-text)' }}>Current saved access</p>
                                                    <p style={{ margin:'3px 0 0', fontSize:11, color:'var(--t-text3)' }}>
                                                        These toggles are the actual saved permissions for this member.
                                                    </p>
                                                </div>
                                                <span style={{ fontSize:11, fontWeight:800, color:roleColor }}>
                                                    {currentEnabled.length}/{PROJECT_PERMISSION_META.length} currently enabled
                                                </span>
                                            </div>
                                            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                                                {currentEnabled.map(perm => (
                                                    <span key={perm.key} style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'3px 8px', borderRadius:6, fontSize:11, fontWeight:700, border:'1px solid var(--t-border)', background:'var(--t-surface)', color:'var(--t-text)' }}>
                                                        <span>{perm.icon}</span>{perm.label}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, marginBottom:8, flexWrap:'wrap' }}>
                                        <div>
                                            <p style={{ margin:0, fontSize:11, fontWeight:800, color:'var(--t-text3)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Permission Overrides</p>
                                            <p style={{ margin:'3px 0 0', fontSize:11, color:'var(--t-text3)' }}>
                                                Current saved permissions for this project membership.
                                            </p>
                                        </div>
                                        <span style={{ fontSize:11, color:'var(--t-text3)' }}>
                                            {currentEnabled.length}/{PROJECT_PERMISSION_META.length} currently enabled
                                        </span>
                                    </div>
                                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                                    {PROJECT_PERMISSION_META.map((perm) => {
                                        const on = p.permissions[perm.key];
                                        return (
                                            <button key={perm.key} onClick={() => setPerm(p, perm.key, !on)} disabled={busy}
                                                title={perm.detail}
                                                style={{ display:'flex', alignItems:'flex-start', gap:8, padding:'8px 10px', borderRadius:8, border:`1px solid ${on ? '#10b98140' : 'var(--t-border)'}`, background: on ? '#10b98112' : 'var(--t-surface)', cursor:'pointer', textAlign:'left' }}>
                                                <span style={{ width:18, flexShrink:0, textAlign:'center', fontSize:12 }}>{perm.icon}</span>
                                                <span style={{ flex:1 }}>
                                                    <span style={{ display:'block', fontSize:11, fontWeight:800, color: on ? '#10b981' : 'var(--t-text)' }}>{perm.label}</span>
                                                    <span style={{ display:'block', fontSize:10, color:'var(--t-text3)', marginTop:2 }}>{perm.detail}</span>
                                                </span>
                                            </button>
                                        );
                                    })}
                                    </div>
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
    const isMobile = useIsMobileAccounts();
    const [tab,     setTab]     = useState('info');
    const [form,    setForm]    = useState({
        username:     user.username     || '',
        first_name:   user.first_name   || '',
        last_name:    user.last_name    || '',
        phone_number: user.phone_number || '',
        email:        user.email        || '',
        role_id:      user.role?.id     || '',
        bio:          user.bio          || '',
        address:      user.address      || '',
        preferred_language: user.preferred_language || 'en',
        notifications_enabled: user.notifications_enabled ?? true,
    });
    const [resetPw, setResetPw] = useState('');
    const [busy,    setBusy]    = useState(false);
    const [err,     setErr]     = useState('');
    const [msg,     setMsg]     = useState('');
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    // Face ID scanner states inside UserDrawer
    const [faceRegActive, setFaceRegActive] = useState(false);
    const [modelReady, setModelReady] = useState(false);
    const [modelLoading, setModelLoading] = useState(false);
    const [camError, setCamError] = useState(null);
    const [regCountdown, setRegCountdown] = useState(null);
    const [regStatus, setRegStatus] = useState('idle'); // idle | detecting | countdown | saving | done | error
    const [faceDetected, setFaceDetected] = useState(false);

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const loopRef = useRef(null);
    const busyRef = useRef(false);
    const stableCount = useRef(0);
    const countdownTimer = useRef(null);
    const capturedDescRef = useRef(null);

    const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';

    const startFaceRegistration = async () => {
        setFaceRegActive(true);
        setRegStatus('idle');
        setCamError(null);
        busyRef.current = false;
        stableCount.current = 0;
        capturedDescRef.current = null;

        if (!modelReady) {
            setModelLoading(true);
            try {
                await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
                await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
                await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
                setModelReady(true);
            } catch (e) {
                setCamError('AI face models failed to load — check internet connection.');
                setModelLoading(false);
                return;
            } finally {
                setModelLoading(false);
            }
        }
        setTimeout(() => startCamera(), 300);
    };

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480, facingMode: 'user' }
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
                loopRef.current = requestAnimationFrame(frameLoop);
            }
        } catch (e) {
            setCamError('Camera permission denied or camera unavailable.');
        }
    };

    const stopEverything = () => {
        if (loopRef.current) { cancelAnimationFrame(loopRef.current); loopRef.current = null; }
        if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
        if (countdownTimer.current) { clearInterval(countdownTimer.current); countdownTimer.current = null; }
        busyRef.current = false;
        stableCount.current = 0;
        capturedDescRef.current = null;
        setFaceDetected(false);
        setRegCountdown(null);
    };

    const closeScanner = () => {
        stopEverything();
        setFaceRegActive(false);
    };

    const frameLoop = async () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || video.paused || video.ended || !canvas) {
            loopRef.current = requestAnimationFrame(frameLoop);
            return;
        }

        try {
            const det = await faceapi
                .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
                .withFaceLandmarks()
                .withFaceDescriptor();

            const ctx = canvas.getContext('2d');
            if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (det) {
                setFaceDetected(true);
                stableCount.current += 1;

                if (ctx) {
                    const dims = faceapi.matchDimensions(canvas, video, true);
                    const resized = faceapi.resizeResults(det, dims);
                    ctx.fillStyle = 'rgba(99,102,241,0.7)';
                    resized.landmarks.positions.forEach(p => {
                        ctx.beginPath();
                        ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
                        ctx.fill();
                    });
                }

                capturedDescRef.current = det.descriptor;
                handleRegisterFrame();
            } else {
                setFaceDetected(false);
                stableCount.current = 0;
                capturedDescRef.current = null;
                if (countdownTimer.current) {
                    clearInterval(countdownTimer.current); countdownTimer.current = null;
                    setRegCountdown(null);
                    setRegStatus('detecting');
                }
            }
        } catch (_) {}

        loopRef.current = requestAnimationFrame(frameLoop);
    };

    const handleRegisterFrame = () => {
        if (busyRef.current) return;

        if (stableCount.current === 10 && !countdownTimer.current) {
            setRegStatus('countdown');
            setRegCountdown(3);
            beep('tick');

            let count = 3;
            countdownTimer.current = setInterval(() => {
                count -= 1;
                if (count > 0) {
                    setRegCountdown(count);
                    beep('tick');
                } else {
                    clearInterval(countdownTimer.current);
                    countdownTimer.current = null;
                    setRegCountdown(0);
                    if (capturedDescRef.current) {
                        submitRegistration(Array.from(capturedDescRef.current));
                    }
                }
            }, 1000);
        }

        if (stableCount.current < 10) {
            setRegStatus('detecting');
        }
    };

    const submitRegistration = async (encoding) => {
        busyRef.current = true;
        setRegStatus('saving');
        stopEverything();
        try {
            await accountsApi.trainFace(encoding, user.id);
            beep('success');
            setRegStatus('done');
            setMsg('Face ID registered successfully.');
            await onRefresh();
            setTimeout(() => setFaceRegActive(false), 2000);
        } catch (e) {
            beep('error');
            setRegStatus('error');
            const errMsg = e.response?.data?.error || 'Registration failed. Try again.';
            setErr(errMsg);
            busyRef.current = false;
        }
    };

    useEffect(() => {
        return () => stopEverything();
    }, []);

    useEffect(() => {
        setForm({
            username:     user.username     || '',
            first_name:   user.first_name   || '',
            last_name:    user.last_name    || '',
            phone_number: user.phone_number || '',
            email:        user.email        || '',
            role_id:      user.role?.id     || '',
            bio:          user.bio          || '',
            address:      user.address      || '',
            preferred_language: user.preferred_language || 'en',
            notifications_enabled: user.notifications_enabled ?? true,
        });
    }, [user]);

    const selectedRole = roles.find(r => String(r.id) === String(form.role_id));
    const displayedPermissions = selectedRole
        ? Object.entries(SYSTEM_PERM_LABELS).filter(([key]) =>
            selectedRole.can_manage_all_systems || selectedRole[key]
        )
        : getEnabledSystemPermissions(user);
    const activeProject = (user.assigned_projects_data || []).find(p => String(p.id) === String(user.active_project_id || ''));

    const save = async (e) => {
        e.preventDefault();
        setBusy(true); setErr(''); setMsg('');
        try {
            await accountsApi.updateUser(user.id, {
                ...form,
                role_id: form.role_id || null,
            });
            setMsg('Saved successfully.');
            await onRefresh();
            setTimeout(() => setMsg(''), 2500);
        } catch (ex) {
            setErr(parseApiError(ex, 'Save failed.'));
        } finally { setBusy(false); }
    };

    const resetPassword = async () => {
        if (resetPw.length < 8) { setErr('Password must be at least 8 characters.'); return; }
        setBusy(true); setErr(''); setMsg('');
        try {
            await accountsApi.resetUserPassword(user.id, { new_password: resetPw });
            setMsg('Password reset successfully.'); setResetPw('');
        } catch (ex) { setErr(parseApiError(ex, 'Reset failed.')); }
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

    const handleRemoveFaceID = async () => {
        if (!window.confirm("Are you sure you want to remove Face ID for this user? यो प्रयोगकर्ताको Face ID हटाउन निश्चित हुनुहुन्छ?")) return;
        setBusy(true); setErr(''); setMsg('');
        try {
            await accountsApi.deleteFace(user.id);
            setMsg('Face ID removed successfully.');
            await onRefresh();
        } catch (ex) {
            setErr(parseApiError(ex, 'Failed to remove Face ID.'));
        } finally {
            setBusy(false);
        }
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
            <div style={{ width:isMobile ? '100vw' : 480, maxWidth:isMobile ? '100vw' : '95vw', background:'var(--t-surface)', display:'flex', flexDirection:'column', boxShadow:'-8px 0 40px rgba(0,0,0,0.25)', borderLeft:'1px solid var(--t-border)' }}>

                {/* Header */}
                <div style={{ padding:isMobile ? '16px 14px 0' : '20px 24px 0', borderBottom:'1px solid var(--t-border)', flexShrink:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:16 }}>
                        <Avatar user={user} size="md" />
                        <div style={{ flex:1, minWidth:0 }}>
                            <p style={{ margin:0, fontWeight:900, fontSize:16, color:'var(--t-text)' }}>
                                {`${user.first_name} ${user.last_name}`.trim() || user.username}
                            </p>
                            <p style={{ margin:'2px 0 0', fontSize:12, color:'var(--t-text3)' }}>{user.email}</p>
                            {activeProject && (
                                <p style={{ margin:'4px 0 0', fontSize:11, color:'#3b82f6', fontWeight:700 }}>
                                    Active project: {activeProject.name}
                                </p>
                            )}
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
                    <div style={{ display:'flex', gap:0, overflowX:'auto' }}>
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
                            <div><label style={lbl}>Username</label>
                                <input style={inp()} value={form.username} onChange={e => set('username', e.target.value)} /></div>
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
                            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                                <div>
                                    <label style={lbl}>Preferred Language</label>
                                    <select style={inp()} value={form.preferred_language} onChange={e => set('preferred_language', e.target.value)}>
                                        <option value="en">English</option>
                                        <option value="ne">Nepali</option>
                                        <option value="ja">Japanese</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label style={lbl}>System Role</label>
                                <select style={inp()} value={form.role_id} onChange={e => set('role_id', e.target.value)}>
                                    <option value="">— No role —</option>
                                    {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                </select>
                                <p style={{ margin:'4px 0 0', fontSize:10, color:'var(--t-text3)' }}>System role controls global access. Project role is set per-project in the Projects tab.</p>
                            </div>
                            <div style={{ padding:12, borderRadius:12, border:'1px solid var(--t-border)', background:'var(--t-bg)' }}>
                                <p style={{ margin:'0 0 8px', fontSize:10, fontWeight:800, color:'var(--t-text3)', textTransform:'uppercase', letterSpacing:'0.07em' }}>System Role Permissions</p>
                                {displayedPermissions.length === 0 ? (
                                    <p style={{ margin:0, fontSize:11, color:'var(--t-text3)' }}>No system permissions enabled.</p>
                                ) : (
                                    <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                                        {displayedPermissions.map(([key, label]) => (
                                            <span key={key} style={{ padding:'2px 7px', borderRadius:6, fontSize:10, fontWeight:800, background:'#6366f112', color:'#6366f1', border:'1px solid #6366f125' }}>
                                                {label}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div><label style={lbl}>Address</label>
                                <textarea style={{ ...inp(), resize:'vertical', minHeight:64 }} value={form.address} onChange={e => set('address', e.target.value)} placeholder="User address" /></div>
                            <div><label style={lbl}>Bio / Note</label>
                                <textarea style={{ ...inp(), resize:'vertical', minHeight:64 }} value={form.bio} onChange={e => set('bio', e.target.value)} placeholder="Short note about this user" /></div>
                            <label style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px', borderRadius:12, border:'1px solid var(--t-border)', background:'var(--t-bg)', cursor:'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={!!form.notifications_enabled}
                                    onChange={e => set('notifications_enabled', e.target.checked)}
                                    style={{ width:16, height:16, cursor:'pointer' }}
                                />
                                <div>
                                    <p style={{ margin:0, fontSize:12, fontWeight:800, color:'var(--t-text)' }}>Notifications Enabled</p>
                                    <p style={{ margin:'2px 0 0', fontSize:11, color:'var(--t-text3)' }}>Allow this account to receive in-app notifications.</p>
                                </div>
                            </label>

                            <div style={{ paddingTop:4, borderTop:'1px solid var(--t-border)' }}>
                                <p style={{ margin:'0 0 8px', fontSize:10, fontWeight:700, color:'var(--t-text3)', textTransform:'uppercase' }}>Account Info</p>
                                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                                    {[
                                        ['Username',   `@${user.username}`],
                                        ['Joined',     fmt(user.date_joined)],
                                        ['Last Login', fmtT(user.frontend_last_login)],
                                        ['Superuser',  user.is_superuser ? 'Yes' : 'No'],
                                        ['Verified',   user.is_verified ? 'Yes' : 'No'],
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
                    {tab === 'projects' && <ProjectAccessPanel userId={user.id} activeProjectId={user.active_project_id} onUserRefresh={onRefresh} />}

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

                            {/* Face ID management */}
                            <div style={{ padding:16, borderRadius:12, border:`1px solid ${user.has_face_id ? '#6366f130' : 'var(--t-border)'}`, background: 'var(--t-bg)' }}>
                                <p style={{ margin:'0 0 4px', fontWeight:800, fontSize:13, color: 'var(--t-text2)' }}>
                                    👤 Biometric Face ID
                                </p>
                                {faceRegActive ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, marginTop: 12 }}>
                                        <div style={{ position: 'relative', width: 160, height: 160 }}>
                                            <svg width="160" height="160" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)', zIndex: 10, pointerEvents: 'none' }}>
                                                <circle cx="80" cy="80" r="74" fill="none" stroke="var(--t-border)" strokeWidth="3" />
                                                <circle
                                                    cx="80" cy="80" r="74" fill="none"
                                                    stroke="#6366f1" strokeWidth="3"
                                                    strokeDasharray={`${2 * Math.PI * 74}`}
                                                    strokeDashoffset={(() => {
                                                        const circ = 2 * Math.PI * 74;
                                                        let progress = 0;
                                                        if (regStatus === 'detecting') progress = Math.min((stableCount.current / 10) * 30, 30);
                                                        else if (regStatus === 'countdown' && regCountdown !== null) progress = 30 + ((3 - regCountdown) / 3) * 60;
                                                        else if (regStatus === 'saving') progress = 90;
                                                        else if (regStatus === 'done') progress = 100;
                                                        return circ - (circ * progress) / 100;
                                                    })()}
                                                    strokeLinecap="round"
                                                    style={{ transition: 'stroke-dashoffset 0.4s ease' }}
                                                />
                                            </svg>
                                            <div style={{
                                                position: 'absolute', inset: 6,
                                                borderRadius: '50%', overflow: 'hidden',
                                                background: '#0a0a0a',
                                                border: `2px solid ${faceDetected ? '#6366f1' : 'transparent'}`,
                                                boxShadow: faceDetected ? '0 0 12px rgba(99,102,241,0.3)' : 'none',
                                                transition: 'all 0.3s',
                                            }}>
                                                <video ref={videoRef} autoPlay muted playsInline width="640" height="480"
                                                    style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%) scaleX(-1)', height: '100%', width: 'auto', objectFit: 'cover' }}
                                                />
                                                <canvas ref={canvasRef} width="148" height="148"
                                                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 3, pointerEvents: 'none', transform: 'scaleX(-1)' }}
                                                />
                                                {regStatus === 'done' && (
                                                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(16,185,129,0.15)', zIndex: 8 }}>
                                                        <span style={{ fontSize: 36 }}>✅</span>
                                                    </div>
                                                )}
                                            </div>
                                            {regStatus === 'countdown' && regCountdown !== null && regCountdown > 0 && (
                                                <div style={{
                                                    position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    zIndex: 20, pointerEvents: 'none',
                                                }}>
                                                    <div style={{
                                                        width: 40, height: 40, borderRadius: '50%',
                                                        background: 'rgba(99,102,241,0.9)',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        fontSize: 18, fontWeight: 900, color: '#fff',
                                                        boxShadow: '0 0 10px rgba(99,102,241,0.5)',
                                                    }}>
                                                        {regCountdown}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                            <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 800, color: 'var(--t-text)' }}>
                                                {modelLoading ? 'Loading AI models...' : camError ? 'Camera Error' : regStatus === 'countdown' ? `Registering face in ${regCountdown}...` : regStatus === 'saving' ? 'Saving biometric Face ID...' : regStatus === 'done' ? 'Face ID Configured!' : faceDetected ? 'Hold still...' : 'Position face in circle'}
                                            </p>
                                        </div>
                                        <button type="button" onClick={closeScanner}
                                            style={{ padding: '6px 14px', borderRadius: 8, background: '#ef444415', border: '1px solid #ef444430', color: '#ef4444', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>
                                            Cancel
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <p style={{ margin:'0 0 12px', fontSize:12, color:'var(--t-text3)', lineHeight:1.5 }}>
                                            {user.has_face_id
                                                ? 'This user has a registered Face ID signature. You can remove it or register a new one.'
                                                : 'This user has not set up Face ID yet. You can register their face ID directly from this console.'}
                                        </p>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button type="button" onClick={startFaceRegistration} disabled={busy}
                                                style={{ padding:'8px 16px', borderRadius:10, fontSize:12, fontWeight:900, border:'none', cursor:'pointer', background:'#6366f1', color:'#fff', opacity: busy ? 0.6 : 1 }}>
                                                📷 Enroll Face ID
                                            </button>
                                            {user.has_face_id && (
                                                <button type="button" onClick={handleRemoveFaceID} disabled={busy}
                                                    style={{ padding:'8px 16px', borderRadius:10, fontSize:12, fontWeight:900, border:'none', cursor:'pointer', background:'#ef4444', color:'#fff', opacity: busy ? 0.6 : 1 }}>
                                                    🗑️ Remove
                                                </button>
                                            )}
                                        </div>
                                    </>
                                )}
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
    const isMobile = useIsMobileAccounts();
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
        return Promise.all([refreshUsers(), refreshStats()]);
    }, [refreshUsers, refreshStats]);
    const editingUser = editing ? (users.find(u => u.id === editing.id) || editing) : null;

    return (
        <div style={{ maxWidth: isMobile ? '100%' : 1200, margin: '0 auto' }}>

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
                    <div key={label} style={{ padding:isMobile ? '8px 12px' : '8px 18px', borderRadius:10, background:`${color}12`, border:`1px solid ${color}25`, textAlign:'center', minWidth:isMobile ? 'calc(50% - 5px)' : undefined, flex:isMobile ? '1 1 calc(50% - 5px)' : undefined }}>
                        <p style={{ margin:0, fontSize:isMobile ? 18 : 20, fontWeight:900, color }}>{value}</p>
                        <p style={{ margin:0, fontSize:9, fontWeight:700, color:'var(--t-text3)', textTransform:'uppercase' }}>{label}</p>
                    </div>
                ))}
                <div style={{ marginLeft:isMobile ? 0 : 'auto', width:isMobile ? '100%' : 'auto' }}>
                    <button onClick={() => setShowInvite(true)}
                        style={{ padding:'10px 20px', borderRadius:10, background:'#6366f1', color:'#fff', fontSize:13, fontWeight:900, border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6, height:'100%', width:isMobile ? '100%' : 'auto' }}>
                        ✉️ Create User
                    </button>
                </div>
            </div>

            {/* ── Filters ── */}
            <div style={{ display:'grid', gridTemplateColumns:isMobile ? '1fr' : 'minmax(200px,1fr) auto auto auto', gap:8, marginBottom:16 }}>
                <input
                    placeholder="🔍 Search name, email, username…"
                    value={search} onChange={e => setSearch(e.target.value)}
                    style={{ minWidth:0, padding:'8px 14px', fontSize:13, borderRadius:10, border:'1px solid var(--t-border)', background:'var(--t-bg)', color:'var(--t-text)', outline:'none' }}
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
            ) : isMobile ? (
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    {filtered.length === 0 ? (
                        <div style={{ textAlign:'center', padding:40, color:'var(--t-text3)', fontSize:13, borderRadius:14, border:'1px solid var(--t-border)', background:'var(--t-surface)' }}>
                            No users found
                        </div>
                    ) : filtered.map((user) => {
                        const permissions = getEnabledSystemPermissions(user);
                        const projectCount = (user.assigned_projects_data || []).length;
                        return (
                            <div
                                key={user.id}
                                onClick={() => setEditing(user)}
                                style={{
                                    borderRadius:12,
                                    border:'1px solid var(--t-border)',
                                    background:'var(--t-surface)',
                                    padding:'12px',
                                    cursor:'pointer',
                                }}
                            >
                                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                                    <Avatar user={user} size="sm" />
                                    <div style={{ flex:1, minWidth:0 }}>
                                        <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap', minWidth:0 }}>
                                            <p style={{ margin:0, fontWeight:800, color:'var(--t-text)', fontSize:12, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', minWidth:0 }}>
                                                {`${user.first_name} ${user.last_name}`.trim() || user.username}
                                            </p>
                                            {user.is_superuser && <span style={{ fontSize:9, padding:'1px 5px', borderRadius:4, background:'#ef444420', color:'#ef4444', fontWeight:800 }}>SUPER</span>}
                                            <Badge label={user.is_active ? 'Active' : 'Inactive'} color={user.is_active ? '#10b981' : '#ef4444'} />
                                        </div>
                                        <p style={{ margin:'3px 0 0', fontSize:10, color:'var(--t-text3)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user.email}</p>
                                        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginTop:5 }}>
                                            {user.role
                                                ? <span style={{ fontSize:10, fontWeight:700, color:ROLE_COLORS[user.role.code] || '#6b7280' }}>{user.role.name}</span>
                                                : <span style={{ fontSize:10, color:'var(--t-text3)' }}>No role</span>}
                                            <span style={{ fontSize:10, color:'var(--t-text3)' }}>{projectCount} project{projectCount === 1 ? '' : 's'}</span>
                                            <span style={{ fontSize:10, color:'var(--t-text3)' }}>{fmtT(user.frontend_last_login)}</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setEditing(user); }}
                                        style={{ width:32, height:32, borderRadius:8, background:'rgba(99,102,241,0.1)', color:'#6366f1', fontSize:14, fontWeight:900, border:'1px solid rgba(99,102,241,0.2)', cursor:'pointer', flexShrink:0 }}
                                    >
                                        ›
                                    </button>
                                </div>
                                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, marginTop:8, paddingTop:8, borderTop:'1px solid var(--t-border)' }}>
                                    <div style={{ display:'flex', flexWrap:'wrap', gap:4, minWidth:0 }}>
                                        {permissions.length === 0 ? (
                                            <span style={{ fontSize:10, color:'var(--t-text3)' }}>No system access</span>
                                        ) : (
                                            <>
                                                {permissions.slice(0, 2).map(([key, label]) => (
                                                    <span key={key} style={{ padding:'2px 6px', borderRadius:6, fontSize:9, fontWeight:800, background:'#6366f112', color:'#6366f1', border:'1px solid #6366f125' }}>{label}</span>
                                                ))}
                                                {permissions.length > 2 && (
                                                    <span style={{ fontSize:10, color:'var(--t-text3)', padding:'2px 4px' }}>+{permissions.length - 2}</span>
                                                )}
                                            </>
                                        )}
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setConfirmDel(user); }}
                                        disabled={busyId === user.id}
                                        style={{ padding:'6px 8px', borderRadius:8, background:'rgba(239,68,68,0.08)', color:'#ef4444', fontSize:11, fontWeight:900, border:'1px solid rgba(239,68,68,0.2)', cursor:'pointer', flexShrink:0 }}
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div style={{ borderRadius:14, border:'1px solid var(--t-border)', background:'var(--t-surface)', overflow:'hidden' }}>
                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                        <thead>
                            <tr style={{ background:'var(--t-bg)', borderBottom:'1px solid var(--t-border)' }}>
                                {['User', 'Email', 'System Role', 'Permissions', 'Projects', 'Status', 'Last Login', 'Actions'].map(h => (
                                    <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:10, fontWeight:900, color:'var(--t-text3)', textTransform:'uppercase', letterSpacing:'0.06em', whiteSpace:'nowrap' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr><td colSpan={8} style={{ textAlign:'center', padding:40, color:'var(--t-text3)', fontSize:13 }}>No users found</td></tr>
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

                                    {/* Permissions */}
                                    <td style={{ padding:'10px 14px' }}>
                                        <div style={{ display:'flex', flexWrap:'wrap', gap:4, maxWidth:220 }}>
                                            {getEnabledSystemPermissions(user).length === 0 ? (
                                                <span style={{ fontSize:11, color:'var(--t-text3)' }}>None</span>
                                            ) : (
                                                <>
                                                    {getEnabledSystemPermissions(user).slice(0, 3).map(([key, label]) => (
                                                        <span key={key} style={{ padding:'1px 6px', borderRadius:5, fontSize:9, fontWeight:800, background:'#6366f112', color:'#6366f1', border:'1px solid #6366f125' }}>{label}</span>
                                                    ))}
                                                    {getEnabledSystemPermissions(user).length > 3 && (
                                                        <span style={{ fontSize:10, color:'var(--t-text3)', padding:'1px 4px' }}>+{getEnabledSystemPermissions(user).length - 3}</span>
                                                    )}
                                                </>
                                            )}
                                        </div>
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
            {editingUser && (
                <UserDrawer
                    user={editingUser}
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
