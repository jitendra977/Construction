/**
 * FinanceTopNav — horizontal tab bar replacing the left sidebar.
 * Uses ABSOLUTE paths to prevent route nesting bugs.
 */
import { NavLink } from 'react-router-dom';
import { usePlatformBase } from '../../../../shared/utils/platformNav';
import { useFinance } from '../../context/FinanceContext';


export default function FinanceTopNav() {
    const base = usePlatformBase();
    const BASE = `${base}/finance`;
    const TABS = [
        { to: BASE,                      icon: '📊', label: 'Dashboard',  end: true },
        { to: `${base}/finance/banking`,   icon: '🏦', label: 'Banking'   },
        { to: `${base}/finance/loans`,     icon: '📋', label: 'Loans'     },
        { to: `${base}/finance/transfers`, icon: '🔄', label: 'Transfers' },
        { to: `${base}/finance/ledger`,    icon: '📒', label: 'Ledger'    },
        { to: `${base}/finance/bills`,     icon: '🧾', label: 'Bills'     },
        { to: `${base}/finance/budget`,    icon: '🎯', label: 'Budget'    },
        { to: `${base}/finance/help`,      icon: '📖', label: 'सहायता'   },
    ];
  const { dashboard, loading } = useFinance();
  const totalCash = Number(dashboard?.banking?.total_cash || 0);

  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
      {/* Module header row */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-lg">💰</span>
          <div>
            <p className="text-xs font-black text-gray-800 uppercase tracking-wider leading-none">Finance</p>
            <p className="text-[10px] text-gray-400 leading-none mt-0.5">वित्त व्यवस्थापन</p>
          </div>
        </div>

        {/* Cash summary pill */}
        {dashboard && !loading && (
          <div className="px-3 py-1.5 bg-green-50 border border-green-100 rounded-xl flex items-center gap-2">
            <p className="text-[9px] font-bold text-green-500 uppercase tracking-wider">कुल नगद</p>
            <p className="text-sm font-black text-green-700">
              NPR {totalCash.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
          </div>
        )}
      </div>

      {/* Tab row */}
      <div className="flex items-center gap-0.5 px-4 overflow-x-auto scrollbar-hide">
        {TABS.map(({ to, icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-1.5 px-3 py-3 text-xs font-bold whitespace-nowrap border-b-2 transition-all ${
                isActive
                  ? 'border-black text-gray-900'
                  : 'border-transparent text-gray-400 hover:text-gray-700 hover:border-gray-200'
              }`
            }
          >
            <span className="text-sm">{icon}</span>
            {label}
          </NavLink>
        ))}
      </div>
    </div>
  );
}
