import { useNavigate, Outlet } from 'react-router-dom';
import { authService } from '../../services/auth';
import { useConstruction } from '../../context/ConstructionContext';

// Desktop Components
import DesktopSidebar from '../../components/desktop/DesktopSidebar';
import DynamicHelpDrawer from '../../components/common/DynamicHelpDrawer';
import { useState } from 'react';

function DesktopDashboard() {
    const navigate = useNavigate();

    const {
        user,
        loading
    } = useConstruction();

    const [isHelpOpen, setIsHelpOpen] = useState(false);

    const handleLogout = async () => {
        await authService.logout();
        navigate('/login');
    };

    if (loading) {
        return <div className="flex justify-center items-center h-screen bg-[var(--t-bg)]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--t-primary)]"></div>
        </div>;
    }

    const navItems = [
        { id: 'home', icon: '🏠', label: 'Dashboard (ड्यासबोर्ड)' },
        { id: 'analytics', icon: '📈', label: 'Analytics (विश्लेषण)' },
        { id: 'estimator', icon: '🧮', label: 'Estimator (इस्टिमेटर)' },
        { id: 'permits', icon: '📜', label: 'Permits (नक्सा पास)' },
        { id: 'manage', icon: '🛠️', label: 'Manage (व्यवस्थापन)' },
        { id: 'photos', icon: '📸', label: 'Gallery (फोटो ग्यालरी)' },
        { id: 'timelapse', icon: '🎞️', label: 'Timelapse (टाइमल्याप्स)' },
        { id: 'guides', icon: '📚', label: 'User Guide (मद्दत निर्देशिका)' },
        { id: 'import', icon: '📥', label: 'Import Data (डाटा आयात)' },
        ...(user?.is_system_admin ? [
            { id: 'users', icon: '👥', label: 'Users (प्रयोगकर्ता)' },
        ] : []),
    ];

    return (
        <div className="flex h-screen bg-[var(--t-bg)]">
            <DesktopSidebar
                user={user}
                onLogout={handleLogout}
                navItems={navItems}
            />

            {/* Main Content Area - wider to use more screen real estate */}
            <main className="flex-1 ml-64 overflow-y-auto min-h-screen">
                <Outlet />
            </main>

            {/* Floating Help Button */}
            <button
                onClick={() => setIsHelpOpen(true)}
                className="fixed bottom-8 right-8 z-[90] w-14 h-14 bg-[var(--t-primary)] text-white rounded-2xl shadow-2xl flex items-center justify-center text-xl hover:scale-110 hover:-translate-y-1 active:scale-95 transition-all group"
                title="Help & Guides (मद्दतका लागि)"
            >
                <div className="absolute inset-0 rounded-2xl bg-[var(--t-primary)] animate-ping opacity-20 group-hover:opacity-40"></div>
                <span className="relative z-10 font-black">?</span>
                <span className="absolute right-full mr-4 px-3 py-2 bg-[var(--t-surface)] text-[var(--t-text)] text-[10px] font-black uppercase tracking-widest rounded-xl border border-[var(--t-border)] shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all pointer-events-none">
                    Need Help? (मद्दत)
                </span>
            </button>

            <DynamicHelpDrawer 
                isOpen={isHelpOpen} 
                onClose={() => setIsHelpOpen(false)} 
            />
        </div>
    );
}

export default DesktopDashboard;
