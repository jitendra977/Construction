import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useResource } from '../context/ResourceContext';
import resourceApi from '../services/resourceApi';
import StatusBadge from '../components/shared/StatusBadge';
import ReceiptModal from '../components/purchases/ReceiptModal';

/* ── Helpers ─────────────────────────────────────────────── */
const fmt  = (v) => Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
const fmtD = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtT = (d) => d ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';

function OverallProgress({ items = [] }) {
  if (!items.length) return null;
  const totalOrdered  = items.reduce((s, it) => s + Number(it.quantity), 0);
  const totalReceived = items.reduce((s, it) => s + Number(it.received_qty), 0);
  const pct = totalOrdered > 0 ? Math.round((totalReceived / totalOrdered) * 100) : 0;
  const color = pct >= 100 ? 'bg-green-500' : pct > 0 ? 'bg-amber-400' : 'bg-gray-300';

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[10px] font-black uppercase tracking-wider text-gray-400">
        <span>Overall Progress</span>
        <span className={pct >= 100 ? 'text-green-600' : pct > 0 ? 'text-amber-600' : 'text-gray-400'}>
          {pct}% received
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[9px] text-gray-400 font-bold">
        {fmt(totalReceived)} of {fmt(totalOrdered)} units received
      </p>
    </div>
  );
}

function ItemProgressRow({ item }) {
  const ordered      = Number(item.quantity);
  const received     = Number(item.received_qty);
  const remaining    = Math.max(0, ordered - received);
  const pct          = ordered > 0 ? Math.min(100, Math.round((received / ordered) * 100)) : 0;
  const isDone       = received >= ordered;

  return (
    <tr className="hover:bg-gray-50/50 transition-colors group">
      <td className="px-5 py-4">
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${isDone ? 'bg-green-400' : received > 0 ? 'bg-amber-400' : 'bg-gray-200'}`} />
          <div>
            <p className="text-xs font-bold text-gray-900">{item.description || 'Custom Item'}</p>
            {item.material_name && (
              <p className="text-[9px] font-bold text-gray-400 mt-0.5 bg-gray-50 border border-gray-100 rounded px-1.5 py-0.5 inline-block">
                📦 {item.material_name}
              </p>
            )}
          </div>
        </div>
      </td>
      <td className="px-5 py-4 text-right">
        <span className="text-xs font-bold text-gray-700">{fmt(ordered)}</span>
      </td>
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${isDone ? 'bg-green-400' : received > 0 ? 'bg-amber-400' : 'bg-gray-200'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className={`text-xs font-black w-8 text-right ${isDone ? 'text-green-600' : received > 0 ? 'text-amber-600' : 'text-gray-300'}`}>
            {pct}%
          </span>
        </div>
      </td>
      <td className="px-5 py-4 text-right">
        <span className={`text-xs font-black ${isDone ? 'text-green-600' : received > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
          {fmt(received)}
        </span>
        {!isDone && (
          <p className="text-[9px] text-gray-400 font-bold">{fmt(remaining)} pending</p>
        )}
        {isDone && (
          <p className="text-[9px] text-green-500 font-black">Complete ✓</p>
        )}
      </td>
      <td className="px-5 py-4 text-right text-xs font-bold text-gray-500">{fmt(item.unit_price)}</td>
      <td className="px-5 py-4 text-right text-xs font-black text-gray-900">{fmt(ordered * Number(item.unit_price))}</td>
    </tr>
  );
}

function ShipmentTimeline({ movements = [] }) {
  if (!movements.length) return null;

  // Group movements by date
  const groups = movements.reduce((acc, m) => {
    const date = fmtD(m.created_at);
    if (!acc[date]) acc[date] = [];
    acc[date].push(m);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {Object.entries(groups).map(([date, items]) => (
        <div key={date}>
          {/* Date label */}
          <div className="flex items-center gap-3 mb-3">
            <div className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{date}</p>
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-[9px] font-black text-gray-300">{items.length} shipment{items.length > 1 ? 's' : ''}</span>
          </div>

          <div className="pl-5 border-l-2 border-gray-100 space-y-3">
            {items.map((m) => (
              <div key={m.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:border-gray-200 transition-all">
                <div className="flex items-start justify-between gap-4">
                  {/* Left: Time + Shipment info */}
                  <div className="flex gap-3">
                    <div className="shrink-0 text-right w-12">
                      <p className="text-[9px] font-black text-gray-400 uppercase">{fmtT(m.created_at)}</p>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap gap-2">
                        {m.vehicle_number && (
                          <span className="text-[10px] font-black text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                            🚛 {m.vehicle_number}
                          </span>
                        )}
                        {m.delivered_by && (
                          <span className="text-[10px] font-black text-gray-600 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                            👤 {m.delivered_by}
                          </span>
                        )}
                        {m.document_ref && (
                          <span className="text-[10px] font-bold text-purple-600 bg-purple-50 border border-purple-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                            🧾 {m.document_ref}
                          </span>
                        )}
                        {!m.vehicle_number && !m.delivered_by && !m.document_ref && (
                          <span className="text-[10px] text-gray-300 italic">No shipment details recorded</span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-500 font-semibold">
                        Material: <span className="font-black text-gray-800">{m.material_name || m.reference}</span>
                      </p>
                      {m.notes && (
                        <p className="text-[9px] text-gray-400 italic">{m.notes}</p>
                      )}
                    </div>
                  </div>

                  {/* Right: Quantity chip */}
                  <div className="shrink-0 text-right">
                    <div className="bg-green-50 border border-green-100 rounded-xl px-3 py-2">
                      <p className="text-[9px] font-black text-green-500 uppercase tracking-wider">Received</p>
                      <p className="text-base font-black text-green-700">{fmt(m.quantity)}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Main Page ────────────────────────────────────────────── */
export default function PurchaseDetailPage() {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const { projectId } = useResource();

  const [order, setOrder]           = useState(null);
  const [loading, setLoading]       = useState(true);
  const [receiving, setReceiving]   = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sendEmail, setSendEmail]   = useState(true);
  const [activeTab, setActiveTab]   = useState('items'); // 'items' | 'tracking'

  const loadOrder = async () => {
    try {
      setLoading(true);
      const res = await resourceApi.getPurchaseOrder(id);
      setOrder(res.data);
    } catch (err) {
      console.error('Failed to load order:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (id) loadOrder(); }, [id]);

  const changeStatus = async (newStatus) => {
    try {
      const payload = { status: newStatus };
      if (newStatus === 'ORDERED') payload.send_email = sendEmail;
      await resourceApi.updatePurchaseOrder(id, payload);
      await loadOrder();
    } catch (err) {
      alert(err?.response?.data?.detail || `Failed to mark as ${newStatus}.`);
    }
  };

  const confirmReceive = async (payload) => {
    setConfirmOpen(false);
    setReceiving(true);
    try {
      await resourceApi.receivePurchaseOrder(id, payload);
      await loadOrder();
      setActiveTab('tracking'); // Jump to tracking tab after receipt
    } catch (err) {
      alert(err?.response?.data?.error || err?.response?.data?.detail || 'Failed to receive order.');
    } finally {
      setReceiving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Purchase order not found.</p>
        <button onClick={() => navigate('..')} className="mt-4 text-blue-600 hover:underline">Go back</button>
      </div>
    );
  }

  const canReceive    = ['ORDERED', 'PARTIAL'].includes(order.status);
  const shipmentCount = order.stock_movements?.length || 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">

      {/* ── Header ────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('..')}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-black transition-colors shrink-0"
          >
            <span className="text-xl leading-none">←</span>
          </button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-black tracking-tight text-gray-900">{order.order_number || 'Unnamed Order'}</h1>
              <StatusBadge status={order.status} type="purchase_status" />
            </div>
            <p className="text-sm text-gray-400 font-medium mt-1">
              {order.supplier_name || 'No Supplier'} · {order.order_date}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {order.status === 'DRAFT' && (
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-gray-200">
              <label className="flex items-center gap-2 cursor-pointer text-[10px] font-black text-gray-500 uppercase tracking-wider">
                <input
                  type="checkbox"
                  checked={sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 border-gray-300 w-3.5 h-3.5"
                />
                Email Supplier
              </label>
              <button
                onClick={() => changeStatus('ORDERED')}
                className="px-4 py-1.5 bg-blue-600 text-white text-xs font-black tracking-wide uppercase rounded-lg hover:bg-blue-700 transition-all shadow-sm"
              >
                Place Order
              </button>
            </div>
          )}
          {canReceive && (
            <button
              onClick={() => setConfirmOpen(true)}
              disabled={receiving}
              className="px-5 py-2.5 bg-green-600 text-white text-xs font-black tracking-wide uppercase rounded-xl hover:bg-green-700 transition-all shadow-md shadow-green-600/25 disabled:opacity-50 flex items-center gap-2"
            >
              {receiving ? (
                <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Processing...</>
              ) : (
                <>📦 Record Delivery</>
              )}
            </button>
          )}
          {['DRAFT', 'ORDERED', 'PARTIAL'].includes(order.status) && (
            <button
              onClick={() => window.confirm('Cancel this order?') && changeStatus('CANCELLED')}
              className="px-4 py-2.5 bg-white border border-gray-200 text-red-500 text-xs font-black tracking-wide uppercase rounded-xl hover:bg-red-50 transition-all"
            >
              Cancel
            </button>
          )}
          <button
            onClick={async () => {
              try {
                const res = await resourceApi.getPurchaseOrderPDF(id);
                const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
                window.open(url, '_blank');
              } catch { alert('Failed to load PDF'); }
            }}
            className="px-4 py-2.5 bg-red-600 text-white text-xs font-black tracking-wide uppercase rounded-xl hover:bg-red-700 transition-all shadow-sm"
          >
            🖨 PDF
          </button>
        </div>
      </div>

      {/* ── Summary Cards ─────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-gray-200/60 shadow-sm">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Supplier</p>
          <p className="text-sm font-black text-gray-900 truncate">{order.supplier_name || '—'}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-200/60 shadow-sm">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Order Date</p>
          <p className="text-sm font-bold text-gray-900">{fmtD(order.order_date)}</p>
        </div>
        <div className={`bg-white p-4 rounded-2xl border shadow-sm ${order.expected_date && new Date(order.expected_date) < new Date() && order.status !== 'RECEIVED' ? 'border-red-200 bg-red-50/30' : 'border-gray-200/60'}`}>
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Expected</p>
          <p className={`text-sm font-bold ${order.expected_date && new Date(order.expected_date) < new Date() && order.status !== 'RECEIVED' ? 'text-red-600' : 'text-amber-600'}`}>
            {fmtD(order.expected_date)}
          </p>
          {order.expected_date && new Date(order.expected_date) < new Date() && order.status !== 'RECEIVED' && (
            <p className="text-[9px] text-red-400 font-black mt-0.5">⚠ Overdue</p>
          )}
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-200/60 shadow-sm">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Shipments</p>
          <p className="text-sm font-black text-gray-900">{shipmentCount}</p>
          <p className="text-[9px] text-gray-400 font-bold">deliveries logged</p>
        </div>
        <div className="bg-gray-900 p-4 rounded-2xl shadow-sm col-span-2 md:col-span-1">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Value</p>
          <p className="text-lg font-black text-white">NPR {fmt(order.total_amount)}</p>
        </div>
      </div>

      {/* ── Overall Progress Banner ────────────────────────── */}
      <div className="bg-white border border-gray-200/60 rounded-2xl p-5 shadow-sm">
        <OverallProgress items={order.items} />
      </div>

      {/* ── Notes ─────────────────────────────────────────── */}
      {order.notes && (
        <div className="bg-blue-50/50 border border-blue-100 px-5 py-4 rounded-2xl">
          <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Notes</p>
          <p className="text-sm text-blue-900 leading-relaxed">{order.notes}</p>
        </div>
      )}

      {/* ── Tabs ──────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200/60 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setActiveTab('items')}
            className={`px-6 py-3.5 text-xs font-black tracking-wider uppercase transition-colors flex items-center gap-2 ${
              activeTab === 'items'
                ? 'text-gray-900 border-b-2 border-gray-900 -mb-px bg-white'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            📋 Order Items
            <span className="bg-gray-100 text-gray-600 text-[9px] px-1.5 py-0.5 rounded-full">
              {order.items?.length || 0}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('tracking')}
            className={`px-6 py-3.5 text-xs font-black tracking-wider uppercase transition-colors flex items-center gap-2 ${
              activeTab === 'tracking'
                ? 'text-gray-900 border-b-2 border-gray-900 -mb-px bg-white'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            🚚 Delivery Tracking
            {shipmentCount > 0 && (
              <span className="bg-green-100 text-green-700 text-[9px] px-1.5 py-0.5 rounded-full font-black">
                {shipmentCount}
              </span>
            )}
          </button>
        </div>

        {/* Items Tab */}
        {activeTab === 'items' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-5 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Item</th>
                  <th className="text-right px-5 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Ordered</th>
                  <th className="px-5 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Progress</th>
                  <th className="text-right px-5 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Received</th>
                  <th className="text-right px-5 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Unit Price</th>
                  <th className="text-right px-5 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {order.items?.length > 0
                  ? order.items.map(item => <ItemProgressRow key={item.id} item={item} />)
                  : (
                    <tr>
                      <td colSpan="6" className="px-5 py-10 text-center text-xs font-bold text-gray-300">
                        No items in this order.
                      </td>
                    </tr>
                  )
                }
              </tbody>
              {order.items?.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-gray-100 bg-gray-50/30">
                    <td colSpan="5" className="px-5 py-4 text-right text-xs font-black text-gray-600 uppercase tracking-wider">Order Total</td>
                    <td className="px-5 py-4 text-right text-sm font-black text-gray-900">NPR {fmt(order.total_amount)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}

        {/* Tracking Tab */}
        {activeTab === 'tracking' && (
          <div className="p-6">
            {shipmentCount > 0 ? (
              <ShipmentTimeline movements={order.stock_movements} />
            ) : (
              <div className="py-16 text-center">
                <p className="text-4xl mb-3">🚚</p>
                <p className="text-sm font-black text-gray-400">No deliveries recorded yet.</p>
                {canReceive && (
                  <button
                    onClick={() => setConfirmOpen(true)}
                    className="mt-4 px-5 py-2.5 bg-green-600 text-white text-xs font-black rounded-xl hover:bg-green-700 transition-all shadow-md"
                  >
                    Record First Delivery
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── GRN Modal ─────────────────────────────────────── */}
      <ReceiptModal
        isOpen={confirmOpen}
        order={order}
        onClose={() => setConfirmOpen(false)}
        onConfirm={confirmReceive}
        processing={receiving}
      />
    </div>
  );
}
