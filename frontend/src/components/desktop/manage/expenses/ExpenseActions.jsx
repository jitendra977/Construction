import React from 'react';
import PdfExportButton from '../../../common/PdfExportButton';

const ExpenseActions = ({ 
    searchQuery, 
    setSearchQuery, 
    handleOpenModal, 
    exportData, 
    viewMode = 'expenses', 
    setViewMode,
    paymentMethodFilter,
    setPaymentMethodFilter,
    fundingSourceFilter,
    setFundingSourceFilter,
    fundingSources
}) => {
    return (
        <div className="flex flex-col gap-6 mb-8">
            <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                    {/* View Switcher Toggle */}
                    <div className="bg-[var(--t-surface2)] p-1 rounded-xl flex items-center border border-[var(--t-border)] shadow-sm shrink-0">
                        <button
                            onClick={() => setViewMode('expenses')}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex flex-col items-center gap-0.5 ${viewMode === 'expenses' ? 'bg-[var(--t-primary)] text-white shadow-lg' : 'text-[var(--t-text3)] hover:text-[var(--t-text2)]'}`}
                        >
                            <span>Expenses & Dues</span>
                            <span className={`text-[8px] opacity-40 lowercase font-bold tracking-tight ${viewMode === 'expenses' ? 'text-white' : 'text-[var(--t-text3)]'}`}>खर्च र बाँकी</span>
                        </button>
                        <button
                            onClick={() => setViewMode('payments')}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex flex-col items-center gap-0.5 ${viewMode === 'payments' ? 'bg-[var(--t-primary)] text-white shadow-lg' : 'text-[var(--t-text3)] hover:text-[var(--t-text2)]'}`}
                        >
                            <span>Payment History</span>
                            <span className={`text-[8px] opacity-40 lowercase font-bold tracking-tight ${viewMode === 'payments' ? 'text-white' : 'text-[var(--t-text3)]'}`}>भुक्तानी इतिहास</span>
                        </button>
                    </div>

                    {/* Search Input */}
                    <div className="relative w-full sm:w-80 group">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--t-text3)] group-focus-within:text-[var(--t-primary)] transition-colors duration-300">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </span>
                        <input
                            type="text"
                            placeholder={viewMode === 'expenses' ? "Search title, paid to..." : "Search beneficiary, method..."}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-[var(--t-surface)] border border-[var(--t-border)] rounded-xl text-[var(--t-text)] placeholder-[var(--t-text3)] focus:border-[var(--t-primary)] transition-all outline-none font-bold text-sm"
                        />
                    </div>
                </div>

                {/* Filters Row (applied in Payments view) */}
                {viewMode === 'payments' && (
                    <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto animate-in fade-in slide-in-from-left-4 duration-500">
                        {/* Method Filter */}
                        <div className="relative flex-1 min-w-[140px] lg:flex-none">
                            <select
                                value={paymentMethodFilter}
                                onChange={(e) => setPaymentMethodFilter(e.target.value)}
                                className="w-full pl-8 pr-4 py-2 bg-[var(--t-surface)] border border-[var(--t-border)] rounded-xl text-[10px] font-['DM_Mono',monospace] font-bold uppercase tracking-widest text-[var(--t-text2)] outline-none focus:border-[var(--t-primary)] appearance-none cursor-pointer hover:bg-[var(--t-surface2)] transition-colors"
                            >
                                <option value="ALL">All Methods</option>
                                <option value="CASH">💰 Cash</option>
                                <option value="BANK_TRANSFER">🏦 Bank</option>
                                <option value="QR">📱 QR Pay</option>
                                <option value="CHECK">📜 Check</option>
                            </select>
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs grayscale">
                                💳
                            </span>
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] pointer-events-none opacity-40">▼</span>
                        </div>

                        {/* Funding Filter */}
                        <div className="relative flex-1 min-w-[160px] lg:flex-none">
                            <select
                                value={fundingSourceFilter}
                                onChange={(e) => setFundingSourceFilter(e.target.value)}
                                className="w-full pl-8 pr-4 py-2 bg-[var(--t-surface)] border border-[var(--t-border)] rounded-xl text-[10px] font-['DM_Mono',monospace] font-bold uppercase tracking-widest text-[var(--t-text2)] outline-none focus:border-[var(--t-primary)] appearance-none cursor-pointer hover:bg-[var(--t-surface2)] transition-colors"
                            >
                                <option value="ALL">All Funding</option>
                                {fundingSources?.map(fs => (
                                    <option key={fs.id} value={fs.id}>
                                        {fs.source_type === 'LOAN' ? '🏦' : '💰'} {fs.name}
                                    </option>
                                ))}
                            </select>
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs grayscale">
                                🏧
                            </span>
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] pointer-events-none opacity-40">▼</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Action Buttons Row */}
            <div className="flex items-center justify-between gap-3 w-full lg:w-auto border-t lg:border-t-0 pt-4 lg:pt-0 border-[var(--t-border)]">
                <div className="flex items-center gap-2">
                    {viewMode === 'expenses' && exportData && (
                        <PdfExportButton 
                            data={exportData} 
                            summaryData={exportData.summaryData}
                            projectInfo={exportData.projectInfo}
                            title="Construction Project Cost Summary" 
                            filename={`cost_summary_${new Date().toISOString().split('T')[0]}.pdf`} 
                        />
                    )}
                </div>
                {viewMode === 'expenses' && (
                    <button
                        onClick={() => handleOpenModal()}
                        className="px-6 py-2 bg-[var(--t-primary)] text-white rounded-xl hover:brightness-110 active:scale-[0.98] font-black uppercase tracking-widest text-[10px] transition-all shadow-lg shadow-[var(--t-primary)]/20 flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                        </svg>
                        New Expense
                    </button>
                )}
            </div>
        </div>
    );
};

export default ExpenseActions;
