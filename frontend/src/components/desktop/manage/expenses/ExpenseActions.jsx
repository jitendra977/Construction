import React from 'react';
import PdfExportButton from '../../../common/PdfExportButton';
import { authService } from '../../../../services/auth';

const ExpenseActions = ({ 
    searchQuery, 
    setSearchQuery, 
    handleOpenModal, 
    exportData, 
    viewMode = 'expenses', 
    setViewMode,
    
    // Expense Filters
    expenseStatusFilter,
    setExpenseStatusFilter,
    expenseCategoryFilter,
    setExpenseCategoryFilter,
    expenseDateFilter,
    setExpenseDateFilter,
    budgetCategories,

    // Payment Filters
    paymentMethodFilter,
    setPaymentMethodFilter,
    fundingSourceFilter,
    setFundingSourceFilter,
    fundingSources
}) => {
    const canManageFinances = authService.hasPermission('can_manage_finances');

    const setQuickPeriod = (period) => {
        const now = new Date();
        let start = '';
        let end = now.toISOString().split('T')[0];

        switch (period) {
            case 'TODAY':
                start = end;
                break;
            case 'WEEK':
                const lastWeek = new Date();
                lastWeek.setDate(now.getDate() - 7);
                start = lastWeek.toISOString().split('T')[0];
                break;
            case 'MONTH':
                start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
                break;
            case 'YEAR':
                start = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
                break;
            default:
                start = '';
                end = '';
        }
        setExpenseDateFilter({ start, end });
    };

    return (
        <div className="flex flex-col gap-4 mb-6">
            <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center bg-[var(--t-surface)] p-4 rounded-[2px] border border-[var(--t-border)] shadow-sm">
                <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
                    {/* View Switcher Toggle */}
                    <div className="bg-[var(--t-surface2)] p-1 rounded-xl flex items-center border border-[var(--t-border)] shadow-inner">
                        <button
                            onClick={() => setViewMode('expenses')}
                            className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'expenses' ? 'bg-[var(--t-primary)] text-white shadow-lg' : 'text-[var(--t-text3)] hover:text-[var(--t-text2)]'}`}
                        >
                            Bills
                        </button>
                        <button
                            onClick={() => setViewMode('ledger')}
                            className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'ledger' ? 'bg-[var(--t-primary)] text-white shadow-lg' : 'text-[var(--t-text3)] hover:text-[var(--t-text2)]'}`}
                        >
                            Ledger
                        </button>
                        <button
                            onClick={() => setViewMode('payments')}
                            className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'payments' ? 'bg-[var(--t-primary)] text-white shadow-lg' : 'text-[var(--t-text3)] hover:text-[var(--t-text2)]'}`}
                        >
                            History
                        </button>
                    </div>

                    {/* Search Input */}
                    <div className="relative w-full sm:w-64 group">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--t-text3)] group-focus-within:text-[var(--t-primary)] transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </span>
                        <input
                            type="text"
                            placeholder="Filter data..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-[var(--t-surface2)] border border-[var(--t-border)] rounded-xl text-[var(--t-text)] placeholder-[var(--t-text3)] focus:border-[var(--t-primary)] transition-all outline-none font-bold text-[11px] uppercase tracking-wider"
                        />
                    </div>

                    {/* Quick Period Filters */}
                    {viewMode === 'expenses' && (
                        <div className="flex items-center gap-1 bg-[var(--t-surface2)] p-1 rounded-xl border border-[var(--t-border)]">
                            {['TODAY', 'WEEK', 'MONTH', 'YEAR'].map(period => (
                                <button
                                    key={period}
                                    onClick={() => setQuickPeriod(period)}
                                    className="px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-tighter text-[var(--t-text3)] hover:text-[var(--t-primary)] hover:bg-[var(--t-surface3)] transition-all"
                                >
                                    {period}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    {viewMode === 'expenses' && exportData && (
                        <div className="shrink-0">
                            <PdfExportButton 
                                data={exportData} 
                                summaryData={exportData.summaryData}
                                projectInfo={exportData.projectInfo}
                                title="Project Statement" 
                                filename={`expense_report_${new Date().toISOString().split('T')[0]}.pdf`} 
                            />
                        </div>
                    )}
                    {canManageFinances && (
                        <button
                            onClick={() => handleOpenModal()}
                            className="px-6 py-2 bg-[var(--t-primary)] text-white rounded-xl hover:brightness-110 active:scale-95 font-black uppercase tracking-widest text-[10px] transition-all shadow-lg shadow-[var(--t-primary)]/20 flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
                            Add Receipt
                        </button>
                    )}
                </div>
            </div>

            {/* Sub-Filters Row */}
            <div className="flex flex-wrap items-center gap-3">
                {viewMode === 'expenses' ? (
                    <>
                        <div className="flex items-center bg-[var(--t-surface)] p-1 rounded-xl border border-[var(--t-border)] shadow-sm">
                            {[
                                { id: 'ALL', label: 'All', icon: '📋' },
                                { id: 'DUE', label: 'Due', icon: '🔴' },
                                { id: 'PAID', label: 'Paid', icon: '🟢' }
                            ].map(status => (
                                <button
                                    key={status.id}
                                    onClick={() => setExpenseStatusFilter(status.id)}
                                    className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${expenseStatusFilter === status.id ? 'bg-[var(--t-surface3)] text-[var(--t-text)] shadow-sm' : 'text-[var(--t-text3)] hover:text-[var(--t-text2)]'}`}
                                >
                                    <span className="text-[10px]">{status.icon}</span>
                                    {status.label}
                                </button>
                            ))}
                        </div>

                        <div className="relative">
                            <select
                                value={expenseCategoryFilter}
                                onChange={(e) => setExpenseCategoryFilter(e.target.value)}
                                className="pl-8 pr-10 py-2 bg-[var(--t-surface)] border border-[var(--t-border)] rounded-xl text-[10px] font-black uppercase tracking-widest text-[var(--t-text2)] outline-none focus:border-[var(--t-primary)] appearance-none cursor-pointer hover:bg-[var(--t-surface2)] transition-all shadow-sm"
                            >
                                <option value="ALL">All Categories</option>
                                {budgetCategories?.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] grayscale">📂</span>
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] opacity-20">▼</span>
                        </div>

                        <div className="flex items-center gap-2 bg-[var(--t-surface)] p-2 px-4 rounded-xl border border-[var(--t-border)] shadow-sm">
                            <span className="text-[8px] font-black text-[var(--t-text3)] uppercase">Period</span>
                            <div className="flex items-center gap-1">
                                <input
                                    type="date"
                                    value={expenseDateFilter.start}
                                    onChange={(e) => setExpenseDateFilter({ ...expenseDateFilter, start: e.target.value })}
                                    className="bg-transparent border-none text-[9px] font-black p-0 outline-none text-[var(--t-text)] w-24"
                                />
                                <span className="text-[var(--t-text3)] opacity-30 mx-1">-</span>
                                <input
                                    type="date"
                                    value={expenseDateFilter.end}
                                    onChange={(e) => setExpenseDateFilter({ ...expenseDateFilter, end: e.target.value })}
                                    className="bg-transparent border-none text-[9px] font-black p-0 outline-none text-[var(--t-text)] w-24"
                                />
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="relative">
                            <select
                                value={paymentMethodFilter}
                                onChange={(e) => setPaymentMethodFilter(e.target.value)}
                                className="pl-8 pr-10 py-2 bg-[var(--t-surface)] border border-[var(--t-border)] rounded-xl text-[10px] font-black uppercase tracking-widest text-[var(--t-text2)] outline-none focus:border-[var(--t-primary)] appearance-none cursor-pointer hover:bg-[var(--t-surface2)] transition-all shadow-sm"
                            >
                                <option value="ALL">All Methods</option>
                                <option value="CASH">💰 Cash</option>
                                <option value="BANK_TRANSFER">🏦 Bank</option>
                                <option value="QR">📱 QR Pay</option>
                                <option value="CHECK">📜 Check</option>
                            </select>
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs grayscale">💳</span>
                        </div>

                        <div className="relative">
                            <select
                                value={fundingSourceFilter}
                                onChange={(e) => setFundingSourceFilter(e.target.value)}
                                className="pl-8 pr-10 py-2 bg-[var(--t-surface)] border border-[var(--t-border)] rounded-xl text-[10px] font-black uppercase tracking-widest text-[var(--t-text2)] outline-none focus:border-[var(--t-primary)] appearance-none cursor-pointer hover:bg-[var(--t-surface2)] transition-all shadow-sm"
                            >
                                <option value="ALL">All Funding</option>
                                {fundingSources?.map(fs => (
                                    <option key={fs.id} value={fs.id}>
                                        {fs.source_type === 'LOAN' ? '🏦' : '💰'} {fs.name}
                                    </option>
                                ))}
                            </select>
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs grayscale">🏧</span>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default ExpenseActions;
