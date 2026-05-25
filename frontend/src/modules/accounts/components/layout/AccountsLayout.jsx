/**
 * AccountsLayout — top nav bar for the Accounts module.
 */
import { NavLink, useLocation } from 'react-router-dom';
import { usePlatformBase } from '../../../../shared/utils/platformNav';
import { useAccounts } from '../../context/AccountsContext';
import { authService } from '../../../../services/auth';
import { useEffect, useRef, useState } from 'react';

const PAGE_HELP = {
    dashboard: {
        icon: '📊',
        title: 'Accounts Dashboard / खाता ड्यासबोर्ड',
        body: 'This page gives a summary of users, roles, and recent account activity. यो पृष्ठले युजर, रोल, र हालको खाता गतिविधिको सारांश देखाउँछ।',
        tips: [
            'Use this page for overview only; detailed edits happen in Users and System Roles. यो पृष्ठ overview का लागि हो; विस्तृत परिवर्तन Users र System Roles मा गर्नुहोस्।',
            'If counts look wrong, refresh here before changing data. यदि संख्या गलत देखिएमा, परिवर्तन गर्नु अघि यहाँ refresh गर्नुहोस्।',
        ],
    },
    profile: {
        icon: '👤',
        title: 'My Profile / मेरो प्रोफाइल',
        body: 'Update your own personal account details here. यहाँ आफ्नो व्यक्तिगत खाता विवरण अपडेट गर्नुहोस्।',
        tips: [
            'Profile changes affect only this user account. यहाँको परिवर्तन यही खातामा मात्र लागू हुन्छ।',
            'Password and email changes are security-sensitive; confirm carefully. पासवर्ड र इमेल परिवर्तन सुरक्षा-संवेदनशील हुन्छन्, ध्यान दिएर परिवर्तन गर्नुहोस्।',
        ],
    },
    security: {
        icon: '🔑',
        title: 'Security / सुरक्षा',
        body: 'Change password, email, and sensitive access settings here. यहाँ पासवर्ड, इमेल, र संवेदनशील पहुँच सेटिङ परिवर्तन हुन्छ।',
        tips: [
            'Use a strong password and update only after confirming the account owner. बलियो पासवर्ड प्रयोग गर्नुहोस् र खाताधनी पुष्टि गरेर मात्र परिवर्तन गर्नुहोस्।',
            'Security changes affect login flow immediately. सुरक्षा परिवर्तनले लगइनमा तुरुन्त असर गर्छ।',
        ],
    },
    profileActivity: {
        icon: '🧾',
        title: 'My Activity / मेरो गतिविधि',
        body: 'This page shows this account’s own recent actions and security-related events. यहाँ यही खाताका पछिल्ला गतिविधि र सुरक्षा घटनाहरू देखिन्छन्।',
        tips: [
            'Use this for personal account history, not global audit. यो व्यक्तिगत history हो, global audit होइन।',
            'If login behavior looks odd, check this page before changing permissions. लगइन असामान्य लागेमा permission परिवर्तन अघि यही हेर्नुहोस्।',
        ],
    },
    users: {
        icon: '👥',
        title: 'Users & Access / प्रयोगकर्ता र पहुँच',
        body: 'Manage user accounts here. System role is global; project access is managed per project inside the Projects tab. यहाँ युजर खाता व्यवस्थापन हुन्छ। System role global हो, project access भने Projects tab भित्र project अनुसार सेट हुन्छ।',
        tips: [
            'Info tab = account fields. Projects tab = project role and project permissions. Security tab = password and activation. Info tab = खाता विवरण, Projects tab = project role/permission, Security tab = password र activation।',
            'Saving user info does not remove project access. युजर info save गर्दा project access हट्दैन।',
        ],
    },
    roles: {
        icon: '🛡️',
        title: 'Roles & Templates / रोल र टेम्प्लेट',
        body: 'This page manages both global system roles and reusable project-role templates. User assignment still happens from Users → Projects tab. यो पृष्ठ global system roles र reusable project-role templates का लागि हो। Assign भने Users → Projects tab बाट हुन्छ।',
        tips: [
            'Use System Roles for module access like Users, Finance, Workforce, Settings. Users, Finance, Workforce, Settings जस्ता module access का लागि System Roles प्रयोग गर्नुहोस्।',
            'Use Project Roles here to define templates like Manager, Engineer, Supervisor; assign them from Users → Projects tab. Manager, Engineer, Supervisor जस्ता template यहाँ बनाउनुहोस्, assign भने Users → Projects tab बाट गर्नुहोस्।',
        ],
    },
    activity: {
        icon: '📋',
        title: 'Activity Log / गतिविधि लग',
        body: 'Review who changed what and when. यहाँ कसले, के, र कहिले परिवर्तन गर्‍यो भन्ने हेर्न सकिन्छ।',
        tips: [
            'Use filters first; logs become noisy quickly. पहिला filter प्रयोग गर्नुहोस्; logs चाँडै धेरै हुन्छन्।',
            'Check activity before assuming a permission bug. permission bug ठान्नु अघि activity log जाँच गर्नुहोस्।',
        ],
    },
};

function useIsMobileAccounts() {
    const [mobile, setMobile] = useState(() => window.innerWidth < 1024);
    useEffect(() => {
        const fn = () => setMobile(window.innerWidth < 1024);
        window.addEventListener('resize', fn);
        return () => window.removeEventListener('resize', fn);
    }, []);
    return mobile;
}

function AccountsHelpNote() {
    const { pathname } = useLocation();
    const isMobile = useIsMobileAccounts();
    const [open, setOpen] = useState(false);
    const wrapRef = useRef(null);
    const key =
        pathname.includes('/accounts/profile/security') ? 'security' :
        pathname.includes('/accounts/profile/activity') ? 'profileActivity' :
        pathname.includes('/accounts/profile') ? 'profile' :
        pathname.includes('/accounts/users') ? 'users' :
        pathname.includes('/accounts/roles') ? 'roles' :
        pathname.includes('/accounts/activity') ? 'activity' :
        'dashboard';
    const note = PAGE_HELP[key];

    useEffect(() => {
        const onPointerDown = (event) => {
            if (!wrapRef.current?.contains(event.target)) setOpen(false);
        };
        document.addEventListener('mousedown', onPointerDown);
        document.addEventListener('touchstart', onPointerDown);
        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            document.removeEventListener('touchstart', onPointerDown);
        };
    }, []);

    return (
        <div ref={wrapRef} style={{ position: 'absolute', top: 0, right: 0, zIndex: 25 }}>
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                title="Page help"
                aria-label="Page help"
                style={{
                    width: isMobile ? 34 : 36,
                    height: isMobile ? 34 : 36,
                    borderRadius: 999,
                    border: '1px solid rgba(59,130,246,0.22)',
                    background: open ? 'rgba(59,130,246,0.12)' : 'var(--t-surface)',
                    color: '#2563eb',
                    fontSize: isMobile ? 15 : 16,
                    fontWeight: 900,
                    cursor: 'pointer',
                    boxShadow: '0 8px 20px rgba(15,23,42,0.08)',
                    flexShrink: 0,
                }}
            >
                i
            </button>

            {open && (
                <section style={{
                    position: 'absolute',
                    top: isMobile ? 42 : 44,
                    right: 0,
                    width: isMobile ? 'min(88vw, 340px)' : 360,
                    zIndex: 30,
                    padding: isMobile ? '12px 14px' : '16px 18px',
                    borderRadius: isMobile ? 12 : 14,
                    border: '1px solid rgba(59,130,246,0.18)',
                    background: 'linear-gradient(135deg, rgba(239,246,255,0.98) 0%, rgba(248,250,252,0.99) 100%)',
                    boxShadow: '0 20px 50px rgba(15,23,42,0.15)',
                }}>
                    <div style={{ display:'flex', alignItems:'flex-start', gap:isMobile ? 10 : 12 }}>
                        <div style={{
                            width: isMobile ? 32 : 38, height: isMobile ? 32 : 38, borderRadius: isMobile ? 10 : 12, flexShrink: 0,
                            display:'flex', alignItems:'center', justifyContent:'center',
                            background: '#dbeafe', color: '#2563eb', fontSize: isMobile ? 15 : 18, border: '1px solid #bfdbfe',
                        }}>
                            {note.icon}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                            <p style={{ margin: 0, fontSize: isMobile ? 12 : 14, fontWeight: 900, color: 'var(--t-text)' }}>{note.title}</p>
                            <p style={{ margin: '5px 0 0', fontSize: isMobile ? 11 : 12, lineHeight: 1.6, color: 'var(--t-text3)' }}>{note.body}</p>
                            <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:8, marginTop: 12 }}>
                                {(isMobile ? note.tips.slice(0, 2) : note.tips).map((tip) => (
                                    <div key={tip} style={{
                                        padding: isMobile ? '8px 10px' : '9px 11px',
                                        borderRadius: isMobile ? 8 : 10,
                                        border: '1px solid rgba(148,163,184,0.18)',
                                        background: 'rgba(255,255,255,0.8)',
                                        fontSize: isMobile ? 10 : 11,
                                        lineHeight: 1.55,
                                        color: 'var(--t-text)',
                                    }}>
                                        {tip}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
}

export default function AccountsLayout({ children }) {
    const { stats, loading } = useAccounts();
    const base = usePlatformBase();
    const BASE = `${base}/accounts`;
    const { pathname } = useLocation();
    const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024);
    const canViewProfile = authService.hasPermission('can_view_profile') || authService.hasPermission('can_manage_admin_config') || authService.hasPermission('can_manage_users');
    const canManageAdminConfig = authService.hasPermission('can_manage_admin_config') || authService.hasPermission('can_manage_users');

    useEffect(() => {
        const fn = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', fn);
        return () => window.removeEventListener('resize', fn);
    }, []);

    // TABS must be inside the component — BASE is a hook-derived value
    const TABS = [
        ...(canManageAdminConfig ? [{ to: BASE, end: true, icon: '📊', label: 'Dashboard' }] : []),
        ...(canViewProfile ? [{ to: `${BASE}/profile`, icon: '👤', label: 'My Profile' }] : []),
        ...(canManageAdminConfig ? [
            { to: `${BASE}/users`, icon: '👥', label: 'Users & Access' },
            { to: `${BASE}/roles`, icon: '🛡️', label: 'System Roles' },
            { to: `${BASE}/activity`, icon: '📋', label: 'Activity Log' },
        ] : []),
    ];

    const MOBILE_LINKS = [
        { to: '/dashboard/mobile/home', icon: '🏠', label: 'Home', desc: 'Mobile home dashboard' },
        ...(canManageAdminConfig ? [{ to: BASE, icon: '📊', label: 'Overview', desc: 'Users, roles, activity summary' }] : []),
        ...(canViewProfile ? [
            { to: `${BASE}/profile`, icon: '👤', label: 'My Profile', desc: 'Personal account details' },
            { to: `${BASE}/profile/security`, icon: '🔑', label: 'Security', desc: 'Password, email, protection' },
            { to: `${BASE}/profile/activity`, icon: '🧾', label: 'My Activity', desc: 'Personal account activity' },
        ] : []),
        ...(canManageAdminConfig ? [
            { to: `${BASE}/users`, icon: '👥', label: 'Users', desc: 'User accounts and access' },
            { to: `${BASE}/roles/guide`, icon: '📘', label: 'Role Guide', desc: 'How the role system works' },
            { to: `${BASE}/roles/system`, icon: '🛡️', label: 'System Roles', desc: 'Global app permissions' },
            { to: `${BASE}/roles/project`, icon: '🗂️', label: 'Project Roles', desc: 'Per-project role templates' },
            { to: `${BASE}/activity`, icon: '📋', label: 'Audit Log', desc: 'Global account activity' },
        ] : []),
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', background: 'var(--t-bg)' }}>

            {/* ── Top bar ─────────────────────────────────────────────── */}
            <div style={{ background: 'var(--t-surface)', borderBottom: '1px solid var(--t-border)', position: 'sticky', top: 0, zIndex: 20 }}>

                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? '12px 14px 8px' : '12px 24px 8px', borderBottom: '1px solid var(--t-border)', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, border: '1px solid rgba(99,102,241,0.2)' }}>
                            👤
                        </div>
                        <div>
                            <p style={{ margin: 0, fontSize: 13, fontWeight: 900, color: 'var(--t-text)', lineHeight: 1 }}>Accounts</p>
                            <p style={{ margin: 0, fontSize: 10, color: 'var(--t-text3)', marginTop: 2 }}>Profile and admin configuration</p>
                        </div>
                    </div>

                    {/* Quick stats pills */}
                    {canManageAdminConfig && stats && !loading && (
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', width: isMobile ? '100%' : 'auto' }}>
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
                {isMobile ? (
                    <div style={{ padding: '10px 12px', display: 'flex', gap: 8, overflowX: 'auto', borderTop: '1px solid var(--t-border)' }}>
                        {MOBILE_LINKS.map(({ to, icon, label }) => {
                            const active = pathname === to;
                            return (
                                <NavLink
                                    key={to}
                                    to={to}
                                    end
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 4,
                                        padding: '8px 10px',
                                        borderRadius: 12,
                                        textDecoration: 'none',
                                        border: active ? '1px solid rgba(99,102,241,0.3)' : '1px solid var(--t-border)',
                                        background: active ? 'rgba(99,102,241,0.08)' : 'var(--t-bg)',
                                        minWidth: 78,
                                        flexShrink: 0,
                                    }}
                                >
                                    <span style={{ fontSize: 16, lineHeight: 1.1, flexShrink: 0 }}>{icon}</span>
                                    <span style={{ display: 'block', fontSize: 10, fontWeight: 900, color: active ? '#6366f1' : 'var(--t-text)', textAlign: 'center', lineHeight: 1.2 }}>
                                        {label}
                                    </span>
                                </NavLink>
                            );
                        })}
                    </div>
                ) : (
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
                )}
            </div>

            {/* ── Page content ────────────────────────────────────────── */}
            <main style={{ flex: 1, padding: isMobile ? 14 : 24, paddingBottom: 96, position: 'relative' }}>
                <AccountsHelpNote key={pathname} />
                {children}
            </main>
        </div>
    );
}
