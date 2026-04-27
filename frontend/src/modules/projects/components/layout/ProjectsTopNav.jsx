import React from 'react';
import { NavLink } from 'react-router-dom';
import { usePlatformBase } from '../../../../shared/utils/platformNav';

export default function ProjectsTopNav({ projectId }) {
    const id  = projectId;
    const base = usePlatformBase();
    const tabs = [
        { to: `${base}/projects/${id}/overview`,  label: '📊 Overview' },
        { to: `${base}/projects/${id}/settings`,  label: '⚙️ Settings' },
        { to: `${base}/projects/${id}/team`,      label: '👥 Team' },
    ];

    return (
        <div
            className="flex items-center gap-0 overflow-x-auto scrollbar-hide"
            style={{
                borderBottom: '1px solid var(--t-border)',
                background: 'var(--t-surface)',
                padding: '0 12px',
            }}
        >
            {tabs.map(({ to, label }) => (
                <NavLink key={to} to={to}
                    className="shrink-0"
                    style={({ isActive }) => ({
                        display: 'flex', alignItems: 'center',
                        padding: '13px 16px',
                        fontSize: 12, fontWeight: 700,
                        whiteSpace: 'nowrap',
                        color:        isActive ? '#f97316' : 'var(--t-text3)',
                        borderBottom: isActive ? '2px solid #f97316' : '2px solid transparent',
                        textDecoration: 'none',
                        background: 'transparent',
                        transition: 'color 0.15s',
                    })}>
                    {label}
                </NavLink>
            ))}
        </div>
    );
}
