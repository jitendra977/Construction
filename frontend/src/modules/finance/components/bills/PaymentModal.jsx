/**
 * PaymentModal — record a payment against a bill.
 */
import { useState } from 'react';
import Modal from '../shared/Modal';
import financeApi from '../../services/financeApi';
import { useFinance } from '../../context/FinanceContext';

export default function PaymentModal({ bill, onClose }) {
  const { banks, refresh } = useFinance();
  const outstanding = Number(bill.outstanding || bill.total_amount || 0);

  const [form, setForm] = useState({
    bank_account_id: '',
    amount:          outstanding.toFixed(2),
    description:     `Payment for ${bill.vendor_name || 'bill'}`,
    reference:       '',
  });
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.bank_account_id) { setErr('Select the bank account to pay from'); return; }
    if (!form.amount || Number(form.amount) <= 0) { setErr('Amount must be > 0'); return; }
    setBusy(true); setErr('');
    try {
      await financeApi.payBill(bill.id, {
        bank_account: form.bank_account_id,
        amount:       form.amount,
        description:  form.description,
        reference:    form.reference,
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
    <Modal isOpen onClose={onClose} title="Record Payment" maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {/* Bill summary */}
        <div className="p-3 bg-orange-50 border border-orange-100 rounded-xl">
          <p className="text-[10px] font-bold text-orange-500 uppercase">Bill</p>
          <p className="font-black text-sm text-orange-800">{bill.vendor_name}</p>
          <div className="flex justify-between mt-1">
            <p className="text-xs text-orange-500">Total: NPR {Number(bill.total_amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
            <p className="text-xs text-orange-700 font-bold">Outstanding: NPR {outstanding.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
          </div>
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
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Amount (NPR) *</label>
          <input type="number" min="0.01" step="0.01" max={outstanding} required
            className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 bg-white font-semibold"
            value={form.amount} onChange={(e) => set('amount', e.target.value)}
          />
          <p className="text-[10px] text-gray-400 mt-1">Max: NPR {outstanding.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Description</label>
          <input
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 bg-white"
            value={form.description} onChange={(e) => set('description', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Reference</label>
          <input
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 bg-white"
            placeholder="Voucher / cheque no."
            value={form.reference} onChange={(e) => set('reference', e.target.value)}
          />
        </div>

        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 text-sm font-bold text-gray-600 rounded-xl hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={busy}
            className="flex-1 py-2.5 bg-green-600 text-white text-sm font-black rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors">
            {busy ? 'Processing…' : 'Record Payment'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
