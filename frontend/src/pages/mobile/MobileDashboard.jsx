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
            />

            {/* Main Content Area - Padding handled by MobileLayout in children */}
            <main className="relative z-10 -mt-10">
                <Outlet />
            </main>

            <MobileNav />

            {/* Global Calculator Toggle Button */}
            <button
                onClick={toggleCalculator}
                className={`fixed bottom-24 right-4 w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-500 z-[100] ${isCalculatorOpen
                    ? 'bg-red-500 text-white rotate-45 scale-90'
                    : 'bg-emerald-600 text-white active:scale-110 shadow-emerald-100'
                    }`}
            >
                <Calculator size={24} />
            </button>

            {/* Global Calculator Drawer */}
            <div
                className={`fixed inset-x-0 bottom-0 top-0 z-[9999] transform transition-all duration-500 ${isCalculatorOpen ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
                    }`}
            >
                <div
                    className={`absolute inset-0 bg-black/10 backdrop-blur-md transition-opacity duration-500 ${isCalculatorOpen ? 'opacity-100' : 'opacity-0'}`}
                    onClick={() => setIsCalculatorOpen(false)}
                />

                <div className="absolute bottom-0 left-0 right-0 h-[85vh] bg-white/95 backdrop-blur-3xl rounded-t-[40px] overflow-hidden shadow-2xl transition-transform duration-500 border-t border-white">
                    {isCalculatorOpen && (
                        <div className="h-full">
                            <div className="w-full flex justify-center py-4">
                                <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
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
