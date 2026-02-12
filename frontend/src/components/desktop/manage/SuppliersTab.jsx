import React, { useState } from 'react';
import { dashboardService } from '../../../services/api';
import Modal from '../../common/Modal';
import { useConstruction } from '../../../context/ConstructionContext';

const SuppliersTab = ({ searchQuery = '' }) => {
    const { dashboardData, refreshData } = useConstruction();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({});
    const [loading, setLoading] = useState(false);

    const filteredSuppliers = dashboardData.suppliers?.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.contact_person?.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    const handleOpenModal = (item = null) => {
        setEditingItem(item);
        if (item) {
            setFormData(item);
        } else {
            setFormData({ is_active: true });
        }
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm(`Are you sure you want to delete this Supplier?`)) return;
        try {
            await dashboardService.deleteSupplier(id);
            refreshData();
        } catch (error) {
            alert("Delete failed. This item might be linked to other records.");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (editingItem) await dashboardService.updateSupplier(editingItem.id, formData);
            else await dashboardService.createSupplier(formData);
            setIsModalOpen(false);
            refreshData();
        } catch (error) {
            alert("Save failed. Please check your data.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-2">
                <p className="text-sm text-gray-500">Manage material suppliers, contact persons, and payment credentials.</p>
                <button
                    onClick={() => handleOpenModal()}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors shadow-sm"
                >
                    + Add New Supplier
                </button>
            </div>

            {/* Desktop View: Table */}
            <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Supplier Profile</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Contact Details</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Billing & Payments</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filteredSuppliers.map(s => {
                            const percent = s.total_billed > 0 ? (s.total_paid / s.total_billed) * 100 : 0;
                            return (
                                <tr key={s.id} className="hover:bg-gray-50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            <div className="font-bold text-gray-900 leading-tight">{s.name}</div>
                                            <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[10px] font-bold uppercase w-fit border border-indigo-100">
                                                {s.category || 'General'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <div className="text-gray-900 font-semibold text-sm">{s.contact_person}</div>
                                            <div className="text-gray-500 text-xs flex items-center gap-1 mt-0.5">
                                                <span>{s.phone}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <div className="flex justify-between items-baseline mb-1">
                                                <span className="text-sm font-black text-gray-900">{s.total_paid?.toLocaleString()}</span>
                                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">of {s.total_billed?.toLocaleString()}</span>
                                            </div>
                                            <div className="w-full bg-gray-100 h-1 rounded-full overflow-hidden">
                                                <div className="bg-indigo-600 h-full transition-all duration-700" style={{ width: `${percent}%` }} />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleOpenModal(s)} className="text-indigo-600 hover:text-indigo-900 font-bold text-[10px] uppercase tracking-wider">Edit</button>
                                            <button onClick={() => handleDelete(s.id)} className="text-red-500 hover:text-red-700 font-bold text-[10px] uppercase tracking-wider">Delete</button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredSuppliers.length === 0 && (
                            <tr>
                                <td colSpan="4" className="px-6 py-10 text-center text-gray-400 italic text-sm">No suppliers found matching your query.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile View: Cards */}
            <div className="lg:hidden space-y-4">
                {filteredSuppliers.map(s => {
                    const percent = s.total_billed > 0 ? (s.total_paid / s.total_billed) * 100 : 0;
                    return (
                        <div key={s.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col gap-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest px-1.5 py-0.5 bg-indigo-50 rounded leading-none mb-2 inline-block">#{s.category || 'General'}</span>
                                    <h3 className="font-bold text-gray-900 text-base leading-tight">{s.name}</h3>
                                    <div className="text-[10px] text-gray-500 font-medium mt-1">{s.phone}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Total Bill</div>
                                    <div className="text-sm font-black text-gray-900 leading-none">{s.total_billed?.toLocaleString()}</div>
                                </div>
                            </div>

                            <div className="bg-gray-50 rounded-2xl p-4">
                                <div className="flex justify-between items-end mb-2">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter leading-none mb-1">Total Paid</span>
                                        <span className="text-lg font-black text-emerald-600 leading-none">{s.total_paid?.toLocaleString()}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] font-black text-indigo-600 uppercase tracking-tight">{Math.round(percent)}% CLEARED</span>
                                    </div>
                                </div>
                                <div className="w-full bg-white h-2 rounded-full overflow-hidden border border-gray-100 p-0.5 mb-2">
                                    <div className="bg-indigo-500 h-full rounded-full transition-all duration-1000" style={{ width: `${percent}%` }} />
                                </div>
                                {Number(s.balance_due) > 0 && (
                                    <div className="flex justify-between items-center text-[10px] font-black border-t border-gray-200 pt-2 mt-2">
                                        <span className="text-red-500 uppercase tracking-tighter">Outstanding Balance</span>
                                        <span className="text-red-600 font-black">{s.balance_due?.toLocaleString()}</span>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => handleOpenModal(s)} className="py-2.5 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-all">
                                    Edit Supplier
                                </button>
                                <button onClick={() => handleDelete(s.id)} className="py-2.5 bg-red-50 text-red-600 rounded-xl text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-all">
                                    Delete
                                </button>
                            </div>
                        </div>
                    );
                })}
                {filteredSuppliers.length === 0 && (
                    <div className="py-10 text-center text-gray-400 italic bg-white rounded-2xl border-2 border-dashed border-gray-100">
                        No suppliers found matching your query.
                    </div>
                )}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`${editingItem ? 'Edit' : 'Add'} Supplier`}>
                <form onSubmit={handleSubmit} className="space-y-4 p-1">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-1">
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Company/Supplier Name</label>
                            <input
                                type="text"
                                value={formData.name || ''}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none"
                                placeholder="e.g. ABC Hardware"
                                required
                            />
                        </div>
                        <div className="col-span-1">
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
                            <input
                                type="text"
                                value={formData.category || ''}
                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                                className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none"
                                placeholder="e.g. Cement, Steel"
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">PAN/VAT Number</label>
                            <input
                                type="text"
                                value={formData.pan_number || ''}
                                onChange={e => setFormData({ ...formData, pan_number: e.target.value })}
                                className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none font-mono"
                                placeholder="9-digit number"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Address</label>
                            <input
                                type="text"
                                value={formData.address || ''}
                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                                className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none"
                                placeholder="Location"
                            />
                        </div>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3">
                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Banking Information</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Bank Name</label>
                                <input
                                    type="text"
                                    value={formData.bank_name || ''}
                                    onChange={e => setFormData({ ...formData, bank_name: e.target.value })}
                                    className="w-full rounded-lg border-gray-200 shadow-sm focus:ring-1 focus:ring-indigo-500 p-2 text-sm border outline-none bg-white"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Account Number</label>
                                <input
                                    type="text"
                                    value={formData.account_number || ''}
                                    onChange={e => setFormData({ ...formData, account_number: e.target.value })}
                                    className="w-full rounded-lg border-gray-200 shadow-sm focus:ring-1 focus:ring-indigo-500 p-2 text-sm border outline-none bg-white font-mono"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Contact Person</label>
                            <input
                                type="text"
                                value={formData.contact_person || ''}
                                onChange={e => setFormData({ ...formData, contact_person: e.target.value })}
                                className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Phone Number</label>
                            <input
                                type="text"
                                value={formData.phone || ''}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none"
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Email Address</label>
                            <input
                                type="email"
                                value={formData.email || ''}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none"
                                placeholder="supplier@example.com"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Branch Location</label>
                            <input
                                type="text"
                                value={formData.branch || ''}
                                onChange={e => setFormData({ ...formData, branch: e.target.value })}
                                className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none"
                                placeholder="Main Branch"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-8">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700">Cancel</button>
                        <button type="submit" disabled={loading} className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 transition-all">
                            {loading ? 'Saving...' : (editingItem ? 'Update Supplier' : 'Create Supplier')}
                        </button>
                    </div>
                </form>
            </Modal>
        </div >
    );
};
export default SuppliersTab;
