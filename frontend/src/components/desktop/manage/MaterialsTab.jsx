import React, { useState } from 'react';
import { dashboardService } from '../../../services/api';
import Modal from '../../common/Modal';
import { useConstruction } from '../../../context/ConstructionContext';

const MaterialsTab = ({ searchQuery = '' }) => {
    const { dashboardData, refreshData } = useConstruction();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({});
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(null);
    const [showLowStockOnly, setShowLowStockOnly] = useState(false);
    const [emailModalOpen, setEmailModalOpen] = useState(false);
    const [selectedMaterial, setSelectedMaterial] = useState(null);
    const [selectedSupplier, setSelectedSupplier] = useState(null);
    const [emailQuantity, setEmailQuantity] = useState('');

    const filteredMaterials = (dashboardData.materials || []).filter(m => {
        const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            m.category_name?.toLowerCase().includes(searchQuery.toLowerCase());

        if (showLowStockOnly) {
            const isLow = Number(m.current_stock) <= Number(m.min_stock_level);
            return matchesSearch && isLow;
        }
        return matchesSearch;
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
        setEmailModalOpen(true);
    };

    const handleSendEmail = async () => {
        if (!selectedMaterial || !selectedSupplier) {
            alert('❌ Please select a supplier');
            return;
        }
        setActionLoading(`email_${selectedMaterial.id}`);
        try {
            const response = await dashboardService.emailSupplier(selectedMaterial.id, emailQuantity, selectedSupplier);
            alert(`✅ ${response.message}`);
            setEmailModalOpen(false);
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
            alert(`✅ ${response.message}`);
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
                            ? 'bg-red-50 border-red-200 text-red-600 ring-2 ring-red-100'
                            : 'bg-white border-gray-100 text-gray-500 hover:bg-gray-50'
                            }`}
                    >
                        <span className={`w-2 h-2 rounded-full ${showLowStockOnly ? 'bg-red-500 animate-pulse' : 'bg-gray-300'}`}></span>
                        Low Stock Only
                    </button>
                    <button
                        onClick={handleAuditAll}
                        disabled={actionLoading === 'ALL'}
                        className="px-4 py-2 bg-white border border-gray-100 text-indigo-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-50 transition-all shadow-sm flex items-center gap-2"
                    >
                        {actionLoading === 'ALL' ? 'Auditing...' : 'Audit All Stock'}
                    </button>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="w-full md:w-auto px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                >
                    + Add New Material
                </button>
            </div>

            {/* Pending Orders Section */}
            {pendingTransactions.length > 0 && (
                <div className="mb-8 overflow-hidden rounded-2xl border border-orange-200 bg-orange-50/30">
                    <div className="bg-orange-100/50 px-6 py-3 flex justify-between items-center border-b border-orange-200">
                        <div className="flex items-center gap-2">
                            <span className="text-xl">🚛</span>
                            <h3 className="text-sm font-bold text-orange-900 uppercase tracking-wider">Pending Orders (In-Transit)</h3>
                        </div>
                        <span className="bg-orange-200 text-orange-900 px-2 py-0.5 rounded-full text-[10px] font-black uppercase">
                            {pendingTransactions.length} Pending
                        </span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-orange-50 text-[10px] font-black uppercase text-orange-900 border-b border-orange-100">
                                <tr>
                                    <th className="px-6 py-3">Material</th>
                                    <th className="px-6 py-3">Supplier</th>
                                    <th className="px-6 py-3">Qty Ordered</th>
                                    <th className="px-6 py-3">Order Date</th>
                                    <th className="px-6 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-orange-100">
                                {pendingTransactions.map(t => (
                                    <tr key={t.id} className="hover:bg-orange-100/30 transition-colors">
                                        <td className="px-6 py-4 font-bold text-gray-900 text-sm">{t.material_name}</td>
                                        <td className="px-6 py-4 text-xs font-semibold text-gray-600">{t.supplier_name}</td>
                                        <td className="px-6 py-4 text-sm">
                                            <span className="font-black text-orange-600">{t.quantity}</span>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-gray-500 font-mono">{t.date}</td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleReceiveOrder(t.id)}
                                                disabled={actionLoading === `receive_${t.id}`}
                                                className="bg-green-600 hover:bg-green-700 text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-lg shadow-sm transition-all flex items-center gap-2 ml-auto"
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

            <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-[#1e293b] text-[10px] font-black uppercase text-gray-400 tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Material (सामाग्री)</th>
                                <th className="px-6 py-4">Status / Alert</th>
                                <th className="px-6 py-4 text-center">Current Stock</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredMaterials.map(m => {
                                const isLow = Number(m.current_stock) <= Number(m.min_stock_level);
                                const pendingQty = pendingStockMap[m.id] || 0;

                                return (
                                    <tr key={m.id} className="hover:bg-gray-50/80 transition-all duration-200 group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-xl font-bold text-indigo-600 overflow-hidden shrink-0 border border-indigo-100/50">
                                                    {m.image ? (
                                                        <img src={m.image} alt={m.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        m.name.charAt(0)
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-gray-900 text-sm flex items-center gap-2">
                                                        {m.name}
                                                        {pendingQty > 0 && (
                                                            <span className="bg-orange-100 text-orange-600 text-[8px] px-1.5 py-0.5 rounded-full border border-orange-200 animate-pulse">
                                                                🚛 INCOMING: {pendingQty}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-[10px] uppercase font-black text-gray-400 flex items-center gap-2">
                                                        <span>{m.budget_category_name || 'General'}</span>
                                                        <span className="w-1 h-1 bg-gray-300 rounded-full" />
                                                        <span>{m.unit}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-2">
                                                {isLow && (
                                                    <span className="bg-red-50 text-red-600 text-[9px] font-black px-2 py-0.5 rounded-full border border-red-100 flex items-center gap-1 uppercase">
                                                        <span className="w-1 h-1 bg-red-600 rounded-full animate-ping" />
                                                        Low Stock Alert
                                                    </span>
                                                )}
                                                <span className="bg-gray-50 text-gray-500 text-[9px] font-bold px-2 py-0.5 rounded-full border border-gray-100 uppercase">
                                                    Min: {m.min_stock_level}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-center">
                                                <div className={`text-sm font-black ${isLow ? 'text-red-600' : 'text-gray-900'}`}>
                                                    {m.current_stock}
                                                    <span className="text-[10px] font-bold text-gray-400 ml-1 uppercase">{m.unit}</span>
                                                </div>
                                                {pendingQty > 0 && (
                                                    <div className="text-[9px] font-bold text-orange-600 mt-0.5 whitespace-nowrap">
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
                                                    ? 'bg-gray-100 text-gray-400 border-gray-100'
                                                    : 'text-green-600 hover:bg-green-50 border-green-200 hover:border-green-300 bg-green-50/50'
                                                    }`}
                                                title="Order from Supplier"
                                            >
                                                {actionLoading === `email_${m.id}` ? '📧 Sending...' : '📧 Order'}
                                            </button>
                                            <button
                                                onClick={() => handleRecalculate(m.id)}
                                                disabled={actionLoading === m.id}
                                                className={`font-extrabold text-[9px] uppercase transition-all px-1.5 py-0.5 rounded border ${actionLoading === m.id
                                                    ? 'bg-gray-100 text-gray-400 border-gray-100'
                                                    : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 border-transparent hover:border-indigo-100'
                                                    }`}
                                                title="Audit Stock"
                                            >
                                                {actionLoading === m.id ? 'Auditing...' : 'Audit Stock'}
                                            </button>
                                            <button onClick={() => handleOpenModal(m)} className="text-indigo-600 hover:text-indigo-900 font-semibold text-sm">Edit</button>
                                            <button onClick={() => handleDelete(m.id)} className="text-red-400 hover:text-red-700 font-semibold text-sm opacity-0 group-hover:opacity-100 transition-opacity">Delete</button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`${editingItem ? 'Edit' : 'Add'} Material`}>
                <form onSubmit={handleSubmit} className="space-y-4 p-1">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-1">
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Material Name</label>
                            <input
                                type="text"
                                value={formData.name || ''}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none"
                                required
                            />
                        </div>
                        <div className="col-span-1">
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Stocking Unit</label>
                            <select
                                value={formData.unit || 'BORA'}
                                onChange={e => setFormData({ ...formData, unit: e.target.value })}
                                className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none bg-white"
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
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700">Cancel</button>
                        <button type="submit" disabled={loading} className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50">
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
                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                        <h4 className="text-sm font-bold text-indigo-900 mb-2">Material Details</h4>
                        <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Material:</span>
                                <span className="font-bold text-gray-900">{selectedMaterial?.name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Current Stock:</span>
                                <span className="font-bold text-red-600">{selectedMaterial?.current_stock} {selectedMaterial?.unit}</span>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Select Supplier *</label>
                        <select
                            value={selectedSupplier || ''}
                            onChange={(e) => setSelectedSupplier(Number(e.target.value))}
                            className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none bg-white"
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
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Quantity to Order</label>
                        <input
                            type="number"
                            value={emailQuantity}
                            onChange={(e) => setEmailQuantity(e.target.value)}
                            className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none text-lg font-bold text-center"
                            min="1"
                        />
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <button type="button" onClick={() => setEmailModalOpen(false)} className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700">Cancel</button>
                        <button
                            onClick={handleSendEmail}
                            disabled={!emailQuantity || actionLoading}
                            className="px-8 py-2.5 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                        >
                            📧 Send Order Email
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default MaterialsTab;
