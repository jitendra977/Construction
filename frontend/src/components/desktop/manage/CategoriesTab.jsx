import React, { useState } from 'react';
import { dashboardService } from '../../../services/api';
import Modal from '../../common/Modal';
import { useConstruction } from '../../../context/ConstructionContext';

const CategoriesTab = ({ searchQuery = '', resolveMetadata, onClearMetadata }) => {
    const { dashboardData, budgetStats, refreshData } = useConstruction();
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({});
    const [loading, setLoading] = useState(false);

    const [loadingRow, setLoadingRow] = useState(null); // id of row being saved
    const [expandedId, setExpandedId] = useState(null);
    const [localBudgets, setLocalBudgets] = useState({}); // { catId: amount }
    const [localAllocations, setLocalAllocations] = useState({}); // { catId: { phaseId: amount } }

    React.useEffect(() => {
        if (resolveMetadata?.highlightId) {
            setExpandedId(resolveMetadata.highlightId);
            // Wait for render
            setTimeout(() => {
                const el = document.getElementById(`category-row-${resolveMetadata.highlightId}`);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    // Visual feedback
                    el.classList.add('ring-2', 'ring-[var(--t-primary)]', 'ring-offset-2');
                    setTimeout(() => el.classList.remove('ring-2', 'ring-[var(--t-primary)]', 'ring-offset-2'), 3000);
                }
            }, 100);
            onClearMetadata();
        }
    }, [resolveMetadata, onClearMetadata]);

    const filteredCategories = budgetStats.categories?.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    const handleOpenModal = (category = null) => {
        setEditingItem(category);
        setFormData(category ? { ...category } : { allocation: 0 });
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this Category?')) return;
        try {
            await dashboardService.deleteBudgetCategory(id);
            refreshData();
        } catch (error) {
            alert('Delete failed.');
        }
    };

    const handleInlineSave = async (category) => {
        const newBudget = localBudgets[category.id] !== undefined ? localBudgets[category.id] : category.allocation;
        const allocationsToSave = localAllocations[category.id] || {};

        setLoadingRow(category.id);
        try {
            // 1. Update Category Budget
            await dashboardService.updateBudgetCategory(category.id, {
                name: category.name,
                allocation: newBudget
            });

            // 2. Update Phase Allocations
            const promises = Object.entries(allocationsToSave).map(async ([phaseId, amount]) => {
                const existing = dashboardData.phaseBudgetAllocations?.find(
                    a => a.category === category.id && a.phase === parseInt(phaseId)
                );

                const data = {
                    category: category.id,
                    phase: parseInt(phaseId),
                    amount: parseFloat(amount) || 0
                };

                if (existing) {
                    if (parseFloat(amount) === 0) {
                        return dashboardService.deletePhaseBudgetAllocation(existing.id);
                    }
                    return dashboardService.updatePhaseBudgetAllocation(existing.id, data);
                } else if (parseFloat(amount) > 0) {
                    return dashboardService.createPhaseBudgetAllocation(data);
                }
            });

            await Promise.all(promises);
            setExpandedId(null);
            refreshData();
        } catch (error) {
            alert('Save failed. Please check your data.');
        } finally {
            setLoadingRow(null);
        }
    };

    const handleCreateCategory = async () => {
        const name = window.prompt("Enter New Category Name:");
        if (!name) return;

        setLoading(true);
        try {
            const res = await dashboardService.createBudgetCategory({ name, allocation: 0 });
            refreshData();
            // Open it for editing immediately
            setExpandedId(res.data.id);
        } catch (error) {
            alert("Failed to create category");
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <p className="text-[11px] text-[var(--t-text2)] font-['DM_Mono',monospace] uppercase tracking-widest">Plan budgets and distributions directly in the table below.</p>
                <div className="flex-1 sm:hidden"></div>
                <button
                    onClick={handleCreateCategory}
                    disabled={loading}
                    className="w-full sm:w-auto px-4 py-2.5 bg-[var(--t-primary)] text-[var(--t-bg)] rounded-[2px] hover:opacity-90 font-['DM_Mono',monospace] uppercase tracking-widest text-[10px] sm:text-xs transition-colors shadow-sm disabled:opacity-50"
                >
                    {loading ? 'Creating...' : '+ New Category'}
                </button>
            </div>

            {/* Desktop View: Table */}
            <div className="hidden lg:block bg-[var(--t-surface)] rounded-xl shadow-sm border border-[var(--t-border)] overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-[var(--t-surface2)] border-b border-[var(--t-border)]">
                            <th className="px-6 py-4 text-xs font-bold text-[var(--t-text3)] uppercase tracking-wider">Category & Code</th>
                            <th className="px-6 py-4 text-xs font-bold text-[var(--t-text3)] uppercase tracking-wider">Planned (Target)</th>
                            <th className="px-6 py-4 text-xs font-bold text-[var(--t-text3)] uppercase tracking-wider">Actual Spent</th>
                            <th className="px-6 py-4 text-xs font-bold text-[var(--t-text3)] uppercase tracking-wider">Variance</th>
                            <th className="px-6 py-4 text-xs font-bold text-[var(--t-text3)] uppercase tracking-wider">Phase Dist.</th>
                            <th className="px-6 py-4 text-xs font-bold text-[var(--t-text3)] uppercase tracking-wider text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--t-border)]">
                        {filteredCategories.map(c => {
                            const isExpanded = expandedId === c.id;
                            const currentBudget = localBudgets[c.id] !== undefined ? localBudgets[c.id] : c.allocation;

                            const phaseAllocations = dashboardData.phaseBudgetAllocations?.filter(a => a.category === c.id) || [];
                            const serverDistTotal = phaseAllocations.reduce((sum, a) => sum + Number(a.amount), 0);

                            const localCatAllocations = localAllocations[c.id] || {};
                            const currentDistTotal = Object.keys(localCatAllocations).length > 0
                                ? dashboardData.phases?.reduce((sum, p) => sum + (parseFloat(localCatAllocations[p.id] !== undefined ? localCatAllocations[p.id] : (phaseAllocations.find(a => a.phase === p.id)?.amount || 0))), 0)
                                : serverDistTotal;

                            const isCorrect = currentBudget <= currentDistTotal + 0.1;
                            const isSaving = loadingRow === c.id;

                            // Calculate variance based on actual spend vs CURRENT budget (local or server)
                            const spent = Number(c.spent) || 0;
                            const variance = currentBudget - spent;
                            const isOverSpent = spent > currentBudget;

                            return (
                                <React.Fragment key={c.id}>
                                    <tr id={'category-row-' + c.id} className={`hover:bg-[var(--t-surface2)] transition-colors group ${isExpanded ? 'bg-[var(--t-primary)]/5' : ''}`}>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-[var(--t-text)]">{c.name}</span>
                                                <span className="text-[10px] text-[var(--t-text3)] font-medium uppercase tracking-widest">{c.code || 'PLANNING'} {isOverSpent && '🚨'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col w-32">
                                                <input
                                                    type="number"
                                                    value={currentBudget}
                                                    onChange={(e) => setLocalBudgets({ ...localBudgets, [c.id]: parseFloat(e.target.value) || 0 })}
                                                    className="w-full bg-[var(--t-surface)] border border-[var(--t-border)] rounded-lg px-2 py-1.5 text-xs font-black text-[var(--t-primary)] focus:ring-2 focus:ring-[var(--t-primary)] outline-none transition-all shadow-sm"
                                                />
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className={`text-xs font-black ${isOverSpent ? 'text-[var(--t-danger)]' : 'text-[var(--t-text)]'}`}>
                                                    Rs. {spent.toLocaleString()}
                                                </span>
                                                <div className="w-16 h-1 bg-[var(--t-surface3)] rounded-full mt-1 overflow-hidden">
                                                    <div
                                                        className={`h-full ${isOverSpent ? 'bg-[var(--t-danger)]' : 'bg-green-500'}`}
                                                        style={{ width: `${Math.min((spent / (currentBudget || 1)) * 100, 100)}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className={`text-xs font-black ${variance < 0 ? 'text-[var(--t-danger)]' : 'text-[var(--t-primary)]'}`}>
                                                {variance < 0 ? '-' : '+'} Rs. {Math.abs(variance).toLocaleString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[11px] font-black ${isCorrect ? 'text-[var(--t-primary)]' : 'text-orange-500'}`}>
                                                    {((currentDistTotal / (currentBudget || 1)) * 100).toFixed(0)}%
                                                </span>
                                                <div className="flex flex-col">
                                                    {!isCorrect && <span className="text-[8px] font-bold text-orange-500 animate-pulse">FIX PLAN</span>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-1 opacity-10 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => setExpandedId(isExpanded ? null : c.id)}
                                                    className={`p-2 rounded-lg transition-all border ${isExpanded ? 'bg-[var(--t-primary)] text-[var(--t-bg)] border-[var(--t-primary2)]' : 'bg-[var(--t-surface)] text-[var(--t-text3)] border-[var(--t-border)] hover:border-[var(--t-primary)] hover:text-[var(--t-primary)]'}`}
                                                    title="Distribute to Phases"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                                </button>
                                                {(localBudgets[c.id] !== undefined || localAllocations[c.id]) && (
                                                    <button
                                                        onClick={() => handleInlineSave(c)}
                                                        disabled={isSaving}
                                                        className="p-2 bg-[var(--t-primary)] text-white rounded-lg hover:bg-emerald-700 transition-all disabled:opacity-50"
                                                        title="Save Changes"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDelete(c.id)}
                                                    className="p-2 text-[var(--t-danger)] hover:opacity-80 transition-colors"
                                                    title="Delete Category"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>

                                    {/* Expansion Row for Phase Distribution */}
                                    {isExpanded && (
                                        <tr>
                                            <td colSpan="5" className="bg-[var(--t-surface2)] px-12 py-8 border-b border-[var(--t-border)]">
                                                <div className="flex flex-col gap-6 animate-in slide-in-from-top-4 duration-300">
                                                    <div className="flex justify-between items-center">
                                                        <div>
                                                            <h4 className="text-sm font-black text-[var(--t-text)] uppercase tracking-tight">Phase-wise distribution for {c.name}</h4>
                                                            <p className="text-[11px] text-[var(--t-text2)] font-medium">Assign specific portions of the category budget to construction phases.</p>
                                                        </div>
                                                        <div className="bg-[var(--t-surface)] px-6 py-3 rounded-2xl border border-[var(--t-border)] shadow-sm flex gap-8">
                                                            <div className="flex flex-col">
                                                                <span className="text-[9px] font-black text-[var(--t-text3)] uppercase">Target Budget</span>
                                                                <span className="text-base font-black text-[var(--t-primary)]">Rs. {currentBudget.toLocaleString()}</span>
                                                            </div>
                                                            <div className="flex flex-col border-l border-[var(--t-border)] pl-8">
                                                                <span className="text-[9px] font-black text-[var(--t-text3)] uppercase">Total Distributed</span>
                                                                <span className={`text-base font-black ${isCorrect ? 'text-[var(--t-primary)]' : 'text-amber-500'}`}>Rs. {currentDistTotal.toLocaleString()}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 gap-4">
                                                        {dashboardData.phases?.map(phase => {
                                                            const existingAlloc = phaseAllocations.find(a => a.phase === phase.id)?.amount || 0;
                                                            const currentValue = localCatAllocations[phase.id] !== undefined ? localCatAllocations[phase.id] : existingAlloc;

                                                            // Get tasks for this Phase & Category
                                                            const tasks = dashboardData.tasks?.filter(t => t.phase === phase.id && t.category === c.id) || [];
                                                            const phaseSpent = dashboardData.expenses?.filter(e => e.phase === phase.id && e.category === c.id).reduce((sum, e) => sum + Number(e.amount), 0) || 0;

                                                            return (
                                                                <div key={phase.id} className="bg-[var(--t-surface)] rounded-[2rem] border border-[var(--t-border)] shadow-sm overflow-hidden transition-all hover:border-[var(--t-border)]">
                                                                    <div className="p-6 flex items-center justify-between bg-[var(--t-surface)] border-b border-[var(--t-border)]">
                                                                        <div className="flex items-center gap-5">
                                                                            <div className="w-10 h-10 bg-[var(--t-nav-active-bg)] rounded-2xl flex items-center justify-center text-xs font-black text-[var(--t-primary)]">
                                                                                {phase.order}
                                                                            </div>
                                                                            <div className="flex flex-col">
                                                                                <span className="text-sm font-black text-[var(--t-text)] uppercase tracking-tight">{phase.name}</span>
                                                                                <span className="text-[10px] text-[var(--t-text3)] font-bold">Phase Total Estimate: Rs. {Number(phase.estimated_budget).toLocaleString()}</span>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-center gap-10">
                                                                            <div className="flex flex-col items-end">
                                                                                <span className="text-[9px] font-black text-[var(--t-text3)] uppercase">Phase Spent</span>
                                                                                <span className="text-sm font-black text-[var(--t-text)]">Rs. {phaseSpent.toLocaleString()}</span>
                                                                            </div>
                                                                            <div className="w-32">
                                                                                <label className="block text-[9px] font-black text-[var(--t-text3)] uppercase mb-1 ml-1 text-right">Phase Allocation</label>
                                                                                <input
                                                                                    type="number"
                                                                                    placeholder="0.00"
                                                                                    value={currentValue || ''}
                                                                                    onChange={(e) => setLocalAllocations({
                                                                                        ...localAllocations,
                                                                                        [c.id]: {
                                                                                            ...(localAllocations[c.id] || {}),
                                                                                            [phase.id]: e.target.value
                                                                                        }
                                                                                    })}
                                                                                    className="w-full text-right text-sm font-black text-[var(--t-primary)] border-none bg-[var(--t-surface2)] rounded-xl focus:ring-2 focus:ring-[var(--t-primary)]/30 px-4 py-2 outline-none transition-all"
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    {/* Tasks Breakdown */}
                                                                    {tasks.length > 0 && (
                                                                        <div className="bg-[var(--t-bg)]/50 p-4 px-8 border-t border-[var(--t-border)] animate-in fade-in slide-in-from-top-2">
                                                                            <h5 className="text-[9px] font-black text-[var(--t-primary)] uppercase tracking-[0.2em] mb-4">Task-Level Breakdown</h5>
                                                                            <div className="space-y-3">
                                                                                {tasks.map(task => {
                                                                                    const taskSpent = dashboardData.expenses?.filter(e => e.task === task.id).reduce((sum, e) => sum + Number(e.amount), 0) || 0;
                                                                                    const isOver = taskSpent > Number(task.estimated_cost);

                                                                                    return (
                                                                                        <div key={task.id} className="flex justify-between items-center group/task py-1">
                                                                                            <div className="flex items-center gap-3">
                                                                                                <div className="w-1.5 h-1.5 rounded-full bg-[var(--t-border)] group-hover/task:bg-[var(--t-primary)] transition-colors"></div>
                                                                                                <span className="text-xs font-bold text-[var(--t-text2)]">{task.title}</span>
                                                                                            </div>
                                                                                            <div className="flex items-center gap-8">
                                                                                                <div className="flex flex-col items-end">
                                                                                                    <span className="text-[8px] font-bold text-[var(--t-text3)] uppercase">Est. Cost</span>
                                                                                                    <span className="text-[11px] font-black text-[var(--t-text2)]">Rs. {Number(task.estimated_cost).toLocaleString()}</span>
                                                                                                </div>
                                                                                                <div className="flex flex-col items-end w-24">
                                                                                                    <span className="text-[8px] font-bold text-[var(--t-text3)] uppercase">Spent</span>
                                                                                                    <span className={`text-[11px] font-black ${isOver ? 'text-[var(--t-danger)]' : 'text-[var(--t-primary)]'}`}>Rs. {taskSpent.toLocaleString()}</span>
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>

                                                    <div className="flex justify-end gap-3 mt-4 border-t border-[var(--t-border)] pt-6">
                                                        <button
                                                            onClick={() => setExpandedId(null)}
                                                            className="px-6 py-2.5 text-[10px] font-black text-[var(--t-text3)] uppercase tracking-widest hover:text-[var(--t-text2)] transition-colors"
                                                        >
                                                            Discard Changes
                                                        </button>
                                                        <button
                                                            onClick={() => handleInlineSave(c)}
                                                            disabled={isSaving}
                                                            className="px-12 py-3 bg-[var(--t-primary)] text-[var(--t-bg)] rounded-xl text-[10px] font-black uppercase shadow-lg shadow-[var(--t-primary)]/10 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                                                        >
                                                            {isSaving ? 'Updating Database...' : 'Finalize Planning'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                        {filteredCategories.length === 0 && (
                            <tr>
                                <td colSpan="3" className="px-6 py-10 text-center text-[var(--t-text3)] italic text-sm">No categories found matching your search.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile View: Cyber List */}
            <div className="lg:hidden flex flex-col gap-0.5">
                {filteredCategories.map(c => {
                    const isExpanded = expandedId === c.id;
                    const currentBudget = localBudgets[c.id] !== undefined ? localBudgets[c.id] : c.allocation;
                    const phaseAllocations = dashboardData.phaseBudgetAllocations?.filter(a => a.category === c.id) || [];
                    const localCatAllocations = localAllocations[c.id] || {};
                    const currentDistTotal = Object.keys(localCatAllocations).length > 0
                        ? dashboardData.phases?.reduce((sum, p) => sum + (parseFloat(localCatAllocations[p.id] !== undefined ? localCatAllocations[p.id] : (phaseAllocations.find(a => a.phase === p.id)?.amount || 0))), 0)
                        : phaseAllocations.reduce((sum, a) => sum + Number(a.amount), 0);
                    const isCorrect = currentBudget <= currentDistTotal + 0.1;
                    const isSaving = loadingRow === c.id;
                    const spent = Number(c.spent) || 0;
                    const isOverSpent = spent > currentBudget;
                    const spentPct = Math.min((spent / (currentBudget || 1)) * 100, 100);

                    return (
                        <div key={c.id} className={`border rounded-[2px] transition-all ${isExpanded ? 'border-[var(--t-primary)]' : 'border-[var(--t-border)] hover:border-[var(--t-primary)]'} bg-[var(--t-surface)]`}>
                            {/* Summary row */}
                            <div className="p-3 flex items-center gap-3">
                                {/* Status icon */}
                                <div className={`w-9 h-9 rounded shrink-0 flex items-center justify-center text-xs font-['DM_Mono',monospace] font-bold border
                                    ${isOverSpent ? 'bg-[var(--t-danger)]/10 border-[var(--t-danger)]/40 text-[var(--t-danger)]' :
                                      isCorrect ? 'bg-[var(--t-primary)]/10 border-[var(--t-primary)]/30 text-[var(--t-primary)]' :
                                      'bg-[var(--t-warn)]/10 border-[var(--t-warn)]/30 text-[var(--t-warn)]'}`}>
                                    {isOverSpent ? '🚨' : isCorrect ? '✓' : '!'}
                                </div>
                                {/* Middle */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-[13px] text-[var(--t-text)] font-semibold truncate leading-tight">{c.name}</p>
                                    <div className="flex items-center gap-1 mt-0.5">
                                        <span className="text-[8px] font-['DM_Mono',monospace] text-[var(--t-text3)] uppercase tracking-widest">
                                            {c.code || 'BUDGET'}
                                        </span>
                                        <span className="h-px bg-[var(--t-border)] flex-1" />
                                    </div>
                                    <div className="mt-1.5 h-1 bg-[var(--t-surface3)] rounded-sm overflow-hidden">
                                        <div className={`h-full transition-all duration-700 ${isOverSpent ? 'bg-[var(--t-danger)]' : 'bg-[var(--t-primary)]'}`}
                                            style={{ width: `${spentPct}%` }} />
                                    </div>
                                </div>
                                {/* Right */}
                                <div className="text-right shrink-0 flex flex-col gap-1">
                                    <p className="text-[16px] text-[var(--t-text)] font-['Bebas_Neue',sans-serif] tracking-wide leading-none">
                                        {Number(currentBudget).toLocaleString()}
                                    </p>
                                    <span className={`text-[7px] uppercase tracking-widest font-['DM_Mono',monospace] ${isOverSpent ? 'text-[var(--t-danger)]' : 'text-[var(--t-text3)]'}`}>
                                        spent {spent.toLocaleString()}
                                    </span>
                                    <div className="flex gap-1 justify-end">
                                        <button onClick={() => setExpandedId(isExpanded ? null : c.id)}
                                            className={`px-2 py-0.5 text-[8px] uppercase tracking-widest font-['DM_Mono',monospace] border rounded-[1px] transition-colors
                                                ${isExpanded ? 'border-[var(--t-primary)] bg-[var(--t-primary)]/10 text-[var(--t-primary)]' :
                                                  'border-[var(--t-border)] text-[var(--t-text3)] hover:border-[var(--t-primary)] hover:text-[var(--t-primary)]'}`}>
                                            {isExpanded ? 'Close' : 'Plan'}
                                        </button>
                                        <button onClick={() => handleDelete(c.id)}
                                            className="px-2 py-0.5 text-[8px] uppercase tracking-widest font-['DM_Mono',monospace] border border-[var(--t-danger)]/30 text-[var(--t-danger)] rounded-[1px] hover:bg-[var(--t-danger)]/10 transition-colors">
                                            Del
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Expanded phase distribution */}
                            {isExpanded && (
                                <div className="border-t border-[var(--t-border)] p-3 space-y-3 bg-[var(--t-surface2)]">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[8px] font-['DM_Mono',monospace] uppercase tracking-widest text-[var(--t-text3)]">Phase Allocations</span>
                                        <span className={`text-[8px] font-['DM_Mono',monospace] uppercase tracking-widest ${isCorrect ? 'text-[var(--t-primary)]' : 'text-[var(--t-warn)]'}`}>
                                            {isCorrect ? 'PLAN OK' : '⚠ FIX PLAN'}
                                        </span>
                                    </div>

                                    {/* Budget input */}
                                    <div>
                                        <label className="text-[8px] font-['DM_Mono',monospace] uppercase tracking-widest text-[var(--t-text3)] block mb-1">Allocated Budget (Rs)</label>
                                        <input
                                            type="number"
                                            value={currentBudget}
                                            onChange={(e) => setLocalBudgets({ ...localBudgets, [c.id]: parseFloat(e.target.value) || 0 })}
                                            className="w-full bg-[var(--t-surface)] border border-[var(--t-border)] rounded-[2px] px-3 py-2 text-sm font-bold text-[var(--t-primary)] focus:border-[var(--t-primary)] outline-none transition-colors font-['DM_Mono',monospace]"
                                        />
                                    </div>

                                    {dashboardData.phases?.map(phase => {
                                        const existingAlloc = phaseAllocations.find(a => a.phase === phase.id)?.amount || 0;
                                        const currentValue = localCatAllocations[phase.id] !== undefined ? localCatAllocations[phase.id] : existingAlloc;
                                        return (
                                            <div key={phase.id} className="flex items-center gap-2 bg-[var(--t-surface)] border border-[var(--t-border)] rounded-[2px] p-2">
                                                <div className="w-6 h-6 rounded shrink-0 flex items-center justify-center text-[10px] font-['DM_Mono',monospace] bg-[var(--t-primary)]/10 border border-[var(--t-primary)]/30 text-[var(--t-primary)]">
                                                    {phase.order}
                                                </div>
                                                <span className="flex-1 text-[11px] text-[var(--t-text)] font-semibold truncate">{phase.name}</span>
                                                <input
                                                    type="number"
                                                    value={currentValue || ''}
                                                    onChange={(e) => setLocalAllocations({
                                                        ...localAllocations,
                                                        [c.id]: { ...(localAllocations[c.id] || {}), [phase.id]: e.target.value }
                                                    })}
                                                    className="w-24 bg-[var(--t-surface2)] border border-[var(--t-border)] rounded-[2px] px-2 py-1.5 text-right text-sm font-bold text-[var(--t-primary)] outline-none focus:border-[var(--t-primary)] transition-colors font-['DM_Mono',monospace]"
                                                    placeholder="0.00"
                                                />
                                            </div>
                                        );
                                    })}

                                    <div className="flex gap-2 pt-1">
                                        <button onClick={() => setExpandedId(null)}
                                            className="flex-1 py-2 text-[8px] uppercase tracking-widest font-['DM_Mono',monospace] text-[var(--t-text3)] border border-[var(--t-border)] rounded-[1px] hover:text-[var(--t-text2)] transition-colors">
                                            Cancel
                                        </button>
                                        <button onClick={() => handleInlineSave(c)} disabled={isSaving}
                                            className="flex-1 py-2 text-[8px] uppercase tracking-widest font-['DM_Mono',monospace] bg-[var(--t-primary)] text-[var(--t-bg)] rounded-[1px] disabled:opacity-50 transition-colors hover:opacity-90">
                                            {isSaving ? 'Saving...' : 'Save Plan'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
                {filteredCategories.length === 0 && (
                    <div className="ht-empty"><p>No categories found.</p></div>
                )}
            </div>
        </div>
    );
};

export default CategoriesTab;
