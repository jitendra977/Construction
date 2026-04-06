import React, { useState, useEffect } from 'react';
import { dashboardService } from '../../../services/api';
import { useConstruction } from '../../../context/ConstructionContext';
import Modal from '../../common/Modal';
import ConfirmModal from '../../common/ConfirmModal';

const FaqManagementModal = ({ guide, onClose, onSuccess }) => {
    const { refreshData } = useConstruction();
    const [faqs, setFaqs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(null);

    // Confirmation Modal System
    const [confirmConfig, setConfirmConfig] = useState({ isOpen: false });
    const showConfirm = (config) => setConfirmConfig({ ...config, isOpen: true });
    const closeConfirm = () => setConfirmConfig({ ...confirmConfig, isOpen: false });
    const [formData, setFormData] = useState({
        question_en: '',
        question_ne: '',
        answer_en: '',
        answer_ne: '',
        order: 0,
    });

    useEffect(() => {
        if (guide) {
            setFaqs(guide.faqs || []);
            setLoading(false);
        }
    }, [guide]);

    const handleSaveFaq = async (e) => {
        e.preventDefault();
        const payload = { ...formData, guide: guide.id };
        if (!isEditing) payload.order = faqs.length;

        try {
            let response;
            if (isEditing) {
                response = await dashboardService.updateGuideFaq(isEditing, payload);
                setFaqs(faqs.map(f => f.id === isEditing ? response.data : f));
            } else {
                response = await dashboardService.createGuideFaq(payload);
                setFaqs([...faqs, response.data]);
            }
            // Refresh global context in background
            refreshData();
            resetForm();
        } catch (error) {
            console.error("FAQ save failed:", error);
        }
    };

    const handleDeleteFaq = (id) => {
        showConfirm({
            title: "Delete FAQ?",
            message: "Are you sure you want to permanently remove this FAQ entry? This action is irreversible.",
            confirmText: "Yes, Delete FAQ",
            type: "danger",
            onConfirm: async () => {
                try {
                    await dashboardService.deleteGuideFaq(id);
                    setFaqs(faqs.filter(f => f.id !== id));
                    closeConfirm();
                } catch (error) {
                    console.error("Delete failed:", error);
                    closeConfirm();
                }
            }
        });
    };

    const startEdit = (faq) => {
        setIsEditing(faq.id);
        setFormData({
            question_en: faq.question_en,
            question_ne: faq.question_ne,
            answer_en: faq.answer_en,
            answer_ne: faq.answer_ne,
            order: faq.order,
        });
    };

    const resetForm = () => {
        setIsEditing(null);
        setFormData({
            question_en: '',
            question_ne: '',
            answer_en: '',
            answer_ne: '',
            order: faqs.length,
        });
    };

    return (
        <>
        <Modal 
            isOpen={true}
            onClose={onClose} 
            title={`Manage FAQs for ${guide.title_en}`}
            width="900px"
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-[600px]">
                {/* FAQ List */}
                <div className="overflow-y-auto space-y-3 pr-2 border-r border-[var(--t-border)]">
                    <h4 className="text-xs font-black uppercase opacity-50 tracking-widest mb-4">Current FAQs</h4>
                    {faqs.sort((a,b) => a.order - b.order).map((faq, idx) => (
                        <div key={faq.id || idx} className={`p-4 rounded-2xl border ${isEditing === faq.id ? 'border-[var(--t-primary)] bg-[var(--t-primary)]/5' : 'border-[var(--t-border)] bg-black/10'}`}>
                            <div className="flex justify-between items-start mb-2">
                                <span className="bg-white/10 text-white px-2 py-0.5 rounded text-[10px] font-bold">
                                    Q#{idx + 1}
                                </span>
                                <div className="flex gap-2">
                                    <button onClick={() => startEdit(faq)} className="text-xs hover:scale-110 transition-transform">✏️</button>
                                    <button onClick={() => handleDeleteFaq(faq.id)} className="text-xs hover:scale-110 transition-transform text-red-500">🗑️</button>
                                </div>
                            </div>
                            <p className="text-xs font-bold leading-relaxed">{faq.question_en}</p>
                        </div>
                    ))}
                    <button 
                        onClick={resetForm}
                        className="w-full p-4 border-2 border-dashed border-[var(--t-border)] rounded-2xl opacity-50 hover:opacity-100 transition-all text-sm font-bold"
                    >
                        + Add FAQ
                    </button>
                </div>

                {/* FAQ Editor Form */}
                <form onSubmit={handleSaveFaq} className="space-y-4">
                    <h4 className="text-xs font-black uppercase opacity-50 tracking-widest mb-4 uppercase">
                        {isEditing ? 'Edit FAQ' : 'New FAQ'}
                    </h4>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-bold uppercase opacity-50 px-2 block mb-1">Question (English)</label>
                            <input 
                                required
                                value={formData.question_en}
                                onChange={(e) => setFormData({ ...formData, question_en: e.target.value })}
                                className="w-full bg-black/20 border border-[var(--t-border)] p-3 rounded-xl text-sm"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold uppercase opacity-50 px-2 block mb-1">Question (Nepali)</label>
                            <input 
                                required
                                value={formData.question_ne}
                                onChange={(e) => setFormData({ ...formData, question_ne: e.target.value })}
                                className="w-full bg-black/20 border border-[var(--t-border)] p-3 rounded-xl text-sm"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold uppercase opacity-50 px-2 block mb-1">Answer (English)</label>
                            <textarea 
                                rows={4}
                                required
                                value={formData.answer_en}
                                onChange={(e) => setFormData({ ...formData, answer_en: e.target.value })}
                                className="w-full bg-black/20 border border-[var(--t-border)] p-3 rounded-xl text-sm"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold uppercase opacity-50 px-2 block mb-1">Answer (Nepali)</label>
                            <textarea 
                                rows={4}
                                required
                                value={formData.answer_ne}
                                onChange={(e) => setFormData({ ...formData, answer_ne: e.target.value })}
                                className="w-full bg-black/20 border border-[var(--t-border)] p-3 rounded-xl text-sm"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold uppercase opacity-50 px-2 block mb-1">Order Index</label>
                            <input 
                                type="number"
                                value={formData.order}
                                onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
                                className="w-full bg-black/20 border border-[var(--t-border)] p-3 rounded-xl text-sm font-bold"
                            />
                        </div>
                    </div>

                    <div className="pt-4 space-y-2">
                        <button 
                            type="submit"
                            className="w-full py-4 bg-[var(--t-primary)] text-[var(--t-primary-btn-text)] rounded-xl font-bold uppercase tracking-widest text-xs hover:brightness-110 active:scale-95 transition-all shadow-lg"
                        >
                            {isEditing ? 'Update FAQ' : 'Save FAQ'}
                        </button>
                        {isEditing && (
                            <button 
                                type="button" 
                                onClick={resetForm}
                                className="w-full py-4 border border-[var(--t-border)] rounded-xl font-bold uppercase tracking-widest text-xs"
                            >
                                Cancel Edit
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </Modal>

        <ConfirmModal 
            isOpen={confirmConfig.isOpen}
            title={confirmConfig.title}
            message={confirmConfig.message}
            confirmText={confirmConfig.confirmText}
            onConfirm={confirmConfig.onConfirm}
            onCancel={closeConfirm}
            type={confirmConfig.type || 'warning'}
        />
        </>
    );
};

export default FaqManagementModal;
