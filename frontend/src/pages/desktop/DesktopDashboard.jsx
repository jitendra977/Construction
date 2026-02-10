import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/auth';
import { useDashboardData } from '../../hooks/useDashboardData';

// Desktop Components
import DesktopHome from '../../components/desktop/DesktopHome';
import DesktopRooms from '../../components/desktop/DesktopRooms';
import DesktopBudget from '../../components/desktop/DesktopBudget';
import DesktopPhotos from '../../components/desktop/DesktopPhotos';
import DesktopManage from '../../components/desktop/DesktopManage';
import DesktopSidebar from '../../components/desktop/DesktopSidebar';

function DesktopDashboard() {
    const [activeView, setActiveView] = useState('home');
    const navigate = useNavigate();

    const {
        user,
        loading,
        dashboardData,
        stats,
        budgetStats,
        recentActivities,
        formatCurrency,
        refreshData
    } = useDashboardData();

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
        { id: 'home', icon: '🏠', label: 'Dashboard' },
        { id: 'rooms', icon: '🚪', label: 'Rooms' },
        { id: 'budget', icon: '💰', label: 'Budget & Expenses' },
        { id: 'manage', icon: '🛠️', label: 'Management' },
        { id: 'photos', icon: '📸', label: 'Site Gallery' },
    ];

    return (
        <div className="flex h-screen bg-gray-50">
            <DesktopSidebar
                user={user}
                activeView={activeView}
                setActiveView={setActiveView}
                onLogout={handleLogout}
                navItems={navItems}
            />

            {/* Main Content */}
            <main className="flex-1 ml-64 p-8 overflow-y-auto">
                <div className="max-w-7xl mx-auto">
                    {activeView === 'home' && (
                        <DesktopHome
                            dashboardData={dashboardData}
                            stats={stats}
                            recentActivities={recentActivities}
                            formatCurrency={formatCurrency}
                            onDataRefresh={refreshData}
                        />
                    )}

                    {activeView === 'rooms' && (
                        <DesktopRooms
                            rooms={dashboardData.rooms}
                            floors={dashboardData.floors}
                            onDataRefresh={refreshData}
                        />
                    )}

                    {activeView === 'budget' && (
                        <DesktopBudget
                            expenses={dashboardData.expenses}
                            totalBudget={budgetStats.totalBudget}
                            totalSpent={budgetStats.totalSpent}
                            remainingBudget={budgetStats.remainingBudget}
                            budgetPercent={budgetStats.budgetPercent}
                            formatCurrency={formatCurrency}
                        />
                    )}

                    {activeView === 'manage' && (
                        <DesktopManage
                            dashboardData={dashboardData}
                            onDataRefresh={refreshData}
                        />
                    )}

                    {activeView === 'photos' && (
                        <DesktopPhotos />
                    )}
                </div>
            </main>
        </div>
    );
}

export default DesktopDashboard;
