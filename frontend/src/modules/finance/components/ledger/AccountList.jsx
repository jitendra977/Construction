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
  ASSET:     { label: 'सम्पत्ति',  labelEn: 'Assets',      icon: '🏦', color: '#2563eb', bg: 'rgba(37,99,235,0.07)',   border: '#bfdbfe' },
  LIABILITY: { label: 'दायित्व',   labelEn: 'Liabilities', icon: '📋', color: '#dc2626', bg: 'rgba(220,38,38,0.07)',   border: '#fecaca' },
  EQUITY:    { label: 'इक्विटी',   labelEn: 'Equity',      icon: '📊', color: '#7c3aed', bg: 'rgba(124,58,237,0.07)',  border: '#ddd6fe' },
  REVENUE:   { label: 'आम्दानी',   labelEn: 'Revenue',     icon: '💰', color: '#059669', bg: 'rgba(5,150,105,0.07)',   border: '#a7f3d0' },
  EXPENSE:   { label: 'खर्च',      labelEn: 'Expenses',    icon: '💸', color: '#d97706', bg: 'rgba(217,119,6,0.07)',   border: '#fde68a' },
};

const TYPE_ORDER = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'];

const fmt = (n) =>
  `NPR ${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

// ── AccountRow ────────────────────────────────────────────────────────────────
function AccountRow({ account, onEdit, onDelete, onTxns, onAdjust }) {
  const canDelete = Number(account.balance || 0) === 0;
  const bal = Number(account.balance || 0);
  const balColor = bal > 0 ? '#059669' : bal < 0 ? '#dc2626' : '#6b7280';

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-blue-50/30 transition-colors border-b border-gray-100 last:border-0 group">
      {/* Code chip */}
      <span className="font-mono text-[9px] text-gray-400 bg-gray-100 rounded px-1.5 py-0.5 w-14 text-center shrink-0 truncate">
        {account.code}
      </span>

      {/* Name + meta */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">{account.name}</p>
        {(account.bank_name || account.account_number) && (
          <p className="text-[10px] text-gray-400 mt-0.5 truncate">
            {account.bank_name || ''}
            {account.account_number ? ` · ••••${account.account_number.slice(-4)}` : ''}
          </p>
        )}
      </div>

      {/* Flags */}
      <div className="flex gap-1 shrink-0">
        {account.is_bank && (
          <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[8px] font-black rounded border border-blue-100 uppercase tracking-wide">Bank</span>
        )}
        {account.is_loan && (
          <span className="px-1.5 py-0.5 bg-amber-50 text-amber-600 text-[8px] font-black rounded border border-amber-100 uppercase tracking-wide">Loan</span>
        )}
      </div>

      {/* Balance */}
      <div className="text-right shrink-0 w-32">
        <p className="text-sm font-black" style={{ color: balColor }}>{fmt(bal)}</p>
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
          ✏️
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
          🗑
        </button>
      </div>
    </div>
  );
}

// ── TypeSection ───────────────────────────────────────────────────────────────
function TypeSection({ type, accounts, onEdit, onDelete, onTxns, onAdjust, onAdd }) {
  const cfg = TYPE_CFG[type] || { label: type, labelEn: type, icon: '📁', color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb' };
  const [open, setOpen] = useState(true);

  const total   = accounts.reduce((s, a) => s + Number(a.balance || 0), 0);
  const posCount = accounts.filter(a => Number(a.balance) > 0).length;

  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden mb-3 shadow-sm">
      {/* Section header */}
      <button
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors hover:opacity-90"
        style={{ background: cfg.bg, borderBottom: open ? `1px solid ${cfg.border}` : 'none' }}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-xl shrink-0">{cfg.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black" style={{ color: cfg.color }}>
            {cfg.label}
            <span className="ml-1.5 text-[9px] font-bold opacity-60 normal-case">{cfg.labelEn}</span>
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">
            {accounts.length} खाता{accounts.length !== 1 ? 'हरू' : ''}
            {posCount > 0 ? ` · ${posCount} active` : ''}
          </p>
        </div>
        <div className="text-right mr-3 shrink-0">
          <p className="text-sm font-black text-gray-800">{fmt(total)}</p>
          <p className="text-[9px] text-gray-400 uppercase tracking-wider">जम्मा</p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onAdd(type); }}
          className="px-2.5 py-1 text-[9px] font-black rounded-lg border transition-colors uppercase tracking-wide shrink-0"
          style={{ color: cfg.color, background: 'white', borderColor: cfg.border }}
        >
          + थप्नुहोस्
        </button>
        <span className="text-gray-400 text-xs ml-1 shrink-0">{open ? '▲' : '▼'}</span>
      </button>

      {/* Accounts */}
      {open && (
        accounts.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-400 text-xs bg-white">
            <p className="text-2xl mb-2">{cfg.icon}</p>
            <p>अहिलेसम्म कुनै {cfg.label} खाता छैन।{' '}
              <button onClick={() => onAdd(type)} className="underline hover:text-gray-700 transition-colors font-semibold">
                थप्नुहोस्
              </button>
            </p>
          </div>
        ) : (
          <div className="bg-white divide-y divide-gray-100">
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
  const [typeFilter, setTypeFilter] = useState('ALL');

  const filtered = useMemo(() => {
    let list = accounts;
    if (typeFilter !== 'ALL') list = list.filter(a => a.account_type === typeFilter);
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (a) =>
        a.name?.toLowerCase().includes(q) ||
        a.code?.toLowerCase().includes(q) ||
        a.bank_name?.toLowerCase().includes(q)
    );
  }, [accounts, search, typeFilter]);

  // Group by type
  const grouped = useMemo(() => {
    const map = {};
    TYPE_ORDER.forEach((t) => { map[t] = []; });
    filtered.forEach((a) => {
      const key = a.account_type?.toUpperCase();
      if (map[key]) map[key].push(a);
      else map['ASSET'] = [...(map['ASSET'] || []), a];
    });
    return map;
  }, [filtered]);

  const handleTxns = (account) => {
    navigate(`${base}/finance/banking/${account.id}`);
  };

  if (!accounts.length) {
    return (
      <div className="text-center py-16 bg-white border border-gray-200 rounded-2xl">
        <p className="text-4xl mb-3">📒</p>
        <p className="text-sm text-gray-600 font-black mb-1">अहिलेसम्म कुनै खाता छैन</p>
        <p className="text-xs text-gray-400">वित्त व्यवस्थापन सुरु गर्न पहिलो खाता थप्नुहोस्</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search + Type filter row */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-gray-200 flex-1 min-w-[160px]">
          <span className="text-gray-300 text-sm">🔍</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="खाता खोज्नुहोस् — नाम, कोड, बैंक…"
            className="bg-transparent text-xs outline-none text-gray-700 flex-1"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-gray-300 hover:text-gray-600 text-xs">✕</button>
          )}
        </div>

        {/* Type filter pills */}
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() => setTypeFilter('ALL')}
            className={`px-2.5 py-1.5 text-[9px] font-black rounded-lg border transition-all uppercase tracking-wider ${
              typeFilter === 'ALL' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
            }`}
          >
            सबै ({accounts.length})
          </button>
          {TYPE_ORDER.map(t => {
            const cfg = TYPE_CFG[t];
            const cnt = accounts.filter(a => a.account_type === t).length;
            return (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-2.5 py-1.5 text-[9px] font-black rounded-lg border transition-all uppercase tracking-wider`}
                style={typeFilter === t
                  ? { background: cfg.color, color: 'white', borderColor: cfg.color }
                  : { background: 'white', color: cfg.color, borderColor: cfg.border }
                }
              >
                {cfg.icon} {cfg.label} ({cnt})
              </button>
            );
          })}
        </div>
      </div>

      {/* Search empty state */}
      {filtered.length === 0 ? (
        <div className="text-center py-10 text-gray-400 text-sm bg-white border border-gray-200 rounded-2xl">
          <p className="text-2xl mb-2">🔍</p>
          <p>"{search || typeFilter}" सँग मेल खाने कुनै खाता फेला परेन</p>
        </div>
      ) : (
        TYPE_ORDER.map((type) => {
          const grp = grouped[type] || [];
          if (typeFilter !== 'ALL' && typeFilter !== type) return null;
          return (
            <TypeSection
              key={type}
              type={type}
              accounts={grp}
              onEdit={onEdit}
              onDelete={onDelete}
              onTxns={handleTxns}
              onAdjust={onAdjust}
              onAdd={onAdd}
            />
          );
        })
      )}

      {/* Total account count */}
      <p className="text-[10px] text-gray-400 text-right px-1">
        {filtered.length} / {accounts.length} खाताहरू देखाइएको छ
      </p>
    </div>
  );
}
