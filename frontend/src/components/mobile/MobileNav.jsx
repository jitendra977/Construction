import React from 'react';

const MobileNav = ({ activeTab, setActiveTab }) => {
    const navItems = [
        { id: 'home', icon: '🏠', label: 'Home' },
        { id: 'rooms', icon: '🚪', label: 'Rooms' },
        { id: 'budget', icon: '💰', label: 'Budget' },
        { id: 'photos', icon: '📸', label: 'Photos' },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 safe-area-inset-bottom z-10">
            <div className="flex justify-around items-center">
                {navItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`flex flex-col items-center gap-1 min-w-[64px] transition-all ${activeTab === item.id ? 'text-indigo-600 scale-110' : 'text-gray-400'
                            }`}
                    >
                        <span className="text-2xl">{item.icon}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
                    </button>
                ))}
            </div>
        </nav>
    );
};

export default MobileNav;
