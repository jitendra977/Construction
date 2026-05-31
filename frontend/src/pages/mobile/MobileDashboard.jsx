import React, { useState } from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { authService } from '../../services/auth';
import { useConstruction } from '../../context/ConstructionContext';

import MobileHeader    from '../../components/mobile/MobileHeader';
import MobileNav       from '../../components/mobile/MobileNav';
import HouseConfigModal from '../../components/common/HouseConfigModal';
import UnifiedButton from '../../components/unified/UnifiedButton';
import { MobileTrackerProvider } from '../../modules/location/context/MobileTrackerContext';

/**
 * Module routes have their own layout/header — don't show the mobile shell
 * header on top of them.  Plain pages (home, photos, manage…) still get it.
 */
const MODULE_PREFIXES = [
    '/projects', '/finance', '/resource',
    '/structure', '/timeline', '/accounts',
    '/location',
];

function MobileDashboard() {
    const { loading, dashboardData, stats, activeProjectId } = useConstruction();
    const [showConfigModal, setShowConfigModal] = useState(false);
    const navigate  = useNavigate();
    const location  = useLocation();

    const handleLogout = async () => {
        await authService.logout();
        navigate('/login');
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-[var(--t-bg)]">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--t-primary)]" />
                    <p className="text-[var(--t-primary)] font-bold animate-pulse text-[10px] tracking-widest uppercase">
                        Initializing Core...
                    </p>
                </div>
            </div>
        );
    }

    // Strip /dashboard/mobile prefix to get the sub-path
    const subPath = location.pathname.replace('/dashboard/mobile', '');
    const isHome     = subPath === '/home' || subPath === '' || subPath === '/';
    const isModule   = MODULE_PREFIXES.some(p => subPath.startsWith(p));
    const isChatDetail = subPath.startsWith('/team-chat/');
    // Full-viewport modules (maps need a real height — h-full alone collapses on mobile)
    const isFullBleed = subPath.startsWith('/location');

    return (
        // MobileTrackerProvider starts GPS tracking as soon as the user is on mobile.
        // projectId can be null initially — the tracker waits until it is set.
        <MobileTrackerProvider projectId={activeProjectId}>
            <div className="min-h-screen bg-[var(--t-bg)] overflow-x-hidden transition-colors duration-500">

                {/* Shell header — hidden on home (HomeTab has its own) and inside modules */}
                {!isHome && !isModule && (
                    <MobileHeader
                        project={dashboardData?.project}
                        stats={stats ?? []}
                        onLogout={handleLogout}
                        onShowConfig={() => setShowConfigModal(true)}
                    />
                )}

                {/*
                 * Main content:
                 *  - Home / plain pages: no extra top margin (MobileLayout / HomeTab handle it)
                 *  - Module pages: pt-0 — their own sticky header sits at the very top.
                 *    pb-24 ensures content clears the fixed bottom nav.
                 */}
                <main
                    className={
                        isFullBleed
                            ? 'fixed inset-x-0 top-0 z-0 flex flex-col overflow-hidden'
                            : isModule
                                ? 'pb-24'
                                : 'pb-0'
                    }
                    style={
                        isFullBleed
                            ? { bottom: 'calc(58px + 6px + max(env(safe-area-inset-bottom, 8px))' }
                            : undefined
                    }
                >
                    <Outlet />
                </main>

                {!isChatDetail && <MobileNav />}

                {/* Unified floating button — AI + Daily update */}
                <UnifiedButton projectId={activeProjectId} isMobile={true} />

                {showConfigModal && (
                    <HouseConfigModal onClose={() => setShowConfigModal(false)} />
                )}
            </div>
        </MobileTrackerProvider>
    );
}

export default MobileDashboard;
