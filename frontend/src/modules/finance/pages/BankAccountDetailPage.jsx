/**
 * BankAccountDetailPage
 * Full transaction history for one bank / cash account.
 * Route: /finance/banking/:id
 */
import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFinance } from '../context/FinanceContext';
import financeApi from '../services/financeApi';
import DepositModal from '../components/banking/DepositModal';
import Modal from '../components/shared/Modal';
import BankForm from '../components/banking/BankForm';
import { usePlatformBase } from '../../../shared/utils/platformNav';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) =>
  `NPR ${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const SOURCE_META = {
  DEPOSIT:  { label: 'Deposit',       color: '#10b981', bg: 'rgba(16,185,129,0.1)',  icon: '⬇️' },
  TRANSFER: { label: 'Transfer',      color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',  icon: '↔️' },
  LOAN_IN:  { label: 'Loan In',       color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)',  icon: '🏦' },
  EMI:      { label: 'EMI Payment',   color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  icon: '📅' },
  BILL:     { label: 'Bill',          color: '#6b7280', bg: 'rgba(107,114,128,0.1)', icon: '🧾' },
  PAYMENT:  { label: 'Payment',       color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   icon: '💸' },
  OPENING:  { label: 'Opening Bal',   color: '#f97316', bg: 'rgba(249,115,22,0.1)',  icon: '🔓' },
  MANUAL:   { label: 'Manual Entry',  color: '#6b7280', bg: 'rgba(107,114,128,0.1)', icon: '✏️' },
};

function TxRow({ entry, accountId }) {
  const meta = SOURCE_META[entry.source_type] || SOURCE_META.MANUAL;

  // Find this account's line(s) in the entry
  const myLines = (entry.lines || []).filter(
    (l) => String(l.account) === String(accountId)
  );

  // Determine net amount for this account: DEBIT = money in, CREDIT = money out
  const debitAmt  = myLines.filter(l => l.entry_type === 'DEBIT') .reduce((s, l) => s + Number(l.amount), 0);
  const creditAmt = myLines.filter(l => l.entry_type === 'CREDIT').reduce((s, l) => s + Number(l.amount), 0);
  const isCredit  = creditAmt > debitAmt;
  const netAmount = isCredit ? creditAmt : debitAmt;

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0">
      {/* Icon */}
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-base"
        style={{ background: meta.bg }}
      >
        {meta.icon}
      </div>

      {/* Description + meta */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{entry.description}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span
            className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded"
            style={{ background: meta.bg, color: meta.color }}
          >
            {meta.label}
          </span>
          {entry.source_ref && (
            <span className="text-[10px] text-gray-400 font-mono">{entry.source_ref}</span>
          )}
        </div>
      </div>

      {/* Date */}
      <div className="text-right shrink-0">
        <p
          className="text-sm font-black"
          style={{ color: isCredit ? '#ef4444' : '#10b981' }}
        >
          {isCredit ? '−' : '+'}{fmt(netAmount)}
        </p>
        <p className="text-[10px] text-gray-400 mt-0.5">{entry.date}</p>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function BankAccountDetailPage() {
  const { id }           = useParams();
  const navigate         = useNavigate();
  const base             = usePlatformBase();
  const { banks, projectId, refresh: refreshCtx } = useFinance();

  const account = banks.find((b) => String(b.id) === String(id));

  const [txns,       setTxns]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [depositing, setDepositing] = useState(false);
  const [editing,    setEditing]    = useState(false);
  const [search,     setSearch]     = useState('');
  const [filterType, setFilterType] = useState('ALL');

  const loadTxns = async () => {
    if (!projectId || !id) return;
    setLoading(true);
    try {
      const res = await financeApi.getAccountTransactions(projectId, id);
      setTxns(Array.isArray(res.data) ? res.data : res.data?.results || []);
    } catch {
      setTxns([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTxns(); }, [projectId, id]);

  // ── Filtered + searched txns ──────────────────────────────────────────────
  const filtered = useMemo(() => {
    return txns.filter((t) => {
      const matchType = filterType === 'ALL' || t.source_type === filterType;
      const q = search.toLowerCase();
      const matchSearch = !q ||
        t.description.toLowerCase().includes(q) ||
        (t.source_ref || '').toLowerCase().includes(q);
      return matchType && matchSearch;
    });
  }, [txns, filterType, search]);

  // ── Running balance calc (newest first, so reverse for running calc) ──────
  const withBalance = useMemo(() => {
    if (!account) return filtered;
    let running = Number(account.balance || 0);
    // entries are newest-first; calculate backward
    const arr = [...filtered];
    return arr.map((entry) => {
      const myLines = (entry.lines || []).filter(l => String(l.account) === String(id));
      const debit  = myLines.filter(l => l.entry_type === 'DEBIT') .reduce((s, l) => s + Number(l.amount), 0);
      const credit = myLines.filter(l => l.entry_type === 'CREDIT').reduce((s, l) => s + Number(l.amount), 0);
      const balAfter = running;
      running = running - debit + credit; // going backward in time
      return { ...entry, _balanceAfter: balAfter };
    });
  }, [filtered, account, id]);

  // ── Summary stats ─────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    let totalIn = 0, totalOut = 0;
    txns.forEach(entry => {
      const myLines = (entry.lines || []).filter(l => String(l.account) === String(id));
      myLines.forEach(l => {
        if (l.entry_type === 'DEBIT')  totalIn  += Number(l.amount);
        if (l.entry_type === 'CREDIT') totalOut += Number(l.amount);
      });
    });
    return { totalIn, totalOut, net: totalIn - totalOut };
  }, [txns, id]);

  if (!account && !loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <div className="text-center">
          <p className="text-4xl mb-3">🏦</p>
          <p className="font-semibold">Account not found</p>
          <button onClick={() => navigate(`${base}/finance/banking`)}
            className="mt-4 text-sm text-blue-600 hover:underline">
            ← Back to Banking
          </button>
        </div>
      </div>
    );
  }

  const sourceTypes = [...new Set(txns.map(t => t.source_type))];

  return (
    <div className="space-y-5">

      {/* ── Back + Header ─────────────────────────────────────────────── */}
      <div>
        <button
          onClick={() => navigate(`${base}/finance/banking`)}
          className="text-xs text-gray-400 hover:text-gray-700 font-semibold flex items-center gap-1 mb-4 transition-colors"
        >
          ← Back to Banking
        </button>

        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            {/* Account info */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gray-800 to-gray-600 flex items-center justify-center text-2xl shrink-0">
                🏦
              </div>
              <div>
                <h1 className="text-xl font-black text-gray-900">{account?.name || '…'}</h1>
                <p className="text-xs text-gray-400 mt-0.5">
                  {account?.bank_name || 'Account'}
                  {account?.account_number ? ` · •••• ${account.account_number.slice(-4)}` : ''}
                  {account?.account_holder_name ? ` · ${account.account_holder_name}` : ''}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-wider font-semibold">
                  {account?.account_type || ''}
                </p>
              </div>
            </div>

            {/* Balance + actions */}
            <div className="flex items-end gap-3 flex-wrap">
              <div className="text-right">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Current Balance</p>
                <p className="text-2xl font-black text-gray-900">{fmt(account?.balance)}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setDepositing(true)}
                  className="px-3 py-2 bg-green-50 text-green-700 text-xs font-black rounded-xl hover:bg-green-100 border border-green-200 transition-colors"
                >
                  + Deposit
                </button>
                <button
                  onClick={() => setEditing(true)}
                  className="px-3 py-2 bg-gray-50 text-gray-600 text-xs font-black rounded-xl hover:bg-gray-100 border border-gray-200 transition-colors"
                >
                  ✏️ Edit
                </button>
              </div>
            </div>
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-gray-100">
            <div className="text-center">
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Total In</p>
              <p className="text-base font-black text-green-600">{fmt(stats.totalIn)}</p>
            </div>
            <div className="text-center">
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Total Out</p>
              <p className="text-base font-black text-red-500">{fmt(stats.totalOut)}</p>
            </div>
            <div className="text-center">
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">{txns.length} Transactions</p>
              <p className={`text-base font-black ${stats.net >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {stats.net >= 0 ? '+' : ''}{fmt(stats.net)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Transactions ──────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">

        {/* Toolbar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 flex-wrap">
          <h2 className="text-sm font-black text-gray-900 mr-auto">Transaction History</h2>

          {/* Search */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-200 min-w-[180px]">
            <span className="text-gray-300 text-xs">🔍</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              className="bg-transparent text-xs outline-none text-gray-700 w-full"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-gray-300 hover:text-gray-600 text-xs">✕</button>
            )}
          </div>

          {/* Type filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {['ALL', ...sourceTypes].map(type => {
              const meta = SOURCE_META[type];
              return (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide transition-colors border"
                  style={{
                    background:   filterType === type ? (meta?.bg || 'rgba(0,0,0,0.08)') : 'transparent',
                    color:        filterType === type ? (meta?.color || '#111') : '#9ca3af',
                    borderColor:  filterType === type ? (meta?.color || '#d1d5db') : '#e5e7eb',
                  }}
                >
                  {type === 'ALL' ? 'All' : (meta?.label || type)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Transaction list */}
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin w-5 h-5 border-2 border-gray-300 border-t-gray-700 rounded-full" />
          </div>
        ) : withBalance.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <p className="text-4xl mb-3">📋</p>
            <p className="font-semibold text-sm">
              {search || filterType !== 'ALL' ? 'No matching transactions' : 'No transactions yet'}
            </p>
            {filterType === 'ALL' && !search && (
              <p className="text-xs mt-1">Make a deposit or transfer to see activity here</p>
            )}
          </div>
        ) : (
          <div>
            {withBalance.map((entry) => (
              <div key={entry.id} className="relative group">
                <TxRow entry={entry} accountId={id} />
                {/* Running balance on hover */}
                <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <span className="text-[9px] text-gray-400 bg-white border border-gray-200 px-1.5 py-0.5 rounded font-mono">
                    bal: {fmt(entry._balanceAfter)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer count */}
        {!loading && withBalance.length > 0 && (
          <div className="px-4 py-2.5 border-t border-gray-100 text-[10px] text-gray-400 text-right">
            Showing {withBalance.length} of {txns.length} transactions
          </div>
        )}
      </div>

      {/* Modals */}
      {depositing && account && (
        <DepositModal
          account={account}
          onClose={() => { setDepositing(false); refreshCtx(); loadTxns(); }}
        />
      )}
      <Modal isOpen={editing} onClose={() => setEditing(false)} title="Edit Account">
        <BankForm account={account} onDone={() => { setEditing(false); refreshCtx(); }} />
      </Modal>
    </div>
  );
}
