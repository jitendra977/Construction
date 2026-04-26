import React from 'react';
import { NavLink } from 'react-router-dom';
import { usePlatformBase } from '../../../../shared/utils/platformNav';


export default function StructureTopNav() {
    const base = usePlatformBase();
    const BASE = `${base}/structure`;
    const TABS = [
        { to: BASE,                          icon: '🏗️', label: 'Overview',   end: true },
        { to: `${base}/structure/floorplan`, icon: '🗺️', label: 'Floor Plan' },
        { to: `${base}/structure/rooms`,     icon: '🚪', label: 'Rooms'      },
        { to: `${base}/structure/progress`,  icon: '📊', label: 'Progress'   },
        { to: `${base}/structure/help`,      icon: '📖', label: 'सहायता'    },
    ];
    return (
        <div
            className="flex items-center gap-1 px-4 py-2 overflow-x-auto shrink-0"
            style={{ background: '#0d1117', borderBottom: '1px solid #1f2937' }}
        >
            {TABS.map(tab => (
                <NavLink
                    key={tab.to}
                    to={tab.to}
                    end={tab.end}
                    className={({ isActive }) =>
                        `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                            isActive ? 'font-semibold' : ''
                        }`
                    }
                    style={({ isActive }) => ({
                        background: isActive ? 'rgba(249,115,22,0.14)' : 'transparent',
                        color:      isActive ? '#f97316' : '#9ca3af',
                    })}
                    onMouseEnter={e => {
                        if (!e.currentTarget.getAttribute('aria-current'))
                            e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                    }}
                    onMouseLeave={e => {
                        if (!e.currentTarget.getAttribute('aria-current'))
                            e.currentTarget.style.background = 'transparent';
                    }}
                >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                </NavLink>
            ))}
        </div>
    );
}
