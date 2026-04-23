import React, { useState, useEffect } from 'react';
import { accountingService } from '../../../services/accountingService';

const fmt = (v) => 'NPR ' + Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

const BudgetRevisionModal = ({ budgetLine, projectId, isOpen, onClose, onUpdate }) => {
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    const [revisions, setRevisions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen && budgetLine) {
            setAmount(budgetLine.budgeted || '0');
            setReason('');
            if (budgetLine.budget_line_id) loadRevisions();
            else setRevisions([]);
        }
    }, [isOpen, budgetLine]);

    const loadRevisions = async () => {
        setLoading(true);
        try {
            const res = await accountingService.getBudgetRevisions(budgetLine.budget_line_id);
            setRevisions(res.data);
        } catch (err) {
            console.error('Failed to load revisions', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await accountingService.updateBudget({
                project: projectId,
                phase: budgetLine.phase_id,
                budgeted_amount: amount,
                reason: reason || 'Budget allocation'
            });
            onUpdate();
            onClose();
        } catch (err) {
            console.error('Update failed', err);
            alert('Failed to update budget.');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white w-full max-w-xl rounded-xl shadow-xl border overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-5 py-4 border-b flex justify-between items-center bg-gray-50">
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-tight">Manage Budget Allocation</h3>
                        <p className="text-xs text-gray-500">{budgetLine?.phase_name}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>

                <div className="flex-1 overflow-y-auto p-5">
                    <form onSubmit={handleSave} className="space-y-4 mb-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Budgeted Amount (NPR)</label>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Reason / Note</label>
                                <input
                                    type="text"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="e.g. Initial setup"
                                    required
                                />
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={saving}
                                className="bg-blue-600 text-white px-5 py-2 rounded-lg text-xs font-bold hover:bg-blue-700 disabled:opacity-50"
                            >
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>

                    {budgetLine?.budget_line_id && (
                        <div className="space-y-3">
                            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b pb-1">Revision History</h4>
                            {loading ? (
                                <p className="text-xs text-gray-400">Loading history...</p>
                            ) : revisions.length === 0 ? (
                                <p className="text-xs text-gray-400 italic">No revisions found.</p>
                            ) : (
                                <div className="space-y-2">
                                    {revisions.map(rev => (
                                        <div key={rev.id} className="text-[11px] p-2 bg-gray-50 rounded border flex justify-between items-center">
                                            <div>
                                                <p className="font-bold text-gray-700">{rev.reason}</p>
                                                <p className="text-gray-400">{new Date(rev.date).toLocaleDateString()}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-blue-600 font-bold">{fmt(rev.new_amount)}</p>
                                                <p className="text-gray-400 line-through scale-90 origin-right">{fmt(rev.previous_amount)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BudgetRevisionModal;
