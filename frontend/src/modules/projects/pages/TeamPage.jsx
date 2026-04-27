/**
 * TeamPage — Project team management with role assignment & permission control.
 *
 * Features:
 *  • Shows current user's role + permission summary at the top
 *  • Lists all members grouped by role with permission chips
 *  • OWNER / MANAGER: can add members, edit roles, toggle individual permissions,
 *    reset to role defaults, and remove members
 *  • Add-member panel shows a live permission preview based on selected role
 */
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import api from '../services/projectsApi';
import TeamMemberRow, { ROLE_CONFIG, ROLES, PERM_META } from '../components/team/TeamMemberRow';

// ── Role-default permission matrix (mirrors backend) ─────────────────────────
const ROLE_DEFAULTS = {
    OWNER:      { can_manage_members:true,  can_manage_finances:true,  can_view_finances:true,  can_manage_phases:true,  can_manage_structure:true,  can_manage_resources:true,  can_upload_media:true  },
    MANAGER:    { can_manage_members:true,  can_manage_finances:true,  can_view_finances:true,  can_manage_phases:true,  can_manage_structure:true,  can_manage_resources:true,  can_upload_media:true  },
    ENGINEER:   { can_manage_members:false, can_manage_finances:false, can_view_finances:true,  can_manage_phases:true,  can_manage_structure:true,  can_manage_resources:false, can_upload_media:true  },
    SUPERVISOR: { can_manage_members:false, can_manage_finances:false, can_view_finances:true,  can_manage_phases:true,  can_manage_structure:false, can_manage_resources:false, can_upload_media:true  },
    CONTRACTOR: { can_manage_members:false, can_manage_finances:false, can_view_finances:false, can_manage_phases:false, can_manage_structure:false, can_manage_resources:true,  can_upload_media:true  },
    VIEWER:     { can_manage_members:false, can_manage_finances:false, can_view_finances:true,  can_manage_phases:false, can_manage_structure:false, can_manage_resources:false, can_upload_media:false },
};

const FIELD_STYLE = {
    width: '100%', padding: '8px 12px', borderRadius: 9,
    border: '1px solid var(--t-border)', background: 'var(--t-bg)',
    color: 'var(--t-text)', fontSize: 13, outline: 'none', boxSizing: 'border-box',
};

// ── My-Role banner ────────────────────────────────────────────────────────────
function MyRoleBanner({ myRole }) {
    if (!myRole) return null;
    const cfg = ROLE_CONFIG[myRole.role] || ROLE_CONFIG.VIEWER;
    const grantedPerms = PERM_META.filter(p => myRole[p.key]);

    return (
        <div style={{
            marginBottom: 20, padding: '14px 18px', borderRadius: 14,
            background: `${cfg.color}0a`,
            border: `1px solid ${cfg.color}30`,
            display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap',
        }}>
            <div style={{
                width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, background: `${cfg.color}18`,
                border: `1px solid ${cfg.color}30`,
            }}>
                {cfg.emoji}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 800, color: 'var(--t-text)' }}>
                    Your role on this project:&nbsp;
                    <span style={{ color: cfg.color }}>{cfg.label}</span>
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {grantedPerms.length === 0
                        ? <span style={{ fontSize: 10, color: 'var(--t-text3)' }}>Read-only access</span>
                        : grantedPerms.map(({ key, icon, label }) => (
                            <span key={key} style={{
                                fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 6,
                                background: 'rgba(16,185,129,0.1)', color: '#10b981',
                                border: '1px solid rgba(16,185,129,0.25)',
                                textTransform: 'uppercase', letterSpacing: '0.04em',
                            }}>
                                {icon} {label}
                            </span>
                        ))
                    }
                </div>
            </div>
        </div>
    );
}

// ── Add-member form ───────────────────────────────────────────────────────────
function AddMemberForm({ availableUsers, onAdded, onCancel, projectId }) {
    const [form,     setForm]     = useState({ user: '', role: 'ENGINEER', note: '' });
    const [perms,    setPerms]    = useState({ ...ROLE_DEFAULTS.ENGINEER });
    const [adding,   setAdding]   = useState(false);
    const [err,      setErr]      = useState('');

    const handleRoleChange = (role) => {
        setForm(f => ({ ...f, role }));
        setPerms({ ...ROLE_DEFAULTS[role] });
    };

    const togglePerm = (key) => setPerms(p => ({ ...p, [key]: !p[key] }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.user) { setErr('Please select a user.'); return; }
        setAdding(true); setErr('');
        try {
            const res = await api.addMember({
                project: projectId,
                user:    +form.user,
                role:    form.role,
                note:    form.note,
                ...perms,
            });
            onAdded(res.data);
        } catch (ex) {
            setErr(ex.response?.data?.detail || 'Could not add member — they may already be on this project.');
        } finally {
            setAdding(false);
        }
    };

    const roleCfg = ROLE_CONFIG[form.role] || ROLE_CONFIG.VIEWER;

    return (
        <form onSubmit={handleSubmit} style={{
            marginBottom: 24, padding: '20px', borderRadius: 16,
            background: 'var(--t-surface)',
            border: '2px dashed var(--t-border)',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <span style={{ fontSize: 18 }}>➕</span>
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 900, color: 'var(--t-text)' }}>
                    Add Team Member
                </h3>
            </div>

            {err && (
                <div style={{
                    marginBottom: 12, padding: '10px 14px', borderRadius: 10,
                    background: 'rgba(239,68,68,0.08)', color: '#ef4444',
                    border: '1px solid rgba(239,68,68,0.3)', fontSize: 12, fontWeight: 600,
                }}>
                    ⚠️ {err}
                </div>
            )}

            {/* User + Role row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                    <p style={{ margin: '0 0 5px', fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--t-text3)' }}>User *</p>
                    <select value={form.user} onChange={e => setForm(f => ({ ...f, user: e.target.value }))} style={FIELD_STYLE}>
                        <option value="">— Select user —</option>
                        {availableUsers.map(u => (
                            <option key={u.id} value={u.id}>
                                {u.username}{u.first_name ? ` · ${u.first_name} ${u.last_name}` : ''}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <p style={{ margin: '0 0 5px', fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--t-text3)' }}>Role *</p>
                    <select value={form.role} onChange={e => handleRoleChange(e.target.value)} style={FIELD_STYLE}>
                        {ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                </div>
            </div>

            {/* Note */}
            <div style={{ marginBottom: 16 }}>
                <p style={{ margin: '0 0 5px', fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--t-text3)' }}>Note (optional)</p>
                <input
                    value={form.note}
                    onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                    placeholder="e.g. Lead civil engineer, Ground floor supervisor"
                    style={FIELD_STYLE}
                />
            </div>

            {/* Permission matrix */}
            <div style={{ marginBottom: 16 }}>
                <p style={{ margin: '0 0 8px', fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--t-text3)' }}>
                    🔐 Permissions&nbsp;
                    <span style={{ textTransform: 'none', fontWeight: 600, color: `${roleCfg.color}` }}>
                        — defaults for {roleCfg.label}
                    </span>
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 6 }}>
                    {PERM_META.map(({ key, icon, label }) => {
                        const active = perms[key];
                        return (
                            <button
                                key={key}
                                type="button"
                                onClick={() => togglePerm(key)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    padding: '8px 10px', borderRadius: 8, textAlign: 'left',
                                    border: `1px solid ${active ? 'rgba(16,185,129,0.4)' : 'var(--t-border)'}`,
                                    background: active ? 'rgba(16,185,129,0.08)' : 'var(--t-bg)',
                                    cursor: 'pointer',
                                }}>
                                <span style={{ fontSize: 14 }}>{icon}</span>
                                <div>
                                    <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: active ? '#10b981' : 'var(--t-text3)' }}>{label}</p>
                                    <p style={{ margin: 0, fontSize: 9, color: active ? '#10b981' : '#9ca3af', fontWeight: 600 }}>{active ? 'Allowed' : 'Denied'}</p>
                                </div>
                                <div style={{ marginLeft: 'auto' }}>
                                    <div style={{
                                        width: 28, height: 16, borderRadius: 8, position: 'relative',
                                        background: active ? '#10b981' : 'var(--t-border)', transition: 'background 0.2s',
                                    }}>
                                        <div style={{
                                            position: 'absolute', top: 2,
                                            left: active ? 14 : 2,
                                            width: 12, height: 12, borderRadius: '50%',
                                            background: '#fff', transition: 'left 0.2s',
                                        }} />
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" disabled={adding} style={{
                    padding: '9px 22px', borderRadius: 10, fontSize: 13, fontWeight: 800,
                    background: adding ? '#9ca3af' : '#f97316', color: '#fff',
                    border: 'none', cursor: adding ? 'not-allowed' : 'pointer',
                }}>
                    {adding ? 'Adding…' : '+ Add to Team'}
                </button>
                <button type="button" onClick={onCancel} style={{
                    padding: '9px 16px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                    border: '1px solid var(--t-border)', background: 'var(--t-bg)',
                    color: 'var(--t-text3)', cursor: 'pointer',
                }}>
                    Cancel
                </button>
            </div>
        </form>
    );
}

// ── Main TeamPage ─────────────────────────────────────────────────────────────
export default function TeamPage() {
    const { id }      = useParams();
    const { project } = useOutletContext() || {};
    const projectId   = project?.id || id;

    const [members,  setMembers]  = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [myRole,   setMyRole]   = useState(null);
    const [loading,  setLoading]  = useState(true);
    const [showAdd,  setShowAdd]  = useState(false);
    const [search,   setSearch]   = useState('');

    const canManage = myRole?.can_manage_members === true;

    const load = useCallback(() => {
        if (!projectId) return;
        Promise.all([
            api.listMembers(projectId),
            api.listUsers(),
            api.getMyRole(projectId).catch(() => null),
        ]).then(([mRes, uRes, rRes]) => {
            setMembers(mRes.data);
            setAllUsers(uRes.data);
            setMyRole(rRes?.data || null);
        }).catch(console.error)
          .finally(() => setLoading(false));
    }, [projectId]);

    useEffect(() => { load(); }, [load]);

    const availableUsers = allUsers.filter(u => !members.find(m => m.user === u.id));

    const handleAdded   = (m) => { setMembers(prev => [...prev, m]); setShowAdd(false); };
    const handleUpdated = (m) => setMembers(prev => prev.map(x => x.id === m.id ? m : x));
    const handleRemoved = (id) => setMembers(prev => prev.filter(m => m.id !== id));

    // Search filter
    const filteredMembers = members.filter(m =>
        !search ||
        (m.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (m.email     || '').toLowerCase().includes(search.toLowerCase()) ||
        (m.username  || '').toLowerCase().includes(search.toLowerCase()) ||
        (m.role      || '').toLowerCase().includes(search.toLowerCase())
    );

    // Group by role order
    const grouped = ROLES.reduce((acc, [role]) => {
        const grp = filteredMembers.filter(m => m.role === role);
        if (grp.length) acc.push({ role, members: grp });
        return acc;
    }, []);

    // Stats
    const totalPerms = members.reduce((sum, m) => {
        return sum + PERM_META.filter(p => m[p.key]).length;
    }, 0);

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 320 }}>
            <div style={{ fontSize: 40, opacity: 0.4 }} className="animate-pulse">👥</div>
        </div>
    );

    return (
        <div style={{ padding: '20px 24px', maxWidth: 820, margin: '0 auto' }}>

            {/* ── Header ── */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
                <div>
                    <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 900, color: 'var(--t-text)' }}>
                        👥 Project Team
                    </h2>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--t-text3)' }}>
                        {members.length} member{members.length !== 1 ? 's' : ''}
                        {members.length > 0 && ` · ${totalPerms} total permissions granted`}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {/* Search */}
                    <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, opacity: 0.35, pointerEvents: 'none' }}>🔍</span>
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search members…"
                            style={{
                                paddingLeft: 30, paddingRight: search ? 28 : 12,
                                paddingTop: 7, paddingBottom: 7,
                                borderRadius: 9, fontSize: 12, fontWeight: 600,
                                border: '1px solid var(--t-border)',
                                background: 'var(--t-bg)', color: 'var(--t-text)', outline: 'none', width: 180,
                            }}
                        />
                        {search && (
                            <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--t-text3)', padding: 0 }}>✕</button>
                        )}
                    </div>
                    {canManage && (
                        <button
                            onClick={() => setShowAdd(s => !s)}
                            style={{
                                padding: '8px 16px', borderRadius: 10, fontSize: 12, fontWeight: 800,
                                background: showAdd ? 'var(--t-surface2)' : '#f97316',
                                color: showAdd ? 'var(--t-text)' : '#fff',
                                border: showAdd ? '1px solid var(--t-border)' : 'none',
                                cursor: 'pointer',
                            }}>
                            {showAdd ? '✕ Cancel' : '+ Add Member'}
                        </button>
                    )}
                </div>
            </div>

            {/* ── My role banner ── */}
            <MyRoleBanner myRole={myRole} />

            {/* ── Add member form ── */}
            {showAdd && canManage && (
                <AddMemberForm
                    availableUsers={availableUsers}
                    projectId={projectId}
                    onAdded={handleAdded}
                    onCancel={() => setShowAdd(false)}
                />
            )}

            {/* ── Empty state ── */}
            {members.length === 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 0', textAlign: 'center' }}>
                    <p style={{ fontSize: 52, marginBottom: 12 }}>👥</p>
                    <p style={{ fontWeight: 700, fontSize: 16, margin: '0 0 6px', color: 'var(--t-text)' }}>No team members yet</p>
                    <p style={{ fontSize: 13, color: 'var(--t-text3)' }}>Add people to collaborate on this project.</p>
                </div>
            )}

            {/* ── Permission legend ── */}
            {members.length > 0 && (
                <div style={{
                    marginBottom: 20, padding: '10px 14px', borderRadius: 10,
                    background: 'var(--t-surface)', border: '1px solid var(--t-border)',
                    display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center',
                }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--t-text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginRight: 4 }}>Permissions:</span>
                    {PERM_META.map(({ key, icon, label }) => (
                        <span key={key} style={{ fontSize: 9, color: 'var(--t-text3)', display: 'flex', alignItems: 'center', gap: 3 }}>
                            {icon} {label}
                        </span>
                    ))}
                    <span style={{ fontSize: 9, color: '#10b981', marginLeft: 4 }}>● Allowed</span>
                    <span style={{ fontSize: 9, color: '#9ca3af' }}>● Denied</span>
                </div>
            )}

            {/* ── Role groups ── */}
            {grouped.map(({ role, members: grp }) => {
                const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.VIEWER;
                return (
                    <div key={role} style={{ marginBottom: 20 }}>
                        {/* Group header */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <div style={{
                                width: 22, height: 22, borderRadius: 6,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 13, background: `${cfg.color}18`,
                                border: `1px solid ${cfg.color}30`,
                            }}>
                                {cfg.emoji}
                            </div>
                            <p style={{ margin: 0, fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: cfg.color }}>
                                {cfg.label}
                            </p>
                            <span style={{
                                fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 4,
                                background: `${cfg.color}14`, color: cfg.color,
                            }}>
                                {grp.length}
                            </span>
                        </div>

                        {/* Member cards */}
                        <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--t-border)', background: 'var(--t-surface)' }}>
                            {grp.map((member) => (
                                <TeamMemberRow
                                    key={member.id}
                                    member={member}
                                    canManage={canManage}
                                    onUpdated={handleUpdated}
                                    onRemoved={handleRemoved}
                                />
                            ))}
                        </div>
                    </div>
                );
            })}

            {/* ── No results for search ── */}
            {members.length > 0 && filteredMembers.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--t-text3)', fontSize: 13 }}>
                    No members match "{search}"
                </div>
            )}
        </div>
    );
}
