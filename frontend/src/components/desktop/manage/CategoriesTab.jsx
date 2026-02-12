import React, { useState } from 'react';
import { dashboardService } from '../../../services/api';
import Modal from '../../common/Modal';
import { useConstruction } from '../../../context/ConstructionContext';

const CategoriesTab = ({ searchQuery = '' }) => {
    const { dashboardData, refreshData } = useConstruction();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({});
    const [loading, setLoading] = useState(false);

    const filteredCategories = dashboardData.budgetCategories?.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    const handleOpenModal = (category = null) => {
        setEditingItem(category);
        setFormData(category ? { ...category } : { allocation: 0 });
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this Category?')) return;
        try {
            await dashboardService.deleteBudgetCategory(id);
            refreshData();
        } catch (error) {
            alert('Delete failed.');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (editingItem) await dashboardService.updateBudgetCategory(editingItem.id, formData);
            else await dashboardService.createBudgetCategory(formData);
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
                <p className="text-sm text-gray-500">Define budget categories and allocate funds for better expense tracking.</p>
                <button
                    onClick={() => handleOpenModal()}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors shadow-sm"
                >
                    + Add New Category
                </button>
            </div>

            {/* Desktop View: Table */}
            <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Category Name</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Allocated Amount</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filteredCategories.map(c => {
                            const categoryExpenses = dashboardData.expenses?.filter(e => e.category === c.id) || [];
                            const spent = categoryExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
                            const percent = c.allocation > 0 ? Math.min((spent / c.allocation) * 100, 100) : 0;
                            const isOverBudget = spent > c.allocation;

                            return (
                                <tr key={c.id} className="hover:bg-gray-50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-gray-900">{c.name}</span>
                                            <span className="text-[10px] text-gray-400 font-medium">{categoryExpenses.length} transactions</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <div className="flex justify-between items-baseline mb-1">
                                                <span className={`text-sm font-black ${isOverBudget ? 'text-red-600' : 'text-gray-900'}`}>
                                                    Rs. {spent.toLocaleString()}
                                                </span>
                                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">
                                                    of Rs. {Number(c.allocation).toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full transition-all duration-700 ${isOverBudget ? 'bg-red-500' : percent > 80 ? 'bg-orange-400' : 'bg-green-500'}`}
                                                    style={{ width: `${percent}%` }}
                                                />
                                            </div>
                                            <div className="flex justify-between mt-1">
                                                <span className={`text-[9px] font-black ${isOverBudget ? 'text-red-500' : 'text-gray-400'}`}>
                                                    {percent.toFixed(1)}% USED
                                                </span>
                                                {isOverBudget && (
                                                    <span className="text-[9px] font-black text-red-500 animate-pulse">OVER BUDGET!</span>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleOpenModal(c)} className="text-indigo-600 hover:text-indigo-900 font-bold text-[10px] uppercase tracking-wider">Edit</button>
                                            <button onClick={() => handleDelete(c.id)} className="text-red-500 hover:text-red-700 font-bold text-[10px] uppercase tracking-wider">Delete</button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredCategories.length === 0 && (
                            <tr>
                                <td colSpan="3" className="px-6 py-10 text-center text-gray-400 italic text-sm">No categories found matching your search.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile View: Cards */}
            <div className="lg:hidden space-y-4">
                {filteredCategories.map(c => {
                    const categoryExpenses = dashboardData.expenses?.filter(e => e.category === c.id) || [];
                    const spent = categoryExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
                    const percent = c.allocation > 0 ? Math.min((spent / c.allocation) * 100, 100) : 0;
                    const isOverBudget = spent > c.allocation;

                    return (
                        <div key={c.id} className={`bg-white rounded-2xl p-4 border shadow-sm transition-all ${isOverBudget ? 'border-red-100 shadow-red-50' : 'border-gray-100'}`}>
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-bold text-gray-900 leading-tight mb-1 uppercase tracking-tight">{c.name}</h3>
                                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{categoryExpenses.length} Transactions Recorded</div>
                                </div>
                                {isOverBudget && (
                                    <div className="bg-red-50 text-red-600 px-2 py-1 rounded-lg text-[10px] font-black animate-pulse border border-red-100">
                                        OVER BUDGET
                                    </div>
                                )}
                            </div>

                            <div className="bg-gray-50 rounded-2xl p-4 mb-4">
                                <div className="flex justify-between items-end mb-2">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter leading-none mb-1">Spent Amount</span>
                                        <span className={`text-lg font-black leading-none ${isOverBudget ? 'text-red-600' : 'text-gray-900'}`}>
                                            Rs. {spent.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="text-right flex flex-col">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter leading-none mb-1">Total Allocation</span>
                                        <span className="text-sm font-bold text-gray-600 leading-none">Rs. {Number(c.allocation).toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="w-full bg-white h-2 rounded-full overflow-hidden border border-gray-100 p-0.5">
                                    <div
                                        className={`h-full rounded-full transition-all duration-1000 ${isOverBudget ? 'bg-red-500 shadow-sm shadow-red-200' : percent > 80 ? 'bg-orange-400' : 'bg-emerald-500'}`}
                                        style={{ width: `${percent}%` }}
                                    />
                                </div>
                                <div className="flex justify-between mt-1 text-[9px] font-black">
                                    <span className={isOverBudget ? 'text-red-500' : 'text-emerald-600'}>{percent.toFixed(1)}% USED</span>
                                    <span className="text-gray-400 uppercase tracking-widest">Budget Status</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => handleOpenModal(c)}
                                    className="py-2.5 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-all"
                                >
                                    Edit Category
                                </button>
                                <button
                                    onClick={() => handleDelete(c.id)}
                                    className="py-2.5 bg-red-50 text-red-600 rounded-xl text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-all"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    );
                })}
                {filteredCategories.length === 0 && (
                    <div className="py-10 text-center text-gray-400 italic bg-white rounded-2xl border-2 border-dashed border-gray-100">
                        No categories found matching your search.
                    </div>
                )}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`${editingItem ? 'Edit' : 'Add'} Category`}>
                <form onSubmit={handleSubmit} className="space-y-4 p-1">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Category Name</label>
                        <input
                            type="text"
                            value={formData.name || ''}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none"
                            placeholder="e.g. Construction Materials"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Allocation Budget (Rs.)</label>
                        <input
                            type="number"
                            value={formData.allocation || 0}
                            onChange={e => setFormData({ ...formData, allocation: e.target.value })}
                            className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none"
                            required
                        />
                    </div>
                    <div className="flex justify-end gap-3 mt-8">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700">Cancel</button>
                        <button type="submit" disabled={loading} className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 transition-all">
                            {loading ? 'Saving...' : (editingItem ? 'Update Category' : 'Create Category')}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default CategoriesTab;
