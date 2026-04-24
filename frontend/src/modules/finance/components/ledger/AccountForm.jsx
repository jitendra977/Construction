/**
 * AccountForm — generic create/edit form for any account type.
 */
import { useState, useEffect } from 'react';
import financeApi from '../../services/financeApi';
import { useFinance } from '../../context/FinanceContext';

const inp = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 bg-white';
const lbl = 'block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1';

const EMPTY = {
  code: '', name: '', account_type: 'EXPENSE',
  is_bank: false, is_loan: false,
  bank_name: '', account_number: '', account_holder_name: '',
  interest_rate: '', loan_tenure_months: '', emi_amount: '', total_loan_limit: '',
};

export default function AccountForm({ account = null, onDone }) {
  const { projectId, refresh } = useFinance();
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState('');

  useEffect(() => {
    setForm(account
      ? { ...EMPTY, ...account }
      : { ...EMPTY, code: String(Math.floor(4000 + Math.random() * 5000)) }
    );
  }, [account]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      if (account) {
        await financeApi.updateAccount(account.id, form);
      } else {
        await financeApi.createAccount({ ...form, project: projectId });
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
          <input className={inp} required value={form.code} onChange={(e) => set('code', e.target.value)} placeholder="4001" />
        </div>
        <div>
          <label className={lbl}>Account Type</label>
          <select className={inp} value={form.account_type} onChange={(e) => set('account_type', e.target.value)}>
            <option value="ASSET">ASSET</option>
            <option value="LIABILITY">LIABILITY</option>
            <option value="EQUITY">EQUITY</option>
            <option value="REVENUE">REVENUE</option>
            <option value="EXPENSE">EXPENSE</option>
          </select>
        </div>
      </div>

      <div>
        <label className={lbl}>Account Name</label>
        <input className={inp} required value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Materials Expense" />
      </div>

      <div className="flex gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.is_bank} onChange={(e) => set('is_bank', e.target.checked)} className="w-4 h-4 accent-blue-600" />
          <span className="text-xs font-bold text-gray-600">Bank / Cash Account</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.is_loan} onChange={(e) => set('is_loan', e.target.checked)} className="w-4 h-4 accent-yellow-600" />
          <span className="text-xs font-bold text-gray-600">Loan Account</span>
        </label>
      </div>

      <button type="submit" disabled={busy}
        className="w-full py-2.5 bg-black text-white text-sm font-black rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-colors">
        {busy ? 'Saving…' : account ? 'Update Account' : 'Create Account'}
      </button>
    </form>
  );
}
