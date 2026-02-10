import React from 'react';

const DesktopSidebar = ({ user, activeView, setActiveView, onLogout, navItems }) => {
    return (
        <aside className="w-64 bg-white border-r border-gray-200 flex flex-col fixed h-full z-10">
            <div className="p-6 border-b border-gray-100">
                <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                    Mero Ghar
                </h1>
                <p className="text-xs text-gray-500 mt-1">Construction Manager</p>
            </div>

            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {navItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setActiveView(item.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left font-medium transition-all ${activeView === item.id
                            ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                            : 'text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        <span className="text-xl">{item.icon}</span>
                        <span>{item.label}</span>
                    </button>
                ))}
            </nav>

            <div className="p-4 border-t border-gray-100">
                <div className="flex items-center gap-3 px-4 py-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold">
                        {user?.username?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{user?.username}</p>
                        <p className="text-xs text-gray-500">Owner</p>
                    </div>
                </div>
                <button
                    onClick={onLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                    <span>🚪</span> Logout
                </button>
            </div>
        </aside>
    );
};

export default DesktopSidebar;
