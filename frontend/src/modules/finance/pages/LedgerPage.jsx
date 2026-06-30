/**
 * LedgerPage — full chart of accounts + journal entries viewer.
 * Redesigned: summary bar, searchable journal, collapsible entries.
 */
import { useState, useEffect, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import PageHeader from '../components/shared/PageHeader';
import AccountList from '../components/ledger/AccountList';
import AccountForm from '../components/ledger/AccountForm';
import ManualJournalForm from '../components/ledger/ManualJournalForm';
import Modal from '../components/shared/Modal';
import financeApi from '../services/financeApi';
import AmountDisplay from '../components/shared/AmountDisplay';

const fmt = (n) =>
  `NPR ${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const SOURCE_BADGE = {
  MANUAL:       { label: 'Manual',       bg: '#ede9fe', color: '#7c3aed' },
  LOAN:         { label: 'Loan',         bg: '#fef3c7', color: '#d97706' },
  EMI:          { label: 'EMI',          bg: '#dbeafe', color: '#2563eb' },
  DISBURSEMENT: { label: 'Disbursement', bg: '#d1fae5', color: '#059669' },
  TRANSFER:     { label: 'Transfer',     bg: '#fce7f3', color: '#db2777' },
  BILL:         { label: 'Bill',         bg: '#fee2e2', color: '#dc2626' },
};

function SourceBadge({ type }) {
  const cfg = SOURCE_BADGE[type] || { label: type || 'Entry', bg: '#f3f4f6', color: '#6b7280' };
  return (
    <span className="px-1.5 py-0.5 text-[8px] font-black rounded-full uppercase tracking-wider"
      style={{ background: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  );
}

function JournalEntryCard({ entry }) {
  const [open, setOpen] = useState(false);
  const lines = entry.lines || entry.fin_lines || [];
  const totalDebit  = lines.filter(l => l.entry_type === 'DEBIT').reduce((s, l) => s + Number(l.amount || 0), 0);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-md transition-all">
      {/* Header row — always visible */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-gray-50 transition-colors"
      >
        {/* Left: Entry number + date */}
        <div className="shrink-0 text-center min-w-[48px]">
          <p className="text-[8px] font-black text-gray-400 uppercase tracking-wider">#{entry.entry_number || entry.id}</p>
          <p className="text-[10px] font-semibold text-gray-500 mt-0.5">{fmtDate(entry.date)}</p>
        </div>

        <div className="w-px h-8 bg-gray-200 shrink-0" />

        {/* Middle: description + source */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-gray-800 truncate">{entry.description || 'Journal Entry'}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <SourceBadge type={entry.source_type} />
            {entry.reference && (
              <span className="text-[9px] text-gray-400 font-mono">Ref: {entry.reference}</span>
            )}
            <span className="text-[9px] text-gray-300">·</span>
            <span className="text-[9px] text-gray-400">{lines.length} lines</span>
          </div>
        </div>

        {/* Right: total amount + chevron */}
        <div className="text-right shrink-0">
          <p className="text-sm font-black text-gray-800">{fmt(totalDebit)}</p>
          <p className="text-[9px] text-gray-400 mt-0.5">{open ? '▲ close' : '▼ expand'}</p>
        </div>
      </button>

      {/* Expanded lines */}
      {open && (
        <div className="border-t border-gray-100 bg-gray-50/50">
          <div className="px-5 py-3">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-1.5 text-[9px] text-gray-400 font-bold uppercase tracking-wider">Account</th>
                  <th className="text-right py-1.5 text-[9px] text-green-600 font-bold uppercase tracking-wider w-32">Debit (Dr)</th>
                  <th className="text-right py-1.5 text-[9px] text-red-500 font-bold uppercase tracking-wider w-32">Credit (Cr)</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, i) => (
                  <tr key={i} className={`border-b border-gray-100 last:border-0 ${
                    line.entry_type === 'DEBIT' ? 'bg-green-50/30' : 'bg-red-50/20'
                  }`}>
                    <td className="py-1.5 text-gray-700 font-medium pl-2">
                      <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${
                        line.entry_type === 'DEBIT' ? 'bg-green-500' : 'bg-red-400'
                      }`} />
                      {line.account_name || line.account}
                    </td>
                    <td className="py-1.5 text-right font-black text-green-700">
                      {line.entry_type === 'DEBIT' ? fmt(line.amount) : '—'}
                    </td>
                    <td className="py-1.5 text-right font-black text-red-600">
                      {line.entry_type === 'CREDIT' ? fmt(line.amount) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200">
                  <td className="py-1.5 text-[9px] font-black text-gray-500 uppercase pl-2">Total</td>
                  <td className="py-1.5 text-right text-[10px] font-black text-green-700">
                    {fmt(lines.filter(l => l.entry_type === 'DEBIT').reduce((s, l) => s + Number(l.amount || 0), 0))}
                  </td>
                  <td className="py-1.5 text-right text-[10px] font-black text-red-600">
                    {fmt(lines.filter(l => l.entry_type === 'CREDIT').reduce((s, l) => s + Number(l.amount || 0), 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

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
  const [jSearch,    setJSearch]    = useState('');
  const [jSource,    setJSource]    = useState('ALL');

  // Manual journal entry (also used for "Adjust balance")
  const [showJournal,   setShowJournal]   = useState(false);
  const [journalPreset, setJournalPreset] = useState(null);

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

  // ── Summary stats ────────────────────────────────────────────────────────────
  const { totalAssets, totalLiabilities, totalRevenue, totalExpense, netEquity } = useMemo(() => {
    const sum = (type) => accounts
      .filter(a => a.account_type === type)
      .reduce((s, a) => s + Number(a.balance || 0), 0);
    const ta = sum('ASSET');
    const tl = sum('LIABILITY');
    const tr = sum('REVENUE');
    const te = sum('EXPENSE');
    return { totalAssets: ta, totalLiabilities: tl, totalRevenue: tr, totalExpense: te, netEquity: ta - tl };
  }, [accounts]);

  // ── Journal filters ──────────────────────────────────────────────────────────
  const filteredEntries = useMemo(() => {
    let list = entries;
    if (jSource !== 'ALL') list = list.filter(e => e.source_type === jSource);
    if (jSearch.trim()) {
      const q = jSearch.toLowerCase();
      list = list.filter(e =>
        e.description?.toLowerCase().includes(q) ||
        e.reference?.toLowerCase().includes(q) ||
        e.entry_number?.toLowerCase().includes(q) ||
        (e.lines || e.fin_lines || []).some(l => l.account_name?.toLowerCase().includes(q))
      );
    }
    return list;
  }, [entries, jSource, jSearch]);

  const sourceCounts = useMemo(() => {
    const counts = {};
    entries.forEach(e => {
      counts[e.source_type] = (counts[e.source_type] || 0) + 1;
    });
    return counts;
  }, [entries]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleAdd    = (type)    => { setAddType(type || null); setEditing(null); setShowForm(true); };
  const handleEdit   = (account) => { setEditing(account); setAddType(null); setShowForm(true); };
  const handleFormDone = ()      => { setShowForm(false); setEditing(null); setAddType(null); refresh(); };

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

  const handleAdjust = (account) => {
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
    <div className="space-y-5">
      <PageHeader
        title="Ledger"
        subtitle="Chart of accounts and double-entry journal"
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

      {/* ── Summary stats bar ─────────────────────────────────────────────── */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-center">
            <p className="text-[9px] font-bold text-blue-400 uppercase tracking-wider mb-1">🏦 सम्पत्ति</p>
            <p className="text-base font-black text-blue-700">{fmt(totalAssets)}</p>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-center">
            <p className="text-[9px] font-bold text-red-400 uppercase tracking-wider mb-1">📋 दायित्व</p>
            <p className="text-base font-black text-red-600">{fmt(totalLiabilities)}</p>
          </div>
          <div className="bg-green-50 border border-green-100 rounded-2xl p-4 text-center">
            <p className="text-[9px] font-bold text-green-500 uppercase tracking-wider mb-1">💰 आम्दानी</p>
            <p className="text-base font-black text-green-700">{fmt(totalRevenue)}</p>
          </div>
          <div
            className="rounded-2xl p-4 text-center border"
            style={{
              background: netEquity >= 0 ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)',
              borderColor: netEquity >= 0 ? '#a7f3d0' : '#fecaca',
            }}
          >
            <p className="text-[9px] font-bold uppercase tracking-wider mb-1"
              style={{ color: netEquity >= 0 ? '#10b981' : '#ef4444' }}>
              📊 खुद स्थिति
            </p>
            <p className="text-base font-black"
              style={{ color: netEquity >= 0 ? '#059669' : '#dc2626' }}>
              {netEquity >= 0 ? '+' : ''}{fmt(netEquity)}
            </p>
          </div>
        </div>
      )}

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        {[
          { key: 'accounts', label: `📒 खाताहरू (${accounts.length})` },
          { key: 'journal',  label: `📖 जर्नल प्रविष्टिहरू${entries.length ? ` (${entries.length})` : ''}` },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
              tab === key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab content ──────────────────────────────────────────────────── */}
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
        <div className="space-y-4">
          {/* Journal toolbar */}
          <div className="flex flex-wrap gap-2 items-center">
            {/* Search */}
            <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl flex-1 min-w-[200px]">
              <span className="text-gray-300 text-sm">🔍</span>
              <input
                value={jSearch}
                onChange={(e) => setJSearch(e.target.value)}
                placeholder="खोज्नुहोस् — विवरण, खाता, सन्दर्भ…"
                className="bg-transparent text-xs outline-none text-gray-700 flex-1"
              />
              {jSearch && (
                <button onClick={() => setJSearch('')} className="text-gray-300 hover:text-gray-600 text-xs">✕</button>
              )}
            </div>

            {/* Source filter pills */}
            <div className="flex gap-1 flex-wrap">
              {['ALL', ...Object.keys(SOURCE_BADGE)].map(src => (
                <button
                  key={src}
                  onClick={() => setJSource(src)}
                  className={`px-2.5 py-1.5 text-[9px] font-black rounded-lg border transition-all uppercase tracking-wider ${
                    jSource === src
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                  }`}
                >
                  {src === 'ALL' ? `All (${entries.length})` : `${SOURCE_BADGE[src].label} (${sourceCounts[src] || 0})`}
                </button>
              ))}
            </div>

            {/* New entry button */}
            <button
              onClick={() => { setJournalPreset(null); setShowJournal(true); }}
              className="px-4 py-2 bg-purple-600 text-white text-xs font-black rounded-xl hover:bg-purple-700 transition-colors shrink-0"
            >
              ✏️ नयाँ प्रविष्टि
            </button>
          </div>

          {/* Journal entries list */}
          {fetching ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin w-6 h-6 border-2 border-black border-t-transparent rounded-full" />
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="text-center py-16 bg-white border border-gray-200 rounded-2xl">
              <p className="text-4xl mb-3">📒</p>
              <p className="text-sm text-gray-600 font-black">कुनै जर्नल प्रविष्टि फेला परेन</p>
              <p className="text-xs text-gray-400 mt-1">
                {jSearch || jSource !== 'ALL'
                  ? 'फिल्टर हटाउनुहोस् वा फेरि खोज्नुहोस्।'
                  : 'पहिलो म्यानुअल प्रविष्टि थप्नुहोस्।'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredEntries.map((entry) => (
                <JournalEntryCard key={entry.id} entry={entry} />
              ))}
              <p className="text-[10px] text-gray-400 text-right px-1">
                {filteredEntries.length} of {entries.length} प्रविष्टिहरू
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Modals ───────────────────────────────────────────────────────── */}
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

      <Modal
        isOpen={showJournal}
        onClose={() => { setShowJournal(false); setJournalPreset(null); }}
        title={journalPreset ? `Adjust Balance — ${journalPreset.account?.name}` : 'New Manual Journal Entry'}
        maxWidth="max-w-2xl"
      >
        <ManualJournalForm
          accounts={accounts}
          preAccount={journalPreset?.account || null}
          preDirection={journalPreset?.direction || 'DEBIT'}
          onDone={handleJournalDone}
        />
      </Modal>

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
              रद्द गर्नुहोस्
            </button>
            <button
              onClick={handleDeleteConfirm}
              className="px-4 py-2 text-xs font-black text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors"
            >
              🗑 Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
