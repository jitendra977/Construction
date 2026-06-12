import React from 'react';

const MobileLayout = ({ 
    children, 
    title, 
    subtitle, 
    headerExtra, 
    showBackground = true,
    padding = "px-0",
    spacing = "space-y-0"
}) => {
    return (
        <div className="relative min-h-dvh w-full max-w-full overflow-x-hidden pb-[calc(104px+max(env(safe-area-inset-bottom),0px))] pt-0 transition-colors duration-300"
            style={{ background: 'var(--t-bg)', color: 'var(--t-text)' }}>
            {/* LUMINOUS BACKGROUND ELEMENTS */}
            {showBackground && (
                <>
                    <div className="ambient-glow"></div>
                    <div className="grid-floor" style={{ opacity: 0.1 }}></div>
                </>
            )}

            <div className={`${padding} ${spacing} relative z-10 w-full max-w-full`}>
                {/* CONSISTENT HEADER */}
                {(title || subtitle || headerExtra) && (
                    <header className="mb-8 flex flex-col gap-4 animate-stagger">
                        <div className="flex justify-between items-center">
                            <div>
                                {title && (
                                    <h1 className="font-black tracking-tight text-[var(--t-text)] leading-none dynamic-title">
                                        {title}
                                    </h1>
                                )}
                                {subtitle && (
                                    <p className="text-[var(--t-primary)] mt-2 dynamic-subtitle">
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
