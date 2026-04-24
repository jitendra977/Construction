/**
 * TransferList — read-only table of all cash transfers.
 */
import AmountDisplay from '../shared/AmountDisplay';

const fmt = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function TransferList({ transfers = [], accounts = [] }) {
  const accMap = Object.fromEntries(accounts.map((a) => [a.id, a.name]));

  if (!transfers.length) {
    return (
      <div className="text-center py-12">
        <p className="text-3xl mb-2">🔄</p>
        <p className="text-sm text-gray-500 font-semibold">No transfers yet</p>
        <p className="text-xs text-gray-400 mt-1">Use the form above to move cash between accounts.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {['Date', 'From', 'To', 'Amount', 'Description', 'Reference'].map((h) => (
              <th key={h} className="px-4 py-2.5 text-[10px] font-black text-gray-500 uppercase tracking-wider text-left">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {transfers.map((t) => (
            <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
              <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{fmt(t.created_at)}</td>
              <td className="px-4 py-2.5">
                <span className="font-semibold text-gray-700">{accMap[t.from_account] || t.from_account_name || '—'}</span>
              </td>
              <td className="px-4 py-2.5">
                <span className="font-semibold text-gray-700">{accMap[t.to_account] || t.to_account_name || '—'}</span>
              </td>
              <td className="px-4 py-2.5 font-black text-gray-800">
                <AmountDisplay value={t.amount} size="sm" />
              </td>
              <td className="px-4 py-2.5 text-gray-500 max-w-[180px] truncate">{t.description || '—'}</td>
              <td className="px-4 py-2.5 font-mono text-gray-400">{t.reference || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
