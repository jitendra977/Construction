/**
 * TeamMemberRow — single team member card with role badge, permission chips,
 * and inline editing for managers.
 */
import React, { useState } from 'react';
import api from '../../services/projectsApi';

// ── constants ─────────────────────────────────────────────────────────────────
export const ROLE_CONFIG = {
    OWNER:      { emoji: '👑', color: '#f97316', label: 'Owner' },
    MANAGER:    { emoji: '🧑‍💼', color: '#3b82f6', label: 'Manager' },
    ENGINEER:   { emoji: '🔧', color: '#8b5cf6', label: 'Engineer' },
    SUPERVISOR: { emoji: '🦺', color: '#f59e0b', label: 'Supervisor' },
    CONTRACTOR: { emoji: '🏗️', color: '#6b7280', label: 'Contractor' },
    VIEWER:     { emoji: '👁️',  color: '#9ca3af', label: 'Viewer' },
    SUPER_ADMIN:{ emoji: '⚡', color: '#ef4444', label: 'Super Admin' },
};

export const ROLES = [
    ['OWNER',      '👑 Owner'],
    ['MANAGER',    '🧑‍💼 Manager'],
    ['ENGINEER',   '🔧 Engineer'],
    ['SUPERVISOR', '🦺 Supervisor'],
    ['CONTRACTOR', '🏗️ Contractor'],
    ['VIEWER',     '👁️ Viewer'],
];

export const PERM_META = [
    { key: 'can_manage_members',   icon: '👥', label: 'Manage Team'      },
    { key: 'can_manage_phases',    icon: '📋', label: 'Manage Phases'    },
    { key: 'can_manage_structure', icon: '🏛️', label: 'Manage Structure' },
    { key: 'can_manage_finances',  icon: '💰', label: 'Manage Finance'   },
    { key: 'can_view_finances',    icon: '👁️', label: 'View Finance'     },
    { key: 'can_manage_resources', icon: '🧱', label: 'Manage Resources' },
    { key: 'can_upload_media',     icon: '📸', label: 'Upload Media'     },
];

// ── sub-components ────────────────────────────────────────────────────────────
const PermChip = ({ icon, label, active, onClick, disabled }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        title={label}
        style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '3px 8px', borderRadius: 6, fontSize: 9,
            fontWeight: 800, letterSpacing: '0.04em', cursor: disabled ? 'default' : 'pointer',
            border: `1px solid ${active ? 'rgba(16,185,129,0.35)' : 'rgba(107,114,128,0.2)'}`,
            background: active ? 'rgba(16,185,129,0.1)' : 'rgba(107,114,128,0.06)',
            color: active ? '#10b981' : '#9ca3af',
            transition: 'all 0.15s',
            textTransform: 'uppercase',
        }}
    >
        <span>{icon}</span>
        {label}
    </button>
);

// ── main component ────────────────────────────────────────────────────────────
export default function TeamMemberRow({ member, canManage, onUpdated, onRemoved }) {
    const [editing,    setEditing]    = useState(false);
    const [showPerms,  setShowPerms]  = useState(false);
    const [role,       setRole]       = useState(member.role);
    const [note,       setNote]       = useState(member.note || '');
    const [perms,      setPerms]      = useState({
        can_manage_members:   member.can_manage_members,
        can_manage_finances:  member.can_manage_finances,
        can_view_finances:    member.can_view_finances,
        can_manage_phases:    member.can_manage_phases,
        can_manage_structure: member.can_manage_structure,
        can_manage_resources: member.can_manage_resources,
        can_upload_media:     member.can_upload_media,
    });
    const [saving,     setSaving]     = useState(false);
    const [resetting,  setResetting]  = useState(false);

    const cfg      = ROLE_CONFIG[member.role] || ROLE_CONFIG.VIEWER;
    const initials = (member.full_name || member.username || '?')
        .split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

    const togglePerm = (key) => {
        if (!canManage) return;
        setPerms(p => ({ ...p, [key]: !p[key] }));
    };

    const save = async () => {
        setSaving(true);
        try {
            const res = await api.updateMember(member.id, { role, note, ...perms });
            onUpdated?.(res.data);
            setEditing(false);
            setShowPerms(false);
        } catch (e) { console.error(e); }
        finally { setSaving(false); }
    };

    const resetToDefaults = async () => {
        if (!window.confirm(`Reset ${member.full_name || member.username}'s permissions to role defaults?`)) return;
        setResetting(true);
        try {
            const res = await api.applyRoleDefaults(member.id);
            onUpdated?.(res.data);
            setPerms({
                can_manage_members:   res.data.can_manage_members,
                can_manage_finances:  res.data.can_manage_finances,
                can_view_finances:    res.data.can_view_finances,
                can_manage_phases:    res.data.can_manage_phases,
                can_manage_structure: res.data.can_manage_structure,
                can_manage_resources: res.data.can_manage_resources,
                can_upload_media:     res.data.can_upload_media,
            });
        } catch (e) { console.error(e); }
        finally { setResetting(false); }
    };

    const remove = async () => {
        if (!window.confirm(`Remove ${member.full_name || member.username} from this project?`)) return;
        try {
            await api.removeMember(member.id);
            onRemoved?.(member.id);
        } catch (e) { console.error(e); }
    };

    const cancelEdit = () => {
        setRole(member.role);
        setNote(member.note || '');
        setPerms({
            can_manage_members:   member.can_manage_members,
            can_manage_finances:  member.can_manage_finances,
            can_view_finances:    member.can_view_finances,
            can_manage_phases:    member.can_manage_phases,
            can_manage_structure: member.can_manage_structure,
            can_manage_resources: member.can_manage_resources,
            can_upload_media:     member.can_upload_media,
        });
        setEditing(false);
        setShowPerms(false);
    };

    const inEditMode = editing || showPerms;
    const hasChanges = editing && (
        role !== member.role || note !== (member.note || '') ||
        Object.entries(perms).some(([k, v]) => v !== member[k])
    );

    return (
        <div style={{
            padding: '14px 16px',
            borderTop: '1px solid var(--t-border)',
            background: inEditMode ? 'var(--t-surface2)' : 'transparent',
            transition: 'background 0.15s',
        }}>
            {/* ── Row: avatar + info + action buttons ── */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                {/* Avatar */}
                <div style={{
                    width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 900,
                    background: `${cfg.color}22`, color: cfg.color,
                    border: `2px solid ${cfg.color}40`,
                }}>
                    {initials}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
                        <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--t-text)' }}>
                            {member.full_name || member.username}
                        </span>
                        <span style={{
                            fontSize: 9, fontWeight: 900, padding: '2px 7px', borderRadius: 20,
                            background: `${cfg.color}18`, color: cfg.color,
                            border: `1px solid ${cfg.color}40`,
                            textTransform: 'uppercase', letterSpacing: '0.06em',
                        }}>
                            {cfg.emoji} {member.role_display?.split(' / ')[0] || member.role}
                        </span>
                    </div>
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--t-text3)' }}>
                        {member.email}
                    </p>
                    {!inEditMode && member.note && (
                        <p style={{ margin: '3px 0 0', fontSize: 10, fontStyle: 'italic', color: 'var(--t-text3)' }}>
                            💬 {member.note}
                        </p>
                    )}

                    {/* Permission chips — read mode */}
                    {!inEditMode && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 7 }}>
                            {PERM_META.map(({ key, icon, label }) => (
                                <PermChip key={key} icon={icon} label={label} active={member[key]} disabled />
                            ))}
                        </div>
                    )}
                </div>

                {/* Action buttons — read mode */}
                {!inEditMode && canManage && (
                    <div style={{ display: 'flex', gap: 5, flexShrink: 0, alignItems: 'center' }}>
                        <button
                            onClick={() => { setEditing(true); setShowPerms(true); }}
                            title="Edit member"
                            style={{
                                padding: '5px 10px', borderRadius: 8, fontSize: 10, fontWeight: 700,
                                cursor: 'pointer', border: '1px solid var(--t-border)',
                                background: 'var(--t-bg)', color: 'var(--t-text3)',
                            }}>
                            ✏️ Edit
                        </button>
                        <button
                            onClick={remove}
                            title="Remove member"
                            style={{
                                padding: '5px 10px', borderRadius: 8, fontSize: 10, fontWeight: 700,
                                cursor: 'pointer', border: '1px solid rgba(239,68,68,0.3)',
                                background: 'rgba(239,68,68,0.06)', color: '#ef4444',
                            }}>
                            🗑
                        </button>
                    </div>
                )}
            </div>

            {/* ── Edit panel ── */}
            {inEditMode && (
                <div style={{ marginTop: 14 }}>
                    {/* Role + Note row */}
                    {editing && (
                        <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
                            <div style={{ flex: '1 1 160px' }}>
                                <p style={{ margin: '0 0 5px', fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--t-text3)' }}>Role</p>
                                <select
                                    value={role}
                                    onChange={e => setRole(e.target.value)}
                                    style={{
                                        width: '100%', padding: '7px 10px', borderRadius: 8,
                                        border: '1px solid var(--t-border)', background: 'var(--t-bg)',
                                        color: 'var(--t-text)', fontSize: 12, outline: 'none',
                                    }}>
                                    {ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                                </select>
                            </div>
                            <div style={{ flex: '2 1 200px' }}>
                                <p style={{ margin: '0 0 5px', fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--t-text3)' }}>Note</p>
                                <input
                                    value={note}
                                    onChange={e => setNote(e.target.value)}
                                    placeholder="e.g. Lead civil engineer"
                                    style={{
                                        width: '100%', padding: '7px 10px', borderRadius: 8,
                                        border: '1px solid var(--t-border)', background: 'var(--t-bg)',
                                        color: 'var(--t-text)', fontSize: 12, outline: 'none',
                                        boxSizing: 'border-box',
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Permission matrix */}
                    <div style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                            <p style={{ margin: 0, fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--t-text3)' }}>
                                🔐 Permissions
                            </p>
                            <button
                                onClick={resetToDefaults}
                                disabled={resetting}
                                style={{
                                    fontSize: 9, fontWeight: 800, padding: '3px 8px', borderRadius: 6,
                                    cursor: 'pointer', border: '1px solid var(--t-border)',
                                    background: 'var(--t-bg)', color: 'var(--t-text3)',
                                }}>
                                {resetting ? '…' : '↺ Role Defaults'}
                            </button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 6 }}>
                            {PERM_META.map(({ key, icon, label }) => {
                                const active = perms[key];
                                return (
                                    <button
                                        key={key}
                                        onClick={() => togglePerm(key)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 8,
                                            padding: '8px 10px', borderRadius: 8,
                                            border: `1px solid ${active ? 'rgba(16,185,129,0.4)' : 'var(--t-border)'}`,
                                            background: active ? 'rgba(16,185,129,0.08)' : 'var(--t-bg)',
                                            cursor: 'pointer', textAlign: 'left',
                                        }}>
                                        <span style={{ fontSize: 14 }}>{icon}</span>
                                        <div>
                                            <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: active ? '#10b981' : 'var(--t-text3)' }}>
                                                {label}
                                            </p>
                                            <p style={{ margin: 0, fontSize: 9, color: active ? '#10b981' : '#9ca3af', fontWeight: 600 }}>
                                                {active ? 'Allowed' : 'Denied'}
                                            </p>
                                        </div>
                                        <div style={{ marginLeft: 'auto' }}>
                                            <div style={{
                                                width: 28, height: 16, borderRadius: 8, position: 'relative',
                                                background: active ? '#10b981' : 'var(--t-border)',
                                                transition: 'background 0.2s',
                                            }}>
                                                <div style={{
                                                    position: 'absolute', top: 2,
                                                    left: active ? 14 : 2,
                                                    width: 12, height: 12, borderRadius: '50%',
                                                    background: '#fff',
                                                    transition: 'left 0.2s',
                                                }} />
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Save / Cancel */}
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button
                            onClick={save}
                            disabled={saving}
                            style={{
                                padding: '8px 20px', borderRadius: 9, fontSize: 12, fontWeight: 800,
                                cursor: saving ? 'not-allowed' : 'pointer',
                                background: saving ? '#9ca3af' : '#f97316', color: '#fff', border: 'none',
                            }}>
                            {saving ? 'Saving…' : '✓ Save Changes'}
                        </button>
                        <button
                            onClick={cancelEdit}
                            style={{
                                padding: '8px 16px', borderRadius: 9, fontSize: 12, fontWeight: 700,
                                cursor: 'pointer', border: '1px solid var(--t-border)',
                                background: 'var(--t-bg)', color: 'var(--t-text3)',
                            }}>
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
