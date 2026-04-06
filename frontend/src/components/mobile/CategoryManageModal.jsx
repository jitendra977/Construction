import React, { useState, useEffect } from 'react';
import { useConstruction } from '../../context/ConstructionContext';
import { dashboardService } from '../../services/api';
import Modal from '../common/Modal';
import ConfirmModal from '../common/ConfirmModal';

const CategoryManageModal = ({ isOpen, onClose, category }) => {
    const { dashboardData, refreshData } = useConstruction();
    const [localName, setLocalName] = useState('');
    const [localCode, setLocalCode] = useState('');
    const [localBudget, setLocalBudget] = useState(0);
    const [localAllocations, setLocalAllocations] = useState({}); // { phaseId: amount }
    const [loading, setLoading] = useState(false);
    const [confirmConfig, setConfirmConfig] = useState({ isOpen: false });

    const isEdit = !!(category && category.id);

    useEffect(() => {
        if (isOpen) {
            if (category) {
                setLocalName(category.name || '');
                setLocalCode(category.code || '');
                setLocalBudget(Number(category.allocation) || 0);
                
                if (category.id) {
                    const allocations = dashboardData.phaseBudgetAllocations?.filter(a => a.category === category.id) || [];
                    const allocMap = {};
                    allocations.forEach(a => {
                        allocMap[a.phase] = Number(a.amount) || 0;
                    });
                    setLocalAllocations(allocMap);
                } else {
                    setLocalAllocations({});
                }
            } else {
                setLocalName('');
                setLocalCode('');
                setLocalBudget(0);
                setLocalAllocations({});
            }
        }
    }, [category, isOpen, dashboardData.phaseBudgetAllocations]);

    const currentDistTotal = dashboardData.phases?.reduce((sum, p) => sum + (Number(localAllocations[p.id]) || 0), 0) || 0;

    // Auto-calculate Total Budget from distributions
    // Move BEFORE early return to satisfy Rules of Hooks
    useEffect(() => {
        setLocalBudget(currentDistTotal);
    }, [currentDistTotal]);

    if (!isOpen) return null;

    const isPlanCorrect = true; // Always correct now since they are synced

    const handleSave = async () => {
        if (!localName.trim()) {
            alert("Category name is required.");
            return;
        }
        setLoading(true);
        try {
            let categoryId = category?.id;

            if (isEdit) {
                // 1. Update Category Metadata & Budget
                await dashboardService.updateBudgetCategory(categoryId, {
                    name: localName,
                    code: localCode,
                    allocation: currentDistTotal // Use the calculated total
                });
            } else {
                // 1. Create New Category
                const res = await dashboardService.createBudgetCategory({
                    name: localName,
                    code: localCode,
                    allocation: currentDistTotal
                });
                categoryId = res.data.id;
            }

            // 2. Update Phase Allocations (Only if we have a categoryId)
            if (categoryId) {
                const promises = dashboardData.phases?.map(async (phase) => {
                    const amount = Number(localAllocations[phase.id]) || 0;
                    const existing = dashboardData.phaseBudgetAllocations?.find(
                        a => a.category === categoryId && a.phase === phase.id
                    );

                    const data = {
                        category: categoryId,
                        phase: phase.id,
                        amount: amount
                    };

                    if (existing) {
                        if (amount === 0) {
                            return dashboardService.deletePhaseBudgetAllocation(existing.id);
                        }
                        return dashboardService.updatePhaseBudgetAllocation(existing.id, data);
                    } else if (amount > 0) {
                        return dashboardService.createPhaseBudgetAllocation(data);
                    }
                });

                if (promises) await Promise.all(promises);
            }

            refreshData();
            onClose();
        } catch (error) {
            alert('Save failed. Please check your data.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = () => {
        setConfirmConfig({
            isOpen: true,
            title: "Delete Category?",
            message: `Are you sure you want to permanently delete "${localName}"? This will affect all phase-wise budget plans. This action cannot be undone.`,
            confirmText: "Delete Permanently",
            type: "danger",
            onConfirm: async () => {
                try {
                    await dashboardService.deleteBudgetCategory(category.id);
                    refreshData();
                    onClose();
                } catch (error) {
                    alert("Delete failed.");
                }
            }
        });
    };

    return (
        <>
            <Modal
                isOpen={isOpen}
                onClose={onClose}
                title={isEdit ? `Manage Category: ${category.name}` : "Create New Category"}
                footer={
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 text-xs font-black text-[var(--t-text3)] uppercase tracking-widest border border-[var(--t-border)] rounded-xl active:bg-[var(--t-surface2)] transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={loading}
                            className="flex-1 py-3 bg-[var(--t-primary)] text-[var(--t-bg)] rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-[var(--t-primary)]/10 disabled:opacity-50"
                        >
                            {loading ? 'Processing...' : isEdit ? 'Update Category' : 'Create Category'}
                        </button>
                    </div>
                }
            >
                <div className="space-y-6">
                    {/* Category Metadata Section */}
                    <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-[var(--t-primary)] uppercase tracking-[0.2em] px-1">Identity & Code</h4>
                        <div className="space-y-3 p-4 bg-[var(--t-surface2)] rounded-xl border border-[var(--t-border)]">
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-[var(--t-text3)] uppercase ml-1">Category Name *</label>
                                <input
                                    type="text"
                                    value={localName}
                                    onChange={(e) => setLocalName(e.target.value)}
                                    className="w-full bg-[var(--t-surface)] border border-[var(--t-border)] rounded-lg px-3 py-2 text-sm font-bold text-[var(--t-text)] outline-none focus:ring-1 focus:ring-[var(--t-primary)]/30 transition-all font-['DM_Mono',monospace]"
                                    placeholder="e.g. Structural Steel"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-[var(--t-text3)] uppercase ml-1">Internal Code (Optional)</label>
                                <input
                                    type="text"
                                    value={localCode}
                                    onChange={(e) => setLocalCode(e.target.value)}
                                    className="w-full bg-[var(--t-surface)] border border-[var(--t-border)] rounded-lg px-3 py-2 text-sm font-bold text-[var(--t-text)] outline-none focus:ring-1 focus:ring-[var(--t-primary)]/30 transition-all font-['DM_Mono',monospace]"
                                    placeholder="e.g. CAT-001"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Summary Header - Budget */}
                    <div className="p-4 bg-[var(--t-surface2)] rounded-xl border border-[var(--t-border)] space-y-3">
                        <div className="flex justify-between items-end">
                            <div className="space-y-1">
                                <span className="text-[10px] font-black text-[var(--t-text3)] uppercase tracking-widest">Total Planned Allocation (Auto)</span>
                                <div className="text-2xl font-black text-[var(--t-primary)] font-['Bebas_Neue',sans-serif] tracking-wider py-1">
                                    Rs. {currentDistTotal.toLocaleString()}
                                </div>
                            </div>
                            {isEdit && (
                                <div className="text-right">
                                    <span className="text-[8px] font-bold text-[var(--t-text3)] uppercase tracking-tight block">Actual Spent</span>
                                    <span className="text-sm font-black text-[var(--t-text2)]">Rs. {Number(category.spent).toLocaleString()}</span>
                                </div>
                            )}
                        </div>
                        
                        <div className="p-3 rounded-lg flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20">
                            <div className="flex flex-col">
                                <span className="text-[9px] font-bold text-[var(--t-text3)] uppercase">Budget Integrity</span>
                                <span className="text-xs font-bold text-emerald-500 uppercase tracking-widest">Calculated from phase plans</span>
                            </div>
                            <span className="text-base font-black text-emerald-500">Rs. {currentDistTotal.toLocaleString()}</span>
                        </div>
                    </div>

                    {/* Phase-wise Distribution */}
                    <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-[var(--t-primary)] uppercase tracking-[0.2em] px-1">Phase-wise Distribution</h4>
                        <div className="space-y-2">
                            {dashboardData.phases?.length === 0 ? (
                                <p className="text-[10px] text-[var(--t-text3)] italic text-center py-4 bg-[var(--t-surface)] rounded-xl border border-dashed border-[var(--t-border)]">No phases created yet to distribute budget.</p>
                            ) : (
                                dashboardData.phases?.map(phase => (
                                    <div key={phase.id} className="bg-[var(--t-surface)] border border-[var(--t-border)] rounded-xl p-3 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-[11px] font-black text-[var(--t-primary)] bg-[var(--t-primary)]/10 border border-[var(--t-primary)]/20">
                                            {phase.order}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <span className="text-xs font-bold text-[var(--t-text)] truncate block uppercase tracking-tight">{phase.name}</span>
                                        </div>
                                        <div className="w-28">
                                            <input
                                                type="number"
                                                value={localAllocations[phase.id] || ''}
                                                onChange={(e) => setLocalAllocations({ ...localAllocations, [phase.id]: e.target.value })}
                                                className="w-full text-right text-sm font-bold text-[var(--t-text)] border-none bg-[var(--t-surface2)] rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-[var(--t-primary)]/30 transition-all font-['DM_Mono',monospace]"
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Delete Action */}
                    {isEdit && (
                        <div className="pt-6 border-t border-[var(--t-border)] pb-4">
                            <button
                                onClick={handleDelete}
                                className="w-full py-3 text-xs font-bold text-[var(--t-danger)] border border-[var(--t-danger)]/30 bg-[var(--t-danger)]/5 rounded-xl active:bg-[var(--t-danger)]/10 transition-colors uppercase tracking-widest"
                            >
                                Delete Category
                            </button>
                        </div>
                    )}
                </div>
            </Modal>

            <ConfirmModal
                isOpen={confirmConfig.isOpen}
                onClose={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
                title={confirmConfig.title}
                message={confirmConfig.message}
                confirmText={confirmConfig.confirmText}
                onConfirm={confirmConfig.onConfirm}
                type={confirmConfig.type}
            />
        </>
    );
};

export default CategoryManageModal;
