/**
 * TeamPage — Project Team Management (Full CRUD)
 * ─────────────────────────────────────────────────────────────────────────────
 * Three tabs:
 *   MANAGEMENT  — project members with roles + permission management
 *   TEAMS       — workforce teams (WorkforceMember groups)
 *   WORKERS     — individual attendance workers on this project
 */
import React, { useEffect, useState, useCallback } from 'react';
import { Link, useParams, useOutletContext } from 'react-router-dom';
import api from '../services/projectsApi';
import attendanceService from '../../../services/attendanceService';
import workforceService from '../../../services/workforceService';
import TeamsTab from '../../attendance/TeamsTab';
import WorkforceMembersView from '../../workforce/components/WorkforceMembersView';
import accountsApi from '../../accounts/services/accountsApi';
import Modal from '../../accounts/components/shared/Modal';
import { ProjectRoleManager, ProjectRoleForm } from '../../accounts/pages/RolesPage';
import {
    PROJECT_PERMISSION_META,
    normalizeProjectRoles,
    getProjectRoleByCode,
    buildProjectRoleDefaults,
} from '../../accounts/utils/projectRoles';

const ALL_PERMS = PROJECT_PERMISSION_META.map(({ key, icon, label }) => ({ key, icon, label }));

const getRoleConfig = (projectRoles, code) => {
    const role = getProjectRoleByCode(projectRoles, code);
    return {
        emoji: role.icon || '🧭',
        color: role.color || '#2563eb',
        bg: `${role.color || '#2563eb'}12`,
        label: role.name || code || 'Role',
        description: role.description || '',
    };
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
function MemberCard({ member, canManage, onUpdated, onRemoved, isLinked, projectRoles }) {
    const [expanded, setExpanded] = useState(false);
    const [editing, setEditing]   = useState(false);
    const [perms, setPerms]       = useState({});
    const [role, setRole]         = useState(member.role);
    const [note, setNote]         = useState(member.note || '');
    const [saving, setSaving]     = useState(false);
    const [confirmRemove, setConfirmRemove] = useState(false);

    const cfg = getRoleConfig(projectRoles, member.role);

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
        setPerms(buildProjectRoleDefaults(getProjectRoleByCode(projectRoles, r)));
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
    const workforceLink = member.workforce_id ? `/dashboard/desktop/workforce?member=${member.workforce_id}` : null;

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
                        {member.official_role_name && (
                            <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                <span style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--t-text3)' }}>
                                    Official Role
                                </span>
                                <span style={{
                                    padding: '3px 8px',
                                    borderRadius: 999,
                                    background: 'rgba(249,115,22,0.12)',
                                    color: '#c2410c',
                                    fontSize: 11,
                                    fontWeight: 800,
                                    border: '1px solid rgba(249,115,22,0.2)',
                                }}>
                                    🏗️ {member.official_role_name}
                                </span>
                                {workforceLink && (
                                    <Link
                                        to={workforceLink}
                                        style={{
                                            fontSize: 11,
                                            fontWeight: 700,
                                            color: '#2563eb',
                                            textDecoration: 'none',
                                        }}
                                    >
                                        Open workforce profile
                                    </Link>
                                )}
                            </div>
                        )}
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
                                            {projectRoles.map((projectRole) => (
                                                <option key={projectRole.code} value={projectRole.code}>
                                                    {`${projectRole.icon} ${projectRole.name}`}
                                                </option>
                                            ))}
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
                                {member.official_role_name && (
                                    <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 8, background: 'var(--t-bg)', border: '1px solid var(--t-border)', fontSize: 12, color: 'var(--t-text3)' }}>
                                        <strong style={{ color: 'var(--t-text)', marginRight: 6 }}>Official workforce role:</strong>
                                        {member.official_role_name}
                                        {member.official_role_code ? ` (${member.official_role_code})` : ''}
                                        {workforceLink && (
                                            <Link
                                                to={workforceLink}
                                                style={{ marginLeft: 10, color: '#2563eb', fontWeight: 700, textDecoration: 'none' }}
                                            >
                                                Manage in workforce
                                            </Link>
                                        )}
                                    </div>
                                )}
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
function AddMemberForm({ availableUsers, projectId, onAdded, onCancel, projectRoles }) {
    const defaultRoleCode = projectRoles.find(role => role.code === 'ENGINEER')?.code || projectRoles[0]?.code || 'VIEWER';
    const [form, setForm]   = useState({ user: '', role: defaultRoleCode, note: '' });
    const [perms, setPerms] = useState(buildProjectRoleDefaults(getProjectRoleByCode(projectRoles, defaultRoleCode)));
    const [adding, setAdding] = useState(false);
    const [err, setErr]     = useState('');

    useEffect(() => {
        if (!projectRoles.length) return;
        setForm(prev => {
            if (projectRoles.some(role => role.code === prev.role)) return prev;
            return { ...prev, role: defaultRoleCode };
        });
        setPerms(prev => (
            projectRoles.some(role => role.code === form.role)
                ? prev
                : buildProjectRoleDefaults(getProjectRoleByCode(projectRoles, defaultRoleCode))
        ));
    }, [defaultRoleCode, form.role, projectRoles]);

    const applyRole = (role) => {
        setForm(f => ({ ...f, role }));
        setPerms(buildProjectRoleDefaults(getProjectRoleByCode(projectRoles, role)));
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
                            {projectRoles.map(projectRole => (
                                <option key={projectRole.code} value={projectRole.code}>
                                    {`${projectRole.icon} ${projectRole.name}`}
                                </option>
                            ))}
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
                        Permissions for {getRoleConfig(projectRoles, form.role).label} <span style={{ fontWeight:400 }}>(click to override)</span>
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
    const [projectRoles, setProjectRoles] = useState([]);
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
            const [mRes, uRes, rRes, wRes, prRes] = await Promise.all([
                api.listMembers(projectId),
                api.listUsers(),
                api.getMyRole(projectId).catch(() => null),
                attendanceService.getWorkers({ project: projectId }).catch(() => []),
                api.listProjectRoles().catch(() => ({ data: [] })),
            ]);
            setMembers(Array.isArray(mRes.data) ? mRes.data : (mRes.data.results || []));
            setAllUsers(Array.isArray(uRes.data) ? uRes.data : (uRes.data.results || []));
            setMyRole(rRes?.data || null);
            const w = Array.isArray(wRes) ? wRes : (wRes.results || []);
            setWorkers(w);
            setProjectRoles(normalizeProjectRoles(prRes.data || []));
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

    const roleOptions = normalizeProjectRoles(projectRoles);
    const grouped = roleOptions.reduce((acc, roleOption) => {
        const grp = filtered.filter(m => m.role === roleOption.code);
        if (grp.length) acc.push({ role: roleOption.code, roleOption, members: grp });
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
                    {roleOptions.map(roleOption => <option key={roleOption.code} value={roleOption.code}>{`${roleOption.icon} ${roleOption.name}`}</option>)}
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
                    projectRoles={roleOptions}
                />
            )}

            {/* Member groups */}
            {grouped.length === 0 ? (
                <div style={{ textAlign:'center', padding:60, background:'var(--t-surface)', borderRadius:16, border:'1px dashed var(--t-border)', color:'var(--t-text3)' }}>
                    {search || roleFilter ? 'No members match your filter.' : 'No team members yet. Add the first one.'}
                </div>
            ) : (
                grouped.map(({ role, roleOption, members: grp }) => {
                    const cfg = getRoleConfig(roleOptions, role);
                    return (
                        <div key={role} style={{ marginBottom:24 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                                <span style={{ fontSize:16 }}>{cfg.emoji}</span>
                                <h3 style={{ margin:0, fontSize:11, fontWeight:900, textTransform:'uppercase', letterSpacing:'0.1em', color:cfg.color }}>
                                    {roleOption?.name || cfg.label}
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
                                        projectRoles={roleOptions}
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

function ProjectRolesTab() {
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [editingRole, setEditingRole] = useState(null);
    const [deleteRole, setDeleteRole] = useState(null);
    const [deleteBusy, setDeleteBusy] = useState(false);
    const [deleteErr, setDeleteErr] = useState('');

    const loadRoles = useCallback(async () => {
        setLoading(true);
        try {
            const res = await accountsApi.getProjectRoles();
            setRoles(normalizeProjectRoles(res.data || []));
        } catch {
            setRoles(normalizeProjectRoles([]));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadRoles();
    }, [loadRoles]);

    const handleDelete = async () => {
        if (!deleteRole?.id) return;
        setDeleteBusy(true);
        setDeleteErr('');
        try {
            await accountsApi.deleteProjectRole(deleteRole.id);
            setDeleteRole(null);
            await loadRoles();
        } catch (ex) {
            setDeleteErr(ex?.response?.data?.error || ex?.response?.data?.detail || 'Cannot delete this project role.');
        } finally {
            setDeleteBusy(false);
        }
    };

    return (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div style={{
                padding:18,
                borderRadius:14,
                border:'1px solid var(--t-border)',
                background:'var(--t-surface)',
            }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:16, flexWrap:'wrap' }}>
                    <div style={{ maxWidth: 760, minWidth: 0 }}>
                        <p style={{ margin:0, fontSize:17, fontWeight:900, color:'var(--t-text)' }}>
                            Project Roles / प्रोजेक्ट रोल
                        </p>
                        <p style={{ margin:'6px 0 0', fontSize:12, lineHeight:1.65, color:'var(--t-text3)' }}>
                            Reusable templates for project members. Create the role here, then assign it from the
                            <strong> Management </strong>
                            tab.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowCreate(true)}
                        style={{
                            padding:'10px 16px',
                            borderRadius:12,
                            background:'#10b981',
                            color:'#fff',
                            fontSize:12,
                            fontWeight:900,
                            border:'none',
                            cursor:'pointer',
                            whiteSpace:'nowrap',
                        }}
                    >
                        ➕ New Project Role
                    </button>
                </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:12 }}>
                {[
                    {
                        label: 'Total Roles',
                        value: roles.length,
                        color: '#10b981',
                    },
                    {
                        label: 'Custom Roles',
                        value: roles.filter(role => !role.is_system).length,
                        color: '#f97316',
                    },
                    {
                        label: 'Default Roles',
                        value: roles.filter(role => role.is_system).length,
                        color: '#3b82f6',
                    },
                ].map((card) => (
                    <div key={card.label} style={{ padding:14, borderRadius:14, border:'1px solid var(--t-border)', background:'var(--t-surface)' }}>
                        <div style={{ fontSize:10, fontWeight:900, color:'var(--t-text3)', textTransform:'uppercase', letterSpacing:'0.08em' }}>{card.label}</div>
                        <div style={{ marginTop:6, fontSize:24, fontWeight:900, color:card.color }}>{card.value}</div>
                    </div>
                ))}
            </div>

            {loading ? (
                <div style={{ textAlign:'center', padding:40, color:'var(--t-text3)' }}>Loading project roles…</div>
            ) : (
                <ProjectRoleManager
                    roles={roles}
                    onEdit={setEditingRole}
                    onDelete={setDeleteRole}
                    embedded
                    title="Project Role Library"
                    subtitle="Choose a template, review its permissions, and edit it in place."
                />
            )}

            <Modal
                isOpen={showCreate}
                onClose={() => setShowCreate(false)}
                title="Create Project Role"
                size="lg"
            >
                {showCreate && (
                    <ProjectRoleForm
                        onDone={() => {
                            setShowCreate(false);
                            loadRoles();
                        }}
                    />
                )}
            </Modal>

            <Modal
                isOpen={!!editingRole}
                onClose={() => setEditingRole(null)}
                title="Edit Project Role"
                size="lg"
            >
                {editingRole && (
                    <ProjectRoleForm
                        role={editingRole}
                        onDone={() => {
                            setEditingRole(null);
                            loadRoles();
                        }}
                    />
                )}
            </Modal>

            <Modal
                isOpen={!!deleteRole}
                onClose={() => { if (!deleteBusy) { setDeleteRole(null); setDeleteErr(''); } }}
                title="Delete Project Role"
                size="sm"
            >
                {deleteRole && (
                    <div style={{ padding: 8 }}>
                        <p style={{ margin:'0 0 10px', fontSize:13, color:'var(--t-text)' }}>
                            Delete <strong>{deleteRole.name}</strong> ({deleteRole.code})?
                        </p>
                        <p style={{ margin:'0 0 14px', fontSize:12, color:'var(--t-text3)', lineHeight:1.6 }}>
                            Members already using this template may need reassignment.
                        </p>
                        {deleteErr && (
                            <div style={{ padding:'8px 12px', borderRadius:8, background:'#ef444412', color:'#ef4444', fontSize:12, fontWeight:600, marginBottom:12 }}>
                                ❌ {deleteErr}
                            </div>
                        )}
                        <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
                            <button
                                type="button"
                                onClick={() => { setDeleteRole(null); setDeleteErr(''); }}
                                disabled={deleteBusy}
                                style={{ ...s.btn('transparent', 'var(--t-text3)'), border:'1px solid var(--t-border)' }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleDelete}
                                disabled={deleteBusy}
                                style={s.btn('#ef4444')}
                            >
                                {deleteBusy ? 'Deleting…' : 'Delete Role'}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
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
        { id: 'PROJECT_ROLES', label: 'Project Roles',    icon: '🗂️' },
    ];

    return (
        <div style={{ padding:'0 0 60px' }}>

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
            {tab === 'WORKERS'    && <WorkforceMembersView projectId={projectId} hideProjectFilter={true} />}
            {tab === 'PROJECT_ROLES' && <ProjectRolesTab />}
            {/* ── Nepali Note Section (Project Management) ── */}
            {tab === 'MANAGEMENT' && (
            <div style={{ marginTop: 60, padding: 30, background: 'linear-gradient(135deg, #fff 0%, #f9fafb 100%)', borderRadius: 24, border: '1px solid var(--t-border)', boxShadow: '0 10px 30px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
                    <div style={{ width: 48, height: 48, borderRadius: 16, background: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 24, flexShrink: 0 }}>📋</div>
                    <div style={{ flex: 1 }}>
                        <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 900, color: 'var(--t-text)' }}>परियोजना व्यवस्थापन निर्देशिका (Complete Project Management Guide)</h3>
                        <p style={{ margin: 0, fontSize: 13, color: 'var(--t-text3)', lineHeight: 1.6, fontWeight: 600 }}>
                            यस सेक्सनको बारेमा सम्पूर्ण जानकारी यहाँ उपलब्ध छ:
                        </p>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 30, marginTop: 24 }}>
                            {/* What & Why */}
                            <div style={{ background: '#fff', padding: 20, borderRadius: 16, border: '1px solid var(--t-border)' }}>
                                <div style={{ marginBottom: 16 }}>
                                    <div style={{ fontSize: 12, fontWeight: 900, color: '#f97316', marginBottom: 4 }}>📌 यो के हो? (What is this?)</div>
                                    <p style={{ margin: 0, fontSize: 11, color: 'var(--t-text3)', lineHeight: 1.5 }}>
                                        यो परियोजनामा काम गर्ने इन्जिनियर, म्यानेजर, र अन्य प्राविधिक कर्मचारीहरूको विवरण र अधिकार (Permissions) राख्ने ठाउँ हो।
                                    </p>
                                </div>
                                <div>
                                    <div style={{ fontSize: 12, fontWeight: 900, color: '#3b82f6', marginBottom: 4 }}>❓ किन प्रयोग गर्ने? (Why use it?)</div>
                                    <p style={{ margin: 0, fontSize: 11, color: 'var(--t-text3)', lineHeight: 1.5 }}>
                                        कसले कुन काम हेर्ने भन्ने स्पष्ट पार्न, बजेटको सुरक्षा गर्न र कामको जिम्मेवारी तोक्न यसको प्रयोग गरिन्छ। यसले काममा हुने अलमल घटाउँछ।
                                    </p>
                                </div>
                            </div>

                            {/* When & Who */}
                            <div style={{ background: '#fff', padding: 20, borderRadius: 16, border: '1px solid var(--t-border)' }}>
                                <div style={{ marginBottom: 16 }}>
                                    <div style={{ fontSize: 12, fontWeight: 900, color: '#22c55e', marginBottom: 4 }}>⏰ कहिले प्रयोग गर्ने? (When to use it?)</div>
                                    <p style={{ margin: 0, fontSize: 11, color: 'var(--t-text3)', lineHeight: 1.5 }}>
                                        नयाँ परियोजना सुरु गर्दा, नयाँ इन्जिनियर नियुक्त गर्दा, वा कसैको जिम्मेवारी परिवर्तन गर्नुपर्दा यो सेक्सन प्रयोग गर्नुहोस्।
                                    </p>
                                </div>
                                <div>
                                    <div style={{ fontSize: 12, fontWeight: 900, color: '#ef4444', marginBottom: 4 }}>👤 कसले प्रयोग गर्ने? (Who can use it?)</div>
                                    <p style={{ margin: 0, fontSize: 11, color: 'var(--t-text3)', lineHeight: 1.5 }}>
                                        यो अधिकार मात्र 'Super Admin' र परियोजनाको 'Owner' सँग हुन्छ। सामान्य कर्मचारीले अरूको अधिकार परिवर्तन गर्न सक्दैनन्।
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div style={{ marginTop: 20, padding: '12px 16px', background: '#f0f9ff', borderRadius: 12, border: '1px solid #bae6fd' }}>
                            <p style={{ margin: 0, fontSize: 11, color: '#0369a1', fontWeight: 700 }}>
                                💡 सल्लाह: यदि कर्मचारीले बजेट सम्बन्धी काम गर्नु पर्दैन भने, उनीहरूलाई 'View Finance' को अधिकार मात्र दिनुहोस्।
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            )}
        </div>
    );
}
