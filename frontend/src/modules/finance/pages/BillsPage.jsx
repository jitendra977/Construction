/**
 * BillsPage — vendor bills, payables, and payment recording.
 */
import { useState, useEffect } from 'react';
import { useFinance } from '../context/FinanceContext';
import PageHeader from '../components/shared/PageHeader';
import BillList from '../components/bills/BillList';
import BillForm from '../components/bills/BillForm';
import PaymentModal from '../components/bills/PaymentModal';
import Modal from '../components/shared/Modal';
import financeApi from '../services/financeApi';

export default function BillsPage() {
  const { projectId, loading } = useFinance();
  const [bills,      setBills]      = useState([]);
  const [fetching,   setFetching]   = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editing,    setEditing]    = useState(null);
  const [paying,     setPaying]     = useState(null);

  const loadBills = async () => {
    if (!projectId) return;
    setFetching(true);
    try {
      const res = await financeApi.getBills(projectId);
      setBills(res.data?.results || res.data || []);
    } catch {
      // ignore
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => { loadBills(); }, [projectId]);

  const handleDone = () => {
    setShowCreate(false);
    setEditing(null);
    loadBills();
  };

  const handlePayDone = () => {
    setPaying(null);
    loadBills();
  };

  const isBusy = loading || fetching;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bills"
        subtitle="Vendor payables and payment tracking"
        actions={
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-black text-white text-xs font-black rounded-xl hover:bg-gray-800 transition-colors"
          >
            + Add Bill
          </button>
        }
      />

      {isBusy ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin w-6 h-6 border-2 border-black border-t-transparent rounded-full" />
        </div>
      ) : (
        <BillList bills={bills} onPay={setPaying} onEdit={setEditing} />
      )}

      {/* Create modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Bill" maxWidth="max-w-2xl">
        <BillForm onDone={handleDone} />
      </Modal>

      {/* Edit modal */}
      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title="Edit Bill" maxWidth="max-w-2xl">
        <BillForm bill={editing} onDone={handleDone} />
      </Modal>

      {/* Payment modal */}
      {paying && (
        <PaymentModal bill={paying} onClose={handlePayDone} />
      )}
    </div>
  );
}
