import React, { useState } from 'react';
import { dashboardService } from '../../../services/api';
import Modal from '../../common/Modal';
import { useConstruction } from '../../../context/ConstructionContext';
import ConfirmModal from '../../common/ConfirmModal';
import ExpenseDetailModal from '../../common/ExpenseDetailModal';

const FundingTab = ({ searchQuery = '' }) => {
    const { dashboardData, refreshData, formatCurrency } = useConstruction();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [viewingHistory, setViewingHistory] = useState(null);
    const [formData, setFormData] = useState({});
    const [loading, setLoading] = useState(false);
    const [isTopUpOpen, setIsTopUpOpen] = useState(false);
    const [activeFundingSource, setActiveFundingSource] = useState(null);
    const [isExpenseDetailOpen, setIsExpenseDetailOpen] = useState(false);
    const [selectedExpenseId, setSelectedExpenseId] = useState(null);
    const [topUpFormData, setTopUpFormData] = useState({
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        description: 'Manual Top-up'
    });

    // Confirmation Modal System
    const [confirmConfig, setConfirmConfig] = useState({ isOpen: false });
    const showConfirm = (config) => setConfirmConfig({ ...config, isOpen: true });
    const closeConfirm = () => setConfirmConfig({ ...confirmConfig, isOpen: false });

    const filteredFunding = dashboardData.funding?.filter(f =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.source_type.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    const handleOpenModal = (item = null) => {
        setEditingItem(item);
        if (item) {
            setFormData(item);
        } else {
            setFormData({
                source_type: 'OWN_MONEY',
                received_date: new Date().toISOString().split('T')[0],
                amount: 0,
                interest_rate: 0
            });
        }
        setIsModalOpen(true);
    };

    const handleDelete = (id) => {
        showConfirm({
            title: "Delete Funding Source?",
            message: "Are you sure you want to permanently remove this funding source? This will affect your total project capital and financial tracking. This action is irreversible.",
            confirmText: "Yes, Delete Source",
            type: "danger",
            onConfirm: async () => {
                try {
                    await dashboardService.deleteFundingSource(id);
                    refreshData();
                    closeConfirm();
                } catch (error) {
                    alert("Delete failed.");
                    closeConfirm();
                }
            }
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (editingItem) await dashboardService.updateFundingSource(editingItem.id, formData);
            else await dashboardService.createFundingSource(formData);
            setIsModalOpen(false);
            refreshData();
        } catch (error) {
            alert("Save failed.");
        } finally {
            setLoading(false);
        }
    };

    const handleOpenTopUp = (item) => {
        setActiveFundingSource(item);
        setTopUpFormData({
            amount: 0,
            date: new Date().toISOString().split('T')[0],
            description: 'Manual Top-up'
        });
        setIsTopUpOpen(true);
    };

    const handleTopUpSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await dashboardService.createFundingTransaction({
                funding_source: activeFundingSource.id,
                amount: parseFloat(topUpFormData.amount),
                transaction_type: 'CREDIT',
                date: topUpFormData.date,
                description: topUpFormData.description
            });
            setIsTopUpOpen(false);
            refreshData();
        } catch (error) {
            alert("Top-up failed.");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteTransaction = (transaction, e) => {
        e.stopPropagation();
        showConfirm({
            title: "Delete Transaction?",
            message: "Are you sure you want to delete this transaction? The funding source's balance will be automatically adjusted.",
            confirmText: "Yes, Delete",
            type: "danger",
            onConfirm: async () => {
                try {
                    setLoading(true);
                    await dashboardService.deleteFundingTransaction(transaction.id);
                    refreshData();
                    setViewingHistory(null); // safely close it to reflect new state
                    closeConfirm();
                } catch (error) {
                    alert("Delete failed.");
                    closeConfirm();
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    const getSourceTypeBadge = (type) => {
        const styles = {
            'OWN_MONEY': 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
            'LOAN': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
            'BORROWED': 'bg-purple-500/10 text-purple-500 border-purple-500/20',
            'OTHER': 'bg-[var(--t-surface3)] text-[var(--t-text2)] border-[var(--t-border)]'
        };
        const labels = {
            'OWN_MONEY': 'Personal Savings (Bachat)',
            'LOAN': 'Bank Loan (Karja)',
            'BORROWED': 'Borrowed (Saapathi)',
            'OTHER': 'Other Source'
        };
        return (
            <span className={`px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider ${styles[type] || styles.OTHER}`}>
                {labels[type] || type}
            </span>
        );
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <p className="text-[11px] text-[var(--t-text2)] font-['DM_Mono',monospace] uppercase tracking-widest">Manage project capital sources, loan interests, and available funding.</p>
                <div className="flex-1 sm:hidden"></div>
                <button
                    onClick={() => handleOpenModal()}
                    className="w-full sm:w-auto px-4 py-2.5 bg-[var(--t-primary)] text-[var(--t-bg)] rounded-[2px] hover:opacity-90 font-['DM_Mono',monospace] uppercase tracking-widest text-[10px] sm:text-xs transition-colors shadow-sm"
                >
                    + Add Funding Source
                </button>
            </div>

            {/* Desktop View: Table */}
            <div className="hidden lg:block bg-[var(--t-surface)] rounded-xl shadow-sm border border-[var(--t-border)] overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-[var(--t-surface2)] border-b border-[var(--t-border)]">
                            <th className="px-6 py-4 text-xs font-bold text-[var(--t-text3)] uppercase tracking-wider">Source Name</th>
                            <th className="px-6 py-4 text-xs font-bold text-[var(--t-text3)] uppercase tracking-wider">Total Allocated</th>
                            <th className="px-6 py-4 text-xs font-bold text-[var(--t-text3)] uppercase tracking-wider">Total Spent</th>
                            <th className="px-6 py-4 text-xs font-bold text-[var(--t-text3)] uppercase tracking-wider">Current Balance</th>
                            <th className="px-6 py-4 text-xs font-bold text-[var(--t-text3)] uppercase tracking-wider text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--t-border)]">
                        {filteredFunding.map(f => {
                            const rawPercent = f.amount > 0 ? (f.current_balance / f.amount) * 100 : 0;
                            const isOverdrawn = f.current_balance < 0;
                            const displayPercent = Math.min(100, Math.max(0, rawPercent));
                            return (
                                <tr key={f.id} className="hover:bg-[var(--t-surface2)] transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-[var(--t-text)] leading-tight">{f.name}</span>
                                            <span className={`text-[9px] font-black uppercase tracking-tighter mt-1 inline-block px-1.5 py-0.5 rounded ${f.source_type === 'OWN_MONEY' ? 'bg-[var(--t-primary)]/10 text-[var(--t-primary)] border border-emerald-500/20' :
                                                f.source_type === 'LAXMI_B' ? 'bg-[var(--t-info)]/10 text-[var(--t-info)] border border-[var(--t-info)]/20' :
                                                    f.source_type === 'LOAN' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' :
                                                        'bg-[var(--t-surface2)] text-[var(--t-text2)] border border-[var(--t-border)]'
                                                }`}>
                                                {f.source_type?.replace('_', ' ')}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-black text-[var(--t-text)]">{formatCurrency(f.amount)}</td>
                                    <td className="px-6 py-4 text-[var(--t-danger)] font-bold text-sm">{formatCurrency(Math.max(0, Number(f.amount) - Number(f.current_balance)))}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <div className="flex justify-between items-baseline mb-1">
                                                <span className={`text-sm font-black ${isOverdrawn ? 'text-[var(--t-danger)]' : 'text-[var(--t-primary)]'}`}>{formatCurrency(f.current_balance)}</span>
                                                {isOverdrawn ? (
                                                    <span className="text-[10px] text-[var(--t-danger)] font-bold uppercase tracking-tight">⚠ OVERDRAWN</span>
                                                ) : (
                                                    <span className="text-[10px] text-[var(--t-text3)] font-bold uppercase tracking-tight">{Math.round(displayPercent)}% LEFT</span>
                                                )}
                                            </div>
                                            <div className="w-full bg-[var(--t-surface3)] h-1.5 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full transition-all duration-700 ${isOverdrawn ? 'bg-[var(--t-danger)]' : displayPercent < 20 ? 'bg-[var(--t-danger)]' : displayPercent < 50 ? 'bg-orange-500' : 'bg-green-500'}`}
                                                    style={{ width: isOverdrawn ? '100%' : `${displayPercent}%` }}
                                                />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleOpenTopUp(f)} className="text-[var(--t-info)] hover:opacity-80 font-bold text-[10px] uppercase tracking-wider">+ Add Money</button>
                                            <button onClick={() => setViewingHistory(f)} className="text-[var(--t-primary)] hover:opacity-80 font-bold text-[10px] uppercase tracking-wider">Manage</button>
                                            <button onClick={() => handleOpenModal(f)} className="text-[var(--t-primary)] hover:text-[var(--t-primary)] font-bold text-[10px] uppercase tracking-wider">Edit</button>
                                            <button onClick={() => handleDelete(f.id)} className="text-[var(--t-danger)] hover:text-[var(--t-danger)] font-bold text-[10px] uppercase tracking-wider">Delete</button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredFunding.length === 0 && (
                            <tr>
                                <td colSpan="4" className="px-6 py-10 text-center text-[var(--t-text3)] italic">No funding sources found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile View: Cyber List */}
            <div className="lg:hidden flex flex-col gap-0.5">
                {filteredFunding.map(f => {
                    const rawPercent = f.amount > 0 ? (f.current_balance / f.amount) * 100 : 0;
                    const isOverdrawn = f.current_balance < 0;
                    const displayPercent = Math.min(100, Math.max(0, rawPercent));
                    const isLow = displayPercent < 20;
                    return (
                        <div key={f.id} className="bg-[var(--t-surface)] border border-[var(--t-border)] rounded-[2px] p-3 flex items-center gap-3
                            hover:border-[var(--t-primary)] transition-colors">
                            {/* Icon */}
                            <div className={`w-9 h-9 rounded shrink-0 flex items-center justify-center text-base border
                                ${f.source_type === 'OWN_MONEY' ? 'bg-[var(--t-primary)]/10 border-[var(--t-primary)]/30' :
                                  f.source_type === 'LOAN' ? 'bg-[var(--t-info)]/10 border-[var(--t-info)]/30' :
                                  'bg-[var(--t-surface2)] border-[var(--t-border)]'}`}>
                                {f.source_type === 'OWN_MONEY' ? '💰' : f.source_type === 'LOAN' ? '🏦' : '🤝'}
                            </div>
                            {/* Middle */}
                            <div className="flex-1 min-w-0">
                                <p className="text-[13px] text-[var(--t-text)] font-semibold truncate leading-tight">{f.name}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[8px] uppercase tracking-widest font-['DM_Mono',monospace] text-[var(--t-text3)]">
                                        {f.source_type?.replace('_', ' ')}
                                    </span>
                                    <span className="h-px bg-[var(--t-border)] flex-1" />
                                </div>
                                <div className="mt-1.5 h-1 bg-[var(--t-surface3)] rounded-sm overflow-hidden">
                                    <div className={`h-full transition-all duration-700 ${isOverdrawn || isLow ? 'bg-[var(--t-danger)]' : displayPercent < 50 ? 'bg-[var(--t-warn)]' : 'bg-[var(--t-primary)]'}`}
                                        style={{ width: isOverdrawn ? '100%' : `${displayPercent}%` }} />
                                </div>
                            </div>
                            {/* Right: amounts + actions */}
                            <div className="text-right shrink-0 flex flex-col gap-1">
                                <p className={`text-[16px] font-['Bebas_Neue',sans-serif] tracking-wide leading-none ${isOverdrawn ? 'text-[var(--t-danger)]' : 'text-[var(--t-primary)]'}`}>
                                    {formatCurrency(f.current_balance)}
                                </p>
                                <span className={`text-[7px] uppercase tracking-widest font-['DM_Mono',monospace] ${isOverdrawn ? 'text-[var(--t-danger)]' : isLow ? 'text-[var(--t-danger)]' : 'text-[var(--t-text3)]'}`}>
                                    {isOverdrawn ? '⚠ overdrawn' : `${Math.round(displayPercent)}% left`}
                                </span>
                                <div className="flex gap-1 justify-end mt-1">
                                    <button onClick={() => handleOpenTopUp(f)}
                                        className="px-2 py-0.5 text-[8px] uppercase tracking-widest font-['DM_Mono',monospace] border border-[var(--t-info)]/40 text-[var(--t-info)] rounded-[1px] hover:bg-[var(--t-info)]/10 transition-colors">
                                        TopUp
                                    </button>
                                    <button onClick={() => setViewingHistory(f)}
                                        className="px-2 py-0.5 text-[8px] uppercase tracking-widest font-['DM_Mono',monospace] border border-[var(--t-primary)]/40 text-[var(--t-primary)] rounded-[1px] hover:bg-[var(--t-primary)]/10 transition-colors">
                                        Manage
                                    </button>
                                    <button onClick={() => handleOpenModal(f)}
                                        className="px-2 py-0.5 text-[8px] uppercase tracking-widest font-['DM_Mono',monospace] border border-[var(--t-border)] text-[var(--t-text3)] rounded-[1px] hover:border-[var(--t-border2)] transition-colors">
                                        Edit
                                    </button>
                                    <button onClick={() => handleDelete(f.id)}
                                        className="px-2 py-0.5 text-[8px] uppercase tracking-widest font-['DM_Mono',monospace] border border-[var(--t-danger)]/30 text-[var(--t-danger)] rounded-[1px] hover:bg-[var(--t-danger)]/10 transition-colors">
                                        Del
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
                {filteredFunding.length === 0 && (
                    <div className="ht-empty"><p>No funding sources found.</p></div>
                )}
            </div>


            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`${editingItem ? 'Edit' : 'Add'} Funding Source`}>
                <form onSubmit={handleSubmit} className="space-y-4 p-1">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 md:col-span-1">
                            <label className="block text-sm font-semibold text-[var(--t-text2)] mb-1">Source Name</label>
                            <input
                                type="text"
                                value={formData.name || ''}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full rounded-xl border-[var(--t-border)] shadow-sm focus:ring-2 focus:ring-[var(--t-primary)] p-3 border outline-none"
                                placeholder="e.g. Nabil Bank Personal Loan"
                                required
                            />
                        </div>
                        <div className="col-span-2 md:col-span-1">
                            <label className="block text-sm font-semibold text-[var(--t-text2)] mb-1">Source Type</label>
                            <select
                                value={formData.source_type || 'OWN_MONEY'}
                                onChange={e => setFormData({ ...formData, source_type: e.target.value })}
                                className="w-full rounded-xl border-[var(--t-border)] shadow-sm focus:ring-2 focus:ring-[var(--t-primary)] p-3 border outline-none bg-[var(--t-surface)] appearance-none"
                                required
                            >
                                <option value="OWN_MONEY">Personal Savings (Nagad/Bachat)</option>
                                <option value="LOAN">Bank Loan (Karja)</option>
                                <option value="BORROWED">Borrowed from Friends/Family (Saapathi)</option>
                                <option value="OTHER">Other Sources</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-[var(--t-text2)] mb-1">Amount (Rs.)</label>
                            <input
                                type="number"
                                value={formData.amount || 0}
                                onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                className="w-full rounded-xl border-[var(--t-border)] shadow-sm focus:ring-2 focus:ring-[var(--t-primary)] p-3 border outline-none font-bold text-[var(--t-text)]"
                                placeholder="0"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-[var(--t-text2)] mb-1">Interest Rate (%)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.interest_rate || 0}
                                onChange={e => setFormData({ ...formData, interest_rate: e.target.value })}
                                className="w-full rounded-xl border-[var(--t-border)] shadow-sm focus:ring-2 focus:ring-[var(--t-primary)] p-3 border outline-none"
                                placeholder="0.00"
                                disabled={formData.source_type === 'OWN_MONEY'}
                            />
                            <p className="text-[10px] text-[var(--t-text3)] mt-1 italic">Annual percentage rate.</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-[var(--t-text2)] mb-1">Date Received</label>
                            <input
                                type="date"
                                value={formData.received_date || ''}
                                onChange={e => setFormData({ ...formData, received_date: e.target.value })}
                                className="w-full rounded-xl border-[var(--t-border)] shadow-sm focus:ring-2 focus:ring-[var(--t-primary)] p-3 border outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-[var(--t-text2)] mb-1">Default Payment Method</label>
                            <select
                                value={formData.default_payment_method || 'CASH'}
                                onChange={e => setFormData({ ...formData, default_payment_method: e.target.value })}
                                className="w-full rounded-xl border-[var(--t-border)] shadow-sm focus:ring-2 focus:ring-[var(--t-primary)] p-3 border outline-none bg-[var(--t-surface)] appearance-none font-bold"
                                required
                            >
                                <option value="CASH">💰 Nagad (Cash)</option>
                                <option value="BANK_TRANSFER">🏦 Bank Transfer (ConnectIPS)</option>
                                <option value="CHECK">📜 Cheque</option>
                                <option value="QR">📱 eSewa / Khalti (QR)</option>
                                <option value="OTHER">❓ Other</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-[var(--t-text2)] mb-1">Notes / Terms</label>
                        <textarea
                            value={formData.notes || ''}
                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            className="w-full rounded-xl border-[var(--t-border)] shadow-sm focus:ring-2 focus:ring-[var(--t-primary)] p-3 border outline-none resize-none"
                            placeholder="Repayment terms, grace periods, etc."
                            rows="2"
                        />
                    </div>
                    <div className="flex justify-end gap-3 mt-8">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-sm font-bold text-[var(--t-text2)] hover:text-[var(--t-text2)]">Cancel</button>
                        <button type="submit" disabled={loading} className="px-8 py-2.5 bg-[var(--t-primary)] text-[var(--t-bg)] rounded-xl font-bold shadow-lg shadow-[var(--t-primary)]/20 hover:opacity-90 disabled:opacity-50 transition-all">
                            {loading ? 'Saving...' : (editingItem ? 'Update Source' : 'Add Source')}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Top-up Modal */}
            <Modal isOpen={isTopUpOpen} onClose={() => setIsTopUpOpen(false)} title={`Top-up: ${activeFundingSource?.name}`}>
                <form onSubmit={handleTopUpSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-[var(--t-text2)] mb-1">Top-up Amount (Rs.)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={topUpFormData.amount}
                                onChange={e => setTopUpFormData({ ...topUpFormData, amount: e.target.value })}
                                className="w-full rounded-xl border-[var(--t-border)] shadow-sm focus:ring-2 focus:ring-[var(--t-primary)] p-3 border outline-none font-bold text-[var(--t-primary)]"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-[var(--t-text2)] mb-1">Date</label>
                            <input
                                type="date"
                                value={topUpFormData.date}
                                onChange={e => setTopUpFormData({ ...topUpFormData, date: e.target.value })}
                                className="w-full rounded-xl border-[var(--t-border)] shadow-sm focus:ring-2 focus:ring-[var(--t-primary)] p-3 border outline-none"
                                required
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-[var(--t-text2)] mb-1">Description / Source Note</label>
                        <input
                            type="text"
                            value={topUpFormData.description}
                            onChange={e => setTopUpFormData({ ...topUpFormData, description: e.target.value })}
                            className="w-full rounded-xl border-[var(--t-border)] shadow-sm focus:ring-2 focus:ring-[var(--t-primary)] p-3 border outline-none"
                            placeholder="e.g. Additional savings injection"
                            required
                        />
                    </div>
                    <div className="flex justify-end gap-3 mt-8">
                        <button type="button" onClick={() => setIsTopUpOpen(false)} className="px-6 py-2.5 text-sm font-bold text-[var(--t-text2)] hover:text-[var(--t-text2)]">Cancel</button>
                        <button type="submit" disabled={loading} className="px-8 py-2.5 bg-[var(--t-primary)] text-[var(--t-bg)] rounded-xl font-bold shadow-lg shadow-[var(--t-primary)]/20 hover:opacity-90 disabled:opacity-50 transition-all">
                            {loading ? 'Processing...' : 'Confirm Top-up'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Transaction History Modal */}
            <Modal isOpen={!!viewingHistory} onClose={() => setViewingHistory(null)} title={`Transaction History: ${viewingHistory?.name}`} maxWidth="max-w-2xl">
                <div className="space-y-4">
                    <div className="bg-[var(--t-surface2)] p-4 rounded-xl flex justify-between items-center border border-[var(--t-border)]">
                        <div>
                            <div className="text-[10px] font-black uppercase text-[var(--t-text3)] tracking-widest">Available Balance</div>
                            <div className="text-xl font-black text-[var(--t-text)]">{viewingHistory && formatCurrency(viewingHistory.current_balance)}</div>
                        </div>
                        <div className="text-right">
                            <div className="text-[10px] font-black uppercase text-[var(--t-text3)] tracking-widest">Total Capital</div>
                            <div className="text-xl font-black text-[var(--t-text)]">{viewingHistory && formatCurrency(viewingHistory.amount)}</div>
                        </div>
                    </div>

                    <div className="max-h-[50vh] overflow-y-auto space-y-2 pr-2 scrollbar-hide">
                        {viewingHistory?.transactions?.length > 0 ? (
                            viewingHistory.transactions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).map((t, idx) => (
                                <div key={idx} className="flex justify-between items-center bg-[var(--t-surface)] p-4 rounded-xl border border-[var(--t-border)] shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${t.transaction_type === 'CREDIT' ? 'bg-[var(--t-nav-active-bg)] text-[var(--t-primary)]' : 'bg-[var(--t-danger)]/10 text-[var(--t-danger)]'}`}>
                                            {t.transaction_type === 'CREDIT' ? (
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                                            ) : (
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" /></svg>
                                            )}
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-[var(--t-text)]">{t.description}</div>
                                            <div className="text-[10px] text-[var(--t-text3)] font-medium">{new Date(t.date).toLocaleDateString()}</div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <div className={`text-sm font-black ${t.transaction_type === 'CREDIT' ? 'text-[var(--t-primary)]' : 'text-[var(--t-danger)]'}`}>
                                            {t.transaction_type === 'CREDIT' ? '+' : '-'}{formatCurrency(t.amount)}
                                        </div>
                                        {!t.payment ? (
                                            <button onClick={(e) => handleDeleteTransaction(t, e)} className="text-[10px] text-[var(--t-danger)] opacity-60 hover:opacity-100 uppercase font-bold tracking-widest transition-opacity mt-1">
                                                Delete
                                            </button>
                                        ) : t.expense_id ? (
                                            <button 
                                                onClick={() => { setSelectedExpenseId(t.expense_id); setIsExpenseDetailOpen(true); }}
                                                className="text-[10px] text-[var(--t-primary)] opacity-80 hover:opacity-100 uppercase font-bold tracking-widest transition-opacity mt-1 underline"
                                            >
                                                View Transaction
                                            </button>
                                        ) : null}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-10 bg-[var(--t-surface2)] rounded-xl border-2 border-dashed border-[var(--t-border)] italic text-[var(--t-text3)] text-sm">
                                No transactions found for this source.
                            </div>
                        )}
                    </div>
                </div>
            </Modal>

            <ConfirmModal 
                isOpen={confirmConfig.isOpen}
                title={confirmConfig.title}
                message={confirmConfig.message}
                confirmText={confirmConfig.confirmText}
                onConfirm={confirmConfig.onConfirm}
                onCancel={closeConfirm}
                type={confirmConfig.type || 'warning'}
            />

            <ExpenseDetailModal
                isOpen={isExpenseDetailOpen}
                onClose={() => setIsExpenseDetailOpen(false)}
                expenseId={selectedExpenseId}
            />
        </div>
    );
};

export default FundingTab;
