/**
 * LedgerPage — full chart of accounts + journal entries viewer.
 */
import { useState, useEffect } from 'react';
import { useFinance } from '../context/FinanceContext';
import PageHeader from '../components/shared/PageHeader';
import AccountList from '../components/ledger/AccountList';
import AccountForm from '../components/ledger/AccountForm';
import Modal from '../components/shared/Modal';
import financeApi from '../services/financeApi';
import AmountDisplay from '../components/shared/AmountDisplay';

const TAB = { accounts: 'Accounts', journal: 'Journal Entries' };

const fmt = (iso) => iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function LedgerPage() {
  const { projectId, accounts, loading } = useFinance();
  const [tab,      setTab]      = useState('accounts');
  const [showForm, setShowForm] = useState(false);
  const [editing,  setEditing]  = useState(null);
  const [entries,  setEntries]  = useState([]);
  const [fetching, setFetching] = useState(false);

  const loadEntries = async () => {
    if (!projectId) return;
    setFetching(true);
    try {
      const res = await financeApi.getJournalEntries(projectId);
      setEntries(res.data?.results || res.data || []);
    } catch {
      // ignore
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (tab === 'journal') loadEntries();
  }, [tab, projectId]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ledger"
        subtitle="Chart of accounts and journal entries"
        actions={
          tab === 'accounts' ? (
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-black text-white text-xs font-black rounded-xl hover:bg-gray-800 transition-colors"
            >
              + Add Account
            </button>
          ) : null
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        {Object.entries(TAB).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${tab === key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin w-6 h-6 border-2 border-black border-t-transparent rounded-full" />
        </div>
      ) : tab === 'accounts' ? (
        <AccountList accounts={accounts} onEdit={(a) => setEditing(a)} />
      ) : (
        <div>
          {fetching ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin w-6 h-6 border-2 border-black border-t-transparent rounded-full" />
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-3xl mb-2">📒</p>
              <p className="text-sm text-gray-500 font-semibold">No journal entries yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {entries.map((entry) => (
                <div key={entry.id} className="bg-white border border-gray-200 rounded-2xl p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-xs font-black text-gray-800">{entry.description}</p>
                      <p className="text-[10px] text-gray-400">{fmt(entry.date)} · {entry.source_type} · Ref: {entry.reference || '—'}</p>
                    </div>
                    <p className="text-[9px] font-bold text-gray-400 uppercase">{entry.entry_number}</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left py-1 text-[9px] text-gray-400 font-bold uppercase">Account</th>
                          <th className="text-right py-1 text-[9px] text-gray-400 font-bold uppercase">Debit</th>
                          <th className="text-right py-1 text-[9px] text-gray-400 font-bold uppercase">Credit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(entry.lines || entry.fin_lines || []).map((line, i) => (
                          <tr key={i} className="border-b border-gray-50">
                            <td className="py-1 text-gray-600">{line.account_name || line.account}</td>
                            <td className="py-1 text-right">
                              {line.entry_type === 'DEBIT' ? <AmountDisplay value={line.amount} size="sm" /> : '—'}
                            </td>
                            <td className="py-1 text-right">
                              {line.entry_type === 'CREDIT' ? <AmountDisplay value={line.amount} size="sm" /> : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Add Account">
        <AccountForm onDone={() => setShowForm(false)} />
      </Modal>

      {/* Edit modal */}
      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title="Edit Account">
        <AccountForm account={editing} onDone={() => setEditing(null)} />
      </Modal>
    </div>
  );
}
