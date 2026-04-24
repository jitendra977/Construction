/**
 * DepositModal — deposit funds into a bank/cash account.
 * Opens a Modal and posts to /fin/accounts/{id}/deposit/
 */
import { useState } from 'react';
import Modal from '../shared/Modal';
import financeApi from '../../services/financeApi';
import { useFinance } from '../../context/FinanceContext';
import AmountDisplay from '../shared/AmountDisplay';

export default function DepositModal({ account, onClose }) {
  const { refresh } = useFinance();
  const [form, setForm] = useState({ amount: '', description: '', reference: '' });
  const [busy, setBusy]  = useState(false);
  const [err,  setErr]   = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) { setErr('Amount must be greater than 0'); return; }
    setBusy(true); setErr('');
    try {
      await financeApi.depositToAccount(account.id, {
        amount:      form.amount,
        description: form.description || `Deposit to ${account.name}`,
        reference:   form.reference,
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
    <Modal isOpen onClose={onClose} title="Deposit Funds" maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {/* Target account */}
        <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">To Account</p>
            <p className="text-sm font-black text-blue-800">{account.name}</p>
            <p className="text-xs text-blue-400">{account.bank_name || 'Cash Account'}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Current Balance</p>
            <AmountDisplay value={account.balance} size="lg" colorize />
          </div>
        </div>

        {err && <p className="text-xs text-red-600 font-semibold bg-red-50 p-2 rounded-lg">{err}</p>}

        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
            Amount (NPR) <span className="text-red-500">*</span>
          </label>
          <input
            type="number" min="1" step="0.01" required
            className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 bg-white font-semibold"
            placeholder="0.00"
            value={form.amount}
            onChange={(e) => set('amount', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Description</label>
          <input
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 bg-white"
            placeholder="e.g. Opening balance, Cash received"
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Reference / Voucher No.</label>
          <input
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 bg-white"
            placeholder="e.g. VCH-001, DEP-2024"
            value={form.reference}
            onChange={(e) => set('reference', e.target.value)}
          />
        </div>

        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 text-sm font-bold text-gray-600 rounded-xl hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={busy}
            className="flex-1 py-2.5 bg-green-600 text-white text-sm font-black rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors">
            {busy ? 'Processing…' : '+ Deposit'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
