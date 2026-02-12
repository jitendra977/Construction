import React, { useState } from 'react';
import { dashboardService } from '../../../services/api';
import Modal from '../../common/Modal';
import { useConstruction } from '../../../context/ConstructionContext';

const ContractorsTab = ({ searchQuery = '' }) => {
    const { dashboardData, refreshData } = useConstruction();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({});
    const [loading, setLoading] = useState(false);

    const filteredContractors = dashboardData.contractors?.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.skills?.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    const handleOpenModal = (item = null) => {
        setEditingItem(item);
        if (item) {
            setFormData(item);
        } else {
            setFormData({ is_active: true, role: 'LABOUR' });
        }
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm(`Are you sure you want to delete this Contractor?`)) return;
        try {
            await dashboardService.deleteContractor(id);
            refreshData();
        } catch (error) {
            alert("Delete failed. This item might be linked to other records.");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (editingItem) await dashboardService.updateContractor(editingItem.id, formData);
            else await dashboardService.createContractor(formData);
            setIsModalOpen(false);
            refreshData();
        } catch (error) {
            alert("Save failed. Please check your data.");
        } finally {
            setLoading(false);
        }
    };

    const getRoleColor = (role) => {
        const colors = {
            'THEKEDAAR': 'bg-purple-100 text-purple-700 border-purple-200',
            'ENGINEER': 'bg-blue-100 text-blue-700 border-blue-200',
            'MISTRI': 'bg-orange-100 text-orange-700 border-orange-200',
            'LABOUR': 'bg-gray-100 text-gray-700 border-gray-200',
            'ELECTRICIAN': 'bg-yellow-100 text-yellow-700 border-yellow-200',
            'PLUMBER': 'bg-cyan-100 text-cyan-700 border-cyan-200',
        };
        return colors[role] || 'bg-gray-100 text-gray-700 border-gray-200';
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-2">
                <p className="text-sm text-gray-500">Manage site contractors, roles, and contact credentials.</p>
                <button
                    onClick={() => handleOpenModal()}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors shadow-sm"
                >
                    + Add New Contractor
                </button>
            </div>

            {/* Desktop View: Table */}
            <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Contractor Profile</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Role & Status</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Paid / Total</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filteredContractors.map(c => {
                            const percent = c.total_amount > 0 ? (c.total_paid / c.total_amount) * 100 : 0;
                            return (
                                <tr key={c.id} className="hover:bg-gray-50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold border border-indigo-100 shadow-sm">
                                                {c.name.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-bold text-gray-900">{c.name}</div>
                                                <div className="text-[10px] text-gray-400 font-medium uppercase truncate max-w-[150px]">
                                                    {c.skills || 'No specialization listed'}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1.5">
                                            <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase w-fit ${getRoleColor(c.role)}`}>
                                                {c.role}
                                            </span>
                                            <div className="flex items-center gap-1.5">
                                                <div className={`w-1.5 h-1.5 rounded-full ${c.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                                                <span className="text-[10px] text-gray-500 font-medium">
                                                    {c.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <div className="flex justify-between items-baseline mb-1">
                                                <span className="text-sm font-black text-gray-900">{c.total_paid?.toLocaleString()}</span>
                                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">of {c.total_amount?.toLocaleString()}</span>
                                            </div>
                                            <div className="w-full bg-gray-100 h-1 rounded-full overflow-hidden">
                                                <div className="bg-emerald-500 h-full transition-all duration-700" style={{ width: `${percent}%` }} />
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
                        {filteredContractors.length === 0 && (
                            <tr>
                                <td colSpan="4" className="px-6 py-10 text-center text-gray-400 italic text-sm">No contractors found matching your search.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile View: Cards */}
            <div className="lg:hidden space-y-4">
                {filteredContractors.map(c => {
                    const percent = c.total_amount > 0 ? (c.total_paid / c.total_amount) * 100 : 0;
                    return (
                        <div key={c.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col gap-4">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold border border-indigo-100">
                                        {c.name.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <h3 className="font-bold text-gray-900 text-base leading-tight">{c.name}</h3>
                                            <div className={`w-1.5 h-1.5 rounded-full ${c.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                                        </div>
                                        <div className={`px-2 py-0.5 rounded border text-[8px] font-black uppercase w-fit inline-block leading-none ${getRoleColor(c.role)}`}>
                                            {c.role}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Total Pay</div>
                                    <div className="text-sm font-black text-gray-900 leading-none">{c.total_amount?.toLocaleString()}</div>
                                </div>
                            </div>

                            <div className="bg-gray-50 rounded-2xl p-4">
                                <div className="flex justify-between items-end mb-2">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter leading-none mb-1">Payments Made</span>
                                        <span className="text-lg font-black text-indigo-600 leading-none">{c.total_paid?.toLocaleString()}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-tight">{Math.round(percent)}% PAID</span>
                                    </div>
                                </div>
                                <div className="w-full bg-white h-2 rounded-full overflow-hidden border border-gray-100 p-0.5 mb-2">
                                    <div className="bg-emerald-500 h-full rounded-full transition-all duration-1000" style={{ width: `${percent}%` }} />
                                </div>
                                {Number(c.balance_due) > 0 && (
                                    <div className="flex justify-between items-center text-[10px] font-black border-t border-gray-200 pt-2 mt-2">
                                        <span className="text-red-500 uppercase tracking-tighter">Remaining Balance</span>
                                        <span className="text-red-600">{c.balance_due?.toLocaleString()}</span>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => handleOpenModal(c)} className="py-2.5 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-all">
                                    Edit Details
                                </button>
                                <button onClick={() => handleDelete(c.id)} className="py-2.5 bg-red-50 text-red-600 rounded-xl text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-all">
                                    Delete
                                </button>
                            </div>
                        </div>
                    );
                })}
                {filteredContractors.length === 0 && (
                    <div className="py-10 text-center text-gray-400 italic bg-white rounded-2xl border-2 border-dashed border-gray-100">
                        No contractors found matching your search.
                    </div>
                )}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`${editingItem ? 'Edit' : 'Add'} Contractor`}>
                <form onSubmit={handleSubmit} className="space-y-4 p-1">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Contractor Name</label>
                            <input
                                type="text"
                                value={formData.name || ''}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none"
                                placeholder="e.g. Ramesh Mistri"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Role</label>
                            <select
                                value={formData.role || 'LABOUR'}
                                onChange={e => setFormData({ ...formData, role: e.target.value })}
                                className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none appearance-none bg-white"
                                required
                            >
                                <option value="THEKEDAAR">Thekedaar</option>
                                <option value="ENGINEER">Civil Engineer</option>
                                <option value="MISTRI">Mistri/Mason</option>
                                <option value="LABOUR">Labour/Helper</option>
                                <option value="ELECTRICIAN">Electrician</option>
                                <option value="PLUMBER">Plumber</option>
                                <option value="CARPENTER">Carpenter</option>
                                <option value="PAINTER">Painter</option>
                                <option value="TILE_MISTRI">Tile/Marble</option>
                                <option value="WELDER">Welder</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Phone Number</label>
                            <input
                                type="text"
                                value={formData.phone || ''}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none"
                                placeholder="+977"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Email Address</label>
                            <input
                                type="email"
                                value={formData.email || ''}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none"
                                placeholder="example@gmail.com"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Citizenship No.</label>
                            <input
                                type="text"
                                value={formData.citizenship_number || ''}
                                onChange={e => setFormData({ ...formData, citizenship_number: e.target.value })}
                                className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Daily Rate (Optional)</label>
                            <input
                                type="number"
                                value={formData.rate || ''}
                                onChange={e => setFormData({ ...formData, rate: e.target.value })}
                                className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none"
                                placeholder="e.g. 1500"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Skills (e.g. Masonry, Painting)</label>
                        <input
                            type="text"
                            value={formData.skills || ''}
                            onChange={e => setFormData({ ...formData, skills: e.target.value })}
                            className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 p-3 border outline-none"
                        />
                    </div>
                    <div className="flex items-center gap-2 py-2">
                        <input
                            type="checkbox"
                            id="is_active"
                            checked={formData.is_active ?? true}
                            onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                            className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                        <label htmlFor="is_active" className="text-sm font-medium text-gray-700 underline decoration-dotted">Active On Site</label>
                    </div>
                    <div className="flex justify-end gap-3 mt-8">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700">Cancel</button>
                        <button type="submit" disabled={loading} className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 transition-all">
                            {loading ? 'Saving...' : (editingItem ? 'Update Contractor' : 'Create Contractor')}
                        </button>
                    </div>
                </form>
            </Modal>
        </div >
    );
};
export default ContractorsTab;
