import React, { useState } from 'react';
import { dashboardService } from '../../services/api';
import Modal from '../common/Modal';
import { useConstruction } from '../../context/ConstructionContext';
import SuccessModal from '../common/SuccessModal';
import WastageAlertPanel from '../common/WastageAlertPanel';
import ConfirmModal from '../common/ConfirmModal';

const MobileMaterialList = ({ searchQuery = '' }) => {
    const { dashboardData, refreshData, formatCurrency } = useConstruction();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({});
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(null);
    const [showLowStockOnly, setShowLowStockOnly] = useState(false);
    const [sortBy, setSortBy] = useState('name');
    const [view, setView] = useState('list'); // 'list' | 'wastage'
    const [emailModalOpen, setEmailModalOpen] = useState(false);
    const [selectedMaterial, setSelectedMaterial] = useState(null);
    const [selectedSupplier, setSelectedSupplier] = useState(null);
    const [emailQuantity, setEmailQuantity] = useState('');
    const [emailSubject, setEmailSubject] = useState('');
    const [emailBody, setEmailBody] = useState('');
    const [successModalInfo, setSuccessModalInfo] = useState({ isOpen: false, title: '', message: '', supplierName: '' });
    const [expandedId, setExpandedId] = useState(null);

    // Confirmation Modal System
    const [confirmConfig, setConfirmConfig] = useState({ isOpen: false });
    const showConfirm = (config) => setConfirmConfig({ ...config, isOpen: true });
    const closeConfirm = () => setConfirmConfig({ ...confirmConfig, isOpen: false });

    const filteredMaterials = (dashboardData.materials || []).filter(m => {
        const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            m.category_name?.toLowerCase().includes(searchQuery.toLowerCase());

        if (showLowStockOnly) {
            const isLow = Number(m.current_stock) <= Number(m.min_stock_level);
            return matchesSearch && isLow;
        }
        return matchesSearch;
    });

    // Apply Sorting
    const sortedMaterials = [...filteredMaterials].sort((a, b) => {
        if (sortBy === 'name') {
            return a.name.localeCompare(b.name);
        } else if (sortBy === 'stock_asc') {
            return Number(a.current_stock) - Number(b.current_stock);
        } else if (sortBy === 'stock_desc') {
            return Number(b.current_stock) - Number(a.current_stock);
        }
        return 0;
    });

    const handleOpenModal = (item = null) => {
        setEditingItem(item);
        if (item) {
            setFormData(item);
        } else {
            setFormData({ unit: 'BORA', min_stock_level: 0 });
        }
        setIsModalOpen(true);
    };

    const handleDelete = (id) => {
        showConfirm({
            title: "Delete Material?",
            message: "Are you sure you want to permanently remove this material from the system? This will affect your stock history and procurement records. This action is irreversible.",
            confirmText: "Yes, Delete Material",
            type: "danger",
            onConfirm: async () => {
                try {
                    await dashboardService.deleteMaterial(id);
                    refreshData();
                    closeConfirm();
                } catch (error) {
                    alert("Delete failed.");
                    closeConfirm();
                }
            }
        });
    };

    const handleRecalculate = async (id) => {
        setActionLoading(id);
        try {
            await dashboardService.recalculateMaterialStock(id);
            refreshData();
        } catch (error) {
            alert("Recalculation failed.");
        } finally {
            setActionLoading(null);
        }
    };

    const handleAuditAll = () => {
        showConfirm({
            title: "Audit All Stock?",
            message: "Are you sure you want to audit all stock levels? This will recalculate the current inventory by processing the entire transaction history from day one. This might take a moment.",
            confirmText: "Yes, Start Audit",
            type: "warning",
            onConfirm: async () => {
                setActionLoading('ALL');
                try {
                    await dashboardService.recalculateAllMaterialsStock();
                    refreshData();
                    closeConfirm();
                } catch (error) {
                    alert("Bulk audit failed.");
                    closeConfirm();
                } finally {
                    setActionLoading(null);
                }
            }
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (editingItem) await dashboardService.updateMaterial(editingItem.id, formData);
            else await dashboardService.createMaterial(formData);
            setIsModalOpen(false);
            refreshData();
        } catch (error) {
            alert("Save failed.");
        } finally {
            setLoading(false);
        }
    };

    const handleOpenEmailModal = (material) => {
        setSelectedMaterial(material);
        setSelectedSupplier(material.supplier || null);
        setEmailQuantity(material.min_stock_level || '10');
        setEmailSubject(`Purchase Order: ${material.name} - Dream Home Construction`);
        setEmailBody(`Please confirm availability and provide a quote for ${material.name}. We need this for our ongoing construction project.`);
        setEmailModalOpen(true);
    };

    const handleSendEmail = async () => {
        if (!selectedMaterial || !selectedSupplier) {
            alert('❌ Please select a supplier');
            return;
        }
        setActionLoading(`email_${selectedMaterial.id}`);
        try {
            const response = await dashboardService.emailSupplier(
                selectedMaterial.id,
                emailQuantity,
                selectedSupplier,
                emailSubject,
                emailBody
            );
            setEmailModalOpen(false);
            setSuccessModalInfo({
                isOpen: true,
                title: 'Order Sent Successfully! 📧',
                message: response.message,
                supplierName: response.supplier
            });
            setSelectedSupplier(null);
            refreshData();
        } catch (error) {
            const errorMsg = error.response?.data?.error || 'Failed to send email';
            alert(`❌ ${errorMsg}`);
        } finally {
            setActionLoading(null);
        }
    };

    const handleReceiveOrder = (transactionId) => {
        showConfirm({
            title: "Confirm Material Receipt?",
            message: "Are you sure these materials have arrived on site? Confirming will add the quantity to your available stock and finalize the associated financial expense.",
            confirmText: "Yes, Confirm Receipt",
            type: "warning",
            onConfirm: async () => {
                setActionLoading(`receive_${transactionId}`);
                try {
                    const response = await dashboardService.receiveMaterialOrder(transactionId);
                    setSuccessModalInfo({
                        isOpen: true,
                        title: 'Stock Updated! 📦',
                        message: response.message,
                        supplierName: response.supplier
                    });
                    refreshData();
                    closeConfirm();
                } catch (error) {
                    const errorMsg = error.response?.data?.error || 'Failed to confirm receipt';
                    alert(`❌ ${errorMsg}`);
                    closeConfirm();
                } finally {
                    setActionLoading(null);
                }
            }
        });
    };

    const pendingTransactions = (dashboardData.transactions || []).filter(t => t.status === 'PENDING');

    const pendingStockMap = pendingTransactions.reduce((acc, t) => {
        acc[t.material] = (acc[t.material] || 0) + Number(t.quantity);
        return acc;
    }, {});

    return (
        <div className="space-y-4">
            {/* Controls Bar */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-6">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <button
                        onClick={() => setShowLowStockOnly(!showLowStockOnly)}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 border shadow-sm ${showLowStockOnly
                            ? 'bg-[var(--t-danger)]/10 border-[var(--t-danger)]/30 text-[var(--t-danger)] ring-2 ring-[var(--t-danger)]/20'
                            : 'bg-[var(--t-surface)] border-[var(--t-border)] text-[var(--t-text2)] hover:bg-[var(--t-surface2)]'
                            }`}
                    >
                        <span className={`w-2 h-2 rounded-full ${showLowStockOnly ? 'bg-[var(--t-danger)] animate-pulse' : 'bg-[var(--t-border)]'}`}></span>
                        Low Stock Only
                    </button>
                    <button
                        onClick={handleAuditAll}
                        disabled={actionLoading === 'ALL'}
                        className="px-4 py-2 bg-[var(--t-surface)] border border-[var(--t-border)] text-[var(--t-primary)] rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[var(--t-nav-active-bg)] transition-all shadow-sm flex items-center gap-2"
                    >
                        {actionLoading === 'ALL' ? 'Auditing...' : 'Audit All Stock'}
                    </button>

                    {/* Sort Dropdown */}
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-black text-[var(--t-text3)] hidden md:block">Sort:</span>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="bg-[var(--t-surface)] border border-[var(--t-border)] text-[var(--t-text2)] text-xs font-bold rounded-xl px-3 py-2 outline-none shadow-sm focus:ring-2 focus:ring-[var(--t-primary)]"
                        >
                            <option value="name">Name (A-Z)</option>
                            <option value="stock_asc">Stock (Lowest First)</option>
                            <option value="stock_desc">Stock (Highest First)</option>
                        </select>
                    </div>

                </div>
            {/* View Toggle */}
            <div className="flex gap-2">
                <button
                    onClick={() => setView('list')}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all border shadow-sm ${
                        view === 'list'
                        ? 'bg-[var(--t-primary)] text-[var(--t-bg)] border-[var(--t-primary)]'
                        : 'bg-[var(--t-surface)] border-[var(--t-border)] text-[var(--t-text2)] hover:bg-[var(--t-surface2)]'
                    }`}
                >
                    📦 Materials List
                </button>
                <button
                    onClick={() => setView('wastage')}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all border shadow-sm flex items-center gap-2 ${
                        view === 'wastage'
                        ? 'bg-[var(--t-danger)] text-white border-[var(--t-danger)]'
                        : 'bg-[var(--t-surface)] border-[var(--t-border)] text-[var(--t-text2)] hover:bg-[var(--t-surface2)]'
                    }`}
                >
                    <span className={view === 'wastage' ? 'animate-pulse' : ''}>⚠️</span>
                    Wastage Tracker
                </button>
            </div>

            <button
                    onClick={() => handleOpenModal()}
                    className="w-full md:w-auto px-6 py-2 bg-[var(--t-primary)] text-[var(--t-bg)] rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-lg shadow-[var(--t-primary)]/20"
                >
                    + Add New Material
                </button>
            </div>

            {/* ── Wastage Tracker View ── */}
            {view === 'wastage' && (
                <WastageAlertPanel />
            )}

            {/* ── Normal Materials List View ── */}
            {view === 'list' && <>

            {/* Pending Orders Section */}
            {pendingTransactions.length > 0 && (

                <div className="mb-8 overflow-hidden rounded-2xl border border-orange-500/20 bg-orange-500/5">
                    <div className="bg-orange-500/10 px-6 py-3 flex justify-between items-center border-b border-orange-500/20">
                        <div className="flex items-center gap-2">
                            <span className="text-xl">🚛</span>
                            <h3 className="text-sm font-bold text-orange-500 uppercase tracking-wider">Pending Orders (In-Transit)</h3>
                        </div>
                        <span className="bg-orange-500/20 text-orange-500 px-2 py-0.5 rounded-full text-[10px] font-black uppercase">
                            {pendingTransactions.length} Pending
                        </span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-orange-500/10 text-[10px] font-black uppercase text-orange-400 border-b border-orange-500/20">
                                <tr>
                                    <th className="px-6 py-3">Material</th>
                                    <th className="px-6 py-3">Supplier</th>
                                    <th className="px-6 py-3">Qty Ordered</th>
                                    <th className="px-6 py-3">Order Date</th>
                                    <th className="px-6 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-orange-500/10">
                                {pendingTransactions.map(t => (
                                    <tr key={t.id} className="hover:bg-orange-500/10 transition-colors">
                                        <td className="px-6 py-4 font-bold text-[var(--t-text)] text-sm">{t.material_name}</td>
                                        <td className="px-6 py-4 text-xs font-semibold text-[var(--t-text2)]">{t.supplier_name}</td>
                                        <td className="px-6 py-4 text-sm">
                                            <span className="font-black text-orange-500">{t.quantity}</span>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-[var(--t-text2)] font-mono">{t.date}</td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleReceiveOrder(t.id)}
                                                disabled={actionLoading === `receive_${t.id}`}
                                                className="bg-[var(--t-primary)] text-[var(--t-bg)] text-[10px] font-black uppercase px-3 py-1.5 rounded-lg shadow-sm transition-all flex items-center gap-2 ml-auto hover:opacity-90"
                                            >
                                                {actionLoading === `receive_${t.id}` ? '⌛ Processing...' : (
                                                    <><span className="text-xs">📦</span> Confirm Received</>
                                                )}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <div className="space-y-2 pb-[120px]">
                {sortedMaterials.length === 0 && (
                    <div className="text-center py-14 text-[var(--t-text3)]">
                        <div className="text-3xl mb-2">🧱</div>
                        <p className="text-sm font-semibold">No materials found</p>
                    </div>
                )}
                {sortedMaterials.map(m => {
                    const isLow = Number(m.current_stock) <= Number(m.min_stock_level);
                    const pendingQty = pendingStockMap[m.id] || 0;

                    return (
                        <div key={m.id} 
                            onClick={() => handleOpenModal(m)}
                            className="bg-[var(--t-surface)] border-b border-[var(--t-border)] p-3 flex items-center justify-between hover:bg-[var(--t-surface2)] active:bg-[var(--t-surface2)] cursor-pointer transition-colors"
                        >
                            {/* Left: Material Info */}
                            <div className="flex flex-col min-w-0 pr-3">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-[14px] text-[var(--t-text)] truncate">{m.name}</span>
                                    {isLow && <span className="text-[12px] animate-pulse">⚠️</span>}
                                    {pendingQty > 0 && <span className="text-[12px]" title="Incoming">🚚</span>}
                                </div>
                                <span className="text-[11px] text-[var(--t-text3)] truncate">{m.category_name || 'General'}</span>
                            </div>
                            
                            {/* Right: Quantity and Action inline */}
                            <div className="flex items-center gap-3 shrink-0">
                                <div className="text-right flex flex-col justify-center">
                                    <span className={`font-black text-[16px] leading-none ${isLow ? 'text-[var(--t-danger)]' : 'text-[var(--t-text)]'}`}>
                                        {m.current_stock}
                                    </span>
                                    <span className="text-[9px] uppercase font-bold text-[var(--t-text3)] mt-[2px]">{m.unit}</span>
                                </div>
                                
                                {isLow && (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleOpenEmailModal(m); }}
                                        disabled={actionLoading === `email_${m.id}`}
                                        className="h-7 px-3 text-[10px] font-bold uppercase bg-orange-500/10 text-orange-600 rounded-md border border-orange-500/20 active:scale-95 transition-all"
                                    >
                                        {actionLoading === `email_${m.id}` ? '...' : 'Order'}
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`${editingItem ? 'Edit' : 'Add'} Material`}>
                <form onSubmit={handleSubmit} className="space-y-4 p-1">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-1">
                            <label className="block text-sm font-semibold text-[var(--t-text2)] mb-1">Material Name</label>
                            <input
                                type="text"
                                value={formData.name || ''}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full rounded-xl border-[var(--t-border)] shadow-sm focus:ring-2 focus:ring-[var(--t-primary)] p-3 border outline-none"
                                required
                            />
                        </div>
                        <div className="col-span-1">
                            <label className="block text-sm font-semibold text-[var(--t-text2)] mb-1">Stocking Unit</label>
                            <select
                                value={formData.unit || 'BORA'}
                                onChange={e => setFormData({ ...formData, unit: e.target.value })}
                                className="w-full rounded-xl border-[var(--t-border)] shadow-sm focus:ring-2 focus:ring-[var(--t-primary)] p-3 border outline-none bg-[var(--t-surface)]"
                                required
                            >
                                <option value="BORA">Bora (Sack)</option>
                                <option value="TIPPER">Tipper</option>
                                <option value="KG">Kilogram (Kg)</option>
                                <option value="PCS">Pieces (Pcs)</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-8">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-sm font-bold text-[var(--t-text2)] hover:text-[var(--t-text2)]">Cancel</button>
                        <button type="submit" disabled={loading} className="px-8 py-2.5 bg-[var(--t-primary)] text-[var(--t-bg)] rounded-xl font-bold hover:opacity-90 disabled:opacity-50">
                            {loading ? 'Saving...' : (editingItem ? 'Update' : 'Create')}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Email Supplier Modal */}
            <Modal
                isOpen={emailModalOpen}
                onClose={() => setEmailModalOpen(false)}
                title={`📧 Order Material: ${selectedMaterial?.name || ''}`}
            >
                <div className="space-y-4 p-4">
                    <div className="bg-[var(--t-nav-active-bg)] border border-[var(--t-border)] rounded-xl p-4">
                        <h4 className="text-sm font-bold text-[var(--t-primary)] mb-2">Material Details</h4>
                        <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                                <span className="text-[var(--t-text2)]">Material:</span>
                                <span className="font-bold text-[var(--t-text)]">{selectedMaterial?.name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[var(--t-text2)]">Current Stock:</span>
                                <span className="font-bold text-[var(--t-danger)]">{selectedMaterial?.current_stock} {selectedMaterial?.unit}</span>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-[var(--t-text2)] mb-2">Select Supplier *</label>
                        <select
                            value={selectedSupplier || ''}
                            onChange={(e) => setSelectedSupplier(Number(e.target.value))}
                            className="w-full rounded-xl border-[var(--t-border)] shadow-sm focus:ring-2 focus:ring-[var(--t-primary)] p-3 border outline-none bg-[var(--t-surface)]"
                            required
                        >
                            <option value="">Choose a supplier...</option>
                            {(dashboardData.suppliers || [])
                                .filter(s => s.email)
                                .map(s => (
                                    <option key={s.id} value={s.id}>
                                        {s.name} ({s.email})
                                    </option>
                                ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-[var(--t-text2)] mb-2">Quantity to Order</label>
                        <input
                            type="number"
                            value={emailQuantity}
                            onChange={(e) => setEmailQuantity(e.target.value)}
                            className="w-full rounded-xl border-[var(--t-border)] shadow-sm focus:ring-2 focus:ring-[var(--t-primary)] p-3 border outline-none text-lg font-black text-center"
                            min="1"
                        />
                    </div>

                    <div className="space-y-4 pt-4 border-t border-[var(--t-border)]">
                        <h4 className="text-[10px] font-black text-[var(--t-text3)] uppercase tracking-[0.2em]">Email Composition</h4>

                        <div>
                            <label className="block text-xs font-bold text-[var(--t-text2)] mb-1">Subject</label>
                            <input
                                type="text"
                                value={emailSubject}
                                onChange={(e) => setEmailSubject(e.target.value)}
                                className="w-full rounded-lg border-[var(--t-border)] shadow-sm focus:ring-2 focus:ring-[var(--t-primary)]/20 p-2 border outline-none text-sm font-medium"
                                placeholder="Order Subject"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-[var(--t-text2)] mb-1">Message Body</label>
                            <textarea
                                value={emailBody}
                                onChange={(e) => setEmailBody(e.target.value)}
                                className="w-full rounded-lg border-[var(--t-border)] shadow-sm focus:ring-2 focus:ring-[var(--t-primary)]/20 p-3 border outline-none text-sm min-h-[120px] leading-relaxed"
                                placeholder="Write your custom message to the supplier..."
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <button type="button" onClick={() => setEmailModalOpen(false)} className="px-6 py-2.5 text-xs font-black text-[var(--t-text3)] uppercase tracking-widest">Cancel</button>
                        <button
                            onClick={handleSendEmail}
                            disabled={!emailQuantity || !selectedSupplier || actionLoading}
                            className="px-8 py-2.5 bg-[var(--t-primary)] text-[var(--t-bg)] rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-[var(--t-primary)]/20 hover:opacity-90 hover:-translate-y-0.5 transition-all flex items-center gap-2"
                        >
                            {actionLoading === `email_${selectedMaterial?.id}` ? 'Sending...' : '🚀 Send Custom Order'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Success Reinforcement Modal */}
            <SuccessModal
                isOpen={successModalInfo.isOpen}
                onClose={() => setSuccessModalInfo({ ...successModalInfo, isOpen: false })}
                title={successModalInfo.title}
                message={successModalInfo.message}
                supplierName={successModalInfo.supplierName}
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
            </> /* end list view */}
        </div>
    );
};

export default MobileMaterialList;
