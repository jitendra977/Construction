import React, { useState } from 'react';
import Modal from '../../../common/Modal';
import { financeService } from '../../../../services/api';
import { useConstruction } from '../../../../context/ConstructionContext';

const BillFormModal = ({ isOpen, onClose, suppliers = [], contractors = [] }) => {
    const { refreshData } = useConstruction();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        bill_number: '',
        date_issued: new Date().toISOString().split('T')[0],
        due_date: new Date().toISOString().split('T')[0],
        vendor_type: 'SUPPLIER', // SUPPLIER or CONTRACTOR
        supplier: '',
        contractor: '',
        total_amount: '',
        notes: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (new Date(formData.due_date) < new Date(formData.date_issued)) {
            setError('Due date cannot be before the date issued.');
            return;
        }

        setLoading(true);
        try {
            const dataToSubmit = { ...formData };
            if (formData.vendor_type === 'SUPPLIER') {
                dataToSubmit.contractor = null;
            } else {
                dataToSubmit.supplier = null;
            }
            delete dataToSubmit.vendor_type;

            await financeService.createBill(dataToSubmit);
            refreshData();
            onClose();
            setFormData({
                bill_number: '',
                date_issued: new Date().toISOString().split('T')[0],
                due_date: new Date().toISOString().split('T')[0],
                vendor_type: 'SUPPLIER',
                supplier: '',
                contractor: '',
                total_amount: '',
                notes: ''
            });
        } catch (err) {
            const detail = err.response?.data;
            if (typeof detail === 'object') {
                const msgs = Object.entries(detail).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | ');
                setError(msgs);
            } else {
                setError(err.message || 'Failed to create bill.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Record Vendor Bill">
            <form onSubmit={handleSubmit} className="space-y-4 p-4 min-w-[400px]">
                {error && <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm font-bold">{error}</div>}
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-[var(--t-text2)] uppercase tracking-wider mb-1">Vendor Type</label>
                        <select
                            value={formData.vendor_type}
                            onChange={(e) => setFormData({...formData, vendor_type: e.target.value})}
                            className="w-full bg-[var(--t-surface)] border border-[var(--t-border)] p-2.5 rounded-xl font-bold text-[var(--t-text)]"
                        >
                            <option value="SUPPLIER">Material Supplier</option>
                            <option value="CONTRACTOR">Contractor / Labor</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-[var(--t-text2)] uppercase tracking-wider mb-1">Select Vendor</label>
                        <select
                            required
                            value={formData.vendor_type === 'SUPPLIER' ? formData.supplier : formData.contractor}
                            onChange={(e) => {
                                if(formData.vendor_type === 'SUPPLIER') setFormData({...formData, supplier: e.target.value});
                                else setFormData({...formData, contractor: e.target.value});
                            }}
                            className="w-full bg-[var(--t-surface)] border border-[var(--t-border)] p-2.5 rounded-xl font-bold text-[var(--t-text)]"
                        >
                            <option value="">Select...</option>
                            {formData.vendor_type === 'SUPPLIER' && suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            {formData.vendor_type === 'CONTRACTOR' && contractors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-[var(--t-text2)] uppercase tracking-wider mb-1">Bill Number <span className="font-normal text-[var(--t-text3)]">(optional)</span></label>
                        <input
                            type="text"
                            value={formData.bill_number}
                            onChange={(e) => setFormData({...formData, bill_number: e.target.value})}
                            className="w-full bg-[var(--t-surface)] border border-[var(--t-border)] p-2.5 rounded-xl font-bold text-[var(--t-text)] font-mono"
                            placeholder="INV-2049 (leave blank for auto)"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-[var(--t-text2)] uppercase tracking-wider mb-1">Total Amount (Rs.)</label>
                        <input
                            type="number" required min="0.01" step="0.01"
                            value={formData.total_amount}
                            onChange={(e) => setFormData({...formData, total_amount: e.target.value})}
                            className="w-full bg-[var(--t-surface)] border border-[var(--t-border)] p-2.5 rounded-xl font-bold text-[var(--t-text)] font-mono text-green-600"
                            placeholder="0.00"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-[var(--t-text2)] uppercase tracking-wider mb-1">Date Issued</label>
                        <input
                            type="date" required
                            value={formData.date_issued}
                            onChange={(e) => setFormData({...formData, date_issued: e.target.value})}
                            className="w-full bg-[var(--t-surface)] border border-[var(--t-border)] p-2.5 rounded-xl font-bold text-[var(--t-text)] text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-[var(--t-text2)] uppercase tracking-wider mb-1">Due Date</label>
                        <input
                            type="date" required
                            value={formData.due_date}
                            onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                            className="w-full bg-[var(--t-surface)] border border-[var(--t-border)] p-2.5 rounded-xl font-bold text-[var(--t-text)] text-sm"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-[var(--t-text2)] uppercase tracking-wider mb-1">Notes</label>
                    <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({...formData, notes: e.target.value})}
                        className="w-full bg-[var(--t-surface)] border border-[var(--t-border)] p-2.5 rounded-xl font-medium text-[var(--t-text)] text-sm"
                        placeholder="Optional details..."
                        rows="2"
                    />
                </div>

                <div className="pt-4 flex gap-3">
                    <button type="button" onClick={onClose} className="flex-1 px-4 py-2 bg-[var(--t-surface2)] text-[var(--t-text)] rounded-xl font-bold hover:bg-[var(--t-border)]">Cancel</button>
                    <button type="submit" disabled={loading} className="flex-1 px-4 py-2 bg-[var(--t-primary)] text-white rounded-xl font-bold shadow-md hover:-translate-y-0.5 transition-transform disabled:opacity-50">
                        {loading ? 'Saving...' : 'Record Bill'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default BillFormModal;
