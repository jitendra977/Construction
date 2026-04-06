import React, { useState } from 'react';
import { dashboardService } from '../../../services/api';
import Modal from '../../common/Modal';
import { useConstruction } from '../../../context/ConstructionContext';
import ExpenseDetailModal from '../../common/ExpenseDetailModal';
import ConfirmModal from '../../common/ConfirmModal';

const StockTab = ({ searchQuery = '' }) => {
    const { dashboardData, refreshData } = useConstruction();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({ transaction_type: 'IN', quantity: '', purpose: '' });
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedExpenseId, setSelectedExpenseId] = useState(null);
    const [sortBy, setSortBy] = useState('date_desc'); // date_desc, date_asc

    // Confirmation Modal System
    const [confirmConfig, setConfirmConfig] = useState({ isOpen: false });
    const showConfirm = (config) => setConfirmConfig({ ...config, isOpen: true });
    const closeConfirm = () => setConfirmConfig({ ...confirmConfig, isOpen: false });

    const filteredTransactions = dashboardData.transactions?.filter(t =>
        t.material_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.supplier_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.room_name?.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    const sortedTransactions = [...filteredTransactions].sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return sortBy === 'date_desc' ? dateB - dateA : dateA - dateB;
    });

    const handleOpenModal = (item = null) => {
        setEditingItem(item);
        if (item) {
            setFormData(item);
        } else {
            setFormData({
                transaction_type: 'OUT',
                date: new Date().toISOString().split('T')[0],
                quantity: 1,
                unit_price: 0
            });
        }
        setIsModalOpen(true);
    };

    const handleDelete = (id) => {
        showConfirm({
            title: "Void Stock Transaction?",
            message: "⚠️ WARNING: This will REVERSE the stock level change and DELETE any auto-generated expenses. This action is critical for data integrity and cannot be undone. Are you absolutely sure?",
            confirmText: "Yes, Void Transaction",
            type: "danger",
            onConfirm: async () => {
                try {
                    await dashboardService.deleteMaterialTransaction(id);
                    refreshData();
                    closeConfirm();
                } catch (error) {
                    alert("Action failed. Stock could not be reverted.");
                    closeConfirm();
                }
            }
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const dataToSubmit = { ...formData };
            if (dataToSubmit.supplier === '') dataToSubmit.supplier = null;
            if (dataToSubmit.room === '') dataToSubmit.room = null;

            if (editingItem) await dashboardService.updateMaterialTransaction(editingItem.id, dataToSubmit);
            else await dashboardService.createMaterialTransaction(dataToSubmit);

            setIsModalOpen(false);
            refreshData();
        } catch (error) {
            alert("Save failed. Please check your data and stock levels.");
        } finally {
            setLoading(false);
        }
    };

    const getTypeColor = (type) => {
        const colors = {
            'IN': 'bg-green-500/10 text-green-500 border-green-500/20',
            'OUT': 'bg-[var(--t-danger)]/10 text-[var(--t-danger)] border-[var(--t-danger)]/30',
            'RETURN': 'bg-orange-500/10 text-orange-500 border-orange-500/20',
            'WASTAGE': 'bg-[var(--t-surface3)] text-[var(--t-text2)] border-[var(--t-border)]',
        };
        return colors[type] || 'bg-[var(--t-surface3)] text-[var(--t-text2)] border-[var(--t-border)]';
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-2">
                <p className="text-sm text-[var(--t-text2)]">Track all material inward/outward movements and site consumption.</p>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-black text-[var(--t-text3)] hidden md:block">Sort:</span>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="bg-[var(--t-surface)] border border-[var(--t-border)] text-[var(--t-text2)] text-xs font-bold rounded-xl px-3 py-2 outline-none shadow-sm focus:ring-2 focus:ring-[var(--t-primary)]"
                        >
                            <option value="date_desc">Date (Newest First)</option>
                            <option value="date_asc">Date (Oldest First)</option>
                        </select>
                    </div>
                    <button
                        onClick={() => handleOpenModal()}
                        className="px-4 py-2 bg-[var(--t-primary)] text-[var(--t-bg)] rounded-lg hover:opacity-90 font-medium transition-colors shadow-sm"
                    >
                        + Register Stock Entry
                    </button>
                </div>
            </div>

            {/* Desktop View: Table */}
            <div className="hidden lg:block bg-[var(--t-surface)] rounded-xl shadow-sm border border-[var(--t-border)] overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-[var(--t-surface2)] border-b border-[var(--t-border)]">
                            <th className="px-6 py-4 text-xs font-bold text-[var(--t-text2)] uppercase tracking-wider">Date & Material</th>
                            <th className="px-6 py-4 text-xs font-bold text-[var(--t-text2)] uppercase tracking-wider">Transaction Context</th>
                            <th className="px-6 py-4 text-xs font-bold text-[var(--t-text2)] uppercase tracking-wider">Quantity</th>
                            <th className="px-6 py-4 text-xs font-bold text-[var(--t-text2)] uppercase tracking-wider text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--t-border)]">
                        {sortedTransactions.map(t => (
                            <tr key={t.id} className="hover:bg-[var(--t-surface2)] transition-colors group text-sm">
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <div className="font-bold text-[var(--t-text)]">{t.material_name}</div>
                                        <div className="text-[10px] text-[var(--t-text3)] font-medium">
                                            {new Date(t.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col gap-1.5">
                                        <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase w-fit ${getTypeColor(t.transaction_type)}`}>
                                            {t.transaction_type === 'IN' ? 'Stock Inbound' : t.transaction_type === 'OUT' ? 'Stock Consumed' : t.transaction_type}
                                        </span>
                                        {t.transaction_type === 'IN' && (
                                            <div className="flex flex-col gap-1">
                                                {t.supplier_name && (
                                                    <div className="flex items-center gap-1.5 text-[10px] text-[var(--t-text2)] font-medium">
                                                        <svg className="w-3 h-3 text-[var(--t-text3)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                                        {t.supplier_name}
                                                    </div>
                                                )}
                                                {t.funding_source_name && (
                                                    <div className="flex items-center gap-1.5 text-[10px] text-[var(--t-primary)] font-bold">
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                        {t.funding_source_name}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {t.transaction_type === 'OUT' && t.room_name && (
                                            <div className="flex items-center gap-1.5 text-[10px] text-[var(--t-text2)] font-medium">
                                                <svg className="w-3 h-3 text-[var(--t-text3)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                                                {t.room_name}
                                            </div>
                                        )}
                                        {t.purpose && (
                                            <div className="text-[10px] text-[var(--t-text2)] italic leading-tight max-w-[200px] truncate" title={t.purpose}>
                                                "{t.purpose}"
                                            </div>
                                        )}
                                        {t.notes && !t.purpose && (
                                            <div className="text-[10px] text-[var(--t-text3)] italic leading-tight max-w-[200px] truncate" title={t.notes}>
                                                {t.notes}
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-baseline gap-1">
                                        <span className={`text-lg font-black ${t.transaction_type === 'IN' ? 'text-[var(--t-primary)]' : 'text-[var(--t-text)]'}`}>
                                            {t.transaction_type === 'IN' ? '+' : '-'}{t.quantity}
                                        </span>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-[var(--t-text3)] uppercase tracking-tight">{t.unit_name || ''}</span>
                                            {t.transaction_type === 'IN' && t.unit_price > 0 && (
                                                <div className="flex items-center gap-1 group/price">
                                                    <span className="text-[9px] text-[var(--t-text3)]">@Rs.{t.unit_price}</span>
                                                    {t.expense && (
                                                        <button
                                                            onClick={() => {
                                                                setSelectedExpenseId(t.expense);
                                                                setIsDetailModalOpen(true);
                                                            }}
                                                            className="text-[8px] font-black text-[var(--t-primary)] uppercase bg-[var(--t-nav-active-bg)] px-1 rounded opacity-0 group-hover/price:opacity-100 transition-opacity whitespace-nowrap"
                                                        >
                                                            View Bill
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button
                                        onClick={() => handleDelete(t.id)}
                                        className="text-[var(--t-danger)] hover:text-[var(--t-danger)] font-bold text-[10px] uppercase opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 ml-auto"
                                    >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        Void
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile View: Cards */}
            <div className="lg:hidden space-y-4">
                {sortedTransactions.map(t => (
                    <div key={t.id} className="bg-[var(--t-surface)] rounded-2xl p-4 border border-[var(--t-border)] shadow-sm flex flex-col gap-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded leading-none mb-2 inline-block border ${getTypeColor(t.transaction_type)}`}>
                                    {t.transaction_type === 'IN' ? 'Stock Inbound' : t.transaction_type === 'OUT' ? 'Stock Consumed' : t.transaction_type}
                                </span>
                                <h3 className="font-bold text-[var(--t-text)] text-base leading-tight">{t.material_name}</h3>
                                <div className="text-[10px] text-[var(--t-text2)] font-medium mt-1">
                                    {new Date(t.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-[10px] font-black text-[var(--t-text3)] uppercase tracking-widest leading-none mb-1">Quantity</div>
                                <div className={`text-xl font-black leading-none ${t.transaction_type === 'IN' ? 'text-[var(--t-primary)]' : 'text-[var(--t-text)]'}`}>
                                    {t.transaction_type === 'IN' ? '+' : '-'}{t.quantity}
                                    <span className="text-xs font-bold text-[var(--t-text3)] ml-1 uppercase">{t.unit_name}</span>
                                </div>
                            </div>
                        </div>

                        {(t.supplier_name || t.room_name || t.funding_source_name || t.purpose || t.notes) && (
                            <div className="bg-[var(--t-surface2)] rounded-xl p-3 space-y-2">
                                {t.supplier_name && (
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-[var(--t-text2)]">
                                        <span className="text-[var(--t-text3)] uppercase tracking-tight">Supplier:</span>
                                        <span>{t.supplier_name}</span>
                                    </div>
                                )}
                                {t.room_name && (
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-[var(--t-text2)]">
                                        <span className="text-[var(--t-text3)] uppercase tracking-tight">Room:</span>
                                        <span>{t.room_name}</span>
                                    </div>
                                )}
                                {t.purpose && (
                                    <div className="flex items-start gap-2 text-[10px] font-bold text-[var(--t-text2)]">
                                        <span className="text-[var(--t-text3)] uppercase tracking-tight whitespace-nowrap">Purpose:</span>
                                        <span className="italic">"{t.purpose}"</span>
                                    </div>
                                )}
                                {t.notes && (
                                    <div className="flex items-start gap-2 text-[10px] font-bold text-[var(--t-text3)]">
                                        <span className="uppercase tracking-tight whitespace-nowrap">Notes:</span>
                                        <span className="italic">{t.notes}</span>
                                    </div>
                                )}
                                {t.funding_source_name && (
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-[var(--t-primary)]">
                                        <span className="text-[var(--t-primary)] uppercase tracking-tight">Paid via:</span>
                                        <span>{t.funding_source_name}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex gap-2">
                            {t.expense && (
                                <button
                                    onClick={() => {
                                        setSelectedExpenseId(t.expense);
                                        setIsDetailModalOpen(true);
                                    }}
                                    className="flex-1 py-2.5 bg-[var(--t-nav-active-bg)] text-[var(--t-nav-active-text)] rounded-xl text-xs font-bold active:scale-95 transition-all"
                                >
                                    View Bill
                                </button>
                            )}
                            <button
                                onClick={() => handleDelete(t.id)}
                                className="flex-1 py-2.5 bg-[var(--t-danger)]/10 text-[var(--t-danger)] rounded-xl text-xs font-bold active:scale-95 transition-all"
                            >
                                Void Entry
                            </button>
                        </div>
                    </div>
                ))}
                {filteredTransactions.length === 0 && (
                    <div className="py-10 text-center text-[var(--t-text3)] italic bg-[var(--t-surface)] rounded-2xl border-2 border-dashed border-[var(--t-border)]">
                        No transactions found matching your search.
                    </div>
                )}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Register Stock Movement">
                <form onSubmit={handleSubmit} className="p-1 space-y-4">
                    {/* Primary Selection: Material & Type */}
                    <div className="p-4 bg-[var(--t-primary)]/5 rounded-2xl border border-[var(--t-primary)]/10">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-[var(--t-primary)] uppercase tracking-widest mb-1.5">Material</label>
                                <select
                                    value={formData.material || ''}
                                    onChange={e => setFormData({ ...formData, material: e.target.value })}
                                    className="w-full rounded-xl border-[var(--t-border)] shadow-sm focus:ring-2 focus:ring-[var(--t-primary)] p-2.5 border outline-none bg-[var(--t-surface)] font-bold text-[var(--t-text2)] text-sm"
                                    required
                                >
                                    <option value="">Select Material</option>
                                    {dashboardData.materials?.map(m => (
                                        <option key={m.id} value={m.id}>{m.name} (Stock: {m.current_stock} {m.unit})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-[var(--t-primary)] uppercase tracking-widest mb-1.5">Movement Type</label>
                                <select
                                    value={formData.transaction_type || 'OUT'}
                                    onChange={e => setFormData({ ...formData, transaction_type: e.target.value })}
                                    className="w-full rounded-xl border-[var(--t-border)] shadow-sm focus:ring-2 focus:ring-[var(--t-primary)] p-2.5 border outline-none bg-[var(--t-surface)] font-bold text-[var(--t-text2)] text-sm"
                                    required
                                >
                                    <option value="IN">Purchase (Stock In)</option>
                                    <option value="OUT">Consumption (Stock Usage)</option>
                                    <option value="WASTAGE">Wastage / Loss</option>
                                    <option value="RETURN">Supplier Return</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Quantity & Date */}
                    <div className="grid grid-cols-2 gap-4 px-1">
                        <div>
                            <label className="block text-xs font-bold text-[var(--t-text2)] mb-1.5 uppercase tracking-tight">Quantity</label>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.quantity || ''}
                                onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                                className="w-full rounded-xl border-[var(--t-border)] shadow-sm focus:ring-2 focus:ring-[var(--t-primary)] p-3 border outline-none font-bold text-lg text-[var(--t-text)]"
                                placeholder="0.00"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-[var(--t-text2)] mb-1.5 uppercase tracking-tight">Action Date</label>
                            <input
                                type="date"
                                value={formData.date || ''}
                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                                className="w-full rounded-xl border-[var(--t-border)] shadow-sm focus:ring-2 focus:ring-[var(--t-primary)] p-3 border outline-none text-sm font-bold"
                                required
                            />
                        </div>
                    </div>

                    {/* Context Logic (IN/RETURN vs OUT/WASTAGE) */}
                    <div className="space-y-4 px-1">
                        {/* Supplier Section for Inbound or Returns */}
                        {(formData.transaction_type === 'IN' || formData.transaction_type === 'RETURN') && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-[var(--t-text2)] mb-1.5 uppercase tracking-tight">Supplier / Vendor</label>
                                    <select
                                        value={formData.supplier || ''}
                                        onChange={e => setFormData({ ...formData, supplier: e.target.value })}
                                        className="w-full rounded-xl border-[var(--t-border)] shadow-sm focus:ring-2 focus:ring-[var(--t-primary)] p-3 border outline-none bg-[var(--t-surface)] text-sm"
                                        required={formData.transaction_type === 'IN'}
                                    >
                                        <option value="">Select Supplier</option>
                                        {dashboardData.suppliers?.map(s => (
                                            <option key={s.id} value={s.id}>{s.name} ({s.category})</option>
                                        ))}
                                    </select>
                                </div>
                                {formData.transaction_type === 'IN' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-[var(--t-text2)] mb-1.5 uppercase tracking-tight">Unit Price (Rs.)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={formData.unit_price || ''}
                                                onChange={e => setFormData({ ...formData, unit_price: e.target.value })}
                                                className="w-full rounded-xl border-[var(--t-border)] shadow-sm focus:ring-2 focus:ring-[var(--t-primary)] p-3 border outline-none font-bold text-[var(--t-primary)]"
                                                placeholder="0.00"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-[var(--t-text2)] mb-1.5 uppercase tracking-tight">Funding Source</label>
                                            <select
                                                value={formData.funding_source || ''}
                                                onChange={e => setFormData({ ...formData, funding_source: e.target.value })}
                                                className="w-full rounded-xl border-[var(--t-border)] shadow-sm focus:ring-2 focus:ring-[var(--t-primary)] p-3 border outline-none bg-[var(--t-surface)] font-bold text-[var(--t-primary)] text-sm"
                                                required
                                            >
                                                <option value="">Select Account</option>
                                                {dashboardData.funding?.map(f => (
                                                    <option key={f.id} value={f.id}>{f.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Usage/Wastage Section (Room/Phase) */}
                        {(formData.transaction_type === 'OUT' || formData.transaction_type === 'WASTAGE') && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-[var(--t-text2)] mb-1.5 uppercase tracking-tight">Room / Area</label>
                                    <select
                                        value={formData.room || ''}
                                        onChange={e => setFormData({ ...formData, room: e.target.value })}
                                        className="w-full rounded-xl border-[var(--t-border)] shadow-sm focus:ring-2 focus:ring-[var(--t-primary)] p-3 border outline-none bg-[var(--t-surface)] text-sm"
                                    >
                                        <option value="">General Site Usage</option>
                                        {dashboardData.rooms?.map(r => (
                                            <option key={r.id} value={r.id}>{r.name} ({r.floor_name})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-[var(--t-text2)] mb-1.5 uppercase tracking-tight">Phase</label>
                                    <select
                                        value={formData.phase || ''}
                                        onChange={e => setFormData({ ...formData, phase: e.target.value })}
                                        className="w-full rounded-xl border-[var(--t-border)] shadow-sm focus:ring-2 focus:ring-[var(--t-primary)] p-3 border outline-none bg-[var(--t-surface)] text-sm"
                                    >
                                        <option value="">No Specific Phase</option>
                                        {dashboardData.phases?.map(p => (
                                            <option key={p.id} value={p.id}>{p.name} (Phase {p.order})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Common Description Section */}
                    <div className="px-1 space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-[var(--t-text2)] mb-1.5 uppercase tracking-tight">
                                {formData.transaction_type === 'WASTAGE' ? 'Reason for Wastage' : 
                                 formData.transaction_type === 'RETURN' ? 'Reason for Return' : 
                                 'Purpose / Specific Location'}
                            </label>
                            <input
                                type="text"
                                value={formData.purpose || ''}
                                onChange={e => setFormData({ ...formData, purpose: e.target.value })}
                                className="w-full rounded-xl border-[var(--t-border)] shadow-sm focus:ring-2 focus:ring-[var(--t-primary)] p-3 border outline-none text-sm font-medium"
                                placeholder={formData.transaction_type === 'WASTAGE' ? "e.g. Broken while unloading" : "e.g. Ground Floor Slab Casting"}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-[var(--t-text2)] mb-1.5 uppercase tracking-tight">Additional Notes</label>
                            <textarea
                                value={formData.notes || ''}
                                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                className="w-full rounded-xl border-[var(--t-border)] shadow-sm focus:ring-2 focus:ring-[var(--t-primary)] p-3 border outline-none h-20 text-sm"
                                placeholder="Any extra details..."
                            />
                        </div>
                    </div>

                    {/* Settings */}
                    {formData.transaction_type === 'IN' && (
                        <div className="flex items-center gap-3 bg-[var(--t-surface2)] p-4 rounded-2xl mx-1">
                            <input
                                type="checkbox"
                                id="create_expense"
                                checked={formData.create_expense !== false}
                                onChange={e => setFormData({ ...formData, create_expense: e.target.checked })}
                                className="w-4 h-4 rounded text-[var(--t-primary)] border-[var(--t-border)] focus:ring-[var(--t-primary)]"
                            />
                            <label htmlFor="create_expense" className="text-xs font-bold text-[var(--t-text2)] select-none">
                                Register this purchase as an Expense (Auto-generate bill)
                            </label>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4 border-t border-[var(--t-border)] mt-6">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-sm font-bold text-[var(--t-text2)] hover:text-[var(--t-primary)] transition-colors">Cancel</button>
                        <button 
                            type="submit" 
                            disabled={loading || !formData.material} 
                            className="px-8 py-2.5 bg-[var(--t-primary)] text-[var(--t-bg)] rounded-xl font-bold shadow-lg shadow-[var(--t-primary)]/20 hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-2"
                        >
                            {loading ? (
                                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> Recording...</>
                            ) : (
                                'Register Movement'
                            )}
                        </button>
                    </div>
                </form>
            </Modal>


            <ExpenseDetailModal
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                expenseId={selectedExpenseId}
            />

            <ConfirmModal 
                isOpen={confirmConfig.isOpen}
                title={confirmConfig.title}
                message={confirmConfig.message}
                confirmText={confirmConfig.confirmText}
                onConfirm={confirmConfig.onConfirm}
                onCancel={closeConfirm}
                type={confirmConfig.type || 'warning'}
            />
        </div >
    );
};
export default StockTab;
