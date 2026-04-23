import React, { useState, useEffect } from 'react';
import { accountingService } from '../../../services/accountingService';

const fmt = (v) => 'NPR ' + Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
const statusColor = (s) => ({
    PAID: 'bg-emerald-100 text-emerald-700', APPROVED: 'bg-emerald-100 text-emerald-700',
    PARTIAL: 'bg-amber-100 text-amber-700', PENDING: 'bg-amber-100 text-amber-700',
    UNPAID: 'bg-red-100 text-red-700', OVERDUE: 'bg-red-100 text-red-700',
    DRAFT: 'bg-gray-100 text-gray-600', REJECTED: 'bg-red-100 text-red-700',
}[s] || 'bg-gray-100 text-gray-600');

const inp = 'w-full px-3 py-2 text-sm rounded-lg border border-[var(--t-border)] bg-[var(--t-surface)] text-[var(--t-text)] focus:outline-none focus:ring-2 focus:ring-[#ea580c]/30';
const lbl = 'block text-xs font-bold text-[var(--t-text2)] mb-1';

const EMPTY_BILL = { vendor: '', invoice_number: '', date: '', due_date: '', description: '', amount: '', expense_account: '', phase: '' };
const EMPTY_PAY = { bill: '', bank_account: '', amount: '', reference: '', date: '' };
const EMPTY_REQ = { phase_name: '', contractor_name: '', claimed_amount: '', description: '', work_completion_percentage: '' };

const PayablesTab = ({ projectId, section }) => {
    const [vendors, setVendors] = useState([]);
    const [bills, setBills] = useState([]);
    const [requests, setRequests] = useState([]);
    const [banks, setBanks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [billFilter, setBillFilter] = useState('ALL');
    const [showBillForm, setShowBillForm] = useState(false);
    const [showPayForm, setShowPayForm] = useState(null);  // bill id
    const [showReqForm, setShowReqForm] = useState(false);
    const [billForm, setBillForm] = useState(EMPTY_BILL);
    const [payForm, setPayForm] = useState(EMPTY_PAY);
    const [reqForm, setReqForm] = useState(EMPTY_REQ);
    const [saving, setSaving] = useState(false);

    const labels = {
        en: {
            milestones: 'Contractor Milestones', milestonesDesc: 'Payment requests from contractors',
            addReq: '+ Add Request', approve: 'Approve',
            phase: 'Phase', contractor: 'Contractor', claimed: 'Claimed',
            retention: 'Retention', netPayable: 'Net Payable', status: 'Status', actions: 'Actions',
            bills: 'Vendor Bills', billsDesc: 'Manage supplier invoices and payments',
            addBill: '+ New Bill', pay: 'Pay', all: 'All', unpaid: 'Unpaid', overdue: 'Overdue',
            invoice: 'Invoice #', vendor: 'Vendor', date: 'Date', due: 'Due Date',
            amount: 'Amount', paid: 'Paid', outstanding: 'Outstanding',
            cancel: 'Cancel', save: 'Save',
            noBills: 'No bills found.', noRequests: 'No payment requests.',
        },
        np: {
            milestones: 'ठेकेदार माइलस्टोन', milestonesDesc: 'ठेकेदारहरूका भुक्तानी अनुरोध',
            addReq: '+ अनुरोध थप्नुहोस्', approve: 'स्वीकृत',
            phase: 'चरण', contractor: 'ठेकेदार', claimed: 'दाबी', retention: 'रिटेन्सन',
            netPayable: 'खुद भुक्तानी', status: 'अवस्था', actions: 'कार्य',
            bills: 'सप्लायर बिल', billsDesc: 'आपूर्तिकर्ताको बिल व्यवस्थापन',
            addBill: '+ नयाँ बिल', pay: 'भुक्तानी', all: 'सबै', unpaid: 'बाँकी', overdue: 'म्याद नाघेको',
            invoice: 'इन्भ्वाइस #', vendor: 'सप्लायर', date: 'मिति', due: 'अन्तिम मिति',
            amount: 'रकम', paid: 'भुक्तानी', outstanding: 'बाँकी',
            cancel: 'रद्द', save: 'सेभ',
            noBills: 'कुनै बिल छैन।', noRequests: 'कुनै अनुरोध छैन।',
        },
    }.en;

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [vRes, bRes, prRes, bkRes] = await Promise.all([
                accountingService.getVendors(),
                accountingService.getBills(projectId),
                accountingService.getPaymentRequests(projectId),
                accountingService.getBanks(),
            ]);
            setVendors(Array.isArray(vRes.data) ? vRes.data : []);
            setBills(Array.isArray(bRes.data) ? bRes.data : []);
            setRequests(Array.isArray(prRes.data) ? prRes.data : []);
            setBanks(Array.isArray(bkRes.data) ? bkRes.data : []);
        } catch (err) {
            setError('Failed to load payables data.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, [projectId]);

    const handleApprove = async (id) => {
        try {
            await accountingService.approvePaymentRequest(id);
            loadData();
        } catch (err) {
            alert('Approval failed: ' + (err.response?.data?.error || err.message));
        }
    };

    const handleSaveBill = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await accountingService.createBill({ ...billForm, amount: Number(billForm.amount), project: projectId });
            setShowBillForm(false);
            setBillForm(EMPTY_BILL);
            loadData();
        } catch (err) {
            alert('Failed to save bill: ' + (err.response?.data?.error || err.message));
        } finally {
            setSaving(false);
        }
    };

    const handleSavePay = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await accountingService.createPayment({ ...payForm, amount: Number(payForm.amount), bill: Number(showPayForm), bank_account: Number(payForm.bank_account) });
            setShowPayForm(null);
            setPayForm(EMPTY_PAY);
            loadData();
        } catch (err) {
            alert('Payment failed: ' + (err.response?.data?.error || err.message));
        } finally {
            setSaving(false);
        }
    };

    const filteredBills = bills.filter(b => {
        if (billFilter === 'UNPAID') return b.payment_status === 'UNPAID';
        if (billFilter === 'OVERDUE') return b.is_overdue;
        return true;
    });

    if (loading) return <div className="p-10 text-center text-[var(--t-text3)] text-sm">Loading payables...</div>;
    if (error) return <div className="p-10 text-center text-red-500 text-sm">{error}</div>;

    const showMilestones = !section || section === 'milestones';
    const showBills = !section || section === 'bills';

    return (
        <div className="space-y-8">
            {/* Section A: Contractor Milestones */}
            {showMilestones && (
                <section>
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h3 className="text-base font-black text-[var(--t-text)]">{labels.milestones}</h3>
                            <p className="text-sm text-[var(--t-text3)]">{labels.milestonesDesc}</p>
                        </div>
                        <button onClick={() => setShowReqForm(v => !v)} className="px-4 py-2 bg-[#ea580c] text-white text-sm font-bold rounded-xl hover:bg-orange-700 transition-colors">
                            {labels.addReq}
                        </button>
                    </div>

                    {showReqForm && (
                        <form className="bg-[var(--t-surface2)] border border-[var(--t-border)] rounded-xl p-5 mb-5 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div><label className={lbl}>{labels.phase}</label><input className={inp} value={reqForm.phase_name} onChange={e => setReqForm(f => ({...f, phase_name: e.target.value}))} /></div>
                                <div><label className={lbl}>{labels.contractor}</label><input className={inp} value={reqForm.contractor_name} onChange={e => setReqForm(f => ({...f, contractor_name: e.target.value}))} /></div>
                                <div><label className={lbl}>{labels.claimed}</label><input type="number" className={inp} value={reqForm.claimed_amount} onChange={e => setReqForm(f => ({...f, claimed_amount: e.target.value}))} /></div>
                                <div><label className={lbl}>Completion %</label><input type="number" className={inp} value={reqForm.work_completion_percentage} onChange={e => setReqForm(f => ({...f, work_completion_percentage: e.target.value}))} /></div>
                                <div className="sm:col-span-2"><label className={lbl}>Description</label><input className={inp} value={reqForm.description} onChange={e => setReqForm(f => ({...f, description: e.target.value}))} /></div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="submit" className="px-5 py-2 bg-[#ea580c] text-white text-sm font-bold rounded-xl">{labels.save}</button>
                                <button type="button" onClick={() => setShowReqForm(false)} className="px-5 py-2 bg-[var(--t-surface)] border border-[var(--t-border)] text-[var(--t-text)] text-sm font-bold rounded-xl">{labels.cancel}</button>
                            </div>
                        </form>
                    )}

                    {requests.length === 0 ? (
                        <div className="p-8 border-2 border-dashed border-[var(--t-border)] rounded-xl text-center text-[var(--t-text3)] text-sm">{labels.noRequests}</div>
                    ) : (
                        <div className="bg-[var(--t-surface)] border border-[var(--t-border)] rounded-xl shadow-sm overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[700px]">
                                <thead>
                                    <tr className="bg-[var(--t-surface2)] border-b border-[var(--t-border)]">
                                        {[labels.phase, labels.contractor, labels.claimed, labels.retention, labels.netPayable, labels.status, labels.actions].map(h => (
                                            <th key={h} className="px-4 py-3 text-xs font-black uppercase tracking-wider text-[var(--t-text3)]">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--t-border)]">
                                    {requests.map(r => (
                                        <tr key={r.id} className="hover:bg-[var(--t-surface2)] transition-colors">
                                            <td className="px-4 py-3 text-sm text-[var(--t-text)]">{r.phase_name}</td>
                                            <td className="px-4 py-3 text-sm font-semibold text-[var(--t-text)]">{r.contractor_name}</td>
                                            <td className="px-4 py-3 text-sm text-[var(--t-text2)]">{fmt(r.claimed_amount)}</td>
                                            <td className="px-4 py-3 text-sm text-[var(--t-text2)]">{fmt(r.retention_amount)}</td>
                                            <td className="px-4 py-3 text-sm font-bold text-[var(--t-text)]">{fmt(r.net_payable)}</td>
                                            <td className="px-4 py-3">
                                                <span className={`text-xs font-bold px-2 py-1 rounded-full ${statusColor(r.status)}`}>{r.status}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                {r.status === 'PENDING' && (
                                                    <button onClick={() => handleApprove(r.id)} className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors">
                                                        {labels.approve}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            )}

            {/* Section B: Vendor Bills */}
            {showBills && (
                <section>
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h3 className="text-base font-black text-[var(--t-text)]">{labels.bills}</h3>
                            <p className="text-sm text-[var(--t-text3)]">{labels.billsDesc}</p>
                        </div>
                        <button onClick={() => setShowBillForm(v => !v)} className="px-4 py-2 bg-[#ea580c] text-white text-sm font-bold rounded-xl hover:bg-orange-700 transition-colors">
                            {labels.addBill}
                        </button>
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex gap-1 mb-4 p-1 bg-[var(--t-surface2)] rounded-xl w-fit border border-[var(--t-border)]">
                        {[['ALL', labels.all], ['UNPAID', labels.unpaid], ['OVERDUE', labels.overdue]].map(([key, lbl2]) => (
                            <button key={key} onClick={() => setBillFilter(key)} className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-all ${billFilter === key ? 'bg-[var(--t-surface)] text-[var(--t-text)] shadow-sm' : 'text-[var(--t-text3)] hover:text-[var(--t-text)]'}`}>
                                {lbl2}
                            </button>
                        ))}
                    </div>

                    {/* New Bill Form */}
                    {showBillForm && (
                        <form onSubmit={handleSaveBill} className="bg-[var(--t-surface2)] border border-[var(--t-border)] rounded-xl p-5 mb-5 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div>
                                    <label className={lbl}>{labels.vendor}</label>
                                    <select className={inp} value={billForm.vendor} onChange={e => setBillForm(f => ({...f, vendor: e.target.value}))} required>
                                        <option value="">Select vendor…</option>
                                        {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                    </select>
                                </div>
                                <div><label className={lbl}>{labels.invoice}</label><input className={inp} value={billForm.invoice_number} onChange={e => setBillForm(f => ({...f, invoice_number: e.target.value}))} /></div>
                                <div><label className={lbl}>{labels.date}</label><input type="date" className={inp} value={billForm.date} onChange={e => setBillForm(f => ({...f, date: e.target.value}))} required /></div>
                                <div><label className={lbl}>{labels.due}</label><input type="date" className={inp} value={billForm.due_date} onChange={e => setBillForm(f => ({...f, due_date: e.target.value}))} /></div>
                                <div><label className={lbl}>{labels.amount}</label><input type="number" min="0" className={inp} value={billForm.amount} onChange={e => setBillForm(f => ({...f, amount: e.target.value}))} required /></div>
                                <div><label className={lbl}>Expense Account</label><input className={inp} value={billForm.expense_account} onChange={e => setBillForm(f => ({...f, expense_account: e.target.value}))} /></div>
                                <div><label className={lbl}>Phase</label><input className={inp} value={billForm.phase} onChange={e => setBillForm(f => ({...f, phase: e.target.value}))} /></div>
                                <div className="sm:col-span-2"><label className={lbl}>Description</label><input className={inp} value={billForm.description} onChange={e => setBillForm(f => ({...f, description: e.target.value}))} /></div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="submit" disabled={saving} className="px-5 py-2 bg-[#ea580c] text-white text-sm font-bold rounded-xl disabled:opacity-50">{saving ? 'Saving…' : labels.save}</button>
                                <button type="button" onClick={() => setShowBillForm(false)} className="px-5 py-2 bg-[var(--t-surface)] border border-[var(--t-border)] text-[var(--t-text)] text-sm font-bold rounded-xl">{labels.cancel}</button>
                            </div>
                        </form>
                    )}

                    {/* Pay Modal */}
                    {showPayForm && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowPayForm(null)}>
                            <div className="bg-[var(--t-surface)] border border-[var(--t-border)] rounded-xl shadow-xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
                                <h4 className="text-base font-black text-[var(--t-text)] mb-4">Record Payment</h4>
                                <form onSubmit={handleSavePay} className="space-y-4">
                                    <div>
                                        <label className={lbl}>Bank Account</label>
                                        <select className={inp} value={payForm.bank_account} onChange={e => setPayForm(f => ({...f, bank_account: e.target.value}))} required>
                                            <option value="">Select bank…</option>
                                            {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                        </select>
                                    </div>
                                    <div><label className={lbl}>{labels.amount}</label><input type="number" min="0" className={inp} value={payForm.amount} onChange={e => setPayForm(f => ({...f, amount: e.target.value}))} required /></div>
                                    <div><label className={lbl}>{labels.date}</label><input type="date" className={inp} value={payForm.date} onChange={e => setPayForm(f => ({...f, date: e.target.value}))} required /></div>
                                    <div><label className={lbl}>Reference</label><input className={inp} value={payForm.reference} onChange={e => setPayForm(f => ({...f, reference: e.target.value}))} /></div>
                                    <div className="flex gap-3 pt-2">
                                        <button type="submit" disabled={saving} className="px-5 py-2 bg-[#ea580c] text-white text-sm font-bold rounded-xl disabled:opacity-50">{saving ? 'Saving…' : labels.save}</button>
                                        <button type="button" onClick={() => setShowPayForm(null)} className="px-5 py-2 bg-[var(--t-surface2)] border border-[var(--t-border)] text-[var(--t-text)] text-sm font-bold rounded-xl">{labels.cancel}</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {filteredBills.length === 0 ? (
                        <div className="p-8 border-2 border-dashed border-[var(--t-border)] rounded-xl text-center text-[var(--t-text3)] text-sm">{labels.noBills}</div>
                    ) : (
                        <div className="bg-[var(--t-surface)] border border-[var(--t-border)] rounded-xl shadow-sm overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[900px]">
                                <thead>
                                    <tr className="bg-[var(--t-surface2)] border-b border-[var(--t-border)]">
                                        {[labels.invoice, labels.vendor, labels.date, labels.due, labels.amount, labels.paid, labels.outstanding, labels.status, labels.actions].map(h => (
                                            <th key={h} className="px-4 py-3 text-xs font-black uppercase tracking-wider text-[var(--t-text3)]">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--t-border)]">
                                    {filteredBills.map(b => (
                                        <tr key={b.id} className={`hover:bg-[var(--t-surface2)] transition-colors ${b.is_overdue ? 'bg-red-50/30' : ''}`}>
                                            <td className="px-4 py-3 text-xs font-mono text-[var(--t-text3)]">{b.invoice_number || '—'}</td>
                                            <td className="px-4 py-3 text-sm font-semibold text-[var(--t-text)]">{b.vendor_name}</td>
                                            <td className="px-4 py-3 text-xs font-mono text-[var(--t-text2)]">{b.date}</td>
                                            <td className="px-4 py-3 text-xs font-mono text-[var(--t-text2)]">{b.due_date}</td>
                                            <td className="px-4 py-3 text-sm font-bold text-[var(--t-text)]">{fmt(b.amount)}</td>
                                            <td className="px-4 py-3 text-sm text-emerald-600">{fmt(b.paid_amount)}</td>
                                            <td className="px-4 py-3 text-sm font-bold text-red-600">{fmt(b.outstanding)}</td>
                                            <td className="px-4 py-3">
                                                <span className={`text-xs font-bold px-2 py-1 rounded-full ${statusColor(b.is_overdue ? 'OVERDUE' : b.payment_status)}`}>
                                                    {b.is_overdue ? 'OVERDUE' : b.payment_status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                {b.payment_status !== 'PAID' && (
                                                    <button
                                                        onClick={() => { setShowPayForm(b.id); setPayForm({...EMPTY_PAY, bill: b.id, amount: b.outstanding}); }}
                                                        className="px-3 py-1.5 bg-[#ea580c] text-white text-xs font-bold rounded-lg hover:bg-orange-700 transition-colors"
                                                    >{labels.pay}</button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            )}
        </div>
    );
};

export default PayablesTab;
