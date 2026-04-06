import React, { useState, useMemo, useEffect } from 'react';
import { useConstruction } from '../../context/ConstructionContext';
import { dashboardService, getMediaUrl } from '../../services/api';
import ConfirmModal from '../../components/common/ConfirmModal';

const UserGuidePage = () => {
    const { dashboardData, user, language, refreshData } = useConstruction();
    const guides = dashboardData?.userGuides || [];
    const isNe = language === 'ne';
    const isAdmin = user?.is_system_admin;

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedGuideId, setSelectedGuideId] = useState(null);
    const [isManageMode, setIsManageMode] = useState(false);
    
    // Unified Documentation State
    const [isEditingDetail, setIsEditingDetail] = useState(false);
    const [isCreateMode, setIsCreateMode] = useState(false);
    const [formLanguage, setFormLanguage] = useState(language || 'en');
    const [localGuideData, setLocalGuideData] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    // Confirmation Modal System
    const [confirmConfig, setConfirmConfig] = useState({ isOpen: false });
    const showConfirm = (config) => setConfirmConfig({ ...config, isOpen: true });
    const closeConfirm = () => setConfirmConfig({ ...confirmConfig, isOpen: false });

    // Derive active guide from live data
    const selectedGuide = useMemo(() => {
        return guides.find(g => g.id === selectedGuideId);
    }, [guides, selectedGuideId]);

    // Initialize local guide data when a guide is selected or create mode toggled
    useEffect(() => {
        if (isCreateMode) {
            setLocalGuideData({
                title_en: '', title_ne: '',
                description_en: '', description_ne: '',
                icon: 'ℹ️', type: 'modal', key: '',
                is_active: true, order: guides.length,
                steps: [], faqs: []
            });
        } else if (selectedGuide) {
            setLocalGuideData({
                ...selectedGuide,
                steps: [...(selectedGuide.steps || [])].sort((a, b) => a.order - b.order),
                faqs: [...(selectedGuide.faqs || [])].sort((a, b) => a.order - b.order)
            });
        } else {
            setLocalGuideData(null);
            setIsEditingDetail(false);
        }
    }, [selectedGuide, isCreateMode, guides.length]);

    const filteredGuides = useMemo(() => {
        return guides.filter(g => 
            (isAdmin || g.is_active) && 
            (g.title_en.toLowerCase().includes(searchQuery.toLowerCase()) || 
             g.title_ne.includes(searchQuery))
        );
    }, [guides, searchQuery, isAdmin]);

    const handleDeleteGuide = (id) => {
        showConfirm({
            title: "Delete Guide?",
            message: "This will permanently remove the guide, all its steps, and FAQ data. This action cannot be undone.",
            confirmText: "Yes, Delete Everything",
            type: "danger",
            onConfirm: async () => {
                try {
                    await dashboardService.deleteUserGuide(id);
                    refreshData();
                    if (selectedGuideId === id) setSelectedGuideId(null);
                    closeConfirm();
                } catch (error) {
                    alert("Error deleting guide.");
                    closeConfirm();
                }
            }
        });
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

    // Unified Saving Logic for both Create and Update
    const handleSaveAllChanges = async () => {
        if (!localGuideData) return;
        if (isCreateMode && !localGuideData.key) return alert("Unique Key is required.");
        
        setIsSaving(true);
        try {
            let guideId = localGuideData.id;

            // 1. Create or Update Guide Metadata
            if (isCreateMode) {
                const response = await dashboardService.createUserGuide(localGuideData);
                guideId = response.data.id;
            } else {
                await dashboardService.updateUserGuide(guideId, {
                    title_en: localGuideData.title_en,
                    title_ne: localGuideData.title_ne,
                    description_en: localGuideData.description_en,
                    description_ne: localGuideData.description_ne,
                    icon: localGuideData.icon,
                    is_active: localGuideData.is_active,
                    type: localGuideData.type,
                    key: localGuideData.key,
                    video_url: localGuideData.video_url
                });
            }

            // 2. Save Steps & FAQs
            const stepUpdates = localGuideData.steps.map(step => {
                if (step.id) return dashboardService.updateGuideStep(step.id, step);
                return dashboardService.createGuideStep({ ...step, guide: guideId });
            });

            const faqUpdates = localGuideData.faqs.map(faq => {
                if (faq.id) return dashboardService.updateGuideFaq(faq.id, faq);
                return dashboardService.createGuideFaq({ ...faq, guide: guideId });
            });

            await Promise.all([...stepUpdates, ...faqUpdates]);
            
            await refreshData();
            setIsEditingDetail(false);
            setIsCreateMode(false);
            setSelectedGuideId(null);
            alert(`Successfully ${isCreateMode ? 'created' : 'saved'} documentation!`);
        } catch (error) {
            console.error("Save failed:", error);
            alert("Failed to save. Please check your data.");
        } finally {
            setIsSaving(false);
        }
    };

    // Local Field Switcher
    const getLF = (field) => {
        const key = formLanguage === 'en' ? `${field}_en` : `${field}_ne`;
        return localGuideData[key] || '';
    };

    const updateLF = (field, val) => {
        const key = formLanguage === 'en' ? `${field}_en` : `${field}_ne`;
        setLocalGuideData({ ...localGuideData, [key]: val });
    };

    const handleAddLocalStep = () => {
        const newStep = {
            order: localGuideData.steps.length,
            text_en: 'New Step Instruction', text_ne: 'नयाँ चरण निर्देशिका',
            target_element: '', placement: 'bottom'
        };
        setLocalGuideData({ ...localGuideData, steps: [...localGuideData.steps, newStep] });
    };

    const handleAddLocalFaq = () => {
        const newFaq = {
            order: localGuideData.faqs.length,
            question_en: 'New Question', question_ne: 'नयाँ प्रश्न',
            answer_en: 'Answer here', answer_ne: 'उत्तर यहाँ'
        };
        setLocalGuideData({ ...localGuideData, faqs: [...localGuideData.faqs, newFaq] });
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
                                {isManageMode ? 'Documentation Control' : (isNe ? 'सिकाउने थलो' : 'Knowledge Base')}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto relative z-10">
                        {isAdmin && (
                            <div className="flex bg-black/10 p-1.5 rounded-2xl border border-[var(--t-border)] shadow-inner">
                                <button onClick={() => setIsManageMode(false)} className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${!isManageMode ? 'bg-[var(--t-surface)] text-[var(--t-primary)] shadow-lg' : 'opacity-40'}`}>Library</button>
                                <button onClick={() => setIsManageMode(true)} className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${isManageMode ? 'bg-[var(--t-surface)] text-[var(--t-primary)] shadow-lg' : 'opacity-40'}`}>Manage</button>
                            </div>
                        )}
                        <div className="relative flex-1 md:w-64">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40">🔍</span>
                            <input 
                                type="text" placeholder={isNe ? "खोज्नुहोस्..." : "Search..."}
                                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-black/10 border border-[var(--t-border)] pl-12 pr-4 py-3 rounded-2xl font-bold"
                            />
                        </div>
                        {isAdmin && (
                            <button 
                                onClick={() => { setIsCreateMode(true); setIsEditingDetail(true); }}
                                className="p-3 bg-[var(--t-primary)] text-white rounded-2xl shadow-lg hover:scale-105 transition-all text-xl"
                            >+</button>
                        )}
                    </div>
                </div>
            </div>

            {/* Content Area */}
            {isManageMode && isAdmin ? (
                <div className="bg-[var(--t-surface)] rounded-[3rem] border border-[var(--t-border)] shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-500">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-black/5 text-[10px] font-black uppercase tracking-widest opacity-40">
                                <tr>
                                    <th className="p-6">Order</th>
                                    <th className="p-6">Guide Name</th>
                                    <th className="p-6">Key</th>
                                    <th className="p-6">Status</th>
                                    <th className="p-6 text-center">Data</th>
                                    <th className="p-6 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--t-border)]">
                                {guides.map((guide, idx) => (
                                    <tr key={guide.id} className="hover:bg-black/5 transition-colors group">
                                        <td className="p-6">
                                            <div className="flex flex-col items-center">
                                                <button onClick={() => handleReorder(guide, 'up')} className="opacity-40 hover:opacity-100">▲</button>
                                                <span className="text-xs font-black opacity-20">{idx+1}</span>
                                                <button onClick={() => handleReorder(guide, 'down')} className="opacity-40 hover:opacity-100">▼</button>
                                            </div>
                                        </td>
                                        <td className="p-6 font-black text-sm flex items-center gap-4">
                                            <span className="text-3xl">{guide.icon}</span>
                                            {isNe ? guide.title_ne : guide.title_en}
                                        </td>
                                        <td className="p-6"><code className="text-[10px] bg-black/10 px-2 py-1 rounded font-bold opacity-60">{guide.key}</code></td>
                                        <td className="p-6">
                                            <button 
                                                onClick={() => handleToggleStatus(guide)}
                                                className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${guide.is_active ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}
                                            >{guide.is_active ? 'Public' : 'Draft'}</button>
                                        </td>
                                        <td className="p-6 text-center text-[10px] font-black opacity-40 uppercase">
                                            {guide.steps?.length || 0} Steps • {guide.faqs?.length || 0} FAQs
                                        </td>
                                        <td className="p-6 text-right space-x-2">
                                            <button onClick={() => { setSelectedGuideId(guide.id); setIsEditingDetail(true); }} className="p-2.5 bg-black/10 rounded-xl hover:bg-[var(--t-primary)] hover:text-white transition-all">✏️</button>
                                            <button onClick={() => handleDeleteGuide(guide.id)} className="p-2.5 bg-red-500/5 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all">🗑️</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredGuides.map((guide) => (
                        <div 
                            key={guide.id} onClick={() => setSelectedGuideId(guide.id)}
                            className="group bg-[var(--t-surface)] border border-[var(--t-border)] rounded-[2.5rem] p-8 hover:-translate-y-2 hover:shadow-2xl hover:border-[var(--t-primary)]/40 transition-all cursor-pointer"
                        >
                            <div className="w-16 h-16 rounded-[1.5rem] bg-black/10 flex items-center justify-center text-3xl mb-6 shadow-inner group-hover:scale-110 transition-transform">
                                {guide.icon}
                            </div>
                            <h3 className="text-xl font-black group-hover:text-[var(--t-primary)] transition-colors">{isNe ? guide.title_ne : guide.title_en}</h3>
                            <p className="text-[var(--t-text2)] text-sm line-clamp-2 font-medium mt-3">{isNe ? guide.description_ne : guide.description_en}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Unified Side Drawer (Add & Detail/Edit) */}
            {localGuideData && (
                <div className="fixed inset-0 z-[100] flex justify-end animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { 
                        if(!isEditingDetail) { setIsCreateMode(false); setSelectedGuideId(null); }
                        else {
                            showConfirm({
                                title: "Discard Changes?",
                                message: "You have unsaved changes in this documentation. Are you sure you want to exit without saving?",
                                confirmText: "Yes, Discard",
                                onConfirm: () => { setIsCreateMode(false); setSelectedGuideId(null); closeConfirm(); },
                                onCancel: closeConfirm
                            });
                        }
                    }} />
                    <div className="relative w-full max-w-2xl h-full bg-[var(--t-surface)] shadow-2xl border-l border-[var(--t-border)] flex flex-col animate-slide-in-right overflow-hidden">
                        
                        {/* Drawer Header */}
                        <div className="p-8 border-b border-[var(--t-border)] flex items-center justify-between bg-[var(--t-bg)]/50 backdrop-blur relative z-10">
                            <div className="flex items-center gap-6 flex-1">
                                <input 
                                    value={localGuideData.icon} onChange={(e) => setLocalGuideData({ ...localGuideData, icon: e.target.value })}
                                    className="text-4xl w-16 h-16 bg-black/10 border border-[var(--t-border)] rounded-2xl text-center"
                                />
                                <div className="flex-1">
                                    <input 
                                        value={getLF('title')} onChange={(e) => updateLF('title', e.target.value)}
                                        className="text-2xl font-black bg-black/10 border border-[var(--t-border)] p-2 rounded-lg w-full"
                                        placeholder={formLanguage === 'en' ? "Title (EN)" : "शीर्षक (नेपाली)"}
                                    />
                                    <div className="flex gap-2 mt-2">
                                        <div className="flex bg-black/10 p-1 rounded-xl border border-[var(--t-border)]">
                                            <button onClick={() => setFormLanguage('en')} className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase transition-all ${formLanguage === 'en' ? 'bg-[var(--t-surface)] text-[var(--t-primary)] shadow-sm' : 'opacity-40'}`}>EN</button>
                                            <button onClick={() => setFormLanguage('ne')} className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase transition-all ${formLanguage === 'ne' ? 'bg-[var(--t-surface)] text-[var(--t-primary)] shadow-sm' : 'opacity-40'}`}>ने</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => { setIsCreateMode(false); setSelectedGuideId(null); }} className="w-10 h-10 rounded-xl hover:bg-black/10 text-xl font-light ml-4 transition-colors">✕</button>
                        </div>

                        {/* Drawer Body */}
                        <div className="flex-1 overflow-y-auto p-12 space-y-12">
                            {isCreateMode && (
                                <section className="p-6 bg-[var(--t-primary)]/5 rounded-3xl border-2 border-dashed border-[var(--t-primary)]/20">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--t-primary)] block mb-2">Unique System Identity (Required)</label>
                                    <input 
                                        value={localGuideData.key} onChange={(e) => setLocalGuideData({...localGuideData, key: e.target.value.toLowerCase().replace(/\s/g, '_')})}
                                        placeholder="e.g. homescreen_tour"
                                        className="w-full bg-[var(--t-surface)] p-3 rounded-xl border border-[var(--t-border)] font-black text-sm"
                                    />
                                </section>
                            )}

                            <section>
                                <label className="text-[10px] font-black uppercase tracking-widest opacity-30 mb-2 block">{formLanguage === 'en' ? 'Core Description' : 'मुख्य विवरण'}</label>
                                <textarea 
                                    value={getLF('description')} onChange={(e) => updateLF('description', e.target.value)}
                                    className="w-full bg-black/5 border border-[var(--t-border)] p-5 rounded-2xl text-lg font-medium italic min-h-[120px]"
                                    placeholder={formLanguage === 'en' ? "Tell users what this guide covers..." : "यस निर्देशिकाको बारेमा लेख्नुहोस्..."}
                                />
                            </section>

                            <section className="space-y-6">
                                <div className="flex justify-between items-center border-b border-[var(--t-border)] pb-4">
                                    <h3 className="text-xs font-black uppercase tracking-widest opacity-40">Documentation Steps</h3>
                                    <button onClick={handleAddLocalStep} className="text-[10px] font-black uppercase text-[var(--t-primary)] px-3 py-1.5 bg-[var(--t-primary)]/10 rounded-lg">+ Add Step</button>
                                </div>
                                <div className="space-y-6">
                                    {localGuideData.steps.map((step, idx) => (
                                        <div key={idx} className="flex gap-6 group relative p-4 hover:bg-black/5 rounded-2xl transition-all">
                                            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[var(--t-primary)] text-white shadow-lg flex items-center justify-center font-black">{idx + 1}</div>
                                            <div className="flex-1 space-y-3">
                                                <textarea 
                                                    value={formLanguage === 'en' ? step.text_en : step.text_ne}
                                                    onChange={(e) => {
                                                        const newSteps = [...localGuideData.steps];
                                                        newSteps[idx] = { ...step, [formLanguage === 'en' ? 'text_en' : 'text_ne']: e.target.value };
                                                        setLocalGuideData({ ...localGuideData, steps: newSteps });
                                                    }}
                                                    className="w-full bg-transparent p-2 rounded-xl border border-[var(--t-border)] text-sm font-bold"
                                                />
                                                <div className="flex gap-2">
                                                   <input placeholder="CSS Selector" value={step.target_element || ''} onChange={(e) => {
                                                        const newSteps = [...localGuideData.steps];
                                                        newSteps[idx] = { ...step, target_element: e.target.value };
                                                        setLocalGuideData({ ...localGuideData, steps: newSteps });
                                                   }} className="flex-1 bg-black/5 px-3 py-1.5 rounded-lg text-[9px] font-bold border border-[var(--t-border)]" />
                                                   <select value={step.placement || 'bottom'} onChange={(e) => {
                                                        const newSteps = [...localGuideData.steps];
                                                        newSteps[idx] = { ...step, placement: e.target.value };
                                                        setLocalGuideData({ ...localGuideData, steps: newSteps });
                                                   }} className="bg-black/5 px-2 py-1.5 rounded-lg text-[9px] border border-[var(--t-border)]">
                                                       <option value="top">Top</option>
                                                       <option value="bottom">Bottom</option>
                                                       <option value="left">Left</option>
                                                       <option value="right">Right</option>
                                                   </select>
                                                </div>
                                            </div>
                                            <button onClick={() => {
                                                showConfirm({
                                                    title: "Remove Step?",
                                                    message: "Are you sure you want to remove this documentation step? You will need to re-add it manually if you change your mind.",
                                                    confirmText: "Yes, Remove",
                                                    onConfirm: () => {
                                                        const newSteps = [...localGuideData.steps];
                                                        newSteps.splice(idx, 1);
                                                        setLocalGuideData({ ...localGuideData, steps: newSteps });
                                                        closeConfirm();
                                                    },
                                                    onCancel: closeConfirm
                                                });
                                            }} className="opacity-0 group-hover:opacity-100 text-red-500 absolute top-2 right-2 p-2">✕</button>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            <section className="space-y-6">
                                <div className="flex justify-between items-center border-b border-[var(--t-border)] pb-4">
                                    <h3 className="text-xs font-black uppercase tracking-widest opacity-40">Knowledge Base (FAQ)</h3>
                                    <button onClick={handleAddLocalFaq} className="text-[10px] font-black uppercase text-[var(--t-primary)] px-3 py-1.5 bg-[var(--t-primary)]/10 rounded-lg">+ Add FAQ</button>
                                </div>
                                <div className="space-y-4">
                                    {localGuideData.faqs.map((faq, idx) => (
                                        <div key={idx} className="p-6 bg-black/5 rounded-3xl border border-[var(--t-border)] space-y-3 relative group">
                                            <input 
                                                value={formLanguage === 'en' ? faq.question_en : faq.question_ne}
                                                onChange={(e) => {
                                                    const newFaqs = [...localGuideData.faqs];
                                                    newFaqs[idx] = { ...faq, [formLanguage === 'en' ? 'question_en' : 'question_ne']: e.target.value };
                                                    setLocalGuideData({ ...localGuideData, faqs: newFaqs });
                                                }}
                                                className="w-full bg-transparent p-2 border-b border-[var(--t-border)] font-black text-sm"
                                                placeholder="Question..."
                                            />
                                            <textarea 
                                                value={formLanguage === 'en' ? faq.answer_en : faq.answer_ne}
                                                onChange={(e) => {
                                                    const newFaqs = [...localGuideData.faqs];
                                                    newFaqs[idx] = { ...faq, [formLanguage === 'en' ? 'answer_en' : 'answer_ne']: e.target.value };
                                                    setLocalGuideData({ ...localGuideData, faqs: newFaqs });
                                                }}
                                                className="w-full bg-transparent p-2 text-xs font-medium"
                                                placeholder="Answer..."
                                            />
                                            <button onClick={() => {
                                                showConfirm({
                                                    title: "Delete FAQ Entry?",
                                                    message: "Are you sure you want to remove this FAQ? This content will be lost unless you re-entry it.",
                                                    confirmText: "Yes, Delete",
                                                    onConfirm: () => {
                                                        const newFaqs = [...localGuideData.faqs];
                                                        newFaqs.splice(idx, 1);
                                                        setLocalGuideData({ ...localGuideData, faqs: newFaqs });
                                                        closeConfirm();
                                                    },
                                                    onCancel: closeConfirm
                                                });
                                            }} className="opacity-0 group-hover:opacity-100 text-red-500 absolute top-4 right-4">✕</button>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </div>

                        {/* Drawer Footer */}
                        <div className="p-8 bg-[var(--t-surface2)] border-t border-[var(--t-border)] flex justify-between items-center relative z-20">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={localGuideData.is_active} onChange={(e) => setLocalGuideData({...localGuideData, is_active: e.target.checked})} className="w-4 h-4 rounded accent-[var(--t-primary)]" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Publically Active</span>
                            </label>
                            <button 
                                onClick={handleSaveAllChanges} disabled={isSaving}
                                className="px-10 py-4 bg-[var(--t-primary)] text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-2xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                            >
                                {isSaving ? 'Processing...' : `Save Documentation ${formLanguage === 'en' ? '(EN)' : '(NE)'}`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal 
                isOpen={confirmConfig.isOpen}
                title={confirmConfig.title}
                message={confirmConfig.message}
                confirmText={confirmConfig.confirmText}
                onConfirm={confirmConfig.onConfirm}
                onCancel={closeConfirm}
                type={confirmConfig.type || 'warning'}
            />

            <style>{`
                @keyframes slide-in-right { from { transform: translateX(100%); } to { transform: translateX(0); } }
                .animate-slide-in-right { animation: slide-in-right 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
            `}</style>
        </div>
    );
};

export default UserGuidePage;
