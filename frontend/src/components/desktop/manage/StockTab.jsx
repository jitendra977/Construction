import React, { useState } from 'react';
import { dashboardService } from '../../../services/api';
import Modal from '../../common/Modal';
import { useConstruction } from '../../../context/ConstructionContext';

const StockTab = ({ searchQuery = '' }) => {
    const { dashboardData, refreshData } = useConstruction();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({});
    const [loading, setLoading] = useState(false);

    const filteredTransactions = dashboardData.transactions?.filter(t =>
        t.material_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.supplier_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.room_name?.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    const handleOpenModal = (item = null) => {
        setEditingItem(item);
        if (item) {
            setFormData(item);
        } else {
            setFormData({
                transaction_type: 'OUT',
                date: new Date().toISOString().split('T')[0],
                quantity: 1
            });
        }
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm(`Are you sure you want to cancel this Stock Transaction? This will revert the material stock.`)) return;
        try {
            await dashboardService.deleteMaterialTransaction(id);
            refreshData();
        } catch (error) {
            alert("Action failed. Stock could not be reverted.");
        }
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
            'IN': 'bg-green-100 text-green-700 border-green-200',
            'OUT': 'bg-red-100 text-red-700 border-red-200',
            'RETURN': 'bg-orange-100 text-orange-700 border-orange-200',
            'WASTAGE': 'bg-gray-100 text-gray-700 border-gray-200',
        };
        return colors[type] || 'bg-gray-100 text-gray-700 border-gray-200';
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-2">
                <p className="text-sm text-gray-500">Track all material inward/outward movements and site consumption.</p>
                <button
                    onClick={() => handleOpenModal()}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors shadow-sm"
                >
                    + Register Stock Entry
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Date & Material</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Transaction Context</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Quantity</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filteredTransactions.map(t => (
                            <tr key={t.id} className="hover:bg-gray-50 transition-colors group text-sm">
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <div className="font-bold text-gray-900">{t.material_name}</div>
                                        <div className="text-[10px] text-gray-400 font-medium">
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
                                                    <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-medium">
                                                        <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                                        {t.supplier_name}
                                                    </div>
                                                )}
                                                {t.funding_source_name && (
                                                    <div className="flex items-center gap-1.5 text-[10px] text-indigo-500 font-bold">
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                        {t.funding_source_name}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {t.transaction_type === 'OUT' && t.room_name && (
                                            <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-medium">
                                                <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                                                {t.room_name}
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-baseline gap-1">
                                        <span className={`text-lg font-black ${t.transaction_type === 'IN' ? 'text-green-600' : 'text-gray-900'}`}>
                                            {t.transaction_type === 'IN' ? '+' : '-'}{t.quantity}
                                        </span>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{t.unit_name || ''}</span>
                                            {t.transaction_type === 'IN' && t.unit_price > 0 && (
                                                <span className="text-[9px] text-gray-400">@Rs.{t.unit_price}</span>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button
                                        onClick={() => handleDelete(t.id)}
                                        className="text-red-500 hover:text-red-700 font-bold text-[10px] uppercase opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 ml-auto"
                                    >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        Void Entry
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {filteredTransactions.length === 0 && (
                            <tr>
                                <td colSpan="4" className="px-6 py-10 text-center text-gray-400 italic text-sm">No transactions found matching your search.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Register Stock Movement">
                <form onSubmit={handleSubmit} className="p-1 space-y-5">
                    <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50">
                        <label className="block text-xs font-black text-indigo-400 uppercase tracking-widest mb-3">Material & Movement Type</label>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <select
                                    value={formData.material || ''}
                                    onChange={e => setFormData({ ...formData, material: e.target.value })}
                                    className="w-full rounded-xl border-white shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none bg-white font-bold text-gray-700"
                                    required
                                >
                                    <option value="">Select Material</option>
                                    {dashboardData.materials?.map(m => (
                                        <option key={m.id} value={m.id}>{m.name} (In Stock: {m.current_stock} {m.unit})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <select
                                    value={formData.transaction_type || 'OUT'}
                                    onChange={e => setFormData({ ...formData, transaction_type: e.target.value })}
                                    className="w-full rounded-xl border-white shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none bg-white font-bold text-gray-700"
                                    required
                                >
                                    <option value="IN">Stock IN (Purchase)</option>
                                    <option value="OUT">Stock OUT (Usage)</option>
                                    <option value="RETURN">RETURN to Supplier</option>
                                    <option value="WASTAGE">WASTAGE/Loss</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6 px-1">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Action Date</label>
                            <input
                                type="date"
                                value={formData.date || ''}
                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                                className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Quantity</label>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.quantity || ''}
                                onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                                className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none font-bold text-gray-900"
                                placeholder="0.00"
                                required
                            />
                        </div>
                    </div>

                    {formData.transaction_type === 'IN' && (
                        <div className="grid grid-cols-2 gap-6 px-1">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Unit Price (Rs.)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.unit_price || ''}
                                    onChange={e => setFormData({ ...formData, unit_price: e.target.value })}
                                    className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none font-bold text-emerald-600"
                                    placeholder="0.00"
                                    required
                                />
                                <p className="text-[10px] text-gray-400 mt-1 italic">Used for auto-generating expense.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Funding Source</label>
                                <select
                                    value={formData.funding_source || ''}
                                    onChange={e => setFormData({ ...formData, funding_source: e.target.value })}
                                    className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none bg-white font-bold text-indigo-600"
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

                    <div className="px-1">
                        {formData.transaction_type === 'IN' || formData.transaction_type === 'RETURN' ? (
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Supplier / Vendor</label>
                                <select
                                    value={formData.supplier || ''}
                                    onChange={e => setFormData({ ...formData, supplier: e.target.value })}
                                    className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none bg-white"
                                    required={formData.transaction_type === 'IN'}
                                >
                                    <option value="">Select Supplier</option>
                                    {dashboardData.suppliers?.map(s => (
                                        <option key={s.id} value={s.id}>{s.name} ({s.category})</option>
                                    ))}
                                </select>
                            </div>
                        ) : (
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Assign to Room / Area (Optional)</label>
                                <select
                                    value={formData.room || ''}
                                    onChange={e => setFormData({ ...formData, room: e.target.value })}
                                    className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none bg-white"
                                >
                                    <option value="">General Site Usage</option>
                                    {dashboardData.rooms?.map(r => (
                                        <option key={r.id} value={r.id}>{r.name} ({r.floor_name})</option>
                                    ))}
                                </select>
                                <p className="text-[10px] text-gray-400 mt-1 italic pl-1">Helps track consumption per room for material auditing.</p>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Notes / Remarks</label>
                        <textarea
                            value={formData.notes || ''}
                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none resize-none"
                            placeholder="Reason for wastage or purchase details..."
                            rows="2"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700">Cancel</button>
                        <button type="submit" disabled={loading} className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 transition-all">
                            {loading ? 'Recording...' : 'Register Movement'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};
export default StockTab;
