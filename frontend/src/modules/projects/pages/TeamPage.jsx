/**
 * TeamPage — Project Team Management (Full CRUD)
 * ─────────────────────────────────────────────────────────────────────────────
 * Three tabs:
 *   MANAGEMENT  — project members with roles + permission management
 *   TEAMS       — workforce teams (WorkforceMember groups)
 *   WORKERS     — individual attendance workers on this project
 */
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import api from '../services/projectsApi';
import attendanceService from '../../../services/attendanceService';
import workforceService from '../../../services/workforceService';
import TeamsTab from '../../attendance/TeamsTab';
import WorkersTab from '../../attendance/WorkersTab';

// ── Role config ───────────────────────────────────────────────────────────────
export const ROLE_CONFIG = {
    OWNER:      { emoji: '👑', color: '#f97316', bg: '#fff7ed', label: 'Owner' },
    MANAGER:    { emoji: '🧑‍💼', color: '#3b82f6', bg: '#eff6ff', label: 'Manager' },
    ENGINEER:   { emoji: '🔧', color: '#8b5cf6', bg: '#f5f3ff', label: 'Engineer' },
    SUPERVISOR: { emoji: '🦺', color: '#f59e0b', bg: '#fffbeb', label: 'Supervisor' },
    CONTRACTOR: { emoji: '🏗️', color: '#6b7280', bg: '#f9fafb', label: 'Contractor' },
    VIEWER:     { emoji: '👁️', color: '#9ca3af', bg: '#f9fafb', label: 'Viewer' },
};

export const ROLES = [
    ['OWNER',      '👑 Owner'],
    ['MANAGER',    '🧑‍💼 Manager'],
    ['ENGINEER',   '🔧 Engineer'],
    ['SUPERVISOR', '🦺 Supervisor'],
    ['CONTRACTOR', '🏗️ Contractor'],
    ['VIEWER',     '👁️ Viewer'],
];

const ALL_PERMS = [
    { key: 'can_manage_members',    icon: '👥', label: 'Manage Team'  },
    { key: 'can_manage_phases',     icon: '📋', label: 'Phases'       },
    { key: 'can_manage_finances',   icon: '💰', label: 'Finances'     },
    { key: 'can_view_finances',     icon: '👁️', label: 'View Finance' },
    { key: 'can_manage_structure',  icon: '🏛️', label: 'Structure'    },
    { key: 'can_manage_resources',  icon: '🧱', label: 'Resources'    },
    { key: 'can_manage_workforce',  icon: '🦺', label: 'Workforce'    },
    { key: 'can_approve_purchases', icon: '✅', label: 'Approvals'    },
    { key: 'can_upload_media',      icon: '📸', label: 'Media'        },
];

const ROLE_DEFAULTS = {
    OWNER:      { can_manage_members:true,  can_manage_finances:true,  can_view_finances:true,  can_manage_phases:true,  can_manage_structure:true,  can_manage_resources:true,  can_upload_media:true,  can_manage_workforce:true,  can_approve_purchases:true  },
    MANAGER:    { can_manage_members:true,  can_manage_finances:true,  can_view_finances:true,  can_manage_phases:true,  can_manage_structure:true,  can_manage_resources:true,  can_upload_media:true,  can_manage_workforce:true,  can_approve_purchases:true  },
    ENGINEER:   { can_manage_members:false, can_manage_finances:false, can_view_finances:true,  can_manage_phases:true,  can_manage_structure:true,  can_manage_resources:false, can_upload_media:true,  can_manage_workforce:false, can_approve_purchases:false },
    SUPERVISOR: { can_manage_members:false, can_manage_finances:false, can_view_finances:true,  can_manage_phases:true,  can_manage_structure:false, can_manage_resources:false, can_upload_media:true,  can_manage_workforce:true,  can_approve_purchases:false },
    CONTRACTOR: { can_manage_members:false, can_manage_finances:false, can_view_finances:false, can_manage_phases:false, can_manage_structure:false, can_manage_resources:true,  can_upload_media:true,  can_manage_workforce:false, can_approve_purchases:false },
    VIEWER:     { can_manage_members:false, can_manage_finances:false, can_view_finances:true,  can_manage_phases:false, can_manage_structure:false, can_manage_resources:false, can_upload_media:false, can_manage_workforce:false, can_approve_purchases:false },
};

// ── Shared tiny UI helpers ────────────────────────────────────────────────────
const s = {
    input: { width:'100%', padding:'9px 12px', borderRadius:10, border:'1px solid var(--t-border)', background:'var(--t-bg)', color:'var(--t-text)', fontSize:13, boxSizing:'border-box', outline:'none' },
    label: { display:'block', fontSize:11, fontWeight:700, color:'var(--t-text3)', textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:5 },
    btn:   (bg='#f97316', col='#fff') => ({ padding:'9px 18px', borderRadius:10, border:'none', background:bg, color:col, fontWeight:800, fontSize:13, cursor:'pointer' }),
};

function Avatar({ name, color }) {
    const initials = (name || '?').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
    return (
        <div style={{ width:38, height:38, borderRadius:12, background:`${color}20`, color, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, fontSize:15, flexShrink:0, border:`1.5px solid ${color}40` }}>
            {initials}
        </div>
    );
}

function PermChip({ perm, value, editable, onToggle }) {
    return (
        <button
            onClick={editable ? onToggle : undefined}
            title={perm.label}
            style={{
                display:'inline-flex', alignItems:'center', gap:4,
                padding:'3px 8px', borderRadius:6, fontSize:11, fontWeight:700,
                border:`1px solid ${value ? '#22c55e40' : 'var(--t-border)'}`,
                background: value ? '#f0fdf4' : 'var(--t-surface)',
                color: value ? '#15803d' : 'var(--t-text3)',
                cursor: editable ? 'pointer' : 'default',
                transition: 'all 0.15s',
                userSelect: 'none',
            }}
        >
            <span style={{ fontSize:10 }}>{perm.icon}</span>
            {perm.label}
        </button>
    );
}

// ── Remove confirm modal ───────────────────────────────────────────────────────
function RemoveModal({ member, onConfirm, onCancel }) {
    const [removing, setRemoving] = useState(false);
    return (
        <div style={{ position:'fixed', inset:0, zIndex:400, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
            <div style={{ background:'var(--t-bg)', borderRadius:16, padding:28, maxWidth:380, width:'100%', border:'1px solid var(--t-border)' }}>
                <div style={{ fontSize:32, textAlign:'center', marginBottom:12 }}>⚠️</div>
                <h3 style={{ margin:'0 0 8px', fontWeight:900, textAlign:'center' }}>Remove Member?</h3>
                <p style={{ margin:'0 0 24px', fontSize:13, color:'var(--t-text3)', textAlign:'center' }}>
                    <strong>{member.full_name || member.username}</strong> will lose access to this project.
                </p>
                <div style={{ display:'flex', gap:10 }}>
                    <button onClick={onCancel} style={{ ...s.btn('var(--t-surface)', 'var(--t-text)'), flex:1, border:'1px solid var(--t-border)' }}>Cancel</button>
                    <button onClick={async () => { setRemoving(true); await onConfirm(); }} disabled={removing}
                        style={{ ...s.btn('#ef4444'), flex:1 }}>
                        {removing ? 'Removing…' : 'Yes, Remove'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Member card ───────────────────────────────────────────────────────────────
function MemberCard({ member, canManage, onUpdated, onRemoved, isLinked }) {
    const [expanded, setExpanded] = useState(false);
    const [editing, setEditing]   = useState(false);
    const [perms, setPerms]       = useState({});
    const [role, setRole]         = useState(member.role);
    const [note, setNote]         = useState(member.note || '');
    const [saving, setSaving]     = useState(false);
    const [confirmRemove, setConfirmRemove] = useState(false);

    const cfg = ROLE_CONFIG[member.role] || ROLE_CONFIG.VIEWER;

    const openEdit = () => {
        const p = {};
        ALL_PERMS.forEach(({ key }) => { p[key] = !!member[key]; });
        setPerms(p);
        setRole(member.role);
        setNote(member.note || '');
        setEditing(true);
        setExpanded(true);
    };

    const applyRoleDefaults = (r) => {
        setRole(r);
        setPerms({ ...ROLE_DEFAULTS[r] });
    };

    const save = async () => {
        setSaving(true);
        try {
            const res = await api.updateMember(member.id, { role, note, ...perms });
            onUpdated(res.data);
            setEditing(false);
        } catch {}
        finally { setSaving(false); }
    };

    const togglePerm = (key) => {
        if (!editing) return;
        setPerms(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const displayPerms = editing ? perms : member;
    const permCount = ALL_PERMS.filter(p => displayPerms[p.key]).length;

    return (
        <>
            <div style={{ background:'var(--t-surface)', borderRadius:14, border:`1px solid var(--t-border)`, overflow:'hidden' }}>

                {/* ── Header row ── */}
                <div style={{ padding:'12px 16px', display:'flex', alignItems:'center', gap:12 }}>
                    <Avatar name={member.full_name || member.username} color={cfg.color} />

                    <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                            <span style={{ fontWeight:800, fontSize:14 }}>{member.full_name || member.username}</span>
                            {isLinked && <span title="Linked to attendance" style={{ fontSize:11 }}>✅</span>}
                        </div>
                        <div style={{ fontSize:11, color:'var(--t-text3)' }}>{member.email}</div>
                    </div>

                    {/* Role badge */}
                    <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
                        <span style={{ padding:'3px 10px', borderRadius:8, fontSize:11, fontWeight:800, background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.color}30` }}>
                            {cfg.emoji} {cfg.label}
                        </span>
                        <span style={{ fontSize:11, color:'var(--t-text3)' }}>{permCount}/{ALL_PERMS.length}</span>
                    </div>

                    {/* Actions */}
                    <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                        {canManage && !editing && (
                            <button onClick={openEdit} style={{ padding:'5px 12px', borderRadius:8, border:'1px solid var(--t-border)', background:'transparent', color:'var(--t-text3)', cursor:'pointer', fontSize:12, fontWeight:700 }}>Edit</button>
                        )}
                        {canManage && (
                            <button onClick={() => setConfirmRemove(true)} style={{ padding:'5px 10px', borderRadius:8, border:'1px solid #fee2e2', background:'#fff5f5', color:'#ef4444', cursor:'pointer', fontSize:12 }}>✕</button>
                        )}
                        <button onClick={() => setExpanded(e => !e)} style={{ padding:'5px 10px', borderRadius:8, border:'1px solid var(--t-border)', background:'transparent', color:'var(--t-text3)', cursor:'pointer', fontSize:12 }}>
                            {expanded ? '▲' : '▼'}
                        </button>
                    </div>
                </div>

                {/* ── Expanded body ── */}
                {expanded && (
                    <div style={{ borderTop:'1px solid var(--t-border)', padding:'16px' }}>

                        {editing ? (
                            <>
                                {/* Role + Note row */}
                                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
                                    <div>
                                        <label style={s.label}>Role</label>
                                        <select value={role} onChange={e => applyRoleDefaults(e.target.value)} style={{ ...s.input }}>
                                            {ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                                        </select>
                                        <div style={{ fontSize:10, color:'var(--t-text3)', marginTop:4 }}>Changing role auto-applies default permissions</div>
                                    </div>
                                    <div>
                                        <label style={s.label}>Note</label>
                                        <input value={note} onChange={e => setNote(e.target.value)} placeholder="Optional note…" style={s.input} />
                                    </div>
                                </div>

                                {/* Permission grid */}
                                <div style={{ marginBottom:16 }}>
                                    <div style={{ fontSize:11, fontWeight:700, color:'var(--t-text3)', textTransform:'uppercase', marginBottom:8 }}>Permissions <span style={{ color:'var(--t-text3)', fontWeight:400 }}>(click to toggle)</span></div>
                                    <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                                        {ALL_PERMS.map(p => (
                                            <PermChip key={p.key} perm={p} value={!!perms[p.key]} editable onToggle={() => togglePerm(p.key)} />
                                        ))}
                                    </div>
                                </div>

                                {/* Save / Cancel */}
                                <div style={{ display:'flex', gap:8 }}>
                                    <button onClick={save} disabled={saving} style={s.btn()}>{saving ? 'Saving…' : 'Save Changes'}</button>
                                    <button onClick={() => setEditing(false)} style={{ ...s.btn('transparent', 'var(--t-text3)'), border:'1px solid var(--t-border)' }}>Cancel</button>
                                </div>
                            </>
                        ) : (
                            <>
                                {/* Read-only permission chips */}
                                <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom: member.note ? 10 : 0 }}>
                                    {ALL_PERMS.map(p => (
                                        <PermChip key={p.key} perm={p} value={!!member[p.key]} editable={false} />
                                    ))}
                                </div>
                                {member.note && (
                                    <div style={{ marginTop:10, padding:'8px 12px', borderRadius:8, background:'var(--t-bg)', border:'1px solid var(--t-border)', fontSize:12, color:'var(--t-text3)', fontStyle:'italic' }}>
                                        📝 {member.note}
                                    </div>
                                )}
                                <div style={{ marginTop:10, fontSize:11, color:'var(--t-text3)' }}>
                                    Joined: {member.joined_at ? new Date(member.joined_at).toLocaleDateString() : '—'}
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {confirmRemove && (
                <RemoveModal
                    member={member}
                    onConfirm={async () => { await api.removeMember(member.id); onRemoved(member.id); setConfirmRemove(false); }}
                    onCancel={() => setConfirmRemove(false)}
                />
            )}
        </>
    );
}

// ── Add Member Form ───────────────────────────────────────────────────────────
function AddMemberForm({ availableUsers, projectId, onAdded, onCancel }) {
    const [form, setForm]   = useState({ user: '', role: 'ENGINEER', note: '' });
    const [perms, setPerms] = useState({ ...ROLE_DEFAULTS.ENGINEER });
    const [adding, setAdding] = useState(false);
    const [err, setErr]     = useState('');

    const applyRole = (role) => {
        setForm(f => ({ ...f, role }));
        setPerms({ ...ROLE_DEFAULTS[role] });
    };

    const submit = async (e) => {
        e.preventDefault();
        if (!form.user) return setErr('Select a user.');
        setAdding(true); setErr('');
        try {
            const res = await api.addMember({ project: projectId, user: +form.user, role: form.role, note: form.note, ...perms });
            onAdded(res.data);
        } catch (ex) {
            setErr(ex?.response?.data?.non_field_errors?.[0] || ex?.response?.data?.detail || 'Could not add member.');
        } finally { setAdding(false); }
    };

    return (
        <div style={{ background:'var(--t-surface)', borderRadius:16, border:'1px solid var(--t-border)', padding:20, marginBottom:20 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                <h3 style={{ margin:0, fontWeight:900, fontSize:15 }}>➕ Add Project Member</h3>
                <button onClick={onCancel} style={{ background:'none', border:'none', cursor:'pointer', fontSize:18, color:'var(--t-text3)' }}>✕</button>
            </div>

            {err && <div style={{ color:'#ef4444', fontSize:12, marginBottom:12, padding:'8px 12px', background:'#fff5f5', borderRadius:8 }}>{err}</div>}

            <form onSubmit={submit}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
                    <div>
                        <label style={s.label}>User *</label>
                        <select value={form.user} onChange={e => setForm(f => ({ ...f, user: e.target.value }))} style={s.input}>
                            <option value="">Select user…</option>
                            {availableUsers.map(u => (
                                <option key={u.id} value={u.id}>{u.first_name ? `${u.first_name} ${u.last_name}` : u.username} — {u.email}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label style={s.label}>Role *</label>
                        <select value={form.role} onChange={e => applyRole(e.target.value)} style={s.input}>
                            {ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                    </div>
                </div>

                <div style={{ marginBottom:14 }}>
                    <label style={s.label}>Note (optional)</label>
                    <input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="e.g. External consultant" style={s.input} />
                </div>

                {/* Permission preview */}
                <div style={{ marginBottom:16 }}>
                    <div style={{ fontSize:11, fontWeight:700, color:'var(--t-text3)', textTransform:'uppercase', marginBottom:8 }}>
                        Permissions for {ROLE_CONFIG[form.role]?.label} <span style={{ fontWeight:400 }}>(click to override)</span>
                    </div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                        {ALL_PERMS.map(p => (
                            <PermChip key={p.key} perm={p} value={!!perms[p.key]} editable
                                onToggle={() => setPerms(prev => ({ ...prev, [p.key]: !prev[p.key] }))} />
                        ))}
                    </div>
                </div>

                <div style={{ display:'flex', gap:8 }}>
                    <button type="submit" disabled={adding} style={s.btn()}>{adding ? 'Adding…' : 'Add Member'}</button>
                    <button type="button" onClick={onCancel} style={{ ...s.btn('transparent', 'var(--t-text3)'), border:'1px solid var(--t-border)' }}>Cancel</button>
                </div>
            </form>
        </div>
    );
}

// ── Management tab ─────────────────────────────────────────────────────────────
function ManagementTab({ projectId }) {
    const [members,  setMembers]  = useState([]);
    const [workers,  setWorkers]  = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [myRole,   setMyRole]   = useState(null);
    const [loading,  setLoading]  = useState(true);
    const [showAdd,  setShowAdd]  = useState(false);
    const [search,   setSearch]   = useState('');
    const [roleFilter, setRoleFilter] = useState('');

    const canManage = myRole?.can_manage_members === true;

    const load = useCallback(async () => {
        if (!projectId) return;
        setLoading(true);
        try {
            const [mRes, uRes, rRes, wRes] = await Promise.all([
                api.listMembers(projectId),
                api.listUsers(),
                api.getMyRole(projectId).catch(() => null),
                attendanceService.getWorkers({ project: projectId }).catch(() => []),
            ]);
            setMembers(Array.isArray(mRes.data) ? mRes.data : (mRes.data.results || []));
            setAllUsers(Array.isArray(uRes.data) ? uRes.data : (uRes.data.results || []));
            setMyRole(rRes?.data || null);
            const w = Array.isArray(wRes) ? wRes : (wRes.results || []);
            setWorkers(w);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [projectId]);

    useEffect(() => { load(); }, [load]);

    const handleAdded   = (m) => { setMembers(prev => [m, ...prev]); setShowAdd(false); };
    const handleUpdated = (m) => setMembers(prev => prev.map(x => x.id === m.id ? m : x));
    const handleRemoved = (id) => setMembers(prev => prev.filter(m => m.id !== id));

    const filtered = members.filter(m => {
        const q = search.toLowerCase();
        const matchSearch = !q || (m.full_name||'').toLowerCase().includes(q) || (m.email||'').toLowerCase().includes(q);
        const matchRole   = !roleFilter || m.role === roleFilter;
        return matchSearch && matchRole;
    });

    // Group by role
    const grouped = ROLES.reduce((acc, [role]) => {
        const grp = filtered.filter(m => m.role === role);
        if (grp.length) acc.push({ role, members: grp });
        return acc;
    }, []);

    // Summary counts
    const permTotal = members.reduce((sum, m) => sum + ALL_PERMS.filter(p => m[p.key]).length, 0);

    if (loading) return <div style={{ textAlign:'center', padding:60, color:'var(--t-text3)' }}>Loading team…</div>;

    return (
        <div>
            {/* Summary bar */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px,1fr))', gap:12, marginBottom:20 }}>
                {[
                    { label:'Total Members', value:members.length,  color:'#6366f1', icon:'🏢' },
                    { label:'Field Workers',  value:workers.length,  color:'#f97316', icon:'🦺' },
                    { label:'Perms Granted',  value:permTotal,       color:'#22c55e', icon:'🔐' },
                ].map(c => (
                    <div key={c.label} style={{ background:'var(--t-surface)', padding:'14px 16px', borderRadius:14, border:'1px solid var(--t-border)', borderTop:`3px solid ${c.color}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <div>
                            <div style={{ fontSize:22, fontWeight:900, color:c.color }}>{c.value}</div>
                            <div style={{ fontSize:10, fontWeight:800, color:'var(--t-text3)', textTransform:'uppercase' }}>{c.label}</div>
                        </div>
                        <span style={{ fontSize:22 }}>{c.icon}</span>
                    </div>
                ))}
            </div>

            {/* Action bar */}
            <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
                <input
                    placeholder="Search name, email…"
                    value={search} onChange={e => setSearch(e.target.value)}
                    style={{ ...s.input, flex:1, minWidth:180 }}
                />
                <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={{ ...s.input, width:'auto', flex:'0 0 140px' }}>
                    <option value="">All Roles</option>
                    {ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                {canManage && (
                    <button onClick={() => setShowAdd(s => !s)} style={s.btn(showAdd ? '#6b7280' : '#f97316')}>
                        {showAdd ? '✕ Close' : '+ Add Member'}
                    </button>
                )}
            </div>

            {showAdd && canManage && (
                <AddMemberForm
                    availableUsers={allUsers.filter(u => !members.find(m => m.user === u.id))}
                    projectId={projectId}
                    onAdded={handleAdded}
                    onCancel={() => setShowAdd(false)}
                />
            )}

            {/* Member groups */}
            {grouped.length === 0 ? (
                <div style={{ textAlign:'center', padding:60, background:'var(--t-surface)', borderRadius:16, border:'1px dashed var(--t-border)', color:'var(--t-text3)' }}>
                    {search || roleFilter ? 'No members match your filter.' : 'No team members yet. Add the first one.'}
                </div>
            ) : (
                grouped.map(({ role, members: grp }) => {
                    const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.VIEWER;
                    return (
                        <div key={role} style={{ marginBottom:24 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                                <span style={{ fontSize:16 }}>{cfg.emoji}</span>
                                <h3 style={{ margin:0, fontSize:11, fontWeight:900, textTransform:'uppercase', letterSpacing:'0.1em', color:cfg.color }}>
                                    {cfg.label}s
                                </h3>
                                <span style={{ fontSize:10, fontWeight:800, padding:'2px 8px', borderRadius:6, background:`${cfg.color}15`, color:cfg.color }}>{grp.length}</span>
                            </div>
                            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                                {grp.map(m => (
                                    <MemberCard
                                        key={m.id}
                                        member={m}
                                        canManage={canManage}
                                        onUpdated={handleUpdated}
                                        onRemoved={handleRemoved}
                                        isLinked={workers.some(w => w.linked_user === m.user)}
                                    />
                                ))}
                            </div>
                        </div>
                    );
                })
            )}
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function TeamPage() {
    const { id }      = useParams();
    const { project } = useOutletContext() || {};
    const projectId   = project?.id || id;
    const [tab, setTab] = useState('MANAGEMENT');

    const tabs = [
        { id: 'MANAGEMENT', label: 'Office & Management', icon: '🏢' },
        { id: 'TEAMS',      label: 'Workforce Teams',     icon: '👥' },
        { id: 'WORKERS',    label: 'Individual Workers',  icon: '👷' },
    ];

    return (
        <div style={{ padding:'0 0 60px', maxWidth:920, margin:'0 auto' }}>

            {/* Tabs */}
            <div style={{ display:'flex', gap:4, marginBottom:24, borderBottom:'2px solid var(--t-border)', paddingBottom:0 }}>
                {tabs.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)} style={{
                        padding:'10px 16px', border:'none', background:'transparent', fontSize:13, fontWeight:800,
                        cursor:'pointer', display:'flex', alignItems:'center', gap:6,
                        color: tab === t.id ? '#f97316' : 'var(--t-text3)',
                        borderBottom: tab === t.id ? '2px solid #f97316' : '2px solid transparent',
                        marginBottom: -2, transition:'color 0.15s',
                    }}>
                        <span>{t.icon}</span>{t.label}
                    </button>
                ))}
            </div>

            {tab === 'MANAGEMENT' && <ManagementTab projectId={projectId} />}
            {tab === 'TEAMS'      && <TeamsTab      projectId={projectId} />}
            {tab === 'WORKERS'    && <WorkersTab    projectId={projectId} />}
        </div>
    );
}
