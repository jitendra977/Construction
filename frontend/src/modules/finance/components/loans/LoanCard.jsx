import AmountDisplay from '../shared/AmountDisplay';

export default function LoanCard({ account, onPayEMI, onEdit }) {
  const outstanding = Number(account.balance || 0);          // liability → positive = owed
  const limit       = Number(account.total_loan_limit || 0);
  const emi         = Number(account.emi_amount || 0);
  const rate        = Number(account.interest_rate || 0);
  const tenure      = Number(account.loan_tenure_months || 0);
  const pct         = limit > 0 ? Math.min(100, ((limit - outstanding) / limit) * 100) : 0;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-md hover:border-gray-300 transition-all">
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 min-w-0">
          <p className="font-black text-sm text-gray-900 truncate">{account.name}</p>
          <p className="text-[10px] text-gray-400 font-medium">{account.bank_name || 'Loan Account'}</p>
        </div>
        <button onClick={() => onEdit(account)} className="text-gray-300 hover:text-gray-600 transition-colors ml-2 text-sm">✏️</button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 mb-4 text-center">
        <div className="bg-gray-50 rounded-xl p-2">
          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Rate</p>
          <p className="text-xs font-black text-gray-700">{rate}%</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-2">
          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Tenure</p>
          <p className="text-xs font-black text-gray-700">{tenure}mo</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-2">
          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">EMI</p>
          <p className="text-xs font-black text-gray-700">NPR {emi.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
        </div>
      </div>

      {/* Progress bar */}
      {limit > 0 && (
        <div className="mb-4">
          <div className="flex justify-between text-[9px] text-gray-400 mb-1">
            <span>Paid {pct.toFixed(0)}%</span>
            <span>Limit NPR {limit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {/* Outstanding + action */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Outstanding</p>
          <AmountDisplay value={outstanding} size="xl" colorize />
        </div>
        <button
          onClick={() => onPayEMI(account)}
          className="px-3 py-1.5 bg-blue-50 text-blue-700 text-[10px] font-black rounded-lg hover:bg-blue-100 border border-blue-200 transition-colors uppercase tracking-wide"
        >
          Pay EMI
        </button>
      </div>
    </div>
  );
}
