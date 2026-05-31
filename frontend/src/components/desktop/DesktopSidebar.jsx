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
import React, { useState, useEffect, useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { mediaUrl } from '../../services/createApiClient';
import { authService } from '../../services/auth';
import workerPortalApi from '../../services/workerPortalApi';
import { useConstruction } from '../../context/ConstructionContext';
import ThemeToggle from '../common/ThemeToggle';
import ProjectSwitcher from '../common/ProjectSwitcher';

/* ── CSS ──────────────────────────────────────────────────────── */
const CSS = `
  .sb-link {
    display: flex; align-items: center; gap: 10px;
    padding: 7px 10px; border-radius: 8px;
    font-size: 12.5px; font-weight: 600;
    color: var(--t-text2); text-decoration: none;
    transition: background 0.13s, color 0.13s, box-shadow 0.13s;
    position: relative; white-space: nowrap; overflow: hidden;
  }
  .sb-link:hover {
    background: var(--t-surface2);
    color: var(--t-text);
  }
  .sb-link.active {
    background: color-mix(in srgb, var(--t-primary) 12%, transparent);
    color: var(--t-primary);
    box-shadow: inset 3px 0 0 var(--t-primary);
    font-weight: 700;
  }
  .sb-link.active:hover {
    background: color-mix(in srgb, var(--t-primary) 18%, transparent);
  }

  /* Rail (collapsed) icon links */
  .sb-link-rail {
    display: flex; align-items: center; justify-content: center;
    width: 40px; height: 38px; margin: 1px auto;
    border-radius: 10px; font-size: 16px;
    color: var(--t-text2); text-decoration: none;
    transition: background 0.13s, color 0.13s, box-shadow 0.13s;
  }
  .sb-link-rail:hover {
    background: var(--t-surface2);
    color: var(--t-text);
  }
  .sb-link-rail.active {
    background: color-mix(in srgb, var(--t-primary) 18%, transparent);
    color: var(--t-primary);
    box-shadow: 0 0 0 1.5px color-mix(in srgb, var(--t-primary) 35%, transparent);
  }

  .sb-section-btn {
    width: 100%; display: flex; align-items: center; gap: 8px;
    padding: 4px 10px 3px; margin-top: 10px;
    background: transparent; border: none; cursor: pointer;
    transition: opacity 0.12s;
  }
  .sb-section-btn:hover { opacity: 0.9; }

  .sb-logout-btn {
    flex: 1; display: flex; align-items: center; justify-content: center; gap: 7px;
    padding: 7px 10px; border-radius: 8px;
    font-size: 11.5px; font-weight: 700;
    color: #ef4444; background: transparent; border: none; cursor: pointer;
    transition: background 0.13s; text-transform: uppercase; letter-spacing: 0.05em;
  }
  .sb-logout-btn:hover { background: rgba(239,68,68,0.1); }

  .sb-profile-link {
    display: flex; align-items: center; gap: 10px;
    padding: 8px 10px; border-radius: 8px;
    text-decoration: none; transition: background 0.13s;
  }
  .sb-profile-link:hover { background: var(--t-surface2); }
  .sb-profile-link.active { background: color-mix(in srgb, var(--t-primary) 10%, transparent); }

  .sb-portal-link {
    display: flex; align-items: center; gap: 8px;
    padding: 6px 10px; border-radius: 8px;
    font-size: 11px; font-weight: 700;
    color: var(--t-primary); text-decoration: none;
    transition: background 0.13s; text-transform: uppercase; letter-spacing: 0.04em;
  }
  .sb-portal-link:hover {
    background: color-mix(in srgb, var(--t-primary) 8%, transparent);
  }

  .sb-toggle-btn {
    width: 26px; height: 26px; border-radius: 7px; border: none;
    display: flex; align-items: center; justify-content: center;
    background: var(--t-surface2); color: var(--t-text2); cursor: pointer;
    transition: background 0.13s, color 0.13s; flex-shrink: 0;
    border: 1px solid var(--t-border);
  }
  .sb-toggle-btn:hover { background: var(--t-surface3); color: var(--t-text); }

  /* Custom scrollbar */
  .sb-nav::-webkit-scrollbar { width: 3px; }
  .sb-nav::-webkit-scrollbar-track { background: transparent; }
  .sb-nav::-webkit-scrollbar-thumb {
    background: var(--t-border);
    border-radius: 2px;
  }
`;

/* ── Nav sections ─────────────────────────────────────────────── */
const NAV_SECTIONS = [
    { id: 'projects',     label: 'Projects',      color: 'var(--t-primary)', ids: ['projects'],                                                                           defaultOpen: true  },
    { id: 'overview',     label: 'Overview',      color: '#6366f1',          ids: ['home', 'analytics', 'estimator'],                                                     defaultOpen: true  },
    { id: 'construction', label: 'Construction',  color: '#f59e0b',          ids: ['permits', 'phases', 'manage', 'timeline', 'finance', 'resource', 'structure', 'photos', 'timelapse'], defaultOpen: true },
    { id: 'team',         label: 'Team & HR',     color: '#10b981',          ids: ['attendance', 'workforce', 'team-chat', 'location', 'cctv'],                    defaultOpen: true  },
    { id: 'admin',        label: 'Admin & Config', color: 'var(--t-text2)',   ids: ['accounts', 'settings', 'guides', 'data-transfer', 'backups'],                           defaultOpen: false },
];

/* ── Chevron icon ─────────────────────────────────────────────── */
function Chevron({ open }) {
    return (
        <svg width="9" height="9" viewBox="0 0 12 12" fill="none"
            style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0, opacity: 0.6 }}>
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
        <div>
            {/* Section header */}
            <button className="sb-section-btn" onClick={() => setOpen(o => !o)}>
                {/* Thin colored vertical bar */}
                <span style={{
                    width: 2, height: 12, borderRadius: 1,
                    background: section.color, flexShrink: 0,
                    opacity: open ? 1 : 0.4,
                    transition: 'opacity 0.2s',
                }} />
                <span style={{
                    flex: 1, textAlign: 'left',
                    fontSize: 9, fontWeight: 800,
                    textTransform: 'uppercase', letterSpacing: '0.13em',
                    color: open ? 'var(--t-text)' : 'var(--t-text3)',
                    fontFamily: "'DM Mono', monospace",
                    transition: 'color 0.2s',
                }}>
                    {section.label}
                </span>
                <Chevron open={open} />
            </button>

            <div style={{
                overflow: 'hidden',
                maxHeight: open ? `${items.length * 38}px` : '0px',
                transition: 'max-height 0.22s ease',
            }}>
                <div style={{ padding: '2px 0 6px' }}>
                    {items.map(item => (
                        <NavLink
                            key={item.id}
                            to={`/dashboard/desktop/${item.id}`}
                            title={item.label}
                            className={({ isActive }) => `sb-link${isActive ? ' active' : ''}`}
                        >
                            <span style={{ fontSize: 14, flexShrink: 0, width: 20, textAlign: 'center', lineHeight: 1 }}>{item.icon}</span>
                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 12.5 }}>{item.label}</span>
                            {item.badge && (
                                <span style={{
                                    fontSize: 8, fontWeight: 900, padding: '2px 5px', borderRadius: 4,
                                    background: 'color-mix(in srgb, var(--t-primary) 15%, transparent)',
                                    color: 'var(--t-primary)',
                                    border: '1px solid color-mix(in srgb, var(--t-primary) 25%, transparent)',
                                    letterSpacing: '0.04em', flexShrink: 0,
                                    fontFamily: "'DM Mono', monospace",
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
        <div style={{ padding: '2px 0 4px' }}>
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
    const [launchingWorkerPortal, setLaunchingWorkerPortal] = useState(false);

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

    const canViewProfile = authService.hasPermission('can_view_profile') || authService.hasPermission('can_manage_admin_config') || authService.hasPermission('can_manage_users');

    const launchWorkerPortal = useCallback(async () => {
        if (launchingWorkerPortal) return;
        const popup = window.open('about:blank', '_blank');
        setLaunchingWorkerPortal(true);
        try {
            await workerPortalApi.launchFromAdmin();
            if (popup) popup.location.href = '/worker';
            else window.location.href = '/worker';
        } catch (e) {
            if (popup) popup.location.href = '/worker';
            else window.location.href = '/worker';
        } finally {
            setLaunchingWorkerPortal(false);
        }
    }, [launchingWorkerPortal]);

    const W = collapsed ? 56 : 256;

    return (
        <aside
            style={{
                width: W, flexShrink: 0,
                display: 'flex', flexDirection: 'column',
                position: 'fixed', height: '100%', zIndex: 10,
                background: 'var(--t-surface)',
                borderRight: '1px solid var(--t-border)',
                transition: 'width 0.22s cubic-bezier(0.4,0,0.2,1)',
                overflow: 'hidden',
            }}
        >
            <style>{CSS}</style>

            {/* ── Brand / toggle ── */}
            <div style={{
                display: 'flex', alignItems: 'center',
                gap: collapsed ? 0 : 10,
                padding: collapsed ? '14px 8px' : '14px 12px',
                borderBottom: '1px solid var(--t-border)',
                transition: 'padding 0.22s ease',
                justifyContent: collapsed ? 'center' : 'flex-start',
            }}>
                {/* Logo mark */}
                <NavLink
                    to="/dashboard/desktop/home"
                    title="Dashboard"
                    style={{
                        width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                        background: 'linear-gradient(135deg, var(--t-primary), color-mix(in srgb, var(--t-primary) 75%, black))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 16, textDecoration: 'none',
                        boxShadow: '0 3px 10px color-mix(in srgb, var(--t-primary) 30%, transparent)',
                    }}
                >🏗️</NavLink>

                {/* App name — hidden when collapsed */}
                {!collapsed && (
                    <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                        <p style={{ fontSize: 14, fontWeight: 900, color: 'var(--t-text)', letterSpacing: '-0.01em', lineHeight: 1 }}>
                            HCMS
                        </p>
                        <p style={{
                            fontSize: 8, fontWeight: 700, color: 'var(--t-primary)',
                            textTransform: 'uppercase', letterSpacing: '0.13em', marginTop: 2,
                            fontFamily: "'DM Mono', monospace",
                        }}>
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
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                        {collapsed
                            ? <path d="M6 2l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                            : <path d="M10 2L4 8l6 6"  stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        }
                    </svg>
                </button>
            </div>

            {/* ── Project Switcher ── */}
            {!collapsed && (
                <div style={{ padding: '7px 8px', borderBottom: '1px solid var(--t-border)' }}>
                    <ProjectSwitcher />
                </div>
            )}
            {collapsed && <div style={{ height: 6 }} />}

            {/* ── Navigation ── */}
            <nav className="sb-nav" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: collapsed ? '4px 0' : '4px 6px' }}>
                {NAV_SECTIONS.map(section => {
                    const sectionItems = enriched.filter(item => section.ids.includes(item.id));
                    if (sectionItems.length === 0) return null;

                    return collapsed
                        ? (
                            <div key={section.id} style={{ borderBottom: '1px solid var(--t-border)', marginBottom: 2, paddingBottom: 2 }}>
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
                borderTop: '1px solid var(--t-border)',
                display: 'flex', flexDirection: 'column',
                gap: collapsed ? 2 : 3,
                alignItems: collapsed ? 'center' : 'stretch',
            }}>
                {/* User profile */}
                {canViewProfile && (collapsed ? (
                    <NavLink
                        to="/dashboard/desktop/accounts/profile"
                        title={user?.username || 'Profile'}
                        style={{
                            width: 34, height: 34, borderRadius: 9, margin: '0 auto',
                            background: 'linear-gradient(135deg, var(--t-primary), color-mix(in srgb, var(--t-primary) 75%, black))',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 12, fontWeight: 800, color: '#fff', overflow: 'hidden',
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
                            width: 30, height: 30, borderRadius: 9, flexShrink: 0,
                            background: 'linear-gradient(135deg, var(--t-primary), color-mix(in srgb, var(--t-primary) 75%, black))',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 11, fontWeight: 800, color: '#fff', overflow: 'hidden',
                        }}>
                            {user?.profile_image
                                ? <img src={mediaUrl(user.profile_image)} alt={user?.username}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    onError={e => { e.target.style.display = 'none'; }} />
                                : getInitials(user?.username)
                            }
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--t-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1 }}>
                                {user?.username || 'User'}
                            </p>
                            <p style={{
                                fontSize: 8, color: 'var(--t-text3)', textTransform: 'uppercase',
                                letterSpacing: '0.08em', marginTop: 2,
                                fontFamily: "'DM Mono', monospace",
                            }}>
                                {user?.role?.name || 'Admin'}
                            </p>
                        </div>
                    </NavLink>
                ))}

                {/* Worker portal */}
                {collapsed ? (
                    <button
                        type="button"
                        onClick={launchWorkerPortal}
                        title="Worker Portal"
                        style={{
                            width: 34, height: 34, borderRadius: 9, margin: '0 auto',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 15, textDecoration: 'none', color: 'var(--t-primary)',
                            transition: 'background 0.13s', border: 'none', background: 'transparent',
                            cursor: 'pointer',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'color-mix(in srgb, var(--t-primary) 10%, transparent)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                        {launchingWorkerPortal ? '…' : '📱'}
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={launchWorkerPortal}
                        className="sb-portal-link"
                        style={{ width: '100%', background: 'transparent', border: 'none', textAlign: 'left', cursor: 'pointer' }}
                    >
                        <span style={{ fontSize: 13 }}>📱</span>
                        <span style={{ flex: 1 }}>{launchingWorkerPortal ? 'Opening…' : 'Worker Portal'}</span>
                        <svg width="9" height="9" viewBox="0 0 12 12" fill="none" style={{ opacity: 0.4 }}>
                            <path d="M2 10L10 2M10 2H5M10 2V7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </button>
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
                                width: 34, height: 34, borderRadius: 9,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 15, background: 'transparent', border: 'none', cursor: 'pointer',
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
                    <NavLink to="/about-developer" style={{ textAlign: 'center', paddingTop: 4, textDecoration: 'none', display: 'block' }}>
                        <p style={{
                            fontSize: 8, color: 'var(--t-text3)',
                            fontFamily: "'DM Mono', monospace",
                        }}>© 2026 Jitendra Khadka</p>
                    </NavLink>
                )}
            </div>
        </aside>
    );
};

export default DesktopSidebar;
