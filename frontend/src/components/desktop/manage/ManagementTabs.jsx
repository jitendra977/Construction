import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';

/**
 * ManagementTabs — Premium horizontal navigation for core construction modules.
 * This component provides quick access to all management-related pages.
 */
const ManagementTabs = () => {
    const location = useLocation();
    
    const tabs = [
        { id: 'manage',    label: 'Overview',  icon: '🛠️', path: '/dashboard/desktop/manage' },
        { id: 'phases',    label: 'Phases',    icon: '📋', path: '/dashboard/desktop/phases' },
        { id: 'timeline',  label: 'Timeline',  icon: '📅', path: '/dashboard/desktop/timeline' },
        { id: 'finance',   label: 'Finance',   icon: '💰', path: '/dashboard/desktop/finance' },
        { id: 'resource',  label: 'Resource',  icon: '🧱', path: '/dashboard/desktop/resource' },
        { id: 'structure', label: 'Structure', icon: '🏛️', path: '/dashboard/desktop/structure' },
        { id: 'photos',    label: 'Photos',    icon: '📸', path: '/dashboard/desktop/photos' },
        { id: 'timelapse', label: 'Timelapse', icon: '🎞️', path: '/dashboard/desktop/timelapse' },
    ];

    return (
        <div style={{
            background: 'var(--t-surface)',
            borderBottom: '1px solid var(--t-border)',
            padding: '0 28px',
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            overflowX: 'auto',
            zIndex: 40,
        }} className="scrollbar-hide">
            {tabs.map((tab) => {
                const isActive = tab.id === 'manage' 
                    ? location.pathname === tab.path 
                    : location.pathname.startsWith(tab.path);
                    
                return (
                    <NavLink
                        key={tab.id}
                        to={tab.path}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '14px 20px',
                            fontSize: 12,
                            fontWeight: 800,
                            color: isActive ? '#f97316' : 'var(--t-text3)',
                            textDecoration: 'none',
                            borderBottom: isActive ? '2px solid #f97316' : '2px solid transparent',
                            transition: 'all 0.2s',
                            whiteSpace: 'nowrap',
                            letterSpacing: '0.02em',
                            textTransform: 'uppercase',
                        }}
                        onMouseEnter={e => {
                            if (!isActive) {
                                e.currentTarget.style.color = 'var(--t-text)';
                                e.currentTarget.style.background = 'rgba(0,0,0,0.02)';
                            }
                        }}
                        onMouseLeave={e => {
                            if (!isActive) {
                                e.currentTarget.style.color = 'var(--t-text3)';
                                e.currentTarget.style.background = 'transparent';
                            }
                        }}
                    >
                        <span style={{ 
                            fontSize: 16,
                            filter: isActive ? 'none' : 'grayscale(100%) opacity(0.6)',
                            transition: 'filter 0.2s',
                        }}>{tab.icon}</span>
                        {tab.label}
                    </NavLink>
                );
            })}
        </div>
    );
};

export default ManagementTabs;
