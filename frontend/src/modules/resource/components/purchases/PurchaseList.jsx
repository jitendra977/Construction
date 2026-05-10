import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StatusBadge from '../shared/StatusBadge';
import resourceApi from '../../services/resourceApi';

const fmt  = (v) => Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
const fmtD = (d) => d
  ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  : '—';

function MiniProgress({ items = [] }) {
  if (!items?.length) return null;
  const totalOrdered  = items.reduce((s, it) => s + Number(it.quantity),     0);
  const totalReceived = items.reduce((s, it) => s + Number(it.received_qty), 0);
  if (totalOrdered === 0) return null;
  const pct   = Math.min(100, Math.round((totalReceived / totalOrdered) * 100));
  const color = pct >= 100 ? 'bg-green-400' : pct > 0 ? 'bg-amber-400' : 'bg-gray-200';
  return (
    <div className="space-y-0.5">
      <div className="h-1.5 w-28 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <p className={`text-[9px] font-black ${pct >= 100 ? 'text-green-600' : pct > 0 ? 'text-amber-600' : 'text-gray-300'}`}>
        {pct}% received
      </p>
    </div>
  );
}

export default function PurchaseList({ orders, onReceive, onEdit, onDeleted }) {
  const navigate    = useNavigate();
  const [selected,  setSelected]  = useState(new Set());
  const [deleting,  setDeleting]  = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  if (!orders.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
        <div className="text-4xl mb-3 opacity-40">📦</div>
        <p className="text-sm font-bold text-gray-400">No purchase orders found</p>
        <p className="text-xs text-gray-300 mt-1">Create a purchase order to get started.</p>
      </div>
    );
  }

  const allSelected = selected.size === orders.length && orders.length > 0;
  const someSelected = selected.size > 0;

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(orders.map(o => o.id)));
  };

  const toggleOne = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handlePDF = async (e, id) => {
    e.stopPropagation();
    try {
      const res = await resourceApi.getPurchaseOrderPDF(id);
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      window.open(url, '_blank');
    } catch {
      alert('Failed to load PDF');
    }
  };

  const handleBulkDelete = async () => {
    setDeleting(true);
    try {
      await resourceApi.bulkDeletePurchaseOrders([...selected]);
      setSelected(new Set());
      setShowConfirm(false);
      onDeleted?.();
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to delete orders.');
    } finally {
      setDeleting(false);
    }
  };

  const canReceive = (s) => ['DRAFT', 'ORDERED', 'PARTIAL'].includes(s);
  const selectedList = orders.filter(o => selected.has(o.id));

  return (
    <div className="relative">

      {/* ── Floating Bulk Action Bar ─────────────────────── */}
      {someSelected && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center gap-4 bg-gray-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl shadow-black/40 border border-white/10 backdrop-blur">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-[10px] font-black">{selected.size}</span>
              </div>
              <span className="text-xs font-black">
                {selected.size} order{selected.size !== 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="h-4 w-px bg-white/20" />
            <button
              onClick={() => setSelected(new Set())}
              className="text-xs font-bold text-gray-400 hover:text-white transition-colors"
            >
              Clear
            </button>
            <button
              onClick={() => setShowConfirm(true)}
              className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-black rounded-xl transition-colors flex items-center gap-1.5"
            >
              🗑 Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Dialog ────────────────────────── */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !deleting && setShowConfirm(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center text-2xl shrink-0">🗑</div>
              <div>
                <h3 className="text-base font-black text-gray-900">Delete {selected.size} Order{selected.size !== 1 ? 's' : ''}?</h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  This action <strong>cannot be undone</strong>. All associated items and stock movement records will also be removed.
                </p>
              </div>
            </div>

            {/* List of orders to be deleted */}
            <div className="bg-red-50 border border-red-100 rounded-xl p-3 max-h-40 overflow-y-auto space-y-1">
              {selectedList.map(o => (
                <div key={o.id} className="flex items-center justify-between text-xs">
                  <span className="font-black text-gray-800">{o.order_number || 'No Ref'}</span>
                  <span className="text-gray-400">{o.supplier_name || 'No Supplier'}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={deleting}
                className="flex-1 py-2.5 bg-white border border-gray-200 text-gray-700 text-xs font-black rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={deleting}
                className="flex-1 py-2.5 bg-red-600 text-white text-xs font-black rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Deleting...</>
                ) : (
                  `Yes, Delete ${selected.size}`
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Table ──────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        {/* Toolbar when some selected */}
        {someSelected && (
          <div className="px-5 py-3 bg-red-50 border-b border-red-100 flex items-center justify-between">
            <p className="text-xs font-black text-red-700">
              {selected.size} of {orders.length} orders selected
            </p>
            <button
              onClick={() => setShowConfirm(true)}
              className="px-4 py-1.5 bg-red-600 text-white text-xs font-black rounded-lg hover:bg-red-700 transition-colors"
            >
              🗑 Delete {selected.size} Selected
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {/* Select All */}
                <th className="px-4 py-4 w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"
                    title="Select all"
                  />
                </th>
                <th className="text-left px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Order</th>
                <th className="text-left px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Supplier</th>
                <th className="text-left px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Dates</th>
                <th className="text-left px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Receipt Progress</th>
                <th className="text-right px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Amount</th>
                <th className="text-center px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                <th className="text-right px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest pr-5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.map((o) => {
                const isSelected = selected.has(o.id);
                const isOverdue  = o.expected_date
                  && new Date(o.expected_date) < new Date()
                  && !['RECEIVED', 'CANCELLED'].includes(o.status);

                return (
                  <tr
                    key={o.id}
                    className={`group transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-red-50 hover:bg-red-50/80'
                        : 'hover:bg-gray-50/50'
                    }`}
                    onClick={() => navigate(`/dashboard/desktop/resource/purchases/${o.id}`)}
                  >
                    {/* Checkbox */}
                    <td className="px-4 py-4" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleOne(o.id)}
                        className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"
                      />
                    </td>

                    {/* Order # */}
                    <td className="px-4 py-4">
                      <p className={`text-xs font-black transition-colors ${isSelected ? 'text-red-700' : 'text-gray-900 group-hover:text-blue-600'}`}>
                        {o.order_number || 'No Ref'}
                      </p>
                      <p className="text-[10px] font-bold text-gray-400 mt-0.5">
                        {o.item_count || 0} item{o.item_count !== 1 ? 's' : ''}
                      </p>
                    </td>

                    {/* Supplier */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center text-[10px] font-black text-blue-600 shrink-0">
                          {(o.supplier_name || 'U')[0].toUpperCase()}
                        </div>
                        <span className="text-xs font-bold text-gray-700 truncate max-w-[120px]">
                          {o.supplier_name || 'Unspecified'}
                        </span>
                      </div>
                    </td>

                    {/* Dates */}
                    <td className="px-4 py-4">
                      <p className="text-[11px] font-bold text-gray-600">{fmtD(o.order_date)}</p>
                      {o.expected_date && (
                        <p className={`text-[9px] font-bold mt-0.5 ${isOverdue ? 'text-red-500' : 'text-amber-500'}`}>
                          {isOverdue ? '⚠ Overdue' : `Exp: ${fmtD(o.expected_date)}`}
                        </p>
                      )}
                    </td>

                    {/* Receipt Progress */}
                    <td className="px-4 py-4">
                      {o.status === 'RECEIVED' ? (
                        <div className="space-y-0.5">
                          <div className="h-1.5 w-28 bg-green-100 rounded-full"><div className="h-full w-full bg-green-400 rounded-full" /></div>
                          <p className="text-[9px] font-black text-green-600">100% complete ✓</p>
                        </div>
                      ) : o.status === 'CANCELLED' ? (
                        <p className="text-[9px] font-bold text-gray-300 italic">Cancelled</p>
                      ) : o.status === 'DRAFT' ? (
                        <p className="text-[9px] font-bold text-gray-300 italic">Not placed yet</p>
                      ) : (
                        <MiniProgress items={o.items} />
                      )}
                    </td>

                    {/* Amount */}
                    <td className="px-4 py-4 text-right">
                      <p className="text-xs font-black text-gray-900">NPR {fmt(o.total_amount)}</p>
                      <p className="text-[9px] font-bold text-gray-400">total value</p>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-4 text-center">
                      <StatusBadge status={o.status} type="purchase_status" />
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-4 pr-5" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {canReceive(o.status) && (
                          <button
                            onClick={() => onReceive(o)}
                            className="px-3 py-1.5 bg-green-600 text-white text-[10px] font-black rounded-lg hover:bg-green-700 transition-colors shadow-sm whitespace-nowrap"
                          >
                            📦 Receive
                          </button>
                        )}
                        <button
                          onClick={() => onEdit(o)}
                          className="px-3 py-1.5 bg-white border border-gray-200 text-gray-600 text-[10px] font-black rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => handlePDF(e, o.id)}
                          className="px-3 py-1.5 bg-red-50 text-red-500 text-[10px] font-black rounded-lg hover:bg-red-100 transition-colors"
                        >
                          PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
