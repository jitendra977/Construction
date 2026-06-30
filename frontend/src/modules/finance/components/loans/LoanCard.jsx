/**
 * LoanCard — loan account card with real disbursed/paid amounts.
 * Fetches actual disbursement + EMI payment data to show correct figures.
 */
import { useEffect, useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import financeApi from '../../services/financeApi';

const NPR = (n) =>
  `NPR ${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const toLakh = (n) => {
  const num = parseFloat(n) || 0;
  if (num <= 0) return '';
  if (num >= 10_000_000) return `${(num / 10_000_000).toFixed(2)} cr`;
  if (num >= 100_000)    return `${(num / 100_000).toFixed(2)} L`;
  if (num >= 1_000)      return `${(num / 1_000).toFixed(1)}k`;
  return `${num}`;
};

const fmtTenure = (months) => {
  if (!months || months <= 0) return '—';
  const yrs = Math.floor(months / 12);
  const mo  = months % 12;
  if (yrs === 0) return `${mo} mo`;
  if (mo  === 0) return `${yrs} yr${yrs > 1 ? 's' : ''}`;
  return `${yrs} yr${yrs > 1 ? 's' : ''} ${mo} mo`;
};

export default function LoanCard({ account, onPayEMI, onEdit, onDetail, onDisburse }) {
  const { projectId } = useFinance();

  const [summary, setSummary] = useState(null); // { disbursed, principalPaid, emiCount }
  const [loadingSummary, setLoadingSummary] = useState(true);

  const emi         = Number(account.emi_amount || 0);
  const rate        = Number(account.interest_rate || 0);
  const tenure      = Number(account.loan_tenure_months || 0);
  const limit       = Number(account.total_loan_limit || 0);
  const outstanding = Math.abs(Number(account.balance || 0));

  useEffect(() => {
    if (!projectId || !account?.id) return;
    setLoadingSummary(true);
    Promise.all([
      financeApi.getDisbursements(projectId, account.id),
      financeApi.getEMIPayments(projectId, account.id),
    ]).then(([dRes, eRes]) => {
      const disbs = Array.isArray(dRes.data) ? dRes.data : (dRes.data?.results || []);
      const emis  = Array.isArray(eRes.data) ? eRes.data : (eRes.data?.results || []);
      const disbursed     = disbs.reduce((s, d) => s + Number(d.amount || 0), 0);
      const principalPaid = emis.reduce((s, e)  => s + Number(e.principal_amount || 0), 0);
      setSummary({ disbursed, principalPaid, emiCount: emis.length });
    }).catch(() => setSummary(null))
      .finally(() => setLoadingSummary(false));
  }, [projectId, account?.id]);

  // Use real numbers when available, fallback to balance-based estimate
  const totalDisbursed  = summary?.disbursed     ?? limit;
  const totalPrincipalPaid = summary?.principalPaid ?? Math.max(0, limit - outstanding);
  const emiCount        = summary?.emiCount       ?? 0;
  const noDisbursement  = summary !== null && summary.disbursed === 0;

  // Progress
  const pct = totalDisbursed > 0
    ? Math.min(100, (totalPrincipalPaid / totalDisbursed) * 100) : 0;

  // Health colour based on progress
  const healthColor =
    pct >= 75 ? '#10b981' :
    pct >= 40 ? '#3b82f6' :
    pct >= 10 ? '#f59e0b' : '#ef4444';

  // Monthly split estimate
  const monthlyInterest  = outstanding > 0 && rate > 0 ? outstanding * (rate / 100 / 12) : 0;
  const monthlyPrincipal = Math.max(0, emi - monthlyInterest);

  // Remaining months
  const remainingMonths = emi > 0 && outstanding > 0
    ? Math.ceil(outstanding / emi) : tenure;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-lg hover:border-gray-300 transition-all group">

      {/* Accent bar */}
      <div className="h-1 w-full" style={{ background: noDisbursement ? '#f59e0b' : healthColor }} />

      {/* Header */}
      <div className="px-5 pt-4 pb-3 flex items-start justify-between">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
            style={{ background: `${noDisbursement ? '#f59e0b' : healthColor}18` }}>
            🏦
          </div>
          <div className="min-w-0">
            <p className="font-black text-sm text-gray-900 truncate">{account.name}</p>
            <p className="text-[10px] text-gray-400 font-medium mt-0.5">
              {account.bank_name || 'Loan Account'}
              {account.account_holder_name ? ` · ${account.account_holder_name}` : ''}
            </p>
          </div>
        </div>
        <button onClick={() => onEdit(account)}
          className="text-gray-300 hover:text-gray-600 transition-colors ml-2 opacity-0 group-hover:opacity-100 text-sm">
          ✏️
        </button>
      </div>

      {/* ── Balance row: Outstanding + Paid ──────────────────────────── */}
      <div className="px-5 pb-3 grid grid-cols-2 gap-3">
        <div>
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">बाँकी ऋण</p>
          <p className="text-xl font-black text-gray-900">{NPR(outstanding)}</p>
          <p className="text-[10px] text-gray-400">{toLakh(outstanding)}</p>
        </div>
        <div>
          <p className="text-[9px] font-bold text-green-500 uppercase tracking-wider mb-0.5">तिरेको साँवा</p>
          {loadingSummary ? (
            <div className="h-5 w-20 bg-gray-100 animate-pulse rounded mt-1" />
          ) : (
            <>
              <p className="text-xl font-black text-green-700">{NPR(totalPrincipalPaid)}</p>
              <p className="text-[10px] text-green-500">{toLakh(totalPrincipalPaid)} · {emiCount} EMI</p>
            </>
          )}
        </div>
      </div>

      {/* ── Repayment progress ────────────────────────────────────────── */}
      <div className="px-5 pb-4">
        {loadingSummary ? (
          <div className="h-2 bg-gray-100 animate-pulse rounded-full" />
        ) : totalDisbursed > 0 ? (
          <>
            <div className="flex justify-between text-[9px] font-bold mb-1.5">
              <span style={{ color: healthColor }}>{pct.toFixed(1)}% फिर्ता भयो</span>
              <span className="text-gray-400">वितरण: {NPR(totalDisbursed)} ({toLakh(totalDisbursed)})</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, background: healthColor }} />
            </div>
          </>
        ) : (
          <div className="h-2 bg-amber-100 rounded-full" />
        )}
      </div>

      {/* ── Stats strip ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-px bg-gray-100 border-t border-gray-100">
        <div className="bg-white px-3 py-3 text-center">
          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">ब्याज दर</p>
          <p className="text-sm font-black text-gray-800 mt-0.5">{rate > 0 ? `${rate}%` : '—'}</p>
          <p className="text-[8px] text-gray-400">प्रति वर्ष</p>
        </div>
        <div className="bg-white px-3 py-3 text-center">
          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">EMI</p>
          <p className="text-sm font-black text-gray-800 mt-0.5">
            {emi > 0 ? toLakh(emi) : '—'}
          </p>
          <p className="text-[8px] text-gray-400">प्रति महिना</p>
        </div>
        <div className="bg-white px-3 py-3 text-center">
          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">बाँकी अवधि</p>
          <p className="text-sm font-black text-gray-800 mt-0.5">{fmtTenure(remainingMonths)}</p>
          <p className="text-[8px] text-gray-400">
            {tenure > 0 ? `of ${fmtTenure(tenure)}` : 'remaining'}
          </p>
        </div>
      </div>

      {/* ── Monthly EMI split ─────────────────────────────────────────── */}
      {emi > 0 && rate > 0 && outstanding > 0 && (
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-2">यो महिनाको EMI विभाजन</p>
          <div className="flex-1 h-1.5 rounded-full bg-gray-200 overflow-hidden flex">
            <div className="h-full bg-green-400"
              style={{ width: `${(monthlyPrincipal / emi) * 100}%` }} />
            <div className="h-full bg-orange-400 flex-1" />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-[9px] text-green-600 font-black">साँवा: {NPR(monthlyPrincipal)}</span>
            <span className="text-[9px] text-orange-500 font-black">ब्याज: {NPR(monthlyInterest)}</span>
          </div>
        </div>
      )}

      {/* ── No disbursement warning ───────────────────────────────────── */}
      {!loadingSummary && noDisbursement && (
        <div className="mx-5 mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2">
          <span className="text-sm">⚠️</span>
          <p className="text-[10px] text-amber-700 font-semibold flex-1">
            ऋण वितरण रेकर्ड गरिएको छैन। पहिले प्राप्त रकम दर्ता गर्नुहोस्।
          </p>
          <button onClick={() => onDisburse?.(account)}
            className="px-2 py-1 bg-amber-500 text-white text-[9px] font-black rounded-lg hover:bg-amber-600 transition-colors shrink-0">
            + वितरण गर्नुहोस्
          </button>
        </div>
      )}

      {/* ── Actions ──────────────────────────────────────────────────── */}
      <div className="flex gap-2 px-5 py-3 border-t border-gray-100">
        <button onClick={() => onPayEMI(account)}
          className="flex-1 py-2 bg-blue-600 text-white text-[11px] font-black rounded-xl hover:bg-blue-700 transition-colors">
          💳 EMI भुक्तानी
        </button>
        {!loadingSummary && !noDisbursement && onDisburse && (
          <button onClick={() => onDisburse(account)}
            className="px-3 py-2 bg-green-50 text-green-700 text-[11px] font-black rounded-xl hover:bg-green-100 border border-green-200 transition-colors">
            + वितरण
          </button>
        )}
        <button onClick={() => onDetail?.(account)}
          className="px-4 py-2 bg-gray-50 text-gray-600 text-[11px] font-black rounded-xl hover:bg-gray-100 border border-gray-200 transition-colors">
          विवरण हेर्नुहोस् →
        </button>
      </div>
    </div>
  );
}
