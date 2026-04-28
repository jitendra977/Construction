/**
 * TeamPage — Premium Project Team Management
 * ─────────────────────────────────────────────────────────────────────────────
 * Redesigned for visual excellence and functional consolidation.
 * Shows who is on the management team vs who is tracked in attendance.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import api from '../services/projectsApi';
import attendanceService from '../../../services/attendanceService';
import WorkersTab from '../../attendance/WorkersTab';
import TeamMemberRow, { ROLE_CONFIG, ROLES, PERM_META } from '../components/team/TeamMemberRow';

const ROLE_DEFAULTS = {
    OWNER:      { can_manage_members:true,  can_manage_finances:true,  can_view_finances:true,  can_manage_phases:true,  can_manage_structure:true,  can_manage_resources:true,  can_upload_media:true  },
    MANAGER:    { can_manage_members:true,  can_manage_finances:true,  can_view_finances:true,  can_manage_phases:true,  can_manage_structure:true,  can_manage_resources:true,  can_upload_media:true  },
    ENGINEER:   { can_manage_members:false, can_manage_finances:false, can_view_finances:true,  can_manage_phases:true,  can_manage_structure:true,  can_manage_resources:false, can_upload_media:true  },
    SUPERVISOR: { can_manage_members:false, can_manage_finances:false, can_view_finances:true,  can_manage_phases:true,  can_manage_structure:false, can_manage_resources:false, can_upload_media:true  },
    CONTRACTOR: { can_manage_members:false, can_manage_finances:false, can_view_finances:false, can_manage_phases:false, can_manage_structure:false, can_manage_resources:true,  can_upload_media:true  },
    VIEWER:     { can_manage_members:false, can_manage_finances:false, can_view_finances:true,  can_manage_phases:false, can_manage_structure:false, can_manage_resources:false, can_upload_media:false },
};

export default function TeamPage() {
    const { id }      = useParams();
    const { project } = useOutletContext() || {};
    const projectId   = project?.id || id;

    const [activeTab, setActiveTab] = useState('MANAGEMENT'); // MANAGEMENT or LABOUR
    const [members,  setMembers]  = useState([]);
    const [workers,  setWorkers]  = useState([]); // For attendance link check
    const [allUsers, setAllUsers] = useState([]);
    const [myRole,   setMyRole]   = useState(null);
    const [loading,  setLoading]  = useState(true);
    const [showAdd,  setShowAdd]  = useState(false);
    const [search,   setSearch]   = useState('');

    const canManage = myRole?.can_manage_members === true;

    const load = useCallback(async () => {
        if (!projectId) return;
        setLoading(true);
        try {
            const [mRes, uRes, rRes, wRes] = await Promise.all([
                api.listMembers(projectId),
                api.listUsers(),
                api.getMyRole(projectId).catch(() => null),
                attendanceService.getWorkers({ project: projectId }).catch(() => [])
            ]);
            setMembers(mRes.data);
            setAllUsers(uRes.data);
            setMyRole(rRes?.data || null);
            setWorkers(Array.isArray(wRes) ? wRes : wRes.results || []);
        } catch (err) {
            console.error('Failed to load team data:', err);
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => { load(); }, [load]);

    const handleAdded   = (m) => { setMembers(prev => [...prev, m]); setShowAdd(false); };
    const handleUpdated = (m) => setMembers(prev => prev.map(x => x.id === m.id ? m : x));
    const handleRemoved = (id) => setMembers(prev => prev.filter(m => m.id !== id));

    const filteredMembers = members.filter(m =>
        !search ||
        (m.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (m.email     || '').toLowerCase().includes(search.toLowerCase()) ||
        (m.role      || '').toLowerCase().includes(search.toLowerCase())
    );

    const grouped = ROLES.reduce((acc, [role]) => {
        const grp = filteredMembers.filter(m => m.role === role);
        if (grp.length) acc.push({ role, members: grp });
        return acc;
    }, []);

    if (loading) return (
        <div style={{ textAlign:'center', padding:100 }}>
          <div className="animate-pulse" style={{ fontSize:40 }}>👥</div>
          <p style={{ color:'var(--t-text3)', fontWeight:700, marginTop:16 }}>Loading project team...</p>
        </div>
    );

    return (
        <div style={{ padding: '0 0 60px', maxWidth: 900, margin: '0 auto' }}>

            {/* ── Tab Switcher ── */}
            <div style={{ display:'flex', gap:20, marginBottom:24, borderBottom:'1px solid var(--t-border)', paddingBottom:12 }}>
                <button 
                    onClick={() => setActiveTab('MANAGEMENT')}
                    style={{ 
                        background:'none', border:'none', fontSize:15, fontWeight:800, cursor:'pointer',
                        color: activeTab === 'MANAGEMENT' ? '#f97316' : 'var(--t-text3)',
                        position:'relative', transition:'0.2s'
                    }}
                >
                    🏢 Office & Management
                    {activeTab === 'MANAGEMENT' && <div style={{ position:'absolute', bottom:-13, left:0, right:0, height:3, background:'#f97316', borderRadius:2 }} />}
                </button>
                <button 
                    onClick={() => setActiveTab('LABOUR')}
                    style={{ 
                        background:'none', border:'none', fontSize:15, fontWeight:800, cursor:'pointer',
                        color: activeTab === 'LABOUR' ? '#f97316' : 'var(--t-text3)',
                        position:'relative', transition:'0.2s'
                    }}
                >
                    🦺 Field Labour & Force
                    {activeTab === 'LABOUR' && <div style={{ position:'absolute', bottom:-13, left:0, right:0, height:3, background:'#f97316', borderRadius:2 }} />}
                </button>
            </div>

            {activeTab === 'MANAGEMENT' ? (
                <>
                    {/* ── Dashboard Summary ── */}
                    <div style={{ display:'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap:16, marginBottom:30 }}>
                        <SummaryCard label="Management Team" value={members.length} color="#6366f1" icon="🏢" />
                        <SummaryCard label="Field Staff" value={workers.length} color="#f97316" icon="🦺" />
                        <SummaryCard label="Open Permissions" value={members.reduce((sum, m) => sum + PERM_META.filter(p => m[p.key]).length, 0)} color="#22c55e" icon="🔐" />
                    </div>

                    {/* ── Action Bar ── */}
                    <div style={{ 
                        display:'flex', gap:12, marginBottom:24, alignItems:'center',
                        background:'var(--t-surface)', padding:12, borderRadius:16, border:'1px solid var(--t-border)'
                    }}>
                        <div style={{ position:'relative', flex:1 }}>
                            <span style={{ position:'absolute', left:14, top:9, opacity:0.4 }}>🔍</span>
                            <input 
                                type="text" 
                                placeholder="Search team members..." 
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                style={{ width:'100%', padding:'8px 14px 8px 36px', borderRadius:10, border:'1px solid var(--t-border)', background:'var(--t-bg)', color:'var(--t-text)', fontSize:13, outline:'none' }}
                            />
                        </div>
                        {canManage && (
                            <button onClick={() => setShowAdd(!showAdd)} style={{
                                padding:'8px 20px', borderRadius:10, border:'none', background:'#f97316', color:'#fff', fontWeight:900, fontSize:13, cursor:'pointer'
                            }}>
                                {showAdd ? '✕ Close' : '+ Add Member'}
                            </button>
                        )}
                    </div>

                    {showAdd && canManage && (
                        <AddMemberForm availableUsers={allUsers.filter(u => !members.find(m => m.user === u.id))} projectId={projectId} onAdded={handleAdded} onCancel={() => setShowAdd(false)} />
                    )}

                    {/* ── Member Groups ── */}
                    {grouped.map(({ role, members: grp }) => {
                        const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.VIEWER;
                        return (
                            <div key={role} style={{ marginBottom: 30 }}>
                                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
                                    <span style={{ fontSize:18 }}>{cfg.emoji}</span>
                                    <h3 style={{ margin:0, fontSize:12, fontWeight:900, textTransform:'uppercase', letterSpacing:'0.1em', color:cfg.color }}>{cfg.label}s</h3>
                                    <span style={{ fontSize:10, fontWeight:800, padding:'2px 8px', borderRadius:6, background:`${cfg.color}15`, color:cfg.color }}>{grp.length}</span>
                                </div>
                                
                                <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:10 }}>
                                    {grp.map(member => (
                                        <TeamMemberRow 
                                            key={member.id} 
                                            member={member} 
                                            canManage={canManage} 
                                            onUpdated={handleUpdated} 
                                            onRemoved={handleRemoved}
                                            isLinkedToAttendance={workers.some(w => w.linked_user === member.user)}
                                        />
                                    ))}
                                </div>
                            </div>
                        );
                    })}

                    {members.length === 0 && (
                        <div style={{ textAlign:'center', padding:80, background:'var(--t-surface)', borderRadius:20, border:'1px dashed var(--t-border)' }}>
                            <div style={{ fontSize:40, marginBottom:16 }}>👥</div>
                            <h3 style={{ color:'var(--t-text3)' }}>The team is empty</h3>
                            <p style={{ color:'var(--t-text3)' }}>Start by adding a manager or engineer.</p>
                        </div>
                    )}
                </>
            ) : (
                <WorkersTab projectId={projectId} />
            )}
        </div>
    );
}

function SummaryCard({ label, value, color, icon }) {
    return (
        <div style={{ background:'var(--t-surface)', padding:20, borderRadius:20, border:'1px solid var(--t-border)', borderTop:`4px solid ${color}` }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                    <div style={{ fontSize:28, fontWeight:900, color:color }}>{value}</div>
                    <div style={{ fontSize:10, fontWeight:800, color:'var(--t-text3)', textTransform:'uppercase', letterSpacing:'0.05em' }}>{label}</div>
                </div>
                <div style={{ fontSize:24 }}>{icon}</div>
            </div>
        </div>
    );
}

function AddMemberForm({ availableUsers, onAdded, onCancel, projectId }) {
    const [form, setForm] = useState({ user: '', role: 'ENGINEER', note: '' });
    const [perms, setPerms] = useState({ ...ROLE_DEFAULTS.ENGINEER });
    const [adding, setAdding] = useState(false);
    const [err, setErr] = useState('');

    const handleRoleChange = (role) => {
        setForm(f => ({ ...f, role }));
        setPerms({ ...ROLE_DEFAULTS[role] });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.user) return setErr('Select a user.');
        setAdding(true); setErr('');
        try {
            const res = await api.addMember({ project: projectId, user: +form.user, role: form.role, note: form.note, ...perms });
            onAdded(res.data);
        } catch (ex) { setErr('Could not add member.'); }
        finally { setAdding(false); }
    };

    return (
        <form onSubmit={handleSubmit} style={{ background:'var(--t-surface)', padding:24, borderRadius:20, border:'1px solid var(--t-border)', marginBottom:30 }}>
            <h3 style={{ margin:'0 0 20px', fontWeight:900, fontSize:16 }}>Register Project Member</h3>
            {err && <div style={{ color:'#ef4444', fontSize:12, marginBottom:12 }}>{err}</div>}
            
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
                <div>
                    <label style={labelStyle}>User</label>
                    <select value={form.user} onChange={e => setForm(f => ({ ...f, user: e.target.value }))} style={inputStyle}>
                        <option value="">Select...</option>
                        {availableUsers.map(u => <option key={u.id} value={u.id}>{u.username} ({u.first_name})</option>)}
                    </select>
                </div>
                <div>
                    <label style={labelStyle}>Project Role</label>
                    <select value={form.role} onChange={e => handleRoleChange(e.target.value)} style={inputStyle}>
                        {ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                </div>
            </div>

            <div style={{ display:'flex', gap:12 }}>
                <button type="submit" disabled={adding} style={{ flex:1, padding:12, borderRadius:12, background:'#f97316', color:'#fff', border:'none', fontWeight:800, cursor:'pointer' }}>{adding ? '...' : '+ Confirm Member'}</button>
                <button type="button" onClick={onCancel} style={{ padding:12, borderRadius:12, background:'var(--t-bg)', border:'1px solid var(--t-border)', color:'var(--t-text3)', fontWeight:700 }}>Cancel</button>
            </div>
        </form>
    );
}

const labelStyle = { fontSize:10, fontWeight:900, color:'var(--t-text3)', textTransform:'uppercase', marginBottom:6, display:'block' };
const inputStyle = { width:'100%', padding:'10px', borderRadius:10, border:'1px solid var(--t-border)', background:'var(--t-bg)', color:'var(--t-text)', fontSize:13 };
