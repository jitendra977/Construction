/**
 * MobileNav — fixed bottom bar + slide-up full-screen app drawer.
 *
 * Bottom bar: Home · Phases · Projects · [Camera] · Finance · Attendance · ⊞ All
 * "All" opens a full-screen drawer with every module, active-state aware.
 */
import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../../services/auth';
import ThemeToggle from '../common/ThemeToggle';
import { useMobileTracker } from '../../modules/location/context/MobileTrackerContext';
import MobileQuickCapture from './MobileQuickCapture';

const BASE = '/dashboard/mobile';

const ROUTE_PERMISSIONS = {
    home:         'can_view_dashboard',
    analytics:    'can_view_dashboard',
    estimator:    'can_view_dashboard',
    projects:     'can_view_projects',
    phases:       'can_view_phases',
    timeline:     'can_view_phases',
    manage:       'can_manage_phases',
    permits:      'can_manage_phases',
    structure:    'can_view_structure',
    resource:     'can_view_resources',
    attendance:   'can_view_workforce',
    workforce:    'can_view_workforce',
    tracking:     'can_view_workforce',
    location:     'can_view_workforce',
    finance:      'can_view_finances',
    'data-transfer':'can_manage_data_transfer',
    photos:       'can_view_dashboard',
    timelapse:    'can_view_dashboard',
    accounts:     ['can_view_profile', 'can_manage_admin_config', 'can_manage_users'],
    guides:       'can_view_dashboard',
    'team-chat':  null,
};

function canAccessRoute(id) {
    const permission = ROUTE_PERMISSIONS[id];
    if (!permission) return true;
    if (Array.isArray(permission)) return permission.some(p => authService.hasPermission(p));
    return authService.hasPermission(permission);
}

// ── Primary bottom tabs ───────────────────────────────────────────────────────
const PRIMARY = [
    { id: 'home',       icon: '🏠',  label: 'Home'     },
    { id: 'phases',     icon: '📋',  label: 'Phases'   },
    { id: 'projects',   icon: '🗂️', label: 'Projects'  },
    { id: 'finance',    icon: '💰',  label: 'Finance'   },
    { id: 'attendance', icon: '👷',  label: 'Attend'    },
    { id: 'team-chat',  icon: '💬',  label: 'Chat'      },
    { id: 'all',        icon: '⊞',   label: 'All'       },
];

// ── Drawer sections ───────────────────────────────────────────────────────────
const SECTIONS = [
    {
        id: 'overview',
        label: 'Overview',
        color: '#6366f1',
        icon: '📊',
        items: [
            { id: 'home',      icon: '🏠', label: 'Dashboard'  },
            { id: 'analytics', icon: '📈', label: 'Analytics'  },
            { id: 'estimator', icon: '🧮', label: 'Estimator'  },
        ],
    },
    {
        id: 'construction',
        label: 'Construction',
        color: '#f97316',
        icon: '🏗️',
        items: [
            { id: 'projects',  icon: '🗂️', label: 'Projects'  },
            { id: 'phases',    icon: '📋', label: 'Phases'     },
            { id: 'timeline',  icon: '📅', label: 'Timeline'   },
            { id: 'manage',    icon: '🛠️', label: 'Manage'    },
            { id: 'permits',   icon: '📜', label: 'Permits'    },
            { id: 'structure', icon: '🏛️', label: 'Structure'  },
            { id: 'resource',  icon: '🧱', label: 'Resources'  },
        ],
    },
    {
        id: 'team',
        label: 'Team & HR',
        color: '#10b981',
        icon: '👷',
        items: [
            { id: 'attendance', icon: '🕐', label: 'Attendance' },
            { id: 'workforce',  icon: '👷', label: 'Workforce'  },
            { id: 'team-chat',  icon: '💬', label: 'Team Chat'  },
            { id: 'tracking',   icon: '📍', label: 'My GPS'     },
            { id: 'location',   icon: '🗺️', label: 'Site Map'  },
        ],
    },
    {
        id: 'finance',
        label: 'Finance & Data',
        color: '#22c55e',
        icon: '💰',
        items: [
            { id: 'finance',        icon: '💰', label: 'Finance'       },
            { id: 'data-transfer',  icon: '🔄', label: 'Data Transfer' },
        ],
    },
    {
        id: 'media',
        label: 'Media',
        color: '#3b82f6',
        icon: '📸',
        items: [
            { id: 'photos',    icon: '📸', label: 'Photos'     },
            { id: 'timelapse', icon: '🎞️', label: 'Timelapse'  },
        ],
    },
    {
        id: 'account',
        label: 'Account & Settings',
        color: '#8b5cf6',
        icon: '⚙️',
        items: [
            { id: 'accounts', icon: '👤', label: 'Accounts'   },
            { id: 'guides',   icon: '📚', label: 'User Guide' },
        ],
    },
];

// ── GPS status dot ────────────────────────────────────────────────────────────
const GPS_DOT_CFG = {
    idle:     { color: '#9ca3af', pulse: false },
    tracking: { color: '#3b82f6', pulse: true  },
    on_site:  { color: '#10b981', pulse: true  },
    off_site: { color: '#6b7280', pulse: false },
    error:    { color: '#ef4444', pulse: false },
};

function GPSStatusDot() {
    const tracker = useMobileTracker();
    if (!tracker || tracker.status === 'idle') return null;
    const cfg = GPS_DOT_CFG[tracker.status] || GPS_DOT_CFG.idle;
    return (
        <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5" title={tracker.status}>
            {cfg.pulse && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-50"
                    style={{ background: cfg.color }} />
            )}
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 border border-white"
                style={{ background: cfg.color }} />
        </span>
    );
}

// ── Single bottom bar tab ─────────────────────────────────────────────────────
function BottomTab({ id, icon, label, showGps = false }) {
    return (
        <NavLink
            to={`${BASE}/${id}`}
            className="flex-1 flex flex-col items-center justify-center relative transition-all"
            style={({ isActive }) => ({
                color: isActive ? 'var(--t-primary)' : 'var(--t-text3)',
                minWidth: 0,
                paddingTop: 8,
                paddingBottom: 7,
            })}
        >
            {({ isActive }) => (
                <>
                    {/* Active indicator — thin pill at top of tab */}
                    <span
                        className="absolute top-0 left-1/2 -translate-x-1/2 rounded-full transition-all duration-200"
                        style={{
                            width:   isActive ? 24 : 0,
                            height:  2,
                            background: 'var(--t-primary)',
                            opacity: isActive ? 1 : 0,
                        }}
                    />
                    {/* Icon */}
                    <span className="relative flex h-6 w-7 items-center justify-center">
                        <span className={`text-[18px] leading-none transition-transform duration-200 ${isActive ? 'scale-110' : 'scale-100'}`}>
                            {icon}
                        </span>
                        {showGps && <GPSStatusDot />}
                    </span>
                    {/* Label */}
                    <span className={`mt-0.5 max-w-full truncate px-0.5 text-[6.8px] font-bold uppercase tracking-[0.1em] transition-all ${
                        isActive ? 'opacity-100' : 'opacity-50'
                    }`}>
                        {label}
                    </span>
                </>
            )}
        </NavLink>
    );
}

// ── Drawer item button ────────────────────────────────────────────────────────
function DrawerItem({ item, sectionColor, isActive, onClick }) {
    return (
        <button
            onClick={onClick}
            className="flex flex-col items-center justify-center gap-1.5 py-3.5 rounded-2xl transition-all active:scale-95 relative overflow-hidden"
            style={{
                background: isActive
                    ? `color-mix(in srgb, ${sectionColor} 14%, transparent)`
                    : 'var(--t-surface)',
                border: isActive
                    ? `1.5px solid color-mix(in srgb, ${sectionColor} 40%, transparent)`
                    : '1px solid var(--t-border)',
            }}
        >
            {/* Active dot */}
            {isActive && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
                    style={{ background: sectionColor }} />
            )}
            <span className="text-[22px] leading-none">{item.icon}</span>
            <span
                className="text-[9px] font-black uppercase tracking-wide text-center leading-tight px-1"
                style={{ color: isActive ? sectionColor : 'var(--t-text3)' }}
            >
                {item.label}
            </span>
        </button>
    );
}

// ── Full-screen App Drawer ────────────────────────────────────────────────────
function AppDrawer({ onClose }) {
    const navigate  = useNavigate();
    const location  = useLocation();
    const [visible, setVisible] = useState(false);
    const [search,  setSearch]  = useState('');

    useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);

    const activeId = location.pathname.replace(`${BASE}/`, '').split('/')[0];

    const close = () => {
        setVisible(false);
        setTimeout(onClose, 220);
    };

    const go = (id) => {
        navigate(`${BASE}/${id}`);
        close();
    };

    const handleLogout = async () => {
        await authService.logout();
        navigate('/login');
    };

    const query = search.trim().toLowerCase();
    const visibleSections = SECTIONS.map(section => ({
        ...section,
        items: section.items.filter(item => canAccessRoute(item.id)),
    })).filter(section => section.items.length > 0);

    const filteredSections = query
        ? visibleSections.map(s => ({
              ...s,
              items: s.items.filter(i => i.label.toLowerCase().includes(query) || i.id.includes(query)),
          })).filter(s => s.items.length > 0)
        : visibleSections;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-[98]"
                style={{
                    background: 'rgba(0,0,0,0.5)',
                    opacity:    visible ? 1 : 0,
                    transition: 'opacity 0.2s ease',
                    backdropFilter: 'blur(4px)',
                }}
                onClick={close}
            />

            {/* Drawer panel */}
            <div
                className="fixed inset-x-0 bottom-0 z-[99] flex flex-col"
                style={{
                    maxHeight:  '91vh',
                    borderRadius: '20px 20px 0 0',
                    background:  'var(--t-bg)',
                    boxShadow:   '0 -12px 50px rgba(0,0,0,0.25)',
                    transform:   visible ? 'translateY(0)' : 'translateY(100%)',
                    transition:  'transform 0.24s cubic-bezier(0.32,0.72,0,1)',
                    overflow:    'hidden',
                }}
            >
                {/* Drag handle */}
                <div className="flex justify-center pt-3 pb-1 shrink-0">
                    <div className="w-9 h-1 rounded-full" style={{ background: 'var(--t-border)' }} />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 shrink-0"
                    style={{ borderBottom: '1px solid var(--t-border)' }}>
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base shrink-0"
                            style={{ background: 'linear-gradient(135deg, var(--t-primary), color-mix(in srgb, var(--t-primary) 75%, black))' }}>
                            🏗️
                        </div>
                        <div>
                            <p className="text-sm font-black leading-none" style={{ color: 'var(--t-text)' }}>All Features</p>
                            <p className="text-[8px] font-bold uppercase tracking-widest mt-0.5"
                                style={{ color: 'var(--t-primary)', fontFamily: "'DM Mono', monospace" }}>
                                HCMS Navigation
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                        <button
                            onClick={close}
                            className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold transition-colors"
                            style={{
                                background: 'var(--t-surface2)',
                                color: 'var(--t-text3)',
                                border: '1px solid var(--t-border)',
                            }}
                        >✕</button>
                    </div>
                </div>

                {/* Search */}
                <div className="px-4 pt-3 pb-2 shrink-0">
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                        style={{
                            background: 'var(--t-surface)',
                            border: '1px solid var(--t-border)',
                        }}>
                        <span className="text-sm" style={{ color: 'var(--t-text3)' }}>🔍</span>
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search features…"
                            className="flex-1 bg-transparent text-[12px] outline-none"
                            style={{ color: 'var(--t-text)', caretColor: 'var(--t-primary)' }}
                            autoComplete="off"
                        />
                        {search && (
                            <button onClick={() => setSearch('')} style={{ color: 'var(--t-text3)', fontSize: 12 }}>✕</button>
                        )}
                    </div>
                </div>

                {/* Active page indicator */}
                {!query && activeId && activeId !== 'home' && (
                    <div className="px-4 pb-2 shrink-0">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
                            style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
                            <span className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{ background: 'var(--t-primary)' }} />
                            <span className="text-[9px]" style={{ color: 'var(--t-text3)', fontFamily: "'DM Mono', monospace" }}>
                                Currently viewing:
                            </span>
                            <span className="text-[10px] font-black capitalize" style={{ color: 'var(--t-primary)' }}>
                                {activeId.replace('-', ' ')}
                            </span>
                        </div>
                    </div>
                )}

                {/* Sections */}
                <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-5">
                    {filteredSections.map(section => (
                        <div key={section.id}>
                            {/* Section header */}
                            <div className="flex items-center gap-2 mb-2.5 px-0.5">
                                {/* Thin colored bar */}
                                <span className="w-0.5 h-3 rounded-full shrink-0" style={{ background: section.color }} />
                                <p className="text-[9px] font-black uppercase tracking-[0.13em]"
                                    style={{ color: section.color, fontFamily: "'DM Mono', monospace" }}>
                                    {section.label}
                                </p>
                                <div className="flex-1 h-px" style={{ background: `color-mix(in srgb, ${section.color} 20%, transparent)` }} />
                            </div>

                            {/* Items grid */}
                            <div className={`grid gap-2 ${
                                section.items.length <= 3 ? 'grid-cols-3' : 'grid-cols-4'
                            }`}>
                                {section.items.map(item => (
                                    <DrawerItem
                                        key={item.id}
                                        item={item}
                                        sectionColor={section.color}
                                        isActive={activeId === item.id}
                                        onClick={() => go(item.id)}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}

                    {/* No results */}
                    {filteredSections.length === 0 && (
                        <div className="text-center py-10">
                            <p className="text-sm" style={{ color: 'var(--t-text3)' }}>No features match "{search}"</p>
                        </div>
                    )}

                    {/* Logout */}
                    <div className="pt-1 pb-6">
                        <button
                            onClick={handleLogout}
                            className="w-full py-3 rounded-2xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest"
                            style={{
                                background: 'rgba(239,68,68,0.08)',
                                color: '#ef4444',
                                border: '1px solid rgba(239,68,68,0.2)',
                            }}
                        >
                            🚪 Sign Out
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function MobileNav() {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [captureOpen, setCaptureOpen] = useState(false);
    const byId = (id) => PRIMARY.find(x => x.id === id);
    const homeTab = byId('home');
    const phaseTab = byId('phases');
    const projectTab = byId('projects');
    const financeTab = byId('finance');
    const attendanceTab = byId('attendance');
    const chatTab = byId('team-chat');
    const showHome = canAccessRoute('home');
    const showPhases = canAccessRoute('phases');
    const showProjects = canAccessRoute('projects');
    const showFinance = canAccessRoute('finance');
    const showAttendance = canAccessRoute('attendance');
    const showChat = canAccessRoute('team-chat');

    return (
        <>
            <nav
                className="fixed bottom-0 left-0 right-0 z-50"
                style={{
                    padding: '0 8px',
                    paddingBottom: 'max(env(safe-area-inset-bottom, 8px), 8px)',
                    paddingTop: 5,
                }}
            >
                <div
                    className="grid h-[60px] min-w-0 items-stretch overflow-visible rounded-[24px] relative"
                    style={{
                        gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) 60px minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)',
                        background:     'var(--t-surface)',
                        border:         '1px solid var(--t-border)',
                        backdropFilter: 'blur(20px)',
                        boxShadow:      '0 -6px 28px rgba(0,0,0,0.12), 0 4px 14px rgba(0,0,0,0.08)',
                    }}
                >
                    {showHome && homeTab ? <BottomTab {...homeTab} /> : <div />}
                    {showPhases && phaseTab ? <BottomTab {...phaseTab} /> : <div />}
                    {showProjects && projectTab ? <BottomTab {...projectTab} /> : <div />}

                    <div className="relative flex items-center justify-center">
                        <button
                            type="button"
                            onClick={() => setCaptureOpen(true)}
                            className="absolute -top-4 flex h-[58px] w-[58px] flex-col items-center justify-center rounded-[22px] border-4 border-[var(--t-bg)] shadow-2xl transition-transform active:scale-95"
                            style={{
                                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)',
                                color: '#fff',
                            }}
                            aria-label="Quick photo upload"
                            title="Quick photo upload"
                        >
                            <span className="text-[22px] leading-none">📷</span>
                            <span className="mt-0.5 text-[6.5px] font-black uppercase tracking-[0.14em]">Upload</span>
                        </button>
                    </div>

                    {showFinance && financeTab ? <BottomTab {...financeTab} /> : <div />}
                    {showAttendance && attendanceTab ? <BottomTab {...attendanceTab} showGps /> : <div />}
                    {showChat && chatTab ? <BottomTab {...chatTab} /> : <div />}

                    <button
                        onClick={() => setDrawerOpen(true)}
                        className="flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 relative"
                        style={{
                            color: drawerOpen ? 'var(--t-primary)' : 'var(--t-text3)',
                            minWidth: 0,
                            paddingTop: 8,
                            paddingBottom: 7,
                        }}
                    >
                        {drawerOpen && (
                            <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full"
                                style={{ background: 'var(--t-primary)' }} />
                        )}
                        <span className="flex h-6 w-7 items-center justify-center text-[18px] leading-none">⊞</span>
                        <span className="text-[6.8px] font-bold uppercase tracking-[0.1em]">All</span>
                    </button>
                </div>
            </nav>

            {drawerOpen && <AppDrawer onClose={() => setDrawerOpen(false)} />}
            <MobileQuickCapture open={captureOpen} onClose={() => setCaptureOpen(false)} />
        </>
    );
}
