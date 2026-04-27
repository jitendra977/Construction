/**
 * UsersPage — list, invite, edit, activate/deactivate users.
 */
import { useState, useMemo } from 'react';
import { useAccounts } from '../context/AccountsContext';
import accountsApi from '../services/accountsApi';
import Avatar from '../components/shared/Avatar';
import Badge from '../components/shared/Badge';
import Modal from '../components/shared/Modal';

const ROLE_COLORS = {
    SUPER_ADMIN: '#ef4444', HOME_OWNER: '#f97316',
    LEAD_ENGINEER: '#3b82f6', CONTRACTOR: '#8b5cf6', VIEWER: '#6b7280',
};

const inp = (extra = {}) => ({
    width: '100%', padding: '8px 12px', fontSize: 13, borderRadius: 10,
    border: '1px solid var(--t-border)', background: 'var(--t-bg)',
    color: 'var(--t-text)', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
    ...extra,
});
const lbl = { display: 'block', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--t-text3)', marginBottom: 4 };
const fmt = (iso) => iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

/* ── Invite / Create user form ─────────────────────────────────────────── */
function InviteForm({ roles, onDone }) {
    const [form, setForm] = useState({ email: '', username: '', first_name: '', last_name: '', role_id: '', password: '' });
    const [busy, setBusy] = useState(false);
    const [err,  setErr]  = useState('');
    const [result, setResult] = useState(null);
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setBusy(true); setErr('');
        try {
            const res = await accountsApi.inviteUser(form);
            setResult(res.data);
        } catch (ex) {
            setErr(ex?.response?.data?.error || ex?.response?.data?.detail || 'Failed to create user.');
        } finally {
            setBusy(false);
        }
    };

    if (result) return (
        <div style={{ padding: 24 }}>
            <div style={{ padding: 16, borderRadius: 12, background: '#10b98112', border: '1px solid #10b98130', marginBottom: 20 }}>
                <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 900, color: '#10b981' }}>✅ User Created!</p>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--t-text3)' }}>{result.message}</p>
                {result.temp_password && (
                    <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 8, background: 'var(--t-bg)', border: '1px solid var(--t-border)' }}>
                        <p style={{ margin: 0, fontSize: 10, fontWeight: 800, color: 'var(--t-text3)', textTransform: 'uppercase' }}>Temporary Password</p>
                        <p style={{ margin: '4px 0 0', fontFamily: 'monospace', fontSize: 16, fontWeight: 900, color: '#f97316', letterSpacing: 2 }}>{result.temp_password}</p>
                        <p style={{ margin: '4px 0 0', fontSize: 10, color: 'var(--t-text3)' }}>Share this with the user — they should change it on first login.</p>
                    </div>
                )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { setResult(null); setForm({ email:'',username:'',first_name:'',last_name:'',role_id:'',password:'' }); }}
                    style={{ flex: 1, padding: '9px 0', borderRadius: 10, border: '1px solid var(--t-border)', background: 'var(--t-bg)', color: 'var(--t-text)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    + Invite Another
                </button>
                <button onClick={onDone}
                    style={{ flex: 1, padding: '9px 0', borderRadius: 10, background: '#6366f1', color: '#fff', fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer' }}>
                    Done
                </button>
            </div>
        </div>
    );

    return (
        <form onSubmit={handleSubmit} style={{ padding: 24 }} className="space-y-4">
            {err && <div style={{ padding: '8px 12px', borderRadius: 8, background: '#ef444412', color: '#ef4444', fontSize: 12, fontWeight: 600, border: '1px solid #ef444430' }}>❌ {err}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div><label style={lbl}>First Name</label><input style={inp()} value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder="John" /></div>
                <div><label style={lbl}>Last Name</label><input style={inp()} value={form.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Doe" /></div>
            </div>
            <div><label style={lbl}>Email <span style={{ color: '#ef4444' }}>*</span></label><input type="email" required style={inp()} value={form.email} onChange={e => set('email', e.target.value)} placeholder="user@example.com" /></div>
            <div><label style={lbl}>Username <span style={{ fontSize: 9, color: 'var(--t-text3)' }}>(auto-generated if blank)</span></label><input style={inp()} value={form.username} onChange={e => set('username', e.target.value)} placeholder="johndoe" /></div>
            <div>
                <label style={lbl}>Role</label>
                <select style={inp()} value={form.role_id} onChange={e => set('role_id', e.target.value)}>
                    <option value="">— No role —</option>
                    {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
            </div>
            <div><label style={lbl}>Temporary Password <span style={{ fontSize: 9, color: 'var(--t-text3)' }}>(auto-generated if blank)</span></label><input style={inp()} value={form.password} onChange={e => set('password', e.target.value)} placeholder="Min. 8 characters" /></div>
            <button type="submit" disabled={busy}
                style={{ width: '100%', padding: '10px 0', borderRadius: 10, background: '#6366f1', color: '#fff', fontSize: 13, fontWeight: 900, border: 'none', cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
                {busy ? 'Creating…' : '✉️ Create & Invite User'}
            </button>
        </form>
    );
}

/* ── Edit user form ─────────────────────────────────────────────────────── */
function EditUserForm({ user, roles, onDone }) {
    const [form, setForm] = useState({ first_name: user.first_name || '', last_name: user.last_name || '', phone_number: user.phone_number || '', role_id: user.role?.id || '' });
    const [resetPw, setResetPw] = useState('');
    const [busy, setBusy] = useState(false);
    const [err,  setErr]  = useState('');
    const [msg,  setMsg]  = useState('');
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const handleSave = async (e) => {
        e.preventDefault();
        setBusy(true); setErr(''); setMsg('');
        try {
            await accountsApi.updateUser(user.id, { ...form, role_id: form.role_id || null });
            setMsg('User updated successfully.');
            setTimeout(onDone, 1200);
        } catch (ex) {
            setErr(ex?.response?.data?.detail || JSON.stringify(ex?.response?.data) || 'Update failed.');
        } finally { setBusy(false); }
    };

    const handleResetPw = async () => {
        if (resetPw.length < 8) { setErr('Password must be at least 8 characters.'); return; }
        setBusy(true); setErr(''); setMsg('');
        try {
            await accountsApi.resetUserPassword(user.id, { new_password: resetPw });
            setMsg('Password reset successfully.'); setResetPw('');
        } catch (ex) {
            setErr(ex?.response?.data?.error || 'Reset failed.');
        } finally { setBusy(false); }
    };

    return (
        <div style={{ padding: 24 }} className="space-y-4">
            {err && <div style={{ padding: '8px 12px', borderRadius: 8, background: '#ef444412', color: '#ef4444', fontSize: 12, fontWeight: 600 }}>❌ {err}</div>}
            {msg && <div style={{ padding: '8px 12px', borderRadius: 8, background: '#10b98112', color: '#10b981', fontSize: 12, fontWeight: 600 }}>✅ {msg}</div>}

            <form onSubmit={handleSave} className="space-y-3">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div><label style={lbl}>First Name</label><input style={inp()} value={form.first_name} onChange={e => set('first_name', e.target.value)} /></div>
                    <div><label style={lbl}>Last Name</label><input style={inp()} value={form.last_name} onChange={e => set('last_name', e.target.value)} /></div>
                </div>
                <div><label style={lbl}>Phone</label><input style={inp()} value={form.phone_number} onChange={e => set('phone_number', e.target.value)} /></div>
                <div>
                    <label style={lbl}>Role</label>
                    <select style={inp()} value={form.role_id} onChange={e => set('role_id', e.target.value)}>
                        <option value="">— No role —</option>
                        {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                </div>
                <button type="submit" disabled={busy}
                    style={{ width: '100%', padding: '9px 0', borderRadius: 10, background: '#6366f1', color: '#fff', fontSize: 13, fontWeight: 900, border: 'none', cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
                    {busy ? 'Saving…' : '💾 Save Changes'}
                </button>
            </form>

            <div style={{ borderTop: '1px solid var(--t-border)', paddingTop: 16 }}>
                <p style={{ margin: '0 0 8px', ...lbl }}>Reset Password (Admin)</p>
                <div style={{ display: 'flex', gap: 8 }}>
                    <input type="password" style={inp({ flex: 1 })} value={resetPw} onChange={e => setResetPw(e.target.value)} placeholder="New password (min. 8 chars)" />
                    <button type="button" onClick={handleResetPw} disabled={busy}
                        style={{ padding: '8px 16px', borderRadius: 10, background: '#f59e0b', color: '#fff', fontSize: 12, fontWeight: 900, border: 'none', cursor: 'pointer', flexShrink: 0 }}>
                        Reset
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ── Main page ──────────────────────────────────────────────────────────── */
export default function UsersPage() {
    const { users, roles, loading, error, load, refreshUsers, refreshStats } = useAccounts();
    const [search, setSearch]     = useState('');
    const [roleFilter, setRoleFilter] = useState('ALL');
    const [statusFilter, setStatus]   = useState('ALL');
    const [showInvite, setShowInvite] = useState(false);
    const [editing,    setEditing]    = useState(null);
    const [busyId,     setBusyId]     = useState(null);
    const [confirmDel, setConfirmDel] = useState(null);

    const filtered = useMemo(() => users.filter(u => {
        const name = `${u.first_name} ${u.last_name} ${u.username} ${u.email}`.toLowerCase();
        if (search && !name.includes(search.toLowerCase())) return false;
        if (roleFilter !== 'ALL' && u.role?.code !== roleFilter) return false;
        if (statusFilter === 'ACTIVE'   && !u.is_active) return false;
        if (statusFilter === 'INACTIVE' &&  u.is_active) return false;
        return true;
    }), [users, search, roleFilter, statusFilter]);

    const toggleActive = async (user) => {
        setBusyId(user.id);
        try {
            if (user.is_active) await accountsApi.deactivateUser(user.id);
            else                await accountsApi.activateUser(user.id);
            await Promise.all([refreshUsers(), refreshStats()]);
        } catch { /* silent */ } finally { setBusyId(null); }
    };

    const handleDelete = async (user) => {
        setBusyId(user.id);
        try {
            await accountsApi.deleteUser(user.id);
            await Promise.all([refreshUsers(), refreshStats()]);
        } catch { /* silent */ } finally { setBusyId(null); setConfirmDel(null); }
    };

    const uniqueRoles = [...new Set(users.map(u => u.role?.code).filter(Boolean))];

    return (
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>

            {/* ── Toolbar ─────────────────────────────────────────── */}
            {error && (
                <div style={{ marginBottom: 20, padding: '12px 16px', borderRadius: 12, background: '#ef444412', border: '1px solid #ef444430', color: '#ef4444', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 18 }}>⚠️</span>
                    <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontWeight: 900 }}>Failed to load users</p>
                        <p style={{ margin: 0, fontSize: 11, opacity: 0.8 }}>{error}</p>
                    </div>
                    <button onClick={load} style={{ padding: '6px 12px', borderRadius: 8, background: '#ef4444', color: '#fff', border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                        Retry
                    </button>
                </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
                <input
                    placeholder="🔍 Search by name, email, username…"
                    value={search} onChange={e => setSearch(e.target.value)}
                    style={{ flex: 1, minWidth: 200, padding: '8px 14px', fontSize: 13, borderRadius: 10, border: '1px solid var(--t-border)', background: 'var(--t-bg)', color: 'var(--t-text)', outline: 'none' }}
                />
                <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
                    style={{ padding: '8px 12px', fontSize: 12, borderRadius: 10, border: '1px solid var(--t-border)', background: 'var(--t-bg)', color: 'var(--t-text)', cursor: 'pointer' }}>
                    <option value="ALL">All Roles</option>
                    {roles.map(r => <option key={r.code} value={r.code}>{r.name}</option>)}
                </select>
                <select value={statusFilter} onChange={e => setStatus(e.target.value)}
                    style={{ padding: '8px 12px', fontSize: 12, borderRadius: 10, border: '1px solid var(--t-border)', background: 'var(--t-bg)', color: 'var(--t-text)', cursor: 'pointer' }}>
                    <option value="ALL">All Status</option>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                </select>
                <button onClick={() => setShowInvite(true)}
                    style={{ padding: '8px 18px', borderRadius: 10, background: '#6366f1', color: '#fff', fontSize: 12, fontWeight: 900, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                    ✉️ Invite User
                </button>
            </div>

            {/* ── Stats strip ─────────────────────────────────────── */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
                {[
                    { label: 'Total', value: users.length, color: '#6366f1' },
                    { label: 'Active', value: users.filter(u => u.is_active).length, color: '#10b981' },
                    { label: 'Inactive', value: users.filter(u => !u.is_active).length, color: '#ef4444' },
                    { label: 'Shown', value: filtered.length, color: '#f59e0b' },
                ].map(({ label, value, color }) => (
                    <div key={label} style={{ padding: '6px 16px', borderRadius: 8, background: `${color}12`, border: `1px solid ${color}25`, textAlign: 'center' }}>
                        <p style={{ margin: 0, fontSize: 16, fontWeight: 900, color }}>{value}</p>
                        <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: 'var(--t-text3)', textTransform: 'uppercase' }}>{label}</p>
                    </div>
                ))}
            </div>

            {/* ── Table ───────────────────────────────────────────── */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: 60 }}><div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto" /></div>
            ) : (
                <div style={{ borderRadius: 14, border: '1px solid var(--t-border)', background: 'var(--t-surface)', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead>
                            <tr style={{ background: 'var(--t-bg)', borderBottom: '1px solid var(--t-border)' }}>
                                {['User', 'Email', 'Role', 'Status', 'Joined', 'Actions'].map(h => (
                                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 900, color: 'var(--t-text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--t-text3)', fontSize: 13 }}>No users found</td></tr>
                            ) : filtered.map((user, i) => (
                                <tr key={user.id} style={{ borderBottom: '1px solid var(--t-border)', background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.01)' }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'var(--t-bg)'}
                                    onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.01)'}>
                                    <td style={{ padding: '10px 16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <Avatar user={user} size="sm" />
                                            <div>
                                                <p style={{ margin: 0, fontWeight: 700, color: 'var(--t-text)' }}>{`${user.first_name} ${user.last_name}`.trim() || user.username}</p>
                                                <p style={{ margin: 0, fontSize: 10, color: 'var(--t-text3)' }}>@{user.username}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '10px 16px', color: 'var(--t-text3)' }}>{user.email}</td>
                                    <td style={{ padding: '10px 16px' }}>
                                        {user.role ? <Badge label={user.role.name} color={ROLE_COLORS[user.role.code] || '#6b7280'} /> : <span style={{ color: 'var(--t-text3)', fontSize: 11 }}>—</span>}
                                    </td>
                                    <td style={{ padding: '10px 16px' }}>
                                        <Badge label={user.is_active ? 'Active' : 'Inactive'} color={user.is_active ? '#10b981' : '#ef4444'} />
                                    </td>
                                    <td style={{ padding: '10px 16px', color: 'var(--t-text3)' }}>{fmt(user.date_joined)}</td>
                                    <td style={{ padding: '10px 16px' }}>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <button onClick={() => setEditing(user)} disabled={busyId === user.id}
                                                style={{ padding: '4px 10px', borderRadius: 6, background: 'rgba(99,102,241,0.1)', color: '#6366f1', fontSize: 10, fontWeight: 900, border: '1px solid rgba(99,102,241,0.2)', cursor: 'pointer' }}>
                                                ✏️ Edit
                                            </button>
                                            <button onClick={() => toggleActive(user)} disabled={busyId === user.id}
                                                style={{ padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 900, cursor: 'pointer', border: '1px solid',
                                                    background: user.is_active ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                                                    color:      user.is_active ? '#ef4444'              : '#10b981',
                                                    borderColor: user.is_active ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)',
                                                }}>
                                                {busyId === user.id ? '…' : user.is_active ? '🔒 Deactivate' : '✅ Activate'}
                                            </button>
                                            <button onClick={() => setConfirmDel(user)} disabled={busyId === user.id}
                                                style={{ padding: '4px 10px', borderRadius: 6, background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontSize: 10, fontWeight: 900, border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer' }}>
                                                🗑️
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ── Invite modal ─────────────────────────────────────── */}
            <Modal isOpen={showInvite} onClose={() => setShowInvite(false)} title="Invite / Create User" maxWidth="max-w-lg">
                <InviteForm roles={roles} onDone={() => { setShowInvite(false); refreshUsers(); refreshStats(); }} />
            </Modal>

            {/* ── Edit modal ───────────────────────────────────────── */}
            <Modal isOpen={!!editing} onClose={() => setEditing(null)} title={`Edit — ${editing?.email}`} maxWidth="max-w-md">
                {editing && <EditUserForm user={editing} roles={roles} onDone={() => { setEditing(null); refreshUsers(); }} />}
            </Modal>

            {/* ── Confirm delete ───────────────────────────────────── */}
            <Modal isOpen={!!confirmDel} onClose={() => setConfirmDel(null)} title="Delete User?" maxWidth="max-w-sm">
                {confirmDel && (
                    <div style={{ padding: 24 }}>
                        <p style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 700, color: 'var(--t-text)' }}>Are you sure you want to delete <strong>{confirmDel.email}</strong>?</p>
                        <p style={{ margin: '0 0 20px', fontSize: 12, color: 'var(--t-text3)' }}>This action cannot be undone. Consider deactivating instead.</p>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => setConfirmDel(null)} style={{ flex: 1, padding: '9px 0', borderRadius: 10, border: '1px solid var(--t-border)', background: 'var(--t-bg)', color: 'var(--t-text)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                            <button onClick={() => handleDelete(confirmDel)} disabled={busyId === confirmDel.id}
                                style={{ flex: 1, padding: '9px 0', borderRadius: 10, background: '#ef4444', color: '#fff', fontSize: 12, fontWeight: 900, border: 'none', cursor: 'pointer' }}>
                                {busyId === confirmDel.id ? 'Deleting…' : '🗑️ Delete'}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
