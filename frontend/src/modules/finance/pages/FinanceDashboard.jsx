/**
 * FinanceDashboard — overview of the project's financial health.
 */
import { useFinance } from '../context/FinanceContext';
import AmountDisplay from '../components/shared/AmountDisplay';

const Card = ({ icon, label, value, sub, color = 'gray' }) => {
  const colors = {
    green:  'bg-green-50 border-green-100',
    blue:   'bg-blue-50 border-blue-100',
    red:    'bg-red-50 border-red-100',
    yellow: 'bg-yellow-50 border-yellow-100',
    gray:   'bg-gray-50 border-gray-100',
  };
  const textColors = {
    green: 'text-green-700', blue: 'text-blue-700', red: 'text-red-700',
    yellow: 'text-yellow-700', gray: 'text-gray-700',
  };
  return (
    <div className={`rounded-2xl border p-5 ${colors[color]}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">{icon}</span>
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{label}</p>
      </div>
      <p className={`text-2xl font-black ${textColors[color]}`}>{value}</p>
      {sub && <p className="text-[10px] text-gray-400 mt-1">{sub}</p>}
    </div>
  );
};

const fmt = (v) => `NPR ${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export default function FinanceDashboard() {
  const { dashboard, loading } = useFinance();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin w-6 h-6 border-2 border-black border-t-transparent rounded-full" />
      </div>
    );
  }

  const banking  = dashboard?.banking  || {};
  const loans    = dashboard?.loans    || {};
  const bills    = dashboard?.bills    || {};
  const transfers = dashboard?.recent_transfers || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-black text-gray-900">Finance Dashboard</h1>
        <p className="text-xs text-gray-400 mt-0.5">वित्तीय सारांश</p>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card icon="💰" label="Total Cash" value={fmt(banking.total_cash)} sub={`${banking.bank_count || 0} accounts`} color="green" />
        <Card icon="📋" label="Total Loans" value={fmt(loans.total_outstanding)} sub={`${loans.loan_count || 0} loans outstanding`} color="blue" />
        <Card icon="🧾" label="Unpaid Bills" value={fmt(bills.total_outstanding)} sub={`${bills.unpaid_count || 0} bills pending`} color="red" />
        <Card icon="⚠️" label="Overdue Bills" value={String(bills.overdue_count || 0)} sub="Overdue payables" color="yellow" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Banking accounts */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <p className="text-xs font-black text-gray-700 uppercase tracking-wider mb-3">🏦 Bank Accounts</p>
          {banking.accounts?.length ? (
            <div className="space-y-2">
              {banking.accounts.map((a) => (
                <div key={a.id} className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0">
                  <p className="text-xs font-semibold text-gray-700">{a.name}</p>
                  <AmountDisplay value={a.balance} size="sm" colorize />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 text-center py-4">No bank accounts yet</p>
          )}
        </div>

        {/* Recent transfers */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <p className="text-xs font-black text-gray-700 uppercase tracking-wider mb-3">🔄 Recent Transfers</p>
          {transfers.length ? (
            <div className="space-y-2">
              {transfers.slice(0, 5).map((t) => (
                <div key={t.id} className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-[10px] text-gray-500">{t.from_account_name} → {t.to_account_name}</p>
                    <p className="text-[9px] text-gray-400">{t.description}</p>
                  </div>
                  <AmountDisplay value={t.amount} size="sm" />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 text-center py-4">No transfers yet</p>
          )}
        </div>
      </div>

      {/* Bills status summary */}
      {(bills.total_bills > 0) && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <p className="text-xs font-black text-gray-700 uppercase tracking-wider mb-3">🧾 Bills Summary</p>
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Total Bills', value: bills.total_bills || 0, color: 'text-gray-700' },
              { label: 'Unpaid', value: bills.unpaid_count || 0, color: 'text-red-600' },
              { label: 'Partial', value: bills.partial_count || 0, color: 'text-yellow-600' },
              { label: 'Paid', value: bills.paid_count || 0, color: 'text-green-600' },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center bg-gray-50 rounded-xl p-3">
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">{label}</p>
                <p className={`text-lg font-black ${color}`}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
