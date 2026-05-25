/**
 * AccountsDashboard — KPI overview for the Accounts module.
 */
import { useNavigate } from 'react-router-dom';
import { usePlatformBase } from '../../../shared/utils/platformNav';
import { useAccounts } from '../context/AccountsContext';
import Avatar from '../components/shared/Avatar';
import Badge from '../components/shared/Badge';
import { useEffect, useState } from 'react';

const ROLE_COLORS = {
    SUPER_ADMIN:    '#ef4444',
    HOME_OWNER:     '#f97316',
    LEAD_ENGINEER:  '#3b82f6',
    CONTRACTOR:     '#8b5cf6',
    VIEWER:         '#6b7280',
};

function useIsMobileAccountsDashboard() {
    const [mobile, setMobile] = useState(() => window.innerWidth < 1024);
    useEffect(() => {
        const fn = () => setMobile(window.innerWidth < 1024);
        window.addEventListener('resize', fn);
        return () => window.removeEventListener('resize', fn);
    }, []);
    return mobile;
}

const StatCard = ({ icon, label, value, sub, color = '#6366f1', compact = false }) => (
    <div style={{ borderRadius: compact ? 10 : 14, border: '1px solid var(--t-border)', background: 'var(--t-surface)', padding: compact ? '10px 8px' : '18px 20px' }}>
        <p style={{ fontSize: compact ? 15 : 24, margin: '0 0 3px' }}>{icon}</p>
        <p style={{ margin: 0, fontSize: compact ? 16 : 26, fontWeight: 900, color, lineHeight: 1.05 }}>{value}</p>
        <p style={{ margin: '3px 0 0', fontSize: compact ? 8 : 11, fontWeight: 800, color: 'var(--t-text)', textTransform: 'uppercase', letterSpacing: compact ? '0.02em' : '0.06em', lineHeight: 1.15 }}>{label}</p>
        {sub && <p style={{ margin: '2px 0 0', fontSize: compact ? 8 : 10, color: 'var(--t-text3)', lineHeight: 1.2 }}>{sub}</p>}
    </div>
);

const fmt = (iso) => iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function AccountsDashboard() {
    const { stats, loading } = useAccounts();
    const navigate = useNavigate();
    const base    = usePlatformBase();
    const AB      = `${base}/accounts`;
    const isMobile = useIsMobileAccountsDashboard();

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
            <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
        </div>
    );

    const s = stats || {};
    return (
        <div style={{ maxWidth: isMobile ? '100%' : 1100, margin: '0 auto' }} className="space-y-6">

            {/* ── KPI cards ──────────────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(4, minmax(0, 1fr))' : 'repeat(auto-fill, minmax(160px, 1fr))', gap: isMobile ? 6 : 14 }}>
                <StatCard icon="👥" label="Total Users"    value={s.total_users   ?? '—'} color="#6366f1" sub="all accounts" compact={isMobile} />
                <StatCard icon="✅" label="Active"         value={s.active_users  ?? '—'} color="#10b981" sub="can log in" compact={isMobile} />
                <StatCard icon="🔒" label="Inactive"       value={s.inactive_users ?? '—'} color="#ef4444" sub="deactivated" compact={isMobile} />
                <StatCard icon="🛡️" label="Roles"         value={s.total_roles   ?? '—'} color="#f59e0b" sub="permission sets" compact={isMobile} />
                <StatCard icon="🆕" label="New Today"      value={s.new_today     ?? 0}   color="#8b5cf6" sub="registered today" compact={isMobile} />
                <StatCard icon="📋" label="Activity (30d)" value={s.activity_30d  ?? '—'} color="#3b82f6" sub="actions logged" compact={isMobile} />
                <StatCard icon="🔑" label="Logins (30d)"   value={s.logins_30d   ?? '—'} color="#06b6d4" sub="login events" compact={isMobile} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 14 : 20 }}>

                {/* ── Role breakdown ────────────────────────────────── */}
                <div style={{ borderRadius: isMobile ? 12 : 14, border: '1px solid var(--t-border)', background: 'var(--t-surface)', padding: isMobile ? 14 : 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <p style={{ margin: 0, fontSize: isMobile ? 11 : 12, fontWeight: 900, color: 'var(--t-text)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>🛡️ Users by Role</p>
                        <button onClick={() => navigate(`${AB}/roles`)}
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
                <div style={{ borderRadius: isMobile ? 12 : 14, border: '1px solid var(--t-border)', background: 'var(--t-surface)', padding: isMobile ? 14 : 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <p style={{ margin: 0, fontSize: isMobile ? 11 : 12, fontWeight: 900, color: 'var(--t-text)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>🆕 Recent Users</p>
                        <button onClick={() => navigate(`${AB}/users`)}
                            style={{ fontSize: 11, color: '#6366f1', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}>
                            All users →
                        </button>
                    </div>
                    {(s.recent_users || []).length === 0 && (
                        <p style={{ fontSize: 12, color: 'var(--t-text3)', textAlign: 'center', padding: '20px 0' }}>No recent users</p>
                    )}
                    <div className="space-y-3">
                        {(s.recent_users || []).map(u => (
                            <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 8, borderBottom: isMobile ? '1px solid var(--t-border)' : 'none' }}>
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
            {!isMobile && (
            <div style={{ borderRadius: 14, border: '1px solid var(--t-border)', background: 'var(--t-surface)', padding: 20 }}>
                <p style={{ margin: '0 0 14px', fontSize: 12, fontWeight: 900, color: 'var(--t-text)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>⚡ Quick Actions</p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {[
                        { icon: '➕', label: 'Invite User',        path: `${AB}/users`,   q: '?invite=1' },
                        { icon: '👤', label: 'Edit My Profile',    path: `${AB}/profile`              },
                        { icon: '🔑', label: 'Change Password',    path: `${AB}/profile`, q: '?tab=security' },
                        { icon: '🛡️', label: 'Manage Roles',      path: `${AB}/roles`                },
                        { icon: '📋', label: 'View Activity Log',  path: `${AB}/activity`             },
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
            )}

            {/* ── Nepali Note Section (Office Management) ── */}
            <div style={{ marginTop: isMobile ? 0 : 40, padding: isMobile ? 16 : 30, background: 'linear-gradient(135deg, #fff 0%, #f8fafc 100%)', borderRadius: isMobile ? 16 : 24, border: '1px solid var(--t-border)', boxShadow: '0 10px 30px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', gap: isMobile ? 12 : 20, alignItems: 'flex-start' }}>
                    <div style={{ width: isMobile ? 36 : 48, height: isMobile ? 36 : 48, borderRadius: isMobile ? 12 : 16, background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: isMobile ? 18 : 24, flexShrink: 0 }}>🏢</div>
                    <div>
                        <h3 style={{ margin: '0 0 8px', fontSize: isMobile ? 14 : 18, fontWeight: 900, color: 'var(--t-text)' }}>कार्यालय व्यवस्थापन निर्देशिका (Office Guide)</h3>
                        <p style={{ margin: 0, fontSize: isMobile ? 11 : 13, color: 'var(--t-text3)', lineHeight: 1.6, fontWeight: 600 }}>
                            यो सेक्सनबाट तपाइँ आफ्नो मुख्य कार्यालयका कर्मचारी (इन्जिनियर, एकाउन्टेन्ट, म्यानेजर) हरूको खाता र अनुमति व्यवस्थापन गर्न सक्नुहुन्छ:
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(220px, 1fr))', gap: isMobile ? 12 : 20, marginTop: isMobile ? 14 : 24 }}>
                            <div>
                                <div style={{ fontSize: 12, fontWeight: 900, color: '#6366f1', marginBottom: 6 }}>👤 प्रयोगकर्ता (Users)</div>
                                <p style={{ margin: 0, fontSize: 11, color: 'var(--t-text3)', lineHeight: 1.5 }}>नयाँ इन्जिनियर वा एकाउन्टेन्टलाई प्रणालीमा निम्तो दिनुहोस्। उनीहरूको प्रोफाइल र इमेल यहाँबाट अपडेट गर्न सकिन्छ।</p>
                            </div>
                            <div>
                                <div style={{ fontSize: 12, fontWeight: 900, color: '#f59e0b', marginBottom: 6 }}>🛡️ अनुमति (Roles & Permissions)</div>
                                <p style={{ margin: 0, fontSize: 11, color: 'var(--t-text3)', lineHeight: 1.5 }}>कुन कर्मचारीले के हेर्न वा सच्याउन पाउने भन्ने कुरा 'Roles' बाट तय गर्नुहोस्। यो सुरक्षाको लागि महत्त्वपूर्ण छ।</p>
                            </div>
                            <div>
                                <div style={{ fontSize: 12, fontWeight: 900, color: '#3b82f6', marginBottom: 6 }}>📋 क्रियाकलाप लग (Activity Logs)</div>
                                <p style={{ margin: 0, fontSize: 11, color: 'var(--t-text3)', lineHeight: 1.5 }}>प्रणालीमा कसले, कहिले र के परिवर्तन गर्यो भन्ने कुरा 'Activity' मा गएर हेर्न सकिन्छ। यसले पारदर्शिता बढाउँछ।</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
