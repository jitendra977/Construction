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
        <div className="flex items-center gap-1 px-4 pt-4 pb-0"
            style={{ borderBottom: '1px solid var(--t-border)' }}>
            {tabs.map(({ to, label }) => (
                <NavLink key={to} to={to}
                    className="px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors"
                    style={({ isActive }) => ({
                        color:        isActive ? '#f97316' : 'var(--t-text3)',
                        borderBottom: isActive ? '2px solid #f97316' : '2px solid transparent',
                        background:   'transparent',
                    })}>
                    {label}
                </NavLink>
            ))}
        </div>
    );
}
