/**
 * AccountsDashboard — KPI overview for the Accounts module.
 */
import { useNavigate } from 'react-router-dom';
import { useAccounts } from '../context/AccountsContext';
import Avatar from '../components/shared/Avatar';
import Badge from '../components/shared/Badge';

const ROLE_COLORS = {
    SUPER_ADMIN:    '#ef4444',
    HOME_OWNER:     '#f97316',
    LEAD_ENGINEER:  '#3b82f6',
    CONTRACTOR:     '#8b5cf6',
    VIEWER:         '#6b7280',
};

const StatCard = ({ icon, label, value, sub, color = '#6366f1' }) => (
    <div style={{ borderRadius: 14, border: '1px solid var(--t-border)', background: 'var(--t-surface)', padding: '18px 20px' }}>
        <p style={{ fontSize: 24, margin: '0 0 6px' }}>{icon}</p>
        <p style={{ margin: 0, fontSize: 26, fontWeight: 900, color }}>{value}</p>
        <p style={{ margin: '2px 0 0', fontSize: 11, fontWeight: 700, color: 'var(--t-text)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
        {sub && <p style={{ margin: '4px 0 0', fontSize: 10, color: 'var(--t-text3)' }}>{sub}</p>}
    </div>
);

const fmt = (iso) => iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function AccountsDashboard() {
    const { stats, users, roles, loading } = useAccounts();
    const navigate = useNavigate();

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
            <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
        </div>
    );

    const s = stats || {};

    return (
        <div style={{ maxWidth: 1100, margin: '0 auto' }} className="space-y-6">

            {/* ── KPI cards ──────────────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14 }}>
                <StatCard icon="👥" label="Total Users"    value={s.total_users   ?? '—'} color="#6366f1" sub="all accounts" />
                <StatCard icon="✅" label="Active"         value={s.active_users  ?? '—'} color="#10b981" sub="can log in" />
                <StatCard icon="🔒" label="Inactive"       value={s.inactive_users ?? '—'} color="#ef4444" sub="deactivated" />
                <StatCard icon="🛡️" label="Roles"         value={s.total_roles   ?? '—'} color="#f59e0b" sub="permission sets" />
                <StatCard icon="🆕" label="New Today"      value={s.new_today     ?? 0}   color="#8b5cf6" sub="registered today" />
                <StatCard icon="📋" label="Activity (30d)" value={s.activity_30d  ?? '—'} color="#3b82f6" sub="actions logged" />
                <StatCard icon="🔑" label="Logins (30d)"   value={s.logins_30d   ?? '—'} color="#06b6d4" sub="login events" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

                {/* ── Role breakdown ────────────────────────────────── */}
                <div style={{ borderRadius: 14, border: '1px solid var(--t-border)', background: 'var(--t-surface)', padding: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <p style={{ margin: 0, fontSize: 12, fontWeight: 900, color: 'var(--t-text)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>🛡️ Users by Role</p>
                        <button onClick={() => navigate('/dashboard/desktop/accounts/roles')}
                            style={{ fontSize: 11, color: '#6366f1', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}>
                            Manage →
                        </button>
                    </div>
                    {(s.role_breakdown || []).length === 0 && (
                        <p style={{ fontSize: 12, color: 'var(--t-text3)', textAlign: 'center', padding: '20px 0' }}>No role data</p>
                    )}
                    <div className="space-y-3">
                        {(s.role_breakdown || []).map((rb) => {
                            const color = ROLE_COLORS[rb.role__code] || '#6b7280';
                            const total = s.total_users || 1;
                            const pct   = Math.round((rb.count / total) * 100);
                            return (
                                <div key={rb.role__code || rb.role__name}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--t-text)' }}>{rb.role__name || 'No Role'}</span>
                                        <span style={{ fontSize: 12, fontWeight: 700, color }}>{rb.count} <span style={{ color: 'var(--t-text3)', fontWeight: 400 }}>({pct}%)</span></span>
                                    </div>
                                    <div style={{ height: 6, borderRadius: 4, background: 'var(--t-border)', overflow: 'hidden' }}>
                                        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.5s' }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ── Recent registrations ──────────────────────────── */}
                <div style={{ borderRadius: 14, border: '1px solid var(--t-border)', background: 'var(--t-surface)', padding: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <p style={{ margin: 0, fontSize: 12, fontWeight: 900, color: 'var(--t-text)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>🆕 Recent Users</p>
                        <button onClick={() => navigate('/dashboard/desktop/accounts/users')}
                            style={{ fontSize: 11, color: '#6366f1', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}>
                            All users →
                        </button>
                    </div>
                    {(s.recent_users || []).length === 0 && (
                        <p style={{ fontSize: 12, color: 'var(--t-text3)', textAlign: 'center', padding: '20px 0' }}>No recent users</p>
                    )}
                    <div className="space-y-3">
                        {(s.recent_users || []).map(u => (
                            <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <Avatar user={u} size="sm" />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: 'var(--t-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {`${u.first_name} ${u.last_name}`.trim() || u.username}
                                    </p>
                                    <p style={{ margin: 0, fontSize: 10, color: 'var(--t-text3)' }}>{u.email}</p>
                                </div>
                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                    {u.role && <Badge label={u.role.name} color={ROLE_COLORS[u.role.code] || '#6b7280'} />}
                                    <p style={{ margin: '3px 0 0', fontSize: 9, color: 'var(--t-text3)' }}>{fmt(u.date_joined)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Quick actions ─────────────────────────────────────── */}
            <div style={{ borderRadius: 14, border: '1px solid var(--t-border)', background: 'var(--t-surface)', padding: 20 }}>
                <p style={{ margin: '0 0 14px', fontSize: 12, fontWeight: 900, color: 'var(--t-text)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>⚡ Quick Actions</p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {[
                        { icon: '➕', label: 'Invite User',        path: '/dashboard/desktop/accounts/users',   q: '?invite=1' },
                        { icon: '👤', label: 'Edit My Profile',    path: '/dashboard/desktop/accounts/profile'              },
                        { icon: '🔑', label: 'Change Password',    path: '/dashboard/desktop/accounts/profile', q: '?tab=security' },
                        { icon: '🛡️', label: 'Manage Roles',      path: '/dashboard/desktop/accounts/roles'                },
                        { icon: '📋', label: 'View Activity Log',  path: '/dashboard/desktop/accounts/activity'             },
                    ].map(({ icon, label, path, q = '' }) => (
                        <button key={label}
                            onClick={() => navigate(path + q)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                padding: '8px 14px', borderRadius: 10,
                                border: '1px solid var(--t-border)', background: 'var(--t-bg)',
                                fontSize: 12, fontWeight: 700, color: 'var(--t-text)',
                                cursor: 'pointer', transition: 'all 0.15s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.color = '#6366f1'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--t-border)'; e.currentTarget.style.color = 'var(--t-text)'; }}
                        >
                            <span style={{ fontSize: 16 }}>{icon}</span>
                            {label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
