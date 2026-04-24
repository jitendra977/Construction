import React, { useState, useEffect } from 'react';
import Modal from '../../../common/Modal';
import { accountingService } from '../../../../services/api';
import { useConstruction } from '../../../../context/ConstructionContext';

const JournalEntryFormModal = ({ isOpen, onClose, accounts = [] }) => {
    const { refreshData } = useConstruction();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        description: '',
        source: 'MANUAL',
        reference_id: '',
    });
    const [lines, setLines] = useState([
        { account: '', amount: '', entry_type: 'DEBIT', description: '' },
        { account: '', amount: '', entry_type: 'CREDIT', description: '' }
    ]);
    const [error, setError] = useState(null);

    const activeAccounts = accounts.filter(a => a.is_active);

    const debits = lines.filter(l => l.entry_type === 'DEBIT').reduce((acc, l) => acc + Number(l.amount || 0), 0);
    const credits = lines.filter(l => l.entry_type === 'CREDIT').reduce((acc, l) => acc + Number(l.amount || 0), 0);
    const isBalanced = debits.toFixed(2) === credits.toFixed(2);

    const addLine = () => {
        setLines([...lines, { account: '', amount: '', entry_type: 'DEBIT', description: '' }]);
    };

    const updateLine = (index, field, value) => {
        const newLines = [...lines];
        newLines[index][field] = value;
        setLines(newLines);
    };

    const removeLine = (index) => {
        if (lines.length <= 2) return;
        const newLines = lines.filter((_, i) => i !== index);
        setLines(newLines);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        if (!isBalanced) {
            setError('Journal entry must be balanced (Debits = Credits).');
            return;
        }
        if (lines.some(l => !l.account || !l.amount)) {
            setError('All lines must have an account and amount specified.');
            return;
        }
        if (debits <= 0) {
            setError('Amount must be greater than zero.');
            return;
        }

        setLoading(true);
        try {
            const dataToSubmit = {
                ...formData,
                lines: lines.map(l => ({ ...l, amount: Number(l.amount) }))
            };
            await accountingService.createJournalEntry(dataToSubmit);
            refreshData();
            onClose();
            setFormData({
                date: new Date().toISOString().split('T')[0], description: '', source: 'MANUAL', reference_id: ''
            });
            setLines([
                { account: '', amount: '', entry_type: 'DEBIT', description: '' },
                { account: '', amount: '', entry_type: 'CREDIT', description: '' }
            ]);
        } catch (err) {
            setError('Failed to create Journal Entry. ' + (err.response?.data?.error || err.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Create Journal Entry">
            <form onSubmit={handleSubmit} className="space-y-4 p-4 min-w-[500px]">
                {error && <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm font-bold">{error}</div>}
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-[var(--t-text2)] uppercase tracking-wider mb-1">Date</label>
                        <input
                            type="date" required
                            value={formData.date}
                            onChange={(e) => setFormData({...formData, date: e.target.value})}
                            className="w-full bg-[var(--t-surface)] border border-[var(--t-border)] p-2.5 rounded-xl font-bold text-[var(--t-text)] text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-[var(--t-text2)] uppercase tracking-wider mb-1">Reference ID</label>
                        <input
                            type="text"
                            value={formData.reference_id}
                            onChange={(e) => setFormData({...formData, reference_id: e.target.value})}
                            className="w-full bg-[var(--t-surface)] border border-[var(--t-border)] p-2.5 rounded-xl font-medium text-[var(--t-text)]"
                            placeholder="Optional"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-[var(--t-text2)] uppercase tracking-wider mb-1">Description / Memo</label>
                    <input
                        type="text" required
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        className="w-full bg-[var(--t-surface)] border border-[var(--t-border)] p-2.5 rounded-xl font-bold text-[var(--t-text)]"
                        placeholder="e.g. Initial Capital Investment"
                    />
                </div>

                <div className="mt-6 border border-[var(--t-border)] rounded-xl p-4 bg-[var(--t-surface)]">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-[var(--t-text)] text-sm uppercase tracking-wider">Line Items</h3>
                        <button type="button" onClick={addLine} className="text-xs bg-[var(--t-primary)]/10 text-[var(--t-primary)] px-2 py-1 rounded font-bold hover:bg-[var(--t-primary)]/20">
                            + Add Line
                        </button>
                    </div>

                    {lines.map((line, index) => (
                        <div key={index} className="flex gap-2 mb-2 items-end">
                            <div className="w-1/4">
                                <label className="block text-[10px] font-bold text-[var(--t-text2)] uppercase tracking-wider mb-1">Type</label>
                                <select 
                                    value={line.entry_type} 
                                    onChange={(e) => updateLine(index, 'entry_type', e.target.value)}
                                    className="w-full bg-[var(--t-surface2)] border border-[var(--t-border)] p-2 rounded tracking-wider text-xs font-bold text-[var(--t-text)]"
                                >
                                    <option value="DEBIT">DR (Debit)</option>
                                    <option value="CREDIT">CR (Credit)</option>
                                </select>
                            </div>
                            <div className="flex-1">
                                <label className="block text-[10px] font-bold text-[var(--t-text2)] uppercase tracking-wider mb-1">Account</label>
                                <select 
                                    value={line.account} 
                                    onChange={(e) => updateLine(index, 'account', e.target.value)}
                                    className="w-full bg-[var(--t-surface2)] border border-[var(--t-border)] p-2 rounded tracking-wider text-xs font-bold text-[var(--t-text)]"
                                >
                                    <option value="">Select Account...</option>
                                    {activeAccounts.map(a => (
                                        <option key={a.id} value={a.id}>{a.code} - {a.name} ({a.account_type})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="w-1/4">
                                <label className="block text-[10px] font-bold text-[var(--t-text2)] uppercase tracking-wider mb-1">Amount</label>
                                <input 
                                    type="number" min="0" step="0.01" 
                                    value={line.amount} 
                                    onChange={(e) => updateLine(index, 'amount', e.target.value)}
                                    placeholder="0.00"
                                    className="w-full bg-[var(--t-surface2)] border border-[var(--t-border)] p-2 rounded tracking-wider text-xs font-bold text-[var(--t-text)]"
                                />
                            </div>
                            <button type="button" onClick={() => removeLine(index)} disabled={lines.length <= 2} className="p-2 mb-[1px] rounded bg-red-100 text-red-600 hover:bg-red-200 disabled:opacity-50">
                                🗑️
                            </button>
                        </div>
                    ))}

                    <div className="mt-4 flex justify-between items-center bg-[var(--t-surface2)] p-3 rounded-lg">
                        <div className="font-mono text-sm">
                            <span className="text-[var(--t-text2)]">Total DR: </span>
                            <span className="font-bold text-[var(--t-text)]">{debits.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                        </div>
                        <div className="font-mono text-sm">
                            <span className="text-[var(--t-text2)]">Total CR: </span>
                            <span className="font-bold text-[var(--t-text)]">{credits.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                        </div>
                        <div className={`text-xs font-bold px-2 py-1 rounded ${isBalanced ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {isBalanced ? 'BALANCED' : 'OUT OF BALANCE'}
                        </div>
                    </div>
                </div>

                <div className="pt-4 flex gap-3">
                    <button type="button" onClick={onClose} className="flex-1 px-4 py-2 bg-[var(--t-surface2)] text-[var(--t-text)] rounded-xl font-bold hover:bg-[var(--t-border)]">Cancel</button>
                    <button type="submit" disabled={!isBalanced || loading} className="flex-1 px-4 py-2 bg-[var(--t-primary)] text-white rounded-xl font-bold shadow-md hover:-translate-y-0.5 transition-transform disabled:opacity-50">
                        {loading ? 'Processing...' : 'Post Entry'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default JournalEntryFormModal;
