import React, { useState } from 'react';
import { dashboardService } from '../../../services/api';
import Modal from '../../common/Modal';
import { useConstruction } from '../../../context/ConstructionContext';

const FundingTab = ({ searchQuery = '' }) => {
    const { dashboardData, refreshData, formatCurrency } = useConstruction();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({});
    const [loading, setLoading] = useState(false);

    const filteredFunding = dashboardData.funding?.filter(f =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.source_type.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    const handleOpenModal = (item = null) => {
        setEditingItem(item);
        if (item) {
            setFormData(item);
        } else {
            setFormData({
                source_type: 'OWN_MONEY',
                received_date: new Date().toISOString().split('T')[0],
                amount: 0,
                interest_rate: 0
            });
        }
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm(`Are you sure you want to remove this Funding Source?`)) return;
        try {
            await dashboardService.deleteFundingSource(id);
            refreshData();
        } catch (error) {
            alert("Delete failed.");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (editingItem) await dashboardService.updateFundingSource(editingItem.id, formData);
            else await dashboardService.createFundingSource(formData);
            setIsModalOpen(false);
            refreshData();
        } catch (error) {
            alert("Save failed.");
        } finally {
            setLoading(false);
        }
    };

    const getSourceTypeBadge = (type) => {
        const styles = {
            'OWN_MONEY': 'bg-emerald-100 text-emerald-700 border-emerald-200',
            'LOAN': 'bg-blue-100 text-blue-700 border-blue-200',
            'BORROWED': 'bg-purple-100 text-purple-700 border-purple-200',
            'OTHER': 'bg-gray-100 text-gray-700 border-gray-200'
        };
        const labels = {
            'OWN_MONEY': 'Personal Capital',
            'LOAN': 'Bank Loan',
            'BORROWED': 'Borrowed',
            'OTHER': 'Miscellaneous'
        };
        return (
            <span className={`px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${styles[type] || styles.OTHER}`}>
                {labels[type] || type}
            </span>
        );
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-2">
                <p className="text-sm text-gray-500">Manage project capital sources, loan interests, and available funding.</p>
                <button
                    onClick={() => handleOpenModal()}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors shadow-sm"
                >
                    + Add Funding Source
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Source & Type</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Interest / Cost</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filteredFunding.map(f => (
                            <tr key={f.id} className="hover:bg-gray-50 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex flex-col gap-1.5">
                                        <div className="font-bold text-gray-900 leading-tight">{f.name}</div>
                                        {getSourceTypeBadge(f.source_type)}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-lg font-black text-gray-900">{formatCurrency(f.amount)}</div>
                                    <div className="text-[10px] font-medium text-gray-400">Received: {new Date(f.received_date).toLocaleDateString()}</div>
                                </td>
                                <td className="px-6 py-4">
                                    {f.source_type === 'LOAN' || f.source_type === 'BORROWED' ? (
                                        <div className="space-y-1">
                                            <div className="text-sm font-bold text-red-500">{f.interest_rate}% Interest</div>
                                            <div className="text-[10px] text-gray-400 font-medium">Monthly: {formatCurrency((f.amount * (f.interest_rate / 100)) / 12)} approx.</div>
                                        </div>
                                    ) : (
                                        <div className="text-sm text-emerald-600 font-bold italic">Zero Cost Capital</div>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right space-x-3">
                                    <button onClick={() => handleOpenModal(f)} className="text-indigo-600 hover:text-indigo-900 font-semibold text-sm">Edit</button>
                                    <button onClick={() => handleDelete(f.id)} className="text-red-500 hover:text-red-700 font-semibold text-sm opacity-0 group-hover:opacity-100 transition-opacity">Delete</button>
                                </td>
                            </tr>
                        ))}
                        {filteredFunding.length === 0 && (
                            <tr>
                                <td colSpan="4" className="px-6 py-10 text-center text-gray-400 italic text-sm">No funding sources found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`${editingItem ? 'Edit' : 'Add'} Funding Source`}>
                <form onSubmit={handleSubmit} className="space-y-4 p-1">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 md:col-span-1">
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Source Name</label>
                            <input
                                type="text"
                                value={formData.name || ''}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none"
                                placeholder="e.g. Nabil Bank Personal Loan"
                                required
                            />
                        </div>
                        <div className="col-span-2 md:col-span-1">
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Source Type</label>
                            <select
                                value={formData.source_type || 'OWN_MONEY'}
                                onChange={e => setFormData({ ...formData, source_type: e.target.value })}
                                className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none bg-white appearance-none"
                                required
                            >
                                <option value="OWN_MONEY">Personal Savings / Own Money</option>
                                <option value="LOAN">Bank Loan</option>
                                <option value="BORROWED">Borrowed from Friends/Family</option>
                                <option value="OTHER">Other Sources</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Amount (Rs.)</label>
                            <input
                                type="number"
                                value={formData.amount || 0}
                                onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none font-bold text-gray-900"
                                placeholder="0"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Interest Rate (%)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.interest_rate || 0}
                                onChange={e => setFormData({ ...formData, interest_rate: e.target.value })}
                                className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none"
                                placeholder="0.00"
                                disabled={formData.source_type === 'OWN_MONEY'}
                            />
                            <p className="text-[10px] text-gray-400 mt-1 italic">Annual percentage rate.</p>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Date Received</label>
                        <input
                            type="date"
                            value={formData.received_date || ''}
                            onChange={e => setFormData({ ...formData, received_date: e.target.value })}
                            className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Notes / Terms</label>
                        <textarea
                            value={formData.notes || ''}
                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none resize-none"
                            placeholder="Repayment terms, grace periods, etc."
                            rows="2"
                        />
                    </div>
                    <div className="flex justify-end gap-3 mt-8">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700">Cancel</button>
                        <button type="submit" disabled={loading} className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 transition-all">
                            {loading ? 'Saving...' : (editingItem ? 'Update Source' : 'Add Source')}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default FundingTab;
