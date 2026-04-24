/**
 * LoanForm — create or edit a loan account.
 * Also handles disbursement (first deposit) into a target bank account.
 */
import { useState, useEffect } from 'react';
import financeApi from '../../services/financeApi';
import { useFinance } from '../../context/FinanceContext';

const inp = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 bg-white';
const lbl = 'block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1';

const EMPTY = {
  code: '', name: '', account_type: 'LIABILITY',
  bank_name: '', account_number: '', account_holder_name: '',
  is_bank: false, is_loan: true,
  interest_rate: '', loan_tenure_months: '', emi_amount: '', total_loan_limit: '',
};

function calcEMI(principal, annualRate, months) {
  if (!principal || !annualRate || !months) return 0;
  const r = annualRate / 100 / 12;
  const n = months;
  if (r === 0) return principal / n;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

export default function LoanForm({ account = null, onDone }) {
  const { projectId, banks, refresh } = useFinance();
  const [form, setForm]     = useState(EMPTY);
  const [disburse, setDisburse] = useState(false);
  const [disburseForm, setDisburseForm] = useState({ bank_account_id: '', amount: '', description: '' });
  const [busy, setBusy]     = useState(false);
  const [err,  setErr]      = useState('');

  useEffect(() => {
    setForm(account
      ? { ...EMPTY, ...account }
      : { ...EMPTY, code: String(Math.floor(2000 + Math.random() * 1000)) }
    );
  }, [account]);

  const set = (k, v) => setForm((f) => {
    const updated = { ...f, [k]: v };
    // Auto-calculate EMI
    if (['total_loan_limit', 'interest_rate', 'loan_tenure_months'].includes(k)) {
      const emi = calcEMI(
        Number(updated.total_loan_limit),
        Number(updated.interest_rate),
        Number(updated.loan_tenure_months)
      );
      if (emi > 0) updated.emi_amount = emi.toFixed(2);
    }
    return updated;
  });

  const setD = (k, v) => setDisburseForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      let loanAccount;
      if (account) {
        await financeApi.updateAccount(account.id, form);
      } else {
        const res = await financeApi.createAccount({ ...form, project: projectId });
        loanAccount = res.data;
      }

      // Optionally disburse
      if (!account && disburse && disburseForm.bank_account_id && disburseForm.amount) {
        await financeApi.createDisbursement({
          loan_account:  loanAccount.id,
          bank_account:  disburseForm.bank_account_id,
          amount:        disburseForm.amount,
          description:   disburseForm.description || `Loan disbursement — ${form.name}`,
          project:       projectId,
        });
      }

      await refresh();
      onDone();
    } catch (ex) {
      setErr(ex?.response?.data?.detail || JSON.stringify(ex?.response?.data) || ex.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
      {err && <p className="text-xs text-red-600 font-semibold bg-red-50 p-2 rounded-lg">{err}</p>}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lbl}>Account Code</label>
          <input className={inp} required value={form.code} onChange={(e) => set('code', e.target.value)} placeholder="2001" />
        </div>
        <div>
          <label className={lbl}>Account Type</label>
          <select className={inp} value={form.account_type} onChange={(e) => set('account_type', e.target.value)}>
            <option value="LIABILITY">LIABILITY</option>
            <option value="ASSET">ASSET</option>
          </select>
        </div>
      </div>

      <div>
        <label className={lbl}>Loan Name</label>
        <input className={inp} required value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Nabil Bank Term Loan" />
      </div>

      {/* Lender details */}
      <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl space-y-3">
        <p className="text-[10px] font-black text-blue-600 uppercase">Lender Details</p>
        <div>
          <label className={lbl}>Bank / Lender Name</label>
          <input className={inp} value={form.bank_name} onChange={(e) => set('bank_name', e.target.value)} placeholder="e.g. Nabil Bank" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={lbl}>Loan Account No.</label>
            <input className={inp} value={form.account_number} onChange={(e) => set('account_number', e.target.value)} placeholder="0123456789" />
          </div>
          <div>
            <label className={lbl}>Borrower Name</label>
            <input className={inp} value={form.account_holder_name} onChange={(e) => set('account_holder_name', e.target.value)} placeholder="Name" />
          </div>
        </div>
      </div>

      {/* Loan terms */}
      <div className="p-4 bg-yellow-50 border border-yellow-100 rounded-xl space-y-3">
        <p className="text-[10px] font-black text-yellow-600 uppercase">Loan Terms</p>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={lbl}>Loan Amount (NPR)</label>
            <input type="number" min="0" step="1" className={inp} value={form.total_loan_limit} onChange={(e) => set('total_loan_limit', e.target.value)} placeholder="1000000" />
          </div>
          <div>
            <label className={lbl}>Interest % / yr</label>
            <input type="number" min="0" step="0.01" className={inp} value={form.interest_rate} onChange={(e) => set('interest_rate', e.target.value)} placeholder="12.00" />
          </div>
          <div>
            <label className={lbl}>Tenure (months)</label>
            <input type="number" min="1" step="1" className={inp} value={form.loan_tenure_months} onChange={(e) => set('loan_tenure_months', e.target.value)} placeholder="60" />
          </div>
        </div>
        <div>
          <label className={lbl}>Monthly EMI (auto-calculated)</label>
          <input type="number" step="0.01" className={inp} value={form.emi_amount} onChange={(e) => set('emi_amount', e.target.value)} placeholder="Auto" />
        </div>
      </div>

      {/* Disbursement (new only) */}
      {!account && (
        <div className="p-4 bg-green-50 border border-green-100 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black text-green-600 uppercase">Disburse to Bank Account?</p>
            <input type="checkbox" checked={disburse} onChange={(e) => setDisburse(e.target.checked)} className="w-4 h-4 accent-green-600" />
          </div>
          {disburse && (
            <>
              <div>
                <label className={lbl}>Target Bank Account</label>
                <select className={inp} value={disburseForm.bank_account_id} onChange={(e) => setD('bank_account_id', e.target.value)} required={disburse}>
                  <option value="">— Select bank —</option>
                  {banks.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={lbl}>Disbursement Amount (NPR)</label>
                <input type="number" min="0" step="0.01" className={inp} value={disburseForm.amount}
                  onChange={(e) => setD('amount', e.target.value)} placeholder={form.total_loan_limit || '0.00'} />
              </div>
              <div>
                <label className={lbl}>Description</label>
                <input className={inp} value={disburseForm.description} onChange={(e) => setD('description', e.target.value)} placeholder="Loan disbursement" />
              </div>
            </>
          )}
        </div>
      )}

      <button type="submit" disabled={busy}
        className="w-full py-2.5 bg-black text-white text-sm font-black rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-colors">
        {busy ? 'Saving…' : account ? 'Update Loan' : 'Create Loan'}
      </button>
    </form>
  );
}
