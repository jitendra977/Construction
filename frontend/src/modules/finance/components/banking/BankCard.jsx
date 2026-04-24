import AmountDisplay from '../shared/AmountDisplay';

export default function BankCard({ account, onDeposit, onEdit }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-md hover:border-gray-300 transition-all">
      {/* Header */}
      <div className="flex justify-between items-start mb-1">
        <div className="flex-1 min-w-0">
          <p className="font-black text-sm text-gray-900 truncate">{account.name}</p>
          <p className="text-[10px] text-gray-400 font-medium">{account.bank_name || 'Bank Account'}</p>
        </div>
        <button
          onClick={() => onEdit(account)}
          className="text-gray-300 hover:text-gray-600 transition-colors ml-2 text-sm"
        >✏️</button>
      </div>

      {/* Account number */}
      <p className="text-xs font-mono text-gray-400 mb-4">
        {account.account_number ? `•••• ${account.account_number.slice(-4)}` : 'No account number'}
        {account.account_holder_name ? ` · ${account.account_holder_name}` : ''}
      </p>

      {/* Balance + action */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Balance</p>
          <AmountDisplay value={account.balance} size="xl" colorize />
        </div>
        <button
          onClick={() => onDeposit(account)}
          className="px-3 py-1.5 bg-green-50 text-green-700 text-[10px] font-black rounded-lg hover:bg-green-100 border border-green-200 transition-colors uppercase tracking-wide"
        >
          + Deposit
        </button>
      </div>
    </div>
  );
}
