/**
 * RolesPage — view, create, edit roles and their permission flags.
 */
import { useState } from 'react';
import { useAccounts } from '../context/AccountsContext';
import accountsApi from '../services/accountsApi';
import Modal from '../components/shared/Modal';
import Badge from '../components/shared/Badge';

const ROLE_COLORS = { SUPER_ADMIN:'#ef4444', HOME_OWNER:'#f97316', LEAD_ENGINEER:'#3b82f6', CONTRACTOR:'#8b5cf6', VIEWER:'#6b7280' };

const PERMISSIONS = [
    { key: 'can_manage_all_systems', label: 'Manage All Systems',   desc: 'Full system access — superpower', group: 'System'   },
    { key: 'can_manage_finances',    label: 'Manage Finances',      desc: 'Create/edit expenses, budgets',   group: 'Finance'  },
    { key: 'can_view_finances',      label: 'View Finances',        desc: 'Read-only access to finance data',group: 'Finance'  },
    { key: 'can_manage_phases',      label: 'Manage Phases & Tasks',desc: 'Create/edit construction phases', group: 'Construction' },
    { key: 'can_view_phases',        label: 'View Phases',          desc: 'Read-only access to timeline',    group: 'Construction' },
    { key: 'can_manage_users',       label: 'Manage Users',         desc: 'Invite, edit, deactivate users',  group: 'Admin'    },
];

const inp = { width:'100%', padding:'8px 12px', fontSize:13, borderRadius:10, border:'1px solid var(--t-border)', background:'var(--t-bg)', color:'var(--t-text)', outline:'none', fontFamily:'inherit', boxSizing:'border-box' };
const lbl = { display:'block', fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.07em', color:'var(--t-text3)', marginBottom:4 };

/* ── Permission toggle row ─────────────────────────────────────────────── */
function PermToggle({ permKey, label, desc, value, onChange, disabled }) {
    return (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid var(--t-border)' }}>
            <div>
                <p style={{ margin:0, fontSize:12, fontWeight:700, color:'var(--t-text)' }}>{label}</p>
                <p style={{ margin:'2px 0 0', fontSize:10, color:'var(--t-text3)' }}>{desc}</p>
            </div>
            <button type="button" onClick={() => !disabled && onChange(permKey, !value)}
                style={{
                    width:44, height:24, borderRadius:12, border:'none', cursor: disabled ? 'not-allowed' : 'pointer',
                    background: value ? '#6366f1' : 'var(--t-border)', transition:'background 0.2s', flexShrink:0,
                    position:'relative', opacity: disabled ? 0.5 : 1,
                }}>
                <span style={{ position:'absolute', top:2, left: value ? 22 : 2, width:20, height:20, borderRadius:'50%', background:'#fff', transition:'left 0.2s', display:'block' }} />
            </button>
        </div>
    );
}

/* ── Role form ─────────────────────────────────────────────────────────── */
function RoleForm({ role, onDone }) {
    const isEdit = !!role;
    const SYSTEM_CODES = ['SUPER_ADMIN','HOME_OWNER','LEAD_ENGINEER','CONTRACTOR','VIEWER'];
    const isSystem = isEdit && SYSTEM_CODES.includes(role.code);

    const [form, setForm] = useState({
        code:                   role?.code        || '',
        name:                   role?.name        || '',
        can_manage_all_systems: role?.can_manage_all_systems ?? false,
        can_manage_finances:    role?.can_manage_finances    ?? false,
        can_view_finances:      role?.can_view_finances      ?? false,
        can_manage_phases:      role?.can_manage_phases      ?? false,
        can_view_phases:        role?.can_view_phases        ?? true,
        can_manage_users:       role?.can_manage_users       ?? false,
    });
    const [busy, setBusy] = useState(false);
    const [err,  setErr]  = useState('');

    const setPerm = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setBusy(true); setErr('');
        try {
            if (isEdit) await accountsApi.updateRole(role.id, form);
            else        await accountsApi.createRole(form);
            onDone();
        } catch (ex) {
            setErr(ex?.response?.data?.detail || JSON.stringify(ex?.response?.data) || 'Failed to save role.');
        } finally { setBusy(false); }
    };

    const byGroup = PERMISSIONS.reduce((acc, p) => { (acc[p.group] = acc[p.group] || []).push(p); return acc; }, {});

    return (
        <form onSubmit={handleSubmit} style={{ padding:24 }} className="space-y-4">
            {err && <div style={{ padding:'8px 12px', borderRadius:8, background:'#ef444412', color:'#ef4444', fontSize:12, fontWeight:600 }}>❌ {err}</div>}

            {!isSystem && (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                    <div>
                        <label style={lbl}>Role Code <span style={{color:'#ef4444'}}>*</span></label>
                        <input style={inp} required value={form.code} onChange={e => setForm(f => ({...f, code: e.target.value.toUpperCase().replace(/\s/g,'_')}))} placeholder="e.g. SITE_MANAGER" disabled={isEdit} />
                    </div>
                    <div>
                        <label style={lbl}>Display Name <span style={{color:'#ef4444'}}>*</span></label>
                        <input style={inp} required value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="e.g. Site Manager" />
                    </div>
                </div>
            )}
            {isSystem && (
                <div style={{ padding:'10px 14px', borderRadius:10, background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)', fontSize:12, color:'#f59e0b', fontWeight:600 }}>
                    ⚠️ System role — name and code are fixed. You can only edit permission flags.
                </div>
            )}

            {/* Permission groups */}
            <div>
                <p style={{ margin:'4px 0 12px', fontSize:11, fontWeight:900, color:'var(--t-text)', textTransform:'uppercase', letterSpacing:'0.07em' }}>Permissions</p>
                {Object.entries(byGroup).map(([group, perms]) => (
                    <div key={group} style={{ marginBottom:16 }}>
                        <p style={{ margin:'0 0 4px', fontSize:9, fontWeight:900, color:'var(--t-text3)', textTransform:'uppercase', letterSpacing:'0.1em' }}>{group}</p>
                        {perms.map(p => (
                            <PermToggle key={p.key} permKey={p.key} label={p.label} desc={p.desc}
                                value={form[p.key]} onChange={setPerm}
                                disabled={form.can_manage_all_systems && p.key !== 'can_manage_all_systems'} />
                        ))}
                    </div>
                ))}
            </div>

            <button type="submit" disabled={busy}
                style={{ width:'100%', padding:'10px 0', borderRadius:10, background:'#6366f1', color:'#fff', fontSize:13, fontWeight:900, border:'none', cursor:'pointer', opacity: busy ? 0.6 : 1 }}>
                {busy ? 'Saving…' : isEdit ? '💾 Update Role' : '➕ Create Role'}
            </button>
        </form>
    );
}

/* ── Role card ─────────────────────────────────────────────────────────── */
function RoleCard({ role, onEdit, onDelete }) {
    const color = ROLE_COLORS[role.code] || '#6366f1';
    const perms = PERMISSIONS.filter(p => role[p.key]);
    const SYSTEM_CODES = ['SUPER_ADMIN','HOME_OWNER','LEAD_ENGINEER','CONTRACTOR','VIEWER'];
    const isSystem = SYSTEM_CODES.includes(role.code);

    return (
        <div style={{ borderRadius:14, border:'1px solid var(--t-border)', background:'var(--t-surface)', overflow:'hidden' }}>
            {/* Header */}
            <div style={{ padding:'16px 18px', borderBottom:'1px solid var(--t-border)', background:`${color}08`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ width:40, height:40, borderRadius:10, background:`${color}18`, border:`1px solid ${color}30`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>🛡️</div>
                    <div>
                        <p style={{ margin:0, fontSize:14, fontWeight:900, color:'var(--t-text)' }}>{role.name}</p>
                        <p style={{ margin:'2px 0 0', fontSize:10, fontWeight:700, color:'var(--t-text3)', fontFamily:'monospace' }}>{role.code}</p>
                    </div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6 }}>
                    <div style={{ padding:'3px 10px', borderRadius:6, background:`${color}18`, color, fontSize:11, fontWeight:900 }}>
                        {role.user_count ?? 0} user{(role.user_count ?? 0) !== 1 ? 's' : ''}
                    </div>
                    {isSystem && <Badge label="System" color="#6b7280" />}
                </div>
            </div>

            {/* Permissions */}
            <div style={{ padding:'12px 18px' }}>
                {perms.length === 0 ? (
                    <p style={{ fontSize:11, color:'var(--t-text3)', fontStyle:'italic' }}>No permissions granted</p>
                ) : (
                    <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                        {perms.map(p => (
                            <span key={p.key} style={{ padding:'2px 8px', borderRadius:6, background:`${color}12`, color, fontSize:10, fontWeight:700, border:`1px solid ${color}20` }}>
                                ✓ {p.label}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* Actions */}
            <div style={{ padding:'10px 18px', borderTop:'1px solid var(--t-border)', display:'flex', gap:8 }}>
                <button onClick={() => onEdit(role)}
                    style={{ flex:1, padding:'7px 0', borderRadius:8, background:`${color}12`, color, fontSize:11, fontWeight:900, border:`1px solid ${color}25`, cursor:'pointer' }}>
                    ✏️ Edit Permissions
                </button>
                {!isSystem && (
                    <button onClick={() => onDelete(role)}
                        style={{ padding:'7px 14px', borderRadius:8, background:'rgba(239,68,68,0.08)', color:'#ef4444', fontSize:11, fontWeight:900, border:'1px solid rgba(239,68,68,0.2)', cursor:'pointer' }}>
                        🗑️
                    </button>
                )}
            </div>
        </div>
    );
}

/* ── Main page ─────────────────────────────────────────────────────────── */
export default function RolesPage() {
    const { roles, loading, refreshRoles, refreshUsers } = useAccounts();
    const [showCreate, setShowCreate] = useState(false);
    const [editing,    setEditing]    = useState(null);
    const [confirmDel, setConfirmDel] = useState(null);
    const [delBusy,    setDelBusy]    = useState(false);
    const [delErr,     setDelErr]     = useState('');

    const handleDelete = async (role) => {
        setDelBusy(true); setDelErr('');
        try {
            await accountsApi.deleteRole(role.id);
            await refreshRoles();
            setConfirmDel(null);
        } catch (ex) {
            setDelErr(ex?.response?.data?.error || ex?.response?.data?.detail || 'Cannot delete this role.');
        } finally { setDelBusy(false); }
    };

    return (
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>

            {/* Toolbar */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
                <div>
                    <p style={{ margin:0, fontSize:20, fontWeight:900, color:'var(--t-text)' }}>🛡️ Roles & Permissions</p>
                    <p style={{ margin:'4px 0 0', fontSize:12, color:'var(--t-text3)' }}>Define what each role can access and do</p>
                </div>
                <button onClick={() => setShowCreate(true)}
                    style={{ padding:'8px 18px', borderRadius:10, background:'#6366f1', color:'#fff', fontSize:12, fontWeight:900, border:'none', cursor:'pointer' }}>
                    ➕ New Role
                </button>
            </div>

            {loading ? (
                <div style={{ textAlign:'center', padding:60 }}><div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto" /></div>
            ) : (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:16 }}>
                    {roles.map(role => (
                        <RoleCard key={role.id} role={role}
                            onEdit={r => setEditing(r)}
                            onDelete={r => setConfirmDel(r)}
                        />
                    ))}
                    {roles.length === 0 && (
                        <div style={{ gridColumn:'1/-1', textAlign:'center', padding:60, color:'var(--t-text3)' }}>
                            <p style={{ fontSize:40 }}>🛡️</p>
                            <p style={{ fontSize:14, fontWeight:700 }}>No roles yet</p>
                        </div>
                    )}
                </div>
            )}

            {/* Permissions legend */}
            <div style={{ marginTop:24, padding:20, borderRadius:14, border:'1px solid var(--t-border)', background:'var(--t-surface)' }}>
                <p style={{ margin:'0 0 12px', fontSize:11, fontWeight:900, color:'var(--t-text3)', textTransform:'uppercase', letterSpacing:'0.07em' }}>📖 Permission Reference</p>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:10 }}>
                    {PERMISSIONS.map(p => (
                        <div key={p.key} style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                            <span style={{ fontSize:12, marginTop:1 }}>🔑</span>
                            <div>
                                <p style={{ margin:0, fontSize:11, fontWeight:700, color:'var(--t-text)' }}>{p.label}</p>
                                <p style={{ margin:'1px 0 0', fontSize:10, color:'var(--t-text3)' }}>{p.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Create modal */}
            <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create New Role" maxWidth="max-w-lg">
                <RoleForm onDone={() => { setShowCreate(false); refreshRoles(); }} />
            </Modal>

            {/* Edit modal */}
            <Modal isOpen={!!editing} onClose={() => setEditing(null)} title={`Edit Role — ${editing?.name}`} maxWidth="max-w-lg">
                {editing && <RoleForm role={editing} onDone={() => { setEditing(null); refreshRoles(); refreshUsers(); }} />}
            </Modal>

            {/* Confirm delete */}
            <Modal isOpen={!!confirmDel} onClose={() => { setConfirmDel(null); setDelErr(''); }} title="Delete Role?" maxWidth="max-w-sm">
                {confirmDel && (
                    <div style={{ padding:24 }}>
                        {delErr && <div style={{ marginBottom:12, padding:'8px 12px', borderRadius:8, background:'#ef444412', color:'#ef4444', fontSize:12 }}>❌ {delErr}</div>}
                        <p style={{ margin:'0 0 6px', fontSize:14, fontWeight:700, color:'var(--t-text)' }}>Delete <strong>{confirmDel.name}</strong>?</p>
                        <p style={{ margin:'0 0 20px', fontSize:12, color:'var(--t-text3)' }}>Users assigned this role will lose their permissions.</p>
                        <div style={{ display:'flex', gap:8 }}>
                            <button onClick={() => { setConfirmDel(null); setDelErr(''); }} style={{ flex:1, padding:'9px 0', borderRadius:10, border:'1px solid var(--t-border)', background:'var(--t-bg)', color:'var(--t-text)', fontSize:12, fontWeight:700, cursor:'pointer' }}>Cancel</button>
                            <button onClick={() => handleDelete(confirmDel)} disabled={delBusy}
                                style={{ flex:1, padding:'9px 0', borderRadius:10, background:'#ef4444', color:'#fff', fontSize:12, fontWeight:900, border:'none', cursor:'pointer' }}>
                                {delBusy ? 'Deleting…' : '🗑️ Delete'}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
