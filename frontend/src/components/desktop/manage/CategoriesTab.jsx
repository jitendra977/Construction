import React, { useState } from 'react';
import { useConstruction } from '../../../context/ConstructionContext';
import CategoryManageModal from '../../mobile/CategoryManageModal';

const CategoriesTab = ({ searchQuery = '', resolveMetadata, onClearMetadata }) => {
    const { dashboardData, budgetStats } = useConstruction();
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [isManageModalOpen, setIsManageModalOpen] = useState(false);

    React.useEffect(() => {
        if (resolveMetadata?.highlightId) {
            const category = budgetStats.categories?.find(c => c.id === resolveMetadata.highlightId);
            if (category) {
                setSelectedCategory(category);
                setIsManageModalOpen(true);
                
                // Still scroll to row for context
                setTimeout(() => {
                    const el = document.getElementById(`category-row-${resolveMetadata.highlightId}`);
                    if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        el.classList.add('ring-2', 'ring-[var(--t-primary)]', 'ring-offset-2');
                        setTimeout(() => el.classList.remove('ring-2', 'ring-[var(--t-primary)]', 'ring-offset-2'), 3000);
                    }
                }, 100);
            }
            onClearMetadata();
        }
    }, [resolveMetadata, budgetStats.categories, onClearMetadata]);

    const filteredCategories = budgetStats.categories?.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    const handleCreateCategory = () => {
        setSelectedCategory({ name: '', allocation: 0, code: '' });
        setIsManageModalOpen(true);
    };

    const handleEditCategory = (category) => {
        setSelectedCategory(category);
        setIsManageModalOpen(true);
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <p className="text-[11px] text-[var(--t-text2)] font-['DM_Mono',monospace] uppercase tracking-widest">Manage project budget categories and phase-wise distributions.</p>
                <button
                    onClick={handleCreateCategory}
                    className="w-full sm:w-auto px-4 py-2.5 bg-[var(--t-primary)] text-[var(--t-bg)] rounded-[2px] hover:opacity-90 font-['DM_Mono',monospace] uppercase tracking-widest text-[10px] sm:text-xs transition-colors shadow-sm"
                >
                    + New Category
                </button>
            </div>

            {/* Desktop View: Table */}
            <div className="hidden lg:block bg-[var(--t-surface)] rounded-xl shadow-sm border border-[var(--t-border)] overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-[var(--t-surface2)] border-b border-[var(--t-border)]">
                            <th className="px-6 py-4 text-[10px] font-black text-[var(--t-text3)] uppercase tracking-[0.2em]" style={{ fontFamily: 'var(--f-mono)' }}>Category & ID</th>
                            <th className="px-6 py-4 text-[10px] font-black text-[var(--t-text3)] uppercase tracking-[0.2em] text-right" style={{ fontFamily: 'var(--f-mono)' }}>Allocation</th>
                            <th className="px-6 py-4 text-[10px] font-black text-[var(--t-text3)] uppercase tracking-[0.2em] text-right" style={{ fontFamily: 'var(--f-mono)' }}>Actual Spent</th>
                            <th className="px-6 py-4 text-[10px] font-black text-[var(--t-text3)] uppercase tracking-[0.2em] text-right" style={{ fontFamily: 'var(--f-mono)' }}>Variance</th>
                            <th className="px-6 py-4 text-[10px] font-black text-[var(--t-text3)] uppercase tracking-[0.2em] text-center" style={{ fontFamily: 'var(--f-mono)' }}>Plan Alignment</th>
                            <th className="px-6 py-4 text-[10px] font-black text-[var(--t-text3)] uppercase tracking-[0.2em] text-right" style={{ fontFamily: 'var(--f-mono)' }}>Control</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--t-border)]">
                        {filteredCategories.map(c => {
                            const allocation = Number(c.allocation) || 0;
                            const spent = Number(c.spent) || 0;
                            const variance = allocation - spent;
                            const isOverSpent = spent > allocation;

                            // Calculate distribution status
                            const phaseAllocations = dashboardData.phaseBudgetAllocations?.filter(a => a.category === c.id) || [];
                            const distTotal = phaseAllocations.reduce((sum, a) => sum + Number(a.amount), 0);
                            const isCorrect = allocation <= distTotal + 0.1;

                            return (
                                <tr key={c.id} id={'category-row-' + c.id} className="hover:bg-[var(--t-surface2)] transition-colors group border-b border-[var(--t-border)]/50 last:border-0">
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-[var(--t-text)] text-sm tracking-tight">{c.name}</span>
                                            <span className="text-[9px] text-[var(--t-text3)] font-black uppercase tracking-[0.1em]" style={{ fontFamily: 'var(--f-mono)' }}>{c.code || 'UNCODED'} {isOverSpent && '⚠️'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="text-sm font-black text-[var(--t-primary)]" style={{ fontFamily: 'var(--f-mono)' }}>
                                            {formatCurrency(allocation)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex flex-col items-end">
                                            <span className={`text-xs font-black ${isOverSpent ? 'text-[var(--t-danger)]' : 'text-[var(--t-text)]'}`} style={{ fontFamily: 'var(--f-mono)' }}>
                                                {formatCurrency(spent)}
                                            </span>
                                            <div className="w-16 h-1 bg-[var(--t-border)]/20 rounded-full mt-1.5 overflow-hidden">
                                                <div
                                                    className={`h-full ${isOverSpent ? 'bg-[var(--t-danger)]' : 'bg-[var(--t-primary)]'}`}
                                                    style={{ width: `${Math.min((spent / (allocation || 1)) * 100, 100)}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className={`text-xs font-black ${variance < 0 ? 'text-[var(--t-danger)]' : 'text-emerald-500'}`} style={{ fontFamily: 'var(--f-mono)' }}>
                                            {variance < 0 ? '-' : '+'} {formatCurrency(Math.abs(variance))}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col items-center gap-1">
                                            <div className="flex items-center gap-1.5">
                                                <span className={`text-[10px] font-black ${Math.abs(allocation - distTotal) < 1 ? 'text-[var(--t-text)]' : 'text-orange-500'}`} style={{ fontFamily: 'var(--f-mono)' }}>
                                                    {allocation > 0 ? ((distTotal / allocation) * 100).toFixed(0) : 0}%
                                                </span>
                                                {Math.abs(allocation - distTotal) < 1 && allocation > 0 && <span className="text-[10px] text-emerald-500">✓</span>}
                                            </div>
                                            {Math.abs(allocation - distTotal) >= 1 && <span className="text-[8px] font-black text-orange-500 uppercase tracking-tighter">Sync Required</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleEditCategory(c)}
                                            className="px-4 py-2 bg-[var(--t-surface)] border border-[var(--t-border)] text-[var(--t-text2)] rounded-lg text-[10px] font-black uppercase tracking-[0.1em] hover:bg-[var(--t-primary)] hover:text-white hover:border-transparent transition-all shadow-sm active:scale-95"
                                            style={{ fontFamily: 'var(--f-mono)' }}
                                        >
                                            Manage
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredCategories.length === 0 && (
                            <tr>
                                <td colSpan="6" className="px-6 py-10 text-center text-[var(--t-text3)] italic text-sm">No categories found matching your search.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile View */}
            <div className="lg:hidden text-center py-10 text-[var(--t-text3)] border border-dashed border-[var(--t-border)] rounded-xl">
                <p className="text-xs font-medium uppercase tracking-widest">Mobile View Optimized</p>
                <p className="text-[10px] mt-1">Please use the mobile-specific list for smaller screens.</p>
            </div>

            <CategoryManageModal 
                isOpen={isManageModalOpen} 
                onClose={() => setIsManageModalOpen(false)} 
                category={selectedCategory}
            />
        </div>
    );
};

export default CategoriesTab;

