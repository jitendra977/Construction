/**
 * AccountList — grouped, searchable chart-of-accounts with summary bar.
 * Groups: ASSET · LIABILITY · EQUITY · REVENUE · EXPENSE
 */
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlatformBase } from '../../../../shared/utils/platformNav';
import AmountDisplay from '../shared/AmountDisplay';

// ── Type config ───────────────────────────────────────────────────────────────
const TYPE_CFG = {
  ASSET:     { label: 'Assets',      icon: '🏦', color: '#3b82f6', bg: 'rgba(59,130,246,0.08)',  border: '#bfdbfe' },
  LIABILITY: { label: 'Liabilities', icon: '📋', color: '#ef4444', bg: 'rgba(239,68,68,0.08)',   border: '#fecaca' },
  EQUITY:    { label: 'Equity',      icon: '📊', color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)',  border: '#ddd6fe' },
  REVENUE:   { label: 'Revenue',     icon: '💰', color: '#10b981', bg: 'rgba(16,185,129,0.08)',  border: '#a7f3d0' },
  EXPENSE:   { label: 'Expenses',    icon: '💸', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  border: '#fde68a' },
};

const TYPE_ORDER = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'];

const fmt = (n) =>
  `NPR ${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

// ── AccountRow ────────────────────────────────────────────────────────────────
function AccountRow({ account, onEdit, onDelete, onTxns, onAdjust }) {
  const canDelete = Number(account.balance || 0) === 0;

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0 group">
      {/* Code */}
      <span className="font-mono text-[10px] text-gray-400 w-12 shrink-0">{account.code}</span>

      {/* Name + meta */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">{account.name}</p>
        {(account.bank_name || account.account_number) && (
          <p className="text-[10px] text-gray-400 mt-0.5">
            {account.bank_name || ''}
            {account.account_number ? ` · ••••${account.account_number.slice(-4)}` : ''}
          </p>
        )}
      </div>

      {/* Flags */}
      <div className="flex gap-1 shrink-0">
        {account.is_bank && (
          <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[8px] font-bold rounded border border-blue-100">BANK</span>
        )}
        {account.is_loan && (
          <span className="px-1.5 py-0.5 bg-yellow-50 text-yellow-600 text-[8px] font-bold rounded border border-yellow-100">LOAN</span>
        )}
      </div>

      {/* Balance */}
      <div className="text-right shrink-0 w-28">
        <AmountDisplay value={account.balance} size="sm" colorize />
      </div>

      {/* Actions — visible on hover */}
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {account.is_bank ? (
          <button
            onClick={() => onTxns(account)}
            className="px-2 py-1 text-[9px] font-black text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors uppercase tracking-wide"
          >
            Txns →
          </button>
        ) : (
          <button
            onClick={() => onAdjust(account)}
            className="px-2 py-1 text-[9px] font-black text-purple-600 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors uppercase tracking-wide"
          >
            Adjust
          </button>
        )}
        <button
          onClick={() => onEdit(account)}
          className="px-2 py-1 text-[9px] font-black text-gray-500 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
        >
          Edit
        </button>
        <button
          onClick={() => canDelete && onDelete(account)}
          title={canDelete ? 'Delete account' : 'Cannot delete — balance is non-zero'}
          className={`px-2 py-1 text-[9px] font-black rounded-lg border transition-colors ${
            canDelete
              ? 'text-red-500 bg-red-50 border-red-200 hover:bg-red-100 cursor-pointer'
              : 'text-gray-300 bg-gray-50 border-gray-200 cursor-not-allowed'
          }`}
        >
          Del
        </button>
      </div>
    </div>
  );
}

// ── TypeSection ───────────────────────────────────────────────────────────────
function TypeSection({ type, accounts, onEdit, onDelete, onTxns, onAdjust, onAdd }) {
  const cfg = TYPE_CFG[type] || { label: type, icon: '📁', color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb' };
  const [open, setOpen] = useState(true);

  const total = accounts.reduce((s, a) => s + Number(a.balance || 0), 0);

  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden mb-3">
      {/* Section header */}
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50"
        style={{ background: cfg.bg, borderBottom: open ? `1px solid ${cfg.border}` : 'none' }}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-lg">{cfg.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black" style={{ color: cfg.color }}>{cfg.label}</p>
          <p className="text-[10px] text-gray-400">{accounts.length} account{accounts.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="text-right mr-3">
          <p className="text-xs font-black text-gray-700">{fmt(total)}</p>
          <p className="text-[9px] text-gray-400 uppercase tracking-wider">Total</p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onAdd(type); }}
          className="px-2.5 py-1 text-[9px] font-black rounded-lg border transition-colors uppercase tracking-wide"
          style={{ color: cfg.color, background: 'white', borderColor: cfg.border }}
        >
          + Add
        </button>
        <span className="text-gray-400 text-xs ml-1">{open ? '▲' : '▼'}</span>
      </button>

      {/* Accounts */}
      {open && (
        accounts.length === 0 ? (
          <div className="px-4 py-6 text-center text-gray-400 text-xs bg-white">
            No {cfg.label.toLowerCase()} accounts yet.{' '}
            <button
              onClick={() => onAdd(type)}
              className="underline hover:text-gray-700 transition-colors"
            >
              Add one
            </button>
          </div>
        ) : (
          <div className="bg-white">
            {accounts.map((a) => (
              <AccountRow
                key={a.id}
                account={a}
                onEdit={onEdit}
                onDelete={onDelete}
                onTxns={onTxns}
                onAdjust={onAdjust}
              />
            ))}
          </div>
        )
      )}
    </div>
  );
}

// ── AccountList ───────────────────────────────────────────────────────────────
export default function AccountList({ accounts = [], onEdit, onDelete, onAdd, onAdjust }) {
  const navigate  = useNavigate();
  const base      = usePlatformBase();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return accounts;
    const q = search.toLowerCase();
    return accounts.filter(
      (a) =>
        a.name?.toLowerCase().includes(q) ||
        a.code?.toLowerCase().includes(q) ||
        a.bank_name?.toLowerCase().includes(q)
    );
  }, [accounts, search]);

  // Group by type
  const grouped = useMemo(() => {
    const map = {};
    TYPE_ORDER.forEach((t) => { map[t] = []; });
    filtered.forEach((a) => {
      const key = a.account_type?.toUpperCase();
      if (map[key]) map[key].push(a);
      else map['ASSET'] = [...(map['ASSET'] || []), a]; // fallback
    });
    return map;
  }, [filtered]);

  // Summary stats
  const { totalAssets, totalLiabilities, netPosition } = useMemo(() => {
    const ta = accounts
      .filter((a) => a.account_type === 'ASSET')
      .reduce((s, a) => s + Number(a.balance || 0), 0);
    const tl = accounts
      .filter((a) => a.account_type === 'LIABILITY')
      .reduce((s, a) => s + Number(a.balance || 0), 0);
    return { totalAssets: ta, totalLiabilities: tl, netPosition: ta - tl };
  }, [accounts]);

  const handleTxns = (account) => {
    navigate(`${base}/finance/banking/${account.id}`);
  };

  if (!accounts.length) {
    return (
      <div className="text-center py-16">
        <p className="text-4xl mb-3">📒</p>
        <p className="text-sm text-gray-500 font-semibold mb-1">No accounts yet</p>
        <p className="text-xs text-gray-400">Add your first account to start tracking finances</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-center">
          <p className="text-[9px] font-bold text-blue-400 uppercase tracking-wider mb-1">Total Assets</p>
          <p className="text-lg font-black text-blue-700">{fmt(totalAssets)}</p>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-center">
          <p className="text-[9px] font-bold text-red-400 uppercase tracking-wider mb-1">Total Liabilities</p>
          <p className="text-lg font-black text-red-600">{fmt(totalLiabilities)}</p>
        </div>
        <div
          className="rounded-2xl p-4 text-center border"
          style={{
            background: netPosition >= 0 ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)',
            borderColor: netPosition >= 0 ? '#a7f3d0' : '#fecaca',
          }}
        >
          <p className="text-[9px] font-bold uppercase tracking-wider mb-1"
            style={{ color: netPosition >= 0 ? '#10b981' : '#ef4444' }}>
            Net Position
          </p>
          <p className="text-lg font-black"
            style={{ color: netPosition >= 0 ? '#059669' : '#dc2626' }}>
            {netPosition >= 0 ? '+' : ''}{fmt(netPosition)}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 border border-gray-200">
        <span className="text-gray-300 text-sm">🔍</span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search accounts by name, code, or bank…"
          className="bg-transparent text-xs outline-none text-gray-700 flex-1"
        />
        {search && (
          <button onClick={() => setSearch('')} className="text-gray-300 hover:text-gray-600 text-xs">✕</button>
        )}
      </div>

      {/* Grouped sections */}
      {search && filtered.length === 0 ? (
        <div className="text-center py-10 text-gray-400 text-sm">
          No accounts match "<span className="font-semibold">{search}</span>"
        </div>
      ) : (
        TYPE_ORDER.map((type) => (
          <TypeSection
            key={type}
            type={type}
            accounts={grouped[type] || []}
            onEdit={onEdit}
            onDelete={onDelete}
            onTxns={handleTxns}
            onAdjust={onAdjust}
            onAdd={onAdd}
          />
        ))
      )}

      {/* Total account count */}
      <p className="text-[10px] text-gray-400 text-right px-1">
        {filtered.length} of {accounts.length} accounts
      </p>
    </div>
  );
}
