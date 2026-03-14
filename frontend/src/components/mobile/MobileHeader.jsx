import React from 'react';
import { Link } from 'react-router-dom';
import { getMediaUrl } from '../../services/api';
import { useConstruction } from '../../context/ConstructionContext';

const MobileHeader = ({ project, stats, onLogout }) => {
    const { user } = useConstruction();

    return (
        <header className="px-4 pt-10 pb-12 bg-gradient-to-br from-emerald-600 via-teal-700 to-cyan-800 shadow-2xl overflow-hidden relative border-b border-white/10">
            {/* Ambient Background Accent */}
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none transform translate-x-1/4 -translate-y-1/4">
                <span className="text-9xl">🏗️</span>
            </div>
            <div className="absolute -top-20 -left-20 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="flex justify-between items-start mb-10 relative z-10">
                <div>
                    <h1 className="text-white drop-shadow-sm dynamic-header">{project?.name || 'Mero Ghar'}</h1>
                    <div className="flex items-center gap-2 mt-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse"></div>
                        <p className="text-emerald-100 opacity-90 dynamic-subtitle">Core Interface</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <Link
                        to="/dashboard/mobile/profile"
                        className="w-11 h-11 bg-white/10 backdrop-blur-xl rounded-2xl text-white border border-white/20 active:scale-90 transition-all flex items-center justify-center overflow-hidden shadow-lg"
                    >
                        {user?.profile_image ? (
                            <img
                                src={getMediaUrl(user.profile_image)}
                                alt={user.username}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.style.display = 'none';
                                    e.target.parentNode.innerHTML = '<span class="text-xl">👤</span>';
                                }}
                            />
                        ) : (
                            <span className="text-xl">👤</span>
                        )}
                    </Link>
                    <button
                        onClick={onLogout}
                        className="w-11 h-11 bg-white/10 backdrop-blur-xl rounded-2xl text-white border border-white/20 active:bg-red-500/40 transition-all flex items-center justify-center shadow-lg"
                    >
                        <span className="text-xl">🚪</span>
                    </button>
                </div>
            </div>

            {/* Luminous Stats Cards - Horizontal Scroll */}
            <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide relative z-10">
                {stats.map((stat, index) => (
                    <div
                        key={index}
                        className="flex-shrink-0 w-36 bg-white/10 backdrop-blur-2xl rounded-3xl p-5 border border-white/20 shadow-xl group cursor-default"
                    >
                        <div className="text-2xl mb-3 transform group-hover:scale-110 transition-transform">{stat.icon}</div>
                        <div className="text-white truncate leading-none mb-1 shadow-sm dynamic-title">{stat.value}</div>
                        <div className="text-emerald-100 opacity-70 dynamic-subtitle">{stat.title}</div>
                    </div>
                ))}
            </div>
        </header>
    );
};

export default MobileHeader;
