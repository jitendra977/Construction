import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { authService } from '../../services/auth';
import { useConstruction } from '../../context/ConstructionContext';
import DesktopSidebar from '../../components/desktop/DesktopSidebar';
import UnifiedButton from '../../components/unified/UnifiedButton';
import { useState, useCallback, useEffect, useRef } from 'react';
import { Camera, MonitorSmartphone, ScanLine, Users, UserCheck } from 'lucide-react';

// Sidebar widths kept in sync with DesktopSidebar.jsx
const SIDEBAR_EXPANDED  = 256;
const SIDEBAR_COLLAPSED = 56;

function openKioskWindow(path) {
    const features = [
        'popup=yes',
        'width=1440',
        'height=900',
        'menubar=no',
        'toolbar=no',
        'location=no',
        'status=no',
        'resizable=yes',
        'scrollbars=yes',
    ].join(',');
    window.open(path, 'constructpro-kiosk', features);
}

// Derive a readable page title from the current route segment
function usePageTitle(navItems) {
    const location = useLocation();
    const segment  = location.pathname.split('/').filter(Boolean).pop() || 'home';
    const match    = navItems.find(n => n.id === segment);
    if (match) {
        // Strip Nepali translation — keep only the English part before the first '('
        return match.label.split('(')[0].trim();
    }
    return segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
}

function DesktopDashboard() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, loading, activeProjectId } = useConstruction();

    const [collapsed, setCollapsed] = useState(() =>
        localStorage.getItem('sb_collapsed') === 'true'
    );

    const handleToggle = useCallback(() => {
        setCollapsed(prev => {
            const next = !prev;
            localStorage.setItem('sb_collapsed', String(next));
            return next;
        });
    }, []);

    const handleLogout = async () => {
        await authService.logout();
        navigate('/login');
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen bg-[var(--t-bg)]">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--t-primary)]" />
                    <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--t-primary)] animate-pulse"
                        style={{ fontFamily: "'DM Mono', monospace" }}>
                        Loading...
                    </p>
                </div>
            </div>
        );
    }

    const can = (permission) => {
        if (!permission) return true;
        if (Array.isArray(permission)) return permission.some(p => authService.hasPermission(p));
        return authService.hasPermission(permission);
    };

    const navItems = [
        // Projects
        { id: 'projects',      icon: '🗂️',  label: 'Projects (परियोजनाहरू)', permission: 'can_view_projects' },
        // Overview
        { id: 'home',          icon: '🏠',  label: 'Dashboard (ड्यासबोर्ड)', permission: 'can_view_dashboard' },
        { id: 'analytics',     icon: '📈',  label: 'Analytics (विश्लेषण)', permission: 'can_view_dashboard' },
        { id: 'estimator',     icon: '🧮',  label: 'Estimator (इस्टिमेटर)', permission: 'can_view_dashboard' },
        // Construction
        { id: 'permits',       icon: '📜',  label: 'Permits (नक्सा पास)', permission: 'can_manage_phases' },
        { id: 'phases',        icon: '📋',  label: 'Phases & Tasks (चरण र कार्य)', permission: 'can_view_phases' },
        { id: 'manage',        icon: '🛠️', label: 'Manage (व्यवस्थापन)', permission: 'can_manage_phases' },
        { id: 'timeline',      icon: '📅',  label: 'Timeline (समयरेखा)', permission: 'can_view_phases' },
        { id: 'finance',       icon: '💰',  label: 'Finance (वित्त)', permission: 'can_view_finances' },
        { id: 'resource',      icon: '🧱',  label: 'Resource (स्रोत)', permission: 'can_view_resources' },
        { id: 'structure',     icon: '🏛️', label: 'Structure (संरचना)', permission: 'can_view_structure' },
        { id: 'photos',        icon: '📸',  label: 'Gallery (फोटो ग्यालरी)', permission: 'can_view_dashboard' },
        { id: 'timelapse',     icon: '🎞️', label: 'Timelapse (टाइमल्याप्स)', permission: 'can_view_dashboard' },
        // Team & HR
        { id: 'attendance',    icon: '🕐',  label: 'Attendance (हाजिरी)', permission: 'can_view_workforce' },
        { id: 'workforce',     icon: '👷',  label: 'Workforce & Teams (कार्यबल)', permission: 'can_view_workforce' },
        { id: 'team-chat',     icon: '💬',  label: 'Team Chat (समूह च्याट)' },
        { id: 'location',      icon: '📍',  label: 'Location (स्थान ट्र्याकिङ)', permission: 'can_view_workforce' },
        { id: 'cctv',          icon: '📹',  label: 'Field CCTV (सिसिटिभी)', permission: 'can_view_dashboard' },
        // Admin & Config
        { id: 'accounts',      icon: '👤',  label: 'Accounts (खाता)', permission: ['can_manage_admin_config', 'can_manage_users'] },
        { id: 'settings',      icon: '⚙️',  label: 'Settings (सेटिङ)', permission: 'can_manage_settings' },
        { id: 'guides',        icon: '📚',  label: 'User Guide (मद्दत निर्देशिका)', permission: 'can_view_dashboard' },
        { id: 'data-transfer', icon: '🔄',  label: 'Data Transfer (डाटा स्थानान्तरण)', permission: 'can_manage_data_transfer' },
        { id: 'backups',       icon: '☁️',  label: 'System Backups (ब्याकअप)', permission: 'can_manage_admin_config' },
    ].filter(item => can(item.permission));

    const sidebarW = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED;

    return (
        <div className="flex h-screen bg-[var(--t-bg)] overflow-hidden">
            <DesktopSidebar
                user={user}
                onLogout={handleLogout}
                navItems={navItems}
                collapsed={collapsed}
                onToggle={handleToggle}
            />

            {/* Main content area */}
            <main
                className="flex-1 flex flex-col min-h-screen overflow-hidden"
                style={{
                    marginLeft: sidebarW,
                    transition: 'margin-left 0.22s cubic-bezier(0.4,0,0.2,1)',
                }}
            >
                {/* Slim top bar */}
                <TopBar navItems={navItems} user={user} activeProjectId={activeProjectId} />

                {/* Page content */}
                <div className={`flex-1 flex flex-col h-full ${location.pathname.endsWith('/floorplan') ? 'overflow-hidden' : 'overflow-y-auto'}`}>
                    <Outlet />
                </div>
            </main>

            {/* Unified floating button — AI + Daily update */}
            <UnifiedButton projectId={null} isMobile={false} />
        </div>
    );
}

// ── Slim top bar ──────────────────────────────────────────────────────────────
function TopBar({ navItems, user, activeProjectId }) {
    const title = usePageTitle(navItems);
    const location = useLocation();

    // Build simple breadcrumb: Dashboard > Page
    const isHome = location.pathname.endsWith('/home') || location.pathname.endsWith('/desktop');
    const crumbs = isHome
        ? [{ label: 'Dashboard' }]
        : [{ label: 'Dashboard', href: -1 }, { label: title }];

    return (
        <header
            className="shrink-0 flex items-center justify-between px-6"
            style={{
                height: 48,
                borderBottom: '1px solid var(--t-border)',
                background: 'var(--t-surface)',
            }}
        >
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5" aria-label="breadcrumb">
                {crumbs.map((crumb, i) => (
                    <span key={i} className="flex items-center gap-1.5">
                        {i > 0 && (
                            <svg width="8" height="8" viewBox="0 0 12 12" fill="none" style={{ opacity: 0.3 }}>
                                <path d="M4 2l4 4-4 4" stroke="var(--t-text)" strokeWidth="1.8" strokeLinecap="round"/>
                            </svg>
                        )}
                        <span
                            className="text-[11px] font-semibold"
                            style={{
                                color: i === crumbs.length - 1 ? 'var(--t-text)' : 'var(--t-text3)',
                                fontFamily: i === crumbs.length - 1 ? 'inherit' : "'DM Mono', monospace",
                                fontWeight: i === crumbs.length - 1 ? 700 : 500,
                                letterSpacing: i === crumbs.length - 1 ? 0 : '0.02em',
                            }}
                        >
                            {crumb.label}
                        </span>
                    </span>
                ))}
            </nav>

            {/* Right side: time + user */}
            <div className="flex items-center gap-3">
                <AttendanceShortcutIcons activeProjectId={activeProjectId} />
                <Clock />
                <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg"
                    style={{ background: 'var(--t-surface2)', border: '1px solid var(--t-border)' }}>
                    <div className="w-2 h-2 rounded-full" style={{ background: '#10b981' }} />
                    <span className="text-[10px] font-bold" style={{ color: 'var(--t-text2)', fontFamily: "'DM Mono', monospace" }}>
                        {user?.username || 'User'}
                    </span>
                </div>
            </div>
        </header>
    );
}

function AttendanceShortcutIcons({ activeProjectId }) {
    const navigate = useNavigate();
    const shortcuts = [
        {
            key: 'attendance',
            icon: ScanLine,
            title: 'Attendance',
            action: () => navigate('/dashboard/desktop/attendance'),
            color: '#f97316',
            bg: '#f9731615',
            border: '#f9731640',
        },
        {
            key: 'workforce',
            icon: Users,
            title: 'Workforce',
            action: () => navigate('/dashboard/desktop/workforce'),
            color: '#6366f1',
            bg: '#6366f115',
            border: '#6366f140',
        },
        {
            key: 'nfc-kiosk',
            icon: MonitorSmartphone,
            title: 'NFC Kiosk',
            action: () => activeProjectId && openKioskWindow(`/kiosk/${activeProjectId}`),
            disabled: !activeProjectId,
            color: '#10b981',
            bg: '#10b98115',
            border: '#10b98140',
        },
        {
            key: 'qr-kiosk',
            icon: Camera,
            title: 'QR Kiosk',
            action: () => activeProjectId && openKioskWindow(`/qr-kiosk/${activeProjectId}`),
            disabled: !activeProjectId,
            color: '#3b82f6',
            bg: '#3b82f615',
            border: '#3b82f640',
        },
        {
            key: 'face-kiosk',
            icon: UserCheck,
            title: 'Biometric Face Kiosk',
            action: () => activeProjectId && openKioskWindow(`/face-kiosk/${activeProjectId}`),
            disabled: !activeProjectId,
            color: '#a855f7',
            bg: '#a855f715',
            border: '#a855f740',
        },
    ];

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {shortcuts.map(item => (
                <button
                    key={item.key}
                    type="button"
                    title={item.title}
                    aria-label={item.title}
                    disabled={item.disabled}
                    onClick={item.action}
                    style={{
                        width: 30,
                        height: 30,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 0,
                        borderRadius: 9,
                        border: `1px solid ${item.border}`,
                        background: item.disabled ? 'var(--t-surface2)' : item.bg,
                        color: item.disabled ? 'var(--t-text3)' : item.color,
                        cursor: item.disabled ? 'not-allowed' : 'pointer',
                        flexShrink: 0,
                        boxShadow: item.disabled ? 'none' : '0 1px 2px rgba(15, 23, 42, 0.08)',
                    }}
                >
                    <item.icon size={15} strokeWidth={2.1} />
                </button>
            ))}
        </div>
    );
}

// ── Live clock for top bar ────────────────────────────────────────────────────
function Clock() {
    const [time, setTime] = useState(() => new Date());
    useEffect(() => {
        const t = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    const fmt = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return (
        <span className="text-[10px] font-bold tabular-nums"
            style={{ color: 'var(--t-text3)', fontFamily: "'DM Mono', monospace" }}>
            {fmt}
        </span>
    );
}

export default DesktopDashboard;
