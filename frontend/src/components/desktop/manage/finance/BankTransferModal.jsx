import React, { useState } from 'react';
import Modal from '../../../common/Modal';
import { financeService } from '../../../../services/api';
import { useConstruction } from '../../../../context/ConstructionContext';

const BankTransferModal = ({ isOpen, onClose, accounts = [] }) => {
    const { refreshData } = useConstruction();
    const [formData, setFormData] = useState({
        from_account: '',
        to_account: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        reference_id: '',
        notes: ''
    });
    const [loading, setLoading] = useState(false);

    const assetAccounts = accounts.filter(a => a.account_type === 'ASSET' && a.is_active);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await financeService.createBankTransfer(formData);
            refreshData();
            onClose();
            setFormData({
                from_account: '', to_account: '', amount: '',
                date: new Date().toISOString().split('T')[0], reference_id: '', notes: ''
            });
        } catch (err) {
            alert('Failed to process transfer. ' + (err.response?.data?.error || err.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Internal Bank Transfer (Treasury)">
            <form onSubmit={handleSubmit} className="space-y-4 p-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-[var(--t-text2)] uppercase tracking-wider mb-1">From Account (Debit)</label>
                        <select
                            required
                            value={formData.from_account}
                            onChange={(e) => setFormData({...formData, from_account: e.target.value})}
                            className="w-full bg-[var(--t-surface)] border border-[var(--t-border)] p-2.5 rounded-xl font-bold text-[var(--t-text)]"
                        >
                            <option value="">Select Origin...</option>
                            {assetAccounts.map(a => (
                                <option key={a.id} value={a.id} disabled={a.id.toString() === formData.to_account}>
                                    {a.name} (Bal: Rs. {parseFloat(a.current_balance||0).toLocaleString()})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-[var(--t-text2)] uppercase tracking-wider mb-1">To Account (Credit)</label>
                        <select
                            required
                            value={formData.to_account}
                            onChange={(e) => setFormData({...formData, to_account: e.target.value})}
                            className="w-full bg-[var(--t-surface)] border border-[var(--t-border)] p-2.5 rounded-xl font-bold text-[var(--t-text)]"
                        >
                            <option value="">Select Destination...</option>
                            {assetAccounts.map(a => (
                                <option key={a.id} value={a.id} disabled={a.id.toString() === formData.from_account}>
                                    {a.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-[var(--t-text2)] uppercase tracking-wider mb-1">Amount (Rs.)</label>
                        <input
                            type="number"
                            required
                            min="0.01" step="0.01"
                            value={formData.amount}
                            onChange={(e) => setFormData({...formData, amount: e.target.value})}
                            className="w-full bg-[var(--t-surface)] border border-[var(--t-border)] p-2.5 rounded-xl font-bold text-[var(--t-text)]"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-[var(--t-text2)] uppercase tracking-wider mb-1">Date</label>
                        <input
                            type="date"
                            required
                            value={formData.date}
                            onChange={(e) => setFormData({...formData, date: e.target.value})}
                            className="w-full bg-[var(--t-surface)] border border-[var(--t-border)] p-2.5 rounded-xl font-bold text-[var(--t-text)] text-sm"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-[var(--t-text2)] uppercase tracking-wider mb-1">Reference ID (Cheque / Trx #)</label>
                    <input
                        type="text"
                        value={formData.reference_id}
                        onChange={(e) => setFormData({...formData, reference_id: e.target.value})}
                        className="w-full bg-[var(--t-surface)] border border-[var(--t-border)] p-2.5 rounded-xl font-medium text-[var(--t-text)]"
                        placeholder="TRX-100293"
                    />
                </div>

                <div className="pt-4 flex gap-3">
                    <button type="button" onClick={onClose} className="flex-1 px-4 py-2 bg-[var(--t-surface2)] text-[var(--t-text)] rounded-xl font-bold hover:bg-[var(--t-border)]">Cancel</button>
                    <button type="submit" disabled={loading} className="flex-1 px-4 py-2 bg-[var(--t-primary)] text-white rounded-xl font-bold shadow-md hover:-translate-y-0.5 transition-transform disabled:opacity-50">
                        {loading ? 'Processing...' : 'Execute Transfer'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default BankTransferModal;
