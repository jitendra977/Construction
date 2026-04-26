import { NavLink } from 'react-router-dom';
import { useFinance } from '../../context/FinanceContext';

const NAV = [
  { to: '',          icon: '📊', label: 'Dashboard',  end: true },
  { to: 'banking',   icon: '🏦', label: 'Banking' },
  { to: 'loans',     icon: '📋', label: 'Loans' },
  { to: 'transfers', icon: '🔄', label: 'Transfers' },
  { to: 'ledger',    icon: '📒', label: 'Ledger' },
  { to: 'bills',     icon: '🧾', label: 'Bills' },
  { to: 'budget',    icon: '🎯', label: 'Budget' },
  { to: 'help',      icon: '📖', label: 'सहायता' },
];

export default function FinanceSidebar() {
  const { dashboard, loading } = useFinance();

  return (
    <aside className="w-52 shrink-0 border-r border-gray-200 bg-white flex flex-col">
      {/* Module brand */}
      <div className="px-5 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-xl">💰</span>
          <div>
            <p className="text-xs font-black text-gray-800 uppercase tracking-wider">Finance</p>
            <p className="text-[10px] text-gray-400">वित्त व्यवस्थापन</p>
          </div>
        </div>
      </div>

      {/* Cash summary pill */}
      {dashboard && !loading && (
        <div className="mx-3 mt-3 p-3 bg-green-50 border border-green-100 rounded-xl">
          <p className="text-[9px] font-bold text-green-500 uppercase tracking-wider">Total Cash</p>
          <p className="text-sm font-black text-green-700">
            NPR {Number(dashboard.banking?.total_cash || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 py-3 space-y-0.5 px-2">
        {NAV.map(({ to, icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? 'bg-black text-white shadow-sm'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
              }`
            }
          >
            <span className="text-base">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
