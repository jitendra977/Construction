import { useState, useEffect } from 'react';
import resourceApi from '../../services/resourceApi';
import { useResource } from '../../context/ResourceContext';

const STATUSES = ['DRAFT', 'ORDERED', 'RECEIVED', 'CANCELLED'];

const emptyItem = () => ({ description: '', quantity: '', unit_price: '', amount: 0 });

export default function PurchaseForm({ order, onDone }) {
  const { projectId, suppliers, materials } = useResource();
  const isEdit = Boolean(order);

  const [form, setForm] = useState({
    order_number:  order?.order_number  || '',
    supplier:      order?.supplier      || '',
    order_date:    order?.order_date    || new Date().toISOString().slice(0, 10),
    expected_date: order?.expected_date || '',
    status:        order?.status        || 'DRAFT',
    notes:         order?.notes         || '',
  });
  const [items,   setItems]   = useState([emptyItem()]);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState(null);

  // Load existing items for edit
  useEffect(() => {
    if (isEdit && order?.id) {
      resourceApi.getPurchaseItems(order.id)
        .then((res) => {
          const data = res.data?.results || res.data || [];
          if (data.length) setItems(data.map((it) => ({
            id:          it.id,
            description: it.description || it.material_name || '',
            quantity:    it.quantity || '',
            unit_price:  it.unit_price || '',
            amount:      it.amount || 0,
          })));
        })
        .catch(() => {});
    }
  }, [isEdit, order?.id]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const setItem = (i, k) => (e) => {
    setItems((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [k]: e.target.value };
      const qty = parseFloat(next[i].quantity) || 0;
      const price = parseFloat(next[i].unit_price) || 0;
      next[i].amount = qty * price;
      return next;
    });
  };

  const addItem    = () => setItems((p) => [...p, emptyItem()]);
  const removeItem = (i) => setItems((p) => p.filter((_, idx) => idx !== i));

  const totalAmount = items.reduce((sum, it) => sum + (parseFloat(it.amount) || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = { ...form, project: projectId, total_amount: totalAmount };
      let orderId;
      if (isEdit) {
        await resourceApi.updatePurchaseOrder(order.id, payload);
        orderId = order.id;
      } else {
        const res = await resourceApi.createPurchaseOrder(payload);
        orderId = res.data.id;
      }
      // Save items
      await Promise.all(
        items.map((it) =>
          it.id
            ? resourceApi.updatePurchaseItem(it.id, { ...it, order: orderId })
            : resourceApi.createPurchaseItem({ ...it, order: orderId })
        )
      );
      onDone();
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
        JSON.stringify(err?.response?.data) ||
        'Save failed.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-5">
      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {/* Order Number */}
        <div>
          <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">
            Order Number *
          </label>
          <input
            value={form.order_number}
            onChange={set('order_number')}
            required
            placeholder="e.g. PO-2025-001"
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-black transition-colors"
          />
        </div>

        {/* Supplier */}
        <div>
          <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">
            Supplier *
          </label>
          <select
            value={form.supplier}
            onChange={set('supplier')}
            required
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-black transition-colors"
          >
            <option value="">Select supplier...</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Order Date */}
        <div>
          <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">
            Order Date *
          </label>
          <input
            type="date"
            value={form.order_date}
            onChange={set('order_date')}
            required
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-black transition-colors"
          />
        </div>

        {/* Expected Date */}
        <div>
          <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">
            Expected Date
          </label>
          <input
            type="date"
            value={form.expected_date}
            onChange={set('expected_date')}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-black transition-colors"
          />
        </div>

        {/* Status */}
        <div>
          <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">
            Status
          </label>
          <select
            value={form.status}
            onChange={set('status')}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-black transition-colors"
          >
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">
          Notes
        </label>
        <textarea
          value={form.notes}
          onChange={set('notes')}
          rows={2}
          placeholder="Delivery instructions, terms..."
          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-black transition-colors resize-none"
        />
      </div>

      {/* Line Items */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider">
            Line Items
          </label>
          <button
            type="button"
            onClick={addItem}
            className="px-3 py-1 bg-gray-100 text-gray-600 text-[10px] font-black rounded-lg hover:bg-gray-200 transition-colors"
          >
            + Add Item
          </button>
        </div>

        <div className="space-y-2">
          {/* Header row */}
          <div className="grid grid-cols-12 gap-2 px-2">
            <div className="col-span-5 text-[9px] font-black text-gray-400 uppercase">Description</div>
            <div className="col-span-2 text-[9px] font-black text-gray-400 uppercase">Qty</div>
            <div className="col-span-3 text-[9px] font-black text-gray-400 uppercase">Unit Price</div>
            <div className="col-span-2 text-[9px] font-black text-gray-400 uppercase text-right">Amount</div>
          </div>

          {items.map((item, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 bg-gray-50 rounded-xl p-2 items-center">
              <div className="col-span-5">
                <input
                  value={item.description}
                  onChange={setItem(i, 'description')}
                  placeholder="Item description"
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-900 focus:outline-none focus:border-black transition-colors bg-white"
                />
              </div>
              <div className="col-span-2">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.quantity}
                  onChange={setItem(i, 'quantity')}
                  placeholder="0"
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-900 focus:outline-none focus:border-black transition-colors bg-white"
                />
              </div>
              <div className="col-span-3">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.unit_price}
                  onChange={setItem(i, 'unit_price')}
                  placeholder="0.00"
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-900 focus:outline-none focus:border-black transition-colors bg-white"
                />
              </div>
              <div className="col-span-1 text-right">
                <span className="text-xs font-bold text-gray-700">
                  {Number(item.amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </span>
              </div>
              {items.length > 1 && (
                <div className="col-span-1 text-right">
                  <button
                    type="button"
                    onClick={() => removeItem(i)}
                    className="text-gray-300 hover:text-red-500 text-lg leading-none transition-colors"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          ))}

          {/* Total */}
          <div className="flex justify-end px-2 pt-2">
            <div className="bg-gray-900 text-white px-4 py-2 rounded-xl">
              <span className="text-[10px] font-bold text-gray-300 mr-3 uppercase tracking-wider">Total</span>
              <span className="text-sm font-black">
                NPR {totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onDone}
          className="px-4 py-2 text-xs font-black text-gray-500 hover:text-gray-800 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2 bg-black text-white text-xs font-black rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving...' : isEdit ? 'Update Order' : 'Create Order'}
        </button>
      </div>
    </form>
  );
}
