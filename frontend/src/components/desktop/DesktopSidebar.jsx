import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { mediaUrl } from '../../services/createApiClient';
import { useConstruction } from '../../context/ConstructionContext';
import ThemeToggle from '../common/ThemeToggle';
import ProjectSwitcher from '../common/ProjectSwitcher';

/* ─────────────────────────────────────────────────────────────────────────────
   Sidebar CSS — hover / active states defined here so JS mouse handlers can't
   accidentally override React Router's active class on NavLinks.
───────────────────────────────────────────────────────────────────────────── */
const SIDEBAR_CSS = `
  /* Nav item base */
  .sb-nav-link {
    display: flex; align-items: center; gap: 12px;
    padding: 10px 12px; border-radius: 8px;
    font-size: 14px; font-weight: 500;
    color: #9ca3af;
    border-left: 2px solid transparent;
    text-decoration: none;
    transition: background 0.15s, color 0.15s, border-color 0.15s;
  }
  .sb-nav-link:hover {
    background: rgba(255,255,255,0.05);
    color: #e5e7eb;
  }
  .sb-nav-link.active {
    background: rgba(249,115,22,0.14);
    color: #f97316;
    border-left-color: #f97316;
    padding-left: 10px;
  }
  .sb-nav-link.active:hover {
    background: rgba(249,115,22,0.18);
    color: #f97316;
  }

  /* Section header button */
  .sb-section-btn {
    width: 100%; display: flex; align-items: center; gap: 8px;
    padding: 6px 12px; border-radius: 8px;
    background: transparent; border: none; cursor: pointer;
    transition: background 0.15s;
  }
  .sb-section-btn:hover { background: rgba(255,255,255,0.04); }

  /* Footer buttons */
  .sb-footer-btn {
    display: flex; align-items: center; gap: 8px;
    padding: 8px 12px; border-radius: 8px;
    font-size: 14px; font-weight: 500;
    background: transparent; border: none; cursor: pointer;
    text-decoration: none; transition: background 0.15s;
  }
  .sb-footer-btn:hover { background: rgba(255,255,255,0.06); }

  /* Worker portal link */
  .sb-portal-link {
    display: flex; align-items: center; gap: 8px;
    padding: 8px 12px; border-radius: 8px;
    font-size: 14px; font-weight: 500;
    color: #f97316; text-decoration: none;
    transition: background 0.15s;
  }
  .sb-portal-link:hover { background: rgba(249,115,22,0.08); }

  /* Logout button */
  .sb-logout-btn {
    flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px;
    padding: 8px 12px; border-radius: 8px;
    font-size: 14px; font-weight: 500;
    color: #ef4444; background: transparent; border: none; cursor: pointer;
    transition: background 0.15s;
  }
  .sb-logout-btn:hover { background: rgba(239,68,68,0.1); }

  /* User profile link */
  .sb-profile-link {
    display: flex; align-items: center; gap: 12px;
    padding: 10px 12px; border-radius: 8px;
    text-decoration: none; transition: background 0.15s;
  }
  .sb-profile-link:hover { background: rgba(255,255,255,0.04); }
  .sb-profile-link.active { background: rgba(249,115,22,0.14); }

  /* Logo / header link */
  .sb-logo-link {
    display: flex; align-items: center; gap: 12px;
    padding: 20px; text-decoration: none;
    transition: background 0.15s;
    border-bottom: 1px solid #1f2937;
  }
  .sb-logo-link:hover { background: rgba(255,255,255,0.03); }

`;

/* ── Nav structure ────────────────────────────────────────────────────────── */
const NAV_SECTIONS = [
    {
        id: 'projects',
        label: 'Projects',
        icon: '🗂️',
        ids: ['projects'],
        defaultOpen: true,
    },
    {
        id: 'overview',
        label: 'Overview',
        icon: '📊',
        ids: ['home', 'analytics', 'estimator'],
        defaultOpen: true,
    },
    {
        id: 'construction',
        label: 'Construction',
        icon: '🏗️',
        ids: ['permits', 'phases', 'manage', 'timeline', 'finance', 'resource', 'structure', 'photos', 'timelapse'],
        defaultOpen: true,
    },
    {
        id: 'team',
        label: 'Team & HR',
        icon: '👷',
        ids: ['attendance', 'workforce'],
        defaultOpen: true,
    },
    {
        id: 'settings',
        label: 'Settings',
        icon: '⚙️',
        ids: ['accounts', 'guides', 'data-transfer'],
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
            style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease', flexShrink: 0 }}
        >
            <path d="M4 2.5L7.5 6L4 9.5" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

/* ── Collapsible section ──────────────────────────────────────────────────── */
function NavSection({ section, items }) {
    const location = useLocation();

    const hasActive = items.some(item =>
        location.pathname.includes(`/dashboard/desktop/${item.id}`)
    );

    const [open, setOpen] = useState(section.defaultOpen || hasActive);

    // Re-open when navigating into this section
    useEffect(() => {
        if (hasActive) setOpen(true);
    }, [hasActive]);

    if (items.length === 0) return null;

    return (
        <div>
            {/* Section header */}
            <button className="sb-section-btn" onClick={() => setOpen(o => !o)}>
                <span style={{ fontSize: 13, opacity: 0.5, flexShrink: 0 }}>{section.icon}</span>
                <span
                    className="flex-1 text-left"
                    style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6b7280' }}
                >
                    {section.label}
                </span>
                <span
                    style={{
                        fontSize: 9, fontWeight: 900, padding: '2px 6px', borderRadius: 4,
                        background: open ? 'rgba(249,115,22,0.12)' : 'rgba(255,255,255,0.06)',
                        color: open ? '#f97316' : '#4b5563',
                        transition: 'all 0.2s',
                    }}
                >
                    {items.length}
                </span>
                <Chevron open={open} />
            </button>

            {/* Animated slide */}
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
                            className={({ isActive }) => `sb-nav-link${isActive ? ' active' : ''}`}
                        >
                            <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {item.label}
                            </span>
                            {item.badge && (
                                <span style={{
                                    fontSize: 8, fontWeight: 900, padding: '2px 6px',
                                    borderRadius: 5, whiteSpace: 'nowrap', flexShrink: 0,
                                    background: 'rgba(249,115,22,0.15)',
                                    color: '#f97316',
                                    border: '1px solid rgba(249,115,22,0.25)',
                                    letterSpacing: '0.04em',
                                }}>
                                    {item.badge}
                                </span>
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
    const { dashboardData } = useConstruction();

    // Inject live data into nav items
    const enrichedNavItems = navItems.map(item => {
        if (item.id === 'phases' && dashboardData) {
            const t = (dashboardData.tasks  || []).length;
            const p = (dashboardData.phases || []).length;
            return { ...item, badge: `${t}t · ${p}p` };
        }
        return item;
    });

    const getInitials = (name = '') =>
        name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';

    return (
        <aside
            className="w-64 flex flex-col fixed h-full z-10"
            style={{ background: '#0d1117', borderRight: '1px solid #1f2937' }}
        >
            {/* Inject sidebar CSS once */}
            <style>{SIDEBAR_CSS}</style>

            {/* ── Logo / App Header → dashboard home ── */}
            <NavLink to="/dashboard/desktop/home" className="sb-logo-link">
                <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-xl"
                    style={{ background: '#ea580c' }}
                >
                    🏗️
                </div>
                <div className="min-w-0">
                    <h1 className="text-base font-black tracking-tight leading-none text-white">HCMS</h1>
                    <p className="text-[10px] font-semibold uppercase tracking-widest mt-0.5" style={{ color: '#f97316' }}>
                        Construction Manager
                    </p>
                </div>
            </NavLink>

            {/* ── Project Switcher ── */}
            <div className="px-4 py-3" style={{ borderBottom: '1px solid #1f2937' }}>
                <ProjectSwitcher />
            </div>


            {/* ── Navigation ── */}
            <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
                {NAV_SECTIONS.map((section) => {
                    const sectionItems = enrichedNavItems.filter(item => section.ids.includes(item.id));
                    return (
                        <NavSection key={section.id} section={section} items={sectionItems} />
                    );
                })}
            </nav>

            {/* ── Footer ── */}
            <div className="px-3 py-3 space-y-2" style={{ borderTop: '1px solid #1f2937' }}>

                {/* User profile */}
                <NavLink
                    to="/dashboard/desktop/profile"
                    className={({ isActive }) => `sb-profile-link${isActive ? ' active' : ''}`}
                >
                    <div
                        className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden"
                        style={{ background: '#ea580c', color: '#ffffff' }}
                    >
                        {user?.profile_image ? (
                            <img
                                src={mediaUrl(user.profile_image)}
                                alt={user?.username}
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
                        <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6b7280' }}>
                            {user?.role?.name || 'Admin'}
                        </p>
                    </div>
                </NavLink>

                {/* Worker portal */}
                <a
                    href="/worker"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="sb-portal-link"
                    title="Open Worker Portal (phone + PIN login)"
                >
                    <span style={{ fontSize: 15 }}>📱</span>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        Worker Portal
                    </span>
                    <span style={{ fontSize: 10, opacity: 0.6 }}>↗</span>
                </a>

                {/* Theme + Logout */}
                <div className="flex items-center gap-2">
                    <ThemeToggle className="flex-shrink-0" />
                    <button onClick={onLogout} className="sb-logout-btn">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round"
                                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
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
                    <p style={{ fontSize: 10, color: '#374151' }}>© 2026 Jitendra Khadka</p>
                </NavLink>
            </div>
        </aside>
    );
};

export default DesktopSidebar;
