/**
 * ReceiptModal — Real-world Goods Receipt Note (GRN).
 *
 * Key fixes:
 *  - Sends { receipts: { id: qty }, vehicle_number, ... } — exact shape backend expects
 *  - "Confirm" disabled if total qty to receive = 0
 *  - Input default = remaining qty (not 0), so it's fast for full deliveries
 *  - Per-row progress bar updates live as you type
 *  - Items already fully received are greyed out
 */
import { useState, useEffect } from 'react';
import Modal from '../shared/Modal';

/* ── Mini progress bar ─────────────────────────────────── */
function Bar({ pct }) {
  const color = pct >= 100 ? 'bg-green-500' : pct > 0 ? 'bg-amber-400' : 'bg-gray-200';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${color}`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      <span className={`text-[9px] font-black w-7 text-right shrink-0 ${
        pct >= 100 ? 'text-green-600' : pct > 0 ? 'text-amber-600' : 'text-gray-300'
      }`}>{Math.round(pct)}%</span>
    </div>
  );
}

export default function ReceiptModal({ isOpen, onClose, onConfirm, order, processing }) {
  // qty[itemId] = string value the user typed
  const [qty,  setQtyMap]  = useState({});
  const [meta, setMeta]    = useState({ vehicle_number: '', delivered_by: '', document_ref: '', notes: '' });

  /* Reset every time the modal opens */
  useEffect(() => {
    if (!isOpen || !order?.items) return;
    const init = {};
    order.items.forEach(it => {
      const remaining = Math.max(0, Number(it.quantity) - Number(it.received_qty));
      // Default: pre-fill with remaining so a full delivery is one click
      init[it.id] = remaining > 0 ? String(remaining) : '0';
    });
    setQtyMap(init);
    setMeta({ vehicle_number: '', delivered_by: '', document_ref: '', notes: '' });
  }, [isOpen, order]);

  if (!order) return null;

  /* ── Helpers ──────────────────────────────────────────── */
  const setQty = (id, raw) => {
    const it        = order.items.find(x => x.id === id);
    const remaining = Math.max(0, Number(it.quantity) - Number(it.received_qty));
    const n         = parseFloat(raw);
    const clamped   = isNaN(n) ? '' : String(Math.min(Math.max(0, n), remaining));
    setQtyMap(prev => ({ ...prev, [id]: clamped }));
  };

  const fillAll = () => {
    const next = {};
    order.items.forEach(it => {
      next[it.id] = String(Math.max(0, Number(it.quantity) - Number(it.received_qty)));
    });
    setQtyMap(next);
  };

  const clearAll = () => {
    const next = {};
    order.items.forEach(it => { next[it.id] = '0'; });
    setQtyMap(next);
  };

  /* ── Submit ───────────────────────────────────────────── */
  const handleConfirm = () => {
    // Build the exact payload shape the backend expects
    const receipts = {};
    order.items.forEach(it => {
      const v = parseFloat(qty[it.id] || '0');
      if (v > 0) receipts[it.id] = String(v);
    });
    onConfirm({
      receipts,
      vehicle_number: meta.vehicle_number.trim(),
      delivered_by:   meta.delivered_by.trim(),
      document_ref:   meta.document_ref.trim(),
      notes:          meta.notes.trim(),
    });
  };

  /* ── Live summary ─────────────────────────────────────── */
  const itemsReceiving = order.items?.filter(it => Number(qty[it.id] || 0) > 0).length ?? 0;
  const totalUnits     = order.items?.reduce((s, it) => s + Number(qty[it.id] || 0), 0) ?? 0;
  const canConfirm     = itemsReceiving > 0 && !processing;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" maxWidth="max-w-3xl">
      <div className="flex flex-col max-h-[90vh]">

        {/* ── Header ─────────────────────────────────────── */}
        <div className="px-6 pt-5 pb-4 border-b border-gray-100 bg-gradient-to-r from-green-50 to-white shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">📦</span>
                <h2 className="text-sm font-black text-gray-900 tracking-tight">Goods Receipt Note</h2>
              </div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                {order.order_number} · {order.supplier_name || 'No Supplier'}
              </p>
            </div>
            {/* Live badge */}
            <div className={`text-center px-4 py-2 rounded-xl border transition-all ${
              canConfirm
                ? 'bg-green-50 border-green-200'
                : 'bg-gray-50 border-gray-100'
            }`}>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-0.5">
                {canConfirm ? 'Ready' : 'Pending'}
              </p>
              <p className={`text-lg font-black ${canConfirm ? 'text-green-600' : 'text-gray-300'}`}>
                {itemsReceiving} item{itemsReceiving !== 1 ? 's' : ''}
              </p>
              <p className="text-[9px] font-bold text-gray-400">
                {totalUnits.toLocaleString('en-IN')} units
              </p>
            </div>
          </div>
        </div>

        {/* ── Shipment metadata ──────────────────────────── */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 shrink-0">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">
            Shipment Details <span className="font-normal text-gray-300">(optional)</span>
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { key: 'vehicle_number', icon: '🚛', label: 'Vehicle #',      ph: 'BA 1 CHA 1234' },
              { key: 'delivered_by',   icon: '👤', label: 'Delivered By',   ph: 'Driver name'   },
              { key: 'document_ref',   icon: '🧾', label: 'Delivery Note',  ph: 'DN-1001'       },
              { key: 'notes',          icon: '📝', label: 'Notes',          ph: 'Remarks…'      },
            ].map(f => (
              <div key={f.key} className="space-y-1">
                <label className="text-[9px] font-black text-gray-500 uppercase tracking-wider">
                  {f.icon} {f.label}
                </label>
                <input
                  type="text"
                  placeholder={f.ph}
                  value={meta[f.key]}
                  onChange={e => setMeta(p => ({ ...p, [f.key]: e.target.value }))}
                  className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium placeholder-gray-300 focus:ring-2 focus:ring-green-400/20 focus:border-green-400 outline-none transition-all"
                />
              </div>
            ))}
          </div>
        </div>

        {/* ── Items ──────────────────────────────────────── */}
        <div className="px-6 py-4 overflow-y-auto flex-1">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
              Items — {order.items?.length || 0} total
            </p>
            <div className="flex gap-1.5">
              <button
                onClick={fillAll}
                className="text-[9px] font-black text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 px-2.5 py-1 rounded-lg transition-colors"
              >✓ Fill All</button>
              <button
                onClick={clearAll}
                className="text-[9px] font-black text-gray-500 bg-gray-50 hover:bg-gray-100 border border-gray-200 px-2.5 py-1 rounded-lg transition-colors"
              >✕ Clear</button>
            </div>
          </div>

          <div className="space-y-2">
            {order.items?.map(it => {
              const ordered      = Number(it.quantity);
              const alreadyGot   = Number(it.received_qty);
              const remaining    = Math.max(0, ordered - alreadyGot);
              const nowQty       = Number(qty[it.id] || 0);
              const afterBatch   = alreadyGot + nowQty;
              const pct          = ordered > 0 ? (afterBatch / ordered) * 100 : 0;
              const isDone       = alreadyGot >= ordered;
              const willComplete = !isDone && afterBatch >= ordered;

              return (
                <div
                  key={it.id}
                  className={`rounded-xl border p-3 transition-all ${
                    isDone
                      ? 'bg-green-50/40 border-green-100 opacity-60'
                      : nowQty > 0
                        ? 'bg-white border-green-300 shadow-sm shadow-green-500/5'
                        : 'bg-white border-gray-100'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Left: info + progress */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs font-black text-gray-900 truncate">
                          {it.description || it.material_name || 'Item'}
                        </p>
                        {isDone && (
                          <span className="text-[8px] font-black text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full shrink-0">
                            ✓ DONE
                          </span>
                        )}
                        {willComplete && (
                          <span className="text-[8px] font-black text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full shrink-0">
                            ★ COMPLETES
                          </span>
                        )}
                      </div>

                      {it.material_name && it.description && (
                        <p className="text-[9px] text-gray-400 font-semibold">→ {it.material_name}</p>
                      )}

                      <Bar pct={pct} />

                      <div className="flex justify-between text-[9px] font-bold">
                        <span className="text-gray-400">
                          {alreadyGot > 0
                            ? `${alreadyGot} / ${ordered} already received`
                            : `0 / ${ordered} received`}
                        </span>
                        <span className={nowQty > 0 ? 'text-green-600' : 'text-gray-400'}>
                          {afterBatch} / {ordered} after this batch
                        </span>
                      </div>
                    </div>

                    {/* Right: qty controls */}
                    {!isDone ? (
                      <div className="shrink-0 flex items-center gap-2">
                        <div className="text-center space-y-1">
                          <p className="text-[9px] text-gray-400 font-bold">Now</p>
                          <div className="flex items-center gap-0.5">
                            <button
                              onClick={() => setQty(it.id, nowQty - 1)}
                              disabled={nowQty <= 0}
                              className="w-6 h-7 bg-gray-100 hover:bg-gray-200 rounded-l-md text-xs font-black text-gray-600 disabled:opacity-20 transition-colors"
                            >−</button>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max={remaining}
                              value={qty[it.id] ?? ''}
                              onChange={e => setQty(it.id, e.target.value)}
                              className="w-16 h-7 px-1 border-y border-gray-200 text-center text-xs font-black text-gray-900 focus:outline-none focus:border-green-400 bg-white"
                            />
                            <button
                              onClick={() => setQty(it.id, nowQty + 1)}
                              disabled={nowQty >= remaining}
                              className="w-6 h-7 bg-gray-100 hover:bg-gray-200 rounded-r-md text-xs font-black text-gray-600 disabled:opacity-20 transition-colors"
                            >+</button>
                          </div>
                          <p className="text-[8px] text-gray-400 font-bold">of {remaining}</p>
                        </div>
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => setQty(it.id, String(remaining))}
                            title="Receive all remaining"
                            className="text-[8px] font-black text-green-700 bg-green-50 hover:bg-green-100 border border-green-100 px-1.5 py-0.5 rounded-md transition-colors"
                          >All</button>
                          <button
                            onClick={() => setQty(it.id, '0')}
                            title="Skip this item"
                            className="text-[8px] font-black text-gray-400 bg-gray-50 hover:bg-gray-100 border border-gray-100 px-1.5 py-0.5 rounded-md transition-colors"
                          >Skip</button>
                        </div>
                      </div>
                    ) : (
                      <span className="text-2xl shrink-0">✅</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────── */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/40 flex items-center justify-between shrink-0">
          <div className="text-[10px] font-medium text-gray-400 max-w-xs">
            {canConfirm
              ? <span className="text-green-700 font-black">✓ {itemsReceiving} item{itemsReceiving !== 1 ? 's' : ''} · {totalUnits.toLocaleString('en-IN')} units ready to record.</span>
              : <span>Enter a quantity (&gt; 0) for at least one item.</span>
            }
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={processing}
              className="px-4 py-2 bg-white border border-gray-200 text-xs font-black text-gray-500 hover:text-gray-800 rounded-xl transition-colors disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!canConfirm}
              className="px-6 py-2 bg-green-600 text-white text-xs font-black rounded-xl hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shadow-green-600/20 flex items-center gap-2"
            >
              {processing
                ? <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
                : '✓ Confirm Receipt'
              }
            </button>
          </div>
        </div>

      </div>
    </Modal>
  );
}
