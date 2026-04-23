import React from 'react';
import { NavLink } from 'react-router-dom';
import { getMediaUrl } from '../../services/api';
import { useConstruction } from '../../context/ConstructionContext';
import ThemeToggle from '../common/ThemeToggle';
import ProjectSwitcher from '../common/ProjectSwitcher';

const NAV_SECTIONS = [
    {
        label: 'Overview',
        ids: ['home', 'analytics', 'estimator'],
    },
    {
        label: 'Construction',
        ids: ['permits', 'manage', 'photos', 'timelapse'],
    },
    {
        label: 'Settings',
        ids: ['guides', 'import', 'users'],
    },
];

const DesktopSidebar = ({ user, onLogout, navItems }) => {
    const { dashboardData } = useConstruction();

    const getInitials = (name = '') =>
        name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';

    return (
        <aside
            className="w-64 flex flex-col fixed h-full z-10"
            style={{ background: '#0d1117', borderRight: '1px solid #1f2937' }}
        >
            {/* ── Logo / App Header ── */}
            <div
                className="flex items-center gap-3 px-5 py-5"
                style={{ borderBottom: '1px solid #1f2937' }}
            >
                <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-xl"
                    style={{ background: '#ea580c' }}
                >
                    🏗️
                </div>
                <div className="min-w-0">
                    <h1 className="text-base font-black tracking-tight leading-none text-white">
                        HCMS
                    </h1>
                    <p className="text-[10px] font-semibold uppercase tracking-widest mt-0.5"
                        style={{ color: '#f97316' }}>
                        Construction Manager
                    </p>
                </div>
            </div>

            {/* ── Project Switcher ── */}
            <div className="px-4 py-3" style={{ borderBottom: '1px solid #1f2937' }}>
                <ProjectSwitcher />
            </div>

            {/* ── Navigation ── */}
            <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
                {NAV_SECTIONS.map((section) => {
                    const sectionItems = navItems.filter(item =>
                        section.ids.includes(item.id)
                    );
                    if (sectionItems.length === 0) return null;
                    return (
                        <div key={section.label}>
                            <p
                                className="px-3 text-[9px] font-bold uppercase tracking-widest mb-1.5"
                                style={{ color: '#4b5563' }}
                            >
                                {section.label}
                            </p>
                            <div className="space-y-0.5">
                                {sectionItems.map((item) => (
                                    <NavLink
                                        key={item.id}
                                        to={`/dashboard/desktop/${item.id}`}
                                        className={({ isActive }) =>
                                            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                                                isActive
                                                    ? 'font-semibold'
                                                    : ''
                                            }`
                                        }
                                        style={({ isActive }) => ({
                                            background: isActive
                                                ? 'rgba(249,115,22,0.14)'
                                                : 'transparent',
                                            color: isActive ? '#f97316' : '#9ca3af',
                                        })}
                                        onMouseEnter={e => {
                                            if (!e.currentTarget.classList.contains('active')) {
                                                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                                e.currentTarget.style.color = '#e5e7eb';
                                            }
                                        }}
                                        onMouseLeave={e => {
                                            if (!e.currentTarget.getAttribute('aria-current')) {
                                                e.currentTarget.style.background = 'transparent';
                                                e.currentTarget.style.color = '#9ca3af';
                                            }
                                        }}
                                    >
                                        <span className="text-base shrink-0">{item.icon}</span>
                                        <span className="truncate">{item.label}</span>
                                    </NavLink>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </nav>

            {/* ── Footer ── */}
            <div className="px-3 py-3 space-y-2" style={{ borderTop: '1px solid #1f2937' }}>
                {/* User row */}
                <NavLink
                    to="/dashboard/desktop/profile"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all"
                    style={({ isActive }) => ({
                        background: isActive ? 'rgba(249,115,22,0.14)' : 'transparent',
                    })}
                >
                    <div
                        className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden"
                        style={{ background: '#ea580c', color: '#ffffff' }}
                    >
                        {user?.profile_image ? (
                            <img
                                src={getMediaUrl(user.profile_image)}
                                alt={user.username}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.style.display = 'none';
                                    e.target.parentNode.innerHTML = getInitials(user?.username);
                                }}
                            />
                        ) : (
                            getInitials(user?.username)
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate text-white">{user?.username}</p>
                        <p className="text-[10px] uppercase tracking-wider" style={{ color: '#6b7280' }}>
                            {user?.role?.name || 'Admin'}
                        </p>
                    </div>
                </NavLink>

                {/* Theme toggle + Logout */}
                <div className="flex items-center gap-2">
                    <ThemeToggle className="flex-shrink-0" />
                    <button
                        onClick={onLogout}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg font-medium transition-colors"
                        style={{ color: '#ef4444' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Logout
                    </button>
                </div>

                {/* Developer credit */}
                <NavLink
                    to="/about-developer"
                    className="flex items-center justify-center gap-2 pt-2 mt-1 transition-opacity hover:opacity-80"
                    style={{ borderTop: '1px solid #1f2937' }}
                >
                    <p className="text-[10px]" style={{ color: '#374151' }}>
                        © 2026 Jitendra Khadka
                    </p>
                </NavLink>
            </div>
        </aside>
    );
};

export default DesktopSidebar;
