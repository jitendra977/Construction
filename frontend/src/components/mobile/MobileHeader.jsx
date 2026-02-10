import React from 'react';

const MobileHeader = ({ project, stats, onLogout }) => {
    return (
        <header className="px-4 pt-8 pb-6 bg-white border-b border-gray-100 sticky top-0 z-10">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{project?.name || 'Mero Ghar'}</h1>
                    <p className="text-gray-500 text-sm">Welcome back, Site Owner</p>
                </div>
                <div className="flex gap-2">
                    <button className="p-2 bg-gray-50 rounded-xl text-gray-400">
                        <span className="text-xl">🔔</span>
                    </button>
                    <button
                        onClick={onLogout}
                        className="p-2 bg-gray-50 rounded-xl text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                    >
                        <span className="text-xl">🚪</span>
                    </button>
                </div>
            </div>

            {/* Stats Cards - Horizontal Scroll */}
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                {stats.map((stat, index) => (
                    <div
                        key={index}
                        className={`flex-shrink-0 w-32 bg-gradient-to-br ${stat.color} rounded-2xl p-4 shadow-md`}
                    >
                        <div className="text-3xl mb-2">{stat.icon}</div>
                        <div className="text-2xl font-bold text-white truncate">{stat.value}</div>
                        <div className="text-xs text-white/80">{stat.title}</div>
                    </div>
                ))}
            </div>
        </header>
    );
};

export default MobileHeader;
