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

    const filteredMaterials = dashboardData.materials?.filter(m =>
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.category?.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

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
        if (!min || min === 0) return 100;
        const val = (parseFloat(current) / (parseFloat(min) * 2)) * 100;
        return Math.min(val, 100);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-2">
                <p className="text-sm text-gray-500">Track raw material inventory levels and reorder thresholds.</p>
                <button
                    onClick={() => handleOpenModal()}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors shadow-sm"
                >
                    + Add New Material
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Material & category</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Inventory Health</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Available Stock</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filteredMaterials.map(m => {
                            const isLow = parseFloat(m.current_stock) <= parseFloat(m.min_stock_level);
                            return (
                                <tr key={m.id} className="hover:bg-gray-50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <div className="font-bold text-gray-900 leading-tight">{m.name}</div>
                                            <div className="flex gap-1.5 mt-0.5">
                                                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">{m.category || 'Uncategorized'}</div>
                                                {m.budget_category_name && (
                                                    <div className="text-[10px] text-indigo-500 font-black uppercase tracking-widest border-l border-gray-200 pl-1.5">
                                                        {m.budget_category_name}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="w-full max-w-[120px] space-y-1.5">
                                            <div className="flex justify-between items-center text-[10px] font-bold">
                                                <span className={isLow ? 'text-red-500' : 'text-green-600'}>
                                                    {isLow ? 'REORDER NOW' : 'HEALTHY'}
                                                </span>
                                                <span className="text-gray-400">{Math.round(getStockPercentage(m.current_stock, m.min_stock_level))}%</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-500 ${isLow ? 'bg-red-500' : 'bg-green-500'}`}
                                                    style={{ width: `${getStockPercentage(m.current_stock, m.min_stock_level)}%` }}
                                                />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-baseline gap-1">
                                            <span className={`text-lg font-black ${isLow ? 'text-red-600' : 'text-gray-900'}`}>
                                                {m.current_stock}
                                            </span>
                                            <span className="text-[10px] font-bold text-gray-400 uppercase">{m.unit}</span>
                                        </div>
                                        <div className="text-[10px] text-gray-400 font-medium italic">Min level: {m.min_stock_level}</div>
                                    </td>
                                    <td className="px-6 py-4 text-right space-x-3">
                                        <button onClick={() => handleOpenModal(m)} className="text-indigo-600 hover:text-indigo-900 font-semibold text-sm">Edit</button>
                                        <button onClick={() => handleDelete(m.id)} className="text-red-500 hover:text-red-700 font-semibold text-sm opacity-0 group-hover:opacity-100 transition-opacity">Delete</button>
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredMaterials.length === 0 && (
                            <tr>
                                <td colSpan="4" className="px-6 py-10 text-center text-gray-400 italic text-sm">No materials found matching your search.</td>
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
                            <p className="text-[10px] text-gray-400 mt-1 italic">Determines which budget line item is docked when buying this material.</p>
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
