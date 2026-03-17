import React, { useState } from 'react';
import { dashboardService } from '../../../services/api';
import Modal from '../../common/Modal';
import SuccessModal from '../../common/SuccessModal';
import { useConstruction } from '../../../context/ConstructionContext';

const MaterialsTab = ({ searchQuery = '' }) => {
    const { dashboardData, refreshData, formatCurrency } = useConstruction();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({});
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(null);
    const [showLowStockOnly, setShowLowStockOnly] = useState(false);
    const [sortBy, setSortBy] = useState('name'); // 'name', 'stock_asc', 'stock_desc'
    const [emailModalOpen, setEmailModalOpen] = useState(false);
    const [selectedMaterial, setSelectedMaterial] = useState(null);
    const [selectedSupplier, setSelectedSupplier] = useState(null);
    const [emailQuantity, setEmailQuantity] = useState('');
    const [emailSubject, setEmailSubject] = useState('');
    const [emailBody, setEmailBody] = useState('');
    const [successModalInfo, setSuccessModalInfo] = useState({ isOpen: false, title: '', message: '', supplierName: '' });

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

    const handleDelete = async (id) => {
        if (!window.confirm(`Are you sure you want to delete this Material?`)) return;
        try {
            await dashboardService.deleteMaterial(id);
            refreshData();
        } catch (error) {
            alert("Delete failed.");
        }
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

    const handleAuditAll = async () => {
        if (window.confirm("Audit all stock levels from transaction history?")) {
            setActionLoading('ALL');
            try {
                await dashboardService.recalculateAllMaterialsStock();
                refreshData();
            } catch (error) {
                alert("Bulk audit failed.");
            } finally {
                setActionLoading(null);
            }
        }
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

    const handleReceiveOrder = async (transactionId) => {
        if (!window.confirm('Confirm receipt of these materials? This will add them to stock and create an expense.')) return;

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
        } catch (error) {
            const errorMsg = error.response?.data?.error || 'Failed to confirm receipt';
            alert(`❌ ${errorMsg}`);
        } finally {
            setActionLoading(null);
        }
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
                <button
                    onClick={() => handleOpenModal()}
                    className="w-full md:w-auto px-6 py-2 bg-[var(--t-primary)] text-[var(--t-bg)] rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-lg shadow-[var(--t-primary)]/20"
                >
                    + Add New Material
                </button>
            </div>

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

            <div className="bg-[var(--t-surface)] rounded-3xl border border-[var(--t-border)] shadow-xl overflow-hidden">
                {/* Desktop View: Table */}
                <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-[var(--t-surface2)] text-[10px] font-black uppercase text-[var(--t-text3)] tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Material (सामाग्री)</th>
                                <th className="px-6 py-4">Status / Alert</th>
                                <th className="px-6 py-4 text-center">Current Stock</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--t-border)]">
                            {sortedMaterials.map(m => {
                                const isLow = Number(m.current_stock) <= Number(m.min_stock_level);
                                const pendingQty = pendingStockMap[m.id] || 0;

                                return (
                                    <tr key={m.id} className="hover:bg-[var(--t-surface2)]/80 transition-all duration-200 group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-[var(--t-nav-active-bg)] flex items-center justify-center text-xl font-bold text-[var(--t-primary)] overflow-hidden shrink-0 border border-[var(--t-primary)]/10">
                                                    {m.image ? (
                                                        <img src={m.image} alt={m.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        m.name.charAt(0)
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-[var(--t-text)] text-sm flex items-center gap-2">
                                                        {m.name}
                                                        {pendingQty > 0 && (
                                                            <span className="bg-orange-500/10 text-orange-500 text-[8px] px-1.5 py-0.5 rounded-full border border-orange-500/20 animate-pulse">
                                                                🚛 INCOMING: {pendingQty}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-[10px] uppercase font-black text-[var(--t-text3)] flex items-center gap-2">
                                                        <span>{m.category_name || 'General'}</span>
                                                        <span className="w-1 h-1 bg-[var(--t-border)] rounded-full" />
                                                        <span>{m.unit}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-2">
                                                {isLow && (
                                                    <span className="bg-[var(--t-danger)]/10 text-[var(--t-danger)] text-[9px] font-black px-2 py-0.5 rounded-full border border-[var(--t-danger)]/20 flex items-center gap-1 uppercase">
                                                        <span className="w-1 h-1 bg-[var(--t-danger)] rounded-full animate-ping" />
                                                        Low Stock Alert
                                                    </span>
                                                )}
                                                <span className="bg-[var(--t-surface2)] text-[var(--t-text2)] text-[9px] font-bold px-2 py-0.5 rounded-full border border-[var(--t-border)] uppercase">
                                                    Min: {m.min_stock_level}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-center">
                                                <div className={`text-sm font-black ${isLow ? 'text-[var(--t-danger)]' : 'text-[var(--t-text)]'}`}>
                                                    {m.current_stock}
                                                    <span className="text-[10px] font-bold text-[var(--t-text3)] ml-1 uppercase">{m.unit}</span>
                                                </div>
                                                {pendingQty > 0 && (
                                                    <div className="text-[9px] font-bold text-orange-500 mt-0.5 whitespace-nowrap">
                                                        + {pendingQty} Expected
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-3">
                                            <button
                                                onClick={() => handleOpenEmailModal(m)}
                                                disabled={actionLoading === `email_${m.id}`}
                                                className={`font-extrabold text-[9px] uppercase transition-all px-2 py-1 rounded border ${actionLoading === `email_${m.id}`
                                                    ? 'bg-[var(--t-surface3)] text-[var(--t-text3)] border-[var(--t-border)]'
                                                    : 'text-[var(--t-primary)] hover:opacity-80 border-[var(--t-primary)]/20 hover:border-[var(--t-primary)]/30 bg-[var(--t-primary)]/5'
                                                    }`}
                                                title="Order from Supplier"
                                            >
                                                {actionLoading === `email_${m.id}` ? '📧 Sending...' : '📧 Order'}
                                            </button>
                                            <button
                                                onClick={() => handleRecalculate(m.id)}
                                                disabled={actionLoading === m.id}
                                                className={`font-extrabold text-[9px] uppercase transition-all px-1.5 py-0.5 rounded border ${actionLoading === m.id
                                                    ? 'bg-[var(--t-surface3)] text-[var(--t-text3)] border-[var(--t-border)]'
                                                    : 'text-[var(--t-text3)] hover:text-[var(--t-primary)] hover:bg-[var(--t-nav-active-bg)] border-transparent hover:border-[var(--t-border)]'
                                                    }`}
                                                title="Audit Stock"
                                            >
                                                {actionLoading === m.id ? 'Auditing...' : 'Audit Stock'}
                                            </button>
                                            <button onClick={() => handleOpenModal(m)} className="text-[var(--t-primary)] hover:text-[var(--t-primary)] font-bold text-[10px] uppercase tracking-wider">Edit</button>
                                            <button onClick={() => handleDelete(m.id)} className="text-[var(--t-danger)] hover:opacity-70 font-bold text-[10px] uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">Delete</button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Mobile View: Cards */}
                <div className="lg:hidden p-4 space-y-4">
                    {sortedMaterials.map(m => {
                        const isLow = Number(m.current_stock) <= Number(m.min_stock_level);
                        const pendingQty = pendingStockMap[m.id] || 0;

                        return (
                            <div key={m.id} className="bg-[var(--t-surface2)]/50 rounded-2xl p-4 border border-[var(--t-border)]">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-xl bg-[var(--t-surface)] border border-[var(--t-border)] flex items-center justify-center text-xl font-bold text-[var(--t-primary)] overflow-hidden shadow-sm">
                                            {m.image ? (
                                                <img src={m.image} alt={m.name} className="w-full h-full object-cover" />
                                            ) : (
                                                m.name.charAt(0)
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-[var(--t-text)] text-base leading-tight">
                                                {m.name}
                                            </h3>
                                            <div className="text-[10px] font-black text-[var(--t-primary)] uppercase tracking-widest mt-0.5">
                                                {m.category_name}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[10px] font-black text-[var(--t-text3)] uppercase tracking-widest mb-1">Available</div>
                                        <div className={`text-lg font-black leading-none ${isLow ? 'text-[var(--t-danger)]' : 'text-[var(--t-text)]'}`}>
                                            {m.current_stock}
                                            <span className="text-xs font-bold text-[var(--t-text3)] ml-1">{m.unit}</span>
                                        </div>
                                    </div>
                                </div>

                                {(isLow || pendingQty > 0) && (
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {isLow && (
                                            <span className="bg-[var(--t-danger)]/10 text-[var(--t-danger)] text-[9px] font-black px-2 py-1 rounded-lg border border-[var(--t-danger)]/20 uppercase tracking-tight">
                                                Low Stock Alert
                                            </span>
                                        )}
                                        {pendingQty > 0 && (
                                            <span className="bg-orange-500/10 text-orange-500 text-[9px] font-black px-2 py-1 rounded-lg border border-orange-500/20 uppercase tracking-tight">
                                                🚛 {pendingQty} INCOMING
                                            </span>
                                        )}
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-[var(--t-border)]">
                                    <button
                                        onClick={() => handleOpenEmailModal(m)}
                                        className="py-2.5 bg-[var(--t-primary)] text-[var(--t-bg)] rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-sm flex items-center justify-center gap-1.5"
                                    >
                                        📧 Order
                                    </button>
                                    <button
                                        onClick={() => handleRecalculate(m.id)}
                                        className="py-2.5 bg-[var(--t-nav-active-bg)] text-[var(--t-nav-active-text)] rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-1.5"
                                    >
                                        Audit Stock
                                    </button>
                                    <button
                                        onClick={() => handleOpenModal(m)}
                                        className="py-2.5 bg-[var(--t-surface2)] text-[var(--t-text2)] rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-1.5"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(m.id)}
                                        className="py-2.5 bg-[var(--t-danger)]/10 text-[var(--t-danger)] rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-1.5"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
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
        </div>
    );
};

export default MaterialsTab;
