/**
 * LoanDetailPage
 * Full details, history, and CRUD management for one loan account.
 * Route: /finance/loans/:id
 */
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFinance } from '../context/FinanceContext';
import Modal from '../components/shared/Modal';
import LoanForm from '../components/loans/LoanForm';
import EMIHistory from '../components/loans/EMIHistory';
import AmortizationTable from '../components/loans/AmortizationTable';
import EMIModal from '../components/loans/EMIModal';
import DisbursementModal from '../components/loans/DisbursementModal';
import { usePlatformBase } from '../../../shared/utils/platformNav';

const NPR = (n) =>
  `NPR ${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const toLakh = (n) => {
  const num = parseFloat(n) || 0;
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

export default function LoanDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const base = usePlatformBase();
  const { loans, loading, refresh } = useFinance();

  const loan = loans.find((l) => String(l.id) === String(id));

  const [editing, setEditing] = useState(false);
  const [payingEMI, setPayingEMI] = useState(false);
  const [disbursing, setDisbursing] = useState(false);
  const [detailTab, setDetailTab] = useState('history');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-6 h-6 border-2 border-black border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!loan) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <div className="text-center">
          <p className="text-4xl mb-3">🏦</p>
          <p className="font-semibold">Loan Account not found</p>
          <button onClick={() => navigate(`${base}/finance/loans`)}
            className="mt-4 text-sm text-blue-600 hover:underline">
            ← Back to Loans
          </button>
        </div>
      </div>
    );
  }

  const emi         = Number(loan.emi_amount || 0);
  const rate        = Number(loan.interest_rate || 0);
  const tenure      = Number(loan.loan_tenure_months || 0);
  const limit       = Number(loan.total_loan_limit || 0);
  const outstanding = Math.abs(Number(loan.balance || 0));
  const remainingMonths = emi > 0 && outstanding > 0 ? Math.ceil(outstanding / emi) : tenure;

  return (
    <div className="space-y-5">
      {/* ── Back + Header ─────────────────────────────────────────────── */}
      <div>
        <button
          onClick={() => navigate(`${base}/finance/loans`)}
          className="text-xs text-gray-400 hover:text-gray-700 font-semibold flex items-center gap-1 mb-4 transition-colors"
        >
          ← Back to Loans
        </button>

        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            {/* Loan Account info */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-700 to-indigo-600 flex items-center justify-center text-2xl shrink-0">
                🏦
              </div>
              <div>
                <h1 className="text-xl font-black text-gray-900">{loan.name}</h1>
                <p className="text-xs text-gray-400 mt-0.5">
                  {loan.bank_name || 'Lender'}
                  {loan.account_number ? ` · A/C: ${loan.account_number}` : ''}
                  {loan.account_holder_name ? ` · Borrower: ${loan.account_holder_name}` : ''}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${loan.is_active ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {loan.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>

            {/* Balances + actions */}
            <div className="flex items-end gap-3 flex-wrap">
              <div className="text-right">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Outstanding Balance</p>
                <p className="text-2xl font-black text-gray-900">{NPR(outstanding)}</p>
                <p className="text-[10px] text-gray-400">{toLakh(outstanding)}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setDisbursing(true)}
                  className="px-3 py-2 bg-green-50 text-green-700 text-xs font-black rounded-xl hover:bg-green-100 border border-green-200 transition-colors"
                >
                  + Disburse
                </button>
                <button
                  onClick={() => setPayingEMI(true)}
                  className="px-3 py-2 bg-blue-600 text-white text-xs font-black rounded-xl hover:bg-blue-700 transition-colors"
                >
                  💳 Pay EMI
                </button>
                <button
                  onClick={() => setEditing(true)}
                  className="px-3 py-2 bg-gray-50 text-gray-600 text-xs font-black rounded-xl hover:bg-gray-100 border border-gray-200 transition-colors"
                >
                  ✏️ Edit Loan
                </button>
              </div>
            </div>
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-gray-100">
            <div className="text-center p-2 bg-gray-50/50 rounded-xl">
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Sanction Limit</p>
              <p className="text-base font-black text-gray-800">{NPR(limit)}</p>
              <p className="text-[9px] text-gray-400">{toLakh(limit)}</p>
            </div>
            <div className="text-center p-2 bg-gray-50/50 rounded-xl">
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Interest Rate</p>
              <p className="text-base font-black text-gray-800">{rate > 0 ? `${rate}%` : '—'}</p>
              <p className="text-[9px] text-gray-400">per annum</p>
            </div>
            <div className="text-center p-2 bg-gray-50/50 rounded-xl">
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Monthly EMI</p>
              <p className="text-base font-black text-gray-800">{emi > 0 ? NPR(emi) : '—'}</p>
              <p className="text-[9px] text-gray-400">{toLakh(emi)} / month</p>
            </div>
            <div className="text-center p-2 bg-gray-50/50 rounded-xl">
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Remaining Tenure</p>
              <p className="text-base font-black text-gray-800">{fmtTenure(remainingMonths)}</p>
              <p className="text-[9px] text-gray-400">of {fmtTenure(tenure)} total</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs selector ────────────────────────────────────────────── */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        {[
          { key: 'history',  label: '💳 Payment History & Ledger' },
          { key: 'schedule', label: '📅 Amortization Schedule' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setDetailTab(key)}
            className={`px-4 py-2 text-xs font-black rounded-lg transition-all ${
              detailTab === key
                ? 'bg-white shadow-sm text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab Content ──────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        {detailTab === 'history' ? (
          <EMIHistory loan={loan} />
        ) : (
          <AmortizationTable loan={loan} />
        )}
      </div>

      {/* ── Modals ───────────────────────────────────────────────────── */}
      <Modal isOpen={editing} onClose={() => setEditing(false)} title="Edit Loan" maxWidth="max-w-2xl">
        <LoanForm
          account={loan}
          onDone={() => {
            setEditing(false);
            refresh();
          }}
        />
      </Modal>

      {payingEMI && (
        <EMIModal
          loan={loan}
          onClose={() => {
            setPayingEMI(false);
            refresh();
          }}
        />
      )}

      {disbursing && (
        <DisbursementModal
          loan={loan}
          onClose={() => {
            setDisbursing(false);
            refresh();
          }}
        />
      )}
    </div>
  );
}
