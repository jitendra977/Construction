import React, { useState } from 'react';
import { dashboardService } from '../../../services/api';
import Modal from '../../common/Modal';
import { useConstruction } from '../../../context/ConstructionContext';

const ExpensesTab = ({ searchQuery = '' }) => {
    const { dashboardData, refreshData, formatCurrency } = useConstruction();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({});
    const [loading, setLoading] = useState(false);

    const filteredExpenses = dashboardData.expenses?.filter(e =>
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.paid_to?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.category_name?.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    const handleOpenModal = (expense = null) => {
        setEditingItem(expense);
        setFormData(expense ? { ...expense } : {
            category: dashboardData.budgetCategories[0]?.id,
            date: new Date().toISOString().split('T')[0],
            expense_type: 'MATERIAL'
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this Expense?')) return;
        try {
            await dashboardService.deleteExpense(id);
            refreshData();
        } catch (error) {
            alert('Delete failed.');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            let dataToSubmit = { ...formData };
            // Sanitize foreign keys
            ['supplier', 'contractor', 'material', 'room', 'phase', 'category', 'funding_source'].forEach(key => {
                if (dataToSubmit[key] === '') dataToSubmit[key] = null;
            });

            if (editingItem) await dashboardService.updateExpense(editingItem.id, dataToSubmit);
            else await dashboardService.createExpense(dataToSubmit);
            setIsModalOpen(false);
            refreshData();
        } catch (error) {
            alert('Save failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-2">
                <p className="text-sm text-gray-500">Track all project spending, material purchases, and labor payments.</p>
                <button
                    onClick={() => handleOpenModal()}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors shadow-sm"
                >
                    + Add New Expense
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Expense Details</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Type / Category</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Amount</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Funding Source</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Paid To / Date</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filteredExpenses.map(e => (
                            <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <div className="font-semibold text-gray-900">{e.title}</div>
                                        {e.material_transaction && (
                                            <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[8px] font-black uppercase rounded border border-emerald-200 tracking-tighter">
                                                Stock Purchase
                                            </span>
                                        )}
                                    </div>
                                    {e.material_name && <div className="text-[10px] text-gray-400 uppercase font-bold mt-0.5">Mat: {e.material_name}</div>}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col gap-1">
                                        <span className={`w-fit px-2 py-0.5 rounded text-[9px] font-bold uppercase ${e.expense_type === 'MATERIAL' ? 'bg-blue-100 text-blue-700' :
                                            e.expense_type === 'LABOR' ? 'bg-orange-100 text-orange-700' :
                                                e.expense_type === 'FEES' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'
                                            }`}>
                                            {e.expense_type || 'Material'}
                                        </span>
                                        <span className="text-[10px] text-gray-500 font-medium">#{e.category_name}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-red-600 font-bold text-base">{formatCurrency(e.amount)}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-xs font-bold text-gray-900 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                                        {e.funding_source_name || 'Unassigned'}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-sm font-medium text-gray-700">{e.paid_to || '-'}</div>
                                    <div className="text-[10px] text-gray-400">{new Date(e.date).toLocaleDateString(undefined, { dateStyle: 'medium' })}</div>
                                </td>
                                <td className="px-6 py-4 text-right space-x-3">
                                    <button onClick={() => handleOpenModal(e)} className="text-indigo-600 hover:text-indigo-900 font-semibold text-sm">Edit</button>
                                    <button onClick={() => handleDelete(e.id)} className="text-red-600 hover:text-red-900 font-semibold text-sm">Delete</button>
                                </td>
                            </tr>
                        ))}
                        {filteredExpenses.length === 0 && (
                            <tr>
                                <td colSpan="5" className="px-6 py-10 text-center text-gray-400 italic text-sm">No expenses found matching your search.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`${editingItem ? 'Edit' : 'Add'} Expense`}>
                <form onSubmit={handleSubmit} className="space-y-4 p-1">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Expense Title</label>
                            <input
                                type="text"
                                value={formData.title || ''}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none"
                                placeholder="e.g. 50 Bags Cement"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Expense Type</label>
                            <select
                                value={formData.expense_type || 'MATERIAL'}
                                onChange={e => setFormData({ ...formData, expense_type: e.target.value })}
                                className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none appearance-none bg-white"
                                required
                            >
                                <option value="MATERIAL">Material Purchase</option>
                                <option value="LABOR">Labor/Worker Payment</option>
                                <option value="FEES">Professional Fees</option>
                                <option value="GOVT">Government/Permit Fees</option>
                                <option value="OTHER">Other</option>
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
                                className={`w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none ${formData.material_transaction ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : ''}`}
                                disabled={!!formData.material_transaction}
                                required
                            />
                            {formData.material_transaction && (
                                <p className="text-[10px] text-indigo-500 mt-1 font-bold italic">Linked to Stock Entry. Edit in Stock Tab to change amount.</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Date</label>
                            <input
                                type="date"
                                value={formData.date || ''}
                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                                className={`w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none ${formData.material_transaction ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : ''}`}
                                disabled={!!formData.material_transaction}
                                required
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
                            <select
                                value={formData.category || ''}
                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                                className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none appearance-none bg-white"
                                required
                            >
                                <option value="">Select Category</option>
                                {dashboardData.budgetCategories?.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Paid To (Vendor/Person)</label>
                            {formData.expense_type === 'MATERIAL' ? (
                                <select
                                    value={formData.supplier || ''}
                                    onChange={e => {
                                        const s = dashboardData.suppliers?.find(sup => sup.id === parseInt(e.target.value));
                                        setFormData({ ...formData, supplier: e.target.value, paid_to: s ? s.name : formData.paid_to });
                                    }}
                                    className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none appearance-none bg-white"
                                >
                                    <option value="">Select Supplier</option>
                                    {dashboardData.suppliers?.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            ) : (formData.expense_type === 'LABOR' || formData.expense_type === 'FEES') ? (
                                <select
                                    value={formData.contractor || ''}
                                    onChange={e => {
                                        const c = dashboardData.contractors?.find(con => con.id === parseInt(e.target.value));
                                        setFormData({ ...formData, contractor: e.target.value, paid_to: c ? c.name : formData.paid_to });
                                    }}
                                    className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none appearance-none bg-white"
                                >
                                    <option value="">Select Contractor</option>
                                    {dashboardData.contractors?.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    type="text"
                                    value={formData.paid_to || ''}
                                    onChange={e => setFormData({ ...formData, paid_to: e.target.value })}
                                    className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none"
                                    placeholder="Who was paid?"
                                />
                            )}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Funding Source (Where did money come from?)</label>
                        <select
                            value={formData.funding_source || ''}
                            onChange={e => setFormData({ ...formData, funding_source: e.target.value })}
                            className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none appearance-none bg-white font-medium"
                            required
                        >
                            <option value="">Select Funding Source</option>
                            {dashboardData.funding?.map(f => (
                                <option key={f.id} value={f.id}>{f.name} ({formatCurrency(f.amount)})</option>
                            ))}
                        </select>
                        <p className="text-[10px] text-gray-400 mt-1 italic">Links this expense to a specific loan or capital source.</p>
                    </div>
                    <div className="flex justify-end gap-3 mt-8">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700">Cancel</button>
                        <button type="submit" disabled={loading} className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 transition-all">
                            {loading ? 'Saving...' : (editingItem ? 'Update Expense' : 'Create Expense')}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default ExpensesTab;
