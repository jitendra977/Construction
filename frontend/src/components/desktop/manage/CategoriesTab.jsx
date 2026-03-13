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
                    el.classList.add('ring-2', 'ring-indigo-500', 'ring-offset-2');
                    setTimeout(() => el.classList.remove('ring-2', 'ring-indigo-500', 'ring-offset-2'), 3000);
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
            <div className="flex justify-between items-center mb-2">
                <p className="text-sm text-gray-500">Plan budgets and distributions directly in the table below. Use "Manage" to assign funds to phases.</p>
                <button
                    onClick={handleCreateCategory}
                    disabled={loading}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors shadow-sm disabled:opacity-50"
                >
                    {loading ? 'Creating...' : '+ New Category'}
                </button>
            </div>

            {/* Desktop View: Table */}
            <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Category & Code</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Planned (Target)</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Actual Spent</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Variance</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Phase Dist.</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
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
                                    <tr id={'category-row-' + c.id} className={`hover:bg-gray-50 transition-colors group ${isExpanded ? 'bg-indigo-50/30' : ''}`}>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-gray-900">{c.name}</span>
                                                <span className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">{c.code || 'PLANNING'} {isOverSpent && '🚨'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col w-32">
                                                <input
                                                    type="number"
                                                    value={currentBudget}
                                                    onChange={(e) => setLocalBudgets({ ...localBudgets, [c.id]: parseFloat(e.target.value) || 0 })}
                                                    className="w-full bg-white border border-gray-100 rounded-lg px-2 py-1.5 text-xs font-black text-indigo-600 focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
                                                />
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className={`text-xs font-black ${isOverSpent ? 'text-red-600' : 'text-gray-900'}`}>
                                                    Rs. {spent.toLocaleString()}
                                                </span>
                                                <div className="w-16 h-1 bg-gray-100 rounded-full mt-1 overflow-hidden">
                                                    <div
                                                        className={`h-full ${isOverSpent ? 'bg-red-500' : 'bg-emerald-500'}`}
                                                        style={{ width: `${Math.min((spent / (currentBudget || 1)) * 100, 100)}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className={`text-xs font-black ${variance < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                                                {variance < 0 ? '-' : '+'} Rs. {Math.abs(variance).toLocaleString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[11px] font-black ${isCorrect ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                    {((currentDistTotal / (currentBudget || 1)) * 100).toFixed(0)}%
                                                </span>
                                                <div className="flex flex-col">
                                                    {!isCorrect && <span className="text-[8px] font-bold text-amber-600 animate-pulse">FIX PLAN</span>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-1 opacity-10 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => setExpandedId(isExpanded ? null : c.id)}
                                                    className={`p-2 rounded-lg transition-all border ${isExpanded ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-400 border-gray-100 hover:border-indigo-200 hover:text-indigo-600'}`}
                                                    title="Distribute to Phases"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                                </button>
                                                {(localBudgets[c.id] !== undefined || localAllocations[c.id]) && (
                                                    <button
                                                        onClick={() => handleInlineSave(c)}
                                                        disabled={isSaving}
                                                        className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all disabled:opacity-50"
                                                        title="Save Changes"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDelete(c.id)}
                                                    className="p-2 text-rose-300 hover:text-rose-600 transition-colors"
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
                                            <td colSpan="5" className="bg-gray-50/80 px-12 py-8 border-b border-indigo-100">
                                                <div className="flex flex-col gap-6 animate-in slide-in-from-top-4 duration-300">
                                                    <div className="flex justify-between items-center">
                                                        <div>
                                                            <h4 className="text-sm font-black text-gray-900 uppercase tracking-tight">Phase-wise distribution for {c.name}</h4>
                                                            <p className="text-[11px] text-gray-500 font-medium">Assign specific portions of the category budget to construction phases.</p>
                                                        </div>
                                                        <div className="bg-white px-6 py-3 rounded-2xl border border-indigo-100 shadow-sm flex gap-8">
                                                            <div className="flex flex-col">
                                                                <span className="text-[9px] font-black text-gray-400 uppercase">Target Budget</span>
                                                                <span className="text-base font-black text-indigo-600">Rs. {currentBudget.toLocaleString()}</span>
                                                            </div>
                                                            <div className="flex flex-col border-l border-gray-100 pl-8">
                                                                <span className="text-[9px] font-black text-gray-400 uppercase">Total Distributed</span>
                                                                <span className={`text-base font-black ${isCorrect ? 'text-emerald-600' : 'text-amber-500'}`}>Rs. {currentDistTotal.toLocaleString()}</span>
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
                                                                <div key={phase.id} className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden transition-all hover:border-indigo-200">
                                                                    <div className="p-6 flex items-center justify-between bg-white border-b border-gray-50">
                                                                        <div className="flex items-center gap-5">
                                                                            <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center text-xs font-black text-indigo-600">
                                                                                {phase.order}
                                                                            </div>
                                                                            <div className="flex flex-col">
                                                                                <span className="text-sm font-black text-gray-900 uppercase tracking-tight">{phase.name}</span>
                                                                                <span className="text-[10px] text-gray-400 font-bold">Phase Total Estimate: Rs. {Number(phase.estimated_budget).toLocaleString()}</span>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-center gap-10">
                                                                            <div className="flex flex-col items-end">
                                                                                <span className="text-[9px] font-black text-gray-400 uppercase">Phase Spent</span>
                                                                                <span className="text-sm font-black text-gray-900">Rs. {phaseSpent.toLocaleString()}</span>
                                                                            </div>
                                                                            <div className="w-32">
                                                                                <label className="block text-[9px] font-black text-gray-400 uppercase mb-1 ml-1 text-right">Phase Allocation</label>
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
                                                                                    className="w-full text-right text-sm font-black text-emerald-600 border-none bg-emerald-50/50 rounded-xl focus:ring-4 focus:ring-emerald-100 px-4 py-2 outline-none transition-all"
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    {/* Tasks Breakdown */}
                                                                    {tasks.length > 0 && (
                                                                        <div className="bg-gray-50/30 p-4 px-8 border-t border-gray-50 animate-in fade-in slide-in-from-top-2">
                                                                            <h5 className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-4">Task-Level Breakdown</h5>
                                                                            <div className="space-y-3">
                                                                                {tasks.map(task => {
                                                                                    const taskSpent = dashboardData.expenses?.filter(e => e.task === task.id).reduce((sum, e) => sum + Number(e.amount), 0) || 0;
                                                                                    const isOver = taskSpent > Number(task.estimated_cost);

                                                                                    return (
                                                                                        <div key={task.id} className="flex justify-between items-center group/task py-1">
                                                                                            <div className="flex items-center gap-3">
                                                                                                <div className="w-1.5 h-1.5 rounded-full bg-gray-200 group-hover/task:bg-indigo-400 transition-colors"></div>
                                                                                                <span className="text-xs font-bold text-gray-600">{task.title}</span>
                                                                                            </div>
                                                                                            <div className="flex items-center gap-8">
                                                                                                <div className="flex flex-col items-end">
                                                                                                    <span className="text-[8px] font-bold text-gray-400 uppercase">Est. Cost</span>
                                                                                                    <span className="text-[11px] font-black text-gray-500">Rs. {Number(task.estimated_cost).toLocaleString()}</span>
                                                                                                </div>
                                                                                                <div className="flex flex-col items-end w-24">
                                                                                                    <span className="text-[8px] font-bold text-gray-400 uppercase">Spent</span>
                                                                                                    <span className={`text-[11px] font-black ${isOver ? 'text-red-500' : 'text-emerald-600'}`}>Rs. {taskSpent.toLocaleString()}</span>
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

                                                    <div className="flex justify-end gap-3 mt-4 border-t border-gray-100 pt-6">
                                                        <button
                                                            onClick={() => setExpandedId(null)}
                                                            className="px-6 py-2.5 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors"
                                                        >
                                                            Discard Changes
                                                        </button>
                                                        <button
                                                            onClick={() => handleInlineSave(c)}
                                                            disabled={isSaving}
                                                            className="px-12 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-indigo-100 hover:bg-black hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
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
                                <td colSpan="3" className="px-6 py-10 text-center text-gray-400 italic text-sm">No categories found matching your search.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile View: High-End Interactive Cards */}
            <div className="lg:hidden space-y-5">
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

                    // Plan vs Actual Stats
                    const spent = Number(c.spent) || 0;
                    const variance = currentBudget - spent;
                    const isOverSpent = spent > currentBudget;

                    return (
                        <div key={c.id} className={`bg-white rounded-3xl p-6 border shadow-xl transition-all ${isCorrect ? 'border-gray-100' : 'border-amber-100 shadow-amber-50'}`}>
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight leading-none mb-1">{c.name}</h3>
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Category Plan</span>
                                </div>
                                <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {isCorrect ? 'Plan Ready' : 'Planning Error'}
                                </div>
                            </div>

                            <div className="space-y-4 mb-6">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Allocated Budget (Rs.)</label>
                                    <input
                                        type="number"
                                        value={currentBudget}
                                        onChange={(e) => setLocalBudgets({ ...localBudgets, [c.id]: parseFloat(e.target.value) || 0 })}
                                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-base font-black text-indigo-600 focus:ring-4 focus:ring-indigo-100 outline-none transition-all"
                                    />
                                </div>

                                {/* Spending Progress Section */}
                                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                    <div className="flex justify-between items-center text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                                        <span>Actual Spent</span>
                                        <span className={variance < 0 ? 'text-red-500' : 'text-emerald-600'}>
                                            {variance < 0 ? 'Over' : 'Remaining'}: Rs. {Math.abs(variance).toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-end mb-2">
                                        <span className={`text-lg font-black ${isOverSpent ? 'text-red-600' : 'text-gray-900'}`}>Rs. {Number(c.spent || 0).toLocaleString()}</span>
                                        <span className="text-[10px] font-bold text-gray-400">
                                            {((Number(c.spent || 0) / (currentBudget || 1)) * 100).toFixed(1)}% used
                                        </span>
                                    </div>
                                    <div className="w-full h-2 bg-white rounded-full overflow-hidden border border-gray-100">
                                        <div
                                            className={`h-full transition-all duration-1000 ${isOverSpent ? 'bg-red-500' : 'bg-emerald-500'}`}
                                            style={{ width: `${Math.min((Number(c.spent || 0) / (currentBudget || 1)) * 100, 100)}%` }}
                                        ></div>
                                    </div>
                                </div>

                                <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                                    <div className="flex justify-between items-center text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">
                                        <span>Phase Distributions</span>
                                        <span>{((currentDistTotal / (currentBudget || 1)) * 100).toFixed(1)}%</span>
                                    </div>
                                    <span className={`text-xl font-black ${isCorrect ? 'text-emerald-600' : 'text-amber-500'}`}>Rs. {currentDistTotal.toLocaleString()}</span>
                                    {!isCorrect && <p className="text-[8px] font-black text-amber-600 mt-2">⚠️ ALLOCATED BUDGET MUST BE ≤ DISTRIBUTED FUNDS</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setExpandedId(isExpanded ? null : c.id)}
                                    className="py-4 bg-gray-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center active:scale-95 transition-all shadow-lg shadow-gray-200"
                                >
                                    {isExpanded ? 'Close Plan' : 'View Phases'}
                                </button>
                                <button
                                    onClick={() => handleDelete(c.id)}
                                    className="py-4 bg-rose-50 text-rose-600 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center active:scale-95 transition-all border border-rose-100"
                                >
                                    Delete
                                </button>
                                {(localBudgets[c.id] !== undefined || localAllocations[c.id]) && (
                                    <button
                                        onClick={() => handleInlineSave(c)}
                                        disabled={isSaving}
                                        className="col-span-2 py-4 bg-emerald-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all disabled:opacity-50"
                                    >
                                        {isSaving ? 'Processing Plan...' : 'Save Category Changes'}
                                    </button>
                                )}
                            </div>

                            {/* Mobile Expansion */}
                            {isExpanded && (
                                <div className="mt-8 space-y-3 pt-6 border-t border-gray-100 animate-in slide-in-from-top-4">
                                    {dashboardData.phases?.map(phase => {
                                        const existingAlloc = phaseAllocations.find(a => a.phase === phase.id)?.amount || 0;
                                        const currentValue = localCatAllocations[phase.id] !== undefined ? localCatAllocations[phase.id] : existingAlloc;
                                        const tasks = dashboardData.tasks?.filter(t => t.phase === phase.id && t.category === c.id) || [];

                                        return (
                                            <div key={phase.id} className="bg-gray-50 p-5 rounded-3xl border border-gray-100 space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <span className="w-8 h-8 bg-white rounded-xl flex items-center justify-center text-[11px] font-black text-gray-400 shadow-sm">{phase.order}</span>
                                                        <span className="text-sm font-black text-gray-700">{phase.name}</span>
                                                    </div>
                                                    <input
                                                        type="number"
                                                        value={currentValue || ''}
                                                        onChange={(e) => setLocalAllocations({
                                                            ...localAllocations,
                                                            [c.id]: {
                                                                ...(localAllocations[c.id] || {}),
                                                                [phase.id]: e.target.value
                                                            }
                                                        })}
                                                        className="w-28 bg-white border border-gray-100 rounded-2xl px-4 py-2.5 text-right text-sm font-black text-emerald-600 outline-none focus:ring-4 focus:ring-emerald-100"
                                                        placeholder="0.00"
                                                    />
                                                </div>

                                                {tasks.length > 0 && (
                                                    <div className="space-y-2 pl-2">
                                                        {tasks.map(task => {
                                                            const taskSpent = dashboardData.expenses?.filter(e => e.task === task.id).reduce((sum, e) => sum + Number(e.amount), 0) || 0;
                                                            return (
                                                                <div key={task.id} className="flex justify-between items-center text-[10px]">
                                                                    <span className="font-bold text-gray-500">{task.title}</span>
                                                                    <div className="flex gap-4">
                                                                        <span className="text-gray-400">Est: {Number(task.estimated_cost).toLocaleString()}</span>
                                                                        <span className="font-black text-indigo-500">{taskSpent.toLocaleString()}</span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default CategoriesTab;
