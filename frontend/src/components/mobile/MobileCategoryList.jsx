import React, { useState, useEffect } from 'react';
import { useConstruction } from '../../context/ConstructionContext';
import { dashboardService } from '../../services/api';
import CategoryManageModal from './CategoryManageModal';

const MobileCategoryList = ({ searchQuery = '', resolveMetadata, onClearMetadata }) => {
    const { budgetStats, refreshData } = useConstruction();
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [isManageModalOpen, setIsManageModalOpen] = useState(false);

    useEffect(() => {
        if (resolveMetadata?.highlightId) {
            const category = budgetStats.categories?.find(c => c.id === resolveMetadata.highlightId);
            if (category) {
                setSelectedCategory(category);
                setIsManageModalOpen(true);
            }
            if (onClearMetadata) onClearMetadata();
        }
    }, [resolveMetadata, budgetStats.categories, onClearMetadata]);

    const filteredCategories = budgetStats.categories?.filter(c =>
        c.name.toLowerCase().includes((searchQuery || '').toLowerCase())
    ) || [];

    const handleOpenManageModal = (category) => {
        setSelectedCategory(category);
        setIsManageModalOpen(true);
    };

    const handleCreateCategory = () => {
        setSelectedCategory({ name: '', allocation: 0, code: '' });
        setIsManageModalOpen(true);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-2 px-1">
                <p className="text-[11px] text-[var(--t-text2)] font-['DM_Mono',monospace] uppercase tracking-widest truncate">Manage project budget distributions and categories.</p>
                <button
                    onClick={handleCreateCategory}
                    className="shrink-0 px-3 py-1.5 bg-[var(--t-primary)] text-[var(--t-bg)] rounded-[2px] font-['DM_Mono',monospace] uppercase tracking-widest text-[10px] shadow-sm active:opacity-90"
                >
                    + NEW
                </button>
            </div>

            <div className="space-y-0.5 pb-[120px]">
                {filteredCategories.length === 0 && (
                    <div className="text-center py-14 text-[var(--t-text3)]">
                        <div className="text-3xl mb-2">📊</div>
                        <p className="text-sm font-semibold">No categories found</p>
                    </div>
                )}
                {filteredCategories.map(c => {
                    const spent = Number(c.spent) || 0;
                    const allocation = Number(c.allocation) || 0;
                    const isOverSpent = spent > allocation;
                    const spentPct = allocation > 0 ? (spent / allocation) * 100 : 0;

                    return (
                        <div key={c.id} 
                            onClick={() => handleOpenManageModal(c)}
                            className="bg-[var(--t-surface)] border-b border-[var(--t-border)] p-3 flex items-center justify-between hover:bg-[var(--t-surface2)] active:bg-[var(--t-surface2)] cursor-pointer transition-colors"
                        >
                            {/* Left: Category Info */}
                            <div className="flex flex-col min-w-0 pr-3">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-[14px] text-[var(--t-text)] truncate">{c.name}</span>
                                    {isOverSpent && <span className="text-[12px] animate-pulse">🚨</span>}
                                </div>
                                <span className="text-[10px] text-[var(--t-text3)] font-['DM_Mono',monospace] uppercase tracking-widest mt-0.5">{c.code || 'FINANCE'}</span>
                                {allocation > 0 && (
                                    <div className="mt-2 w-32 h-1 bg-[var(--t-surface3)] rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full transition-all duration-700 ${isOverSpent ? 'bg-[var(--t-danger)]' : 'bg-[var(--t-primary)]'}`}
                                            style={{ width: `${Math.min(spentPct, 100)}%` }}
                                        />
                                    </div>
                                )}
                            </div>
                            
                            {/* Right: Amounts */}
                            <div className="text-right shrink-0 flex flex-col justify-center gap-1">
                                <div className="flex flex-col">
                                    <span className="text-[16px] font-black leading-none text-[var(--t-text)] font-['Bebas_Neue',sans-serif] tracking-wide">
                                        {allocation.toLocaleString()}
                                    </span>
                                    <span className="text-[9px] uppercase font-bold text-[var(--t-text3)] mt-[2px]">Target</span>
                                </div>
                                <div className={`flex flex-col ${isOverSpent ? 'text-[var(--t-danger)]' : 'text-[var(--t-text2)]'}`}>
                                    <span className="text-[11px] font-bold leading-none">
                                        {spent.toLocaleString()}
                                    </span>
                                    <span className="text-[7px] uppercase font-bold text-[var(--t-text3)] mt-[1px]">Spent</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <CategoryManageModal 
                isOpen={isManageModalOpen} 
                onClose={() => setIsManageModalOpen(false)} 
                category={selectedCategory}
            />
        </div>
    );
};

export default MobileCategoryList;
