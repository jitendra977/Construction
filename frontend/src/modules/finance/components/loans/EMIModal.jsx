/**
 * EMIModal — pay one EMI instalment for a loan account.
 *
 * Key design: `interest` is ALWAYS derived as (total_emi - principal).
 * This guarantees principal_amount + interest_amount === total_emi on submit,
 * preventing the backend validation error.
 */
import { useState, useMemo } from 'react';
import Modal from '../shared/Modal';
import financeApi from '../../services/financeApi';
import { useFinance } from '../../context/FinanceContext';

const NPR = (n) =>
  `NPR ${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const toLakhCrore = (n) => {
  const num = parseFloat(n) || 0;
  if (num <= 0) return '';
  if (num >= 10_000_000) return `${(num / 10_000_000).toFixed(2)} करोड`;
  if (num >= 100_000)    return `${(num / 100_000).toFixed(2)} लाख`;
  if (num >= 1_000)      return `${(num / 1_000).toFixed(1)} हजार`;
  return `${num}`;
};

const inp = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 bg-white';
const lbl = 'block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1';

// ── Calculate suggested split from loan metadata ────────────────────────────
function calcSplit(loan, totalEmi) {
  const outstanding  = Math.abs(Number(loan.balance || 0));
  const annualRate   = Number(loan.interest_rate || 0);
  const monthlyRate  = annualRate / 100 / 12;
  const interestPart = outstanding > 0 && monthlyRate > 0
    ? parseFloat((outstanding * monthlyRate).toFixed(2))
    : 0;
  const principalPart = Math.max(0, parseFloat((totalEmi - interestPart).toFixed(2)));
  return { principal: principalPart, interest: interestPart };
}

export default function EMIModal({ loan, emi = null, onClose }) {
  const { banks, refresh } = useFinance();

  const defaultEmi = emi ? Number(emi.total_emi) : Number(loan.emi_amount || 0);

  // Pre-calculate split so the form opens ready-to-submit
  const defaultSplit = useMemo(() => {
    if (emi) {
      return { principal: Number(emi.principal_amount), interest: Number(emi.interest_amount) };
    }
    return calcSplit(loan, defaultEmi);
  }, [loan, defaultEmi, emi]);

  const [bankId,      setBankId]      = useState(emi?.bank_account || '');
  const [totalEmi,    setTotalEmi]    = useState(defaultEmi.toFixed(2));
  const [principal,   setPrincipal]   = useState(defaultSplit.principal.toFixed(2));
  const [description, setDescription] = useState(emi?.description || '');
  const [reference,   setReference]   = useState(emi?.reference || '');
  const [date,        setDate]        = useState(emi?.date || new Date().toISOString().slice(0, 10));
  const [busy,        setBusy]        = useState(false);
  const [err,         setErr]         = useState('');

  // Interest is ALWAYS computed — never independently stored
  const interest = Math.max(0, parseFloat(totalEmi || 0) - parseFloat(principal || 0));
  const isBalanced = Math.abs(parseFloat(totalEmi || 0) - parseFloat(principal || 0) - interest) < 0.005;

  // When total EMI changes, recompute split
  const handleTotalChange = (val) => {
    setTotalEmi(val);
    const total = parseFloat(val) || 0;
    const split = calcSplit(loan, total);
    setPrincipal(split.principal.toFixed(2));
  };

  // Auto-split button — recalculate from current total
  const autoSplit = () => {
    const total = parseFloat(totalEmi) || defaultEmi;
    setTotalEmi(total.toFixed(2));
    const split = calcSplit(loan, total);
    setPrincipal(split.principal.toFixed(2));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!bankId) { setErr('Select a bank account to pay from.'); return; }

    const total  = parseFloat(totalEmi);
    const prin   = parseFloat(principal);
    const intAmt = parseFloat(interest.toFixed(2));

    if (isNaN(total) || total <= 0) { setErr('Enter a valid EMI amount.'); return; }
    if (isNaN(prin)  || prin < 0)   { setErr('Principal cannot be negative.'); return; }

    setBusy(true); setErr('');
    try {
      const payload = {
        bank_account:     bankId,
        total_emi:        total.toFixed(2),
        principal_amount: prin.toFixed(2),
        interest_amount:  intAmt.toFixed(2),
        description:      description || `EMI payment — ${loan.name}`,
        reference,
        date,
      };
      if (emi) {
        await financeApi.updateEMIPayment(emi.id, payload);
      } else {
        await financeApi.payEMI(loan.id, payload);
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

  const outstanding = Math.abs(Number(loan.balance || 0));

  return (
    <Modal isOpen onClose={onClose} title={emi ? "Edit EMI Payment" : "Pay EMI"} maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="p-6 space-y-4">

        {/* Loan info */}
        <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-2xl">
          <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">ऋण</p>
          <p className="font-black text-sm text-blue-900 mt-0.5">{loan.name}</p>
          <div className="flex gap-4 mt-2">
            <div>
              <p className="text-[9px] text-blue-400 font-bold uppercase">बाँकी ऋण</p>
              <p className="text-sm font-black text-blue-700">{NPR(outstanding)}</p>
            </div>
            {loan.interest_rate && (
              <div>
                <p className="text-[9px] text-blue-400 font-bold uppercase">ब्याज दर</p>
                <p className="text-sm font-black text-blue-700">{loan.interest_rate}% प्रति वर्ष</p>
              </div>
            )}
            {loan.emi_amount && (
              <div>
                <p className="text-[9px] text-blue-400 font-bold uppercase">EMI</p>
                <p className="text-sm font-black text-blue-700">{NPR(loan.emi_amount)}</p>
              </div>
            )}
          </div>
        </div>

        {err && (
          <p className="text-xs text-red-600 font-semibold bg-red-50 border border-red-200 p-3 rounded-xl">{err}</p>
        )}

        {/* Bank account */}
        <div>
          <label className={lbl}>जुन बैंकबाट भुक्तानी गर्ने *</label>
          <select className={inp} value={bankId} onChange={(e) => setBankId(e.target.value)} required>
            <option value="">— बैंक छान्नुहोस् —</option>
            {banks.map((b) => (
              <option key={b.id} value={b.id}>
                {b.bank_name ? `${b.bank_name} · ` : ''}{b.name} ({NPR(b.balance)})
              </option>
            ))}
          </select>
        </div>

        {/* Total EMI */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className={lbl}>कुल EMI रकम (NPR)</label>
            <button type="button" onClick={autoSplit}
              className="text-[9px] font-black text-blue-500 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-lg border border-blue-200 transition-colors">
              ↻ स्वत: विभाजन
            </button>
          </div>
          <input type="number" step="0.01" min="0.01" required className={`${inp} font-semibold`}
            value={totalEmi} onChange={(e) => handleTotalChange(e.target.value)} />
          {parseFloat(totalEmi) > 0 && (
            <p className="text-[10px] font-black text-blue-600 mt-1 px-1">= {toLakhCrore(totalEmi)}</p>
          )}
        </div>

        {/* Principal + Interest — always in sync */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={lbl}>साँवा (Principal)</label>
            <input type="number" step="0.01" min="0" required className={inp}
              value={principal}
              onChange={(e) => setPrincipal(e.target.value)}
            />
            <p className="text-[9px] text-gray-400 mt-0.5">ऋण संतुलन घटाउँछ</p>
          </div>
          <div>
            <label className={lbl}>ब्याज (स्वत: गणना)</label>
            <input type="number" step="0.01" readOnly className={`${inp} bg-gray-50 text-gray-500 cursor-not-allowed`}
              value={interest.toFixed(2)} />
            <p className="text-[9px] text-gray-400 mt-0.5">= कुल − साँवा</p>
          </div>
        </div>

        {/* Split summary bar */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
          <div className="flex justify-between text-[10px] font-black mb-2">
            <span className="text-green-700">साँवा: {NPR(principal)}</span>
            <span className="text-orange-600">ब्याज: {NPR(interest)}</span>
            <span className={isBalanced ? 'text-gray-500' : 'text-red-500'}>
              कुल: {NPR(totalEmi)} {isBalanced ? '✓' : '⚠'}
            </span>
          </div>
          {parseFloat(totalEmi) > 0 && (
            <div className="flex h-2 rounded-full overflow-hidden bg-gray-200">
              <div
                className="bg-green-500 transition-all"
                style={{ width: `${Math.min(100, (parseFloat(principal) / parseFloat(totalEmi)) * 100)}%` }}
              />
              <div className="bg-orange-400 flex-1" />
            </div>
          )}
        </div>

        {/* Date */}
        <div>
          <label className={lbl}>भुक्तानी मिति *</label>
          <input type="date" required className={inp}
            value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        {/* Description */}
        <div>
          <label className={lbl}>विवरण</label>
          <input className={inp} placeholder={`EMI भुक्तानी — ${loan.name}`}
            value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        {/* Reference */}
        <div>
          <label className={lbl}>सन्दर्भ / भौचर</label>
          <input className={inp} placeholder="भौचर / रसिद नं."
            value={reference} onChange={(e) => setReference(e.target.value)} />
        </div>

        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 text-sm font-bold text-gray-600 rounded-xl hover:bg-gray-50 transition-colors">
            रद्द गर्नुहोस्
          </button>
          <button type="submit" disabled={busy}
            className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-black rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {busy ? 'सेभ हुँदैछ…' : emi ? '✓ परिवर्तन सुरक्षित' : 'EMI भुक्तानी गर्नुहोस्'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
