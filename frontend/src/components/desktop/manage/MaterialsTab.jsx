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

    const getStockPercentage = (current, min) => {
        if (Number(current) <= 0) return 0;
        if (Number(current) <= Number(min)) return 30; // Critical zone
        return Math.min(100, (Number(current) / (Number(min) * 5)) * 100);
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
            refreshData(); // Refresh to show pending order
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

    // Calculate pending stock for each material
    const pendingTransactions = (dashboardData.material_transactions || []).filter(t => t.status === 'PENDING');

    // Group pending by material ID
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
                                            title="Recalculate stock from transaction history"
                                        >
                                            {actionLoading === m.id ? 'Auditing...' : 'Audit Stock'}
                                        </button>
                                        <button onClick={() => handleOpenModal(m)} className="text-indigo-600 hover:text-indigo-900 font-semibold text-sm">Edit</button>
                                        <button onClick={() => handleDelete(m.id)} className="text-red-400 hover:text-red-700 font-semibold text-sm opacity-0 group-hover:opacity-100 transition-opacity">Delete</button>
                                    </td >
                                </tr >
                            );
                        })}
{
    filteredMaterials.length === 0 && (
        <tr>
            <td colSpan="5" className="px-6 py-10 text-center text-gray-400 italic text-sm">No materials found.</td>
        </tr>
    )
}
                    </tbody >
                </table >
            </div >

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
                        placeholder="e.g. OPC Cement"
                        required
                    />
                </div>
                <div className="col-span-1">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Stocking Unit</label>
                    <select
                        value={formData.unit || 'BORA'}
                        onChange={e => setFormData({ ...formData, unit: e.target.value })}
                        className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none bg-white appearance-none"
                        required
                    >
                        <option value="BORA">Bora (Sack)</option>
                        <option value="TIPPER">Tipper</option>
                        <option value="KG">Kilogram (Kg)</option>
                        <option value="SQFT">Sq. Ft.</option>
                        <option value="BUNDLE">Bundle</option>
                        <option value="TRUCK">Truck</option>
                        <option value="PCS">Pieces (Pcs)</option>
                    </select>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Minimum Alert Level</label>
                    <input
                        type="number"
                        value={formData.min_stock_level || 0}
                        onChange={e => setFormData({ ...formData, min_stock_level: e.target.value })}
                        className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none"
                        placeholder="0"
                    />
                    <p className="text-[10px] text-gray-400 mt-1 italic">Triggers visual alerts when stock falls below this.</p>
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Budget Category (For Financials)</label>
                    <select
                        value={formData.budget_category || ''}
                        onChange={e => setFormData({ ...formData, budget_category: e.target.value })}
                        className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none bg-white appearance-none font-bold text-indigo-600"
                        required
                    >
                        <option value="">Select Category</option>
                        {dashboardData.budgetCategories?.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                    <p className="text-[10px] text-gray-400 mt-1 italic">Determines which budget line item is docked.</p>
                </div>
            </div>
            <div className="flex justify-end gap-3 mt-8">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700">Cancel</button>
                <button type="submit" disabled={loading} className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 transition-all">
                    {loading ? 'Saving...' : (editingItem ? 'Update Material' : 'Create Material')}
                </button>
            </div>
        </form>
    </Modal>

{/* Email Supplier Modal */ }
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
                <div className="flex justify-between">
                    <span className="text-gray-600">Min Level:</span>
                    <span className="text-gray-600">{selectedMaterial?.min_stock_level} {selectedMaterial?.unit}</span>
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
            <p className="text-xs text-gray-500 mt-1">Only suppliers with email addresses are shown</p>
        </div>

        <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Quantity to Order</label>
            <input
                type="number"
                value={emailQuantity}
                onChange={(e) => setEmailQuantity(e.target.value)}
                className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none text-lg font-bold text-center"
                placeholder="Enter quantity"
                min="1"
            />
            <p className="text-xs text-gray-500 mt-1 text-center">This will be included in the email to the supplier</p>
        </div>

        <div className="flex justify-end gap-3 mt-6">
            <button
                type="button"
                onClick={() => setEmailModalOpen(false)}
                className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700"
            >
                Cancel
            </button>
            <button
                onClick={handleSendEmail}
                disabled={!emailQuantity || actionLoading}
                className="px-8 py-2.5 bg-green-600 text-white rounded-xl font-bold shadow-lg shadow-green-200 hover:bg-green-700 disabled:opacity-50 transition-all flex items-center gap-2"
            >
                📧 Send Order Email
            </button>
        </div>
    </div>
</Modal>
        </div >
    );
};

export default MaterialsTab;
