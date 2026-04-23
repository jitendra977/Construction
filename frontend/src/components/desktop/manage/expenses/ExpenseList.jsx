import React from 'react';
import { getMediaUrl } from '../../../../services/api';
import { authService } from '../../../../services/auth';

const ExpenseList = ({
    expenses,
    handleViewDetail,
    handleOpenPaymentModal,
    handleOpenModal,
    handleDelete,
    formatCurrency,
    dashboardData,
    
    // Selection Props
    selectedIds = [],
    toggleSelect,
    toggleSelectAll,
    sortConfig,
    setSortConfig
}) => {
    const canManageFinances = authService.hasPermission('can_manage_finances');

    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const SortIcon = ({ column }) => {
        if (sortConfig.key !== column) return <span className="opacity-20 ml-1">⇅</span>;
        return <span className="ml-1 text-[var(--t-primary)]">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>;
    };

    const getTypeStyle = (type) => {
        switch (type) {
            case 'MATERIAL': return 'bg-[var(--t-info)]/10 border-[var(--t-info)]/30 text-[var(--t-info)]';
            case 'LABOR':    return 'bg-[var(--t-warn)]/10 border-[var(--t-warn)]/30 text-[var(--t-warn)]';
            case 'FEES':     return 'bg-[var(--t-primary)]/10 border-[var(--t-primary)]/30 text-[var(--t-primary)]';
            default:         return 'bg-[var(--t-surface2)] border-[var(--t-border)] text-[var(--t-text3)]';
        }
    };
    const getStatusStyle = (status) => {
        switch (status) {
            case 'PAID':    return { dot: 'bg-[var(--t-primary)]', badge: 'border-[var(--t-primary)]/40 text-[var(--t-primary)]' };
            case 'PARTIAL': return { dot: 'bg-[var(--t-warn)]',    badge: 'border-[var(--t-warn)]/40 text-[var(--t-warn)]' };
            default:        return { dot: 'bg-[var(--t-danger)]',  badge: 'border-[var(--t-danger)]/40 text-[var(--t-danger)]' };
        }
    };

    return (
        <div className="space-y-4">
            {/* Desktop Table View */}
            <div className="hidden lg:block bg-[var(--t-surface)] rounded-[2px] border border-[var(--t-border)] overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-[var(--t-surface2)] border-b border-[var(--t-border)]">
                            <th className="px-6 py-4 w-10">
                                <input 
                                    type="checkbox" 
                                    className="w-4 h-4 rounded border-[var(--t-border)] text-[var(--t-primary)] focus:ring-[var(--t-primary)] cursor-pointer translate-y-0.5"
                                    checked={expenses.length > 0 && selectedIds.length === expenses.length}
                                    onChange={toggleSelectAll}
                                />
                            </th>
                            <th 
                                className="px-8 py-4 text-[10px] font-['DM_Mono',monospace] text-[var(--t-text3)] uppercase tracking-[0.2em] cursor-pointer hover:text-[var(--t-primary)] transition-colors"
                                onClick={() => handleSort('title')}
                            >
                                Expense Details <SortIcon column="title" />
                            </th>
                            <th 
                                className="px-8 py-4 text-[10px] font-['DM_Mono',monospace] text-[var(--t-text3)] uppercase tracking-[0.2em] cursor-pointer hover:text-[var(--t-primary)] transition-colors"
                                onClick={() => handleSort('status')}
                            >
                                Status <SortIcon column="status" />
                            </th>
                            <th 
                                className="px-8 py-4 text-[10px] font-['DM_Mono',monospace] text-[var(--t-text3)] uppercase tracking-[0.2em] cursor-pointer hover:text-[var(--t-primary)] transition-colors"
                                onClick={() => handleSort('amount')}
                            >
                                Financials <SortIcon column="amount" />
                            </th>
                            <th 
                                className="px-8 py-4 text-[10px] font-['DM_Mono',monospace] text-[var(--t-text3)] uppercase tracking-[0.2em] cursor-pointer hover:text-[var(--t-primary)] transition-colors"
                                onClick={() => handleSort('date')}
                            >
                                Recipient & Date <SortIcon column="date" />
                            </th>
                            <th className="px-8 py-4 text-[10px] font-['DM_Mono',monospace] text-[var(--t-text3)] uppercase tracking-[0.2em] text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--t-border)]">
                        {expenses.map(e => {
                            const ss = getStatusStyle(e.status);
                            const isSelected = selectedIds.includes(e.id);
                            return (
                            <tr key={e.id} className={`${isSelected ? 'bg-[var(--t-primary)]/[0.03]' : 'hover:bg-[var(--t-surface2)]'} transition-all duration-200 group`}>
                                <td className="px-6 py-5">
                                    <input 
                                        type="checkbox" 
                                        className="w-4 h-4 rounded border-[var(--t-border)] text-[var(--t-primary)] focus:ring-[var(--t-primary)] cursor-pointer translate-y-0.5"
                                        checked={isSelected}
                                        onChange={() => toggleSelect(e.id)}
                                    />
                                </td>
                                <td className="px-8 py-5 cursor-pointer" onClick={() => handleViewDetail(e.id)}>
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <span className="text-[13px] font-bold text-[var(--t-text)] group-hover:text-[var(--t-primary)] transition-colors uppercase tracking-tight">
                                                {e.title}
                                            </span>
                                            {e.material_transaction && (
                                                <span className="px-2 py-0.5 bg-[var(--t-info)]/10 text-[var(--t-info)] text-[9px] font-['DM_Mono',monospace] uppercase rounded-[1px] border border-[var(--t-info)]/30" title="Inventory Sync">
                                                    Stock In
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-0.5 rounded-[1px] text-[9px] font-['DM_Mono',monospace] tracking-widest uppercase border ${getTypeStyle(e.expense_type)}`}>
                                                {e.expense_type}
                                            </span>
                                            <span className="text-[10px] text-[var(--t-text3)] font-['DM_Mono',monospace] uppercase tracking-widest">
                                                {e.category_name}
                                            </span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-5">
                                    <div className="flex flex-col gap-1.5">
                                        <div 
                                            onClick={() => canManageFinances && Number(e.balance_due) > 0 && handleOpenPaymentModal(e)}
                                            className={`inline-flex items-center px-2.5 py-1 rounded-[1px] text-[9px] font-['DM_Mono',monospace] uppercase tracking-widest border transition-all hover:brightness-110 ${ss.badge} ${canManageFinances && Number(e.balance_due) > 0 ? 'cursor-pointer' : 'cursor-default'}`}
                                        >
                                            <div className={`w-1.5 h-1.5 rounded-full mr-2 ${ss.dot}`} />
                                            {e.status}
                                        </div>
                                        {Number(e.balance_due) > 0 && (
                                            <span className="text-[8px] font-black text-[var(--t-danger)] uppercase tracking-[0.2em] animate-pulse">
                                                ⚠ Outstanding Liability
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-8 py-5">
                                    <div className="flex flex-col">
                                        <span className="text-[15px] font-['Bebas_Neue',sans-serif] tracking-wide text-[var(--t-text)]">{formatCurrency(e.amount)}</span>
                                        {Number(e.balance_due) > 0 && (
                                            <div className="mt-1.5 flex flex-col gap-1">
                                                <div className="flex justify-between items-center w-28 text-[8px] font-black tracking-tighter uppercase mb-0.5">
                                                    <span className="text-[var(--t-danger)]">Due {formatCurrency(e.balance_due)}</span>
                                                    <span className="text-[var(--t-text3)]">{Math.round((Number(e.total_paid) / Number(e.amount)) * 100)}%</span>
                                                </div>
                                                <div className="w-28 bg-[var(--t-surface3)] h-1 rounded-sm overflow-hidden">
                                                    <div
                                                        className="bg-[var(--t-primary)] h-full transition-all duration-1000"
                                                        style={{ width: `${(Number(e.total_paid) / Number(e.amount)) * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-8 py-5">
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-2">
                                            {e.expense_type === 'LABOR' && e.contractor_photo ? (
                                                <img src={getMediaUrl(e.contractor_photo)} alt="" className="w-6 h-6 rounded object-cover ring-1 ring-[var(--t-border)]" />
                                            ) : e.expense_type === 'MATERIAL' && e.supplier_photo ? (
                                                <img src={getMediaUrl(e.supplier_photo)} alt="" className="w-6 h-6 rounded object-cover ring-1 ring-[var(--t-border)]" />
                                            ) : (
                                                <div className="w-6 h-6 rounded bg-[var(--t-surface2)] flex items-center justify-center text-[9px] font-bold text-[var(--t-text3)] border border-[var(--t-border)]">
                                                    {(e.paid_to || 'U').charAt(0)}
                                                </div>
                                            )}
                                            <span className="text-[12px] font-semibold text-[var(--t-text2)] uppercase tracking-tight truncate max-w-[120px]">{e.paid_to || 'N/A'}</span>
                                        </div>
                                        <span className="text-[10px] text-[var(--t-text3)] font-['DM_Mono',monospace]">
                                            {new Date(e.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-8 py-5 text-right">
                                    <div className="flex justify-end items-center gap-2">
                                        {canManageFinances && Number(e.balance_due) > 0 && (
                                            <button
                                                onClick={() => handleOpenPaymentModal(e)}
                                                className="px-3 py-1.5 bg-[var(--t-primary)] text-white text-[9px] font-['DM_Mono',monospace] uppercase tracking-widest rounded-[1px] hover:opacity-90 transition-all shadow-lg shadow-[var(--t-primary)]/10"
                                            >
                                                Pay Due
                                            </button>
                                        )}
                                        {canManageFinances && (
                                            <>
                                                <button onClick={() => handleOpenModal(e)}
                                                    className="p-2 text-[var(--t-text3)] hover:text-[var(--t-primary)] hover:bg-[var(--t-surface2)] rounded transition-all">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-5M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
                                                </button>
                                                <button onClick={() => handleDelete(e.id)}
                                                    className="p-2 text-[var(--t-text3)] hover:text-[var(--t-danger)] hover:bg-[var(--t-danger)]/5 rounded transition-all">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Mobile View: High Density List */}
            <div className="lg:hidden flex flex-col gap-1">
                {expenses.map(e => {
                    const ss = getStatusStyle(e.status);
                    const hasDue = Number(e.balance_due) > 0;
                    const isSelected = selectedIds.includes(e.id);
                    const paidPct = hasDue ? Math.min((Number(e.total_paid) / Number(e.amount)) * 100, 100) : 100;

                    return (
                        <div key={e.id} className={`${isSelected ? 'border-[var(--t-primary)] bg-[var(--t-primary)]/[0.02]' : 'bg-[var(--t-surface)] border-[var(--t-border)]'} rounded-[2px] p-4 flex items-center gap-4 hover:border-[var(--t-primary)]/40 transition-all`}>
                            {/* Checkbox */}
                            <input 
                                type="checkbox" 
                                className="w-4 h-4 rounded border-[var(--t-border)] text-[var(--t-primary)] focus:ring-[var(--t-primary)] cursor-pointer"
                                checked={isSelected}
                                onChange={() => toggleSelect(e.id)}
                            />
                            
                            {/* Type icon */}
                            <div className={`w-10 h-10 rounded-lg shrink-0 flex flex-col items-center justify-center border shadow-sm ${getTypeStyle(e.expense_type)}`}>
                                <span className="text-[10px] font-black uppercase leading-none">
                                    {e.expense_type?.charAt(0)}
                                </span>
                            </div>
                            {/* Middle */}
                            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleViewDetail(e.id)}>
                                <p className="text-[14px] text-[var(--t-text)] font-black uppercase tracking-tight truncate leading-tight">{e.title}</p>
                                <div className="flex items-center gap-1.5 mt-1">
                                    <span className="text-[8px] font-bold text-[var(--t-text3)] uppercase tracking-widest truncate">
                                        {e.category_name} · {new Date(e.date).toLocaleDateString('en-GB', { day:'2-digit', month:'short' })}
                                    </span>
                                </div>
                                {hasDue && (
                                    <div className="mt-2 h-1 bg-[var(--t-surface3)] rounded-sm overflow-hidden">
                                        <div className="h-full bg-[var(--t-primary)] transition-all duration-700" style={{ width: `${paidPct}%` }} />
                                    </div>
                                )}
                            </div>
                            {/* Right */}
                            <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
                                <p className="text-[18px] text-[var(--t-text)] font-['Bebas_Neue',sans-serif] tracking-wide leading-none font-bold">
                                    {formatCurrency(e.amount)}
                                </p>
                                <span className={`text-[8px] font-black uppercase tracking-widest border px-2 py-0.5 rounded-[1px] ${ss.badge}`}>
                                    {e.status}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {expenses.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 bg-[var(--t-surface)] border border-dashed border-[var(--t-border)] rounded-[2px]">
                    <span className="text-4xl mb-4 grayscale">🔍</span>
                    <p className="text-[10px] font-black text-[var(--t-text3)] uppercase tracking-widest">No matching records found</p>
                </div>
            )}
        </div >
    );
};

export default ExpenseList;
