import React from 'react';
import { Link } from 'react-router-dom';
import { getMediaUrl } from '../../services/api';
import { useConstruction } from '../../context/ConstructionContext';
import ThemeToggle from '../common/ThemeToggle';

const MobileHeader = ({ project, stats, onLogout, onShowGuide }) => {
    const { user } = useConstruction();

    const isHome = window.location.pathname.endsWith('/home');

    return (
        <header className={`${isHome ? 'h-0 opacity-0 overflow-hidden' : 'px-4 pt-3 pb-4'} bg-[var(--t-surface)] border-b border-[var(--t-border)] relative z-20 transition-all duration-500`}>
            {/* Luminous accents */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--t-primary)]/5 rounded-full blur-3xl pointer-events-none transform translate-x-1/2 -translate-y-1/2"></div>

            <div className="flex justify-between items-start mb-6 relative z-10">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-1.5 h-1.5 bg-[var(--t-primary)] rounded-full animate-pulse shadow-[0_0_8px_var(--t-primary)]"></div>
                        <p className="text-[9px] uppercase tracking-[0.2em] text-[var(--t-text2)] font-['DM_Mono',monospace]">System Active</p>
                    </div>
                    <h1 className="text-2xl text-[var(--t-text)] uppercase tracking-wide leading-none font-['Bebas_Neue',sans-serif]">
                        {project?.name || 'Site Link'}
                    </h1>
                </div>
                <div className="flex items-center gap-2">
                    <ThemeToggle />
                    <button
                        onClick={onShowGuide}
                        className="w-9 h-9 bg-[var(--t-surface2)] rounded text-[var(--t-text2)] border border-[var(--t-border)] active:bg-[var(--t-surface3)] transition-all flex items-center justify-center group relative hover:border-[var(--t-primary)] hover:text-[var(--t-primary)]"
                    >
                        <span className="text-sm">📒</span>
                    </button>
                    <Link
                        to="/dashboard/mobile/profile"
                        className="w-9 h-9 bg-[var(--t-surface2)] rounded text-[var(--t-text2)] border border-[var(--t-border)] active:bg-[var(--t-surface3)] transition-all flex items-center justify-center overflow-hidden hover:border-[var(--t-primary)]"
                    >
                        {user?.profile_image ? (
                            <img
                                src={getMediaUrl(user.profile_image)}
                                alt={user.username}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.style.display = 'none';
                                    e.target.parentNode.innerHTML = '<span class="text-sm">👤</span>';
                                }}
                            />
                        ) : (
                            <span className="text-sm">👤</span>
                        )}
                    </Link>
                    <button
                        onClick={onLogout}
                        className="w-9 h-9 bg-[var(--t-surface2)] rounded text-[var(--t-text2)] border border-[var(--t-border)] hover:bg-[var(--t-danger)]/10 hover:text-[var(--t-danger)] hover:border-[var(--t-danger)] transition-all flex items-center justify-center"
                    >
                        <span className="text-sm">🚪</span>
                    </button>
                </div>
            </div>

            {/* Tight Stats Strip */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide relative z-10">
                {stats.map((stat, index) => (
                    <div
                        key={index}
                        className="flex-shrink-0 w-[110px] bg-[var(--t-surface2)] rounded border border-[var(--t-border)] p-3 cursor-default transition-colors hover:border-[var(--t-primary)]"
                    >
                        <div className="text-[10px] text-[var(--t-text2)] mb-1 opacity-70 flex items-center gap-1.5 uppercase font-['DM_Mono',monospace] tracking-wider">
                            <span className="text-[var(--t-primary)] scale-75 origin-left">{stat.icon}</span>
                            {stat.title}
                        </div>
                        <div className="text-xl text-[var(--t-text)] truncate leading-none font-['Bebas_Neue',sans-serif] tracking-wide mt-1">
                            {stat.value}
                        </div>
                    </div>
                ))}
            </div>
        </header>
    );
};

export default MobileHeader;
