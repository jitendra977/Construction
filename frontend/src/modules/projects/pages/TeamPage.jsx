/**
 * TeamPage — manage project team members.
 * Add users by picking from the user list, assign roles, remove members.
 */
import React, { useEffect, useState } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import api            from '../services/projectsApi';
import TeamMemberRow  from '../components/team/TeamMemberRow';

const ROLES = [
    ['OWNER',      '👑 Owner'],
    ['MANAGER',    '🧑‍💼 Manager'],
    ['ENGINEER',   '🔧 Engineer'],
    ['SUPERVISOR', '🦺 Supervisor'],
    ['CONTRACTOR', '🏗️ Contractor'],
    ['VIEWER',     '👁️ Viewer'],
];

export default function TeamPage() {
    const { id }                  = useParams();
    const { project }             = useOutletContext() || {};
    const projectId               = project?.id || id;

    const [members, setMembers]   = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [loading, setLoading]   = useState(true);
    const [showAdd, setShowAdd]   = useState(false);
    const [addForm, setAddForm]   = useState({ user: '', role: 'VIEWER', note: '' });
    const [adding, setAdding]     = useState(false);
    const [addErr, setAddErr]     = useState('');

    useEffect(() => {
        if (!projectId) return;
        Promise.all([
            api.listMembers(projectId),
            api.listUsers(),
        ]).then(([mRes, uRes]) => {
            setMembers(mRes.data);
            setAllUsers(uRes.data);
        }).catch(console.error)
          .finally(() => setLoading(false));
    }, [projectId]);

    // Users not yet on the team
    const availableUsers = allUsers.filter(
        u => !members.find(m => m.user === u.id)
    );

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!addForm.user) { setAddErr('Please select a user.'); return; }
        setAdding(true); setAddErr('');
        try {
            const res = await api.addMember({
                project: projectId,
                user:    +addForm.user,
                role:    addForm.role,
                note:    addForm.note,
            });
            setMembers(prev => [...prev, res.data]);
            setAddForm({ user: '', role: 'VIEWER', note: '' });
            setShowAdd(false);
        } catch (e) {
            setAddErr(e.response?.data?.detail || 'Could not add member. They may already be on this project.');
        } finally {
            setAdding(false);
        }
    };

    const handleUpdated = (updated) =>
        setMembers(prev => prev.map(m => m.id === updated.id ? updated : m));

    const handleRemoved = (memberId) =>
        setMembers(prev => prev.filter(m => m.id !== memberId));

    const groupedByRole = ROLES.reduce((acc, [role]) => {
        const grp = members.filter(m => m.role === role);
        if (grp.length) acc[role] = grp;
        return acc;
    }, {});

    const FIELD = {
        background: 'var(--t-bg)', border: '1px solid var(--t-border)',
        borderRadius: 8, color: 'var(--t-text)', fontSize: 13, padding: '8px 12px',
        outline: 'none', width: '100%',
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-96">
            <div className="animate-pulse text-4xl">👥</div>
        </div>
    );

    return (
        <div className="p-6 max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-black" style={{ color: 'var(--t-text)' }}>
                        👥 Project Team
                    </h2>
                    <p className="text-xs mt-1" style={{ color: 'var(--t-text3)' }}>
                        {members.length} member{members.length !== 1 ? 's' : ''} on this project
                    </p>
                </div>
                <button onClick={() => setShowAdd(s => !s)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white"
                    style={{ background: '#f97316' }}>
                    {showAdd ? '✕ Cancel' : '+ Add Member'}
                </button>
            </div>

            {/* Add member form */}
            {showAdd && (
                <form onSubmit={handleAdd}
                    className="mb-6 rounded-2xl p-5 space-y-3"
                    style={{ background: 'var(--t-surface)', border: '2px dashed var(--t-border)' }}>
                    <h3 className="text-sm font-bold" style={{ color: 'var(--t-text)' }}>Add Team Member</h3>
                    {addErr && (
                        <p className="text-xs font-semibold px-3 py-2 rounded-lg"
                            style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
                            ⚠️ {addErr}
                        </p>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color: 'var(--t-text3)' }}>User</p>
                            <select value={addForm.user} onChange={e => setAddForm(f => ({ ...f, user: e.target.value }))} style={FIELD}>
                                <option value="">— Select user —</option>
                                {availableUsers.map(u => (
                                    <option key={u.id} value={u.id}>
                                        {u.username}{u.first_name ? ` (${u.first_name} ${u.last_name})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color: 'var(--t-text3)' }}>Role</p>
                            <select value={addForm.role} onChange={e => setAddForm(f => ({ ...f, role: e.target.value }))} style={FIELD}>
                                {ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color: 'var(--t-text3)' }}>Note (optional)</p>
                        <input value={addForm.note} onChange={e => setAddForm(f => ({ ...f, note: e.target.value }))}
                            style={FIELD} placeholder="e.g. Lead civil engineer, Ground floor supervisor" />
                    </div>
                    <button type="submit" disabled={adding}
                        className="w-full py-2.5 rounded-xl text-sm font-bold text-white"
                        style={{ background: adding ? '#9ca3af' : '#f97316' }}>
                        {adding ? 'Adding…' : 'Add to Team'}
                    </button>
                </form>
            )}

            {/* Empty state */}
            {members.length === 0 && (
                <div className="flex flex-col items-center py-16 text-center">
                    <p className="text-5xl mb-3">👥</p>
                    <p className="font-semibold" style={{ color: 'var(--t-text3)' }}>No team members yet.</p>
                    <p className="text-sm mt-1" style={{ color: 'var(--t-text3)' }}>Add people to collaborate on this project.</p>
                </div>
            )}

            {/* Members grouped by role */}
            {Object.entries(groupedByRole).map(([role, grp]) => {
                const [, roleLabel] = ROLES.find(([v]) => v === role) || [role, role];
                return (
                    <div key={role} className="mb-5">
                        <p className="text-[10px] font-black uppercase tracking-widest px-1 mb-2"
                            style={{ color: 'var(--t-text3)' }}>
                            {roleLabel} ({grp.length})
                        </p>
                        <div className="rounded-2xl overflow-hidden"
                            style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
                            {grp.map((member, i) => (
                                <div key={member.id}
                                    style={{ borderTop: i > 0 ? '1px solid var(--t-border)' : 'none' }}>
                                    <TeamMemberRow
                                        member={member}
                                        onUpdated={handleUpdated}
                                        onRemoved={handleRemoved}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
