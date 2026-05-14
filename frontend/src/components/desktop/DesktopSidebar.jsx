import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { mediaUrl } from '../../services/createApiClient';
import { useConstruction } from '../../context/ConstructionContext';
import ThemeToggle from '../common/ThemeToggle';
import ProjectSwitcher from '../common/ProjectSwitcher';

/* ── CSS ──────────────────────────────────────────────────────── */
const CSS = `
  .sb2-link {
    display: flex; align-items: center; gap: 10px;
    padding: 9px 12px; border-radius: 10px;
    font-size: 13px; font-weight: 600;
    color: #6b7280; text-decoration: none;
    transition: all 0.15s; position: relative;
    white-space: nowrap; overflow: hidden;
  }
  .sb2-link:hover {
    background: rgba(255,255,255,0.06);
    color: #e5e7eb;
  }
  .sb2-link.active {
    background: linear-gradient(135deg, rgba(249,115,22,0.18) 0%, rgba(234,88,12,0.10) 100%);
    color: #f97316;
    box-shadow: inset 3px 0 0 #f97316;
  }
  .sb2-link.active:hover { background: rgba(249,115,22,0.22); }

  .sb2-section-btn {
    width: 100%; display: flex; align-items: center; gap: 8px;
    padding: 5px 12px; border-radius: 6px;
    background: transparent; border: none; cursor: pointer;
    transition: background 0.15s;
  }
  .sb2-section-btn:hover { background: rgba(255,255,255,0.03); }

  .sb2-logout-btn {
    flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px;
    padding: 8px 12px; border-radius: 10px;
    font-size: 12px; font-weight: 700;
    color: #ef4444; background: transparent; border: none; cursor: pointer;
    transition: background 0.15s; text-transform: uppercase; letter-spacing: 0.05em;
  }
  .sb2-logout-btn:hover { background: rgba(239,68,68,0.1); }

  .sb2-profile-link {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 12px; border-radius: 10px;
    text-decoration: none; transition: background 0.15s;
  }
  .sb2-profile-link:hover { background: rgba(255,255,255,0.04); }
  .sb2-profile-link.active { background: rgba(249,115,22,0.12); }

  .sb2-portal-link {
    display: flex; align-items: center; gap: 8px;
    padding: 8px 12px; border-radius: 10px;
    font-size: 12px; font-weight: 700;
    color: #f97316; text-decoration: none;
    transition: background 0.15s; text-transform: uppercase; letter-spacing: 0.04em;
  }
  .sb2-portal-link:hover { background: rgba(249,115,22,0.08); }
`;

/* ── Nav sections ─────────────────────────────────────────────── */
const NAV_SECTIONS = [
    { id: 'projects',     label: 'Projects',      icon: '🗂️',  ids: ['projects'],                                                defaultOpen: true  },
    { id: 'overview',     label: 'Overview',      icon: '📊',  ids: ['home', 'analytics', 'estimator'],                         defaultOpen: true  },
    { id: 'construction', label: 'Construction',  icon: '🏗️', ids: ['permits', 'phases', 'manage', 'timeline', 'finance', 'resource', 'structure', 'photos', 'timelapse'], defaultOpen: true },
    { id: 'team',         label: 'Team & HR',     icon: '👷',  ids: ['attendance', 'workforce', 'location'],                    defaultOpen: true  },
    { id: 'settings',     label: 'Settings',      icon: '⚙️',  ids: ['accounts', 'guides', 'data-transfer'],                   defaultOpen: false },
];

const SECTION_COLORS = {
    projects:     '#f97316',
    overview:     '#6366f1',
    construction: '#f59e0b',
    team:         '#10b981',
    settings:     '#6b7280',
};

function Chevron({ open }) {
    return (
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none"
            style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease', flexShrink: 0, opacity: 0.4 }}>
            <path d="M4 2.5L7.5 6L4 9.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function NavSection({ section, items }) {
    const location = useLocation();
    const hasActive = items.some(item => location.pathname.includes(`/dashboard/desktop/${item.id}`));
    const [open, setOpen] = useState(section.defaultOpen || hasActive);
    useEffect(() => { if (hasActive) setOpen(true); }, [hasActive]);
    if (items.length === 0) return null;

    const color = SECTION_COLORS[section.id] || '#6b7280';

    return (
        <div style={{ marginBottom: 2 }}>
            <button className="sb2-section-btn" onClick={() => setOpen(o => !o)}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0, opacity: open ? 1 : 0.35 }} />
                <span style={{ flex: 1, textAlign: 'left', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: open ? '#9ca3af' : '#4b5563' }}>
                    {section.label}
                </span>
                <Chevron open={open} />
            </button>

            <div style={{
                overflow: 'hidden',
                maxHeight: open ? `${items.length * 44}px` : '0px',
                transition: 'max-height 0.25s ease',
            }}>
                <div style={{ padding: '2px 0 4px' }}>
                    {items.map(item => (
                        <NavLink
                            key={item.id}
                            to={`/dashboard/desktop/${item.id}`}
                            className={({ isActive }) => `sb2-link${isActive ? ' active' : ''}`}
                        >
                            <span style={{ fontSize: 15, flexShrink: 0, width: 20, textAlign: 'center' }}>{item.icon}</span>
                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
                            {item.badge && (
                                <span style={{
                                    fontSize: 8, fontWeight: 900, padding: '2px 6px', borderRadius: 5,
                                    background: 'rgba(249,115,22,0.15)', color: '#f97316',
                                    border: '1px solid rgba(249,115,22,0.2)', letterSpacing: '0.04em',
                                    flexShrink: 0,
                                }}>{item.badge}</span>
                            )}
                        </NavLink>
                    ))}
                </div>
            </div>
        </div>
    );
}

/* ── Main ─────────────────────────────────────────────────────── */
const DesktopSidebar = ({ user, onLogout, navItems }) => {
    const { dashboardData } = useConstruction();

    const enrichedNavItems = navItems.map(item => {
        if (item.id === 'phases' && dashboardData) {
            const t = (dashboardData.tasks  || []).length;
            const p = (dashboardData.phases || []).length;
            return { ...item, badge: `${t}t·${p}p` };
        }
        return item;
    });

    const getInitials = (name = '') =>
        name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';

    return (
        <aside className="w-64 flex flex-col fixed h-full z-10"
            style={{ background: '#0a0d12', borderRight: '1px solid #1a2030' }}>
            <style>{CSS}</style>

            {/* ── Brand ── */}
            <NavLink to="/dashboard/desktop/home"
                style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '18px 18px 16px', textDecoration: 'none',
                    borderBottom: '1px solid #1a2030',
                    background: 'linear-gradient(135deg, rgba(249,115,22,0.08) 0%, transparent 60%)',
                }}>
                <div style={{
                    width: 38, height: 38, borderRadius: 12,
                    background: 'linear-gradient(135deg, #f97316, #ea580c)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, flexShrink: 0,
                    boxShadow: '0 4px 12px rgba(249,115,22,0.3)',
                }}>🏗️</div>
                <div>
                    <p style={{ fontSize: 16, fontWeight: 900, color: '#fff', letterSpacing: '-0.01em', lineHeight: 1 }}>HCMS</p>
                    <p style={{ fontSize: 9, fontWeight: 700, color: '#f97316', textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: 2 }}>
                        Construction Manager
                    </p>
                </div>
            </NavLink>

            {/* ── Project Switcher ── */}
            <div style={{ padding: '10px 12px', borderBottom: '1px solid #1a2030' }}>
                <ProjectSwitcher />
            </div>

            {/* ── Nav ── */}
            <nav style={{ flex: 1, overflowY: 'auto', padding: '10px 8px' }}>
                {NAV_SECTIONS.map(section => {
                    const sectionItems = enrichedNavItems.filter(item => section.ids.includes(item.id));
                    return <NavSection key={section.id} section={section} items={sectionItems} />;
                })}
            </nav>

            {/* ── Footer ── */}
            <div style={{ padding: '10px 8px 12px', borderTop: '1px solid #1a2030', display: 'flex', flexDirection: 'column', gap: 4 }}>

                {/* User */}
                <NavLink to="/dashboard/desktop/profile"
                    className={({ isActive }) => `sb2-profile-link${isActive ? ' active' : ''}`}>
                    <div style={{
                        width: 32, height: 32, borderRadius: 10,
                        background: 'linear-gradient(135deg, #f97316, #ea580c)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 800, color: '#fff', flexShrink: 0, overflow: 'hidden',
                    }}>
                        {user?.profile_image ? (
                            <img src={mediaUrl(user.profile_image)} alt={user?.username}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={e => { e.target.style.display = 'none'; }} />
                        ) : getInitials(user?.username)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: '#e5e7eb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1 }}>
                            {user?.username || 'User'}
                        </p>
                        <p style={{ fontSize: 9, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>
                            {user?.role?.name || 'Admin'}
                        </p>
                    </div>
                </NavLink>

                {/* Worker portal */}
                <a href="/worker" target="_blank" rel="noopener noreferrer" className="sb2-portal-link">
                    <span style={{ fontSize: 14 }}>📱</span>
                    <span style={{ flex: 1 }}>Worker Portal</span>
                    <span style={{ fontSize: 10, opacity: 0.5 }}>↗</span>
                </a>

                {/* Theme + Logout */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <ThemeToggle />
                    <button onClick={onLogout} className="sb2-logout-btn">
                        <span>🚪</span> Sign Out
                    </button>
                </div>

                {/* Credit */}
                <NavLink to="/about-developer"
                    style={{ textAlign: 'center', paddingTop: 8, textDecoration: 'none', display: 'block' }}>
                    <p style={{ fontSize: 9, color: '#1f2937' }}>© 2026 Jitendra Khadka</p>
                </NavLink>
            </div>
        </aside>
    );
};

export default DesktopSidebar;
