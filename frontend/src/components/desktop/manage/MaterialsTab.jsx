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

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50/50 border-b border-gray-100">
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Material & Category</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Inventory Health</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Avg. Cost</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Current Stock</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filteredMaterials.map(m => {
                            const isLow = Number(m.current_stock) <= Number(m.min_stock_level);
                            const percent = getStockPercentage(m.current_stock, m.min_stock_level);

                            return (
                                <tr key={m.id} className="hover:bg-gray-50/50 transition-all group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="text-sm font-black text-gray-900">{m.name}</div>
                                            {isLow && (
                                                <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-[8px] font-black uppercase rounded border border-red-200 animate-pulse tracking-tighter">
                                                    Critical Stock
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tight mt-0.5">Category: {m.category_name || 'General'}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="max-w-[120px]">
                                            <div className="flex justify-between items-center text-[9px] font-bold mb-1">
                                                <span className={isLow ? 'text-red-500' : 'text-gray-400'}>{isLow ? 'RE-ORDER NOW' : 'HEALTHY'}</span>
                                                <span className="text-gray-400">{Math.round(percent)}%</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden shadow-inner">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-700 ${isLow ? 'bg-red-500' : 'bg-indigo-500'}`}
                                                    style={{ width: `${percent}%` }}
                                                />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="text-sm font-black text-gray-900 leading-none">Rs. {m.avg_cost_per_unit || '0.00'}</div>
                                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter mt-1">Per {m.unit}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <div className="flex items-baseline gap-1">
                                                <span className={`text-lg font-black ${isLow ? 'text-red-600' : 'text-gray-900'}`}>
                                                    {m.current_stock}
                                                </span>
                                                <span className="text-[10px] font-bold text-gray-400 uppercase">{m.unit}</span>
                                            </div>
                                            <div className="text-[10px] font-bold text-indigo-500 mt-0.5">
                                                Total Value: Rs. {(parseFloat(m.current_stock) * (m.avg_cost_per_unit || 0)).toLocaleString()}
                                            </div>
                                            <div className="text-[10px] text-gray-400 font-medium italic mt-0.5">Min level: {m.min_stock_level}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right space-x-3">
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
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredMaterials.length === 0 && (
                            <tr>
                                <td colSpan="5" className="px-6 py-10 text-center text-gray-400 italic text-sm">No materials found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
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
        </div>
    );
};

export default MaterialsTab;
