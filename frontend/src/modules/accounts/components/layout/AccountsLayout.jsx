/**
 * AccountsLayout — top nav bar for the Accounts module.
 */
import { NavLink } from 'react-router-dom';
import { useAccounts } from '../../context/AccountsContext';

const BASE = '/dashboard/desktop/accounts';

const TABS = [
    { to: BASE,                end: true, icon: '📊', label: 'Dashboard'  },
    { to: `${BASE}/profile`,              icon: '👤', label: 'My Profile' },
    { to: `${BASE}/users`,                icon: '👥', label: 'Users'      },
    { to: `${BASE}/roles`,                icon: '🛡️', label: 'Roles'     },
    { to: `${BASE}/activity`,             icon: '📋', label: 'Activity'   },
];

export default function AccountsLayout({ children }) {
    const { stats, loading } = useAccounts();

    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', background: 'var(--t-bg)' }}>

            {/* ── Top bar ─────────────────────────────────────────────── */}
            <div style={{ background: 'var(--t-surface)', borderBottom: '1px solid var(--t-border)', position: 'sticky', top: 0, zIndex: 20 }}>

                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px 8px', borderBottom: '1px solid var(--t-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, border: '1px solid rgba(99,102,241,0.2)' }}>
                            👤
                        </div>
                        <div>
                            <p style={{ margin: 0, fontSize: 13, fontWeight: 900, color: 'var(--t-text)', lineHeight: 1 }}>Accounts</p>
                            <p style={{ margin: 0, fontSize: 10, color: 'var(--t-text3)', marginTop: 2 }}>User & role management</p>
                        </div>
                    </div>

                    {/* Quick stats pills */}
                    {stats && !loading && (
                        <div style={{ display: 'flex', gap: 8 }}>
                            {[
                                { label: 'Total Users',  value: stats.total_users,  color: '#6366f1' },
                                { label: 'Active',       value: stats.active_users, color: '#10b981' },
                                { label: 'Roles',        value: stats.total_roles,  color: '#f59e0b' },
                            ].map(({ label, value, color }) => (
                                <div key={label} style={{ padding: '4px 12px', borderRadius: 8, background: `${color}12`, border: `1px solid ${color}25`, textAlign: 'center' }}>
                                    <p style={{ margin: 0, fontSize: 13, fontWeight: 900, color }}>{value}</p>
                                    <p style={{ margin: 0, fontSize: 9, color: 'var(--t-text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Tab row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '0 16px', overflowX: 'auto' }}>
                    {TABS.map(({ to, end, icon, label }) => (
                        <NavLink
                            key={to}
                            to={to}
                            end={!!end}
                            style={({ isActive }) => ({
                                display: 'flex', alignItems: 'center', gap: 6,
                                padding: '10px 14px',
                                fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
                                borderBottom: isActive ? '2px solid #6366f1' : '2px solid transparent',
                                color: isActive ? '#6366f1' : 'var(--t-text3)',
                                textDecoration: 'none', transition: 'all 0.15s',
                            })}
                        >
                            <span style={{ fontSize: 14 }}>{icon}</span>
                            {label}
                        </NavLink>
                    ))}
                </div>
            </div>

            {/* ── Page content ────────────────────────────────────────── */}
            <main style={{ flex: 1, padding: 24 }}>
                {children}
            </main>
        </div>
    );
}
