import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { constructionService } from '../../services/api';
import { authService } from '../../services/auth';
import { useDashboardData } from '../../hooks/useDashboardData';

// Tab Components
import HomeTab from '../../components/mobile/HomeTab';
import RoomsTab from '../../components/mobile/RoomsTab';
import BudgetTab from '../../components/mobile/BudgetTab';
import PhotosTab from '../../components/mobile/PhotosTab';
import Modal from '../../components/common/Modal';
import MobileHeader from '../../components/mobile/MobileHeader';
import MobileNav from '../../components/mobile/MobileNav';

function MobileDashboard() {
    const [activeTab, setActiveTab] = useState('home');
    const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
    const [roomFormData, setRoomFormData] = useState({});
    const [savingRoom, setSavingRoom] = useState(false);

    const {
        loading,
        dashboardData,
        stats,
        budgetStats,
        recentActivities,
        formatCurrency,
        refreshData
    } = useDashboardData();

    const navigate = useNavigate();

    const handleLogout = async () => {
        await authService.logout();
        navigate('/login');
    };

    const handleOpenRoomModal = () => {
        setRoomFormData({ floor: dashboardData.floors[0]?.id, status: 'NOT_STARTED' });
        setIsRoomModalOpen(true);
    };

    const handleRoomSubmit = async (e) => {
        e.preventDefault();
        setSavingRoom(true);
        try {
            await constructionService.createRoom(roomFormData);
            setIsRoomModalOpen(false);
            refreshData();
        } catch (error) {
            console.error("Failed to create room", error);
            alert("Failed to create room");
        } finally {
            setSavingRoom(false);
        }
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

            {/* Main Content Area - Swaps based on Active Tab */}
            <main className="px-4 mt-4">
                {activeTab === 'home' && (
                    <HomeTab
                        dashboardData={dashboardData}
                        stats={stats}
                        recentUpdates={recentActivities}
                        formatCurrency={formatCurrency}
                    />
                )}

                {activeTab === 'rooms' && (
                    <RoomsTab
                        rooms={dashboardData.rooms}
                        floors={dashboardData.floors}
                        onAddRoom={handleOpenRoomModal}
                    />
                )}

                {activeTab === 'budget' && (
                    <BudgetTab
                        expenses={dashboardData.expenses}
                        totalBudget={budgetStats.totalBudget}
                        totalSpent={budgetStats.totalSpent}
                        remainingBudget={budgetStats.remainingBudget}
                        budgetPercent={budgetStats.budgetPercent}
                        formatCurrency={formatCurrency}
                    />
                )}

                {activeTab === 'photos' && <PhotosTab />}
            </main>

            {/* Room Modal */}
            <Modal
                isOpen={isRoomModalOpen}
                onClose={() => setIsRoomModalOpen(false)}
                title="Add New Room"
            >
                <form onSubmit={handleRoomSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Room Name</label>
                        <input
                            type="text"
                            value={roomFormData.name || ''}
                            onChange={(e) => setRoomFormData({ ...roomFormData, name: e.target.value })}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="e.g. Master Bedroom"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Floor</label>
                        <select
                            value={roomFormData.floor || ''}
                            onChange={(e) => setRoomFormData({ ...roomFormData, floor: e.target.value })}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            required
                        >
                            <option value="">Select Floor</option>
                            {dashboardData.floors.map(f => (
                                <option key={f.id} value={f.id}>{f.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Area (sqft)</label>
                            <input
                                type="number"
                                value={roomFormData.area_sqft || ''}
                                onChange={(e) => setRoomFormData({ ...roomFormData, area_sqft: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="0"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Budget Allocation</label>
                            <input
                                type="number"
                                value={roomFormData.budget_allocation || ''}
                                onChange={(e) => setRoomFormData({ ...roomFormData, budget_allocation: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="0"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={savingRoom}
                        className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold shadow-lg disabled:opacity-50"
                    >
                        {savingRoom ? 'Creating...' : 'Create Room'}
                    </button>
                </form>
            </Modal>
            <MobileNav activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>
    );
}

export default MobileDashboard;
