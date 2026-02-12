import { useNavigate, Outlet } from 'react-router-dom';
import { authService } from '../../services/auth';
import { useConstruction } from '../../context/ConstructionContext';

// Desktop Components
import DesktopSidebar from '../../components/desktop/DesktopSidebar';
import StandardCalculator from '../../components/common/StandardCalculator';
import { Calculator } from 'lucide-react';

function DesktopDashboard() {
    const navigate = useNavigate();

    const {
        user,
        loading,
        isCalculatorOpen,
        toggleCalculator,
        setIsCalculatorOpen
    } = useConstruction();

    const handleLogout = async () => {
        await authService.logout();
        navigate('/login');
    };

    if (loading) {
        return <div className="flex justify-center items-center h-screen bg-gray-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>;
    }

    const navItems = [
        { id: 'home', icon: '🏠', label: 'Dashboard (ड्यासबोर्ड)' },
        { id: 'budget', icon: '💰', label: 'Budget (बजेट)' },
        { id: 'estimator', icon: '🧮', label: 'Estimator (इस्टिमेटर)' },
        { id: 'permits', icon: '📜', label: 'Permits (नक्सा पास)' },
        { id: 'manage', icon: '🛠️', label: 'Manage (व्यवस्थापन)' },
        { id: 'photos', icon: '📸', label: 'Gallery (फोटो ग्यालरी)' },
    ];

    return (
        <div className="flex h-screen bg-gray-50">
            <DesktopSidebar
                user={user}
                onLogout={handleLogout}
                navItems={navItems}
            />

            {/* Main Content */}
            <main className="flex-1 ml-64 overflow-y-auto min-h-screen">
                <Outlet />
            </main>

            {/* Global Calculator Toggle Button */}
            <button
                onClick={toggleCalculator}
                className={`fixed bottom-8 right-8 w-16 h-16 rounded-3xl flex items-center justify-center shadow-2xl transition-all duration-500 z-[100] group ${isCalculatorOpen
                    ? 'bg-red-500 text-white rotate-45 hover:bg-red-600 scale-90'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700 hover:scale-110 hover:shadow-emerald-500/30'
                    }`}
            >
                <Calculator size={28} className={isCalculatorOpen ? '' : 'group-hover:rotate-12 transition-transform'} />
                {!isCalculatorOpen && (
                    <span className="absolute right-full mr-4 px-4 py-2 bg-gray-900 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap pointer-events-none shadow-xl">
                        Open Utility Hub
                    </span>
                )}
            </button>

            {/* Global Calculator Drawer */}
            <div
                className={`fixed top-[10%] right-8 bottom-[10%] w-[340px] z-[9999] transform transition-all duration-700 cubic-bezier(0.4, 0, 0.2, 1) ${isCalculatorOpen ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-[calc(100%+64px)] opacity-0 scale-95'
                    }`}
            >
                {isCalculatorOpen && (
                    <div className="h-full shadow-[0_32px_80px_rgba(0,0,0,0.15)] rounded-[32px] overflow-hidden border border-white/20">
                        <StandardCalculator onClose={() => setIsCalculatorOpen(false)} />
                    </div>
                )}
            </div>
        </div>
    );
}

export default DesktopDashboard;
