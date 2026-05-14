import React from 'react';
import { Routes, Route, Navigate, NavLink, useMatch } from 'react-router-dom';
import { LocationProvider, GeofenceConfigPage, LiveSiteMap, PresenceReports } from './index';

function LocationLayout({ projectId }) {
    // Support both desktop (/dashboard/desktop/…) and mobile (/dashboard/mobile/…)
    const desktopMatch = useMatch('/dashboard/desktop/location/*');
    const mobileMatch  = useMatch('/dashboard/mobile/location/*');
    const match = desktopMatch || mobileMatch;
    const base  = match
        ? match.pathnameBase
        : '/dashboard/desktop/location';   // safe fallback

    const tabs = [
        { path: `${base}/live`,     label: '🗺 Live Map'   },
        { path: `${base}/reports`,  label: '📊 Reports'    },
        { path: `${base}/geofence`, label: '📐 Boundaries' },
    ];

    return (
        <LocationProvider projectId={projectId}>
            <div className="flex flex-col h-full bg-[var(--t-bg)] overflow-hidden">
                {/* Top nav — absolute paths prevent /live/live/live cascade */}
                <div className="bg-white border-b border-gray-100 px-5 py-3 flex items-center justify-between shrink-0">
                    <div>
                        <h1 className="text-base font-black text-gray-900 leading-tight">Location Tracking</h1>
                        <p className="text-[10px] text-gray-400">GPS presence · site boundaries · map pins</p>
                    </div>
                    <nav className="flex bg-gray-100 p-1 rounded-xl gap-0.5">
                        {tabs.map(tab => (
                            <NavLink
                                key={tab.path}
                                to={tab.path}
                                className={({ isActive }) =>
                                    `px-4 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                                        isActive
                                            ? 'bg-white text-indigo-600 shadow-sm'
                                            : 'text-gray-500 hover:text-gray-800'
                                    }`
                                }
                            >
                                {tab.label}
                            </NavLink>
                        ))}
                    </nav>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden">
                    <Routes>
                        <Route path="live"     element={<LiveSiteMap        projectId={projectId} />} />
                        <Route path="reports"  element={
                            <div className="h-full overflow-y-auto">
                                <PresenceReports projectId={projectId} />
                            </div>
                        } />
                        <Route path="geofence" element={
                            <div className="h-full overflow-y-auto">
                                <GeofenceConfigPage projectId={projectId} />
                            </div>
                        } />
                        {/* Absolute redirect so it never appends to current path */}
                        <Route path="*" element={<Navigate to={`${base}/live`} replace />} />
                    </Routes>
                </div>
            </div>
        </LocationProvider>
    );
}

export default LocationLayout;
