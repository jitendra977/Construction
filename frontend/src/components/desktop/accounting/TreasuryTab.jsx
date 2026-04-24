import React, { useState, useEffect } from 'react';
import { accountingService } from '../../../services/api';
import { useConstruction } from '../../../context/ConstructionContext';
import Modal from '../../common/Modal';

const fmt = (v) => 'NPR ' + Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

const inp = 'w-full px-3 py-2 text-sm rounded border border-gray-300 bg-white text-black focus:outline-none focus:ring-1 focus:ring-orange-500';
const lbl = 'block text-xs font-bold text-gray-600 mb-1';

const EMPTY_TRANSFER = { date: '', from_bank: '', to_bank: '', amount: '', reference: '' };
const EMPTY_DEPOSIT = { amount: '', reference: '' };
const EMPTY_EMI = { amount: '', interest_amount: '', bank_id: '', reference: '' };
const ACCOUNT_TYPES = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'];
const EMPTY_ACCT = {
    code: '', name: '', account_type: 'ASSET', description: '',
    bank_name: '', account_number: '', account_holder_name: '',
    is_bank: false, is_loan: false, interest_rate: '',
    loan_tenure_months: '', emi_amount: '', total_loan_limit: ''
};

const TreasuryTab = ({ projectId }) => {
    const { dashboardData } = useConstruction();
    const [accounts, setAccounts] = useState([]);
    const [transfers, setTransfers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [subTab, setSubTab] = useState('banks');
    const [selectedLoanId, setSelectedLoanId] = useState(null);

    const [showTransferModal, setShowTransferModal] = useState(false);
    const [transferForm, setTransferForm] = useState(EMPTY_TRANSFER);
    const [showAcctModal, setShowAcctModal] = useState(false);
    const [editingAcct, setEditingAcct] = useState(null);
    const [acctForm, setAcctForm] = useState(EMPTY_ACCT);
    const [showDepositModal, setShowDepositModal] = useState(false);
    const [showEMIModal, setShowEMIModal] = useState(false);
    const [activeAcctId, setActiveAcctId] = useState(null);
    const [depositForm, setDepositForm] = useState(EMPTY_DEPOSIT);
    const [emiForm, setEmiForm] = useState(EMPTY_EMI);
    const [saving, setSaving] = useState(false);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [aRes, tRes] = await Promise.all([
                accountingService.getAccounts(projectId),
                accountingService.getTransfers(projectId),
            ]);
            setAccounts(Array.isArray(aRes.data) ? aRes.data : []);
            setTransfers(Array.isArray(tRes.data) ? tRes.data : []);
        } catch (err) {
            setError('Failed to load treasury data.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, [projectId]);

    const openAcctModal = (acct = null) => {
        setEditingAcct(acct);
        setAcctForm(acct
            ? { ...EMPTY_ACCT, ...acct }
            : { ...EMPTY_ACCT, code: String(Math.floor(1000 + Math.random() * 9000)) }
        );
        setShowAcctModal(true);
    };

    const handleAcctSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editingAcct) {
                await accountingService.updateAccount(editingAcct.id, acctForm);
            } else {
                await accountingService.createAccount({ ...acctForm, project: projectId });
            }
            setShowAcctModal(false);
            loadData();
        } catch (err) {
            alert('Save failed: ' + (err?.response?.data?.detail || JSON.stringify(err?.response?.data) || err.message));
        } finally {
            setSaving(false);
        }
    };

    const handleTransferSubmit = async (e) => {
        e.preventDefault();
        if (transferForm.from_bank === transferForm.to_bank) {
            alert('Source and destination accounts cannot be the same.');
            return;
        }
        setSaving(true);
        try {
            await accountingService.createTransfer({ ...transferForm, project: projectId });
            setShowTransferModal(false);
            setTransferForm(EMPTY_TRANSFER);
            loadData();
        } catch (err) {
            alert('Transfer failed: ' + (err?.response?.data?.detail || JSON.stringify(err?.response?.data) || err.message));
        } finally {
            setSaving(false);
        }
    };

    const handleEMISubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await accountingService.payEMI(activeAcctId, emiForm);
            setShowEMIModal(false);
            setEmiForm(EMPTY_EMI);
            loadData();
        } catch (err) {
            alert('EMI payment failed: ' + (err?.response?.data?.detail || JSON.stringify(err?.response?.data) || err.message));
        } finally {
            setSaving(false);
        }
    };

    const handleDisbursementSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await accountingService.addBankBalance(activeAcctId, depositForm);
            setShowDepositModal(false);
            setDepositForm(EMPTY_DEPOSIT);
            loadData();
        } catch (err) {
            alert('Disbursement failed: ' + (err?.response?.data?.detail || JSON.stringify(err?.response?.data) || err.message));
        } finally {
            setSaving(false);
        }
    };

    const calculateEMI = () => {
        const p = Math.abs(parseFloat(acctForm.total_loan_limit || 0));
        const r = parseFloat(acctForm.interest_rate || 0) / 12 / 100;
        const n = parseInt(acctForm.loan_tenure_months || 0);
        if (p > 0 && r > 0 && n > 0) {
            const emi = (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
            setAcctForm(f => ({ ...f, emi_amount: emi.toFixed(2) }));
        }
    };

    const generateSchedule = (loan) => {
        const emi = parseFloat(loan.emi_amount || 0);
        if (emi <= 0) return [];
        const schedule = [];
        let balance = Math.abs(parseFloat(loan.balance || 0));
        const r = parseFloat(loan.interest_rate || 0) / 12 / 100;
        if (r > 0 && balance * r >= emi) return [{ error: 'EMI too low to cover interest' }];
        for (let i = 1; i <= (loan.loan_tenure_months || 60); i++) {
            const interest = r > 0 ? balance * r : 0;
            const principal = emi - interest;
            balance -= principal;
            schedule.push({ month: i, emi, interest, principal, balance: Math.max(0, balance) });
            if (balance <= 0) break;
        }
        return schedule;
    };

    const getAcctName = (id) => accounts.find(a => String(a.id) === String(id))?.name || id;
    const banks = accounts.filter(a => a.is_bank);
    const loans = accounts.filter(a => a.is_loan);
    const selectedLoan = selectedLoanId ? loans.find(l => String(l.id) === String(selectedLoanId)) : null;

    if (loading) return <div className="p-10 text-center text-gray-400 text-sm">Loading treasury data...</div>;
    if (error) return <div className="p-10 text-center text-red-500 text-sm">{error}</div>;

    // ─── LOAN DETAIL PAGE ────────────────────────────────────────────────────
    if (selectedLoan) {
        const schedule = generateSchedule(selectedLoan);
        const limit = parseFloat(selectedLoan.total_loan_limit || 0);
        const balance = Math.abs(parseFloat(selectedLoan.balance || 0));

        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between border-b pb-4">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setSelectedLoanId(null)} className="text-sm font-bold text-gray-500 hover:text-black">← Back</button>
                        <h3 className="text-xl font-bold">{selectedLoan.name}</h3>
                        <span className="text-[10px] px-2 py-0.5 bg-red-100 text-red-600 font-bold rounded-full uppercase">Loan</span>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => { setActiveAcctId(selectedLoan.id); setDepositForm(EMPTY_DEPOSIT); setShowDepositModal(true); }}
                            className="px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded hover:bg-green-700"
                        >+ Record Disbursement</button>
                        <button
                            onClick={() => { setActiveAcctId(selectedLoan.id); setEmiForm({ ...EMPTY_EMI, amount: selectedLoan.emi_amount || '' }); setShowEMIModal(true); }}
                            className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded hover:bg-red-700"
                        >Pay EMI</button>
                        <button onClick={() => openAcctModal(selectedLoan)} className="px-3 py-1.5 bg-gray-100 text-xs font-bold rounded hover:bg-gray-200">Edit Terms</button>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-gray-50 border rounded-lg">
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Sanction Limit</p>
                        <p className="text-lg font-bold">{fmt(limit)}</p>
                    </div>
                    <div className="p-4 bg-red-50 border border-red-100 rounded-lg">
                        <p className="text-[10px] font-bold text-red-400 uppercase">Outstanding</p>
                        <p className="text-lg font-bold text-red-600">{fmt(balance)}</p>
                    </div>
                    <div className="p-4 bg-gray-50 border rounded-lg">
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Monthly EMI</p>
                        <p className="text-lg font-bold">{fmt(selectedLoan.emi_amount)}</p>
                    </div>
                    <div className="p-4 bg-gray-50 border rounded-lg">
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Interest Rate</p>
                        <p className="text-lg font-bold">{selectedLoan.interest_rate || '—'}%</p>
                    </div>
                </div>

                {limit > 0 && (
                    <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase">
                            <span>Utilization</span>
                            <span>{limit > 0 ? ((balance / limit) * 100).toFixed(1) : 0}% used · Remaining: {fmt(limit - balance)}</span>
                        </div>
                        <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-red-500 rounded-full transition-all"
                                style={{ width: `${limit > 0 ? Math.min((balance / limit) * 100, 100) : 0}%` }}
                            />
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-3">
                        <h4 className="text-sm font-bold">Amortization Schedule</h4>
                        {schedule.length === 0 ? (
                            <p className="text-xs text-gray-400 italic">Set EMI amount and loan tenure to generate schedule.</p>
                        ) : schedule[0]?.error ? (
                            <p className="text-xs text-red-500">{schedule[0].error}</p>
                        ) : (
                            <div className="border rounded-lg overflow-hidden max-h-80 overflow-y-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-gray-50 border-b sticky top-0">
                                        <tr>
                                            <th className="p-2 font-bold text-gray-500">Mo</th>
                                            <th className="p-2 font-bold text-gray-500">EMI</th>
                                            <th className="p-2 font-bold text-gray-500">Principal</th>
                                            <th className="p-2 font-bold text-gray-500">Interest</th>
                                            <th className="p-2 font-bold text-gray-500 text-right">Balance</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {schedule.map(s => (
                                            <tr key={s.month} className="hover:bg-gray-50">
                                                <td className="p-2 text-gray-400">{s.month}</td>
                                                <td className="p-2 font-semibold">{fmt(s.emi)}</td>
                                                <td className="p-2 text-green-600 font-semibold">{fmt(s.principal)}</td>
                                                <td className="p-2 text-red-400">{fmt(s.interest)}</td>
                                                <td className="p-2 text-right font-bold">{fmt(s.balance)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <div className="p-4 bg-gray-50 border rounded-lg h-fit space-y-3">
                        <h4 className="text-sm font-bold">Loan Details</h4>
                        <div className="text-xs space-y-2 divide-y">
                            <div className="pb-2">
                                <p className="text-gray-400 font-bold uppercase text-[10px]">Account Holder</p>
                                <p className="font-semibold">{selectedLoan.account_holder_name || '—'}</p>
                            </div>
                            <div className="py-2">
                                <p className="text-gray-400 font-bold uppercase text-[10px]">Bank</p>
                                <p className="font-semibold">{selectedLoan.bank_name || '—'}</p>
                            </div>
                            <div className="py-2">
                                <p className="text-gray-400 font-bold uppercase text-[10px]">Account Number</p>
                                <p className="font-semibold font-mono">{selectedLoan.account_number || '—'}</p>
                            </div>
                            <div className="pt-2">
                                <p className="text-gray-400 font-bold uppercase text-[10px]">Tenure</p>
                                <p className="font-semibold">{selectedLoan.loan_tenure_months ? `${selectedLoan.loan_tenure_months} months` : '—'}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Disbursement Modal */}
                <Modal isOpen={showDepositModal} onClose={() => setShowDepositModal(false)} title="Record Loan Disbursement">
                    <form onSubmit={handleDisbursementSubmit} className="p-6 space-y-4">
                        <p className="text-xs text-gray-500">Record amount disbursed from the bank into your bank account.</p>
                        <div>
                            <label className={lbl}>Amount (NPR)</label>
                            <input type="number" step="0.01" className={inp} required min="1"
                                value={depositForm.amount}
                                onChange={e => setDepositForm(f => ({ ...f, amount: e.target.value }))} />
                        </div>
                        <div>
                            <label className={lbl}>Reference / Notes</label>
                            <input type="text" className={inp}
                                value={depositForm.reference}
                                onChange={e => setDepositForm(f => ({ ...f, reference: e.target.value }))} />
                        </div>
                        <button type="submit" disabled={saving} className="w-full py-2 bg-green-600 text-white font-bold rounded hover:bg-green-700 disabled:opacity-50">
                            {saving ? 'Saving...' : 'Record Disbursement'}
                        </button>
                    </form>
                </Modal>

                {/* EMI Payment Modal */}
                <Modal isOpen={showEMIModal} onClose={() => setShowEMIModal(false)} title="Pay EMI">
                    <form onSubmit={handleEMISubmit} className="p-6 space-y-4">
                        <p className="text-xs text-gray-500">Record an EMI payment. Split total EMI into principal + interest components.</p>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={lbl}>Total EMI (NPR)</label>
                                <input type="number" step="0.01" className={inp} required min="1"
                                    value={emiForm.amount}
                                    onChange={e => setEmiForm(f => ({ ...f, amount: e.target.value }))} />
                            </div>
                            <div>
                                <label className={lbl}>Interest Portion (NPR)</label>
                                <input type="number" step="0.01" className={inp} required min="0"
                                    value={emiForm.interest_amount}
                                    onChange={e => setEmiForm(f => ({ ...f, interest_amount: e.target.value }))} />
                            </div>
                        </div>
                        <div>
                            <label className={lbl}>Pay From Bank Account</label>
                            <select className={inp} required
                                value={emiForm.bank_id}
                                onChange={e => setEmiForm(f => ({ ...f, bank_id: e.target.value }))}>
                                <option value="">Select bank account...</option>
                                {banks.map(b => (
                                    <option key={b.id} value={b.id}>{b.name} ({fmt(b.balance)})</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className={lbl}>Reference</label>
                            <input type="text" className={inp}
                                value={emiForm.reference}
                                onChange={e => setEmiForm(f => ({ ...f, reference: e.target.value }))} />
                        </div>
                        <div className="p-3 bg-gray-50 rounded text-xs text-gray-500">
                            Principal = {fmt((parseFloat(emiForm.amount) || 0) - (parseFloat(emiForm.interest_amount) || 0))}
                        </div>
                        <button type="submit" disabled={saving} className="w-full py-2 bg-red-600 text-white font-bold rounded hover:bg-red-700 disabled:opacity-50">
                            {saving ? 'Processing...' : 'Pay EMI'}
                        </button>
                    </form>
                </Modal>

                {/* Account Edit Modal */}
                <Modal isOpen={showAcctModal} onClose={() => setShowAcctModal(false)} title="Edit Loan Terms">
                    {renderAcctForm()}
                </Modal>
            </div>
        );
    }

    // ─── ACCOUNT FORM (reusable) ─────────────────────────────────────────────
    function renderAcctForm() {
        return (
            <form onSubmit={handleAcctSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className={lbl}>Account Code</label>
                        <input type="text" className={inp} required
                            value={acctForm.code}
                            onChange={e => setAcctForm(f => ({ ...f, code: e.target.value }))} />
                    </div>
                    <div>
                        <label className={lbl}>Account Type</label>
                        <select className={inp}
                            value={acctForm.account_type}
                            onChange={e => setAcctForm(f => ({ ...f, account_type: e.target.value }))}>
                            {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                </div>

                <div>
                    <label className={lbl}>Account Name</label>
                    <input type="text" className={inp} required
                        value={acctForm.name}
                        onChange={e => setAcctForm(f => ({ ...f, name: e.target.value }))} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                        <input type="checkbox" checked={acctForm.is_bank}
                            onChange={e => setAcctForm(f => ({ ...f, is_bank: e.target.checked, account_type: e.target.checked ? 'ASSET' : f.account_type }))} />
                        Bank / Cash Account
                    </label>
                    <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                        <input type="checkbox" checked={acctForm.is_loan}
                            onChange={e => setAcctForm(f => ({ ...f, is_loan: e.target.checked, account_type: e.target.checked ? 'LIABILITY' : f.account_type }))} />
                        Loan / Debt Account
                    </label>
                </div>

                {/* Bank Details */}
                {(acctForm.is_bank || acctForm.is_loan) && (
                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg space-y-3">
                        <p className="text-[10px] font-bold text-blue-500 uppercase">Banking Details</p>
                        <div>
                            <label className={lbl}>Bank Name</label>
                            <input type="text" className={inp} placeholder="e.g. Nabil Bank, NIC Asia"
                                value={acctForm.bank_name}
                                onChange={e => setAcctForm(f => ({ ...f, bank_name: e.target.value }))} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={lbl}>Account Number</label>
                                <input type="text" className={inp} placeholder="e.g. 0123456789"
                                    value={acctForm.account_number}
                                    onChange={e => setAcctForm(f => ({ ...f, account_number: e.target.value }))} />
                            </div>
                            <div>
                                <label className={lbl}>Account Holder</label>
                                <input type="text" className={inp} placeholder="Name on account"
                                    value={acctForm.account_holder_name}
                                    onChange={e => setAcctForm(f => ({ ...f, account_holder_name: e.target.value }))} />
                            </div>
                        </div>
                    </div>
                )}

                {/* Loan Terms */}
                {acctForm.is_loan && (
                    <div className="p-4 bg-red-50 border border-red-100 rounded-lg space-y-3">
                        <p className="text-[10px] font-bold text-red-500 uppercase">Loan Terms</p>
                        <div>
                            <label className={lbl}>Sanctioned Limit (NPR)</label>
                            <input type="number" step="0.01" className={inp} placeholder="e.g. 10000000"
                                value={acctForm.total_loan_limit}
                                onChange={e => setAcctForm(f => ({ ...f, total_loan_limit: e.target.value }))} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={lbl}>Interest Rate (%/yr)</label>
                                <input type="number" step="0.01" className={inp} placeholder="e.g. 12.5"
                                    value={acctForm.interest_rate}
                                    onChange={e => setAcctForm(f => ({ ...f, interest_rate: e.target.value }))} />
                            </div>
                            <div>
                                <label className={lbl}>Tenure (months)</label>
                                <input type="number" className={inp} placeholder="e.g. 120"
                                    value={acctForm.loan_tenure_months}
                                    onChange={e => setAcctForm(f => ({ ...f, loan_tenure_months: e.target.value }))} />
                            </div>
                        </div>
                        <div className="flex gap-2 items-end">
                            <div className="flex-1">
                                <label className={lbl}>Monthly EMI (NPR)</label>
                                <input type="number" step="0.01" className={inp}
                                    value={acctForm.emi_amount}
                                    onChange={e => setAcctForm(f => ({ ...f, emi_amount: e.target.value }))} />
                            </div>
                            <button type="button" onClick={calculateEMI}
                                className="px-3 py-2 bg-gray-200 text-[10px] font-bold rounded hover:bg-gray-300 whitespace-nowrap">
                                CALC EMI
                            </button>
                        </div>
                    </div>
                )}

                <button type="submit" disabled={saving}
                    className="w-full py-2 bg-black text-white font-bold rounded hover:bg-gray-800 disabled:opacity-50">
                    {saving ? 'Saving...' : editingAcct ? 'Update Account' : 'Create Account'}
                </button>
            </form>
        );
    }

    // ─── MAIN DASHBOARD ──────────────────────────────────────────────────────
    return (
        <div className="space-y-6">
            {/* Sub-Tab Bar */}
            <div className="flex items-center justify-between border-b pb-4">
                <div className="flex gap-1">
                    {[
                        { id: 'banks', label: 'Banks & Cash' },
                        { id: 'loans', label: 'Loans' },
                        { id: 'transfers', label: 'Transfers' },
                        { id: 'gl', label: 'GL Accounts' },
                        { id: 'help', label: '📖 सहायता' },
                    ].map(t => (
                        <button
                            key={t.id}
                            onClick={() => { setSubTab(t.id); setSelectedLoanId(null); }}
                            className={`px-3 py-1.5 text-xs font-bold rounded transition-colors ${
                                subTab === t.id ? 'bg-black text-white' : 'text-gray-500 hover:bg-gray-100'
                            }`}
                        >{t.label}</button>
                    ))}
                </div>
                <div className="flex gap-2">
                    {subTab === 'transfers' && (
                        <button
                            onClick={() => { setTransferForm({ ...EMPTY_TRANSFER, date: new Date().toISOString().split('T')[0] }); setShowTransferModal(true); }}
                            className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-700"
                        >+ New Transfer</button>
                    )}
                    <button onClick={() => openAcctModal()}
                        className="px-3 py-1.5 bg-black text-white text-xs font-bold rounded hover:bg-gray-800"
                    >+ Add Account</button>
                </div>
            </div>

            {/* ── BANKS TAB ── */}
            {subTab === 'banks' && (
                <div>
                    {banks.length === 0 ? (
                        <div className="p-12 border-2 border-dashed rounded-xl text-center text-gray-400 text-sm">
                            No bank / cash accounts yet. Click <strong>+ Add Account</strong> and check "Bank / Cash Account".
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {banks.map(b => (
                                <div key={b.id} className="p-4 border rounded-xl hover:border-black hover:shadow-sm transition-all">
                                    <div className="flex justify-between items-start mb-1">
                                        <div>
                                            <p className="font-bold text-sm">{b.name}</p>
                                            <p className="text-[10px] text-gray-400">{b.bank_name || 'Bank'}</p>
                                        </div>
                                        <button onClick={() => openAcctModal(b)} className="text-gray-300 hover:text-gray-600 text-sm">✏️</button>
                                    </div>
                                    <p className="text-xs text-gray-400 font-mono mb-4">
                                        {b.account_number || 'No account number'}{b.account_holder_name ? ` · ${b.account_holder_name}` : ''}
                                    </p>
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase">Balance</p>
                                            <p className={`text-xl font-black ${b.balance >= 0 ? 'text-green-600' : 'text-red-500'}`}>{fmt(b.balance)}</p>
                                        </div>
                                        <button
                                            onClick={() => { setActiveAcctId(b.id); setDepositForm(EMPTY_DEPOSIT); setShowDepositModal(true); }}
                                            className="px-2 py-1 bg-gray-100 text-[10px] font-bold rounded hover:bg-gray-200"
                                        >+ Deposit</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── LOANS TAB ── */}
            {subTab === 'loans' && (
                <div>
                    {loans.length === 0 ? (
                        <div className="p-12 border-2 border-dashed rounded-xl text-center text-gray-400 text-sm">
                            No loan accounts yet. Click <strong>+ Add Account</strong> and check "Loan / Debt Account".
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {loans.map(l => (
                                <div
                                    key={l.id}
                                    onClick={() => setSelectedLoanId(l.id)}
                                    className="cursor-pointer p-4 border rounded-xl hover:border-red-400 hover:shadow-sm transition-all"
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <p className="font-bold text-sm">{l.name}</p>
                                        <span className="text-[10px] text-red-500 font-bold">View →</span>
                                    </div>
                                    <p className="text-xs text-gray-400 font-mono mb-1">{l.account_number || l.code}</p>
                                    <p className="text-[10px] text-gray-400 mb-0.5">{l.bank_name || '—'}{l.interest_rate ? ` · ${l.interest_rate}% p.a.` : ''}</p>
                                    <div className="mt-3">
                                        <p className="text-[10px] text-gray-400 font-bold uppercase">Outstanding</p>
                                        <p className="text-xl font-black text-red-600">{fmt(Math.abs(l.balance))}</p>
                                    </div>
                                    {l.emi_amount && (
                                        <p className="text-[10px] text-gray-400 mt-1">EMI: {fmt(l.emi_amount)}/month</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── TRANSFERS TAB ── */}
            {subTab === 'transfers' && (
                <div className="space-y-4">
                    {transfers.length === 0 ? (
                        <div className="p-12 border-2 border-dashed rounded-xl text-center text-gray-400 text-sm">
                            No transfers recorded yet. Click <strong>+ New Transfer</strong> to move funds between accounts.
                        </div>
                    ) : (
                        <div className="border rounded-xl overflow-hidden">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-4 py-3 font-bold text-gray-500 uppercase text-[10px]">Date</th>
                                        <th className="px-4 py-3 font-bold text-gray-500 uppercase text-[10px]">From</th>
                                        <th className="px-4 py-3 font-bold text-gray-500 uppercase text-[10px]">To</th>
                                        <th className="px-4 py-3 font-bold text-gray-500 uppercase text-[10px]">Reference</th>
                                        <th className="px-4 py-3 font-bold text-gray-500 uppercase text-[10px] text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {transfers.map(t => (
                                        <tr key={t.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-gray-500">{t.date}</td>
                                            <td className="px-4 py-3 font-semibold">{t.from_bank_name || t.from_bank}</td>
                                            <td className="px-4 py-3 font-semibold">{t.to_bank_name || t.to_bank}</td>
                                            <td className="px-4 py-3 text-gray-400">{t.reference || '—'}</td>
                                            <td className="px-4 py-3 text-right font-bold text-blue-700">{fmt(t.amount)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ── GL ACCOUNTS TAB ── */}
            {subTab === 'gl' && (
                <div className="border rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-4 py-3 font-bold text-gray-500 uppercase text-[10px]">Code</th>
                                <th className="px-4 py-3 font-bold text-gray-500 uppercase text-[10px]">Account</th>
                                <th className="px-4 py-3 font-bold text-gray-500 uppercase text-[10px]">Type</th>
                                <th className="px-4 py-3 font-bold text-gray-500 uppercase text-[10px]">Tags</th>
                                <th className="px-4 py-3 font-bold text-gray-500 uppercase text-[10px] text-right">Balance</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {accounts.map(a => (
                                <tr key={a.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => openAcctModal(a)}>
                                    <td className="px-4 py-3 text-gray-400 font-mono">{a.code}</td>
                                    <td className="px-4 py-3 font-bold">{a.name}</td>
                                    <td className="px-4 py-3 text-gray-500">{a.account_type}</td>
                                    <td className="px-4 py-3">
                                        {a.is_bank && <span className="mr-1 px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded">BANK</span>}
                                        {a.is_loan && <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded">LOAN</span>}
                                    </td>
                                    <td className={`px-4 py-3 text-right font-bold ${Number(a.balance) < 0 ? 'text-red-500' : ''}`}>{fmt(a.balance)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ── HELP TAB (सहायता) ── */}
            {subTab === 'help' && (
                <div className="space-y-6 max-w-3xl">

                    {/* Header */}
                    <div className="p-5 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-2xl">
                        <h2 className="text-lg font-black text-orange-700 mb-1">📖 Treasury — सहायता केन्द्र</h2>
                        <p className="text-sm text-orange-600">यस पृष्ठमा Treasury मोड्युलका सबै ट्याबहरूको विवरण, प्रयोजन र प्रयोग विधि नेपालीमा दिइएको छ।</p>
                    </div>

                    {/* Tab 1 — Banks & Cash */}
                    <div className="border border-green-200 rounded-2xl overflow-hidden">
                        <div className="flex items-center gap-3 px-5 py-3 bg-green-50 border-b border-green-200">
                            <span className="text-xl">🏦</span>
                            <div>
                                <p className="font-black text-green-800 text-sm">Banks & Cash — बैंक र नगद खाताहरू</p>
                                <p className="text-[10px] text-green-600 font-bold uppercase">पहिलो ट्याब</p>
                            </div>
                        </div>
                        <div className="p-5 space-y-3 text-sm text-gray-700">
                            <p><span className="font-bold">के हो?</span> यो ट्याबमा तपाईंका सबै बैंक खाता र नगद भकारीहरू देखिन्छन् — जस्तै नबिल बैंक, पेटी क्यास, NIC Asia आदि।</p>
                            <p><span className="font-bold">किन चाहिन्छ?</span> आफ्नो प्रत्येक बैंक खातामा कति रकम छ भनेर एकैठाउँ देख्न सकिन्छ।</p>
                            <div className="bg-green-50 border border-green-100 rounded-xl p-4 space-y-2">
                                <p className="font-bold text-green-700 text-xs uppercase">कसरी प्रयोग गर्ने?</p>
                                <ul className="space-y-1.5 text-xs text-gray-600 list-none">
                                    <li>➊ <span className="font-semibold">+ Add Account</span> थिच्नुस् → <span className="font-semibold">"Bank / Cash Account"</span> चेकबक्स लगाउनुस्।</li>
                                    <li>➋ बैंकको नाम, खाता नम्बर, र खाताधारकको नाम भर्नुस्।</li>
                                    <li>➌ खाता बनाएपछि <span className="font-semibold">"+ Deposit"</span> थिचेर उद्घाटन मौज्दात (Opening Balance) थप्नुस्।</li>
                                    <li>➍ जुनसुकै कार्डको ✏️ थिचेर खाताको जानकारी सम्पादन गर्न सकिन्छ।</li>
                                </ul>
                            </div>
                            <p className="text-xs text-gray-400 italic">💡 प्रत्येक Deposit ले आफैं Double-Entry Journal Entry बनाउँछ — तपाईंलाई छुट्टै जर्नल बनाउनु पर्दैन।</p>
                        </div>
                    </div>

                    {/* Tab 2 — Loans */}
                    <div className="border border-red-200 rounded-2xl overflow-hidden">
                        <div className="flex items-center gap-3 px-5 py-3 bg-red-50 border-b border-red-200">
                            <span className="text-xl">📋</span>
                            <div>
                                <p className="font-black text-red-800 text-sm">Loans — ऋण खाताहरू</p>
                                <p className="text-[10px] text-red-600 font-bold uppercase">दोस्रो ट्याब</p>
                            </div>
                        </div>
                        <div className="p-5 space-y-3 text-sm text-gray-700">
                            <p><span className="font-bold">के हो?</span> बैंकबाट लिएको ऋण, गृह ऋण, वा अन्य दायित्व (Liability) खाताहरू यहाँ देखिन्छन्।</p>
                            <p><span className="font-bold">किन चाहिन्छ?</span> कति ऋण बाँकी छ, मासिक EMI कति हो, र ब्याज दर कति छ भनेर ट्र्याक गर्न।</p>
                            <div className="bg-red-50 border border-red-100 rounded-xl p-4 space-y-2">
                                <p className="font-bold text-red-700 text-xs uppercase">कसरी प्रयोग गर्ने?</p>
                                <ul className="space-y-1.5 text-xs text-gray-600">
                                    <li>➊ <span className="font-semibold">+ Add Account</span> थिच्नुस् → <span className="font-semibold">"Loan / Debt Account"</span> चेकबक्स लगाउनुस्।</li>
                                    <li>➋ Sanctioned Limit (स्वीकृत ऋण रकम), ब्याज दर (%), र अवधि (महिना) भर्नुस्।</li>
                                    <li>➌ <span className="font-semibold">CALC EMI</span> बटन थिचेर मासिक EMI स्वतः गणना गर्नुस्।</li>
                                    <li>➍ ऋण कार्ड क्लिक गर्नुस् → विस्तृत पृष्ठ खुल्छ जहाँ Amortization तालिका देख्न सकिन्छ।</li>
                                    <li>➎ <span className="font-semibold">"Record Disbursement"</span> — बैंकले पैसा दिएको रेकर्ड गर्नुस्।</li>
                                    <li>➏ <span className="font-semibold">"Pay EMI"</span> — हरेक महिना तिरेको किस्ता रेकर्ड गर्नुस् (मूलधन + ब्याज छुट्याएर)।</li>
                                </ul>
                            </div>
                            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-700">
                                <p className="font-bold mb-1">📊 Amortization तालिका भनेको के हो?</p>
                                <p>ऋणको सम्पूर्ण भुक्तानी तालिका — प्रत्येक महिना कति मूलधन (Principal) र कति ब्याज (Interest) जान्छ भनेर महिनाबार देखाउँछ।</p>
                            </div>
                            <p className="text-xs text-gray-400 italic">💡 EMI तिर्दा Loan Account Debit हुन्छ (दायित्व घट्छ) र Bank Account Credit हुन्छ (रकम निस्कन्छ)।</p>
                        </div>
                    </div>

                    {/* Tab 3 — Transfers */}
                    <div className="border border-blue-200 rounded-2xl overflow-hidden">
                        <div className="flex items-center gap-3 px-5 py-3 bg-blue-50 border-b border-blue-200">
                            <span className="text-xl">🔄</span>
                            <div>
                                <p className="font-black text-blue-800 text-sm">Transfers — बैंक हस्तान्तरण</p>
                                <p className="text-[10px] text-blue-600 font-bold uppercase">तेस्रो ट्याब</p>
                            </div>
                        </div>
                        <div className="p-5 space-y-3 text-sm text-gray-700">
                            <p><span className="font-bold">के हो?</span> एउटा बैंक खाताबाट अर्को बैंक खातामा रकम सार्ने (Transfer) गरेका सबै लेनदेनहरू यहाँ देखिन्छन्।</p>
                            <p><span className="font-bold">किन चाहिन्छ?</span> जस्तै — नबिल बैंकबाट पेटी क्यासमा पैसा झिकेको, वा एक खाताबाट अर्कोमा रकम सारेको रेकर्ड राख्न।</p>
                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-2">
                                <p className="font-bold text-blue-700 text-xs uppercase">कसरी प्रयोग गर्ने?</p>
                                <ul className="space-y-1.5 text-xs text-gray-600">
                                    <li>➊ <span className="font-semibold">Transfers</span> ट्याबमा जानुस् → <span className="font-semibold">+ New Transfer</span> बटन थिच्नुस्।</li>
                                    <li>➋ <span className="font-semibold">From Account</span> — कुन खाताबाट पैसा जान्छ (Debit हुन्छ) चुन्नुस्।</li>
                                    <li>➌ <span className="font-semibold">To Account</span> — कुन खातामा पैसा आउँछ (Credit हुन्छ) चुन्नुस्।</li>
                                    <li>➍ रकम र मिति भरेर <span className="font-semibold">"Execute Transfer"</span> थिच्नुस्।</li>
                                    <li>➎ Transfer भएपछि दुवै खाताको Balance स्वतः अपडेट हुन्छ।</li>
                                </ul>
                            </div>
                            <p className="text-xs text-gray-400 italic">💡 प्रत्येक Transfer ले स्वतः Double-Entry Journal Entry बनाउँछ — From Account Credit, To Account Debit।</p>
                        </div>
                    </div>

                    {/* Tab 4 — GL Accounts */}
                    <div className="border border-purple-200 rounded-2xl overflow-hidden">
                        <div className="flex items-center gap-3 px-5 py-3 bg-purple-50 border-b border-purple-200">
                            <span className="text-xl">📒</span>
                            <div>
                                <p className="font-black text-purple-800 text-sm">GL Accounts — सामान्य खाताबही</p>
                                <p className="text-[10px] text-purple-600 font-bold uppercase">चौथो ट्याब</p>
                            </div>
                        </div>
                        <div className="p-5 space-y-3 text-sm text-gray-700">
                            <p><span className="font-bold">के हो?</span> General Ledger (GL) मा प्रणालीका सम्पूर्ण खाताहरू सूचीबद्ध छन् — Asset, Liability, Equity, Revenue, र Expense।</p>
                            <p><span className="font-bold">किन चाहिन्छ?</span> Double-Entry Accounting को आधार हो। प्रत्येक लेनदेन यिनै खाताहरूमा Debit/Credit हुन्छ।</p>
                            <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 space-y-2">
                                <p className="font-bold text-purple-700 text-xs uppercase">५ प्रकारका खाताहरू</p>
                                <div className="space-y-2 text-xs">
                                    <div className="flex gap-3">
                                        <span className="w-24 font-bold text-green-700 shrink-0">ASSET</span>
                                        <span>तपाईंसँग भएको सम्पत्ति — बैंक, नगद, उपकरण। Balance बढ्दा Debit हुन्छ।</span>
                                    </div>
                                    <div className="flex gap-3">
                                        <span className="w-24 font-bold text-red-600 shrink-0">LIABILITY</span>
                                        <span>तपाईंले तिर्नु पर्ने — ऋण, साहुको उधारो। Balance बढ्दा Credit हुन्छ।</span>
                                    </div>
                                    <div className="flex gap-3">
                                        <span className="w-24 font-bold text-violet-600 shrink-0">EQUITY</span>
                                        <span>तपाईंको लगानी वा स्वामित्व पुँजी। Balance बढ्दा Credit हुन्छ।</span>
                                    </div>
                                    <div className="flex gap-3">
                                        <span className="w-24 font-bold text-sky-600 shrink-0">REVENUE</span>
                                        <span>आम्दानी — परियोजनाबाट आएको रकम। Balance बढ्दा Credit हुन्छ।</span>
                                    </div>
                                    <div className="flex gap-3">
                                        <span className="w-24 font-bold text-amber-600 shrink-0">EXPENSE</span>
                                        <span>खर्च — सामग्री, ज्याला, अनुमति शुल्क। Balance बढ्दा Debit हुन्छ।</span>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 space-y-2">
                                <p className="font-bold text-purple-700 text-xs uppercase">कसरी प्रयोग गर्ने?</p>
                                <ul className="space-y-1.5 text-xs text-gray-600">
                                    <li>➊ सबै खाताहरूको सूची र हालको Balance यहाँ देखिन्छ।</li>
                                    <li>➋ कुनै पनि पङ्क्ति (Row) क्लिक गर्दा त्यो खाता सम्पादन गर्न सकिन्छ।</li>
                                    <li>➌ <span className="font-semibold">BANK</span> ट्याग — बैंक/नगद खाता (Banks & Cash ट्याबमा देखिन्छ)।</li>
                                    <li>➍ <span className="font-semibold">LOAN</span> ट्याग — ऋण खाता (Loans ट्याबमा देखिन्छ)।</li>
                                </ul>
                            </div>
                            <p className="text-xs text-gray-400 italic">💡 GL Accounts ले सिधै सम्पादन गर्दा पैसा थपिँदैन — Deposit, Transfer वा EMI बटनहरूबाट मात्र लेनदेन हुन्छ।</p>
                        </div>
                    </div>

                    {/* Double-Entry Concept Box */}
                    <div className="border border-gray-200 rounded-2xl overflow-hidden">
                        <div className="flex items-center gap-3 px-5 py-3 bg-gray-100 border-b border-gray-200">
                            <span className="text-xl">⚖️</span>
                            <div>
                                <p className="font-black text-gray-700 text-sm">Double-Entry Accounting — दोहोरो प्रविष्टि लेखाप्रणाली</p>
                                <p className="text-[10px] text-gray-500 font-bold uppercase">बुझ्नु आवश्यक अवधारणा</p>
                            </div>
                        </div>
                        <div className="p-5 space-y-3 text-sm text-gray-700">
                            <p>यो प्रणाली Double-Entry Accounting मा आधारित छ — प्रत्येक लेनदेनमा <span className="font-bold">एउटा खाता Debit</span> हुन्छ र <span className="font-bold">अर्को खाता Credit</span> हुन्छ। Debit र Credit को जोड सधैं बराबर हुनु पर्छ।</p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                                <div className="p-3 bg-green-50 border border-green-100 rounded-xl">
                                    <p className="font-bold text-green-700 mb-1">Deposit उदाहरण</p>
                                    <p className="text-gray-600">बैंकमा NPR १,००,०००  थप्दा —</p>
                                    <p className="mt-1">✅ Bank Account <span className="font-bold text-green-600">Debit</span> (बढ्छ)</p>
                                    <p>✅ Equity Account <span className="font-bold text-red-500">Credit</span> (स्वामित्व बढ्छ)</p>
                                </div>
                                <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
                                    <p className="font-bold text-blue-700 mb-1">Transfer उदाहरण</p>
                                    <p className="text-gray-600">नबिलबाट पेटी क्यासमा NPR ५०,००० सार्दा —</p>
                                    <p className="mt-1">✅ Petty Cash <span className="font-bold text-green-600">Debit</span> (बढ्छ)</p>
                                    <p>✅ Nabil Bank <span className="font-bold text-red-500">Credit</span> (घट्छ)</p>
                                </div>
                                <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
                                    <p className="font-bold text-red-700 mb-1">EMI उदाहरण</p>
                                    <p className="text-gray-600">NPR २०,००० EMI तिर्दा —</p>
                                    <p className="mt-1">✅ Loan Account <span className="font-bold text-green-600">Debit</span> (ऋण घट्छ)</p>
                                    <p>✅ Interest Expense <span className="font-bold text-green-600">Debit</span> (ब्याज खर्च)</p>
                                    <p>✅ Bank Account <span className="font-bold text-red-500">Credit</span> (घट्छ)</p>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            )}

            {/* ── TRANSFER MODAL ── */}
            <Modal isOpen={showTransferModal} onClose={() => setShowTransferModal(false)} title="New Bank Transfer">
                <form onSubmit={handleTransferSubmit} className="p-6 space-y-4">
                    <p className="text-xs text-gray-500">Move funds between two bank or cash accounts. A double-entry journal will be created automatically.</p>
                    <div>
                        <label className={lbl}>Transfer Date</label>
                        <input type="date" className={inp} required
                            value={transferForm.date}
                            onChange={e => setTransferForm(f => ({ ...f, date: e.target.value }))} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={lbl}>From Account</label>
                            <select className={inp} required
                                value={transferForm.from_bank}
                                onChange={e => setTransferForm(f => ({ ...f, from_bank: e.target.value }))}>
                                <option value="">Select...</option>
                                {accounts.filter(a => a.is_bank || a.account_type === 'ASSET').map(a => (
                                    <option key={a.id} value={a.id}>{a.name} ({fmt(a.balance)})</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className={lbl}>To Account</label>
                            <select className={inp} required
                                value={transferForm.to_bank}
                                onChange={e => setTransferForm(f => ({ ...f, to_bank: e.target.value }))}>
                                <option value="">Select...</option>
                                {accounts.filter(a => a.is_bank || a.account_type === 'ASSET').map(a => (
                                    <option key={a.id} value={a.id}>{a.name} ({fmt(a.balance)})</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className={lbl}>Amount (NPR)</label>
                        <input type="number" step="0.01" className={inp} required min="1"
                            value={transferForm.amount}
                            onChange={e => setTransferForm(f => ({ ...f, amount: e.target.value }))} />
                    </div>
                    <div>
                        <label className={lbl}>Reference / Notes</label>
                        <input type="text" className={inp}
                            value={transferForm.reference}
                            onChange={e => setTransferForm(f => ({ ...f, reference: e.target.value }))} />
                    </div>
                    <button type="submit" disabled={saving}
                        className="w-full py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 disabled:opacity-50">
                        {saving ? 'Processing...' : 'Execute Transfer'}
                    </button>
                </form>
            </Modal>

            {/* ── ADD/EDIT ACCOUNT MODAL ── */}
            <Modal isOpen={showAcctModal} onClose={() => setShowAcctModal(false)}
                title={editingAcct ? `Edit: ${editingAcct.name}` : 'New GL Account'}>
                {renderAcctForm()}
            </Modal>

            {/* ── DEPOSIT MODAL (for bank accounts) ── */}
            <Modal isOpen={showDepositModal && !selectedLoan} onClose={() => setShowDepositModal(false)} title="Add Deposit / Opening Balance">
                <form onSubmit={handleDisbursementSubmit} className="p-6 space-y-4">
                    <div>
                        <label className={lbl}>Amount (NPR)</label>
                        <input type="number" step="0.01" className={inp} required min="1"
                            value={depositForm.amount}
                            onChange={e => setDepositForm(f => ({ ...f, amount: e.target.value }))} />
                    </div>
                    <div>
                        <label className={lbl}>Reference / Notes</label>
                        <input type="text" className={inp}
                            value={depositForm.reference}
                            onChange={e => setDepositForm(f => ({ ...f, reference: e.target.value }))} />
                    </div>
                    <button type="submit" disabled={saving}
                        className="w-full py-2 bg-green-600 text-white font-bold rounded hover:bg-green-700 disabled:opacity-50">
                        {saving ? 'Saving...' : 'Add Balance'}
                    </button>
                </form>
            </Modal>
        </div>
    );
};

export default TreasuryTab;
