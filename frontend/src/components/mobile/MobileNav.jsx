/**
 * MobileNav — fixed bottom bar + slide-up full-screen app drawer.
 *
 * Bottom bar: Home · Projects · Finance · Workforce · ⊞ All
 * "All" opens a full-screen drawer with every module, active-state aware.
 *
 * Fixes:
 *  - 'import' route corrected to 'data-transfer'
 *  - GPS status dot placed on the Workforce (attendance) tab
 *  - Active-state highlighting in drawer via useLocation
 *  - Finance section merged with Data for balanced layout
 */
import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../../services/auth';
import ThemeToggle from '../common/ThemeToggle';
import { useMobileTracker } from '../../modules/location/context/MobileTrackerContext';

const BASE = '/dashboard/mobile';

// ── Primary bottom tabs ───────────────────────────────────────────────────────
const PRIMARY = [
    { id: 'home',       icon: '🏠',  label: 'Home'     },
    { id: 'projects',   icon: '🗂️', label: 'Projects'  },
    { id: 'finance',    icon: '💰',  label: 'Finance'   },
    { id: 'attendance', icon: '👷',  label: 'Work'      }, // GPS dot here
    { id: 'accounts',   icon: '👤',  label: 'Account'   },
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
            { id: 'attendance', icon: '👷', label: 'Workforce'  },
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
            { id: 'data-transfer',  icon: '🔄', label: 'Data Transfer' }, // fixed: was 'import'
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

// ── GPS status dot (reads MobileTrackerContext) ───────────────────────────────
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
            className="flex-1 flex flex-col items-center justify-center gap-0.5 py-1 relative transition-all"
            style={({ isActive }) => ({
                color:  isActive ? 'var(--t-primary)' : 'var(--t-text3)',
            })}
        >
            {({ isActive }) => (
                <>
                    {/* Icon container with active pill */}
                    <span className="relative flex items-center justify-center w-8 h-6">
                        {isActive && (
                            <span className="absolute inset-x-0 inset-y-0 rounded-full opacity-15"
                                style={{ background: 'var(--t-primary)' }} />
                        )}
                        <span className={`text-xl leading-none relative transition-transform ${isActive ? 'scale-110' : 'scale-100'}`}>
                            {icon}
                        </span>
                        {showGps && <GPSStatusDot />}
                    </span>
                    <span className={`text-[7px] font-bold uppercase tracking-widest transition-all ${
                        isActive ? 'opacity-100' : 'opacity-60'
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
                background:  isActive ? `${sectionColor}18` : 'var(--t-surface)',
                border:      isActive ? `1.5px solid ${sectionColor}50` : '1px solid var(--t-border)',
                boxShadow:   isActive ? `0 0 0 1px ${sectionColor}20` : 'none',
            }}
        >
            {isActive && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
                    style={{ background: sectionColor }} />
            )}
            <span className="text-2xl leading-none">{item.icon}</span>
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

    // Animate in
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

    // Filter sections by search
    const query = search.trim().toLowerCase();
    const filteredSections = query
        ? SECTIONS.map(s => ({
              ...s,
              items: s.items.filter(i => i.label.toLowerCase().includes(query) || i.id.includes(query)),
          })).filter(s => s.items.length > 0)
        : SECTIONS;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-[98]"
                style={{
                    background: 'rgba(0,0,0,0.55)',
                    opacity:    visible ? 1 : 0,
                    transition: 'opacity 0.2s ease',
                    backdropFilter: 'blur(2px)',
                }}
                onClick={close}
            />

            {/* Drawer panel */}
            <div
                className="fixed inset-x-0 bottom-0 z-[99] flex flex-col rounded-t-3xl overflow-hidden"
                style={{
                    maxHeight: '92vh',
                    background:    'var(--t-bg)',
                    boxShadow:     '0 -16px 60px rgba(0,0,0,0.3)',
                    transform:     visible ? 'translateY(0)' : 'translateY(100%)',
                    transition:    'transform 0.22s cubic-bezier(0.32,0.72,0,1)',
                }}
            >
                {/* Handle */}
                <div className="flex justify-center pt-3 pb-1 shrink-0">
                    <div className="w-10 h-1 rounded-full" style={{ background: 'var(--t-border)' }} />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 shrink-0"
                    style={{ borderBottom: '1px solid var(--t-border)' }}>
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-lg"
                            style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)' }}>🏗️</div>
                        <div>
                            <p className="text-sm font-black leading-none" style={{ color: 'var(--t-text)' }}>All Features</p>
                            <p className="text-[9px] font-bold uppercase tracking-widest mt-0.5" style={{ color: '#f97316' }}>
                                HCMS Navigation
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                        <button
                            onClick={close}
                            className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-base transition-colors"
                            style={{ background: 'var(--t-surface2)', color: 'var(--t-text3)', border: '1px solid var(--t-border)' }}
                        >✕</button>
                    </div>
                </div>

                {/* Search bar */}
                <div className="px-4 pt-3 pb-2 shrink-0">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                        style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
                        <span className="text-sm" style={{ color: 'var(--t-text3)' }}>🔍</span>
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search features…"
                            className="flex-1 bg-transparent text-xs outline-none"
                            style={{ color: 'var(--t-text)', caretColor: 'var(--t-primary)' }}
                            autoComplete="off"
                        />
                        {search && (
                            <button onClick={() => setSearch('')}
                                className="text-sm" style={{ color: 'var(--t-text3)' }}>✕</button>
                        )}
                    </div>
                </div>

                {/* Currently active page quick indicator */}
                {!query && activeId && activeId !== 'home' && (
                    <div className="px-4 pb-2 shrink-0">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
                            style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
                            <span className="text-[9px]" style={{ color: 'var(--t-text3)' }}>Currently viewing:</span>
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
                                <span className="text-sm leading-none">{section.icon}</span>
                                <p className="text-[9px] font-black uppercase tracking-[0.14em]"
                                    style={{ color: section.color }}>
                                    {section.label}
                                </p>
                                <div className="flex-1 h-px" style={{ background: `${section.color}25` }} />
                            </div>

                            {/* Items grid */}
                            <div className={`grid gap-2 ${
                                section.items.length <= 3 ? 'grid-cols-3' :
                                section.items.length <= 4 ? 'grid-cols-4' :
                                'grid-cols-4'
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
                            style={{ background: '#ef444412', color: '#ef4444', border: '1px solid #ef444428' }}
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
    const location = useLocation();

    // Close drawer on route change
    useEffect(() => { setDrawerOpen(false); }, [location.pathname]);

    return (
        <>
            <nav
                className="fixed bottom-0 left-0 right-0 z-50 px-2"
                style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 8px), 8px)', paddingTop: '6px' }}
            >
                <div
                    className="flex items-center h-[58px] rounded-2xl px-1"
                    style={{
                        background:     'var(--t-surface)',
                        border:         '1px solid var(--t-border)',
                        backdropFilter: 'blur(20px)',
                        boxShadow:      '0 -4px 30px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)',
                    }}
                >
                    {PRIMARY.map(item => (
                        <BottomTab
                            key={item.id}
                            {...item}
                            showGps={item.id === 'attendance'} // GPS dot on workforce tab
                        />
                    ))}

                    {/* Separator */}
                    <div className="w-px h-7 mx-0.5 shrink-0" style={{ background: 'var(--t-border)' }} />

                    {/* All / drawer toggle */}
                    <button
                        onClick={() => setDrawerOpen(true)}
                        className="flex-1 flex flex-col items-center justify-center gap-0.5 py-1 transition-all active:scale-95"
                        style={{ color: drawerOpen ? 'var(--t-primary)' : 'var(--t-text3)' }}
                    >
                        <span className="text-xl leading-none">⊞</span>
                        <span className="text-[7px] font-bold uppercase tracking-widest">All</span>
                    </button>
                </div>
            </nav>

            {drawerOpen && <AppDrawer onClose={() => setDrawerOpen(false)} />}
        </>
    );
}
