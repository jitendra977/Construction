import { useNavigate, Outlet } from 'react-router-dom';
import { authService } from '../../services/auth';
import { useConstruction } from '../../context/ConstructionContext';

// Components
import MobileHeader from '../../components/mobile/MobileHeader';
import MobileNav from '../../components/mobile/MobileNav';
import StandardCalculator from '../../components/common/StandardCalculator';
import { Calculator } from 'lucide-react';

function MobileDashboard() {
    const {
        loading,
        dashboardData,
        stats,
        isCalculatorOpen,
        toggleCalculator,
        setIsCalculatorOpen
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
        <div className="min-h-screen bg-gray-50 pb-24 overflow-x-hidden">
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

            {/* Global Calculator Toggle Button (Mobile Optimized) */}
            <button
                onClick={toggleCalculator}
                className={`fixed bottom-24 right-4 w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-500 z-[100] ${isCalculatorOpen
                    ? 'bg-red-500 text-white rotate-45 scale-90'
                    : 'bg-emerald-600 text-white active:scale-110 shadow-emerald-500/30'
                    }`}
            >
                <Calculator size={24} />
            </button>

            {/* Global Calculator Drawer (Mobile optimized) */}
            <div
                className={`fixed inset-x-0 bottom-0 top-0 z-[9999] transform transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) ${isCalculatorOpen ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
                    }`}
            >
                {/* Backdrop */}
                <div
                    className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-500 ${isCalculatorOpen ? 'opacity-100' : 'opacity-0'}`}
                    onClick={() => setIsCalculatorOpen(false)}
                />

                {/* Drawer Content */}
                <div className="absolute bottom-0 left-0 right-0 h-[85vh] bg-white rounded-t-[32px] overflow-hidden shadow-2xl transform transition-transform duration-500">
                    {isCalculatorOpen && (
                        <div className="h-full">
                            {/* Drag Handle */}
                            <div className="w-full flex justify-center py-3">
                                <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
                            </div>
                            <StandardCalculator onClose={() => setIsCalculatorOpen(false)} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}


export default MobileDashboard;
