/**
 * LoansPage — manage loan accounts, pay EMIs, view amortization + history.
 */
import { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import PageHeader from '../components/shared/PageHeader';
import LoanCard from '../components/loans/LoanCard';
import LoanForm from '../components/loans/LoanForm';
import EMIModal from '../components/loans/EMIModal';
import EMIHistory from '../components/loans/EMIHistory';
import AmortizationTable from '../components/loans/AmortizationTable';
import DisbursementModal from '../components/loans/DisbursementModal';
import Modal from '../components/shared/Modal';
import EmptyState from '../components/shared/EmptyState';

export default function LoansPage() {
  const { loans, loading } = useFinance();
  const [showCreate,   setShowCreate]   = useState(false);
  const [editing,      setEditing]      = useState(null);
  const [payingEMI,    setPayingEMI]    = useState(null);
  const [viewingLoan,  setViewingLoan]  = useState(null);
  const [detailTab,    setDetailTab]    = useState('history');
  const [disbursing,   setDisbursing]   = useState(null);

  const openDetail = (loan, tab = 'history') => {
    setViewingLoan(loan);
    setDetailTab(tab);
  };

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
            <LoanCard
              key={loan.id}
              account={loan}
              onPayEMI={setPayingEMI}
              onEdit={setEditing}
              onDetail={(l) => openDetail(l, 'history')}
              onDisburse={setDisbursing}
            />
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

      {/* Disbursement modal */}
      {disbursing && (
        <DisbursementModal loan={disbursing} onClose={() => setDisbursing(null)} />
      )}

      {/* Loan detail modal — tabbed: Payment History + Amortization Schedule */}
      <Modal
        isOpen={!!viewingLoan}
        onClose={() => setViewingLoan(null)}
        title={viewingLoan?.name || 'Loan Detail'}
        maxWidth="max-w-2xl"
      >
        {viewingLoan && (
          <div>
            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit mx-6 mt-4">
              {[
                { key: 'history',  label: '💳 Payment History' },
                { key: 'schedule', label: '📅 Schedule' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setDetailTab(key)}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    detailTab === key
                      ? 'bg-white shadow-sm text-gray-900'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="p-6">
              {detailTab === 'history' ? (
                <EMIHistory loan={viewingLoan} />
              ) : (
                <AmortizationTable loan={viewingLoan} />
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
