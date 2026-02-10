import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth';

function Dashboard() {
    const [user, setUser] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const currentUser = authService.getCurrentUser();
        setUser(currentUser);
    }, []);

    const handleLogout = async () => {
        await authService.logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            {/* Header */}
            <header className="bg-white shadow-md">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-800">
                        House Construction Management System
                    </h1>
                    <button
                        onClick={handleLogout}
                        className="px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-4 focus:ring-purple-300 transition-all transform hover:-translate-y-0.5"
                    >
                        Logout
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    {/* Welcome Section */}
                    <div className="mb-8">
                        <h2 className="text-3xl font-bold text-gray-800 mb-2">
                            Welcome, {user?.username || 'User'}!
                        </h2>
                        <p className="text-gray-600">
                            You have successfully logged in to the system.
                        </p>
                    </div>

                    {/* User Info Card */}
                    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-6 mb-8">
                        <h3 className="text-xl font-semibold text-gray-800 mb-4">
                            Your Information
                        </h3>
                        <div className="space-y-3">
                            <div className="flex items-center">
                                <span className="font-medium text-gray-700 w-32">Username:</span>
                                <span className="text-gray-600">{user?.username}</span>
                            </div>
                            <div className="flex items-center">
                                <span className="font-medium text-gray-700 w-32">Email:</span>
                                <span className="text-gray-600">{user?.email || 'Not provided'}</span>
                            </div>
                            <div className="flex items-center">
                                <span className="font-medium text-gray-700 w-32">Name:</span>
                                <span className="text-gray-600">
                                    {user?.first_name} {user?.last_name}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Coming Soon Section */}
                    <div className="border-l-4 border-purple-500 bg-gradient-to-r from-purple-50 to-transparent rounded-r-xl p-6">
                        <h3 className="text-xl font-semibold text-gray-800 mb-4">
                            Coming Soon
                        </h3>
                        <ul className="space-y-3">
                            {[
                                'Project Management',
                                'Task Tracking',
                                'Material Management',
                                'Worker Management',
                                'Budget Planning',
                                'Progress Reports',
                            ].map((feature, index) => (
                                <li
                                    key={index}
                                    className="flex items-center text-gray-700 py-2 border-b border-gray-200 last:border-b-0"
                                >
                                    <span className="text-2xl mr-3">🏗️</span>
                                    <span>{feature}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default Dashboard;
