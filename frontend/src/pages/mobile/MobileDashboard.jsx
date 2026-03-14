import React, { useState } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { authService } from '../../services/auth';
import { useConstruction } from '../../context/ConstructionContext';

// Components
import MobileHeader from '../../components/mobile/MobileHeader';
import MobileNav from '../../components/mobile/MobileNav';
import GuideModal from '../../components/mobile/GuideModal';

function MobileDashboard() {
    const {
        loading,
        dashboardData,
        stats
    } = useConstruction();
    const [isGuideOpen, setIsGuideOpen] = useState(false);
    const navigate = useNavigate();

    const handleLogout = async () => {
        await authService.logout();
        navigate('/login');
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#f8fafc]">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
                    <p className="text-emerald-600 font-bold animate-pulse text-[10px] tracking-widest uppercase">Initializing Core...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] overflow-x-hidden">
            <MobileHeader
                project={dashboardData.project}
                stats={stats}
                onLogout={handleLogout}
                onShowGuide={() => setIsGuideOpen(true)}
            />

            {/* Main Content Area - Padding handled by MobileLayout in children */}
            <main className="relative z-10 -mt-10">
                <Outlet />
            </main>

            <MobileNav />
            <GuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
        </div>
    );
}

export default MobileDashboard;
