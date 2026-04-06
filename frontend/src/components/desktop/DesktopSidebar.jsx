import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { getMediaUrl } from '../../services/api';
import { useConstruction } from '../../context/ConstructionContext';
import ThemeToggle from '../common/ThemeToggle';
import HouseConfigModal from '../common/HouseConfigModal';

const DesktopSidebar = ({ user, onLogout, navItems }) => {
    const { dashboardData } = useConstruction();
    const project = dashboardData?.project;
    const [showConfigModal, setShowConfigModal] = useState(false);

    // Derive display name from project
    const projectName = project?.name || 'Mero Ghar Construction';
    const nameParts = projectName.split(' ');
    const displayTitle = nameParts.length > 1 ? nameParts.slice(0, 2).join(' ') : nameParts[0];
    const displaySub = nameParts.length > 2 ? nameParts.slice(2).join(' ') : 'Construction Manager';

    const linkClasses = ({ isActive }) =>
        `w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-left font-medium transition-all ${isActive
            ? 'bg-[var(--t-nav-active-bg)] text-[var(--t-nav-active-text)] shadow-sm font-semibold'
            : 'text-[var(--t-text2)] hover:bg-[var(--t-nav-hover-bg)] hover:text-[var(--t-text)]'
        }`;

    return (
        <>
        <aside className="w-64 flex flex-col fixed h-full z-10 transition-colors duration-200"
            style={{ background: 'var(--t-surface)', borderRight: '1px solid var(--t-border)' }}>
            {/* Logo — clickable to open project config */}
            <div 
                className="p-6 relative overflow-hidden group cursor-pointer"
                style={{ borderBottom: '1px solid var(--t-border)' }}
                onClick={() => setShowConfigModal(true)}
                title="Configure Project"
            >
                <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full blur-2xl pointer-events-none"
                    style={{ background: 'color-mix(in srgb, var(--t-primary) 8%, transparent)' }} />

                <div className="flex items-center gap-3 relative z-10">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shrink-0 group-hover:scale-105 transition-transform"
                        style={{ background: 'var(--t-primary)' }}>
                        <span className="text-xl">🏠</span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-lg font-black leading-none tracking-tight truncate"
                            style={{ color: 'var(--t-text)' }}>
                            {displayTitle}
                        </h1>
                        <p className="text-[10px] font-bold uppercase tracking-widest mt-1 truncate group-hover:text-[var(--t-nav-active-text)] transition-colors"
                            style={{ color: 'var(--t-primary)' }}>
                            {displaySub}
                        </p>
                    </div>
                    <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg className="w-4 h-4" fill="none" stroke="var(--t-text3)" viewBox="0 0 24 24" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-4 space-y-6 overflow-y-auto">
                <div>
                    <p className="px-4 text-xs font-semibold uppercase tracking-wider mb-2"
                        style={{ color: 'var(--t-text3)' }}>Overview</p>
                    <div className="space-y-1">
                        {navItems.filter(item => ['home', 'budget', 'photos', 'estimator'].includes(item.id)).map((item) => (
                            <NavLink
                                key={item.id}
                                to={`/dashboard/desktop/${item.id}`}
                                className={linkClasses}
                            >
                                <span className="text-xl">{item.icon}</span>
                                <span>{item.label}</span>
                            </NavLink>
                        ))}
                    </div>
                </div>

                <div>
                    <p className="px-4 text-xs font-semibold uppercase tracking-wider mb-2"
                        style={{ color: 'var(--t-text3)' }}>Construction Journey</p>
                    <div className="space-y-1">
                        {navItems.filter(item => ['permits', 'manage'].includes(item.id)).map((item) => (
                            <NavLink
                                key={item.id}
                                to={`/dashboard/desktop/${item.id}`}
                                className={linkClasses}
                            >
                                <span className="text-xl">{item.icon}</span>
                                <span>{item.label}</span>
                            </NavLink>
                        ))}
                    </div>
                </div>

                {navItems.some(item => ['import', 'users', 'guides'].includes(item.id)) && (
                    <div>
                        <p className="px-4 text-xs font-semibold uppercase tracking-wider mb-2"
                            style={{ color: 'var(--t-text3)' }}>System Control</p>
                        <div className="space-y-1">
                            {navItems.filter(item => ['import', 'users', 'guides'].includes(item.id)).map((item) => (
                                <NavLink
                                    key={item.id}
                                    to={`/dashboard/desktop/${item.id}`}
                                    className={linkClasses}
                                >
                                    <span className="text-xl">{item.icon}</span>
                                    <span>{item.label}</span>
                                </NavLink>
                            ))}
                        </div>
                    </div>
                )}
            </nav>

            {/* Footer */}
            <div className="p-4 space-y-2" style={{ borderTop: '1px solid var(--t-border)' }}>
                <NavLink
                    to="/dashboard/desktop/activity-logs"
                    className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-2 rounded-xl transition-all text-sm font-medium ${isActive
                            ? 'font-bold'
                            : ''
                        }`
                    }
                    style={({ isActive }) => ({
                        background: isActive ? 'var(--t-nav-active-bg)' : 'transparent',
                        color: isActive ? 'var(--t-nav-active-text)' : 'var(--t-text2)'
                    })}
                >
                    <span className="text-xl">📊</span>
                    <span>Activity Logs</span>
                </NavLink>

                <NavLink
                    to="/dashboard/desktop/profile"
                    className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-3 mb-2 rounded-xl transition-all ${isActive ? 'border' : ''}`
                    }
                    style={({ isActive }) => ({
                        background: isActive ? 'var(--t-nav-active-bg)' : 'transparent',
                        borderColor: isActive ? 'var(--t-border2)' : 'transparent'
                    })}
                >
                    <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold shadow-sm overflow-hidden"
                        style={{ background: 'var(--t-primary)', color: 'var(--t-primary-btn-text)' }}>
                        {user?.profile_image ? (
                            <img
                                src={getMediaUrl(user.profile_image)}
                                alt={user.username}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.style.display = 'none';
                                    e.target.parentNode.innerHTML = user?.username?.charAt(0).toUpperCase();
                                }}
                            />
                        ) : (
                            user?.username?.charAt(0).toUpperCase()
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate" style={{ color: 'var(--t-text)' }}>{user?.username}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-70"
                            style={{ color: 'var(--t-primary)' }}>
                            {user?.role?.name || 'Admin'}
                        </p>
                    </div>
                    <span className="text-xs" style={{ color: 'var(--t-text3)' }}>👤</span>
                </NavLink>

                {/* Theme toggle + Logout row */}
                <div className="flex items-center gap-2 pb-2">
                    <ThemeToggle className="flex-shrink-0" />
                    <button
                        onClick={onLogout}
                        className="flex-1 flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors"
                        style={{ color: 'var(--t-danger)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'color-mix(in srgb, var(--t-danger) 10%, transparent)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                        <span>🚪</span> Logout
                    </button>
                </div>

                {/* Developer Copyright */}
                <NavLink 
                    to="/about-developer"
                    className="flex flex-col items-center justify-center pt-3 mt-1 hover:brightness-110 active:scale-95 transition-all group" 
                    style={{ borderTop: '1px solid var(--t-border2)' }}>
                    <div className="w-10 h-10 rounded-full overflow-hidden border shadow-sm mb-1.5 group-hover:scale-110 transition-transform" 
                         style={{ borderColor: 'var(--t-primary)' }}>
                        <img src="/jitendra.png" alt="Jitendra Khadka" className="w-full h-full object-cover" />
                    </div>
                    <p className="text-[9px] font-bold tracking-widest uppercase opacity-70 mb-0.5" style={{ color: 'var(--t-text2)' }}>
                        Designed & Built By
                    </p>
                    <div className="flex items-center gap-1.5">
                        <p className="text-[11px] font-black tracking-wide" style={{ color: 'var(--t-text)' }}>
                            © 2026 @jitendra khadka
                        </p>
                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-md" 
                              style={{ background: 'color-mix(in srgb, var(--t-primary) 15%, transparent)', color: 'var(--t-primary)' }}>
                            v1.0.0
                        </span>
                    </div>
                </NavLink>
            </div>
        </aside>

        <HouseConfigModal 
            isOpen={showConfigModal}
            onClose={() => setShowConfigModal(false)}
        />
        </>
    );
};

export default DesktopSidebar;
