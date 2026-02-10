import React, { useState } from 'react';
import { dashboardService } from '../../../services/api';
import Modal from '../../common/Modal';

const StockTab = ({ transactions, materials, suppliers, rooms, onDataRefresh }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({});
    const [loading, setLoading] = useState(false);

    const handleOpenModal = (item = null) => {
        setEditingItem(item);
        if (item) {
            setFormData(item);
        } else {
            setFormData({ transaction_type: 'OUT', date: new Date().toISOString().split('T')[0] });
        }
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm(`Are you sure you want to delete this Transaction?`)) return;
        try {
            await dashboardService.deleteMaterialTransaction(id);
            onDataRefresh();
        } catch (error) {
            console.error("Delete failed", error);
            alert("Delete failed.");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            let dataToSubmit = { ...formData };
            if (dataToSubmit.supplier === '') dataToSubmit.supplier = null;
            if (dataToSubmit.room === '') dataToSubmit.room = null;

            if (editingItem) await dashboardService.updateMaterialTransaction(editingItem.id, dataToSubmit);
            else await dashboardService.createMaterialTransaction(dataToSubmit);

            setIsModalOpen(false);
            onDataRefresh();
        } catch (error) {
            console.error("Save failed", error);
            alert("Save failed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <button
                    onClick={() => handleOpenModal()}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors shadow-sm"
                >
                    + Add Stock Entry
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Date</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Material</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Type</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Quantity</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {transactions?.map(t => (
                            <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 text-sm text-gray-500">{new Date(t.date).toLocaleDateString()}</td>
                                <td className="px-6 py-4 font-medium text-gray-900">{t.material_name}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${t.transaction_type === 'IN' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {t.transaction_type}
                                    </span>
                                    {t.supplier_name && <div className="text-[10px] text-gray-400 mt-1">From: {t.supplier_name}</div>}
                                    {t.room_name && <div className="text-[10px] text-gray-400 mt-1">To: {t.room_name}</div>}
                                </td>
                                <td className="px-6 py-4 font-bold text-gray-900">{t.quantity}</td>
                                <td className="px-6 py-4 text-right">
                                    <button onClick={() => handleDelete(t.id)} className="text-red-600 hover:text-red-900 font-medium text-sm">Cancel</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={`${editingItem ? 'Edit' : 'Add'} Stock Entry`}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Material</label>
                            <select
                                value={formData.material || ''}
                                onChange={e => setFormData({ ...formData, material: e.target.value })}
                                className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2 border"
                                required
                            >
                                <option value="">Select Material</option>
                                {materials?.map(m => (
                                    <option key={m.id} value={m.id}>{m.name} ({m.current_stock} {m.unit})</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                            <select
                                value={formData.transaction_type || 'OUT'}
                                onChange={e => setFormData({ ...formData, transaction_type: e.target.value })}
                                className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2 border"
                                required
                            >
                                <option value="IN">Stock In (Purchase)</option>
                                <option value="OUT">Stock Out (Used)</option>
                                <option value="RETURN">Return to Supplier</option>
                                <option value="WASTAGE">Wastage</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                            <input
                                type="number"
                                value={formData.quantity || 0}
                                onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                                className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2 border"
                                required
                            />
                        </div>
                        {formData.transaction_type === 'IN' ? (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                                <select
                                    value={formData.supplier || ''}
                                    onChange={e => setFormData({ ...formData, supplier: e.target.value })}
                                    className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2 border"
                                    required
                                >
                                    <option value="">Select Supplier</option>
                                    {suppliers?.map(s => (
                                        <option key={s.id} value={s.id}>{s.name} ({s.category})</option>
                                    ))}
                                </select>
                            </div>
                        ) : (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                                <input
                                    type="date"
                                    value={formData.date || ''}
                                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                                    className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2 border"
                                    required
                                />
                            </div>
                        )}
                    </div>
                    {formData.transaction_type === 'IN' ? (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                            <input
                                type="date"
                                value={formData.date || ''}
                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                                className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2 border"
                                required
                            />
                        </div>
                    ) : (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Used for Room (Optional)</label>
                            <select
                                value={formData.room || ''}
                                onChange={e => setFormData({ ...formData, room: e.target.value })}
                                className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2 border"
                            >
                                <option value="">General Site Use</option>
                                {rooms?.map(r => (
                                    <option key={r.id} value={r.id}>{r.name} ({r.status})</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default StockTab;
