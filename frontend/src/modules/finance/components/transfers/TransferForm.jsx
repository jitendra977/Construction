/**
 * TransferForm — move cash between two bank/cash accounts.
 */
import { useState } from 'react';
import financeApi from '../../services/financeApi';
import { useFinance } from '../../context/FinanceContext';

const inp = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 bg-white';
const lbl = 'block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1';

export default function TransferForm({ onDone }) {
  const { projectId, banks, refresh } = useFinance();
  const [form, setForm] = useState({ from_account: '', to_account: '', amount: '', description: '', reference: '' });
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const fromAcc = banks.find((b) => b.id === form.from_account);
  const toAcc   = banks.find((b) => b.id === form.to_account);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.from_account === form.to_account) { setErr('From and To accounts must be different'); return; }
    if (!form.amount || Number(form.amount) <= 0) { setErr('Amount must be greater than 0'); return; }
    setBusy(true); setErr('');
    try {
      await financeApi.createTransfer({
        from_account: form.from_account,
        to_account:   form.to_account,
        amount:       form.amount,
        description:  form.description || 'Cash transfer',
        reference:    form.reference,
        project:      projectId,
      });
      await refresh();
      onDone?.();
    } catch (ex) {
      setErr(ex?.response?.data?.detail || JSON.stringify(ex?.response?.data) || ex.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {err && <p className="text-xs text-red-600 font-semibold bg-red-50 p-2 rounded-lg">{err}</p>}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lbl}>From Account *</label>
          <select className={inp} value={form.from_account} onChange={(e) => set('from_account', e.target.value)} required>
            <option value="">— Select —</option>
            {banks.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          {fromAcc && (
            <p className="text-[10px] text-gray-400 mt-1">
              Balance: NPR {Number(fromAcc.balance || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
          )}
        </div>
        <div>
          <label className={lbl}>To Account *</label>
          <select className={inp} value={form.to_account} onChange={(e) => set('to_account', e.target.value)} required>
            <option value="">— Select —</option>
            {banks.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          {toAcc && (
            <p className="text-[10px] text-gray-400 mt-1">
              Balance: NPR {Number(toAcc.balance || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
          )}
        </div>
      </div>

      {/* Arrow indicator */}
      {(fromAcc || toAcc) && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="font-semibold">{fromAcc?.name || '?'}</span>
          <span className="text-gray-300 flex-1 border-t border-dashed border-gray-200 relative">
            <span className="absolute -right-1 -top-2 text-gray-300">▶</span>
          </span>
          <span className="font-semibold">{toAcc?.name || '?'}</span>
        </div>
      )}

      <div>
        <label className={lbl}>Amount (NPR) *</label>
        <input type="number" min="1" step="0.01" required
          className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 bg-white font-semibold"
          placeholder="0.00" value={form.amount} onChange={(e) => set('amount', e.target.value)}
        />
      </div>

      <div>
        <label className={lbl}>Description</label>
        <input className={inp} placeholder="e.g. Site expense transfer" value={form.description} onChange={(e) => set('description', e.target.value)} />
      </div>

      <div>
        <label className={lbl}>Reference / Voucher No.</label>
        <input className={inp} placeholder="e.g. TRF-001" value={form.reference} onChange={(e) => set('reference', e.target.value)} />
      </div>

      <button type="submit" disabled={busy}
        className="w-full py-2.5 bg-black text-white text-sm font-black rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-colors">
        {busy ? 'Processing…' : '→ Execute Transfer'}
      </button>
    </form>
  );
}
