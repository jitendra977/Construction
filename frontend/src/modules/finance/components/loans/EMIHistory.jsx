/**
 * EMIHistory — paid EMI transactions + disbursements for one loan account.
 * Shows transparent Outstanding Balance breakdown:
 *   Total Disbursed − Total Principal Paid = Outstanding
 */
import { useEffect, useState, useMemo } from 'react';
import { useFinance } from '../../context/FinanceContext';
import financeApi from '../../services/financeApi';
import ConfirmModal from '../../../../components/common/ConfirmModal';
import DisbursementModal from './DisbursementModal';
import EMIModal from './EMIModal';

const NPR = (n) =>
  `NPR ${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const toLakh = (n) => {
  const num = parseFloat(n) || 0;
  if (num >= 10_000_000) return `${(num/10_000_000).toFixed(2)} करोड`;
  if (num >= 100_000)    return `${(num/100_000).toFixed(2)} लाख`;
  if (num >= 1_000)      return `${(num/1_000).toFixed(1)} हजार`;
  return `${num}`;
};

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function EMIHistory({ loan }) {
  const { projectId, refresh } = useFinance();
  const [payments,       setPayments]       = useState([]);
  const [disbursements,  setDisbursements]  = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState('');
  const [editingDisbursement, setEditingDisbursement] = useState(null);
  const [editingEMI,          setEditingEMI]          = useState(null);
  const [confirmCfg,          setConfirmCfg]          = useState({ isOpen: false });

  const fetchHistory = () => {
    if (!projectId || !loan?.id) return;
    setLoading(true);
    Promise.all([
      financeApi.getEMIPayments(projectId, loan.id),
      financeApi.getDisbursements(projectId, loan.id),
    ])
      .then(([emiRes, disbRes]) => {
        setPayments(
          Array.isArray(emiRes.data) ? emiRes.data : (emiRes.data?.results || [])
        );
        setDisbursements(
          Array.isArray(disbRes.data) ? disbRes.data : (disbRes.data?.results || [])
        );
      })
      .catch(() => setError('भुक्तानी इतिहास लोड गर्न सकिएन।'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchHistory();
  }, [projectId, loan?.id]);

  const handleDeleteDisbursement = (id) => {
    setConfirmCfg({
      isOpen: true,
      title: 'Disbursement हटाउने?',
      message: 'तपाईं यो disbursement रेकर्ड हटाउन निश्चित हुनुहुन्छ? यसले सम्बन्धित खाता प्रविष्टि (Ledger entry) पनि हटाउनेछ।',
      confirmText: 'हटाउनुहोस्',
      cancelText: 'रद्द गर्नुहोस्',
      type: 'danger',
      onConfirm: async () => {
        setConfirmCfg(c => ({ ...c, isOpen: false }));
        try {
          await financeApi.deleteDisbursement(id);
          refresh();
          fetchHistory();
        } catch (ex) {
          alert("त्रुटि: " + (ex?.response?.data?.detail || ex.message));
        }
      }
    });
  };

  const handleDeleteEMI = (id) => {
    setConfirmCfg({
      isOpen: true,
      title: 'EMI भुक्तानी हटाउने?',
      message: 'तपाईं यो EMI भुक्तानी रेकर्ड हटाउन निश्चित हुनुहुन्छ? यसले सम्बन्धित खाता प्रविष्टि (Ledger entry) पनि हटाउनेछ।',
      confirmText: 'हटाउनुहोस्',
      cancelText: 'रद्द गर्नुहोस्',
      type: 'danger',
      onConfirm: async () => {
        setConfirmCfg(c => ({ ...c, isOpen: false }));
        try {
          await financeApi.deleteEMIPayment(id);
          refresh();
          fetchHistory();
        } catch (ex) {
          alert("त्रुटि: " + (ex?.response?.data?.detail || ex.message));
        }
      }
    });
  };

  const totalDisbursed  = useMemo(() =>
    disbursements.reduce((s, d) => s + Number(d.amount || 0), 0), [disbursements]);

  const totalPrincipal  = useMemo(() =>
    payments.reduce((s, p) => s + Number(p.principal_amount || 0), 0), [payments]);

  const totalInterest   = useMemo(() =>
    payments.reduce((s, p) => s + Number(p.interest_amount || 0), 0), [payments]);

  const totalEMIPaid    = useMemo(() =>
    payments.reduce((s, p) => s + Number(p.total_emi || 0), 0), [payments]);

  const outstanding     = Math.abs(Number(loan.balance || 0));
  const loanLimit       = Number(loan.total_loan_limit || 0);
  const paidPct         = totalDisbursed > 0
    ? Math.min(100, (totalPrincipal / totalDisbursed) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin w-5 h-5 border-2 border-gray-300 border-t-gray-700 rounded-full" />
      </div>
    );
  }

  if (error) {
    return <p className="text-xs text-red-500 text-center py-8">{error}</p>;
  }

  return (
    <div className="space-y-4">

      {/* ── Outstanding breakdown ─────────────────────────────────────── */}
      <div className="bg-white border-2 border-blue-100 rounded-2xl overflow-hidden">
        <div className="px-4 py-2.5 bg-blue-50 border-b border-blue-100">
          <p className="text-[10px] font-black text-blue-500 uppercase tracking-wider">
            बाँकी रकम कसरी गणना भयो
          </p>
        </div>

        <div className="px-4 py-4 space-y-2">
          {/* Disbursed */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center text-[10px]">+</span>
              <span className="text-xs text-gray-600">
                कुल वितरण ({disbursements.length} पटक)
              </span>
            </div>
            <div className="text-right">
              <span className="text-sm font-black text-green-700">{NPR(totalDisbursed)}</span>
              <span className="text-[10px] text-gray-400 ml-1">({toLakh(totalDisbursed)})</span>
            </div>
          </div>

          {/* Principal paid */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center text-[10px]">−</span>
              <span className="text-xs text-gray-600">
                तिरेको साँवा ({payments.length} EMI)
              </span>
            </div>
            <div className="text-right">
              <span className="text-sm font-black text-red-500">{NPR(totalPrincipal)}</span>
              <span className="text-[10px] text-gray-400 ml-1">({toLakh(totalPrincipal)})</span>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-dashed border-gray-200 my-1" />

          {/* Outstanding */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-[10px]">=</span>
              <span className="text-xs font-black text-gray-800">बाँकी ऋण (Outstanding)</span>
            </div>
            <div className="text-right">
              <span className="text-base font-black text-blue-700">{NPR(outstanding)}</span>
              <span className="text-[10px] text-gray-400 ml-1">({toLakh(outstanding)})</span>
            </div>
          </div>
        </div>

        {/* Repayment progress */}
        {totalDisbursed > 0 && (
          <div className="px-4 pb-4">
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${paidPct}%` }}
              />
            </div>
            <div className="flex justify-between mt-1 text-[9px] text-gray-400">
              <span className="text-green-600 font-bold">{paidPct.toFixed(1)}% साँवा फिर्ता</span>
              <span>{payments.length} EMI तिरिएको</span>
            </div>
          </div>
        )}

        {/* Sanction vs disbursed warning */}
        {loanLimit > 0 && Math.abs(totalDisbursed - loanLimit) > 1 && (
          <div className="px-4 pb-3">
            <p className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 font-semibold">
              ⚠ स्वीकृत सीमा {NPR(loanLimit)} ({toLakh(loanLimit)}) —
              वितरित {NPR(totalDisbursed)} ({toLakh(totalDisbursed)})
              {totalDisbursed < loanLimit ? ' — आंशिक वितरण भएको छ' : ' — सीमाभन्दा बढी'}
            </p>
          </div>
        )}
      </div>

      {/* ── Interest summary ──────────────────────────────────────────── */}
      {payments.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-green-50 border border-green-100 rounded-2xl p-3 text-center">
            <p className="text-[9px] font-bold text-green-500 uppercase tracking-wider mb-0.5">तिरेको साँवा</p>
            <p className="text-sm font-black text-green-700">{NPR(totalPrincipal)}</p>
            <p className="text-[9px] text-green-400">{toLakh(totalPrincipal)}</p>
          </div>
          <div className="bg-orange-50 border border-orange-100 rounded-2xl p-3 text-center">
            <p className="text-[9px] font-bold text-orange-500 uppercase tracking-wider mb-0.5">तिरेको ब्याज</p>
            <p className="text-sm font-black text-orange-600">{NPR(totalInterest)}</p>
            <p className="text-[9px] text-orange-400">{toLakh(totalInterest)}</p>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3 text-center">
            <p className="text-[9px] font-bold text-blue-400 uppercase tracking-wider mb-0.5">जम्मा तिरेको</p>
            <p className="text-sm font-black text-blue-700">{NPR(totalEMIPaid)}</p>
            <p className="text-[9px] text-blue-400">{toLakh(totalEMIPaid)}</p>
          </div>
        </div>
      )}

      {/* ── Disbursement list ─────────────────────────────────────────── */}
      {disbursements.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider">
              ऋण वितरण ({disbursements.length})
            </p>
          </div>
          {disbursements.map((d) => (
            <div key={d.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors group">
              <div className="w-7 h-7 rounded-xl bg-green-50 flex items-center justify-center text-sm shrink-0">🏦</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-800">{fmtDate(d.date)}</p>
                <p className="text-[10px] text-gray-400 truncate">
                  {d.bank_account_name || 'Bank Account'}
                  {d.reference ? ` · ${d.reference}` : ''}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-green-700">{NPR(d.amount)}</p>
                <p className="text-[9px] text-gray-400">{toLakh(d.amount)}</p>
              </div>
              <div className="flex gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => setEditingDisbursement(d)} className="p-1 hover:bg-gray-100 rounded text-xs" title="Edit">✏️</button>
                <button onClick={() => handleDeleteDisbursement(d.id)} className="p-1 hover:bg-red-50 rounded text-xs" title="Delete">🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── EMI payment list ──────────────────────────────────────────── */}
      {payments.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-[1fr_80px_80px_80px_60px] gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">EMI भुक्तानी</span>
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider text-right">साँवा</span>
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider text-right">ब्याज</span>
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider text-right">जम्मा</span>
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider text-right"></span>
          </div>

          {payments.map((p) => (
            <div key={p.id}
              className="grid grid-cols-[1fr_80px_80px_80px_60px] gap-2 px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors group"
            >
              <div className="min-w-0 flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 text-sm">💳</div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-gray-800">{fmtDate(p.date)}</p>
                  <p className="text-[10px] text-gray-400 truncate">
                    {p.bank_account_name || 'Bank'}
                    {p.reference ? ` · ${p.reference}` : ''}
                  </p>
                </div>
              </div>
              <p className="text-xs font-black text-green-600 text-right self-center">{NPR(p.principal_amount)}</p>
              <p className="text-xs font-semibold text-orange-500 text-right self-center">{NPR(p.interest_amount)}</p>
              <p className="text-xs font-black text-gray-800 text-right self-center">{NPR(p.total_emi)}</p>
              <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity self-center">
                <button onClick={() => setEditingEMI(p)} className="p-1 hover:bg-gray-100 rounded text-xs" title="Edit">✏️</button>
                <button onClick={() => handleDeleteEMI(p.id)} className="p-1 hover:bg-red-50 rounded text-xs" title="Delete">🗑️</button>
              </div>
            </div>
          ))}

          {/* Footer totals */}
          <div className="grid grid-cols-[1fr_80px_80px_80px_60px] gap-2 px-4 py-2.5 bg-gray-50 border-t border-gray-200">
            <span className="text-[10px] font-black text-gray-500 self-center">जम्मा ({payments.length})</span>
            <span className="text-xs font-black text-green-700 text-right">{NPR(totalPrincipal)}</span>
            <span className="text-xs font-black text-orange-600 text-right">{NPR(totalInterest)}</span>
            <span className="text-xs font-black text-gray-900 text-right">{NPR(totalEMIPaid)}</span>
            <span></span>
          </div>
        </div>
      )}

      {editingDisbursement && (
        <DisbursementModal
          loan={loan}
          disbursement={editingDisbursement}
          onClose={() => {
            setEditingDisbursement(null);
            fetchHistory();
          }}
        />
      )}

      {editingEMI && (
        <EMIModal
          loan={loan}
          emi={editingEMI}
          onClose={() => {
            setEditingEMI(null);
            fetchHistory();
          }}
        />
      )}

      {/* Empty state */}
      {payments.length === 0 && disbursements.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-sm font-semibold">कुनै लेनदेन छैन</p>
          <p className="text-xs mt-1">पहिले ऋण वितरण दर्ता गर्नुहोस्</p>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmCfg.isOpen}
        title={confirmCfg.title}
        message={confirmCfg.message}
        confirmText={confirmCfg.confirmText}
        cancelText={confirmCfg.cancelText}
        type={confirmCfg.type}
        onConfirm={confirmCfg.onConfirm}
        onCancel={() => setConfirmCfg(c => ({ ...c, isOpen: false }))}
      />
    </div>
  );
}
