import { useNavigate, Outlet } from 'react-router-dom';
import { authService } from '../../services/auth';
import { useConstruction } from '../../context/ConstructionContext';

// Components
import MobileHeader from '../../components/mobile/MobileHeader';
import MobileNav from '../../components/mobile/MobileNav';

function MobileDashboard() {
    const {
        loading,
        dashboardData,
        stats,
    } = useConstruction();

    const navigate = useNavigate();

    const handleLogout = async () => {
        await authService.logout();
        navigate('/login');
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                    <p className="text-indigo-600 font-medium animate-pulse text-sm">Building your view...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            <MobileHeader
                project={dashboardData.project}
                stats={stats}
                onLogout={handleLogout}
            />

            {/* Main Content Area - Renders Child Routes */}
            <main className="px-4 mt-4">
                <Outlet />
            </main>

            <MobileNav />
        </div>
    );
}

export default MobileDashboard;
