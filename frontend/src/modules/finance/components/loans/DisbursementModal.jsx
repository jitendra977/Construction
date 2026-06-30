/**
 * DisbursementModal — record the initial loan disbursement.
 *
 * When the bank sends you the loan money, this records:
 *   DEBIT  Bank Account   (money arrives in your account)
 *   CREDIT Loan Account   (liability — you now owe the bank)
 *
 * This MUST be done before paying EMIs, otherwise the loan balance
 * will be negative (EMI debits with no matching credit disbursement).
 */
import { useState, useMemo } from 'react';
import Modal from '../shared/Modal';
import financeApi from '../../services/financeApi';
import { useFinance } from '../../context/FinanceContext';

const today = () => new Date().toISOString().slice(0, 10);

const NPR = (n) =>
  `NPR ${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

// Convert a number to Nepali lakh/crore words
const toLakhCrore = (n) => {
  const num = parseFloat(n) || 0;
  if (num <= 0) return '';
  if (num >= 10_000_000) {
    const cr = num / 10_000_000;
    return `${cr % 1 === 0 ? cr : cr.toFixed(2)} करोड`;
  }
  if (num >= 100_000) {
    const lakh = num / 100_000;
    return `${lakh % 1 === 0 ? lakh : lakh.toFixed(2)} लाख`;
  }
  if (num >= 1_000) {
    const hazar = num / 1_000;
    return `${hazar % 1 === 0 ? hazar : hazar.toFixed(1)} हजार`;
  }
  return `${num}`;
};

const inp = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 bg-white';
const lbl = 'block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1';

export default function DisbursementModal({ loan, disbursement = null, onClose }) {
  const { banks, projectId, refresh } = useFinance();

  const [bankId,    setBankId]    = useState(disbursement?.bank_account || '');
  const [amount,    setAmount]    = useState(disbursement ? String(disbursement.amount) : (loan.total_loan_limit || ''));
  const [date,      setDate]      = useState(disbursement?.date || today());
  const [reference, setReference] = useState(disbursement?.reference || '');
  const [notes,     setNotes]     = useState(disbursement?.notes || '');
  const [busy,      setBusy]      = useState(false);
  const [err,       setErr]       = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!bankId) { setErr('Select the bank account that received the money.'); return; }
    if (!amount || parseFloat(amount) <= 0) { setErr('Enter a valid loan amount.'); return; }
    setBusy(true); setErr('');
    try {
      const payload = {
        loan_account: loan.id,
        bank_account: bankId,
        date,
        amount: parseFloat(amount),
        reference,
        notes,
      };
      if (disbursement) {
        await financeApi.updateDisbursement(disbursement.id, payload);
      } else {
        await financeApi.createDisbursement(payload);
      }
      await refresh();
      onClose();
    } catch (ex) {
      const d = ex?.response?.data;
      setErr(d?.detail || d?.error || (d && JSON.stringify(d)) || ex.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={disbursement ? "Edit Disbursement" : "Record Loan Disbursement"} maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="p-6 space-y-4">

        {/* Explainer */}
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl">
          <p className="text-[10px] font-black text-amber-600 uppercase tracking-wider mb-1">
            ऋण वितरण भनेको के हो?
          </p>
          <p className="text-xs text-amber-800 leading-relaxed">
            बैंकले ऋणको रकम तपाईंको खातामा पठाएको छ। यो रेकर्ड गर्दा:
            <br />
            तपाईंको <span className="font-semibold">बैंक खातामा रकम थपिन्छ</span> (पैसा प्राप्त भयो) र
            <span className="font-semibold"> ऋण खातामा दायित्व सिर्जना हुन्छ</span> (बैंकलाई तिर्नु पर्ने रकम)।
            <br />
            <span className="font-black text-amber-900">EMI तिर्नु अघि एक पटक यो अनिवार्य गर्नुहोस्।</span>
          </p>
        </div>

        {/* Loan info */}
        <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
          <p className="text-[10px] font-bold text-blue-400 uppercase">ऋण खाता</p>
          <p className="font-black text-sm text-blue-900">{loan.name}</p>
          {loan.total_loan_limit && (
            <p className="text-xs text-blue-500 mt-0.5">
              स्वीकृत सीमा: {NPR(loan.total_loan_limit)}
            </p>
          )}
        </div>

        {err && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-xl font-semibold">{err}</p>
        )}

        {/* Receiving bank account */}
        <div>
          <label className={lbl}>पैसा प्राप्त हुने बैंक खाता *</label>
          <select className={inp} value={bankId} onChange={(e) => setBankId(e.target.value)} required>
            <option value="">— बैंक खाता छान्नुहोस् —</option>
            {banks.map((b) => (
              <option key={b.id} value={b.id}>
                {b.bank_name ? `${b.bank_name} · ` : ''}{b.name} ({NPR(b.balance)})
              </option>
            ))}
          </select>
        </div>

        {/* Amount */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className={lbl}>प्राप्त रकम (NPR) *</label>
            {/* Quick shortcuts */}
            <div className="flex gap-1">
              {[10, 20, 50, 80].map((lakh) => (
                <button
                  key={lakh}
                  type="button"
                  onClick={() => setAmount(String(lakh * 100_000))}
                  className="px-2 py-0.5 text-[9px] font-black bg-gray-100 hover:bg-blue-50 hover:text-blue-700 border border-gray-200 rounded-lg transition-colors"
                >
                  {lakh}L
                </button>
              ))}
              {loan.total_loan_limit && (
                <button
                  type="button"
                  onClick={() => setAmount(String(loan.total_loan_limit))}
                  className="px-2 py-0.5 text-[9px] font-black bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
                >
                  Full
                </button>
              )}
            </div>
          </div>

          <input
            type="number" min="1" step="1" required className={`${inp} font-semibold text-base`}
            value={amount} onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
          />

          {/* Live lakh/crore display */}
          {parseFloat(amount) > 0 && (
            <div className="flex items-center justify-between mt-1.5 px-1">
              <span className="text-[11px] font-black text-blue-600">
                = {toLakhCrore(amount)}
              </span>
              <span className="text-[10px] text-gray-400 font-mono">
                {NPR(amount)}
              </span>
            </div>
          )}

          {/* Sanctioned limit mismatch warning */}
          {loan.total_loan_limit && parseFloat(amount) > 0 &&
           parseFloat(amount) !== parseFloat(loan.total_loan_limit) && (
            <p className="text-[10px] text-amber-600 mt-1 font-semibold">
              ⚠ स्वीकृत सीमा {NPR(loan.total_loan_limit)} ({toLakhCrore(loan.total_loan_limit)}) —
              आंशिक वितरण भए ठीक छ
            </p>
          )}
        </div>

        {/* Date */}
        <div>
          <label className={lbl}>वितरण मिति *</label>
          <input type="date" required className={inp}
            value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        {/* Reference */}
        <div>
          <label className={lbl}>सन्दर्भ / भौचर नं.</label>
          <input className={inp} placeholder="उदाहरण: LN-2024-001"
            value={reference} onChange={(e) => setReference(e.target.value)} />
        </div>

        {/* Notes */}
        <div>
          <label className={lbl}>कैफियत</label>
          <input className={inp} placeholder="वैकल्पिक टिप्पणी"
            value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 text-sm font-bold text-gray-600 rounded-xl hover:bg-gray-50 transition-colors">
            रद्द गर्नुहोस्
          </button>
          <button type="submit" disabled={busy}
            className="flex-1 py-2.5 bg-green-600 text-white text-sm font-black rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors">
            {busy ? 'सेभ हुँदैछ…' : disbursement ? '✓ परिवर्तन सुरक्षित' : '✓ वितरण दर्ता गर्नुहोस्'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
