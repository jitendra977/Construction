import React, { useState, useEffect } from 'react';
import { accountingService } from '../../../services/accountingService';

const fmt = (v) => 'NPR ' + Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

const inp = 'w-full px-3 py-2 text-sm rounded-lg border border-[var(--t-border)] bg-[var(--t-surface)] text-[var(--t-text)] focus:outline-none focus:ring-2 focus:ring-[#ea580c]/30';
const lbl = 'block text-xs font-bold text-[var(--t-text2)] mb-1';

const EMPTY_TRANSFER = { date: '', from_bank: '', to_bank: '', amount: '', reference: '' };

const TreasuryTab = ({ projectId }) => {
    const [banks, setBanks] = useState([]);
    const [transfers, setTransfers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(EMPTY_TRANSFER);
    const [saving, setSaving] = useState(false);

    const labels = {
        en: {
            banks: 'Bank Accounts', banksDesc: 'Cash and bank balances',
            transfers: 'Recent Transfers', addTransfer: '+ Add Transfer',
            from: 'From Bank', to: 'To Bank', amount: 'Amount', ref: 'Reference', date: 'Date',
            cancel: 'Cancel', save: 'Save Transfer', bal: 'Balance',
            noTransfers: 'No transfers recorded yet.',
            noBanks: 'No bank accounts found.',
        },
        np: {
            banks: 'बैंक खाताहरू', banksDesc: 'नगद र बैंक मौज्दात',
            transfers: 'हालका स्थानान्तरण', addTransfer: '+ स्थानान्तरण थप्नुहोस्',
            from: 'कहाँबाट', to: 'कहाँ', amount: 'रकम', ref: 'सन्दर्भ', date: 'मिति',
            cancel: 'रद्द', save: 'सेभ गर्नुहोस्', bal: 'मौज्दात',
            noTransfers: 'कुनै स्थानान्तरण छैन।',
            noBanks: 'कुनै बैंक खाता फेला परेन।',
        },
    }.en;

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [bRes, tRes] = await Promise.all([
                accountingService.getBanks(),
                accountingService.getTransfers(),
            ]);
            setBanks(Array.isArray(bRes.data) ? bRes.data : []);
            setTransfers(Array.isArray(tRes.data) ? tRes.data : []);
        } catch (err) {
            setError('Failed to load treasury data.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await accountingService.createTransfer({
                ...form,
                amount: Number(form.amount),
                from_bank: Number(form.from_bank),
                to_bank: Number(form.to_bank),
            });
            setShowForm(false);
            setForm(EMPTY_TRANSFER);
            loadData();
        } catch (err) {
            alert('Transfer failed: ' + (err.response?.data?.error || err.message));
        } finally {
            setSaving(false);
        }
    };

    const bankName = (id) => banks.find(b => String(b.id) === String(id))?.name || id;

    if (loading) return <div className="p-10 text-center text-[var(--t-text3)] text-sm">Loading treasury data...</div>;
    if (error) return <div className="p-10 text-center text-red-500 text-sm">{error}</div>;

    return (
        <div className="space-y-8">
            {/* Bank Cards */}
            <section>
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h3 className="text-base font-black text-[var(--t-text)]">{labels.banks}</h3>
                        <p className="text-sm text-[var(--t-text3)]">{labels.banksDesc}</p>
                    </div>
                </div>
                {banks.length === 0 ? (
                    <div className="p-8 border-2 border-dashed border-[var(--t-border)] rounded-xl text-center text-[var(--t-text3)] text-sm">{labels.noBanks}</div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {banks.map(b => (
                            <div key={b.id} className="bg-[var(--t-surface)] border border-[var(--t-border)] rounded-xl shadow-sm p-5 flex flex-col gap-2">
                                <div className="flex items-start justify-between">
                                    <p className="font-bold text-[var(--t-text)]">{b.name}</p>
                                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-[var(--t-surface2)] rounded text-[var(--t-text3)] border border-[var(--t-border)]">Bank</span>
                                </div>
                                <p className="text-xs font-mono text-[var(--t-text3)]">{b.account_number || '—'}</p>
                                <div className="mt-2 pt-2 border-t border-[var(--t-border)]">
                                    <p className="text-[10px] font-black uppercase text-[var(--t-text3)] mb-1">{labels.bal}</p>
                                    <p className="text-xl font-black text-emerald-600">{fmt(b.balance)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* Transfers */}
            <section>
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h3 className="text-base font-black text-[var(--t-text)]">{labels.transfers}</h3>
                    </div>
                    <button
                        onClick={() => setShowForm(v => !v)}
                        className="px-4 py-2 bg-[#ea580c] text-white text-sm font-bold rounded-xl hover:bg-orange-700 transition-colors"
                    >{labels.addTransfer}</button>
                </div>

                {/* Inline Form */}
                {showForm && (
                    <form onSubmit={handleSubmit} className="bg-[var(--t-surface2)] border border-[var(--t-border)] rounded-xl p-5 mb-5 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                                <label className={lbl}>{labels.date}</label>
                                <input type="date" className={inp} value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))} required />
                            </div>
                            <div>
                                <label className={lbl}>{labels.from}</label>
                                <select className={inp} value={form.from_bank} onChange={e => setForm(f => ({...f, from_bank: e.target.value}))} required>
                                    <option value="">Select bank…</option>
                                    {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={lbl}>{labels.to}</label>
                                <select className={inp} value={form.to_bank} onChange={e => setForm(f => ({...f, to_bank: e.target.value}))} required>
                                    <option value="">Select bank…</option>
                                    {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={lbl}>{labels.amount}</label>
                                <input type="number" min="0" className={inp} placeholder="0" value={form.amount} onChange={e => setForm(f => ({...f, amount: e.target.value}))} required />
                            </div>
                            <div>
                                <label className={lbl}>{labels.ref}</label>
                                <input type="text" className={inp} placeholder="Reference #" value={form.reference} onChange={e => setForm(f => ({...f, reference: e.target.value}))} />
                            </div>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button type="submit" disabled={saving} className="px-5 py-2 bg-[#ea580c] text-white text-sm font-bold rounded-xl hover:bg-orange-700 disabled:opacity-50 transition-colors">
                                {saving ? 'Saving…' : labels.save}
                            </button>
                            <button type="button" onClick={() => { setShowForm(false); setForm(EMPTY_TRANSFER); }} className="px-5 py-2 bg-[var(--t-surface)] border border-[var(--t-border)] text-[var(--t-text)] text-sm font-bold rounded-xl hover:bg-[var(--t-surface2)] transition-colors">
                                {labels.cancel}
                            </button>
                        </div>
                    </form>
                )}

                {transfers.length === 0 ? (
                    <div className="p-8 border-2 border-dashed border-[var(--t-border)] rounded-xl text-center text-[var(--t-text3)] text-sm">{labels.noTransfers}</div>
                ) : (
                    <div className="bg-[var(--t-surface)] border border-[var(--t-border)] rounded-xl shadow-sm overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[var(--t-surface2)] border-b border-[var(--t-border)]">
                                    <th className="px-4 py-3 text-xs font-black uppercase tracking-wider text-[var(--t-text3)]">{labels.date}</th>
                                    <th className="px-4 py-3 text-xs font-black uppercase tracking-wider text-[var(--t-text3)]">From → To</th>
                                    <th className="px-4 py-3 text-xs font-black uppercase tracking-wider text-right text-[var(--t-text3)]">{labels.amount}</th>
                                    <th className="px-4 py-3 text-xs font-black uppercase tracking-wider text-[var(--t-text3)]">{labels.ref}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--t-border)]">
                                {transfers.map((tr, i) => (
                                    <tr key={tr.id || i} className="hover:bg-[var(--t-surface2)] transition-colors">
                                        <td className="px-4 py-3 text-sm font-mono text-[var(--t-text2)]">{tr.date}</td>
                                        <td className="px-4 py-3 text-sm text-[var(--t-text)]">
                                            <span className="font-semibold">{bankName(tr.from_bank)}</span>
                                            <span className="text-[var(--t-text3)] mx-2">→</span>
                                            <span className="font-semibold">{bankName(tr.to_bank)}</span>
                                        </td>
                                        <td className="px-4 py-3 text-sm font-black text-[var(--t-text)] text-right">{fmt(tr.amount)}</td>
                                        <td className="px-4 py-3 text-sm text-[var(--t-text3)] font-mono">{tr.reference || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
};

export default TreasuryTab;
