/**
 * BillForm — create or edit a vendor bill.
 * Supports multiple line items.
 */
import { useState, useEffect } from 'react';
import financeApi from '../../services/financeApi';
import { useFinance } from '../../context/FinanceContext';

const inp = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 bg-white';
const lbl = 'block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1';

const EMPTY_BILL = {
  bill_number: '', vendor_name: '', bill_date: '', due_date: '', description: '', notes: '',
};
const EMPTY_ITEM = { description: '', quantity: '1', unit_price: '', amount: '' };

export default function BillForm({ bill = null, onDone }) {
  const { projectId, refresh } = useFinance();
  const [form, setForm]   = useState(EMPTY_BILL);
  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);
  const [busy, setBusy]   = useState(false);
  const [err,  setErr]    = useState('');

  useEffect(() => {
    if (bill) {
      setForm({ ...EMPTY_BILL, ...bill });
      setItems(bill.items?.length ? bill.items.map((i) => ({ ...EMPTY_ITEM, ...i })) : [{ ...EMPTY_ITEM }]);
    } else {
      const today = new Date().toISOString().split('T')[0];
      const due   = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
      setForm({ ...EMPTY_BILL, bill_date: today, due_date: due });
    }
  }, [bill]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const setItem = (idx, k, v) => setItems((prev) => {
    const updated = prev.map((item, i) => {
      if (i !== idx) return item;
      const next = { ...item, [k]: v };
      if (k === 'quantity' || k === 'unit_price') {
        const qty   = Number(k === 'quantity'   ? v : next.quantity)   || 0;
        const price = Number(k === 'unit_price' ? v : next.unit_price) || 0;
        next.amount = (qty * price).toFixed(2);
      }
      return next;
    });
    return updated;
  });

  const addItem    = () => setItems((p) => [...p, { ...EMPTY_ITEM }]);
  const removeItem = (idx) => setItems((p) => p.filter((_, i) => i !== idx));

  const total = items.reduce((s, i) => s + (Number(i.amount) || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const payload = {
        ...form,
        project:      projectId,
        items:        items.filter((i) => i.description && i.amount),
        total_amount: total,
      };
      if (bill) {
        await financeApi.updateBill(bill.id, payload);
      } else {
        await financeApi.createBill(payload);
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
          <label className={lbl}>Bill Number</label>
          <input className={inp} value={form.bill_number} onChange={(e) => set('bill_number', e.target.value)} placeholder="BILL-001" />
        </div>
        <div>
          <label className={lbl}>Vendor Name *</label>
          <input className={inp} required value={form.vendor_name} onChange={(e) => set('vendor_name', e.target.value)} placeholder="Supplier / Contractor" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lbl}>Bill Date</label>
          <input type="date" className={inp} value={form.bill_date} onChange={(e) => set('bill_date', e.target.value)} />
        </div>
        <div>
          <label className={lbl}>Due Date</label>
          <input type="date" className={inp} value={form.due_date} onChange={(e) => set('due_date', e.target.value)} />
        </div>
      </div>

      <div>
        <label className={lbl}>Description</label>
        <input className={inp} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="e.g. Material supply for phase 1" />
      </div>

      {/* Line items */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className={lbl}>Line Items</label>
          <button type="button" onClick={addItem} className="text-[10px] text-blue-600 font-black hover:underline">+ Add Item</button>
        </div>
        <div className="space-y-2">
          {items.map((item, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-5">
                <input className={inp} placeholder="Description" value={item.description}
                  onChange={(e) => setItem(idx, 'description', e.target.value)} />
              </div>
              <div className="col-span-2">
                <input type="number" min="0" step="0.01" className={inp} placeholder="Qty" value={item.quantity}
                  onChange={(e) => setItem(idx, 'quantity', e.target.value)} />
              </div>
              <div className="col-span-2">
                <input type="number" min="0" step="0.01" className={inp} placeholder="Rate" value={item.unit_price}
                  onChange={(e) => setItem(idx, 'unit_price', e.target.value)} />
              </div>
              <div className="col-span-2">
                <input type="number" step="0.01" className={`${inp} bg-gray-50`} placeholder="Amount" value={item.amount}
                  onChange={(e) => setItem(idx, 'amount', e.target.value)} />
              </div>
              <div className="col-span-1 flex justify-center">
                {items.length > 1 && (
                  <button type="button" onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 text-sm">×</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Total */}
      <div className="flex justify-end">
        <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-right">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total Amount</p>
          <p className="text-lg font-black text-gray-800">NPR {total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
        </div>
      </div>

      <button type="submit" disabled={busy}
        className="w-full py-2.5 bg-black text-white text-sm font-black rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-colors">
        {busy ? 'Saving…' : bill ? 'Update Bill' : 'Create Bill'}
      </button>
    </form>
  );
}
