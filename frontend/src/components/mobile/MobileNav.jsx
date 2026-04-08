import React from 'react';
import { NavLink } from 'react-router-dom';

const MobileNav = () => {
    const navItems = [
        { id: 'home', icon: '🏠', label: 'Home' },
        { id: 'manage', icon: '🛠️', label: 'Manage' },
        { id: 'budget', icon: '💰', label: 'Budget' },
        { id: 'estimator', icon: '🧮', label: 'Estimator' },
        { id: 'permits', icon: '📜', label: 'Permits' },
        { id: 'photos', icon: '📸', label: 'Photos' },
    ];


    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 px-2 pb-[env(safe-area-inset-bottom,12px)] pt-2">
            <div className="bg-[var(--t-surface)]/95 backdrop-blur-xl border border-[var(--t-border)] rounded-2xl flex justify-around items-center h-16 shadow-2xl px-2"
                style={{ boxShadow: '0 -8px 40px rgba(0,0,0,0.12)' }}>
                {navItems.map((item) => (
                    <NavLink
                        key={item.id}
                        to={`/dashboard/mobile/${item.id}`}
                        className={({ isActive }) =>
                            `flex-1 flex flex-col items-center justify-center gap-1 transition-all ${isActive ? 'text-[var(--t-primary)] scale-110' : 'text-[var(--t-text3)] hover:text-[var(--t-text2)]'
                            }`
                        }
                        style={({ isActive }) => isActive ? {
                            filter: 'drop-shadow(0 0 8px var(--t-primary))'
                        } : {}}
                    >
                        <span className="text-xl leading-none">{item.icon}</span>
                        <span className="text-[7px] font-['DM_Mono',monospace] uppercase tracking-[0.15em] font-bold">{item.label}</span>
                    </NavLink>
                ))}
            </div>
        </nav>
    );
};

export default MobileNav;
