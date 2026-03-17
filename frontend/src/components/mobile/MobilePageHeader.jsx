import React from 'react';
import { Link } from 'react-router-dom';
import { useConstruction } from '../../context/ConstructionContext';
import ThemeToggle from '../common/ThemeToggle';
import { getMediaUrl } from '../../services/api';
import { authService } from '../../services/auth';

/**
 * Shared sticky top header for all mobile pages.
 * Renders the page title, a live-system badge, theme toggle, profile link & logout.
 */
const MobilePageHeader = ({ title, subtitle, rightExtra }) => {
    const { user } = useConstruction();

    const handleLogout = () => {
        authService.logout();
        window.location.href = '/login';
    };

    return (
        <header style={{
            position: 'sticky',
            top: 0,
            zIndex: 100,
            background: 'var(--t-surface)',
            borderBottom: '1px solid var(--t-border)',
            padding: '10px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
        }}>
            {/* Left: Title block */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: 22,
                    letterSpacing: '0.04em',
                    lineHeight: 1,
                    color: 'var(--t-text)',
                }}>
                    {title || 'Mero Ghar'}
                </div>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 8,
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    color: 'var(--t-text3)',
                }}>
                    <span style={{
                        width: 5, height: 5,
                        background: 'var(--t-primary)',
                        borderRadius: '50%',
                        animation: 'pulse 2s ease infinite',
                        display: 'inline-block',
                    }} />
                    {subtitle || 'System Active'}
                </div>
            </div>

            {/* Right: actions row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {rightExtra}
                <ThemeToggle />
                <Link
                    to="/dashboard/mobile/profile"
                    title="Profile"
                    style={{
                        width: 36, height: 36,
                        background: 'var(--t-surface2)',
                        border: '1px solid var(--t-border)',
                        borderRadius: 8,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 16, textDecoration: 'none', color: 'var(--t-text2)',
                        overflow: 'hidden',
                        transition: 'border-color 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--t-primary)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--t-border)'}
                >
                    {user?.profile_image ? (
                        <img
                            src={getMediaUrl(user.profile_image)}
                            alt={user.username}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={e => { e.target.style.display = 'none'; e.target.parentNode.innerHTML = '👤'; }}
                        />
                    ) : '👤'}
                </Link>
                <button
                    onClick={handleLogout}
                    title="Logout"
                    style={{
                        width: 36, height: 36,
                        background: 'var(--t-surface2)',
                        border: '1px solid var(--t-border)',
                        borderRadius: 8,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 16, cursor: 'pointer', color: 'var(--t-text2)',
                        transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.borderColor = 'var(--t-danger)';
                        e.currentTarget.style.color = 'var(--t-danger)';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.borderColor = 'var(--t-border)';
                        e.currentTarget.style.color = 'var(--t-text2)';
                    }}
                >
                    🚪
                </button>
            </div>
        </header>
    );
};

export default MobilePageHeader;
