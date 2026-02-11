import React, { useState } from 'react';
import { dashboardService } from '../../../services/api';
import Modal from '../../common/Modal';
import { useConstruction } from '../../../context/ConstructionContext';

const FundingTab = ({ searchQuery = '' }) => {
    const { dashboardData, refreshData, formatCurrency } = useConstruction();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [viewingHistory, setViewingHistory] = useState(null);
    const [formData, setFormData] = useState({});
    const [loading, setLoading] = useState(false);
    const [isTopUpOpen, setIsTopUpOpen] = useState(false);
    const [activeFundingSource, setActiveFundingSource] = useState(null);
    const [topUpFormData, setTopUpFormData] = useState({
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        description: 'Manual Top-up'
    });

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

    const handleOpenTopUp = (item) => {
        setActiveFundingSource(item);
        setTopUpFormData({
            amount: 0,
            date: new Date().toISOString().split('T')[0],
            description: 'Manual Top-up'
        });
        setIsTopUpOpen(true);
    };

    const handleTopUpSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await dashboardService.createFundingTransaction({
                funding_source: activeFundingSource.id,
                amount: parseFloat(topUpFormData.amount),
                transaction_type: 'CREDIT',
                date: topUpFormData.date,
                description: topUpFormData.description
            });
            setIsTopUpOpen(false);
            refreshData();
        } catch (error) {
            alert("Top-up failed.");
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
            'OWN_MONEY': 'Personal Savings (Bachat)',
            'LOAN': 'Bank Loan (Karja)',
            'BORROWED': 'Borrowed (Saapathi)',
            'OTHER': 'Other Source'
        };
        return (
            <span className={`px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider ${styles[type] || styles.OTHER}`}>
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
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Total Amount</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Available Balance</th>
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
                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Total Allocation</div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className={`text-lg font-black ${Number(f.current_balance) < Number(f.amount) * 0.1 ? 'text-red-600' : 'text-emerald-600'}`}>{formatCurrency(f.current_balance)}</div>
                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Available Balance</div>
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
                                    <button
                                        onClick={() => handleOpenTopUp(f)}
                                        className="text-orange-600 hover:text-orange-900 font-semibold text-sm"
                                    >
                                        Top-up
                                    </button>
                                    <button onClick={() => setViewingHistory(f)} className="text-emerald-600 hover:text-emerald-900 font-semibold text-sm">History</button>
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
                                <option value="OWN_MONEY">Personal Savings (Nagad/Bachat)</option>
                                <option value="LOAN">Bank Loan (Karja)</option>
                                <option value="BORROWED">Borrowed from Friends/Family (Saapathi)</option>
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
                    <div className="grid grid-cols-2 gap-4">
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
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Default Payment Method</label>
                            <select
                                value={formData.default_payment_method || 'CASH'}
                                onChange={e => setFormData({ ...formData, default_payment_method: e.target.value })}
                                className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none bg-white appearance-none font-bold"
                                required
                            >
                                <option value="CASH">💰 Nagad (Cash)</option>
                                <option value="BANK_TRANSFER">🏦 Bank Transfer (ConnectIPS)</option>
                                <option value="CHECK">📜 Cheque</option>
                                <option value="QR">📱 eSewa / Khalti (QR)</option>
                                <option value="OTHER">❓ Other</option>
                            </select>
                        </div>
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

            {/* Top-up Modal */}
            <Modal isOpen={isTopUpOpen} onClose={() => setIsTopUpOpen(false)} title={`Top-up: ${activeFundingSource?.name}`}>
                <form onSubmit={handleTopUpSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Top-up Amount (Rs.)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={topUpFormData.amount}
                                onChange={e => setTopUpFormData({ ...topUpFormData, amount: e.target.value })}
                                className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none font-bold text-emerald-600"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Date</label>
                            <input
                                type="date"
                                value={topUpFormData.date}
                                onChange={e => setTopUpFormData({ ...topUpFormData, date: e.target.value })}
                                className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none"
                                required
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Description / Source Note</label>
                        <input
                            type="text"
                            value={topUpFormData.description}
                            onChange={e => setTopUpFormData({ ...topUpFormData, description: e.target.value })}
                            className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none"
                            placeholder="e.g. Additional savings injection"
                            required
                        />
                    </div>
                    <div className="flex justify-end gap-3 mt-8">
                        <button type="button" onClick={() => setIsTopUpOpen(false)} className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700">Cancel</button>
                        <button type="submit" disabled={loading} className="px-8 py-2.5 bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-700 disabled:opacity-50 transition-all">
                            {loading ? 'Processing...' : 'Confirm Top-up'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Transaction History Modal */}
            <Modal isOpen={!!viewingHistory} onClose={() => setViewingHistory(null)} title={`Transaction History: ${viewingHistory?.name}`} maxWidth="max-w-2xl">
                <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-xl flex justify-between items-center border border-gray-100">
                        <div>
                            <div className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Available Balance</div>
                            <div className="text-xl font-black text-gray-900">{viewingHistory && formatCurrency(viewingHistory.current_balance)}</div>
                        </div>
                        <div className="text-right">
                            <div className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Total Capital</div>
                            <div className="text-xl font-black text-gray-900">{viewingHistory && formatCurrency(viewingHistory.amount)}</div>
                        </div>
                    </div>

                    <div className="max-h-[50vh] overflow-y-auto space-y-2 pr-2 scrollbar-hide">
                        {viewingHistory?.transactions?.length > 0 ? (
                            viewingHistory.transactions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).map((t, idx) => (
                                <div key={idx} className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${t.transaction_type === 'CREDIT' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                            {t.transaction_type === 'CREDIT' ? (
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                                            ) : (
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" /></svg>
                                            )}
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-gray-900">{t.description}</div>
                                            <div className="text-[10px] text-gray-400 font-medium">{new Date(t.date).toLocaleDateString()}</div>
                                        </div>
                                    </div>
                                    <div className={`text-sm font-black ${t.transaction_type === 'CREDIT' ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {t.transaction_type === 'CREDIT' ? '+' : '-'}{formatCurrency(t.amount)}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-10 bg-gray-50 rounded-xl border-2 border-dashed border-gray-100 italic text-gray-400 text-sm">
                                No transactions found for this source.
                            </div>
                        )}
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default FundingTab;
