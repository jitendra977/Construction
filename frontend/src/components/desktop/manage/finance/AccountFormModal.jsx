import React, { useState } from 'react';
import Modal from '../../../common/Modal';
import { accountingService } from '../../../../services/api';
import { useConstruction } from '../../../../context/ConstructionContext';

const AccountFormModal = ({ isOpen, onClose, account = null }) => {
    const { refreshData } = useConstruction();
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        account_type: 'EXPENSE',
        description: '',
        initial_balance: '',
        is_active: true
    });
    const [loading, setLoading] = useState(false);

    React.useEffect(() => {
        if (account && isOpen) {
            setFormData({
                name: account.name || '',
                code: account.code || '',
                account_type: account.account_type || 'EXPENSE',
                description: account.description || '',
                initial_balance: '', // Usually don't edit opening balance directly
                is_active: account.is_active ?? true
            });
        } else if (isOpen) {
            setFormData({ name: '', code: '', account_type: 'EXPENSE', description: '', initial_balance: '', is_active: true });
        }
    }, [account, isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (account) {
                await accountingService.updateAccount(account.id, formData);
            } else {
                await accountingService.createAccount(formData);
            }
            refreshData();
            onClose();
        } catch (err) {
            alert('Failed to save account. ' + (err.response?.data?.error || err.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={account ? "Edit Ledger Account" : "Create Ledger Account"}>
            <form onSubmit={handleSubmit} className="space-y-4 p-4 min-w-[400px]">
                <div>
                    <label className="block text-xs font-bold text-[var(--t-text2)] uppercase tracking-wider mb-1">Account Name</label>
                    <input
                        type="text" required
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full bg-[var(--t-surface)] border border-[var(--t-border)] p-2.5 rounded-xl font-bold text-[var(--t-text)]"
                        placeholder="e.g. Bank Loan, Labor Expenses"
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-[var(--t-text2)] uppercase tracking-wider mb-1">Code</label>
                        <input
                            type="text" required
                            value={formData.code}
                            onChange={(e) => setFormData({...formData, code: e.target.value})}
                            className="w-full bg-[var(--t-surface)] border border-[var(--t-border)] p-2.5 rounded-xl font-bold text-[var(--t-text)] font-mono"
                            placeholder="e.g. 5010"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-[var(--t-text2)] uppercase tracking-wider mb-1">Type</label>
                        <select
                            value={formData.account_type}
                            onChange={(e) => setFormData({...formData, account_type: e.target.value})}
                            className="w-full bg-[var(--t-surface)] border border-[var(--t-border)] p-2.5 rounded-xl font-bold text-[var(--t-text)]"
                        >
                            <option value="ASSET">Asset (Bank/Cash)</option>
                            <option value="LIABILITY">Liability (Payable/Loan)</option>
                            <option value="EQUITY">Equity (Capital)</option>
                            <option value="REVENUE">Revenue (Income)</option>
                            <option value="EXPENSE">Expense (Cost)</option>
                        </select>
                    </div>
                </div>

                {!account && (
                    <div>
                        <label className="block text-xs font-bold text-[var(--t-text2)] uppercase tracking-wider mb-1">Initial Balance (Optional Opening Entry)</label>
                        <div className="relative">
                            <span className="absolute left-3 top-2.5 text-[var(--t-text3)] font-bold text-sm">Rs.</span>
                            <input
                                type="number" step="0.01"
                                value={formData.initial_balance}
                                onChange={(e) => setFormData({...formData, initial_balance: e.target.value})}
                                className="w-full bg-[var(--t-surface)] border border-[var(--t-border)] pl-10 pr-4 py-2.5 rounded-xl font-bold text-[var(--t-text)] font-mono"
                                placeholder="0.00"
                            />
                        </div>
                        <p className="text-[10px] text-[var(--t-text3)] mt-1 ml-1">If set, a Journal Entry will be recorded against Owner's Equity.</p>
                    </div>
                )}

                <div>
                    <label className="block text-xs font-bold text-[var(--t-text2)] uppercase tracking-wider mb-1">Description</label>
                    <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        className="w-full bg-[var(--t-surface)] border border-[var(--t-border)] p-2.5 rounded-xl font-medium text-[var(--t-text)] text-sm"
                        placeholder="Optional details"
                        rows="2"
                    />
                </div>
                <div className="pt-4 flex gap-3">
                    <button type="button" onClick={onClose} className="flex-1 px-4 py-2 bg-[var(--t-surface2)] text-[var(--t-text)] rounded-xl font-bold hover:bg-[var(--t-border)]">Cancel</button>
                    <button type="submit" disabled={loading} className="flex-1 px-4 py-2 bg-[var(--t-primary)] text-white rounded-xl font-bold shadow-md hover:-translate-y-0.5 transition-transform disabled:opacity-50">
                        {loading ? 'Saving...' : (account ? 'Update Account' : 'Create Account')}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default AccountFormModal;
