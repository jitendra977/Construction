import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useConstruction } from '../../context/ConstructionContext';

const DynamicHelpDrawer = ({ isOpen, onClose }) => {
    const location = useLocation();
    const { activeHelpKey, setActiveHelpKey, language, setLanguage, dashboardData } = useConstruction();
    const userGuides = dashboardData?.userGuides || [];

    // Auto-detect help key from route if not set manually
    useEffect(() => {
        const path = location.pathname.split('/').pop();
        const availableKeys = userGuides.map(g => g.key);
        
        if (path && availableKeys.includes(path)) {
            setActiveHelpKey(path);
        } else if (location.pathname.includes('/manage')) {
            // Manage page is complex, keep the existing activeHelpKey (set by Manage tabs)
        } else if (availableKeys.includes('home')) {
            setActiveHelpKey('home');
        }
    }, [location.pathname, setActiveHelpKey, userGuides]);

    const guide = userGuides.find(g => g.key === activeHelpKey) || userGuides.find(g => g.key === 'home');
    const isNe = language === 'ne';

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex justify-end">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/20 backdrop-blur-[2px] transition-opacity"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className={`relative w-full max-w-sm h-full bg-[var(--t-surface)] border-l border-[var(--t-border)] shadow-2xl flex flex-col animate-slide-in-right`}>
                {!guide ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
                        <span className="text-6xl opacity-20">📖</span>
                        <div className="space-y-2">
                            <h2 className="text-xl font-black text-[var(--t-text)]">
                                {isNe ? 'निर्देशिका भेटिएन' : 'Guide Not Found'}
                            </h2>
                            <p className="text-xs text-[var(--t-text2)] leading-relaxed font-medium">
                                {isNe 
                                    ? 'यस पृष्ठको लागि मद्दत निर्देशिका उपलब्ध छैन। कृपया पछि पुन: प्रयास गर्नुहोस्।' 
                                    : 'There is no help guide available for this section yet. Please check back later.'}
                            </p>
                        </div>
                        <button 
                            onClick={onClose}
                            className="px-6 py-2 bg-[var(--t-primary)] text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg hover:translate-y-[-2px] active:scale-95 transition-all"
                        >
                            {isNe ? 'बन्द गर्नुहोस्' : 'Close'}
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div className="p-6 border-b border-[var(--t-border)] bg-[var(--t-surface2)]/50">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <span className="text-3xl">{guide.icon}</span>
                                    <div>
                                        <h2 className="text-lg font-black text-[var(--t-text)] leading-tight">
                                            {isNe ? guide.title_ne : guide.title_en}
                                        </h2>
                                        <p className="text-[10px] font-black text-[var(--t-primary)] uppercase tracking-widest mt-0.5">
                                            {isNe ? 'सञ्चालन निर्देशिका' : 'User Guide'}
                                        </p>
                                    </div>
                                </div>
                                <button 
                                    onClick={onClose}
                                    className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--t-surface3)] transition-colors text-[var(--t-text3)]"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Language Toggle */}
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
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                            {/* Media */}
                            {guide.video_url && (
                                <section className="mb-4">
                                    <a 
                                        href={guide.video_url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="block relative overflow-hidden rounded-xl bg-black aspect-video group shadow-md"
                                    >
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                <span className="text-white text-2xl ml-1">▶</span>
                                            </div>
                                        </div>
                                    </a>
                                </section>
                            )}

                            {/* Description */}
                            <section>
                                <p className="text-sm text-[var(--t-text2)] leading-relaxed font-medium italic">
                                    "{isNe ? guide.description_ne : guide.description_en}"
                                </p>
                            </section>

                            {/* Steps */}
                            <section className="space-y-4">
                                <h3 className="text-xs font-black text-[var(--t-text3)] uppercase tracking-wider flex items-center gap-2">
                                    <span className="w-1 h-3 bg-[var(--t-primary)] rounded-full"></span>
                                    {isNe ? 'मुख्य चरणहरू' : 'Quick Steps'}
                                </h3>
                                {guide.type === 'tour' ? (
                                    <button 
                                        onClick={() => {
                                            window.dispatchEvent(new CustomEvent('start-interactive-tour', { detail: { guideKey: guide.key } }));
                                            onClose();
                                        }}
                                        className="w-full py-4 bg-gradient-to-r from-[var(--t-primary)] to-[var(--t-secondary)] text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-lg hover:shadow-[var(--t-primary)]/20 hover:translate-y-[-2px] active:scale-95 transition-all flex items-center justify-center gap-2"
                                    >
                                        <span className="text-lg">▶</span>
                                        {isNe ? 'अन्तर्क्रियात्मक भ्रमण सुरु गर्नुहोस्' : 'Launch Interactive Tour'}
                                    </button>
                                ) : (
                                    <div className="space-y-3">
                                        {guide.steps.map((step, idx) => (
                                            <div key={idx} className="flex gap-4 group">
                                                <span className="w-6 h-6 rounded-lg bg-[var(--t-primary)]/10 text-[var(--t-primary)] flex items-center justify-center text-[10px] font-black flex-shrink-0 group-hover:bg-[var(--t-primary)] group-hover:text-white transition-colors">
                                                    {idx + 1}
                                                </span>
                                                <p className="text-[13px] text-[var(--t-text)] font-semibold leading-relaxed pt-0.5">
                                                    {isNe ? step.text_ne : step.text_en}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>

                            {/* FAQs */}
                            {guide.faqs && guide.faqs.length > 0 && (
                                <section className="space-y-4">
                                    <h3 className="text-xs font-black text-[var(--t-text3)] uppercase tracking-wider flex items-center gap-2">
                                        <span className="w-1 h-3 bg-amber-500 rounded-full"></span>
                                        {isNe ? 'धेरै सोधिने प्रश्नहरू' : 'FAQS'}
                                    </h3>
                                    <div className="space-y-4">
                                        {guide.faqs.map((faq, idx) => (
                                            <div key={idx} className="p-4 bg-[var(--t-surface2)]/50 rounded-2xl border border-[var(--t-border)] space-y-2">
                                                <p className="text-xs font-bold text-[var(--t-text)] flex gap-2">
                                                    <span className="text-amber-500">Q.</span>
                                                    {isNe ? faq.question_ne : faq.question_en}
                                                </p>
                                                <p className="text-[11px] text-[var(--t-text2)] leading-relaxed">
                                                    {isNe ? faq.answer_ne : faq.answer_en}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}
                        </div>
                    </>
                )}

                {/* Footer Tip */}
                <div className="p-6 border-t border-[var(--t-border)] bg-[var(--t-primary)]/5">
                    <div className="flex items-start gap-3">
                        <span className="text-xl">💡</span>
                        <div>
                            <p className="text-[10px] font-black text-[var(--t-primary2)] uppercase tracking-widest mb-1">
                                {isNe ? 'प्रो टिप्स' : 'Pro Tip'}
                            </p>
                            <p className="text-[11px] text-[var(--t-text2)] leading-relaxed font-medium">
                                {isNe 
                                    ? 'ड्यासबोर्डको कुनै पनि ठाउँमा समस्या भएमा यो मद्दत प्यानल खोल्नुहोस्।' 
                                    : 'Whenever you feel stuck, just open this panel to get localized help for your current view.'}
                            </p>
                        </div>
                    </div>
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
