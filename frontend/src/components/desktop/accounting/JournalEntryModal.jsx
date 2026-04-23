import React, { useState, useEffect } from 'react';
import { accountingService } from '../../../services/accountingService';

const JournalEntryModal = ({ accounts, isOpen, onClose, onSuccess }) => {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [description, setDescription] = useState('');
    const [lines, setLines] = useState([
        { account_id: '', entry_type: 'DEBIT', amount: '' },
        { account_id: '', entry_type: 'CREDIT', amount: '' }
    ]);
    const [saving, setSaving] = useState(false);

    const totalDebit = lines.filter(l => l.entry_type === 'DEBIT').reduce((s, l) => s + Number(l.amount || 0), 0);
    const totalCredit = lines.filter(l => l.entry_type === 'CREDIT').reduce((s, l) => s + Number(l.amount || 0), 0);
    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

    const addLine = () => setLines([...lines, { account_id: '', entry_type: 'DEBIT', amount: '' }]);
    const removeLine = (idx) => setLines(lines.filter((_, i) => i !== idx));
    const updateLine = (idx, field, val) => {
        const newLines = [...lines];
        newLines[idx][field] = val;
        setLines(newLines);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!isBalanced) return;
        setSaving(true);
        try {
            await accountingService.createJournalEntry({
                date,
                description,
                lines: lines.map(l => ({ ...l, amount: Number(l.amount) }))
            });
            onSuccess();
            onClose();
        } catch (err) {
            console.error('Entry creation failed', err);
            alert('Failed to post entry: ' + (err.response?.data?.error || err.message));
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white w-full max-w-4xl rounded-xl shadow-xl border overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-5 py-4 border-b flex justify-between items-center bg-gray-50">
                    <h3 className="text-sm font-bold text-gray-900 uppercase">New Journal Entry / नयाँ जर्नल प्रविष्टि</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>

                <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 flex flex-col">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Transaction Date</label>
                            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" required />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Description</label>
                            <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. Bank adjustment, Correction..." required />
                        </div>
                    </div>

                    <div className="flex-1">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="border-b">
                                    <th className="py-2 text-left text-[10px] font-bold text-gray-400 uppercase">Account</th>
                                    <th className="py-2 text-left text-[10px] font-bold text-gray-400 uppercase w-28">Type</th>
                                    <th className="py-2 text-right text-[10px] font-bold text-gray-400 uppercase w-32">Debit</th>
                                    <th className="py-2 text-right text-[10px] font-bold text-gray-400 uppercase w-32">Credit</th>
                                    <th className="py-2 w-10"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {lines.map((line, idx) => (
                                    <tr key={idx} className="border-b last:border-0 group">
                                        <td className="py-2 pr-2">
                                            <select 
                                                value={line.account_id} 
                                                onChange={e => updateLine(idx, 'account_id', e.target.value)}
                                                className="w-full border-none focus:ring-0 text-sm bg-transparent"
                                                required
                                            >
                                                <option value="">Select Account...</option>
                                                {accounts.map(a => <option key={a.id} value={a.id}>[{a.code}] {a.name}</option>)}
                                            </select>
                                        </td>
                                        <td className="py-2 pr-2">
                                            <select 
                                                value={line.entry_type} 
                                                onChange={e => updateLine(idx, 'entry_type', e.target.value)}
                                                className={`w-full border-none focus:ring-0 text-[10px] font-bold uppercase rounded p-1 ${line.entry_type === 'DEBIT' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}
                                            >
                                                <option value="DEBIT">Debit</option>
                                                <option value="CREDIT">Credit</option>
                                            </select>
                                        </td>
                                        <td className="py-2 pr-2">
                                            {line.entry_type === 'DEBIT' && (
                                                <input 
                                                    type="number" 
                                                    value={line.amount} 
                                                    onChange={e => updateLine(idx, 'amount', e.target.value)}
                                                    className="w-full border-none focus:ring-0 text-sm text-right font-mono"
                                                    placeholder="0.00"
                                                    required
                                                />
                                            )}
                                        </td>
                                        <td className="py-2 pr-2">
                                            {line.entry_type === 'CREDIT' && (
                                                <input 
                                                    type="number" 
                                                    value={line.amount} 
                                                    onChange={e => updateLine(idx, 'amount', e.target.value)}
                                                    className="w-full border-none focus:ring-0 text-sm text-right font-mono text-emerald-600"
                                                    placeholder="0.00"
                                                    required
                                                />
                                            )}
                                        </td>
                                        <td className="py-2 text-center">
                                            {lines.length > 2 && (
                                                <button type="button" onClick={() => removeLine(idx)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">✕</button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="font-bold text-sm bg-gray-50/50">
                                    <td colSpan={2} className="py-3 px-2">
                                        <button type="button" onClick={addLine} className="text-blue-600 hover:underline text-[10px] uppercase">+ Add Line</button>
                                    </td>
                                    <td className="py-3 pr-2 text-right font-mono text-blue-600 border-t-2">{totalDebit.toLocaleString()}</td>
                                    <td className="py-3 pr-2 text-right font-mono text-emerald-600 border-t-2">{totalCredit.toLocaleString()}</td>
                                    <td className="py-3"></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {!isBalanced && totalDebit > 0 && (
                        <p className="text-[10px] font-bold text-red-500 mt-2 uppercase text-center">Entry is out of balance by {(totalDebit - totalCredit).toLocaleString()}</p>
                    )}

                    <div className="mt-8 flex justify-end gap-3 pt-4 border-t">
                        <button type="button" onClick={onClose} className="px-5 py-2 text-xs font-bold text-gray-500 uppercase">Cancel</button>
                        <button 
                            type="submit" 
                            disabled={!isBalanced || saving}
                            className="bg-gray-900 text-white px-8 py-2 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-black disabled:opacity-50"
                        >
                            {saving ? 'Posting...' : 'Post Entry'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default JournalEntryModal;
