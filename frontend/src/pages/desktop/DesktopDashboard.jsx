import { useNavigate, Outlet } from 'react-router-dom';
import { authService } from '../../services/auth';
import { useConstruction } from '../../context/ConstructionContext';

// Desktop Components
import DesktopSidebar from '../../components/desktop/DesktopSidebar';

function DesktopDashboard() {
    const navigate = useNavigate();

    const {
        user,
        loading
    } = useConstruction();

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
        { id: 'estimator', icon: '🧮', label: 'Estimator (इस्टिमेटर)' },
        { id: 'permits', icon: '📜', label: 'Permits (नक्सा पास)' },
        { id: 'manage', icon: '🛠️', label: 'Manage (व्यवस्थापन)' },
        { id: 'photos', icon: '📸', label: 'Gallery (फोटो ग्यालरी)' },
        { id: 'import', icon: '📥', label: 'Import Data (डाटा आयात)' },
        ...(user?.is_system_admin ? [{ id: 'users', icon: '👥', label: 'Users (प्रयोगकर्ता)' }] : []),
    ];

    return (
        <div className="flex h-screen bg-[var(--t-bg)]">
            <DesktopSidebar
                user={user}
                onLogout={handleLogout}
                navItems={navItems}
            />

            {/* Main Content */}
            <main className="flex-1 ml-64 overflow-y-auto min-h-screen">
                <Outlet />
            </main>

        </div>
    );
}

export default DesktopDashboard;
