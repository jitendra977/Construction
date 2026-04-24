import FinanceSidebar from './FinanceSidebar';
import { useFinance } from '../../context/FinanceContext';

export default function FinanceLayout({ children }) {
  const { error } = useFinance();

  return (
    <div className="flex h-full min-h-[600px] bg-gray-50 rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
      <FinanceSidebar />

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-6">
        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold flex items-center gap-2">
            <span>⚠️</span> {error}
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
