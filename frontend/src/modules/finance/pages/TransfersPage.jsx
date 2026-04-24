/**
 * TransfersPage — create and view cash transfers between accounts.
 */
import { useState, useEffect } from 'react';
import { useFinance } from '../context/FinanceContext';
import PageHeader from '../components/shared/PageHeader';
import TransferForm from '../components/transfers/TransferForm';
import TransferList from '../components/transfers/TransferList';
import financeApi from '../services/financeApi';

export default function TransfersPage() {
  const { projectId, banks, loading } = useFinance();
  const [transfers, setTransfers] = useState([]);
  const [fetching, setFetching]   = useState(false);
  const [showForm, setShowForm]   = useState(false);

  const loadTransfers = async () => {
    if (!projectId) return;
    setFetching(true);
    try {
      const res = await financeApi.getTransfers(projectId);
      setTransfers(res.data?.results || res.data || []);
    } catch {
      // ignore
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => { loadTransfers(); }, [projectId]);

  const handleDone = () => {
    setShowForm(false);
    loadTransfers();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transfers"
        subtitle="Move cash between accounts"
        actions={
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-black text-white text-xs font-black rounded-xl hover:bg-gray-800 transition-colors"
          >
            {showForm ? '✕ Cancel' : '+ New Transfer'}
          </button>
        }
      />

      {/* Inline form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <p className="text-xs font-black text-gray-700 uppercase tracking-wider mb-4">New Transfer</p>
          <TransferForm onDone={handleDone} />
        </div>
      )}

      {/* Transfers table */}
      {(loading || fetching) ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin w-6 h-6 border-2 border-black border-t-transparent rounded-full" />
        </div>
      ) : (
        <TransferList transfers={transfers} accounts={banks} />
      )}
    </div>
  );
}
