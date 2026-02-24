import React from 'react';
import { Link } from 'react-router-dom';
import { getMediaUrl } from '../../services/api';

const MobileHeader = ({ project, stats, onLogout }) => {
    return (
        <header className="px-4 pt-10 pb-12 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 shadow-xl overflow-hidden relative">
            {/* Background Accent */}
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                <span className="text-8xl">🏗️</span>
            </div>

            <div className="flex justify-between items-start mb-8 relative z-10">
                <div>
                    <h1 className="text-2xl font-black text-white tracking-tight">{project?.name || 'Mero Ghar'}</h1>
                    <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-widest opacity-90 mt-1">Construction Manager</p>
                </div>
                <div className="flex gap-2">
                    <Link
                        to="/dashboard/mobile/profile"
                        className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl text-white border border-white/20 active:scale-95 transition-all flex items-center justify-center overflow-hidden"
                    >
                        {user?.profile?.avatar ? (
                            <img
                                src={getMediaUrl(user.profile.avatar)}
                                alt={user.username}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.style.display = 'none';
                                    e.target.parentNode.innerHTML = '<span class="text-lg">👤</span>';
                                }}
                            />
                        ) : (
                            <span className="text-lg">👤</span>
                        )}
                    </Link>
                    <button
                        onClick={onLogout}
                        className="p-2.5 bg-white/10 backdrop-blur-md rounded-xl text-white border border-white/20 active:bg-red-500/20 transition-colors"
                    >
                        <span className="text-lg">🚪</span>
                    </button>
                </div>
            </div>

            {/* Stats Cards - Horizontal Scroll */}
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide relative z-10">
                {stats.map((stat, index) => (
                    <div
                        key={index}
                        className="flex-shrink-0 w-36 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 shadow-lg"
                    >
                        <div className="text-2xl mb-2">{stat.icon}</div>
                        <div className="text-xl font-black text-white truncate leading-none mb-1">{stat.value}</div>
                        <div className="text-[10px] font-bold text-emerald-100 uppercase tracking-wider opacity-80">{stat.title}</div>
                    </div>
                ))}
            </div>
        </header>
    );
};

export default MobileHeader;
