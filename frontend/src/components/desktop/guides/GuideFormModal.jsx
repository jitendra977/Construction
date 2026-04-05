import React, { useState, useEffect } from 'react';
import { dashboardService } from '../../../services/api';
import { useConstruction } from '../../../context/ConstructionContext';
import Modal from '../../common/Modal';

const GuideFormModal = ({ guide, onClose, onSuccess }) => {
    const { refreshData } = useConstruction();
    const [formData, setFormData] = useState({
        key: '',
        is_active: true,
        type: 'modal',
        icon: 'ℹ️',
        title_en: '',
        title_ne: '',
        description_en: '',
        description_ne: '',
        video_url: '',
        order: 0,
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (guide) {
            setFormData({
                key: guide.key,
                is_active: guide.is_active,
                type: guide.type,
                icon: guide.icon || 'ℹ️',
                title_en: guide.title_en,
                title_ne: guide.title_ne,
                description_en: guide.description_en,
                description_ne: guide.description_ne,
                video_url: guide.video_url || '',
                order: guide.order || 0,
            });
        }
    }, [guide]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            if (guide) {
                await dashboardService.updateUserGuide(guide.id, formData);
            } else {
                await dashboardService.createUserGuide(formData);
            }
            // Refresh global context
            refreshData();
            onSuccess();
        } catch (error) {
            console.error("Failed to save guide:", error);
            alert("Error saving guide. Check for unique key or required fields.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal 
            onClose={onClose} 
            title={guide ? `Edit ${guide.title_en}` : 'Create New User Guide'}
            width="600px"
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold uppercase opacity-60 tracking-widest pl-2 mb-2 block">Unique Key</label>
                        <input 
                            type="text"
                            required
                            placeholder="e.g. homescreen"
                            value={formData.key}
                            onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                            className="w-full bg-black/20 border border-[var(--t-border)] p-4 rounded-xl font-bold focus:border-[var(--t-primary)] transition-all"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold uppercase opacity-60 tracking-widest pl-2 mb-2 block">Icon</label>
                        <input 
                            type="text"
                            value={formData.icon}
                            onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                            className="w-full bg-black/20 border border-[var(--t-border)] p-4 rounded-xl font-bold focus:border-[var(--t-primary)] transition-all"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold uppercase opacity-60 tracking-widest pl-2 mb-2 block">Display Type</label>
                        <select 
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            className="w-full bg-black/20 border border-[var(--t-border)] p-4 rounded-xl font-bold focus:border-[var(--t-primary)] transition-all"
                        >
                            <option value="modal">Modal Dialog</option>
                            <option value="tour">Interactive Tour</option>
                            <option value="sidebar">Sidebar Content</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-6 pb-4">
                        <div className="flex-1">
                            <label className="text-[10px] font-bold uppercase opacity-50 px-2 block mb-1">Sequence Order</label>
                            <input 
                                type="number"
                                value={formData.order}
                                onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                                className="w-full bg-black/20 border border-[var(--t-border)] p-3 rounded-xl font-bold"
                            />
                        </div>
                        <label className="flex items-center gap-3 cursor-pointer group mt-4">
                            <input 
                                type="checkbox"
                                checked={formData.is_active}
                                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                className="w-5 h-5 rounded accent-[var(--t-primary)]"
                            />
                            <span className="text-sm font-bold opacity-80 group-hover:opacity-100">Activate Guide</span>
                        </label>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold uppercase opacity-60 tracking-widest pl-2 mb-2 block">Title (English)</label>
                            <input 
                                type="text"
                                required
                                value={formData.title_en}
                                onChange={(e) => setFormData({ ...formData, title_en: e.target.value })}
                                className="w-full bg-black/20 border border-[var(--t-border)] p-4 rounded-xl font-bold"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase opacity-60 tracking-widest pl-2 mb-2 block">Title (Nepali)</label>
                            <input 
                                type="text"
                                required
                                value={formData.title_ne}
                                onChange={(e) => setFormData({ ...formData, title_ne: e.target.value })}
                                className="w-full bg-black/20 border border-[var(--t-border)] p-4 rounded-xl font-bold"
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold uppercase opacity-60 tracking-widest pl-2 mb-2 block">Description (English)</label>
                        <textarea 
                            rows={3}
                            required
                            value={formData.description_en}
                            onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
                            className="w-full bg-black/20 border border-[var(--t-border)] p-4 rounded-xl font-bold"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold uppercase opacity-60 tracking-widest pl-2 mb-2 block">Description (Nepali)</label>
                        <textarea 
                            rows={3}
                            required
                            value={formData.description_ne}
                            onChange={(e) => setFormData({ ...formData, description_ne: e.target.value })}
                            className="w-full bg-black/20 border border-[var(--t-border)] p-4 rounded-xl font-bold"
                        />
                    </div>
                </div>

                <div>
                    <label className="text-xs font-bold uppercase opacity-60 tracking-widest pl-2 mb-2 block">Tutorial Video URL (Optional)</label>
                    <input 
                        type="url"
                        placeholder="https://youtube.com/watch?v=..."
                        value={formData.video_url}
                        onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                        className="w-full bg-black/20 border border-[var(--t-border)] p-4 rounded-xl font-bold"
                    />
                </div>

                <div className="pt-6 flex gap-3">
                    <button 
                        type="button" 
                        onClick={onClose}
                        className="flex-1 py-4 border border-[var(--t-border)] rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-white/5 transition-all"
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="flex-1 py-4 bg-[var(--t-primary)] text-[var(--t-primary-btn-text)] rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-[var(--t-primary)]/20 hover:brightness-110 active:scale-95 transition-all"
                    >
                        {loading ? 'Saving...' : (guide ? 'Update Guide' : 'Create Guide')}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default GuideFormModal;
