import React, { useState, useEffect } from 'react';
import { accountingService } from '../../../services/accountingService';

const BankAccountModal = ({ bank, projectId, isOpen, onClose, onSuccess }) => {
    const [name, setName] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [initialBalance, setInitialBalance] = useState('0');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setName(bank?.name || '');
            setAccountNumber(bank?.account_number || '');
            setInitialBalance(bank?.balance || '0');
        }
    }, [isOpen, bank]);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (bank) {
                await accountingService.updateBank(bank.id, { name, account_number: accountNumber });
            } else {
                await accountingService.createBank({ 
                    name, 
                    account_number: accountNumber, 
                    balance: Number(initialBalance),
                    project: projectId 
                });
            }
            onSuccess();
            onClose();
        } catch (err) {
            console.error('Bank save failed', err);
            alert('Failed to save bank account.');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white w-full max-w-md rounded-xl shadow-xl border overflow-hidden flex flex-col">
                <div className="px-5 py-4 border-b flex justify-between items-center bg-gray-50">
                    <h3 className="text-sm font-bold text-gray-900 uppercase">{bank ? 'Edit Bank Account' : 'New Bank Account'}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>

                <form onSubmit={handleSave} className="p-5 space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase">Bank Name</label>
                        <input 
                            type="text" 
                            value={name} 
                            onChange={e => setName(e.target.value)} 
                            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                            placeholder="e.g. Nabil Bank, Petty Cash"
                            required 
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase">Account Number</label>
                        <input 
                            type="text" 
                            value={accountNumber} 
                            onChange={e => setAccountNumber(e.target.value)} 
                            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                            placeholder="Optional"
                        />
                    </div>
                    {!bank && (
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Opening Balance (NPR)</label>
                            <input 
                                type="number" 
                                value={initialBalance} 
                                onChange={e => setInitialBalance(e.target.value)} 
                                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                                required 
                            />
                        </div>
                    )}
                    <div className="pt-4 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-5 py-2 text-xs font-bold text-gray-500 uppercase">Cancel</button>
                        <button 
                            type="submit" 
                            disabled={saving}
                            className="bg-blue-600 text-white px-8 py-2 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-blue-700 disabled:opacity-50"
                        >
                            {saving ? 'Saving...' : 'Save Account'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default BankAccountModal;
