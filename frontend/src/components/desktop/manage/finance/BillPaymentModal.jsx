import React, { useState, useEffect } from 'react';
import Modal from '../../../common/Modal';
import { accountingService } from '../../../../services/api';
import { useConstruction } from '../../../../context/ConstructionContext';

const BillPaymentModal = ({ isOpen, onClose, bill, accounts = [] }) => {
    const { refreshData } = useConstruction();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        amount: '',
        date: new Date().toISOString().split('T')[0],
        method: 'CASH',
        account: '',
        reference_id: '',
    });
    const [error, setError] = useState(null);

    // Filter for Asset accounts (Bank/Cash)
    const assetAccounts = accounts.filter(a => a.account_type === 'ASSET' && a.is_active);
    const balanceDue = parseFloat(bill?.balance_due ?? (bill?.total_amount - (bill?.amount_paid || 0)) ?? 0);

    useEffect(() => {
        if (bill) {
            setError(null);
            setFormData(prev => ({
                ...prev,
                amount: balanceDue > 0 ? balanceDue.toFixed(2) : '',
                account: '',
                reference_id: '',
            }));
        }
    }, [bill]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        
        if (!formData.account) {
            setError('Please select a payment account (Bank/Cash).');
            return;
        }
        if (Number(formData.amount) <= 0) {
            setError('Payment amount must be greater than zero.');
            return;
        }
        if (Number(formData.amount) > balanceDue + 0.005) {
            setError(`Amount cannot exceed the balance due (Rs. ${balanceDue.toLocaleString()}).`);
            return;
        }

        setLoading(true);
        try {
            const dataToSubmit = {
                bill: bill.id,
                ...formData,
                amount: Number(formData.amount)
            };
            await accountingService.createPayment(dataToSubmit);
            refreshData();
            onClose();
        } catch (err) {
            setError('Failed to record payment. ' + (err.response?.data?.error || err.message));
        } finally {
            setLoading(false);
        }
    };

    if (!bill) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Pay Bill: ${bill.bill_number || bill.id}`}>
            <form onSubmit={handleSubmit} className="space-y-4 p-4 min-w-[400px]">
                {error && <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm font-bold">{error}</div>}
                
                <div className="bg-[var(--t-surface2)] p-4 rounded-xl border border-[var(--t-border)] mb-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <div className="text-[10px] font-black text-[var(--t-text3)] uppercase tracking-widest mb-1">Supplier / Contractor</div>
                            <div className="text-sm font-black text-[var(--t-text)]">{bill.supplier_name || bill.contractor_name || 'Generic Vendor'}</div>
                        </div>
                        <div className="text-right">
                            <div className="text-[10px] font-black text-[var(--t-text3)] uppercase tracking-widest mb-1">Balance Due</div>
                            <div className="text-sm font-black text-rose-500 font-mono">Rs. {balanceDue.toLocaleString()}</div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-[var(--t-text2)] uppercase tracking-wider mb-1">Payment Amount</label>
                        <input
                            type="number" required min="0.01" step="0.01" max={balanceDue}
                            value={formData.amount}
                            onChange={(e) => setFormData({...formData, amount: e.target.value})}
                            className="w-full bg-[var(--t-surface)] border border-[var(--t-border)] p-2.5 rounded-xl font-bold text-[var(--t-text)] font-mono text-green-600"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-[var(--t-text2)] uppercase tracking-wider mb-1">Date</label>
                        <input
                            type="date" required
                            value={formData.date}
                            onChange={(e) => setFormData({...formData, date: e.target.value})}
                            className="w-full bg-[var(--t-surface)] border border-[var(--t-border)] p-2.5 rounded-xl font-bold text-[var(--t-text)] text-sm"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-[var(--t-text2)] uppercase tracking-wider mb-1">Pay From Account (Bank/Cash)</label>
                    <select
                        required
                        value={formData.account}
                        onChange={(e) => setFormData({...formData, account: e.target.value})}
                        className="w-full bg-[var(--t-surface)] border border-[var(--t-border)] p-2.5 rounded-xl font-bold text-[var(--t-text)]"
                    >
                        <option value="">Select Account...</option>
                        {assetAccounts.map(a => (
                            <option key={a.id} value={a.id}>{a.code} - {a.name} (Bal: Rs. {a.current_balance?.toLocaleString()})</option>
                        ))}
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-[var(--t-text2)] uppercase tracking-wider mb-1">Method</label>
                        <select
                            value={formData.method}
                            onChange={(e) => setFormData({...formData, method: e.target.value})}
                            className="w-full bg-[var(--t-surface)] border border-[var(--t-border)] p-2.5 rounded-xl font-bold text-[var(--t-text)]"
                        >
                            <option value="CASH">Cash</option>
                            <option value="BANK_TRANSFER">Bank Transfer</option>
                            <option value="CHECK">Cheque</option>
                            <option value="OTHER">Other</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-[var(--t-text2)] uppercase tracking-wider mb-1">Reference ID</label>
                        <input
                            type="text"
                            value={formData.reference_id}
                            onChange={(e) => setFormData({...formData, reference_id: e.target.value})}
                            className="w-full bg-[var(--t-surface)] border border-[var(--t-border)] p-2.5 rounded-xl font-medium text-[var(--t-text)]"
                            placeholder="Check # or Txn ID"
                        />
                    </div>
                </div>

                <div className="pt-4 flex gap-3">
                    <button type="button" onClick={onClose} className="flex-1 px-4 py-2 bg-[var(--t-surface2)] text-[var(--t-text)] rounded-xl font-bold hover:bg-[var(--t-border)]">Cancel</button>
                    <button type="submit" disabled={loading} className="flex-1 px-4 py-2 bg-green-600 text-white rounded-xl font-bold shadow-md hover:-translate-y-0.5 transition-transform disabled:opacity-50">
                        {loading ? 'Processing...' : 'Post Payment'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default BillPaymentModal;
