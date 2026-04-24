/**
 * LoansPage — manage loan accounts, pay EMIs, view amortization.
 */
import { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import PageHeader from '../components/shared/PageHeader';
import LoanCard from '../components/loans/LoanCard';
import LoanForm from '../components/loans/LoanForm';
import EMIModal from '../components/loans/EMIModal';
import AmortizationTable from '../components/loans/AmortizationTable';
import Modal from '../components/shared/Modal';
import EmptyState from '../components/shared/EmptyState';

export default function LoansPage() {
  const { loans, loading } = useFinance();
  const [showCreate,   setShowCreate]   = useState(false);
  const [editing,      setEditing]      = useState(null);
  const [payingEMI,    setPayingEMI]    = useState(null);
  const [viewingAmort, setViewingAmort] = useState(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin w-6 h-6 border-2 border-black border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Loans"
        subtitle="Loan accounts and EMI tracking"
        actions={
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-black text-white text-xs font-black rounded-xl hover:bg-gray-800 transition-colors"
          >
            + Add Loan
          </button>
        }
      />

      {!loans.length ? (
        <EmptyState
          icon="📋"
          title="No loans yet"
          description="Add a loan account to track borrowings and EMI payments."
          action={{ label: '+ Add Loan', onClick: () => setShowCreate(true) }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loans.map((loan) => (
            <div key={loan.id}>
              <LoanCard
                account={loan}
                onPayEMI={setPayingEMI}
                onEdit={setEditing}
              />
              <button
                onClick={() => setViewingAmort(loan)}
                className="mt-1 w-full text-[10px] text-gray-400 hover:text-gray-600 font-bold py-1 hover:underline transition-colors"
              >
                View amortization schedule →
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Add Loan" maxWidth="max-w-2xl">
        <LoanForm onDone={() => setShowCreate(false)} />
      </Modal>

      {/* Edit modal */}
      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title="Edit Loan" maxWidth="max-w-2xl">
        <LoanForm account={editing} onDone={() => setEditing(null)} />
      </Modal>

      {/* EMI Payment modal */}
      {payingEMI && (
        <EMIModal loan={payingEMI} onClose={() => setPayingEMI(null)} />
      )}

      {/* Amortization modal */}
      <Modal isOpen={!!viewingAmort} onClose={() => setViewingAmort(null)} title={`Schedule — ${viewingAmort?.name}`} maxWidth="max-w-2xl">
        {viewingAmort && (
          <div className="p-6">
            <AmortizationTable loan={viewingAmort} />
          </div>
        )}
      </Modal>
    </div>
  );
}
