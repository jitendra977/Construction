/**
 * LedgerPage — full chart of accounts + journal entries viewer.
 */
import { useState, useEffect } from 'react';
import { useFinance } from '../context/FinanceContext';
import PageHeader from '../components/shared/PageHeader';
import AccountList from '../components/ledger/AccountList';
import AccountForm from '../components/ledger/AccountForm';
import ManualJournalForm from '../components/ledger/ManualJournalForm';
import Modal from '../components/shared/Modal';
import financeApi from '../services/financeApi';
import AmountDisplay from '../components/shared/AmountDisplay';

const TAB = { accounts: 'Accounts', journal: 'Journal Entries' };

const fmt = (iso) => iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function LedgerPage() {
  const { projectId, accounts, loading, refresh } = useFinance();
  const [tab,        setTab]        = useState('accounts');
  const [showForm,   setShowForm]   = useState(false);
  const [editing,    setEditing]    = useState(null);
  const [addType,    setAddType]    = useState(null);
  const [entries,    setEntries]    = useState([]);
  const [fetching,   setFetching]   = useState(false);
  const [deleting,   setDeleting]   = useState(null);
  const [deleteErr,  setDeleteErr]  = useState('');

  // Manual journal entry (also used for "Adjust balance")
  const [showJournal,   setShowJournal]   = useState(false);
  const [journalPreset, setJournalPreset] = useState(null); // { account, direction }

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

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleAdd = (type) => {
    setAddType(type || null);
    setEditing(null);
    setShowForm(true);
  };

  const handleEdit = (account) => {
    setEditing(account);
    setAddType(null);
    setShowForm(true);
  };

  const handleFormDone = () => {
    setShowForm(false);
    setEditing(null);
    setAddType(null);
    refresh();
  };

  const handleDeleteConfirm = async () => {
    if (!deleting) return;
    setDeleteErr('');
    try {
      await financeApi.deleteAccount(deleting.id);
      setDeleting(null);
      refresh();
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.response?.data?.error || 'Could not delete account.';
      setDeleteErr(msg);
    }
  };

  // "Adjust" button on a non-bank account → open manual journal pre-filled
  const handleAdjust = (account) => {
    // For equity/liability/revenue: increasing balance = CREDIT
    // For expense/asset: increasing balance = DEBIT
    const creditNormal = ['EQUITY', 'LIABILITY', 'REVENUE'].includes(account.account_type);
    setJournalPreset({ account, direction: creditNormal ? 'CREDIT' : 'DEBIT' });
    setShowJournal(true);
  };

  const handleJournalDone = () => {
    setShowJournal(false);
    setJournalPreset(null);
    refresh();
    if (tab === 'journal') loadEntries();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ledger"
        subtitle="Chart of accounts and journal entries"
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => { setJournalPreset(null); setShowJournal(true); }}
              className="px-4 py-2 bg-purple-600 text-white text-xs font-black rounded-xl hover:bg-purple-700 transition-colors"
            >
              ✏️ Manual Entry
            </button>
            {tab === 'accounts' && (
              <button
                onClick={() => handleAdd(null)}
                className="px-4 py-2 bg-black text-white text-xs font-black rounded-xl hover:bg-gray-800 transition-colors"
              >
                + Add Account
              </button>
            )}
          </div>
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
        <AccountList
          accounts={accounts}
          onEdit={handleEdit}
          onDelete={(a) => { setDeleting(a); setDeleteErr(''); }}
          onAdd={handleAdd}
          onAdjust={handleAdjust}
        />
      ) : (
        <div>
          {/* New entry button in journal tab too */}
          <div className="flex justify-end mb-4">
            <button
              onClick={() => { setJournalPreset(null); setShowJournal(true); }}
              className="px-4 py-2 bg-purple-600 text-white text-xs font-black rounded-xl hover:bg-purple-700 transition-colors"
            >
              ✏️ New Manual Entry
            </button>
          </div>

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

      {/* Create / Edit account modal */}
      <Modal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditing(null); setAddType(null); }}
        title={editing ? 'Edit Account' : `Add ${addType ? addType.charAt(0) + addType.slice(1).toLowerCase() : 'Account'}`}
      >
        <AccountForm
          account={editing}
          defaultType={addType}
          onDone={handleFormDone}
        />
      </Modal>

      {/* Manual journal entry / adjust balance modal */}
      <Modal
        isOpen={showJournal}
        onClose={() => { setShowJournal(false); setJournalPreset(null); }}
        title={journalPreset ? `Adjust Balance — ${journalPreset.account?.name}` : 'New Manual Journal Entry'}
      >
        <ManualJournalForm
          accounts={accounts}
          preAccount={journalPreset?.account || null}
          preDirection={journalPreset?.direction || 'DEBIT'}
          onDone={handleJournalDone}
        />
      </Modal>

      {/* Delete confirm modal */}
      <Modal
        isOpen={!!deleting}
        onClose={() => { setDeleting(null); setDeleteErr(''); }}
        title="Delete Account"
      >
        <div className="space-y-4 p-6">
          <p className="text-sm text-gray-700">
            Are you sure you want to delete <span className="font-black">{deleting?.name}</span>?
            This action cannot be undone.
          </p>
          {deleteErr && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{deleteErr}</p>
          )}
          <div className="flex justify-end gap-2">
            <button
              onClick={() => { setDeleting(null); setDeleteErr(''); }}
              className="px-4 py-2 text-xs font-bold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteConfirm}
              className="px-4 py-2 text-xs font-black text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
