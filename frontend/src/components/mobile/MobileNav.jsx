/**
 * MobileNav — responsive bottom navigation with full app-menu drawer.
 *
 * Bottom bar: Home · Projects · Finance · Accounts · ⊞ All
 * "All" opens a full-screen drawer with every module organised by section.
 */
import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { authService } from '../../services/auth';
import ThemeToggle from '../common/ThemeToggle';

const BASE = '/dashboard/mobile';

// ── Primary tabs (always visible in the bar) ─────────────────────────────────
const PRIMARY = [
    { id: 'home',     icon: '🏠', label: 'Home'     },
    { id: 'projects', icon: '🗂️', label: 'Projects' },
    { id: 'finance',  icon: '💰', label: 'Finance'  },
    { id: 'accounts', icon: '👤', label: 'Account'  },
];

// ── All sections for the drawer ──────────────────────────────────────────────
const SECTIONS = [
    {
        label: 'Overview',
        color: '#6366f1',
        items: [
            { id: 'home',      icon: '🏠', label: 'Dashboard'  },
            { id: 'analytics', icon: '📈', label: 'Analytics'  },
            { id: 'estimator', icon: '🧮', label: 'Estimator'  },
        ],
    },
    {
        label: 'Construction',
        color: '#f97316',
        items: [
            { id: 'projects',  icon: '🗂️', label: 'Projects'  },
            { id: 'phases',    icon: '📋', label: 'Phases'     },
            { id: 'timeline',  icon: '📅', label: 'Timeline'   },
            { id: 'manage',    icon: '🛠️', label: 'Manage'    },
            { id: 'permits',   icon: '📜', label: 'Permits'    },
            { id: 'structure', icon: '🏛️', label: 'Structure'  },
            { id: 'resource',  icon: '🧱', label: 'Resources'  },
            { id: 'attendance', icon: '🕐', label: 'Attendance' },
        ],
    },
    {
        label: 'Finance',
        color: '#10b981',
        items: [
            { id: 'finance',   icon: '💰', label: 'Finance'    },
        ],
    },
    {
        label: 'Media',
        color: '#3b82f6',
        items: [
            { id: 'photos',    icon: '📸', label: 'Photos'     },
            { id: 'timelapse', icon: '🎞️', label: 'Timelapse'  },
        ],
    },
    {
        label: 'Account & Settings',
        color: '#8b5cf6',
        items: [
            { id: 'accounts',  icon: '👤', label: 'Accounts'   },
            { id: 'guides',    icon: '📚', label: 'User Guide' },
            { id: 'import',    icon: '📥', label: 'Import Data'},
        ],
    },
];

// ── NavLink tab ───────────────────────────────────────────────────────────────
function Tab({ id, icon, label }) {
    return (
        <NavLink
            to={`${BASE}/${id}`}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-all py-1"
            style={({ isActive }) => ({
                color:     isActive ? 'var(--t-primary)' : 'var(--t-text3)',
                transform: isActive ? 'scale(1.12)'      : 'scale(1)',
                filter:    isActive ? 'drop-shadow(0 0 6px var(--t-primary))' : 'none',
            })}
        >
            <span className="text-xl leading-none">{icon}</span>
            <span className="text-[7px] font-bold uppercase tracking-widest">{label}</span>
        </NavLink>
    );
}

// ── Full-screen App Menu ──────────────────────────────────────────────────────
function AppMenu({ onClose }) {
    const navigate = useNavigate();

    const go = (id) => { navigate(`${BASE}/${id}`); onClose(); };

    const handleLogout = async () => {
        await authService.logout();
        navigate('/login');
    };

    return (
        <div className="fixed inset-0 z-[100] flex flex-col" style={{ background: 'var(--t-bg)' }}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 shrink-0"
                style={{ borderBottom: '1px solid var(--t-border)', background: 'var(--t-surface)' }}>
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
                        style={{ background: '#f97316' }}>🏗️</div>
                    <div>
                        <p className="text-sm font-black" style={{ color: 'var(--t-text)' }}>HCMS</p>
                        <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#f97316' }}>All Features</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <ThemeToggle />
                    <button onClick={onClose}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-lg font-bold transition-colors"
                        style={{ background: 'var(--t-surface2)', color: 'var(--t-text3)', border: '1px solid var(--t-border)' }}>
                        ✕
                    </button>
                </div>
            </div>

            {/* Sections */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
                {SECTIONS.map((section) => (
                    <div key={section.label}>
                        <p className="text-[9px] font-black uppercase tracking-[0.15em] mb-2 px-1"
                            style={{ color: section.color }}>{section.label}</p>
                        <div className="grid grid-cols-3 gap-2">
                            {section.items.map((item) => (
                                <button key={item.id} onClick={() => go(item.id)}
                                    className="flex flex-col items-center justify-center gap-2 py-4 rounded-2xl transition-all active:scale-95"
                                    style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)' }}
                                    onTouchStart={e => {
                                        e.currentTarget.style.background = `${section.color}15`;
                                        e.currentTarget.style.borderColor = `${section.color}50`;
                                    }}
                                    onTouchEnd={e => {
                                        e.currentTarget.style.background = 'var(--t-surface)';
                                        e.currentTarget.style.borderColor = 'var(--t-border)';
                                    }}>
                                    <span className="text-2xl">{item.icon}</span>
                                    <span className="text-[9px] font-black uppercase tracking-wide text-center leading-tight"
                                        style={{ color: 'var(--t-text3)' }}>{item.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                ))}

                {/* Logout */}
                <div className="pt-2 pb-8">
                    <button onClick={handleLogout}
                        className="w-full py-3 rounded-2xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest"
                        style={{ background: '#ef444415', color: '#ef4444', border: '1px solid #ef444430' }}>
                        🚪 Sign Out
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function MobileNav() {
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <>
            <nav className="fixed bottom-0 left-0 right-0 z-50 px-2 pb-[env(safe-area-inset-bottom,10px)] pt-2">
                <div className="flex items-center h-16 rounded-2xl shadow-2xl px-1"
                    style={{
                        background:      'var(--t-surface)',
                        border:          '1px solid var(--t-border)',
                        backdropFilter:  'blur(20px)',
                        boxShadow:       '0 -8px 40px rgba(0,0,0,0.15)',
                    }}>

                    {PRIMARY.map((item) => <Tab key={item.id} {...item} />)}

                    <div className="w-px h-8 mx-1 shrink-0" style={{ background: 'var(--t-border)' }} />

                    <button onClick={() => setMenuOpen(true)}
                        className="flex-1 flex flex-col items-center justify-center gap-0.5 py-1 transition-all"
                        style={{ color: menuOpen ? 'var(--t-primary)' : 'var(--t-text3)' }}>
                        <span className="text-xl leading-none">⊞</span>
                        <span className="text-[7px] font-bold uppercase tracking-widest">All</span>
                    </button>
                </div>
            </nav>

            {menuOpen && <AppMenu onClose={() => setMenuOpen(false)} />}
        </>
    );
}
