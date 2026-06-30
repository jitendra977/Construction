/**
 * ManualJournalForm
 * Creates a manual journal entry (double-entry bookkeeping).
 *
 * Props
 * ─────
 * accounts       — all Chart-of-Accounts accounts for this project
 * preAccount     — (optional) Account object to pre-fill in first debit line
 * preDirection   — 'DEBIT' | 'CREDIT' — which side to pre-fill (default 'DEBIT')
 * onDone         — called after successful submission
 */
import { useState, useEffect, useMemo } from 'react';
import { useFinance } from '../../context/FinanceContext';
import financeApi from '../../services/financeApi';

const today = () => new Date().toISOString().slice(0, 10);

const inp = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 bg-white';
const lbl = 'block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1';

const EMPTY_LINE = { account: '', entry_type: 'DEBIT', amount: '' };

const TYPE_BADGE = {
  ASSET:     { bg: 'rgba(59,130,246,0.1)',  color: '#3b82f6' },
  LIABILITY: { bg: 'rgba(239,68,68,0.1)',   color: '#ef4444' },
  EQUITY:    { bg: 'rgba(139,92,246,0.1)',  color: '#8b5cf6' },
  REVENUE:   { bg: 'rgba(16,185,129,0.1)',  color: '#10b981' },
  EXPENSE:   { bg: 'rgba(245,158,11,0.1)',  color: '#f59e0b' },
};

const fmt = (n) =>
  `NPR ${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export default function ManualJournalForm({ accounts = [], preAccount = null, preDirection = 'DEBIT', onDone }) {
  const { projectId } = useFinance();

  const [date,        setDate]        = useState(today());
  const [description, setDescription] = useState('');
  const [lines,       setLines]       = useState([
    { ...EMPTY_LINE, entry_type: preDirection,              account: preAccount?.id?.toString() || '' },
    { ...EMPTY_LINE, entry_type: preDirection === 'DEBIT' ? 'CREDIT' : 'DEBIT', account: '' },
  ]);
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState('');

  // Re-init if preAccount changes
  useEffect(() => {
    if (preAccount) {
      setLines([
        { ...EMPTY_LINE, entry_type: preDirection,              account: preAccount.id.toString() },
        { ...EMPTY_LINE, entry_type: preDirection === 'DEBIT' ? 'CREDIT' : 'DEBIT', account: '' },
      ]);
    }
  }, [preAccount?.id]);

  // ── Line helpers ─────────────────────────────────────────────────────────────
  const setLine = (i, field, val) =>
    setLines((prev) => prev.map((l, idx) => idx === i ? { ...l, [field]: val } : l));

  const addLine = () => setLines((prev) => [...prev, { ...EMPTY_LINE }]);

  const removeLine = (i) => {
    if (lines.length <= 2) return; // minimum 2 lines
    setLines((prev) => prev.filter((_, idx) => idx !== i));
  };

  // ── Balance check ─────────────────────────────────────────────────────────────
  const { totalDebit, totalCredit, balanced } = useMemo(() => {
    let d = 0, c = 0;
    lines.forEach((l) => {
      const amt = parseFloat(l.amount) || 0;
      if (l.entry_type === 'DEBIT')  d += amt;
      if (l.entry_type === 'CREDIT') c += amt;
    });
    return { totalDebit: d, totalCredit: c, balanced: Math.abs(d - c) < 0.01 };
  }, [lines]);

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr('');

    if (!balanced) { setErr('Debits and credits must be equal.'); return; }
    if (lines.some((l) => !l.account || !l.amount)) { setErr('Every line needs an account and amount.'); return; }

    setBusy(true);
    try {
      await financeApi.createJournalEntry({
        project: projectId,
        date,
        description: description || 'Manual Adjustment',
        source_type: 'MANUAL',
        lines: lines.map((l) => ({
          account: l.account,
          entry_type: l.entry_type,
          amount: parseFloat(l.amount),
        })),
      });
      onDone?.();
    } catch (ex) {
      setErr(ex?.response?.data?.error || ex?.response?.data?.detail || JSON.stringify(ex?.response?.data) || ex.message);
    } finally {
      setBusy(false);
    }
  };

  // ── Account option label ─────────────────────────────────────────────────────
  const accountById = useMemo(() => {
    const m = {};
    accounts.forEach((a) => { m[a.id] = a; });
    return m;
  }, [accounts]);

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-5">
      {err && (
        <p className="text-xs text-red-600 font-semibold bg-red-50 border border-red-200 p-3 rounded-xl">{err}</p>
      )}

      {/* Date + Description */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lbl}>मिति *</label>
          <input type="date" className={inp} required value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label className={lbl}>विवरण</label>
          <input className={inp} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="उदाहरण: शुरूआती इक्विटी बाकी" />
        </div>
      </div>

      {/* Lines */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className={lbl}>जर्नल लाइनहरू</label>
          <div className="flex items-center gap-3 text-[10px] font-bold">
            <span className={`${balanced ? 'text-green-600' : 'text-red-500'} flex items-center gap-1`}>
              {balanced ? '✓ सन्तुलित' : `फरक: ${fmt(Math.abs(totalDebit - totalCredit))}`}
            </span>
          </div>
        </div>

        {/* Header */}
        <div className="grid grid-cols-[1fr_100px_120px_28px] gap-2 mb-1.5 px-1">
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">खाता</span>
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Dr / Cr</span>
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">रकम (NPR)</span>
          <span />
        </div>

        <div className="space-y-2">
          {lines.map((line, i) => {
            const acct = accountById[line.account];
            const typeCfg = acct ? (TYPE_BADGE[acct.account_type] || {}) : {};
            return (
              <div key={i} className="grid grid-cols-[1fr_100px_120px_28px] gap-2 items-center">
                {/* Account select */}
                <div className="relative">
                  <select
                    className={`${inp} ${acct ? 'pl-3' : ''}`}
                    value={line.account}
                    onChange={(e) => setLine(i, 'account', e.target.value)}
                    required
                  >
                    <option value="">— खाता छान्नुहोस् —</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.code} · {a.name} ({a.account_type})
                      </option>
                    ))}
                  </select>
                  {acct && (
                    <span
                      className="absolute right-7 top-1/2 -translate-y-1/2 text-[8px] font-black px-1.5 py-0.5 rounded pointer-events-none"
                      style={{ background: typeCfg.bg, color: typeCfg.color }}
                    >
                      {acct.account_type}
                    </span>
                  )}
                </div>

                {/* Dr/Cr toggle */}
                <div className="flex rounded-xl overflow-hidden border border-gray-200">
                  {['DEBIT', 'CREDIT'].map((t) => (
                    <button
                      type="button"
                      key={t}
                      onClick={() => setLine(i, 'entry_type', t)}
                      className="flex-1 py-2 text-[9px] font-black transition-colors"
                      style={{
                        background: line.entry_type === t
                          ? (t === 'DEBIT' ? '#10b981' : '#ef4444')
                          : '#f9fafb',
                        color: line.entry_type === t ? 'white' : '#9ca3af',
                      }}
                    >
                      {t === 'DEBIT' ? 'Dr' : 'Cr'}
                    </button>
                  ))}
                </div>

                {/* Amount */}
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  className={inp}
                  value={line.amount}
                  onChange={(e) => setLine(i, 'amount', e.target.value)}
                  required
                />

                {/* Remove */}
                <button
                  type="button"
                  onClick={() => removeLine(i)}
                  disabled={lines.length <= 2}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={addLine}
          className="mt-2 text-[10px] font-black text-blue-600 hover:text-blue-800 transition-colors"
        >
          + लाइन थप्नुहोस्
        </button>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
        <div>
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">कुल डेबिट (Dr)</p>
          <p className="text-sm font-black text-green-700">{fmt(totalDebit)}</p>
        </div>
        <div>
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">कुल क्रेडिट (Cr)</p>
          <p className="text-sm font-black text-red-600">{fmt(totalCredit)}</p>
        </div>
      </div>

      {/* Tip */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
        <p className="text-[10px] text-blue-700 font-semibold leading-relaxed">
          <span className="font-black">सुझाव:</span> Equity/Revenue/Liability बढाउन → <span className="font-black">Credit (Cr)</span> गर्नुहोस्। 
          घटाउन → <span className="font-black">Debit (Dr)</span>। 
          Asset/Expense को लागि उल्टो हुन्छ।
        </p>
      </div>

      <button
        type="submit"
        disabled={busy || !balanced}
        className="w-full py-2.5 bg-black text-white text-sm font-black rounded-xl hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {busy ? 'पोस्ट हुँदैछ…' : '✓ जर्नल प्रविष्टि पोस्ट गर्नुहोस्'}
      </button>
    </form>
  );
}
