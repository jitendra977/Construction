/**
 * DesktopSidebar — collapsible left navigation rail.
 *
 * Expanded (256 px): full labels, section headers, project switcher, user card.
 * Collapsed (56 px): icon-only rail with native tooltip via `title`.
 *
 * Props:
 *   collapsed  boolean  — controlled by DesktopDashboard (stored in localStorage)
 *   onToggle   fn       — flip collapsed ↔ expanded
 *   user       object
 *   onLogout   fn
 *   navItems   array
 */
import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { mediaUrl } from '../../services/createApiClient';
import { useConstruction } from '../../context/ConstructionContext';
import ThemeToggle from '../common/ThemeToggle';
import ProjectSwitcher from '../common/ProjectSwitcher';

/* ── CSS ──────────────────────────────────────────────────────── */
const CSS = `
  .sb-link {
    display: flex; align-items: center; gap: 10px;
    padding: 8px 10px; border-radius: 10px;
    font-size: 13px; font-weight: 600;
    color: #6b7280; text-decoration: none;
    transition: background 0.13s, color 0.13s; position: relative;
    white-space: nowrap; overflow: hidden;
  }
  .sb-link:hover { background: rgba(255,255,255,0.06); color: #e5e7eb; }
  .sb-link.active {
    background: linear-gradient(135deg, rgba(249,115,22,0.18), rgba(234,88,12,0.10));
    color: #f97316;
    box-shadow: inset 3px 0 0 #f97316;
  }
  .sb-link.active:hover { background: rgba(249,115,22,0.22); }

  /* Rail (collapsed) link */
  .sb-link-rail {
    display: flex; align-items: center; justify-content: center;
    width: 40px; height: 40px; margin: 1px auto;
    border-radius: 10px; font-size: 17px;
    color: #6b7280; text-decoration: none;
    transition: background 0.13s, color 0.13s;
  }
  .sb-link-rail:hover { background: rgba(255,255,255,0.08); color: #e5e7eb; }
  .sb-link-rail.active {
    background: rgba(249,115,22,0.2);
    color: #f97316;
    box-shadow: 0 0 0 1.5px rgba(249,115,22,0.35);
  }

  .sb-section-btn {
    width: 100%; display: flex; align-items: center; gap: 8px;
    padding: 5px 10px; border-radius: 6px;
    background: transparent; border: none; cursor: pointer;
    transition: background 0.12s;
  }
  .sb-section-btn:hover { background: rgba(255,255,255,0.03); }

  .sb-logout-btn {
    flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px;
    padding: 8px 10px; border-radius: 10px;
    font-size: 12px; font-weight: 700;
    color: #ef4444; background: transparent; border: none; cursor: pointer;
    transition: background 0.13s; text-transform: uppercase; letter-spacing: 0.05em;
  }
  .sb-logout-btn:hover { background: rgba(239,68,68,0.1); }

  .sb-profile-link {
    display: flex; align-items: center; gap: 10px;
    padding: 9px 10px; border-radius: 10px;
    text-decoration: none; transition: background 0.13s;
  }
  .sb-profile-link:hover { background: rgba(255,255,255,0.04); }
  .sb-profile-link.active { background: rgba(249,115,22,0.12); }

  .sb-portal-link {
    display: flex; align-items: center; gap: 8px;
    padding: 7px 10px; border-radius: 10px;
    font-size: 12px; font-weight: 700;
    color: #f97316; text-decoration: none;
    transition: background 0.13s; text-transform: uppercase; letter-spacing: 0.04em;
  }
  .sb-portal-link:hover { background: rgba(249,115,22,0.08); }

  .sb-toggle-btn {
    width: 28px; height: 28px; border-radius: 8px; border: none;
    display: flex; align-items: center; justify-content: center;
    background: rgba(255,255,255,0.05); color: #4b5563; cursor: pointer;
    transition: background 0.13s, color 0.13s; flex-shrink: 0;
  }
  .sb-toggle-btn:hover { background: rgba(255,255,255,0.1); color: #9ca3af; }
`;

/* ── Nav sections ─────────────────────────────────────────────── */
const NAV_SECTIONS = [
    { id: 'projects',     label: 'Projects',      color: '#f97316', ids: ['projects'],                                                                           defaultOpen: true  },
    { id: 'overview',     label: 'Overview',      color: '#6366f1', ids: ['home', 'analytics', 'estimator'],                                                     defaultOpen: true  },
    { id: 'construction', label: 'Construction',  color: '#f59e0b', ids: ['permits', 'phases', 'manage', 'timeline', 'finance', 'resource', 'structure', 'photos', 'timelapse'], defaultOpen: true },
    { id: 'team',         label: 'Team & HR',     color: '#10b981', ids: ['attendance', 'workforce', 'teams', 'location'],                                       defaultOpen: true  },
    { id: 'settings',     label: 'Settings',      color: '#6b7280', ids: ['accounts', 'guides', 'data-transfer'],                                                defaultOpen: false },
];

/* ── Chevron icon ─────────────────────────────────────────────── */
function Chevron({ open }) {
    return (
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none"
            style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0, opacity: 0.35 }}>
            <path d="M4 2.5L7.5 6L4 9.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

/* ── Expanded section ─────────────────────────────────────────── */
function NavSection({ section, items }) {
    const location = useLocation();
    const hasActive = items.some(item => location.pathname.includes(`/dashboard/desktop/${item.id}`));
    const [open, setOpen] = useState(section.defaultOpen || hasActive);
    useEffect(() => { if (hasActive) setOpen(true); }, [hasActive]);
    if (items.length === 0) return null;

    return (
        <div style={{ marginBottom: 2 }}>
            <button className="sb-section-btn" onClick={() => setOpen(o => !o)}>
                <span style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: section.color, flexShrink: 0,
                    opacity: open ? 1 : 0.3,
                }} />
                <span style={{
                    flex: 1, textAlign: 'left', fontSize: 9, fontWeight: 800,
                    textTransform: 'uppercase', letterSpacing: '0.12em',
                    color: open ? '#9ca3af' : '#374151',
                }}>
                    {section.label}
                </span>
                <Chevron open={open} />
            </button>

            <div style={{
                overflow: 'hidden',
                maxHeight: open ? `${items.length * 42}px` : '0px',
                transition: 'max-height 0.22s ease',
            }}>
                <div style={{ padding: '2px 0 4px' }}>
                    {items.map(item => (
                        <NavLink
                            key={item.id}
                            to={`/dashboard/desktop/${item.id}`}
                            title={item.label}
                            className={({ isActive }) => `sb-link${isActive ? ' active' : ''}`}
                        >
                            <span style={{ fontSize: 15, flexShrink: 0, width: 20, textAlign: 'center' }}>{item.icon}</span>
                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 13 }}>{item.label}</span>
                            {item.badge && (
                                <span style={{
                                    fontSize: 8, fontWeight: 900, padding: '2px 5px', borderRadius: 5,
                                    background: 'rgba(249,115,22,0.15)', color: '#f97316',
                                    border: '1px solid rgba(249,115,22,0.2)', letterSpacing: '0.04em', flexShrink: 0,
                                }}>{item.badge}</span>
                            )}
                        </NavLink>
                    ))}
                </div>
            </div>
        </div>
    );
}

/* ── Collapsed (rail) section — icon-only ─────────────────────── */
function RailSection({ items }) {
    if (items.length === 0) return null;
    return (
        <div style={{ padding: '2px 0 6px' }}>
            {items.map(item => (
                <NavLink
                    key={item.id}
                    to={`/dashboard/desktop/${item.id}`}
                    title={item.label}
                    className={({ isActive }) => `sb-link-rail${isActive ? ' active' : ''}`}
                >
                    <span>{item.icon}</span>
                </NavLink>
            ))}
        </div>
    );
}

/* ── Main ─────────────────────────────────────────────────────── */
const DesktopSidebar = ({ user, onLogout, navItems, collapsed, onToggle }) => {
    const { dashboardData } = useConstruction();

    const enriched = navItems.map(item => {
        if (item.id === 'phases' && dashboardData) {
            const t = (dashboardData.tasks  || []).length;
            const p = (dashboardData.phases || []).length;
            return { ...item, badge: `${t}t·${p}p` };
        }
        return item;
    });

    const getInitials = (name = '') =>
        name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';

    const W = collapsed ? 56 : 256;

    return (
        <aside
            style={{
                width: W, flexShrink: 0,
                display: 'flex', flexDirection: 'column',
                position: 'fixed', height: '100%', zIndex: 10,
                background: '#0a0d12', borderRight: '1px solid #1a2030',
                transition: 'width 0.22s cubic-bezier(0.4,0,0.2,1)',
                overflow: 'hidden',
            }}
        >
            <style>{CSS}</style>

            {/* ── Brand / toggle ── */}
            <div style={{
                display: 'flex', alignItems: 'center',
                gap: collapsed ? 0 : 12,
                padding: collapsed ? '16px 8px' : '16px 14px 14px',
                borderBottom: '1px solid #1a2030',
                background: 'linear-gradient(135deg, rgba(249,115,22,0.08) 0%, transparent 60%)',
                transition: 'padding 0.22s ease',
                justifyContent: collapsed ? 'center' : 'flex-start',
            }}>
                {/* Logo */}
                <NavLink
                    to="/dashboard/desktop/home"
                    title="Dashboard"
                    style={{
                        width: 36, height: 36, borderRadius: 11, flexShrink: 0,
                        background: 'linear-gradient(135deg, #f97316, #ea580c)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 17, textDecoration: 'none',
                        boxShadow: '0 3px 10px rgba(249,115,22,0.28)',
                    }}
                >🏗️</NavLink>

                {/* App name — hidden when collapsed */}
                {!collapsed && (
                    <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                        <p style={{ fontSize: 15, fontWeight: 900, color: '#fff', letterSpacing: '-0.01em', lineHeight: 1 }}>
                            HCMS
                        </p>
                        <p style={{ fontSize: 9, fontWeight: 700, color: '#f97316', textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: 2 }}>
                            Construction Manager
                        </p>
                    </div>
                )}

                {/* Toggle button */}
                <button
                    className="sb-toggle-btn"
                    onClick={onToggle}
                    title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    style={{ marginLeft: collapsed ? 0 : 'auto' }}
                >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        {collapsed
                            ? <path d="M6 2l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                            : <path d="M10 2L4 8l6 6"  stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        }
                    </svg>
                </button>
            </div>

            {/* ── Project Switcher (hidden when collapsed) ── */}
            {!collapsed && (
                <div style={{ padding: '8px 10px', borderBottom: '1px solid #1a2030' }}>
                    <ProjectSwitcher />
                </div>
            )}
            {collapsed && <div style={{ height: 6 }} />}

            {/* ── Navigation ── */}
            <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: collapsed ? '4px 0' : '8px 6px' }}>
                {NAV_SECTIONS.map(section => {
                    const sectionItems = enriched.filter(item => section.ids.includes(item.id));
                    if (sectionItems.length === 0) return null;

                    return collapsed
                        ? (
                            <div key={section.id} style={{ borderBottom: '1px solid #1a2030', marginBottom: 2, paddingBottom: 2 }}>
                                <RailSection items={sectionItems} />
                            </div>
                        )
                        : (
                            <NavSection key={section.id} section={section} items={sectionItems} />
                        );
                })}
            </nav>

            {/* ── Footer ── */}
            <div style={{
                padding: collapsed ? '8px 0 10px' : '8px 6px 10px',
                borderTop: '1px solid #1a2030',
                display: 'flex', flexDirection: 'column',
                gap: collapsed ? 2 : 4,
                alignItems: collapsed ? 'center' : 'stretch',
            }}>
                {/* User profile */}
                {collapsed ? (
                    <NavLink
                        to="/dashboard/desktop/accounts/profile"
                        title={user?.username || 'Profile'}
                        style={{
                            width: 36, height: 36, borderRadius: 10, margin: '0 auto',
                            background: 'linear-gradient(135deg,#f97316,#ea580c)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 13, fontWeight: 800, color: '#fff', overflow: 'hidden',
                            textDecoration: 'none',
                        }}
                    >
                        {user?.profile_image
                            ? <img src={mediaUrl(user.profile_image)} alt={user?.username}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={e => { e.target.style.display = 'none'; }} />
                            : getInitials(user?.username)
                        }
                    </NavLink>
                ) : (
                    <NavLink
                        to="/dashboard/desktop/accounts/profile"
                        className={({ isActive }) => `sb-profile-link${isActive ? ' active' : ''}`}
                    >
                        <div style={{
                            width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                            background: 'linear-gradient(135deg,#f97316,#ea580c)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 12, fontWeight: 800, color: '#fff', overflow: 'hidden',
                        }}>
                            {user?.profile_image
                                ? <img src={mediaUrl(user.profile_image)} alt={user?.username}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    onError={e => { e.target.style.display = 'none'; }} />
                                : getInitials(user?.username)
                            }
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
                )}

                {/* Worker portal */}
                {collapsed ? (
                    <a href="/worker" target="_blank" rel="noopener noreferrer"
                        title="Worker Portal"
                        style={{
                            width: 36, height: 36, borderRadius: 10, margin: '0 auto',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 16, textDecoration: 'none', color: '#f97316',
                            transition: 'background 0.13s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(249,115,22,0.1)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                        📱
                    </a>
                ) : (
                    <a href="/worker" target="_blank" rel="noopener noreferrer" className="sb-portal-link">
                        <span style={{ fontSize: 14 }}>📱</span>
                        <span style={{ flex: 1 }}>Worker Portal</span>
                        <span style={{ fontSize: 10, opacity: 0.4 }}>↗</span>
                    </a>
                )}

                {/* Theme + Logout */}
                <div style={{
                    display: 'flex',
                    flexDirection: collapsed ? 'column' : 'row',
                    alignItems: 'center', gap: 4,
                }}>
                    <ThemeToggle />
                    {collapsed ? (
                        <button
                            onClick={onLogout}
                            title="Sign Out"
                            style={{
                                width: 36, height: 36, borderRadius: 10,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 16, background: 'transparent', border: 'none', cursor: 'pointer',
                                color: '#ef4444', transition: 'background 0.13s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                            🚪
                        </button>
                    ) : (
                        <button onClick={onLogout} className="sb-logout-btn">
                            <span>🚪</span> Sign Out
                        </button>
                    )}
                </div>

                {/* Credit */}
                {!collapsed && (
                    <NavLink to="/about-developer" style={{ textAlign: 'center', paddingTop: 6, textDecoration: 'none', display: 'block' }}>
                        <p style={{ fontSize: 9, color: '#1f2937' }}>© 2026 Jitendra Khadka</p>
                    </NavLink>
                )}
            </div>
        </aside>
    );
};

export default DesktopSidebar;
