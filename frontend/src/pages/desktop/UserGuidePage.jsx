import React, { useState, useMemo, useEffect } from 'react';
import { useConstruction } from '../../context/ConstructionContext';
import GuideFormModal from '../../components/desktop/guides/GuideFormModal';
import StepManagementModal from '../../components/desktop/guides/StepManagementModal';
import FaqManagementModal from '../../components/desktop/guides/FaqManagementModal';
import { dashboardService, getMediaUrl } from '../../services/api';

const UserGuidePage = () => {
    const { dashboardData, user, language, refreshData } = useConstruction();
    const guides = dashboardData?.userGuides || [];
    const isNe = language === 'ne';
    const isAdmin = user?.is_system_admin;

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedGuideId, setSelectedGuideId] = useState(null);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isStepModalOpen, setIsStepModalOpen] = useState(false);
    const [isFaqModalOpen, setIsFaqModalOpen] = useState(false);
    const [editingGuide, setEditingGuide] = useState(null);
    const [isManageMode, setIsManageMode] = useState(false);
    
    // Unified Detail/Edit State
    const [isEditingDetail, setIsEditingDetail] = useState(false);
    const [localGuideData, setLocalGuideData] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    // Derive active guide from live data
    const selectedGuide = useMemo(() => {
        return guides.find(g => g.id === selectedGuideId);
    }, [guides, selectedGuideId]);

    // Initialize local guide data when a guide is selected or edit mode toggled
    useEffect(() => {
        if (selectedGuide) {
            setLocalGuideData({
                ...selectedGuide,
                steps: [...(selectedGuide.steps || [])].sort((a, b) => a.order - b.order),
                faqs: [...(selectedGuide.faqs || [])].sort((a, b) => a.order - b.order)
            });
        } else {
            setLocalGuideData(null);
            setIsEditingDetail(false);
        }
    }, [selectedGuide, isEditingDetail]);

    const filteredGuides = useMemo(() => {
        return guides.filter(g => 
            (isAdmin || g.is_active) && 
            (g.title_en.toLowerCase().includes(searchQuery.toLowerCase()) || 
             g.title_ne.includes(searchQuery))
        );
    }, [guides, searchQuery, isAdmin]);

    const handleDeleteGuide = async (id) => {
        if (!window.confirm("Are you sure? This will delete all associated steps and FAQ.")) return;
        try {
            await dashboardService.deleteUserGuide(id);
            refreshData();
            if (selectedGuideId === id) setSelectedGuideId(null);
        } catch (error) {
            alert("Error deleting guide.");
        }
    };

    const handleToggleStatus = async (guide) => {
        try {
            await dashboardService.updateUserGuide(guide.id, { is_active: !guide.is_active });
            refreshData();
        } catch (error) {
            alert("Failed to toggle status.");
        }
    };

    const handleReorder = async (guide, direction) => {
        const currentIndex = guides.findIndex(g => g.id === guide.id);
        const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        
        if (targetIndex < 0 || targetIndex >= guides.length) return;

        const targetGuide = guides[targetIndex];
        
        try {
            await Promise.all([
                dashboardService.updateUserGuide(guide.id, { order: targetGuide.order }),
                dashboardService.updateUserGuide(targetGuide.id, { order: guide.order })
            ]);
            refreshData();
        } catch (error) {
            console.error("Reorder failed:", error);
        }
    };

    // Unified Saving Logic
    const handleSaveAllChanges = async () => {
        if (!localGuideData) return;
        setIsSaving(true);
        try {
            // 1. Update Metadata
            await dashboardService.updateUserGuide(localGuideData.id, {
                title_en: localGuideData.title_en,
                title_ne: localGuideData.title_ne,
                description_en: localGuideData.description_en,
                description_ne: localGuideData.description_ne,
                icon: localGuideData.icon,
                is_active: localGuideData.is_active,
                type: localGuideData.type,
                video_url: localGuideData.video_url
            });

            // 2. Steps are usually updated via their own ID. For simplicity in this unified view:
            // We will save each modified step. 
            // NOTE: In a production environment, we could bulk update or only update dirty fields.
            const stepUpdates = localGuideData.steps.map(step => {
                if (step.id) {
                    return dashboardService.updateGuideStep(step.id, step);
                } else {
                    return dashboardService.createGuideStep({ ...step, guide: localGuideData.id });
                }
            });

            const faqUpdates = localGuideData.faqs.map(faq => {
                if (faq.id) {
                    return dashboardService.updateGuideFaq(faq.id, faq);
                } else {
                    return dashboardService.createGuideFaq({ ...faq, guide: localGuideData.id });
                }
            });

            await Promise.all([...stepUpdates, ...faqUpdates]);
            
            await refreshData();
            setIsEditingDetail(false);
            alert("Successfully saved all documentation changes!");
        } catch (error) {
            console.error("Bulk save failed:", error);
            alert("Failed to save some changes. Please check your data.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddLocalStep = () => {
        const newStep = {
            order: localGuideData.steps.length,
            text_en: 'New Step Instruction',
            text_ne: 'नयाँ चरण निर्देशिका',
            target_element: '',
            placement: 'bottom'
        };
        setLocalGuideData({
            ...localGuideData,
            steps: [...localGuideData.steps, newStep]
        });
    };

    const handleAddLocalFaq = () => {
        const newFaq = {
            order: localGuideData.faqs.length,
            question_en: 'New Question',
            question_ne: 'नयाँ प्रश्न',
            answer_en: 'Answer here',
            answer_ne: 'उत्तर यहाँ'
        };
        setLocalGuideData({
            ...localGuideData,
            faqs: [...localGuideData.faqs, newFaq]
        });
    };

    const handleRemoveLocalStep = (index) => {
        const confirmed = window.confirm("Remove this step temporarily? (Save to finalize)");
        if (!confirmed) return;
        const newSteps = [...localGuideData.steps];
        newSteps.splice(index, 1);
        setLocalGuideData({ ...localGuideData, steps: newSteps });
    };

    const handleRemoveLocalFaq = (index) => {
        const confirmed = window.confirm("Remove this FAQ temporarily? (Save to finalize)");
        if (!confirmed) return;
        const newFaqs = [...localGuideData.faqs];
        newFaqs.splice(index, 1);
        setLocalGuideData({ ...localGuideData, faqs: newFaqs });
    };

    return (
        <div className="p-8 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-7xl mx-auto min-h-screen pb-32">
            {/* Header & Controls */}
            <div className="flex flex-col gap-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-[var(--t-surface)] p-8 rounded-[3rem] border border-[var(--t-border)] shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--t-primary)]/5 blur-[80px] -mr-32 -mt-32 pointer-events-none" />
                    
                    <div className="relative z-10 flex items-center gap-6">
                        <div className="w-16 h-16 rounded-2xl bg-[var(--t-primary)]/10 flex items-center justify-center text-4xl shadow-inner border border-[var(--t-primary)]/20">
                            {isManageMode ? '⚙️' : '📚'}
                        </div>
                        <div>
                            <h1 className="text-4xl font-black tracking-tight" style={{ color: 'var(--t-text)' }}>
                                {isManageMode ? (isNe ? 'व्यवस्थापन' : 'Management') : (isNe ? 'मद्दत' : 'User')} <span style={{ color: 'var(--t-primary)' }}>{isManageMode ? (isNe ? 'ड्यासबोर्ड' : 'Dashboard') : (isNe ? 'निर्देशिका' : 'Guide')}</span>
                            </h1>
                            <p className="text-[var(--t-text3)] font-bold mt-1 uppercase tracking-[0.2em] text-xs">
                                {isManageMode ? 'Curation & Documentation Control' : (isNe ? 'सिकाउने र मद्दत गर्ने थलो' : 'Documentation & Knowledge Base')}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto relative z-10">
                        {isAdmin && (
                            <div className="flex bg-black/10 p-1.5 rounded-2xl border border-[var(--t-border)] shadow-inner">
                                <button 
                                    onClick={() => setIsManageMode(false)}
                                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${!isManageMode ? 'bg-[var(--t-surface)] text-[var(--t-primary)] shadow-lg scale-105' : 'opacity-40 hover:opacity-100'}`}
                                >
                                    Library
                                </button>
                                <button 
                                    onClick={() => setIsManageMode(true)}
                                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${isManageMode ? 'bg-[var(--t-surface)] text-[var(--t-primary)] shadow-lg scale-105' : 'opacity-40 hover:opacity-100'}`}
                                >
                                    Manage
                                </button>
                            </div>
                        )}

                        <div className="relative flex-1 md:w-64">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40">🔍</span>
                            <input 
                                type="text"
                                placeholder={isNe ? "खोज्नुहोस्..." : "Search..."}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-black/10 border border-[var(--t-border)] pl-12 pr-4 py-3 rounded-2xl font-bold focus:border-[var(--t-primary)] transition-all outline-none text-xs"
                            />
                        </div>
                        {isAdmin && (
                            <button 
                                onClick={() => { setEditingGuide(null); setIsFormModalOpen(true); }}
                                className="p-3 bg-[var(--t-primary)] text-white rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-all aspect-square flex items-center justify-center text-xl"
                                title="Add New Guide"
                            >
                                +
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Content Area */}
            {isManageMode && isAdmin ? (
                /* Management Table View */
                <div className="bg-[var(--t-surface)] rounded-[3rem] border border-[var(--t-border)] shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-500">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-black/5">
                                    <th className="p-6 text-[10px] font-black uppercase tracking-widest opacity-40">Sequence</th>
                                    <th className="p-6 text-[10px] font-black uppercase tracking-widest opacity-40">Guide / Title</th>
                                    <th className="p-6 text-[10px] font-black uppercase tracking-widest opacity-40">Key</th>
                                    <th className="p-6 text-[10px] font-black uppercase tracking-widest opacity-40">Status</th>
                                    <th className="p-6 text-[10px] font-black uppercase tracking-widest opacity-40 text-center">Steps / FAQs</th>
                                    <th className="p-6 text-[10px] font-black uppercase tracking-widest opacity-40 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--t-border)]">
                                {guides.map((guide, idx) => (
                                    <tr key={guide.id} className="hover:bg-black/5 transition-colors group">
                                        <td className="p-6">
                                            <div className="flex flex-col gap-1 items-center">
                                                <button 
                                                    disabled={idx === 0}
                                                    onClick={() => handleReorder(guide, 'up')}
                                                    className={`p-1 hover:scale-125 transition-transform ${idx === 0 ? 'opacity-10 cursor-not-allowed' : 'opacity-40 hover:opacity-100 text-[var(--t-primary)]'}`}
                                                >▲</button>
                                                <span className="text-xs font-black opacity-20">{idx + 1}</span>
                                                <button 
                                                    disabled={idx === guides.length - 1}
                                                    onClick={() => handleReorder(guide, 'down')}
                                                    className={`p-1 hover:scale-125 transition-transform ${idx === guides.length - 1 ? 'opacity-10 cursor-not-allowed' : 'opacity-40 hover:opacity-100 text-[var(--t-primary)]'}`}
                                                >▼</button>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex items-center gap-4">
                                                <span className="text-3xl grayscale group-hover:grayscale-0 transition-all">{guide.icon}</span>
                                                <div>
                                                    <p className="font-black text-sm">{isNe ? guide.title_ne : guide.title_en}</p>
                                                    <p className="text-[10px] uppercase font-bold opacity-40 tracking-wider mix-blend-difference">{guide.type}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <code className="text-[10px] bg-black/10 px-2 py-1 rounded-md font-bold opacity-60">
                                                {guide.key}
                                            </code>
                                        </td>
                                        <td className="p-6">
                                            <button 
                                                onClick={() => handleToggleStatus(guide)}
                                                className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${guide.is_active 
                                                    ? 'bg-green-500/10 text-green-500 border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.1)]' 
                                                    : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}
                                            >
                                                {guide.is_active ? 'Public' : 'Draft'}
                                            </button>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex justify-center gap-4">
                                                <div className="text-center">
                                                    <p className="text-xs font-black">{guide.steps?.length || 0}</p>
                                                    <p className="text-[8px] font-bold opacity-40 uppercase tracking-tighter">Steps</p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-xs font-black">{guide.faqs?.length || 0}</p>
                                                    <p className="text-[8px] font-bold opacity-40 uppercase tracking-tighter">FAQs</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => { setSelectedGuideId(guide.id); setIsEditingDetail(true); }} className="w-9 h-9 bg-[var(--t-surface2)] hover:bg-[var(--t-primary)] hover:text-white border border-[var(--t-border)] rounded-xl flex items-center justify-center text-sm transition-all shadow-sm" title="Edit Metadata">✏️</button>
                                                <button onClick={() => handleDeleteGuide(guide.id)} className="w-9 h-9 bg-red-500/5 hover:bg-red-500 hover:text-white border border-red-500/10 text-red-500 rounded-xl flex items-center justify-center text-sm transition-all shadow-sm" title="Delete">🗑️</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                /* Library Card View */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredGuides.map((guide) => (
                        <div 
                            key={guide.id}
                            onClick={() => setSelectedGuideId(guide.id)}
                            className={`group relative bg-[var(--t-surface)] border border-[var(--t-border)] rounded-[2.5rem] p-8 transition-all hover:translate-y-[-8px] hover:shadow-2xl hover:border-[var(--t-primary)]/40 overflow-hidden cursor-pointer ${!guide.is_active ? 'border-dashed opacity-70' : ''}`}
                        >
                            {isAdmin && (
                                <div className="absolute top-6 right-6 flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${guide.is_active ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]'}`} />
                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-40">
                                        {guide.is_active ? 'Public' : 'Hidden'}
                                    </span>
                                </div>
                            )}

                            <div className="w-16 h-16 rounded-[1.5rem] bg-[var(--t-bg)] border border-[var(--t-border)] flex items-center justify-center text-3xl mb-6 shadow-inner group-hover:scale-110 transition-transform duration-500">
                                {guide.icon}
                            </div>

                            <div className="space-y-3">
                                <h3 className="text-xl font-black leading-tight group-hover:text-[var(--t-primary)] transition-colors">
                                    {isNe ? guide.title_ne : guide.title_en}
                                </h3>
                                <p className="text-[var(--t-text2)] text-sm line-clamp-3 leading-relaxed font-medium">
                                    {isNe ? guide.description_ne : guide.description_en}
                                </p>
                            </div>

                            <div className="mt-8 pt-6 border-t border-[var(--t-border)] flex items-center justify-between">
                                <div className="flex gap-4">
                                    <p className="text-[10px] font-black uppercase tracking-widest bg-black/10 px-3 py-1.5 rounded-lg border border-[var(--t-border)]">
                                        🚀 {guide.steps?.length || 0} {isNe ? 'चरण' : 'Steps'}
                                    </p>
                                    {guide.faqs?.length > 0 && (
                                        <p className="text-[10px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-500 px-3 py-1.5 rounded-lg border border-amber-500/20">
                                            ❓ {guide.faqs?.length} {isNe ? 'प्रश्न' : 'FAQs'}
                                        </p>
                                    )}
                                </div>
                                <span className="text-xl opacity-0 group-hover:opacity-100 translate-x-[-10px] group-hover:translate-x-0 transition-all duration-300">
                                    →
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Empty State */}
            {filteredGuides.length === 0 && (
                <div className="col-span-full py-40 flex flex-col items-center justify-center border-4 border-dashed border-[var(--t-border)] rounded-[4rem] opacity-30 text-center text-sm font-bold uppercase tracking-widest">
                    <span className="text-9xl mb-8 animate-pulse">📖</span>
                    {isNe ? 'कुनै नतिजा भेटिएन' : 'No Results Found'}
                </div>
            )}

            {/* Unified Guide Detail & Edit Slide-over */}
            {selectedGuide && localGuideData && (
                <div className="fixed inset-0 z-[100] flex justify-end animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { if(!isEditingDetail || window.confirm("Discard unsaved changes?")) setSelectedGuideId(null); }} />
                    <div className="relative w-full max-w-2xl h-full bg-[var(--t-surface)] shadow-2xl border-l border-[var(--t-border)] flex flex-col animate-slide-in-right overflow-hidden">
                        
                        {/* Header */}
                        <div className="p-8 border-b border-[var(--t-border)] flex items-center justify-between bg-[var(--t-bg)]/50 relative z-10">
                            <div className="flex items-center gap-6 flex-1">
                                {isEditingDetail ? (
                                    <input 
                                        type="text"
                                        value={localGuideData.icon}
                                        onChange={(e) => setLocalGuideData({ ...localGuideData, icon: e.target.value })}
                                        className="text-4xl w-16 h-16 bg-black/10 border border-[var(--t-border)] rounded-2xl text-center"
                                    />
                                ) : (
                                    <span className="text-5xl">{localGuideData.icon}</span>
                                )}
                                <div className="flex-1">
                                    {isEditingDetail ? (
                                        <div className="space-y-2">
                                            <input 
                                                value={isNe ? localGuideData.title_ne : localGuideData.title_en}
                                                onChange={(e) => setLocalGuideData({ 
                                                    ...localGuideData, 
                                                    [isNe ? 'title_ne' : 'title_en']: e.target.value 
                                                })}
                                                className="text-2xl font-black bg-black/10 border border-[var(--t-border)] p-2 rounded-lg w-full"
                                                placeholder="Title"
                                            />
                                        </div>
                                    ) : (
                                        <h2 className="text-3xl font-black leading-tight">
                                            {isNe ? localGuideData.title_ne : localGuideData.title_en}
                                        </h2>
                                    )}
                                    <div className="flex gap-2 mt-2">
                                        <p className="text-[10px] font-black text-[var(--t-primary)] uppercase tracking-[0.2em] border border-[var(--t-primary)]/20 px-3 py-1 rounded-full w-fit">
                                            {localGuideData.type} Guide
                                        </p>
                                        {!localGuideData.is_active && (
                                            <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] border border-amber-500/20 px-3 py-1 rounded-full w-fit">
                                                DRAFT
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                                {isAdmin && (
                                    <button 
                                        onClick={() => setIsEditingDetail(!isEditingDetail)}
                                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${isEditingDetail ? 'bg-[var(--t-primary)] text-white' : 'bg-black/10'}`}
                                    >
                                        {isEditingDetail ? '👁️ Preview' : '✏️ Edit'}
                                    </button>
                                )}
                                <button 
                                    onClick={() => setSelectedGuideId(null)}
                                    className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-black/10 transition-colors text-xl"
                                >✕</button>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto p-12 space-y-12">
                            {/* Description */}
                            <section className="relative">
                                <span className="absolute -left-6 top-0 text-6xl opacity-10 pointer-events-none select-none">"</span>
                                {isEditingDetail ? (
                                    <textarea 
                                        value={isNe ? localGuideData.description_ne : localGuideData.description_en}
                                        onChange={(e) => setLocalGuideData({ 
                                            ...localGuideData, 
                                            [isNe ? 'description_ne' : 'description_en']: e.target.value 
                                        })}
                                        className="w-full bg-black/10 border border-[var(--t-border)] p-4 rounded-2xl text-lg font-medium italic min-h-[100px]"
                                        placeholder="Description..."
                                    />
                                ) : (
                                    <p className="text-xl font-medium text-[var(--t-text2)] leading-relaxed italic">
                                        {isNe ? localGuideData.description_ne : localGuideData.description_en}
                                    </p>
                                )}
                            </section>

                            {/* Steps */}
                            <section className="space-y-6">
                                <div className="flex justify-between items-center border-b border-[var(--t-border)] pb-4">
                                    <h3 className="text-xs font-black uppercase tracking-[0.2em] opacity-40">Instructional Steps</h3>
                                    {isEditingDetail && (
                                        <button 
                                            onClick={handleAddLocalStep}
                                            className="text-[10px] font-black uppercase text-[var(--t-primary)]"
                                        >+ Add Step</button>
                                    )}
                                </div>
                                <div className="space-y-8">
                                    {localGuideData.steps.map((step, idx) => (
                                        <div key={idx} className="flex gap-8 group">
                                            <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-[var(--t-primary)] text-white shadow-xl shadow-[var(--t-primary)]/20 flex items-center justify-center font-black text-xl relative">
                                                {idx + 1}
                                                {isEditingDetail && (
                                                    <button 
                                                        onClick={() => handleRemoveLocalStep(idx)}
                                                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-[10px] border-2 border-[var(--t-surface)]"
                                                    >✕</button>
                                                )}
                                            </div>
                                            <div className="space-y-4 pt-1 flex-1">
                                                {isEditingDetail ? (
                                                    <div className="space-y-3">
                                                        <textarea 
                                                            value={isNe ? step.text_ne : step.text_en}
                                                            onChange={(e) => {
                                                                const newSteps = [...localGuideData.steps];
                                                                newSteps[idx] = { ...step, [isNe ? 'text_ne' : 'text_en']: e.target.value };
                                                                setLocalGuideData({ ...localGuideData, steps: newSteps });
                                                            }}
                                                            className="w-full bg-black/5 border border-[var(--t-border)] p-3 rounded-xl text-sm font-bold"
                                                            placeholder="Step instruction..."
                                                        />
                                                        <div className="flex gap-3">
                                                           <input 
                                                                placeholder="Target CSS (e.g. #add-btn)"
                                                                value={step.target_element || ''}
                                                                onChange={(e) => {
                                                                    const newSteps = [...localGuideData.steps];
                                                                    newSteps[idx] = { ...step, target_element: e.target.value };
                                                                    setLocalGuideData({ ...localGuideData, steps: newSteps });
                                                                }}
                                                                className="flex-1 bg-black/5 border border-[var(--t-border)] px-3 py-2 rounded-lg text-[10px] font-bold"
                                                           />
                                                           <select 
                                                                value={step.placement || 'bottom'}
                                                                onChange={(e) => {
                                                                    const newSteps = [...localGuideData.steps];
                                                                    newSteps[idx] = { ...step, placement: e.target.value };
                                                                    setLocalGuideData({ ...localGuideData, steps: newSteps });
                                                                }}
                                                                className="bg-black/5 border border-[var(--t-border)] px-3 py-2 rounded-lg text-[10px]"
                                                           >
                                                               <option value="top">Top</option>
                                                               <option value="bottom">Bottom</option>
                                                               <option value="left">Left</option>
                                                               <option value="right">Right</option>
                                                           </select>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <p className="text-lg font-bold leading-relaxed text-[var(--t-text)]">
                                                        {isNe ? step.text_ne : step.text_en}
                                                    </p>
                                                )}
                                                {step.media && !isEditingDetail && (
                                                    <div className="rounded-3xl overflow-hidden border border-[var(--t-border)] shadow-xl max-w-md bg-black/5">
                                                        <img src={getMediaUrl(step.media)} alt="Step Instruction" className="w-full object-contain max-h-80" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* FAQs */}
                            <section className="space-y-6">
                                <div className="flex justify-between items-center border-b border-[var(--t-border)] pb-4">
                                    <h3 className="text-xs font-black uppercase tracking-[0.2em] opacity-40">Common Questions</h3>
                                    {isEditingDetail && (
                                        <button 
                                            onClick={handleAddLocalFaq}
                                            className="text-[10px] font-black uppercase text-[var(--t-primary)]"
                                        >+ Add FAQ</button>
                                    )}
                                </div>
                                <div className="space-y-6">
                                    {localGuideData.faqs.map((faq, idx) => (
                                        <div key={idx} className="p-8 bg-[var(--t-surface2)]/50 rounded-[2rem] border border-[var(--t-border)] relative overflow-hidden group">
                                            {isEditingDetail ? (
                                                <div className="space-y-4">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-[10px] font-black text-[var(--t-primary)] uppercase">Editing FAQ {idx+1}</span>
                                                        <button 
                                                            onClick={() => handleRemoveLocalFaq(idx)}
                                                            className="text-red-500 text-[10px] font-black uppercase"
                                                        >Delete</button>
                                                    </div>
                                                    <input 
                                                        value={isNe ? faq.question_ne : faq.question_en}
                                                        onChange={(e) => {
                                                            const newFaqs = [...localGuideData.faqs];
                                                            newFaqs[idx] = { ...faq, [isNe ? 'question_ne' : 'question_en']: e.target.value };
                                                            setLocalGuideData({ ...localGuideData, faqs: newFaqs });
                                                        }}
                                                        className="w-full bg-black/10 border border-[var(--t-border)] p-3 rounded-xl text-lg font-black"
                                                        placeholder="Question..."
                                                    />
                                                    <textarea 
                                                        value={isNe ? faq.answer_ne : faq.answer_en}
                                                        onChange={(e) => {
                                                            const newFaqs = [...localGuideData.faqs];
                                                            newFaqs[idx] = { ...faq, [isNe ? 'answer_ne' : 'answer_en']: e.target.value };
                                                            setLocalGuideData({ ...localGuideData, faqs: newFaqs });
                                                        }}
                                                        className="w-full bg-black/10 border border-[var(--t-border)] p-3 rounded-xl text-sm font-medium"
                                                        placeholder="Answer..."
                                                    />
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-[40px] -mr-16 -mt-16 pointer-events-none" />
                                                    <div className="flex gap-4 items-start mb-3 relative z-10">
                                                        <span className="text-amber-500 font-black text-xl">Q.</span>
                                                        <p className="text-lg font-black">{isNe ? faq.question_ne : faq.question_en}</p>
                                                    </div>
                                                    <p className="text-[var(--t-text2)] leading-relaxed font-medium pl-10 relative z-10">
                                                        {isNe ? faq.answer_ne : faq.answer_en}
                                                    </p>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </div>

                        {/* Footer */}
                        <div className="p-8 bg-[var(--t-surface2)] border-t border-[var(--t-border)] flex justify-between items-center relative z-20">
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-40 italic">
                                Professional Knowledge Base • System Admin
                            </span>
                            {isEditingDetail && (
                                <button 
                                    onClick={handleSaveAllChanges}
                                    disabled={isSaving}
                                    className="px-8 py-3 bg-[var(--t-primary)] text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-[var(--t-primary)]/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                                >
                                    {isSaving ? 'Saving Changes...' : '💾 Save Documentation'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modals are still available as fallbacks or for creating new guides */}
            {isFormModalOpen && (
                <GuideFormModal 
                    guide={editingGuide} 
                    onClose={() => setIsFormModalOpen(false)} 
                    onSuccess={() => { setIsFormModalOpen(false); refreshData(); }}
                />
            )}
            
            <style>{`
                @keyframes slide-in-right {
                    from { transform: translateX(100%); }
                    to { transform: translateX(0); }
                }
                .animate-slide-in-right {
                    animation: slide-in-right 0.5s cubic-bezier(0.16, 1, 0.3, 1);
                }
            `}</style>
        </div>
    );
};

export default UserGuidePage;
