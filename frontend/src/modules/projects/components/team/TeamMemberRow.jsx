/**
 * TeamMemberRow — Premium Member Card
 * ─────────────────────────────────────────────────────────────────────────────
 * Shows member info, role, and permission controls with a modern layout.
 */
import React, { useState } from 'react';
import api from '../../services/projectsApi';

export const ROLE_CONFIG = {
    OWNER:      { emoji: '👑', color: '#f97316', label: 'Owner' },
    MANAGER:    { emoji: '🧑‍💼', color: '#3b82f6', label: 'Manager' },
    ENGINEER:   { emoji: '🔧', color: '#8b5cf6', label: 'Engineer' },
    SUPERVISOR: { emoji: '🦺', color: '#f59e0b', label: 'Supervisor' },
    CONTRACTOR: { emoji: '🏗️', color: '#6b7280', label: 'Contractor' },
    VIEWER:     { emoji: '👁️',  color: '#9ca3af', label: 'Viewer' },
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
    { key: 'can_manage_members',   icon: '👥', label: 'Team'      },
    { key: 'can_manage_phases',    icon: '📋', label: 'Phases'    },
    { key: 'can_manage_finances',  icon: '💰', label: 'Finance'   },
    { key: 'can_manage_resources', icon: '🧱', label: 'Resources' },
];

export default function TeamMemberRow({ member, canManage, onUpdated, onRemoved, isLinkedToAttendance }) {
    const [expanded, setExpanded] = useState(false);
    const [saving,   setSaving]   = useState(false);
    
    const cfg = ROLE_CONFIG[member.role] || ROLE_CONFIG.VIEWER;
    const initials = (member.full_name || member.username || '?').charAt(0).toUpperCase();

    const togglePerm = async (key) => {
        if (!canManage) return;
        setSaving(true);
        try {
            const res = await api.updateMember(member.id, { [key]: !member[key] });
            onUpdated?.(res.data);
        } catch (e) { console.error(e); }
        finally { setSaving(false); }
    };

    const remove = async () => {
        if (!window.confirm(`Remove ${member.full_name || member.username}?`)) return;
        try { await api.removeMember(member.id); onRemoved?.(member.id); }
        catch (e) { console.error(e); }
    };

    return (
        <div style={{ 
            background:'var(--t-surface)', borderRadius:16, border:'1px solid var(--t-border)', 
            overflow:'hidden', transition:'all 0.2s'
        }}>
            <div onClick={() => setExpanded(!expanded)} style={{ padding:'12px 16px', display:'flex', alignItems:'center', gap:12, cursor:'pointer' }}>
                <div style={{ 
                    width:40, height:40, borderRadius:12, background:`${cfg.color}15`, 
                    color:cfg.color, display:'flex', alignItems:'center', justifyContent:'center', 
                    fontWeight:900, fontSize:16, border:'1px solid var(--t-border)'
                }}>
                    {initials}
                </div>
                
                <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <span style={{ fontWeight:800, fontSize:14, color:'var(--t-text)' }}>{member.full_name || member.username}</span>
                        {isLinkedToAttendance && (
                            <span title="Attendance Tracking Ready" style={{ fontSize:12 }}>✅</span>
                        )}
                    </div>
                    <div style={{ fontSize:11, color:'var(--t-text3)' }}>{member.email}</div>
                </div>

                <div style={{ display:'flex', gap:6 }}>
                    {PERM_META.map(p => (
                        <div key={p.key} title={p.label} style={{ 
                            width:24, height:24, borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center',
                            background: member[p.key] ? 'rgba(16,185,129,0.1)' : 'rgba(107,114,128,0.05)',
                            color: member[p.key] ? '#10b981' : '#9ca3af',
                            fontSize:12, opacity: member[p.key] ? 1 : 0.4
                        }}>
                            {p.icon}
                        </div>
                    ))}
                </div>
            </div>

            {expanded && (
                <div style={{ padding:'12px 16px', borderTop:'1px solid var(--t-border)', background:'rgba(0,0,0,0.01)' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                        <div>
                            <p style={{ margin:'0 0 10px', fontSize:11, fontWeight:700, color:'var(--t-text3)' }}>PERMISSIONS CONTROL</p>
                            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                                {PERM_META.map(p => (
                                    <button 
                                        key={p.key} 
                                        onClick={(e) => { e.stopPropagation(); togglePerm(p.key); }}
                                        disabled={!canManage || saving}
                                        style={{
                                            padding:'6px 12px', borderRadius:8, border:'1px solid var(--t-border)',
                                            background: member[p.key] ? 'rgba(16,185,129,0.1)' : 'var(--t-bg)',
                                            color: member[p.key] ? '#10b981' : 'var(--t-text3)',
                                            fontSize:11, fontWeight:800, cursor:canManage?'pointer':'default'
                                        }}
                                    >
                                        {p.icon} {p.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {canManage && (
                            <button onClick={remove} style={{ 
                                padding:'8px 12px', borderRadius:10, border:'1px solid #ef444430', 
                                background:'rgba(239,68,68,0.05)', color:'#ef4444', fontSize:12, fontWeight:700, cursor:'pointer' 
                            }}>🗑 Remove</button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
