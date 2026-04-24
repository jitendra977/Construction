/**
 * AccountList — table of all chart-of-accounts entries for the project.
 */
import AmountDisplay from '../shared/AmountDisplay';

const TYPE_COLORS = {
  ASSET:     'bg-blue-50 text-blue-700 border-blue-200',
  LIABILITY: 'bg-red-50 text-red-700 border-red-200',
  EQUITY:    'bg-purple-50 text-purple-700 border-purple-200',
  REVENUE:   'bg-green-50 text-green-700 border-green-200',
  EXPENSE:   'bg-orange-50 text-orange-700 border-orange-200',
};

export default function AccountList({ accounts = [], onEdit }) {
  if (!accounts.length) {
    return (
      <div className="text-center py-12">
        <p className="text-3xl mb-2">📒</p>
        <p className="text-sm text-gray-500 font-semibold">No accounts yet</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {['Code', 'Name', 'Type', 'Balance', 'Flags', ''].map((h) => (
              <th key={h} className="px-4 py-2.5 text-[10px] font-black text-gray-500 uppercase tracking-wider text-left">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {accounts.map((a) => (
            <tr key={a.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
              <td className="px-4 py-2.5 font-mono text-gray-500">{a.code}</td>
              <td className="px-4 py-2.5 font-semibold text-gray-800">{a.name}</td>
              <td className="px-4 py-2.5">
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${TYPE_COLORS[a.account_type] || 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                  {a.account_type}
                </span>
              </td>
              <td className="px-4 py-2.5">
                <AmountDisplay value={a.balance} size="sm" colorize />
              </td>
              <td className="px-4 py-2.5">
                <div className="flex gap-1">
                  {a.is_bank && <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[8px] font-bold rounded border border-blue-100">BANK</span>}
                  {a.is_loan && <span className="px-1.5 py-0.5 bg-yellow-50 text-yellow-600 text-[8px] font-bold rounded border border-yellow-100">LOAN</span>}
                </div>
              </td>
              <td className="px-4 py-2.5">
                <button onClick={() => onEdit(a)} className="text-gray-300 hover:text-gray-600 transition-colors">✏️</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
