import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, NavLink } from 'react-router-dom';
import { useConstruction } from '../../context/ConstructionContext';

const DynamicHelpDrawer = ({ isOpen, onClose }) => {
    const location = useLocation();
    const { activeHelpKey, setActiveHelpKey, language, setLanguage, dashboardData, user } = useConstruction();
    const userGuides = dashboardData?.userGuides || [];
    const isNe = language === 'ne';

    const [view, setView] = useState('library'); // 'library' or 'detail'
    const [searchQuery, setSearchQuery] = useState('');
    const [contextualGuide, setContextualGuide] = useState(null);

    // Auto-detect contextual guide on mount or path change
    useEffect(() => {
        const path = location.pathname.split('/').pop();
        const availableKeys = userGuides.map(g => g.key);
        
        let match = null;
        if (path && availableKeys.includes(path)) {
            match = userGuides.find(g => g.key === path);
        } else if (availableKeys.includes('home')) {
            match = userGuides.find(g => g.key === 'home');
        }

        if (match) {
            setContextualGuide(match);
            setActiveHelpKey(match.key);
            // Default to detail if we find a good context match and it's the first open
            if (isOpen && view === 'library' && !searchQuery) {
                setView('detail');
            }
        }
    }, [location.pathname, userGuides, isOpen]);

    const activeGuide = useMemo(() => {
        return userGuides.find(g => g.key === activeHelpKey) || contextualGuide;
    }, [userGuides, activeHelpKey, contextualGuide]);

    const filteredLibrary = useMemo(() => {
        return userGuides.filter(g => 
            g.is_active && 
            (g.title_en.toLowerCase().includes(searchQuery.toLowerCase()) || 
             g.title_ne.includes(searchQuery))
        );
    }, [userGuides, searchQuery]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex justify-end">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/20 backdrop-blur-[2px] transition-opacity"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className={`relative w-full max-w-sm h-full bg-[var(--t-surface)] border-l border-[var(--t-border)] shadow-2xl flex flex-col animate-slide-in-right overflow-hidden`}>
                
                {/* Header */}
                <div className="p-6 border-b border-[var(--t-border)] bg-[var(--t-surface2)]/50 relative z-10">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            {view === 'detail' && (
                                <button 
                                    onClick={() => setView('library')}
                                    className="w-8 h-8 rounded-lg bg-black/10 flex items-center justify-center hover:bg-[var(--t-primary)] hover:text-white transition-all text-xs"
                                    title="Back to Library"
                                >
                                    ←
                                </button>
                            )}
                            <div className="flex items-center gap-2">
                                <span className="text-2xl">{view === 'detail' ? activeGuide?.icon : '📖'}</span>
                                <div>
                                    <h2 className="text-sm font-black text-[var(--t-text)] leading-tight uppercase tracking-widest">
                                        {view === 'detail' 
                                            ? (isNe ? activeGuide?.title_ne : activeGuide?.title_en)
                                            : (isNe ? 'मद्दत केन्द्र' : 'Help Center')}
                                    </h2>
                                    <p className="text-[9px] font-black text-[var(--t-primary)] uppercase tracking-[0.2em] mt-0.5">
                                        {view === 'detail' ? (isNe ? 'निर्देशिका' : 'User Guide') : (isNe ? 'सबै मार्गनिर्देशहरू' : 'All Added Guides')}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <button 
                            onClick={onClose}
                            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/10 transition-colors text-[var(--t-text3)]"
                        >
                            ✕
                        </button>
                    </div>

                    {view === 'library' ? (
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30 text-xs">🔍</span>
                            <input 
                                type="text"
                                placeholder={isNe ? "यहाँ खोज्नुहोस्..." : "Search help topics..."}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-black/10 border border-[var(--t-border)] pl-10 pr-4 py-2.5 rounded-xl text-xs font-bold focus:border-[var(--t-primary)] transition-all outline-none"
                            />
                        </div>
                    ) : (
                        <div className="flex p-1 bg-[var(--t-bg)] rounded-xl border border-[var(--t-border)]">
                            <button 
                                onClick={() => setLanguage('ne')}
                                className={`flex-1 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${isNe ? 'bg-[var(--t-primary)] text-white shadow-sm' : 'text-[var(--t-text3)] hover:text-[var(--t-text)]'}`}
                            >
                                नेपाली
                            </button>
                            <button 
                                onClick={() => setLanguage('en')}
                                className={`flex-1 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${!isNe ? 'bg-[var(--t-primary)] text-white shadow-sm' : 'text-[var(--t-text3)] hover:text-[var(--t-text)]'}`}
                            >
                                English
                            </button>
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {view === 'library' ? (
                        /* Library List View */
                        <div className="p-6 space-y-8">
                            {/* Recommended for current page */}
                            {contextualGuide && !searchQuery && (
                                <section className="space-y-3">
                                    <h3 className="text-[9px] font-black text-[var(--t-text3)] uppercase tracking-widest pl-1">
                                        {isNe ? 'यस पृष्ठको लागि सुझाव' : 'Recommended for this page'}
                                    </h3>
                                    <button 
                                        onClick={() => { setActiveHelpKey(contextualGuide.key); setView('detail'); }}
                                        className="w-full p-4 bg-[var(--t-primary)]/5 border border-[var(--t-primary)]/20 rounded-[1.5rem] flex items-center gap-4 hover:translate-y-[-2px] hover:shadow-xl transition-all group"
                                    >
                                        <div className="w-12 h-12 rounded-xl bg-[var(--t-primary)] text-white flex items-center justify-center text-2xl shadow-lg shadow-[var(--t-primary)]/20">
                                            {contextualGuide.icon}
                                        </div>
                                        <div className="flex-1 text-left">
                                            <p className="font-black text-sm">{isNe ? contextualGuide.title_ne : contextualGuide.title_en}</p>
                                            <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest">Context Help</p>
                                        </div>
                                        <span className="text-xl group-hover:translate-x-1 transition-transform">→</span>
                                    </button>
                                </section>
                            )}

                            {/* Full List */}
                            <section className="space-y-3">
                                <h3 className="text-[9px] font-black text-[var(--t-text3)] uppercase tracking-widest pl-1">
                                    {isNe ? 'सबै निर्देशिकाहरू' : 'All Guides'}
                                </h3>
                                <div className="space-y-2">
                                    {filteredLibrary.map((g) => (
                                        <button 
                                            key={g.id}
                                            onClick={() => { setActiveHelpKey(g.key); setView('detail'); }}
                                            className="w-full p-4 hover:bg-black/5 border border-[var(--t-border)] rounded-2xl flex items-center gap-4 transition-all group"
                                        >
                                            <span className="text-2xl grayscale group-hover:grayscale-0 transition-all">{g.icon}</span>
                                            <p className="flex-1 text-left font-bold text-xs truncate">
                                                {isNe ? g.title_ne : g.title_en}
                                            </p>
                                            <span className="text-xs opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                                        </button>
                                    ))}
                                    {filteredLibrary.length === 0 && (
                                        <div className="text-center py-12 opacity-30 text-xs font-black uppercase tracking-widest">
                                            No Guides Found
                                        </div>
                                    )}
                                </div>
                            </section>
                        </div>
                    ) : (
                        /* Detail View */
                        activeGuide ? (
                            <div className="p-6 space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                                {/* Description */}
                                <section>
                                    <p className="text-sm text-[var(--t-text2)] leading-relaxed font-medium italic italic border-l-2 border-[var(--t-primary)]/20 pl-4 py-1">
                                        "{isNe ? activeGuide.description_ne : activeGuide.description_en}"
                                    </p>
                                </section>

                                {/* Video */}
                                {activeGuide.video_url && (
                                    <a 
                                        href={activeGuide.video_url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="block relative overflow-hidden rounded-[2rem] bg-black aspect-video group shadow-2xl border border-[var(--t-border)]"
                                    >
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/20 transition-all">
                                            <div className="w-14 h-14 rounded-full bg-white/30 backdrop-blur shadow-inner flex items-center justify-center group-hover:scale-110 transition-transform">
                                                <span className="text-white text-3xl ml-1">▶</span>
                                            </div>
                                        </div>
                                    </a>
                                )}

                                {/* Steps */}
                                <section className="space-y-4">
                                    <h3 className="text-[10px] font-black text-[var(--t-text3)] uppercase tracking-widest flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--t-primary)]"></span>
                                        {isNe ? 'प्रक्रिया' : 'Step-by-Step'}
                                    </h3>
                                    <div className="space-y-4">
                                        {activeGuide.steps?.sort((a,b) => a.order - b.order).map((step, idx) => (
                                            <div key={idx} className="flex gap-4 p-4 rounded-2xl bg-black/5 hover:bg-black/10 transition-all group">
                                                <span className="w-6 h-6 rounded-lg bg-[var(--t-primary)] text-white flex items-center justify-center text-[10px] font-black flex-shrink-0 shadow-lg shadow-[var(--t-primary)]/20">
                                                    {idx + 1}
                                                </span>
                                                <p className="text-xs text-[var(--t-text)] font-bold leading-relaxed pt-1">
                                                    {isNe ? step.text_ne : step.text_en}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                {/* FAQs */}
                                {activeGuide.faqs?.length > 0 && (
                                    <section className="space-y-4">
                                        <h3 className="text-[10px] font-black text-[var(--t-text3)] uppercase tracking-widest flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                            {isNe ? 'धेरै सोधिने प्रश्नहरू' : 'FAQS'}
                                        </h3>
                                        <div className="space-y-4">
                                            {activeGuide.faqs.sort((a,b) => a.order - b.order).map((faq, idx) => (
                                                <div key={idx} className="p-5 bg-[var(--t-surface2)]/50 rounded-2xl border border-[var(--t-border)] space-y-3 relative overflow-hidden">
                                                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 blur-[30px] pointer-events-none" />
                                                    <p className="text-xs font-black text-[var(--t-text)] flex gap-2 relative z-10 leading-tight">
                                                        <span className="text-amber-500">Q.</span>
                                                        {isNe ? faq.question_ne : faq.question_en}
                                                    </p>
                                                    <p className="text-[11px] text-[var(--t-text2)] leading-relaxed font-medium pl-6 opacity-80 relative z-10">
                                                        {isNe ? faq.answer_ne : faq.answer_en}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                )}
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center h-full">
                                <span className="text-6xl opacity-10 mb-4 animate-bounce">📖</span>
                                <p className="text-xs font-black uppercase tracking-widest opacity-40">Detail View Not Ready</p>
                            </div>
                        )
                    )}
                </div>

                {/* Footer Section */}
                <div className="p-6 border-t border-[var(--t-border)] bg-[var(--t-bg)]">
                    {user?.is_system_admin ? (
                        <NavLink 
                            to="/dashboard/desktop/guides"
                            onClick={onClose}
                            className="block w-full py-3 bg-[var(--t-primary)]/10 text-[var(--t-primary)] rounded-xl text-center text-[10px] font-black uppercase tracking-[0.2em] border border-[var(--t-primary)]/20 hover:bg-[var(--t-primary)] hover:text-white transition-all shadow-sm"
                        >
                            ⚙️ Manage Knowledge Base
                        </NavLink>
                    ) : (
                        <div className="flex items-center gap-3 p-3 bg-black/5 rounded-xl">
                            <span className="text-xl">💡</span>
                            <p className="text-[10px] text-[var(--t-text2)] leading-relaxed font-bold">
                                {isNe ? 'कुनै पनि सोधपुछको लागि यो मद्दत खोल्नुहोस्।' : 'Open this help panel for guidance anywhere in the app.'}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes slide-in-right {
                    from { transform: translateX(100%); }
                    to { transform: translateX(0); }
                }
                .animate-slide-in-right {
                    animation: slide-in-right 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }
            `}</style>
        </div>
    );
};

export default DynamicHelpDrawer;
