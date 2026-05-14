/**
 * MobileTrackerContext
 * ─────────────────────
 * Wraps useMobileLocationTracker in a React context so any component
 * in the mobile shell can read GPS status without re-starting a second
 * GPS watch.  MobileDashboard mounts this provider once on login.
 */
import React, { createContext, useContext } from 'react';
import { useMobileLocationTracker } from '../hooks/useMobileLocationTracker';

const MobileTrackerContext = createContext(null);

/**
 * Mount once at the mobile-dashboard level.
 * @param {{ projectId: number|string|null, children: React.ReactNode }} props
 */
export function MobileTrackerProvider({ projectId, children }) {
    const tracker = useMobileLocationTracker(projectId, { enabled: !!projectId });
    return (
        <MobileTrackerContext.Provider value={tracker}>
            {children}
        </MobileTrackerContext.Provider>
    );
}

/**
 * Use anywhere inside the mobile shell.
 * Returns null gracefully when called outside the provider
 * (e.g., during SSR or desktop usage).
 */
export function useMobileTracker() {
    return useContext(MobileTrackerContext);
}
