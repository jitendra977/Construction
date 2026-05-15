/**
 * TeamManagementPage.jsx
 * ──────────────────────
 * Full-page team management hub.
 * - Lists all workforce teams for the active project
 * - Create / edit / delete teams
 * - Add / remove members per team (from workforce members)
 * - Shows auto-teams (created by task assignment) separately
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useConstruction } from '../../context/ConstructionContext';
import workforceService from '../../services/workforceService';

/* ── helpers ────────────────────────────────────────────────────────────── */
const S = (base, extra = {}) => ({ ...base, ...extra });

const TYPE_COLOR = {
    LABOUR:        '#3b82f6',
    STAFF:         '#8b5cf6',
    SUBCONTRACTOR: '#f59e0b',
    FREELANCE:     '#10b981',
};

const pill = (bg, color, label) => (
    <span style={{
        fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 20,
        background: bg, color, border: `1px solid ${color}30`,
        textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0,
    }}>{label}</span>
);

/* ── Modal wrapper ──────────────────────────────────────────────────────── */
function Modal({ title, onClose, children }) {
    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24,
        }} onClick={onClose}>
            <div style={{
                background: 'var(--t-surface)', borderRadius: 16,
                border: '1px solid var(--t-border)',
                width: '100%', maxWidth: 560,
                boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
                maxHeight: '90vh', display: 'flex', flexDirection: 'column',
            }} onClick={e => e.stopPropagation()}>
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '16px 20px', borderBottom: '1px solid var(--t-border)',
                }}>
                    <span style={{ fontSize: 14, fontWeight: 900, color: 'var(--t-text)' }}>{title}</span>
                    <button onClick={onClose} style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--t-text3)', fontSize: 18, lineHeight: 1,
                    }}>✕</button>
                </div>
                <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
                    {children}
                </div>
            </div>
        </div>
    );
}

/* ── TeamForm ───────────────────────────────────────────────────────────── */
function TeamForm({ team, projectId, members, onDone, onCancel }) {
    const isEdit = !!team?.id;
    const [form, setForm] = useState({
        name:        team?.name        || '',
        description: team?.description || '',
        leader:      team?.leader      || '',
        is_active:   team?.is_active   ?? true,
    });
    const [saving, setSaving] = useState(false);
    const [error,  setError]  = useState('');

    const inp = {
        width: '100%', padding: '8px 10px', borderRadius: 8, fontSize: 12,
        border: '1px solid var(--t-border)', background: 'var(--t-surface2)',
        color: 'var(--t-text)', outline: 'none', boxSizing: 'border-box',
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) { setError('Team name is required.'); return; }
        setSaving(true); setError('');
        try {
            const data = { ...form, project: projectId, leader: form.leader || null };
            if (isEdit) {
                await workforceService.updateTeam(team.id, data);
            } else {
                await workforceService.createTeam(data);
            }
            onDone();
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to save team.');
        } finally { setSaving(false); }
    };

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {error && (
                <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontSize: 11, fontWeight: 700 }}>
                    {error}
                </div>
            )}

            <div>
                <label style={{ fontSize: 9, fontWeight: 800, color: 'var(--t-text3)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>Team Name *</label>
                <input style={inp} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Civil Team, MEP Crew…" required />
            </div>

            <div>
                <label style={{ fontSize: 9, fontWeight: 800, color: 'var(--t-text3)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>Description</label>
                <textarea style={{ ...inp, resize: 'vertical', minHeight: 60 }}
                    value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Optional description…" />
            </div>

            <div>
                <label style={{ fontSize: 9, fontWeight: 800, color: 'var(--t-text3)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>Team Leader</label>
                <select style={inp} value={form.leader || ''} onChange={e => setForm(f => ({ ...f, leader: e.target.value || '' }))}>
                    <option value="">No leader assigned</option>
                    {members.map(m => (
                        <option key={m.id} value={m.id}>{m.full_name || m.name} · {m.employee_id}</option>
                    ))}
                </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" id="is_active" checked={form.is_active}
                    onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                    style={{ width: 14, height: 14, cursor: 'pointer' }} />
                <label htmlFor="is_active" style={{ fontSize: 12, fontWeight: 700, color: 'var(--t-text)', cursor: 'pointer' }}>Active team</label>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button type="button" onClick={onCancel} style={{
                    padding: '8px 18px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                    background: 'var(--t-surface2)', color: 'var(--t-text)',
                    border: '1px solid var(--t-border)', cursor: 'pointer',
                }}>Cancel</button>
                <button type="submit" disabled={saving} style={{
                    padding: '8px 20px', borderRadius: 8, fontSize: 12, fontWeight: 800,
                    background: '#8b5cf6', color: '#fff', border: 'none', cursor: 'pointer',
                    opacity: saving ? 0.6 : 1,
                }}>{saving ? 'Saving…' : isEdit ? 'Update Team' : 'Create Team'}</button>
            </div>
        </form>
    );
}

/* ── ManageMembersModal ─────────────────────────────────────────────────── */
function ManageMembersModal({ team, projectMembers, onClose, onRefresh }) {
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');
    const currentIds = new Set((team.members || []).map(m => String(m.id || m)));

    const filtered = projectMembers.filter(m => {
        const name = (m.full_name || m.name || '').toLowerCase();
        const q = search.toLowerCase();
        return !q || name.includes(q) || (m.employee_id || '').toLowerCase().includes(q);
    });

    const toggle = async (memberId) => {
        setSaving(true);
        try {
            if (currentIds.has(String(memberId))) {
                await workforceService.removeTeamMembers(team.id, [memberId]);
            } else {
                await workforceService.addTeamMembers(team.id, [memberId]);
            }
            await onRefresh();
        } catch { alert('Failed to update members.'); }
        finally { setSaving(false); }
    };

    return (
        <Modal title={`Manage Members — ${team.name}`} onClose={onClose}>
            <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search workers…"
                style={{
                    width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 12,
                    border: '1px solid var(--t-border)', background: 'var(--t-surface2)',
                    color: 'var(--t-text)', outline: 'none', boxSizing: 'border-box', marginBottom: 12,
                }}
            />

            {filtered.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--t-text3)', fontSize: 12, padding: '24px 0' }}>
                    No workers found
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {filtered.map(m => {
                        const isMember = currentIds.has(String(m.id));
                        return (
                            <div key={m.id} style={{
                                display: 'flex', alignItems: 'center', gap: 12,
                                padding: '10px 12px', borderRadius: 10,
                                background: isMember ? 'rgba(139,92,246,0.06)' : 'var(--t-surface2)',
                                border: `1px solid ${isMember ? 'rgba(139,92,246,0.25)' : 'var(--t-border)'}`,
                                cursor: saving ? 'not-allowed' : 'pointer',
                                transition: 'all 0.15s',
                            }} onClick={() => !saving && toggle(m.id)}>
                                {/* Avatar */}
                                <div style={{
                                    width: 34, height: 34, borderRadius: '50%',
                                    background: isMember ? 'rgba(139,92,246,0.15)' : 'var(--t-surface)',
                                    border: `1px solid ${isMember ? 'rgba(139,92,246,0.3)' : 'var(--t-border)'}`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 13, fontWeight: 900, color: isMember ? '#8b5cf6' : 'var(--t-text3)',
                                    flexShrink: 0,
                                }}>
                                    {(m.full_name || m.name || '?')[0].toUpperCase()}
                                </div>

                                {/* Info */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {m.full_name || m.name}
                                    </div>
                                    <div style={{ fontSize: 10, color: 'var(--t-text3)' }}>
                                        {m.employee_id} · {m.worker_type || 'LABOUR'}
                                    </div>
                                </div>

                                {/* Toggle indicator */}
                                <div style={{
                                    width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                                    background: isMember ? '#8b5cf6' : 'var(--t-surface)',
                                    border: `2px solid ${isMember ? '#8b5cf6' : 'var(--t-border)'}`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 11, color: '#fff', fontWeight: 900,
                                }}>
                                    {isMember ? '✓' : ''}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <div style={{ marginTop: 16, textAlign: 'right', color: 'var(--t-text3)', fontSize: 11, fontWeight: 700 }}>
                {(team.members || []).length} member{(team.members || []).length !== 1 ? 's' : ''} in this team
            </div>
        </Modal>
    );
}

/* ── TeamCard ───────────────────────────────────────────────────────────── */
function TeamCard({ team, onEdit, onManageMembers, onDelete, isAuto }) {
    const members      = team.members_detail || team.members || [];
    const memberCount  = team.member_count ?? members.length;
    const leaderName   = team.leader_name || null;

    return (
        <div style={{
            background: 'var(--t-surface)',
            border: `1px solid ${isAuto ? 'rgba(139,92,246,0.3)' : 'var(--t-border)'}`,
            borderRadius: 14, overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        }}>
            {/* Header bar */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
                background: isAuto ? 'rgba(139,92,246,0.05)' : 'var(--t-surface2)',
                borderBottom: '1px solid var(--t-border)',
            }}>
                {/* Avatar */}
                <div style={{
                    width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                    background: isAuto ? 'rgba(139,92,246,0.12)' : 'rgba(59,130,246,0.1)',
                    border: `1px solid ${isAuto ? 'rgba(139,92,246,0.25)' : 'rgba(59,130,246,0.2)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, fontWeight: 900, color: isAuto ? '#8b5cf6' : '#3b82f6',
                }}>
                    {isAuto ? '⚙' : (team.name[0] || '?').toUpperCase()}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, fontWeight: 900, color: 'var(--t-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {team.name}
                        </span>
                        {isAuto && pill('rgba(139,92,246,0.12)', '#8b5cf6', 'Auto-Team')}
                        {!team.is_active && pill('rgba(107,114,128,0.1)', '#6b7280', 'Inactive')}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--t-text3)', marginTop: 2 }}>
                        {leaderName ? `👑 ${leaderName}` : 'No leader'} · {memberCount} member{memberCount !== 1 ? 's' : ''}
                    </div>
                </div>

                {/* Actions */}
                {!isAuto && (
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <button onClick={() => onManageMembers(team)} style={{
                            padding: '5px 11px', borderRadius: 7, fontSize: 10, fontWeight: 800,
                            background: 'rgba(139,92,246,0.1)', color: '#8b5cf6',
                            border: '1px solid rgba(139,92,246,0.25)', cursor: 'pointer',
                        }}>👥 Members</button>
                        <button onClick={() => onEdit(team)} style={{
                            padding: '5px 11px', borderRadius: 7, fontSize: 10, fontWeight: 800,
                            background: 'rgba(249,115,22,0.1)', color: '#f97316',
                            border: '1px solid rgba(249,115,22,0.25)', cursor: 'pointer',
                        }}>✏️</button>
                        <button onClick={() => onDelete(team)} style={{
                            padding: '5px 9px', borderRadius: 7, fontSize: 10, fontWeight: 800,
                            background: 'rgba(239,68,68,0.08)', color: '#ef4444',
                            border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer',
                        }}>🗑</button>
                    </div>
                )}
            </div>

            {/* Member chips */}
            {members.length > 0 ? (
                <div style={{ padding: '10px 16px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {members.slice(0, 12).map(m => {
                        const name     = m.full_name || m.name || m.employee_id || String(m);
                        const typeColor = TYPE_COLOR[m.worker_type] || '#6b7280';
                        return (
                            <div key={m.id || m} style={{
                                display: 'flex', alignItems: 'center', gap: 5,
                                padding: '4px 9px', borderRadius: 20,
                                background: 'var(--t-surface2)',
                                border: '1px solid var(--t-border)',
                                fontSize: 10, fontWeight: 700, color: 'var(--t-text)',
                            }}>
                                <span style={{
                                    width: 16, height: 16, borderRadius: '50%',
                                    background: typeColor + '22', color: typeColor,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 9, fontWeight: 900, flexShrink: 0,
                                }}>
                                    {name[0]?.toUpperCase()}
                                </span>
                                {name}
                            </div>
                        );
                    })}
                    {members.length > 12 && (
                        <div style={{
                            padding: '4px 9px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                            color: 'var(--t-text3)', background: 'var(--t-surface2)',
                            border: '1px solid var(--t-border)',
                        }}>+{members.length - 12} more</div>
                    )}
                </div>
            ) : (
                <div style={{ padding: '10px 16px', fontSize: 11, color: 'var(--t-text3)', fontStyle: 'italic' }}>
                    No members yet — click Members to add
                </div>
            )}

            {/* Description */}
            {team.description && !team.description.startsWith('auto:task:') && (
                <div style={{
                    padding: '0 16px 12px', fontSize: 11, color: 'var(--t-text3)',
                    borderTop: '1px solid var(--t-border)', paddingTop: 8,
                }}>
                    {team.description}
                </div>
            )}
        </div>
    );
}

/* ── Main Page ──────────────────────────────────────────────────────────── */
export default function TeamManagementPage() {
    const { activeProjectId, dashboardData } = useConstruction();

    const [teams,          setTeams]          = useState([]);
    const [allMembers,     setAllMembers]     = useState([]);
    const [loading,        setLoading]        = useState(true);
    const [showForm,       setShowForm]       = useState(false);
    const [editingTeam,    setEditingTeam]    = useState(null);
    const [managingTeam,   setManagingTeam]   = useState(null);
    const [search,         setSearch]         = useState('');
    const [filterActive,   setFilterActive]   = useState('all'); // all | active | inactive

    const projectId = activeProjectId
        || (dashboardData.project?.id)
        || (dashboardData.projects?.[0]?.id);

    const load = useCallback(async () => {
        if (!projectId) return;
        setLoading(true);
        try {
            const [tData, mData] = await Promise.all([
                workforceService.getTeams({ project: projectId }),
                workforceService.getProjectWorkers(projectId, { page_size: 500 }),
            ]);
            setTeams(Array.isArray(tData) ? tData : (tData.results || []));
            setAllMembers(Array.isArray(mData) ? mData : (mData.results || []));
        } catch { /* silent */ }
        finally { setLoading(false); }
    }, [projectId]);

    useEffect(() => { load(); }, [load]);

    // ── filtering ──────────────────────────────────────────────────────────
    const autoTeams   = teams.filter(t => t.description?.startsWith('auto:task:'));
    const manualTeams = teams.filter(t => !t.description?.startsWith('auto:task:'));

    const filteredManual = manualTeams.filter(t => {
        const q = search.toLowerCase();
        if (q && !t.name.toLowerCase().includes(q) && !(t.leader_name || '').toLowerCase().includes(q)) return false;
        if (filterActive === 'active'   && !t.is_active) return false;
        if (filterActive === 'inactive' &&  t.is_active) return false;
        return true;
    });

    const handleDelete = async (team) => {
        if (!window.confirm(`Delete team "${team.name}"? This cannot be undone.`)) return;
        try {
            await workforceService.deleteTeam(team.id);
            await load();
        } catch { alert('Failed to delete team.'); }
    };

    const handleFormDone = async () => {
        setShowForm(false);
        setEditingTeam(null);
        await load();
    };

    const handleMembersRefresh = async () => {
        const tData = await workforceService.getTeams({ project: projectId });
        const updated = (Array.isArray(tData) ? tData : (tData.results || []));
        setTeams(updated);
        // Refresh managingTeam with latest data
        if (managingTeam) {
            const refreshed = updated.find(t => t.id === managingTeam.id);
            if (refreshed) setManagingTeam(refreshed);
        }
    };

    // ── summary stats ──────────────────────────────────────────────────────
    const totalWorkers  = allMembers.length;
    const teamsWithAll  = manualTeams.length;
    const membersInTeam = new Set(
        manualTeams.flatMap(t => (t.members_detail || t.members || []).map(m => String(m.id || m)))
    ).size;

    return (
        <div style={{ minHeight: '100vh', background: 'var(--t-bg)', color: 'var(--t-text)' }}>
            {/* ── Page header ─────────────────────────────────────────────── */}
            <div style={{
                padding: '20px 28px 16px',
                background: 'var(--t-surface)',
                borderBottom: '1px solid var(--t-border)',
                position: 'sticky', top: 0, zIndex: 30,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1 }}>
                        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: 'var(--t-text)' }}>
                            👥 Team Management
                        </h1>
                        <div style={{ fontSize: 11, color: 'var(--t-text3)', marginTop: 3 }}>
                            Organise workforce into named teams for projects and tasks
                        </div>
                    </div>
                    <button onClick={() => { setEditingTeam(null); setShowForm(true); }} style={{
                        padding: '9px 18px', borderRadius: 9, fontSize: 12, fontWeight: 800,
                        background: '#8b5cf6', color: '#fff', border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 6,
                    }}>+ New Team</button>
                </div>

                {/* Stats row */}
                <div style={{ display: 'flex', gap: 20, marginTop: 14, flexWrap: 'wrap' }}>
                    {[
                        { label: 'Manual Teams',     value: teamsWithAll,   color: '#8b5cf6' },
                        { label: 'Auto Task Teams',  value: autoTeams.length, color: '#f59e0b' },
                        { label: 'Total Workers',    value: totalWorkers,   color: '#3b82f6' },
                        { label: 'Assigned to Teams',value: membersInTeam,  color: '#10b981' },
                        { label: 'Unassigned',       value: Math.max(0, totalWorkers - membersInTeam), color: '#6b7280' },
                    ].map(s => (
                        <div key={s.label} style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: 20, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</span>
                            <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--t-text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>{s.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div style={{ padding: '20px 28px' }}>

                {/* ── Filter / Search bar ─────────────────────────────────── */}
                <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
                    <input value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search teams or leaders…"
                        style={{
                            flex: 1, minWidth: 180, padding: '8px 12px', borderRadius: 8, fontSize: 12,
                            border: '1px solid var(--t-border)', background: 'var(--t-surface)',
                            color: 'var(--t-text)', outline: 'none',
                        }} />
                    {['all', 'active', 'inactive'].map(v => (
                        <button key={v} onClick={() => setFilterActive(v)} style={{
                            padding: '7px 14px', borderRadius: 8, fontSize: 11, fontWeight: 800,
                            cursor: 'pointer', textTransform: 'capitalize',
                            background: filterActive === v ? '#8b5cf6' : 'var(--t-surface)',
                            color:      filterActive === v ? '#fff'    : 'var(--t-text3)',
                            border: `1px solid ${filterActive === v ? '#8b5cf6' : 'var(--t-border)'}`,
                        }}>{v}</button>
                    ))}
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: 60, color: 'var(--t-text3)', fontSize: 13 }}>
                        Loading teams…
                    </div>
                ) : (
                    <>
                        {/* ── Manual teams ─────────────────────────────────── */}
                        <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 10, fontWeight: 900, color: 'var(--t-text3)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                                Project Teams
                            </span>
                            <span style={{ fontSize: 10, color: 'var(--t-text3)' }}>({filteredManual.length})</span>
                        </div>

                        {filteredManual.length === 0 ? (
                            <div style={{
                                padding: '40px 24px', textAlign: 'center',
                                border: '1px dashed var(--t-border)', borderRadius: 14,
                                color: 'var(--t-text3)', marginBottom: 24,
                            }}>
                                <div style={{ fontSize: 36, marginBottom: 10 }}>👥</div>
                                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--t-text)', marginBottom: 4 }}>No teams yet</div>
                                <div style={{ fontSize: 11 }}>Click <strong>+ New Team</strong> to create your first project team.</div>
                            </div>
                        ) : (
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
                                gap: 14, marginBottom: 28,
                            }}>
                                {filteredManual.map(t => (
                                    <TeamCard
                                        key={t.id} team={t} isAuto={false}
                                        onEdit={team => { setEditingTeam(team); setShowForm(true); }}
                                        onManageMembers={team => setManagingTeam(team)}
                                        onDelete={handleDelete}
                                    />
                                ))}
                            </div>
                        )}

                        {/* ── Auto-teams (read-only) ────────────────────────── */}
                        {autoTeams.length > 0 && (
                            <>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                                    <span style={{ fontSize: 10, fontWeight: 900, color: 'var(--t-text3)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                                        Auto Task Teams
                                    </span>
                                    <span style={{ fontSize: 10, color: 'var(--t-text3)' }}>({autoTeams.length})</span>
                                    <span style={{
                                        fontSize: 9, padding: '2px 7px', borderRadius: 6, fontWeight: 800,
                                        background: 'rgba(245,158,11,0.1)', color: '#f59e0b',
                                        border: '1px solid rgba(245,158,11,0.25)',
                                    }}>Auto-created when 2+ workers share a task</span>
                                </div>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
                                    gap: 14,
                                }}>
                                    {autoTeams.map(t => (
                                        <TeamCard key={t.id} team={t} isAuto={true}
                                            onEdit={() => {}} onManageMembers={() => {}} onDelete={() => {}}
                                        />
                                    ))}
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>

            {/* ── Create / Edit modal ──────────────────────────────────────── */}
            {showForm && (
                <Modal
                    title={editingTeam ? `Edit Team — ${editingTeam.name}` : 'Create New Team'}
                    onClose={() => { setShowForm(false); setEditingTeam(null); }}
                >
                    <TeamForm
                        team={editingTeam}
                        projectId={projectId}
                        members={allMembers}
                        onDone={handleFormDone}
                        onCancel={() => { setShowForm(false); setEditingTeam(null); }}
                    />
                </Modal>
            )}

            {/* ── Manage members modal ─────────────────────────────────────── */}
            {managingTeam && (
                <ManageMembersModal
                    team={managingTeam}
                    projectMembers={allMembers}
                    onClose={() => setManagingTeam(null)}
                    onRefresh={handleMembersRefresh}
                />
            )}
        </div>
    );
}
