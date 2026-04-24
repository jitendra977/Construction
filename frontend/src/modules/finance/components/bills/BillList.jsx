/**
 * BillList — table of all vendor bills / payables.
 */
import AmountDisplay from '../shared/AmountDisplay';

const STATUS_STYLE = {
  UNPAID:      'bg-red-50 text-red-700 border-red-200',
  PARTIAL:     'bg-yellow-50 text-yellow-700 border-yellow-200',
  PAID:        'bg-green-50 text-green-700 border-green-200',
};

const fmt = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function BillList({ bills = [], onPay, onEdit }) {
  if (!bills.length) {
    return (
      <div className="text-center py-12">
        <p className="text-3xl mb-2">🧾</p>
        <p className="text-sm text-gray-500 font-semibold">No bills yet</p>
        <p className="text-xs text-gray-400 mt-1">Create a bill to track vendor payables.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {['Bill No.', 'Vendor', 'Due Date', 'Total', 'Paid', 'Outstanding', 'Status', ''].map((h) => (
              <th key={h} className="px-4 py-2.5 text-[10px] font-black text-gray-500 uppercase tracking-wider text-left">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bills.map((b) => (
            <tr key={b.id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${b.is_overdue && b.payment_status !== 'PAID' ? 'bg-red-50/30' : ''}`}>
              <td className="px-4 py-2.5 font-mono text-gray-600">{b.bill_number || b.id?.slice(0, 8)}</td>
              <td className="px-4 py-2.5 font-semibold text-gray-800">{b.vendor_name || '—'}</td>
              <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">
                {fmt(b.due_date)}
                {b.is_overdue && b.payment_status !== 'PAID' && (
                  <span className="ml-1 text-[8px] text-red-500 font-black">OVERDUE</span>
                )}
              </td>
              <td className="px-4 py-2.5"><AmountDisplay value={b.total_amount} size="sm" /></td>
              <td className="px-4 py-2.5 text-green-600 font-semibold">NPR {Number(b.paid_amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
              <td className="px-4 py-2.5"><AmountDisplay value={b.outstanding} size="sm" colorize /></td>
              <td className="px-4 py-2.5">
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${STATUS_STYLE[b.payment_status] || 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                  {b.payment_status}
                </span>
              </td>
              <td className="px-4 py-2.5">
                <div className="flex gap-1">
                  {b.payment_status !== 'PAID' && (
                    <button onClick={() => onPay(b)}
                      className="px-2 py-1 bg-green-50 text-green-700 text-[9px] font-black rounded border border-green-200 hover:bg-green-100 transition-colors">
                      Pay
                    </button>
                  )}
                  <button onClick={() => onEdit(b)} className="text-gray-300 hover:text-gray-600 transition-colors text-sm">✏️</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
