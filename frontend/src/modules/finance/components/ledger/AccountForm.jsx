/**
 * AccountForm — create/edit any account type with visual type picker.
 */
import { useState, useEffect } from 'react';
import financeApi from '../../services/financeApi';
import { useFinance } from '../../context/FinanceContext';

const inp = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 bg-white';
const lbl = 'block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1';

const TYPE_OPTIONS = [
  { value: 'ASSET',     label: 'सम्पत्ति',  labelEn: 'Asset',     icon: '🏦', color: '#2563eb', border: '#bfdbfe', bg: 'rgba(37,99,235,0.07)' },
  { value: 'LIABILITY', label: 'दायित्व',   labelEn: 'Liability', icon: '📋', color: '#dc2626', border: '#fecaca', bg: 'rgba(220,38,38,0.07)' },
  { value: 'EQUITY',    label: 'इक्विटी',   labelEn: 'Equity',    icon: '📊', color: '#7c3aed', border: '#ddd6fe', bg: 'rgba(124,58,237,0.07)' },
  { value: 'REVENUE',   label: 'आम्दानी',   labelEn: 'Revenue',   icon: '💰', color: '#059669', border: '#a7f3d0', bg: 'rgba(5,150,105,0.07)' },
  { value: 'EXPENSE',   label: 'खर्च',      labelEn: 'Expense',   icon: '💸', color: '#d97706', border: '#fde68a', bg: 'rgba(217,119,6,0.07)' },
];

const EMPTY = {
  code: '', name: '', account_type: 'EXPENSE',
  is_bank: false, is_loan: false,
  bank_name: '', account_number: '', account_holder_name: '',
  interest_rate: '', loan_tenure_months: '', emi_amount: '', total_loan_limit: '',
};

export default function AccountForm({ account = null, defaultType = null, onDone }) {
  const { projectId, refresh } = useFinance();
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState('');

  useEffect(() => {
    setForm(account
      ? { ...EMPTY, ...account }
      : {
          ...EMPTY,
          code: String(Math.floor(4000 + Math.random() * 5000)),
          ...(defaultType ? { account_type: defaultType } : {}),
        }
    );
  }, [account, defaultType]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      if (account) {
        await financeApi.updateAccount(account.id, form);
      } else {
        await financeApi.createAccount({ ...form, project: projectId });
      }
      await refresh();
      onDone();
    } catch (ex) {
      setErr(ex?.response?.data?.detail || JSON.stringify(ex?.response?.data) || ex.message);
    } finally {
      setBusy(false);
    }
  };

  const selectedType = TYPE_OPTIONS.find(t => t.value === form.account_type) || TYPE_OPTIONS[4];

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
      {err && <p className="text-xs text-red-600 font-semibold bg-red-50 border border-red-200 p-3 rounded-xl">{err}</p>}

      {/* Visual type picker */}
      <div>
        <label className={lbl}>खाताको किसिम *</label>
        <div className="grid grid-cols-5 gap-1.5 mt-1">
          {TYPE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => set('account_type', opt.value)}
              className="flex flex-col items-center gap-1 p-2 rounded-xl border transition-all text-center"
              style={form.account_type === opt.value
                ? { background: opt.bg, borderColor: opt.border, boxShadow: `0 0 0 2px ${opt.color}30` }
                : { background: 'white', borderColor: '#e5e7eb' }
              }
            >
              <span className="text-lg">{opt.icon}</span>
              <span className="text-[8px] font-black" style={{ color: opt.color }}>{opt.label}</span>
              <span className="text-[7px] text-gray-400">{opt.labelEn}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Code + Name */}
      <div className="grid grid-cols-[120px_1fr] gap-3">
        <div>
          <label className={lbl}>खाता कोड *</label>
          <input className={inp} required value={form.code}
            onChange={(e) => set('code', e.target.value)}
            placeholder="4001" />
        </div>
        <div>
          <label className={lbl}>खाताको नाम *</label>
          <input className={inp} required value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder={
              form.account_type === 'ASSET'     ? 'उदाहरण: नगद खाता' :
              form.account_type === 'LIABILITY'  ? 'उदाहरण: देय खाता' :
              form.account_type === 'REVENUE'    ? 'उदाहरण: ठेक्का आम्दानी' :
              form.account_type === 'EXPENSE'    ? 'उदाहरण: सामग्री खर्च' :
              'उदाहरण: मालिकको इक्विटी'
            }
          />
        </div>
      </div>

      {/* Special account flags */}
      <div
        className="p-3 rounded-xl border flex gap-4"
        style={{ background: selectedType.bg, borderColor: selectedType.border }}
      >
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.is_bank}
            onChange={(e) => set('is_bank', e.target.checked)}
            className="w-4 h-4 accent-blue-600" />
          <span className="text-xs font-bold text-gray-700">🏦 बैंक / नगद खाता</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.is_loan}
            onChange={(e) => set('is_loan', e.target.checked)}
            className="w-4 h-4 accent-amber-600" />
          <span className="text-xs font-bold text-gray-700">💳 ऋण खाता</span>
        </label>
      </div>

      <button type="submit" disabled={busy}
        className="w-full py-2.5 bg-black text-white text-sm font-black rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-colors">
        {busy ? 'सेभ हुँदैछ…' : account ? '✓ खाता अपडेट गर्नुहोस्' : '+ खाता सिर्जना गर्नुहोस्'}
      </button>
    </form>
  );
}
