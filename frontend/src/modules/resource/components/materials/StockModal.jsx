/**
 * StockModal — modal for stock in or stock out operations.
 * Props: material, type ('in'|'out'), onClose
 */
import { useState } from 'react';
import Modal from '../shared/Modal';
import resourceApi from '../../services/resourceApi';

export default function StockModal({ material, type, onClose }) {
  const isIn = type === 'in';

  const [form, setForm] = useState({
    quantity:  '',
    reference: '',
    notes:     '',
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (isIn) {
        await resourceApi.stockIn(material.id, form);
      } else {
        await resourceApi.stockOut(material.id, form);
      }
      onClose(true); // true = refresh needed
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
        JSON.stringify(err?.response?.data) ||
        'Operation failed.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={() => onClose(false)}
      title={isIn ? 'Stock In' : 'Stock Out'}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {/* Material info */}
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs font-black text-gray-700">{material.name}</p>
          <p className="text-[10px] text-gray-400 mt-1">
            Current stock: <span className="font-bold text-gray-600">{Number(material.stock_qty || 0).toLocaleString()} {material.unit}</span>
          </p>
        </div>

        {error && (
          <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold">
            {error}
          </div>
        )}

        {/* Quantity */}
        <div>
          <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">
            Quantity ({material.unit}) *
          </label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={form.quantity}
            onChange={set('quantity')}
            required
            placeholder="0"
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-black transition-colors"
          />
          {!isIn && (
            <p className="text-[10px] text-red-500 mt-1">
              Max available: {Number(material.stock_qty || 0).toLocaleString()} {material.unit}
            </p>
          )}
        </div>

        {/* Reference */}
        <div>
          <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">
            Reference
          </label>
          <input
            value={form.reference}
            onChange={set('reference')}
            placeholder="e.g. PO-001, Invoice #123"
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-black transition-colors"
          />
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
            placeholder="Optional..."
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-black transition-colors resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => onClose(false)}
            className="px-4 py-2 text-xs font-black text-gray-500 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className={`px-6 py-2 text-white text-xs font-black rounded-xl disabled:opacity-50 transition-colors ${
              isIn ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {saving ? 'Saving...' : isIn ? '+ Stock In' : '- Stock Out'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
