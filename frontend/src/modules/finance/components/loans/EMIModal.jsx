/**
 * EMIModal — pay one EMI instalment for a loan account.
 * Splits the payment into principal + interest.
 */
import { useState, useMemo } from 'react';
import Modal from '../shared/Modal';
import financeApi from '../../services/financeApi';
import { useFinance } from '../../context/FinanceContext';

export default function EMIModal({ loan, onClose }) {
  const { banks, refresh } = useFinance();
  const emi = Number(loan.emi_amount || 0);

  const [form, setForm] = useState({
    bank_account_id: '',
    total_emi:       emi.toFixed(2),
    principal:       '',
    interest:        '',
    description:     '',
    reference:       '',
  });
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState('');

  const set = (k, v) => setForm((f) => {
    const updated = { ...f, [k]: v };
    // Auto-split: if total changes, keep principal and compute interest
    if (k === 'total_emi' || k === 'principal') {
      const total = Number(k === 'total_emi' ? v : updated.total_emi);
      const prin  = Number(k === 'principal' ? v : updated.principal);
      if (total && prin) updated.interest = Math.max(0, total - prin).toFixed(2);
    }
    return updated;
  });

  // Suggested split based on remaining balance + rate
  const suggestedPrincipal = useMemo(() => {
    const r = Number(loan.interest_rate || 0) / 100 / 12;
    const outstanding = Number(loan.balance || 0);
    const interestPart = outstanding * r;
    const principalPart = emi - interestPart;
    return Math.max(0, principalPart).toFixed(2);
  }, [loan, emi]);

  const applyDefault = () => {
    const r = Number(loan.interest_rate || 0) / 100 / 12;
    const outstanding = Number(loan.balance || 0);
    const interest   = (outstanding * r).toFixed(2);
    const principal  = Math.max(0, emi - Number(interest)).toFixed(2);
    setForm((f) => ({ ...f, total_emi: emi.toFixed(2), principal, interest }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.bank_account_id) { setErr('Select a bank account to pay from'); return; }
    if (!form.principal || !form.interest) { setErr('Enter principal and interest split'); return; }
    setBusy(true); setErr('');
    try {
      await financeApi.payEMI(loan.id, {
        bank_account:  form.bank_account_id,
        total_emi:     form.total_emi,
        principal:     form.principal,
        interest:      form.interest,
        description:   form.description || `EMI payment — ${loan.name}`,
        reference:     form.reference,
      });
      await refresh();
      onClose();
    } catch (ex) {
      setErr(ex?.response?.data?.detail || JSON.stringify(ex?.response?.data) || ex.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Pay EMI" maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {/* Loan info */}
        <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
          <p className="text-[10px] font-bold text-blue-500 uppercase">Loan</p>
          <p className="font-black text-sm text-blue-800">{loan.name}</p>
          <p className="text-xs text-blue-400">Outstanding: NPR {Number(loan.balance || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
        </div>

        {err && <p className="text-xs text-red-600 font-semibold bg-red-50 p-2 rounded-lg">{err}</p>}

        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Pay From Bank Account *</label>
          <select
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 bg-white"
            value={form.bank_account_id} onChange={(e) => set('bank_account_id', e.target.value)} required
          >
            <option value="">— Select bank —</option>
            {banks.map((b) => (
              <option key={b.id} value={b.id}>{b.name} (NPR {Number(b.balance || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })})</option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Total EMI (NPR)</label>
            <button type="button" onClick={applyDefault} className="text-[9px] text-blue-500 font-bold hover:underline">Auto-split</button>
          </div>
          <input type="number" step="0.01" min="0" required
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 bg-white font-semibold"
            value={form.total_emi} onChange={(e) => set('total_emi', e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Principal</label>
            <input type="number" step="0.01" min="0" required
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 bg-white"
              placeholder={suggestedPrincipal}
              value={form.principal} onChange={(e) => set('principal', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Interest</label>
            <input type="number" step="0.01" min="0" required
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 bg-white"
              value={form.interest} onChange={(e) => set('interest', e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Description</label>
          <input
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 bg-white"
            placeholder={`EMI payment — ${loan.name}`}
            value={form.description} onChange={(e) => set('description', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Reference</label>
          <input
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 bg-white"
            placeholder="Voucher / receipt no."
            value={form.reference} onChange={(e) => set('reference', e.target.value)}
          />
        </div>

        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 text-sm font-bold text-gray-600 rounded-xl hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={busy}
            className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-black rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {busy ? 'Processing…' : 'Pay EMI'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
