import React, { useState, useEffect } from 'react';
import { dashboardService, getMediaUrl } from '../../../services/api';
import { useConstruction } from '../../../context/ConstructionContext';
import Modal from '../../common/Modal';

const StepManagementModal = ({ guide, onClose, onSuccess }) => {
    const { refreshData } = useConstruction();
    const [steps, setSteps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(null); // ID of step being edited
    const [formData, setFormData] = useState({
        text_en: '',
        text_ne: '',
        target_element: '',
        placement: 'bottom',
        order: 0,
        media: null,
    });

    useEffect(() => {
        if (guide) {
            setSteps(guide.steps || []);
            setLoading(false);
        }
    }, [guide]);

    const handleSaveStep = async (e) => {
        e.preventDefault();
        const data = new FormData();
        Object.keys(formData).forEach(key => {
            if (formData[key] !== null) {
                data.append(key, formData[key]);
            }
        });
        if (!isEditing) {
            data.append('guide', guide.id);
            data.append('order', steps.length);
        }

        try {
            let response;
            if (isEditing) {
                response = await dashboardService.updateGuideStep(isEditing, data);
                setSteps(steps.map(s => s.id === isEditing ? response.data : s));
            } else {
                response = await dashboardService.createGuideStep(data);
                setSteps([...steps, response.data]);
            }
            
            // Refresh global context in background
            refreshData();
            resetForm();
        } catch (error) {
            console.error("Step save failed:", error);
        }
    };

    const handleDeleteStep = async (id) => {
        if (!window.confirm("Delete this step?")) return;
        try {
            await dashboardService.deleteGuideStep(id);
            setSteps(steps.filter(s => s.id !== id));
        } catch (error) {
            console.error("Delete failed:", error);
        }
    };

    const startEdit = (step) => {
        setIsEditing(step.id);
        setFormData({
            text_en: step.text_en,
            text_ne: step.text_ne,
            target_element: step.target_element || '',
            placement: step.placement || 'bottom',
            order: step.order,
            media: null, // Reset media if not changing
        });
    };

    const resetForm = () => {
        setIsEditing(null);
        setFormData({
            text_en: '',
            text_ne: '',
            target_element: '',
            placement: 'bottom',
            order: steps.length,
            media: null,
        });
    };

    return (
        <Modal 
            onClose={onClose} 
            title={`Manage Steps for ${guide.title_en}`}
            width="800px"
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-[600px]">
                {/* Steps List */}
                <div className="overflow-y-auto space-y-3 pr-2 border-r border-[var(--t-border)]">
                    <h4 className="text-xs font-black uppercase opacity-50 tracking-widest mb-4">Current Steps</h4>
                    {steps.sort((a,b) => a.order - b.order).map((step, idx) => (
                        <div key={step.id || idx} className={`p-4 rounded-2xl border ${isEditing === step.id ? 'border-[var(--t-primary)] bg-[var(--t-primary)]/5' : 'border-[var(--t-border)] bg-black/10'}`}>
                            <div className="flex justify-between items-start mb-2">
                                <span className="w-6 h-6 rounded-full bg-[var(--t-primary)] text-[var(--t-primary-btn-text)] flex items-center justify-center text-[10px] font-bold">
                                    {idx + 1}
                                </span>
                                <div className="flex gap-2">
                                    <button onClick={() => startEdit(step)} className="text-xs hover:scale-110 transition-transform">✏️</button>
                                    <button onClick={() => handleDeleteStep(step.id)} className="text-xs hover:scale-110 transition-transform text-red-500">🗑️</button>
                                </div>
                            </div>
                            <p className="text-xs font-bold line-clamp-2">{step.text_en}</p>
                            {step.target_element && (
                                <code className="text-[10px] opacity-60 mt-1 block truncate">📍 {step.target_element}</code>
                            )}
                        </div>
                    ))}
                    <button 
                        onClick={resetForm}
                        className="w-full p-4 border-2 border-dashed border-[var(--t-border)] rounded-2xl opacity-50 hover:opacity-100 transition-all text-sm font-bold"
                    >
                        + Add Step
                    </button>
                </div>

                {/* Step Editor Form */}
                <form onSubmit={handleSaveStep} className="space-y-4">
                    <h4 className="text-xs font-black uppercase opacity-50 tracking-widest mb-4">
                        {isEditing ? 'Edit Step' : 'New Step'}
                    </h4>
                    
                    <div className="space-y-3">
                        <textarea 
                            placeholder="Instruction (English)"
                            required
                            rows={3}
                            value={formData.text_en}
                            onChange={(e) => setFormData({ ...formData, text_en: e.target.value })}
                            className="w-full bg-black/20 border border-[var(--t-border)] p-3 rounded-xl text-sm"
                        />
                        <textarea 
                            placeholder="Instruction (Nepali)"
                            required
                            rows={3}
                            value={formData.text_ne}
                            onChange={(e) => setFormData({ ...formData, text_ne: e.target.value })}
                            className="w-full bg-black/20 border border-[var(--t-border)] p-3 rounded-xl text-sm"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                             <label className="text-[10px] font-bold uppercase opacity-50 px-2 block mb-1">Target CSS Selector</label>
                             <input 
                                type="text"
                                placeholder="#add-button or .sidebar-item"
                                value={formData.target_element}
                                onChange={(e) => setFormData({ ...formData, target_element: e.target.value })}
                                className="w-full bg-black/20 border border-[var(--t-border)] p-3 rounded-xl text-sm"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold uppercase opacity-50 px-2 block mb-1">Placement</label>
                            <select 
                                value={formData.placement}
                                onChange={(e) => setFormData({ ...formData, placement: e.target.value })}
                                className="w-full bg-black/20 border border-[var(--t-border)] p-3 rounded-xl text-sm"
                            >
                                <option value="top">Top</option>
                                <option value="bottom">Bottom</option>
                                <option value="left">Left</option>
                                <option value="right">Right</option>
                                <option value="center">Center</option>
                            </select>
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

                    <div>
                        <label className="text-[10px] font-bold uppercase opacity-50 px-2 block mb-1">Illustration (Image/GIF)</label>
                        <input 
                            type="file"
                            accept="image/*"
                            onChange={(e) => setFormData({ ...formData, media: e.target.files[0] })}
                            className="w-full text-xs"
                        />
                    </div>

                    <div className="pt-4 space-y-2">
                        <button 
                            type="submit"
                            className="w-full py-3 bg-[var(--t-primary)] text-[var(--t-primary-btn-text)] rounded-xl font-bold uppercase tracking-widest text-xs hover:brightness-110 active:scale-95 transition-all"
                        >
                            {isEditing ? 'Save Changes' : 'Create Step'}
                        </button>
                        {isEditing && (
                            <button 
                                type="button" 
                                onClick={resetForm}
                                className="w-full py-3 border border-[var(--t-border)] rounded-xl font-bold uppercase tracking-widest text-xs"
                            >
                                Cancel Edit
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </Modal>
    );
};

export default StepManagementModal;
