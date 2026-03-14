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
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 safe-area-inset-bottom z-50">
            <div className="flex justify-around items-center">
                {navItems.map((item) => (
                    <NavLink
                        key={item.id}
                        to={`/dashboard/mobile/${item.id}`}
                        className={({ isActive }) =>
                            `flex flex-col items-center gap-1 min-w-[64px] transition-all ${isActive ? 'text-emerald-600 scale-110' : 'text-gray-400'
                            }`
                        }
                    >
                        <span className="text-2xl">{item.icon}</span>
                        <span className="dynamic-subtitle">{item.label}</span>
                    </NavLink>
                ))}
            </div>
        </nav>
    );
};

export default MobileNav;
