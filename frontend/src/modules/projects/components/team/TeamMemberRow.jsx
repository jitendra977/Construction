import React, { useState } from 'react';
import api from '../../services/projectsApi';

const ROLE_CONFIG = {
    OWNER:      { emoji: '👑', color: '#f97316' },
    MANAGER:    { emoji: '🧑‍💼', color: '#3b82f6' },
    ENGINEER:   { emoji: '🔧', color: '#8b5cf6' },
    SUPERVISOR: { emoji: '🦺', color: '#f59e0b' },
    CONTRACTOR: { emoji: '🏗️', color: '#6b7280' },
    VIEWER:     { emoji: '👁️',  color: '#9ca3af' },
};

const ROLES = [
    ['OWNER',      '👑 Owner'],
    ['MANAGER',    '🧑‍💼 Manager'],
    ['ENGINEER',   '🔧 Engineer'],
    ['SUPERVISOR', '🦺 Supervisor'],
    ['CONTRACTOR', '🏗️ Contractor'],
    ['VIEWER',     '👁️ Viewer'],
];

export default function TeamMemberRow({ member, onUpdated, onRemoved }) {
    const [editing, setEditing] = useState(false);
    const [role, setRole]       = useState(member.role);
    const [note, setNote]       = useState(member.note || '');
    const [saving, setSaving]   = useState(false);

    const cfg = ROLE_CONFIG[member.role] || ROLE_CONFIG.VIEWER;
    const initials = (member.full_name || member.username || '?')
        .split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

    const save = async () => {
        setSaving(true);
        try {
            const res = await api.updateMember(member.id, { role, note });
            onUpdated?.(res.data);
            setEditing(false);
        } catch (e) { console.error(e); }
        finally { setSaving(false); }
    };

    const remove = async () => {
        if (!window.confirm(`Remove ${member.full_name || member.username} from this project?`)) return;
        try {
            await api.removeMember(member.id);
            onRemoved?.(member.id);
        } catch (e) { console.error(e); }
    };

    return (
        <div className="flex items-start gap-3 py-3 px-4 rounded-xl transition-colors hover:bg-[var(--t-bg)]"
            style={{ border: '1px solid transparent' }}>
            {/* Avatar */}
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-black shrink-0"
                style={{ background: `${cfg.color}22`, color: cfg.color, border: `2px solid ${cfg.color}40` }}>
                {initials}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm" style={{ color: 'var(--t-text)' }}>
                        {member.full_name || member.username}
                    </p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: `${cfg.color}18`, color: cfg.color, border: `1px solid ${cfg.color}40` }}>
                        {cfg.emoji} {member.role_display?.split(' / ')[0] || member.role}
                    </span>
                </div>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--t-text3)' }}>
                    {member.email}
                </p>
                {!editing && member.note && (
                    <p className="text-[10px] italic mt-0.5" style={{ color: 'var(--t-text3)' }}>
                        💬 {member.note}
                    </p>
                )}
                {editing && (
                    <div className="mt-2 flex gap-2 flex-wrap">
                        <select value={role} onChange={e => setRole(e.target.value)}
                            className="text-xs rounded-lg px-2 py-1.5"
                            style={{ background: 'var(--t-bg)', border: '1px solid var(--t-border)', color: 'var(--t-text)', fontSize: 11 }}>
                            {ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                        <input value={note} onChange={e => setNote(e.target.value)}
                            className="flex-1 text-xs rounded-lg px-2 py-1.5"
                            style={{ background: 'var(--t-bg)', border: '1px solid var(--t-border)', color: 'var(--t-text)', fontSize: 11, minWidth: 120 }}
                            placeholder="Short note…" />
                        <button onClick={save} disabled={saving}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-white"
                            style={{ background: '#f97316' }}>
                            {saving ? '…' : '✓'}
                        </button>
                        <button onClick={() => setEditing(false)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                            style={{ background: 'var(--t-bg)', color: 'var(--t-text3)', border: '1px solid var(--t-border)' }}>
                            ✕
                        </button>
                    </div>
                )}
            </div>

            {/* Actions */}
            {!editing && (
                <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => setEditing(true)}
                        className="px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-colors"
                        style={{ background: 'var(--t-bg)', color: 'var(--t-text3)', border: '1px solid var(--t-border)' }}>
                        ✏️
                    </button>
                    <button onClick={remove}
                        className="px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-colors hover:bg-red-50"
                        style={{ background: 'var(--t-bg)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
                        🗑
                    </button>
                </div>
            )}
        </div>
    );
}
