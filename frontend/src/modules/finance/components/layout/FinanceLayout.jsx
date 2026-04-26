import FinanceTopNav from './FinanceTopNav';
import { useFinance } from '../../context/FinanceContext';

export default function FinanceLayout({ children }) {
  const { error } = useFinance();

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <FinanceTopNav />

      <main className="flex-1 p-6">
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
