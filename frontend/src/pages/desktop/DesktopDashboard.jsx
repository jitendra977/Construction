import { useNavigate, Outlet } from 'react-router-dom';
import { authService } from '../../services/auth';
import { useConstruction } from '../../context/ConstructionContext';

// Desktop Components
import DesktopSidebar from '../../components/desktop/DesktopSidebar';

function DesktopDashboard() {
    const navigate = useNavigate();

    const {
        user,
        loading,
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
            <main className="flex-1 ml-64 p-8 overflow-y-auto">
                <div className="max-w-7xl mx-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}

export default DesktopDashboard;
