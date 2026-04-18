import React, { useState } from 'react';
import { dashboardService } from '../../services/api';
import Modal from '../common/Modal';
import { useConstruction } from '../../context/ConstructionContext';
import ExpenseDetailModal from '../common/ExpenseDetailModal';
import ConfirmModal from '../common/ConfirmModal';

const MobileStockList = ({ searchQuery = '' }) => {
    const { dashboardData, refreshData } = useConstruction();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({ transaction_type: 'IN', quantity: '', purpose: '' });
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedExpenseId, setSelectedExpenseId] = useState(null);
    const [receiptFile, setReceiptFile] = useState(null);
    const [receiptPreview, setReceiptPreview] = useState(null);

    // Confirmation Modal System
    const [confirmConfig, setConfirmConfig] = useState({ isOpen: false });
    const [sortBy, setSortBy] = useState('date_desc');
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
        setReceiptFile(null);
        setReceiptPreview(null);
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

    const handleReceiptChange = (file) => {
        if (!file) return;
        setReceiptFile(file);
        const reader = new FileReader();
        reader.onloadend = () => setReceiptPreview(reader.result);
        reader.readAsDataURL(file);
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
            if (receiptFile) dataToSubmit.receipt_image = receiptFile;

            if (editingItem) await dashboardService.updateMaterialTransaction(editingItem.id, dataToSubmit);
            else await dashboardService.createMaterialTransaction(dataToSubmit);

            setReceiptFile(null);
            setReceiptPreview(null);
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

            <div className="space-y-2 pb-[120px]">
                {sortedTransactions.length === 0 && (
                    <div className="text-center py-14 text-[var(--t-text3)]">
                        <div className="text-3xl mb-2">📋</div>
                        <p className="text-sm font-semibold">No transactions found</p>
                    </div>
                )}
                {sortedTransactions.map(t => {
                    const isIncoming = t.transaction_type === 'IN' || t.transaction_type === 'RETURN';
                    const sign = isIncoming ? '+' : '-';

                    return (
                        <div key={t.id}
                            onClick={() => { if (t.expense) { setSelectedExpenseId(t.expense); setIsDetailModalOpen(true); } }}
                            className="bg-[var(--t-surface)] border-b border-[var(--t-border)] p-3 flex items-center justify-between hover:bg-[var(--t-surface2)] active:bg-[var(--t-surface2)] cursor-pointer transition-colors"
                        >
                            {/* Left: Info */}
                            <div className="flex flex-col min-w-0 pr-3">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-[14px] text-[var(--t-text)] truncate">{t.material_name}</span>
                                    <span className={`text-[9px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded leading-none border ${getTypeColor(t.transaction_type)}`}>
                                        {t.transaction_type}
                                    </span>
                                    {t.receipt_image_url && (
                                        <a
                                            href={t.receipt_image_url}
                                            target="_blank"
                                            rel="noreferrer"
                                            onClick={e => e.stopPropagation()}
                                            className="text-[9px] font-black text-orange-400 uppercase bg-orange-400/10 px-1.5 py-0.5 rounded leading-none border border-orange-400/20"
                                        >
                                            📎
                                        </a>
                                    )}
                                </div>
                                <span className="text-[11px] text-[var(--t-text3)] truncate mt-0.5">
                                    {new Date(t.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                            </div>

                            {/* Right: Quantity */}
                            <div className="flex items-center gap-3 shrink-0">
                                <div className="text-right flex flex-col justify-center">
                                    <span className={`font-black text-[16px] leading-none ${isIncoming ? 'text-emerald-500' : 'text-[var(--t-danger)]'}`}>
                                        {sign}{t.quantity}
                                    </span>
                                    <span className="text-[9px] uppercase font-bold text-[var(--t-text3)] mt-[2px]">
                                        {t.unit_name}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            
            {/* Add New FAB */}
            <div className="fixed bottom-24 right-4 z-10">
                <button
                    onClick={() => handleOpenModal()}
                    className="w-14 h-14 bg-[var(--t-primary)] text-[var(--t-bg)] rounded-full flex items-center justify-center shadow-[0_8px_16px_rgba(0,0,0,0.3)] hover:scale-105 active:scale-95 transition-all outline-none"
                    style={{ boxShadow: '0 8px 16px color-mix(in srgb, var(--t-primary) 40%, transparent)' }}
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                </button>
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
                                                {dashboardData.funding?.filter(f => (parseFloat(formData.quantity || 0) * parseFloat(formData.unit_price || 0)) <= parseFloat(f.current_balance || 0)).map(f => (
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

                    {/* Receipt / Challan Upload */}
                    <div className="px-1">
                        <label className="block text-xs font-bold text-[var(--t-text2)] mb-2 uppercase tracking-tight">
                            Receipt / Challan Photo
                            <span className="ml-1.5 text-[10px] font-medium text-[var(--t-text3)] normal-case tracking-normal">(optional)</span>
                        </label>
                        <label
                            htmlFor="mob_receipt_upload"
                            onDragOver={e => e.preventDefault()}
                            onDrop={e => { e.preventDefault(); handleReceiptChange(e.dataTransfer.files[0]); }}
                            className="flex flex-col items-center justify-center gap-2 w-full rounded-2xl border-2 border-dashed border-[var(--t-border)] bg-[var(--t-surface2)] p-5 cursor-pointer hover:border-[var(--t-primary)] hover:bg-[var(--t-primary)]/5 transition-all group"
                        >
                            {receiptPreview ? (
                                <div className="relative w-full">
                                    <img src={receiptPreview} alt="Receipt preview" className="w-full max-h-36 object-contain rounded-xl" />
                                    <button
                                        type="button"
                                        onClick={e => { e.preventDefault(); setReceiptFile(null); setReceiptPreview(null); }}
                                        className="absolute top-1 right-1 bg-[var(--t-danger)] text-white text-[10px] font-black px-2 py-0.5 rounded-lg"
                                    >
                                        Remove
                                    </button>
                                    <p className="text-center text-[10px] text-[var(--t-text3)] mt-2 font-medium truncate">{receiptFile?.name}</p>
                                </div>
                            ) : (
                                <>
                                    <div className="w-10 h-10 rounded-full bg-[var(--t-primary)]/10 flex items-center justify-center group-hover:bg-[var(--t-primary)]/20 transition-colors">
                                        <svg className="w-5 h-5 text-[var(--t-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xs font-bold text-[var(--t-text2)] group-hover:text-[var(--t-primary)] transition-colors">Tap to attach receipt</p>
                                        <p className="text-[10px] text-[var(--t-text3)] mt-0.5">JPG, PNG, PDF up to 10MB</p>
                                    </div>
                                </>
                            )}
                            <input
                                id="mob_receipt_upload"
                                type="file"
                                accept="image/*,application/pdf"
                                className="hidden"
                                onChange={e => handleReceiptChange(e.target.files[0])}
                            />
                        </label>
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
export default MobileStockList;
