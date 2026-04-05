import React from 'react';
import PdfExportButton from '../../../common/PdfExportButton';

const ExpenseActions = ({ searchQuery, setSearchQuery, handleOpenModal, exportData }) => {
    return (
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center mb-6">
            {/* Search Input */}
            <div className="relative w-full md:w-96 group">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--t-text3)] group-focus-within:text-[var(--t-primary)] transition-colors duration-300">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </span>
                <input
                    type="text"
                    placeholder="Search title, paid to, category..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-[var(--t-surface)] border border-[var(--t-border)] rounded-[2px] text-[var(--t-text)] placeholder-[var(--t-text3)] focus:border-[var(--t-primary)] transition-all outline-none font-['DM_Mono',monospace] text-sm"
                />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 w-full md:w-auto">
                {exportData && (
                     <PdfExportButton 
                        data={exportData} 
                        title="Construction Project Cost Summary" 
                        filename={`cost_summary_${new Date().toISOString().split('T')[0]}.pdf`} 
                     />
                )}
                <button
                    onClick={() => handleOpenModal()}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-[var(--t-primary)] text-[var(--t-bg)] rounded-[2px] hover:opacity-90 active:scale-[0.98] font-['DM_Mono',monospace] uppercase tracking-widest text-xs transition-all shadow-sm shadow-[var(--t-primary)]/20"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    New Expense
                </button>
            </div>
        </div>
    );
};

export default ExpenseActions;
