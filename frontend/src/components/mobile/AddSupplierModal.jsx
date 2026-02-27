import React, { useState } from 'react';
import { useConstruction } from '../../context/ConstructionContext';
import { dashboardService } from '../../services/api';
import Modal from '../common/Modal';

const AddSupplierModal = ({ isOpen, onClose }) => {
    const { refreshData } = useConstruction();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        category: '',
        contact_person: '',
        phone: '',
        email: '',
        address: '',
        pan_number: '',
        bank_name: '',
        account_number: '',
        branch: '',
        is_active: true
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await dashboardService.createSupplier(formData);
            refreshData();
            onClose();
            // Reset form
            setFormData({
                name: '',
                category: '',
                contact_person: '',
                phone: '',
                email: '',
                address: '',
                pan_number: '',
                bank_name: '',
                account_number: '',
                branch: '',
                is_active: true
            });
        } catch (error) {
            alert('Failed to save supplier. Please check your inputs.');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add New Supplier">
            <form onSubmit={handleSubmit} className="space-y-5 p-1">
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Company / Supplier Name</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full bg-gray-50 border-none rounded-xl p-3.5 text-sm font-black text-gray-900 focus:ring-2 focus:ring-indigo-500 transition-all font-sans"
                            placeholder="e.g. ABC Hardware & Traders"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Category</label>
                            <input
                                type="text"
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-indigo-500 transition-all"
                                placeholder="Cement, Steel..."
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Phone</label>
                            <input
                                type="text"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-indigo-500 transition-all"
                                placeholder="+977"
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Contact Person</label>
                            <input
                                type="text"
                                value={formData.contact_person}
                                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                                className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-indigo-500 transition-all"
                                placeholder="Proprietor Name"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">PAN/VAT</label>
                            <input
                                type="text"
                                value={formData.pan_number}
                                onChange={(e) => setFormData({ ...formData, pan_number: e.target.value })}
                                className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
                                placeholder="9 Digits"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Address</label>
                        <input
                            type="text"
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            className="w-full bg-gray-50 border-none rounded-xl p-3.5 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-indigo-500 transition-all"
                            placeholder="Supplier Location"
                        />
                    </div>

                    <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50 space-y-3">
                        <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Banking Details (Payment Memo)</h4>
                        <div className="grid grid-cols-2 gap-3">
                            <input
                                type="text"
                                value={formData.bank_name}
                                onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                                className="w-full bg-white/70 border-none rounded-xl p-2.5 text-xs font-bold text-gray-700 focus:ring-2 focus:ring-indigo-500 transition-all"
                                placeholder="Bank Name"
                            />
                            <input
                                type="text"
                                value={formData.account_number}
                                onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                                className="w-full bg-white/70 border-none rounded-xl p-2.5 text-xs font-bold text-gray-700 focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
                                placeholder="Account No."
                            />
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-4 text-xs font-black text-gray-400 uppercase tracking-[0.2em] hover:text-gray-600 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-indigo-100 active:scale-95 transition-all disabled:opacity-50"
                    >
                        {loading ? 'Creating...' : 'Register Supplier'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default AddSupplierModal;
