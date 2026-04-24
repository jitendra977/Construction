/**
 * BankingPage — manage bank and cash accounts; deposit funds.
 */
import { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import PageHeader from '../components/shared/PageHeader';
import BankCard from '../components/banking/BankCard';
import BankForm from '../components/banking/BankForm';
import DepositModal from '../components/banking/DepositModal';
import Modal from '../components/shared/Modal';
import EmptyState from '../components/shared/EmptyState';

export default function BankingPage() {
  const { banks, loading } = useFinance();
  const [showCreate, setShowCreate] = useState(false);
  const [editing,    setEditing]    = useState(null);   // account being edited
  const [depositing, setDepositing] = useState(null);   // account for deposit

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
        title="Banking"
        subtitle="Bank accounts and cash management"
        actions={
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-black text-white text-xs font-black rounded-xl hover:bg-gray-800 transition-colors"
          >
            + Add Account
          </button>
        }
      />

      {!banks.length ? (
        <EmptyState
          icon="🏦"
          title="No bank accounts yet"
          description="Add your first bank or cash account to start tracking funds."
          action={{ label: '+ Add Account', onClick: () => setShowCreate(true) }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {banks.map((account) => (
            <BankCard
              key={account.id}
              account={account}
              onDeposit={setDepositing}
              onEdit={setEditing}
            />
          ))}
        </div>
      )}

      {/* Create modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Add Bank Account">
        <BankForm onDone={() => setShowCreate(false)} />
      </Modal>

      {/* Edit modal */}
      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title="Edit Account">
        <BankForm account={editing} onDone={() => setEditing(null)} />
      </Modal>

      {/* Deposit modal */}
      {depositing && (
        <DepositModal account={depositing} onClose={() => setDepositing(null)} />
      )}
    </div>
  );
}
