import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { mediaUrl } from '../../services/createApiClient';
import { useConstruction } from '../../context/ConstructionContext';
import ThemeToggle from '../common/ThemeToggle';
import ProjectSwitcher from '../common/ProjectSwitcher';

const NAV_SECTIONS = [
    {
        id:    'projects',
        label: 'Projects',
        icon:  '🗂️',
        ids:   ['projects'],
        defaultOpen: true,
    },
    {
        id:    'overview',
        label: 'Overview',
        icon:  '📊',
        ids:   ['home', 'analytics', 'estimator'],
        defaultOpen: true,
    },
    {
        id:    'construction',
        label: 'Construction',
        icon:  '🏗️',
        ids:   ['permits', 'phases', 'manage', 'timeline', 'finance', 'resource', 'structure', 'photos', 'timelapse'],
        defaultOpen: true,
    },
    {
        id:    'settings',
        label: 'Settings',
        icon:  '⚙️',
        ids:   ['accounts', 'guides', 'import'],
        defaultOpen: false,
    },
];

/* ── Chevron icon ─────────────────────────────────────────────────────────── */
function Chevron({ open }) {
    return (
        <svg
            width="12" height="12"
            viewBox="0 0 12 12"
            fill="none"
            style={{
                transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease',
                flexShrink: 0,
            }}
        >
            <path
                d="M4 2.5L7.5 6L4 9.5"
                stroke="#6b7280"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

/* ── Collapsible section ──────────────────────────────────────────────────── */
function NavSection({ section, items }) {
    const location = useLocation();

    // Auto-open if any item in this section is currently active
    const hasActive = items.some(item =>
        location.pathname.includes(`/dashboard/desktop/${item.id}`)
    );

    const [open, setOpen] = useState(section.defaultOpen || hasActive);

    // Re-open when navigating to a route inside this section
    useEffect(() => {
        if (hasActive) setOpen(true);
    }, [hasActive]);

    if (items.length === 0) return null;

    return (
        <div>
            {/* Section header — clickable to collapse */}
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors group"
                style={{ background: 'transparent' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
                <span className="text-sm shrink-0" style={{ opacity: 0.5 }}>{section.icon}</span>
                <span
                    className="flex-1 text-left text-[10px] font-bold uppercase tracking-widest"
                    style={{ color: '#6b7280' }}
                >
                    {section.label}
                </span>
                <span
                    className="text-[9px] font-bold tabular-nums px-1.5 py-0.5 rounded"
                    style={{
                        background: open ? 'rgba(249,115,22,0.12)' : 'rgba(255,255,255,0.06)',
                        color:      open ? '#f97316'               : '#4b5563',
                        transition: 'all 0.2s',
                    }}
                >
                    {items.length}
                </span>
                <Chevron open={open} />
            </button>

            {/* Items — animated slide */}
            <div
                style={{
                    overflow: 'hidden',
                    maxHeight: open ? `${items.length * 52}px` : '0px',
                    transition: 'max-height 0.25s ease',
                    marginTop: open ? 2 : 0,
                }}
            >
                <div className="space-y-0.5 pb-1">
                    {items.map((item) => (
                        <NavLink
                            key={item.id}
                            to={`/dashboard/desktop/${item.id}`}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
                            style={({ isActive }) => ({
                                background: isActive
                                    ? 'rgba(249,115,22,0.14)'
                                    : 'transparent',
                                color: isActive ? '#f97316' : '#9ca3af',
                                borderLeft: isActive ? '2px solid #f97316' : '2px solid transparent',
                                paddingLeft: isActive ? '10px' : '12px',
                            })}
                            onMouseEnter={e => {
                                if (!e.currentTarget.getAttribute('aria-current')) {
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
                            <span className="flex-1 truncate">{item.label}</span>
                            {item.badge && (
                                <span style={{
                                    fontSize: 8, fontWeight: 900, padding: '2px 6px',
                                    borderRadius: 5, whiteSpace: 'nowrap', flexShrink: 0,
                                    background: 'rgba(249,115,22,0.15)',
                                    color: '#f97316',
                                    border: '1px solid rgba(249,115,22,0.25)',
                                    letterSpacing: '0.04em',
                                }}>{item.badge}</span>
                            )}
                        </NavLink>
                    ))}
                </div>
            </div>
        </div>
    );
}

/* ── Main sidebar ─────────────────────────────────────────────────────────── */
const DesktopSidebar = ({ user, onLogout, navItems }) => {
    const { activeProjectId, projects, dashboardData } = useConstruction();

    // Inject live stats badge into the phases nav item
    const enrichedNavItems = navItems.map(item => {
        if (item.id === 'phases' && dashboardData) {
            const t = (dashboardData.tasks  || []).length;
            const p = (dashboardData.phases || []).length;
            return { ...item, badge: `${t}t · ${p}p` };
        }
        return item;
    });
    const projectList   = Array.isArray(projects) ? projects : [];
    const activeProject = projectList.find(p => p.id === activeProjectId) || null;

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

            {/* ── Active Project Badge ── */}
            {activeProject && (
                <NavLink
                    to={`/dashboard/desktop/projects/${activeProject.id}/overview`}
                    className="flex items-center gap-2 px-4 py-2.5 transition-colors"
                    style={({ isActive }) => ({
                        background:   isActive ? 'rgba(249,115,22,0.10)' : 'rgba(249,115,22,0.05)',
                        borderBottom: '1px solid #1f2937',
                    })}>
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#22c55e' }} />
                    <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#f97316' }}>
                            Active Project
                        </p>
                        <p className="text-xs font-semibold truncate text-white mt-0.5">
                            {activeProject.name}
                        </p>
                    </div>
                    <span className="text-[10px] shrink-0" style={{ color: '#4b5563' }}>→</span>
                </NavLink>
            )}

            {/* ── Navigation ── */}
            <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
                {NAV_SECTIONS.map((section) => {
                    const sectionItems = enrichedNavItems.filter(item =>
                        section.ids.includes(item.id)
                    );
                    return (
                        <NavSection
                            key={section.id}
                            section={section}
                            items={sectionItems}
                        />
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
                                src={mediaUrl(user.profile_image)}
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
