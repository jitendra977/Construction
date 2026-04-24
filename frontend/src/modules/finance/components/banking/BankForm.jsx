/**
 * BankForm — create or edit a bank / cash account.
 * Used inside a Modal.
 */
import { useState, useEffect } from 'react';
import financeApi from '../../services/financeApi';
import { useFinance } from '../../context/FinanceContext';

const inp = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 bg-white';
const lbl = 'block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1';

const EMPTY = {
  code: '', name: '', account_type: 'ASSET',
  bank_name: '', account_number: '', account_holder_name: '',
  is_bank: true, is_loan: false,
};

export default function BankForm({ account = null, onDone }) {
  const { projectId, refresh } = useFinance();
  const [form, setForm]   = useState(EMPTY);
  const [busy, setBusy]   = useState(false);
  const [err,  setErr]    = useState('');

  useEffect(() => {
    setForm(account
      ? { ...EMPTY, ...account }
      : { ...EMPTY, code: String(Math.floor(1000 + Math.random() * 9000)) }
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
          <input className={inp} required value={form.code} onChange={(e) => set('code', e.target.value)} placeholder="e.g. 1010" />
        </div>
        <div>
          <label className={lbl}>Account Type</label>
          <select className={inp} value={form.account_type} onChange={(e) => set('account_type', e.target.value)}>
            <option value="ASSET">ASSET</option>
            <option value="LIABILITY">LIABILITY</option>
            <option value="EQUITY">EQUITY</option>
          </select>
        </div>
      </div>

      <div>
        <label className={lbl}>Account Name</label>
        <input className={inp} required value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Nabil Bank, Petty Cash" />
      </div>

      <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl space-y-3">
        <p className="text-[10px] font-black text-blue-600 uppercase">Banking Details</p>
        <div>
          <label className={lbl}>Bank Name</label>
          <input className={inp} value={form.bank_name} onChange={(e) => set('bank_name', e.target.value)} placeholder="e.g. Nabil Bank, NIC Asia" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={lbl}>Account Number</label>
            <input className={inp} value={form.account_number} onChange={(e) => set('account_number', e.target.value)} placeholder="0123456789" />
          </div>
          <div>
            <label className={lbl}>Holder Name</label>
            <input className={inp} value={form.account_holder_name} onChange={(e) => set('account_holder_name', e.target.value)} placeholder="Name on account" />
          </div>
        </div>
      </div>

      <button type="submit" disabled={busy}
        className="w-full py-2.5 bg-black text-white text-sm font-black rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-colors">
        {busy ? 'Saving…' : account ? 'Update Account' : 'Create Account'}
      </button>
    </form>
  );
}
