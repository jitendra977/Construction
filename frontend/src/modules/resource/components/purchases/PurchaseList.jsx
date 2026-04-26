import StatusBadge from '../shared/StatusBadge';

export default function PurchaseList({ orders, onReceive, onEdit }) {
  if (!orders.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
        <div className="text-4xl mb-3 opacity-40">📦</div>
        <p className="text-sm font-bold text-gray-400">No purchase orders found</p>
        <p className="text-xs text-gray-300 mt-1">Create a purchase order to get started.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 text-[10px] font-black text-gray-500 uppercase tracking-wider">Order #</th>
              <th className="text-left px-4 py-3 text-[10px] font-black text-gray-500 uppercase tracking-wider">Supplier</th>
              <th className="text-left px-4 py-3 text-[10px] font-black text-gray-500 uppercase tracking-wider">Order Date</th>
              <th className="text-left px-4 py-3 text-[10px] font-black text-gray-500 uppercase tracking-wider">Expected</th>
              <th className="text-right px-4 py-3 text-[10px] font-black text-gray-500 uppercase tracking-wider">Amount</th>
              <th className="text-center px-4 py-3 text-[10px] font-black text-gray-500 uppercase tracking-wider">Status</th>
              <th className="text-right px-4 py-3 text-[10px] font-black text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <p className="text-xs font-bold text-gray-900 font-mono">{o.order_number}</p>
                </td>
                <td className="px-4 py-3 text-xs text-gray-600">{o.supplier_name || o.supplier || '—'}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{o.order_date || '—'}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{o.expected_date || '—'}</td>
                <td className="px-4 py-3 text-right">
                  <span className="text-xs font-bold text-gray-700">
                    NPR {Number(o.total_amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <StatusBadge status={o.status} type="purchase_status" />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1.5">
                    {o.status === 'ORDERED' && (
                      <button
                        onClick={() => onReceive(o)}
                        className="px-2.5 py-1 bg-green-50 border border-green-200 text-green-700 text-[10px] font-black rounded-lg hover:bg-green-100 transition-colors whitespace-nowrap"
                      >
                        Receive
                      </button>
                    )}
                    <button
                      onClick={() => onEdit(o)}
                      className="px-2.5 py-1 bg-gray-100 text-gray-600 text-[10px] font-black rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Edit
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
