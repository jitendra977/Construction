import React from 'react';

const MobileLayout = ({ 
    children, 
    title, 
    subtitle, 
    headerExtra, 
    showBackground = true,
    padding = "px-6",
    spacing = "space-y-10"
}) => {
    return (
        <div className="min-h-screen bg-[#f8fafc] text-[#1e293b] overflow-x-hidden pb-40 pt-12 relative transition-colors duration-500">
            {/* LUMINOUS BACKGROUND ELEMENTS */}
            {showBackground && (
                <>
                    <div className="ambient-glow"></div>
                    <div className="grid-floor" style={{ opacity: 0.1 }}></div>
                </>
            )}

            <div className={`${padding} ${spacing} relative z-10`}>
                {/* CONSISTENT HEADER */}
                {(title || subtitle || headerExtra) && (
                    <header className="flex flex-col gap-6 mb-12 animate-stagger">
                        <div className="flex justify-between items-center px-1">
                            <div>
                                {title && (
                                    <h1 className="font-black tracking-tight text-slate-900 leading-none dynamic-title">
                                        {title}
                                    </h1>
                                )}
                                {subtitle && (
                                    <p className="text-emerald-600 mt-2 dynamic-subtitle">
                                        {subtitle}
                                    </p>
                                )}
                            </div>
                            {headerExtra}
                        </div>
                    </header>
                )}

                {/* CONTENT AREA */}
                {children}
            </div>
        </div>
    );
};

export default MobileLayout;
