/**
 * ContractorPage — Milestone-based contractor payment tracker.
 * Redesigned: timeline view, sorted by payment date, clean card layout.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Modal } from '../../../shared/ui';
import ConfirmModal from '../../../components/common/ConfirmModal';
import { useFinance } from '../context/FinanceContext';
import {
  getContractorContracts,
  createContractorContract,
  updateContractorContract,
  deleteContractorContract,
  createInstallment,
  updateInstallment,
  deleteInstallment,
  addInstallmentPayment,
  resetInstallment,
  deleteInstallmentPayment,
  getAccounts,
} from '../services/financeApi';

// ── PDF Template ──────────────────────────────────────────────────────────────
const PDF_TEMPLATE = [
  { order: 1,  milestone: 'Advance Payment',                         pct: 14.49 },
  { order: 2,  milestone: 'Foundation Work Complete',                 pct: 9.66  },
  { order: 3,  milestone: 'Column & Beam (Plinth to 1st Floor)',      pct: 9.66  },
  { order: 4,  milestone: 'Column & Beam (1st to 2nd Floor)',         pct: 9.66  },
  { order: 5,  milestone: 'Column & Beam (2nd to 3rd Floor)',         pct: 9.66  },
  { order: 6,  milestone: 'Brick / Block Work Complete',              pct: 9.66  },
  { order: 7,  milestone: 'Plastering Work Complete',                 pct: 9.66  },
  { order: 8,  milestone: 'Flooring & Tiling Complete',               pct: 9.66  },
  { order: 9,  milestone: 'Electrical & Plumbing Complete',           pct: 9.66  },
  { order: 10, milestone: 'Final Handover & Completion Certificate',  pct: 8.13  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt  = (n) => Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
const fmtD = (d) => {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};
const fmtShort = (d) => {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

/**
 * Normalizes backend URLs to ensure they use the current host if they are local.
 * This fixes "Connection Refused" errors when the backend returns a specific IP
 * that is no longer valid or accessible from the current machine.
 */
const normalizeUrl = (url) => {
  if (!url) return '';
  if (typeof url !== 'string') return url;
  if (url.startsWith('http')) {
    try {
      const u = new URL(url);
      // If the URL points to the backend port (8000), swap the hostname to match our current window
      // This ensures that if we are on localhost, we hit localhost:8000 instead of an old IP.
      if (u.port === '8000' || u.pathname.startsWith('/media/')) {
        return `${window.location.protocol}//${window.location.hostname}:8000${u.pathname}${u.search}`;
      }
    } catch (e) {
      return url;
    }
  }
  return url;
};

// Sort installments: paid (by last_paid_date desc) → partial → pending/overdue (by due_date asc, then order)
const sortInstallments = (list) => {
  const weight = { PAID: 0, PARTIAL: 1, OVERDUE: 2, PENDING: 3 };
  return [...list].sort((a, b) => {
    const wa = weight[a.status] ?? 3;
    const wb = weight[b.status] ?? 3;
    if (wa !== wb) return wa - wb;
    // Same status group — sort by date
    if (a.status === 'PAID' || a.status === 'PARTIAL') {
      const da = a.last_paid_date || '';
      const db = b.last_paid_date || '';
      return da > db ? -1 : da < db ? 1 : 0; // newest first
    }
    // PENDING / OVERDUE — sort by due_date asc, then order
    const da = a.due_date || '9999';
    const db = b.due_date || '9999';
    return da < db ? -1 : da > db ? 1 : a.order - b.order;
  });
};

const STATUS_STYLE = {
  PENDING: {
    dot:    'bg-gray-300 border-gray-300',
    line:   'bg-gray-200',
    badge:  'bg-gray-100 text-gray-500',
    ring:   'border-gray-200',
    label:  'Pending',
    text:   'text-gray-400',
  },
  PARTIAL: {
    dot:    'bg-amber-400 border-amber-400',
    line:   'bg-amber-200',
    badge:  'bg-amber-50 text-amber-700',
    ring:   'border-amber-300',
    label:  'Partial',
    text:   'text-amber-600',
  },
  PAID: {
    dot:    'bg-green-500 border-green-500',
    line:   'bg-green-300',
    badge:  'bg-green-50 text-green-700',
    ring:   'border-green-300',
    label:  'Paid',
    text:   'text-green-600',
  },
  OVERDUE: {
    dot:    'bg-red-400 border-red-400',
    line:   'bg-red-200',
    badge:  'bg-red-50 text-red-600',
    ring:   'border-red-300',
    label:  'Overdue',
    text:   'text-red-500',
  },
};

const CONTRACT_STATUS = {
  ACTIVE:    { label: 'Active',    cls: 'bg-blue-100 text-blue-700'   },
  COMPLETED: { label: 'Completed', cls: 'bg-green-100 text-green-700' },
  CANCELLED: { label: 'Cancelled', cls: 'bg-red-100 text-red-600'     },
  ON_HOLD:   { label: 'On Hold',   cls: 'bg-yellow-100 text-yellow-700' },
};

const inp = 'w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/10 bg-white';

// ── DocPreviewModal ─────────────────────────────────────────────────────────
function DocPreviewModal({ url, title, onClose }) {
  const finalUrl = normalizeUrl(url);
  if (!finalUrl) return null;

  const isImage = finalUrl.match(/\.(jpg|jpeg|png|gif|webp)/i);
  const isPdf   = finalUrl.match(/\.pdf/i);

  return (
    <Modal isOpen={!!finalUrl} onClose={onClose} title={title} maxWidth="max-w-4xl" noPadding>
      <div className="flex flex-col h-[85vh]">
        {/* Toolbar */}
        <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between">
          <span className="text-[10px] font-bold text-gray-400 uppercase truncate pr-4">{title}</span>
          <div className="flex items-center gap-2">
            <a href={finalUrl} download target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-[10px] font-bold hover:bg-gray-200 transition-colors">
              <span>⬇</span> Download
            </a>
            <button onClick={onClose}
              className="w-7 h-7 flex items-center justify-center text-gray-300 hover:text-gray-500 text-xl">✕</button>
          </div>
        </div>

        {/* Content */}
        <div className="bg-gray-100 flex-1 flex items-center justify-center overflow-hidden">
          {isImage ? (
            <img src={finalUrl} alt="Document" className="max-w-full max-h-full object-contain shadow-lg" />
          ) : isPdf ? (
            <div className="w-full h-full flex flex-col">
              <object data={finalUrl} type="application/pdf" className="w-full h-full flex-1">
                <iframe src={finalUrl} title="PDF Preview" className="w-full h-full border-0 bg-white">
                  <p className="p-10 text-center text-xs text-gray-400">
                    Your browser does not support PDF previews. Please use the Download button.
                  </p>
                </iframe>
              </object>
            </div>
          ) : (
            <div className="p-10 text-center">
              <div className="text-5xl mb-4">📄</div>
              <p className="text-sm font-bold text-gray-500 mb-4">Preview not available for this file type.</p>
              <a href={finalUrl} download target="_blank" rel="noreferrer"
                className="inline-block px-6 py-2.5 bg-black text-white rounded-xl text-xs font-black">
                Download File
              </a>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PaymentModal
// ─────────────────────────────────────────────────────────────────────────────
function PaymentModal({ inst, bankAccounts, onClose, onSaved }) {
  const [form, setForm] = useState({
    bank_account: bankAccounts[0]?.id || '',
    amount:       Number(inst.remaining || 0) > 0 ? Number(inst.remaining).toFixed(2) : '',
    date:         new Date().toISOString().slice(0, 10),
    reference:    '',
    notes:        '',
    proof:        null,
  });
  const [paying, setPaying] = useState(false);
  const [error,  setError]  = useState('');

  const submit = async () => {
    if (!form.bank_account)                          { setError('Select a bank account.'); return; }
    if (!form.amount || Number(form.amount) <= 0)   { setError('Enter a valid amount.'); return; }
    if (!form.date)                                  { setError('Select a date.'); return; }
    setPaying(true); setError('');
    try {
      await addInstallmentPayment(inst.id, {
        bank_account: form.bank_account,
        amount:       form.amount,
        date:         form.date,
        reference:    form.reference,
        notes:        form.notes,
        proof:        form.proof,
      });
      onSaved();
    } catch (e) {
      setError(e?.response?.data?.detail || JSON.stringify(e?.response?.data || 'Payment failed.'));
    } finally { setPaying(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Record Payment</p>
              <p className="text-sm font-black text-gray-900 mt-0.5 leading-snug">{inst.milestone}</p>
            </div>
            <button onClick={onClose} className="text-gray-300 hover:text-gray-500 text-xl leading-none mt-0.5">✕</button>
          </div>
          {/* Remaining strip */}
          <div className="mt-3 flex items-center justify-between px-3 py-2 bg-amber-50 rounded-xl">
            <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Remaining</span>
            <span className="text-sm font-black text-amber-800">NPR {fmt(inst.remaining)}</span>
          </div>
        </div>

        <div className="px-5 py-4 space-y-3">
          {/* Amount */}
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Amount (NPR) *</label>
            <input type="number" value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              className={inp + ' text-base font-black'} />
            <p className="text-[9px] text-gray-400 mt-1">Partial amounts OK — milestone shows Partial until fully paid.</p>
          </div>
          {/* Bank */}
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Bank Account *</label>
            <select value={form.bank_account} onChange={e => setForm(f => ({ ...f, bank_account: e.target.value }))} className={inp}>
              <option value="">Select…</option>
              {bankAccounts.map(a => <option key={a.id} value={a.id}>{a.name} — NPR {fmt(a.balance)}</option>)}
            </select>
          </div>
          {/* Date + Reference */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Date *</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className={inp} />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Reference</label>
              <input value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))}
                placeholder="CHQ-001…" className={inp} />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Notes</label>
            <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="e.g. 1st tranche of advance" className={inp} />
          </div>
          {/* Proof Upload */}
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Payment Proof (Optional)</label>
            <div className="relative">
              <input type="file" onChange={e => setForm(f => ({ ...f, proof: e.target.files[0] }))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
              <div className={inp + ' flex items-center justify-between'}>
                <span className="text-gray-400 truncate">
                  {form.proof ? form.proof.name : 'Upload receipt / proof…'}
                </span>
                <span className="text-xs">📎</span>
              </div>
            </div>
          </div>

          {error && <p className="text-xs text-red-600 font-semibold bg-red-50 px-3 py-2 rounded-xl">{error}</p>}
        </div>

        <div className="px-5 pb-5 flex gap-2">
          <button onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={submit} disabled={paying}
            className="flex-1 py-2.5 bg-black text-white rounded-xl text-xs font-black hover:bg-gray-800 transition-colors disabled:opacity-50">
            {paying ? 'Recording…' : 'Record Payment'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MilestoneTimeline — timeline of sorted installments
// ─────────────────────────────────────────────────────────────────────────────
function MilestoneTimeline({ installments, bankAccounts, contractId, onRefresh, showConfirm, setPreviewDoc }) {
  const [payingInst,  setPayingInst]  = useState(null);  // inst to pay
  const [editingInst, setEditingInst] = useState(null);  // inst id being edited
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [addingNew,   setAddingNew]   = useState(false);
  const [editForm,    setEditForm]    = useState({});
  const [editSaving,  setEditSaving]  = useState(false);
  const [editError,   setEditError]   = useState('');

  const sorted = useMemo(() => sortInstallments(installments || []), [installments]);
  const nextOrder = (installments?.length || 0) + 1;

  const toggleExpand = (id) => setExpandedIds(prev => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  const startEdit = (inst) => {
    setEditForm({ milestone: inst.milestone, amount: inst.amount, due_date: inst.due_date || '', notes: inst.notes || '' });
    setEditingInst(inst.id);
    setEditError('');
  };

  const saveEdit = async (instId) => {
    if (!editForm.milestone.trim())                             { setEditError('Name required.'); return; }
    if (!editForm.amount || Number(editForm.amount) <= 0)      { setEditError('Amount must be > 0.'); return; }
    setEditSaving(true); setEditError('');
    try {
      await updateInstallment(instId, {
        milestone: editForm.milestone.trim(),
        amount:    editForm.amount,
        due_date:  editForm.due_date || null,
        notes:     editForm.notes.trim(),
      });
      setEditingInst(null);
      onRefresh();
    } catch (e) {
      setEditError(e?.response?.data ? JSON.stringify(e.response.data) : 'Save failed.');
    } finally { setEditSaving(false); }
  };

  const handleDelInst = async (inst) => {
    showConfirm(
      'Delete Milestone',
      `Are you sure you want to delete "${inst.milestone}"? All associated payments will also be removed. This cannot be undone.`,
      async () => {
        try { await deleteInstallment(inst.id); onRefresh(); }
        catch { alert('Could not delete milestone.'); }
      },
      'danger'
    );
  };

  const handleDelPayment = async (pid) => {
    showConfirm(
      'Delete Payment',
      'Are you sure you want to delete this payment tranche? The associated journal entry will also be removed.',
      async () => {
        try { await deleteInstallmentPayment(pid); onRefresh(); }
        catch { alert('Could not delete payment.'); }
      },
      'danger'
    );
  };

  const handleReset = async (inst) => {
    showConfirm(
      'Reset Milestone',
      `Reset all payments for "${inst.milestone}"? This will delete all recorded payments and associated journal entries.`,
      async () => {
        try { await resetInstallment(inst.id); onRefresh(); }
        catch { alert('Reset failed.'); }
      },
      'warning'
    );
  };

  return (
    <div className="px-4 pb-4 pt-2">
      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[19px] top-0 bottom-0 w-px bg-gray-100" />

        <div className="space-y-1">
          {sorted.map((inst, idx) => {
            const st       = STATUS_STYLE[inst.status] || STATUS_STYLE.PENDING;
            const isEditing = editingInst === inst.id;
            const isExpanded = expandedIds.has(inst.id);
            const totalPaid  = Number(inst.total_paid || 0);
            const amount     = Number(inst.amount || 0);
            const pct        = amount > 0 ? Math.min(100, (totalPaid / amount) * 100) : 0;
            const isLast     = idx === sorted.length - 1;

            return (
              <div key={inst.id} className="relative pl-10">
                {/* Timeline dot */}
                <div className={`absolute left-[13px] top-[14px] w-3 h-3 rounded-full border-2 z-10 ${
                  inst.status === 'PAID'    ? 'bg-green-500 border-green-500' :
                  inst.status === 'PARTIAL' ? 'bg-amber-400 border-amber-400' :
                  inst.status === 'OVERDUE' ? 'bg-red-400 border-red-400' :
                  'bg-white border-gray-300'
                }`} />

                {/* Milestone card */}
                {isEditing ? (
                  /* ── Edit mode ── */
                  <div className="mb-2 bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-2">
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-wider">Editing Milestone #{inst.order}</p>
                    <input value={editForm.milestone} onChange={e => setEditForm(f => ({ ...f, milestone: e.target.value }))}
                      placeholder="Milestone name *" className={inp} />
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] font-bold text-gray-400 uppercase block mb-0.5">Amount (NPR) *</label>
                        <input type="number" value={editForm.amount}
                          onChange={e => setEditForm(f => ({ ...f, amount: e.target.value }))} className={inp + ' font-bold'} />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-gray-400 uppercase block mb-0.5">Due Date</label>
                        <input type="date" value={editForm.due_date}
                          onChange={e => setEditForm(f => ({ ...f, due_date: e.target.value }))} className={inp} />
                      </div>
                    </div>
                    <input value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                      placeholder="Notes" className={inp} />
                    {editError && <p className="text-[10px] text-red-600 font-semibold">{editError}</p>}
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => setEditingInst(null)}
                        className="flex-1 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-500 hover:bg-white">Cancel</button>
                      <button onClick={() => saveEdit(inst.id)} disabled={editSaving}
                        className="flex-1 py-2 bg-black text-white rounded-xl text-xs font-black disabled:opacity-50">
                        {editSaving ? 'Saving…' : 'Save'}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ── Normal card ── */
                  <div className={`mb-2 bg-white rounded-2xl border transition-all ${
                    inst.status === 'PAID'    ? 'border-green-100' :
                    inst.status === 'PARTIAL' ? 'border-amber-100' :
                    inst.status === 'OVERDUE' ? 'border-red-100' :
                    'border-gray-100'
                  }`}>
                    {/* Top row */}
                    <div className="px-4 py-3">
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          {/* Milestone name + badge */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-xs font-black text-gray-800">{inst.milestone}</p>
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${st.badge}`}>
                              {st.label}
                            </span>
                          </div>

                          {/* Date line */}
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {inst.last_paid_date && (
                              <span className="flex items-center gap-1 text-[10px] text-gray-500">
                                <span className="text-green-500">●</span>
                                Paid {fmtD(inst.last_paid_date)}
                              </span>
                            )}
                            {inst.due_date && inst.status !== 'PAID' && (
                              <span className={`flex items-center gap-1 text-[10px] ${
                                inst.status === 'OVERDUE' ? 'text-red-500 font-bold' : 'text-gray-400'
                              }`}>
                                <span>🗓</span>
                                Due {fmtD(inst.due_date)}
                              </span>
                            )}
                            {!inst.last_paid_date && !inst.due_date && (
                              <span className="text-[10px] text-gray-300">No date set</span>
                            )}
                          </div>

                          {/* Amount progress */}
                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all ${
                                pct >= 100 ? 'bg-green-500' : pct > 0 ? 'bg-amber-400' : 'bg-gray-200'
                              }`} style={{ width: `${pct}%` }} />
                            </div>
                            <span className={`text-[10px] whitespace-nowrap font-semibold ${st.text}`}>
                              {pct >= 100
                                ? `NPR ${fmt(amount)}`
                                : `${fmt(totalPaid)} / ${fmt(amount)}`}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-0.5 flex-shrink-0 ml-1">
                          {inst.status !== 'PAID' && (
                            <button onClick={() => setPayingInst(inst)}
                              className="h-7 px-2.5 bg-black text-white text-[10px] font-bold rounded-lg hover:bg-gray-800 transition-colors">
                              + Pay
                            </button>
                          )}
                          {inst.payment_count > 0 && (
                            <button onClick={() => toggleExpand(inst.id)}
                              className="h-7 w-7 flex items-center justify-center bg-gray-100 text-gray-500 text-[10px] font-black rounded-lg hover:bg-gray-200 transition-colors">
                              {isExpanded ? '▲' : inst.payment_count}
                            </button>
                          )}
                          <button onClick={() => startEdit(inst)}
                            className="h-7 w-7 flex items-center justify-center text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors text-sm"
                            title="Edit">✏</button>
                          {inst.payment_count > 0 && (
                            <button onClick={() => handleReset(inst)}
                              className="h-7 w-7 flex items-center justify-center text-gray-300 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors text-sm"
                              title="Reset payments">↩</button>
                          )}
                          <button onClick={() => handleDelInst(inst)}
                            className="h-7 w-7 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors text-xs"
                            title="Delete milestone">🗑</button>
                        </div>
                      </div>
                    </div>

                    {/* Payment history */}
                    {isExpanded && inst.payments?.length > 0 && (
                      <div className="border-t border-gray-50 divide-y divide-gray-50">
                        {inst.payments.map((p, pi) => (
                          <div key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                            <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center text-[9px] font-black text-green-600 flex-shrink-0">
                              {pi + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-black text-gray-700">NPR {fmt(p.amount)}</p>
                              <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                <span className="text-[10px] text-gray-400">{fmtD(p.date)}</span>
                                {p.bank_account_name && (
                                  <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-md font-semibold">
                                    {p.bank_account_name}
                                  </span>
                                )}
                                {p.reference && (
                                  <span className="text-[10px] text-gray-400 italic">{p.reference}</span>
                                )}
                                {p.proof && (
                                  <button onClick={() => setPreviewDoc({ url: p.proof, title: `Payment Proof: ${inst.milestone}` })}
                                    className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-md font-bold hover:bg-amber-100 transition-colors">
                                    📎 Proof
                                  </button>
                                )}
                              </div>
                            </div>
                            <button onClick={() => handleDelPayment(p.id)}
                              className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors text-xs flex-shrink-0">
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Milestone */}
      {addingNew ? (
        <AddInstallmentInline
          contractId={contractId}
          nextOrder={nextOrder}
          onSaved={() => { setAddingNew(false); onRefresh(); }}
          onCancel={() => setAddingNew(false)}
        />
      ) : (
        <button onClick={() => setAddingNew(true)}
          className="w-full mt-3 py-2.5 border border-dashed border-gray-200 rounded-2xl text-xs font-bold text-gray-400 hover:border-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all flex items-center justify-center gap-1.5">
          <span className="text-base leading-none">+</span> Add Milestone
        </button>
      )}

      {/* Pay modal */}
      {payingInst && (
        <PaymentModal
          inst={payingInst}
          bankAccounts={bankAccounts}
          onClose={() => setPayingInst(null)}
          onSaved={() => { setPayingInst(null); onRefresh(); }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AddInstallmentInline
// ─────────────────────────────────────────────────────────────────────────────
function AddInstallmentInline({ contractId, nextOrder, onSaved, onCancel }) {
  const [form,   setForm]   = useState({ milestone: '', amount: '', due_date: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const save = async () => {
    if (!form.milestone.trim())                           { setError('Name required.'); return; }
    if (!form.amount || Number(form.amount) <= 0)         { setError('Amount must be > 0.'); return; }
    setSaving(true); setError('');
    try {
      await createInstallment({
        contract: contractId, order: nextOrder,
        milestone: form.milestone.trim(), amount: form.amount,
        percentage: 0, due_date: form.due_date || null, notes: form.notes.trim(),
      });
      onSaved();
    } catch (e) {
      setError(e?.response?.data ? JSON.stringify(e.response.data) : 'Failed.');
    } finally { setSaving(false); }
  };

  return (
    <div className="mt-3 ml-10 bg-blue-50/50 border border-blue-200 rounded-2xl p-4 space-y-2">
      <p className="text-[10px] font-black text-blue-600 uppercase tracking-wider">New Milestone #{nextOrder}</p>
      <input value={form.milestone} onChange={e => setForm(f => ({ ...f, milestone: e.target.value }))}
        placeholder="Milestone name *" className={inp} autoFocus />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[9px] font-bold text-gray-400 uppercase block mb-0.5">Amount (NPR) *</label>
          <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
            className={inp + ' font-bold'} />
        </div>
        <div>
          <label className="text-[9px] font-bold text-gray-400 uppercase block mb-0.5">Due Date</label>
          <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} className={inp} />
        </div>
      </div>
      {error && <p className="text-[10px] text-red-600 font-semibold">{error}</p>}
      <div className="flex gap-2 pt-1">
        <button onClick={onCancel}
          className="flex-1 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-500 hover:bg-white transition-colors">
          Cancel
        </button>
        <button onClick={save} disabled={saving}
          className="flex-1 py-2 bg-black text-white rounded-xl text-xs font-black hover:bg-gray-800 disabled:opacity-50 transition-colors">
          {saving ? 'Adding…' : 'Add Milestone'}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EditContractModal
// ─────────────────────────────────────────────────────────────────────────────
function EditContractModal({ contract, onSaved, onClose }) {
  const [form, setForm] = useState({
    contractor_name: contract.contractor_name,
    contract_number: contract.contract_number || '',
    total_amount:    contract.total_amount,
    contract_date:   contract.contract_date || '',
    start_date:      contract.start_date    || '',
    end_date:        contract.end_date      || '',
    status:          contract.status,
    notes:           contract.notes || '',
    document:        null,
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const save = async () => {
    if (!form.contractor_name.trim())                          { setError('Name required.'); return; }
    if (!form.total_amount || Number(form.total_amount) <= 0) { setError('Enter a valid amount.'); return; }
    setSaving(true); setError('');
    try {
      await updateContractorContract(contract.id, {
        contractor_name: form.contractor_name.trim(),
        contract_number: form.contract_number.trim(),
        total_amount:    form.total_amount,
        contract_date:   form.contract_date  || null,
        start_date:      form.start_date     || null,
        end_date:        form.end_date       || null,
        status:          form.status,
        notes:           form.notes.trim(),
        document:        form.document,
      });
      onSaved();
    } catch (e) {
      setError(e?.response?.data ? JSON.stringify(e.response.data) : 'Save failed.');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md my-4 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Edit Contract</p>
            <p className="text-sm font-black text-gray-900 mt-0.5">सम्झौता सम्पादन</p>
          </div>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500 text-xl">✕</button>
        </div>

        <div className="px-6 py-4 space-y-3">
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Contractor Name *</label>
            <input value={form.contractor_name} onChange={e => setForm(f => ({ ...f, contractor_name: e.target.value }))} className={inp} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Contract No.</label>
              <input value={form.contract_number} onChange={e => setForm(f => ({ ...f, contract_number: e.target.value }))}
                placeholder="CON-001" className={inp} />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Total Amount *</label>
              <input type="number" value={form.total_amount}
                onChange={e => setForm(f => ({ ...f, total_amount: e.target.value }))} className={inp + ' font-bold'} />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Contract Date</label>
              <input type="date" value={form.contract_date}
                onChange={e => setForm(f => ({ ...f, contract_date: e.target.value }))} className={inp} />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className={inp}>
                <option value="ACTIVE">Active</option>
                <option value="ON_HOLD">On Hold</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Start Date</label>
              <input type="date" value={form.start_date}
                onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} className={inp} />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">End Date</label>
              <input type="date" value={form.end_date}
                onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} className={inp} />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2} className={inp + ' resize-none'} placeholder="Additional notes…" />
          </div>
          {/* Document Upload */}
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Contract Document (Optional)</label>
            <div className="relative">
              <input type="file" onChange={e => setForm(f => ({ ...f, document: e.target.files[0] }))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
              <div className={inp + ' flex items-center justify-between'}>
                <span className="text-gray-400 truncate">
                  {form.document ? form.document.name : (contract.document ? 'Keep existing document' : 'Upload agreement…')}
                </span>
                <span className="text-xs">📄</span>
              </div>
            </div>
          </div>
          {error && <p className="text-xs text-red-600 font-semibold bg-red-50 px-3 py-2 rounded-xl">{error}</p>}
        </div>

        <div className="px-6 pb-5 flex gap-2">
          <button onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={save} disabled={saving}
            className="flex-1 py-2.5 bg-black text-white rounded-xl text-xs font-black hover:bg-gray-800 disabled:opacity-50 transition-colors">
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ContractCard
// ─────────────────────────────────────────────────────────────────────────────
function ContractCard({ contract, bankAccounts, onRefresh, onDelete, showConfirm, setPreviewDoc }) {
  const [open,     setOpen]     = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const st      = CONTRACT_STATUS[contract.status] || CONTRACT_STATUS.ACTIVE;
  const pct     = Number(contract.progress_pct || 0);
  const paid    = Number(contract.total_paid || 0);
  const pending = Number(contract.total_pending || 0);
  const total   = Number(contract.total_amount || 0);

  const handleDelete = async () => {
    showConfirm(
      'Delete Contract',
      `Are you sure you want to delete the contract with "${contract.contractor_name}"? This will permanently remove all milestones and payment records.`,
      async () => {
        setDeleting(true);
        try { await onDelete(contract.id); } finally { setDeleting(false); }
      },
      'danger'
    );
  };

  return (
    <>
      <div className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition-all ${open ? 'border-gray-200 shadow-md' : 'border-gray-100 hover:border-gray-200'}`}>
        {/* Card header */}
        <div className="p-5">
          <div className="flex items-start gap-4">
            {/* Progress ring */}
            <div className="relative w-14 h-14 flex-shrink-0">
              <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="22" fill="none" stroke="#f3f4f6" strokeWidth="5" />
                <circle cx="28" cy="28" r="22" fill="none"
                  stroke={pct >= 100 ? '#22c55e' : pct > 0 ? '#3b82f6' : '#e5e7eb'}
                  strokeWidth="5"
                  strokeDasharray={`${2 * Math.PI * 22}`}
                  strokeDashoffset={`${2 * Math.PI * 22 * (1 - pct / 100)}`}
                  strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[10px] font-black text-gray-700">{Math.round(pct)}%</span>
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-black text-gray-900 truncate">{contract.contractor_name}</h3>
                    {contract.contract_number && (
                      <span className="text-[9px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-md flex-shrink-0">
                        #{contract.contract_number}
                      </span>
                    )}
                  </div>
                  <p className="text-xl font-black text-gray-800 mt-0.5 leading-tight">
                    NPR {fmt(total)}
                  </p>
                </div>
                {/* Status + actions */}
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${st.cls}`}>{st.label}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setShowEdit(true)}
                      className="h-7 px-2 text-[10px] font-bold text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      ✏ Edit
                    </button>
                    <button onClick={handleDelete} disabled={deleting}
                      className="h-7 w-7 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors text-xs">
                      {deleting ? '…' : '🗑'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Paid / Pending chips */}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="text-[10px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                  ✓ NPR {fmt(paid)} paid
                </span>
                {pending > 0 && (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                    ⏳ NPR {fmt(pending)} pending
                  </span>
                )}
                <span className="text-[10px] text-gray-400">
                  {contract.paid_count}/{contract.total_installments} milestones
                </span>
                {contract.document && (
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setPreviewDoc({ url: contract.document, title: `Agreement: ${contract.contractor_name}` })}
                      className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 text-white rounded-full text-[10px] font-black hover:bg-blue-700 transition-all shadow-sm">
                      <span>📄</span>
                      Preview
                    </button>
                    <a href={normalizeUrl(contract.document)} download target="_blank" rel="noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-[10px] font-black hover:bg-gray-200 transition-all">
                      <span>⬇</span>
                      Download
                    </a>
                  </div>
                )}
              </div>

              {/* Dates */}
              {(contract.start_date || contract.end_date) && (
                <div className="flex items-center gap-3 mt-1.5">
                  {contract.start_date && <span className="text-[9px] text-gray-400">Start: {fmtShort(contract.start_date)}</span>}
                  {contract.end_date   && <span className="text-[9px] text-gray-400">End: {fmtShort(contract.end_date)}</span>}
                </div>
              )}
            </div>
          </div>

          {/* Expand toggle */}
          <button
            onClick={() => setOpen(o => !o)}
            className="w-full mt-4 py-2 flex items-center justify-center gap-1.5 text-[10px] font-bold text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
          >
            {open
              ? <><span>▲</span> Hide milestones</>
              : <><span>▼</span> {contract.total_installments} milestone{contract.total_installments !== 1 ? 's' : ''} — click to manage</>
            }
          </button>
        </div>

        {/* Milestones */}
        {open && (
          <div className="border-t border-gray-50">
            <MilestoneTimeline
              installments={contract.installments || []}
              bankAccounts={bankAccounts}
              contractId={contract.id}
              onRefresh={onRefresh}
              showConfirm={showConfirm}
              setPreviewDoc={setPreviewDoc}
            />
          </div>
        )}
      </div>

      {showEdit && (
        <EditContractModal
          contract={contract}
          onSaved={() => { setShowEdit(false); onRefresh(); }}
          onClose={() => setShowEdit(false)}
        />
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CreateContractForm
// ─────────────────────────────────────────────────────────────────────────────
function CreateContractForm({ projectId, onSaved, onCancel }) {
  const [usePdf, setUsePdf] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');
  const today = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState({
    contractor_name: '', contract_number: '', total_amount: '',
    contract_date: today, start_date: '', end_date: '', notes: '',
    document: null,
  });
  const [milestones, setMilestones] = useState(PDF_TEMPLATE.map(t => ({ ...t, amount: '' })));

  useEffect(() => {
    if (!usePdf) return;
    const total = parseFloat(form.total_amount);
    if (!total || isNaN(total)) { setMilestones(PDF_TEMPLATE.map(t => ({ ...t, amount: '' }))); return; }
    setMilestones(PDF_TEMPLATE.map(t => ({ ...t, amount: ((t.pct / 100) * total).toFixed(2) })));
  }, [form.total_amount, usePdf]);

  const updateMs = (i, k, v) => setMilestones(m => m.map((ms, idx) => idx === i ? { ...ms, [k]: v } : ms));
  const addMs    = () => setMilestones(m => [...m, { order: m.length + 1, milestone: '', pct: 0, amount: '' }]);
  const removeMs = (i) => setMilestones(m => m.filter((_, idx) => idx !== i).map((ms, idx) => ({ ...ms, order: idx + 1 })));

  const submit = async () => {
    if (!form.contractor_name.trim())                              { setError('Contractor name required.'); return; }
    if (!form.total_amount || Number(form.total_amount) <= 0)     { setError('Enter a valid amount.'); return; }
    if (milestones.some(m => !m.milestone.trim()))                { setError('All milestone names required.'); return; }
    if (milestones.some(m => !m.amount || Number(m.amount) <= 0)){ setError('All amounts must be > 0.'); return; }
    setSaving(true); setError('');
    try {
      const res = await createContractorContract({
        project: projectId, contractor_name: form.contractor_name.trim(),
        contract_number: form.contract_number.trim(), total_amount: form.total_amount,
        contract_date: form.contract_date || null, start_date: form.start_date || null,
        end_date: form.end_date || null, notes: form.notes.trim(), status: 'ACTIVE',
        document: form.document,
      });
      for (const ms of milestones) {
        await createInstallment({
          contract: res.data.id, order: ms.order,
          milestone: ms.milestone.trim(), amount: ms.amount, percentage: ms.pct,
        });
      }
      onSaved();
    } catch (e) {
      setError(e?.response?.data ? JSON.stringify(e.response.data) : 'Failed to save.');
    } finally { setSaving(false); }
  };

  const sum      = milestones.reduce((s, m) => s + Number(m.amount || 0), 0);
  const totalAmt = Number(form.total_amount || 0);
  const match    = totalAmt > 0 && Math.abs(sum - totalAmt) < 1;

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">New Contract</p>
          <p className="text-sm font-black text-gray-900 mt-0.5">नयाँ ठेकेदार सम्झौता</p>
        </div>
        <button onClick={onCancel} className="text-gray-300 hover:text-gray-500 text-xl">✕</button>
      </div>

      <div className="px-6 py-4 space-y-3">
        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Contractor Name *</label>
          <input value={form.contractor_name} onChange={e => setForm(f => ({ ...f, contractor_name: e.target.value }))}
            placeholder="e.g. Radhika K.C. Khadka" className={inp} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Contract No.</label>
            <input value={form.contract_number} onChange={e => setForm(f => ({ ...f, contract_number: e.target.value }))}
              placeholder="CON-2081-001" className={inp} />
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Total Amount (NPR) *</label>
            <input type="number" value={form.total_amount}
              onChange={e => setForm(f => ({ ...f, total_amount: e.target.value }))}
              placeholder="12,420,286.82" className={inp + ' font-black'} />
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Contract Date</label>
            <input type="date" value={form.contract_date}
              onChange={e => setForm(f => ({ ...f, contract_date: e.target.value }))} className={inp} />
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Start Date</label>
            <input type="date" value={form.start_date}
              onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} className={inp} />
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">End Date</label>
            <input type="date" value={form.end_date}
              onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} className={inp} />
          </div>
        </div>
        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Notes</label>
          <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            rows={2} className={inp + ' resize-none'} placeholder="Additional notes…" />
        </div>
        {/* Document Upload */}
        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Contract Document (Optional)</label>
          <div className="relative">
            <input type="file" onChange={e => setForm(f => ({ ...f, document: e.target.files[0] }))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
            <div className={inp + ' flex items-center justify-between'}>
              <span className="text-gray-400 truncate">
                {form.document ? form.document.name : 'Upload agreement…'}
              </span>
              <span className="text-xs">📄</span>
            </div>
          </div>
        </div>

        {/* Template toggle */}
        <div className="flex items-center gap-3 px-3 py-2.5 bg-blue-50 border border-blue-100 rounded-xl">
          <input type="checkbox" id="usePdf" checked={usePdf}
            onChange={e => { setUsePdf(e.target.checked); if (!e.target.checked) setMilestones(PDF_TEMPLATE.map(t => ({ ...t, amount: '' }))); }}
            className="w-4 h-4 accent-blue-600 flex-shrink-0" />
          <label htmlFor="usePdf" className="text-xs font-bold text-blue-800 cursor-pointer flex-1">
            Use 10-milestone PDF template — amounts auto-scale from total
          </label>
        </div>

        {/* Milestones */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Milestones ({milestones.length})</p>
            {!usePdf && (
              <button onClick={addMs} className="text-[10px] font-bold text-blue-600 hover:text-blue-800 px-2 py-1 rounded-lg hover:bg-blue-50">
                + Add
              </button>
            )}
          </div>
          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
            {milestones.map((ms, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl border border-gray-100">
                <span className="w-5 text-center text-[10px] font-black text-gray-400 flex-shrink-0">{ms.order}</span>
                <input value={ms.milestone} onChange={e => updateMs(i, 'milestone', e.target.value)}
                  placeholder="Milestone name" disabled={usePdf}
                  className="flex-1 min-w-0 text-xs border-0 bg-transparent focus:outline-none text-gray-700 placeholder-gray-300 disabled:text-gray-500" />
                <input type="number" value={ms.amount} onChange={e => updateMs(i, 'amount', e.target.value)}
                  placeholder="Amount" disabled={usePdf && !!form.total_amount}
                  className="w-28 text-xs text-right border border-gray-200 bg-white rounded-lg px-2 py-1 focus:outline-none font-bold disabled:bg-gray-100" />
                {ms.pct > 0 && <span className="text-[9px] text-gray-400 w-10 text-right flex-shrink-0">{ms.pct}%</span>}
                {!usePdf && <button onClick={() => removeMs(i)} className="text-red-300 hover:text-red-500 text-xs">✕</button>}
              </div>
            ))}
          </div>
          {milestones.length > 0 && (
            <div className={`flex justify-between mt-2 px-3 py-1.5 rounded-xl text-xs ${match ? 'bg-green-50' : 'bg-gray-100'}`}>
              <span className="text-gray-500 font-semibold">Total</span>
              <span className={`font-black ${match ? 'text-green-600' : totalAmt > 0 ? 'text-amber-600' : 'text-gray-500'}`}>
                NPR {fmt(sum)}
                {totalAmt > 0 && !match && <span className="text-gray-400 font-normal ml-1">(expected {fmt(totalAmt)})</span>}
              </span>
            </div>
          )}
        </div>

        {error && <p className="text-xs text-red-600 font-semibold bg-red-50 px-3 py-2 rounded-xl">{error}</p>}
      </div>

      <div className="px-6 pb-5 flex gap-2">
        <button onClick={onCancel}
          className="flex-1 py-2.5 border border-gray-200 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-50 transition-colors">
          Cancel
        </button>
        <button onClick={submit} disabled={saving}
          className="flex-1 py-2.5 bg-black text-white rounded-xl text-xs font-black hover:bg-gray-800 disabled:opacity-50 transition-colors">
          {saving ? 'Creating…' : 'Create Contract'}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ContractorPage
// ─────────────────────────────────────────────────────────────────────────────
export default function ContractorPage() {
  const { projectId, banks: ctxBanks } = useFinance();

  const [contracts,    setContracts]    = useState([]);
  const [bankAccounts, setBankAccounts] = useState(ctxBanks || []);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [showForm,     setShowForm]     = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [previewDoc,   setPreviewDoc]   = useState(null); // {url, title}

  const [confirm, setConfirm] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {}, type: 'warning' });

  const showConfirm = (title, message, onConfirm, type = 'warning') => {
    setConfirm({
      isOpen: true,
      title,
      message,
      onConfirm: async () => {
        await onConfirm();
        setConfirm(c => ({ ...c, isOpen: false }));
      },
      type
    });
  };

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true); setError('');
    try {
      const [cRes, aRes] = await Promise.all([
        getContractorContracts(projectId),
        getAccounts(projectId, 'is_bank=true'),
      ]);
      setContracts(cRes.data?.results ?? cRes.data ?? []);
      const accts = aRes.data?.results ?? aRes.data ?? [];
      if (accts.length > 0) setBankAccounts(accts);
    } catch {
      setError('Could not load data — run: python manage.py migrate');
    } finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => { await deleteContractorContract(id); load(); };

  const totalContracted = contracts.reduce((s, c) => s + Number(c.total_amount  || 0), 0);
  const totalPaid       = contracts.reduce((s, c) => s + Number(c.total_paid    || 0), 0);
  const totalPending    = contracts.reduce((s, c) => s + Number(c.total_pending || 0), 0);
  const overallPct      = totalContracted > 0 ? (totalPaid / totalContracted) * 100 : 0;

  const filtered = statusFilter === 'ALL' ? contracts : contracts.filter(c => c.status === statusFilter);

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-16">

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-gray-900">Contractors</h1>
          <p className="text-xs text-gray-400 mt-0.5">ठेकेदार भुक्तानी अनुसूची</p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-black text-white rounded-xl text-xs font-black hover:bg-gray-800 transition-colors shadow-sm">
            + New Contract
          </button>
        )}
      </div>

      {/* ── Summary banner ──────────────────────────────────────────────── */}
      {contracts.length > 0 && (
        <div className="bg-gradient-to-br from-gray-900 to-gray-700 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Contracted</p>
              <p className="text-2xl font-black mt-0.5">NPR {fmt(totalContracted)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{contracts.length} Contract{contracts.length !== 1 ? 's' : ''}</p>
              <p className="text-lg font-black text-green-400 mt-0.5">{Math.round(overallPct)}% paid</p>
            </div>
          </div>
          {/* Overall progress bar */}
          <div className="h-2 bg-white/20 rounded-full overflow-hidden mb-3">
            <div className="h-full bg-green-400 rounded-full transition-all" style={{ width: `${overallPct}%` }} />
          </div>
          {/* Paid / Pending */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/10 rounded-xl px-3 py-2">
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Paid</p>
              <p className="text-sm font-black text-green-300 mt-0.5">NPR {fmt(totalPaid)}</p>
            </div>
            <div className="bg-white/10 rounded-xl px-3 py-2">
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Pending</p>
              <p className="text-sm font-black text-amber-300 mt-0.5">NPR {fmt(totalPending)}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Status filter tabs ───────────────────────────────────────────── */}
      {contracts.length > 1 && (
        <div className="flex gap-1.5 flex-wrap">
          {['ALL', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'].map(s => {
            const cfg   = CONTRACT_STATUS[s] || { label: 'All', cls: 'bg-gray-100 text-gray-600' };
            const count = s === 'ALL' ? contracts.length : contracts.filter(c => c.status === s).length;
            if (s !== 'ALL' && count === 0) return null;
            return (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all ${
                  statusFilter === s ? 'bg-black text-white shadow-sm' : `${cfg.cls} hover:opacity-80`
                }`}>
                {s === 'ALL' ? 'All' : cfg.label} · {count}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Create form ──────────────────────────────────────────────────── */}
      {showForm && (
        <CreateContractForm
          projectId={projectId}
          onSaved={() => { setShowForm(false); load(); }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* ── Error ────────────────────────────────────────────────────────── */}
      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold">
          ⚠️ {error}
        </div>
      )}

      {/* ── Contract list ─────────────────────────────────────────────────  */}
      {loading ? (
        <div className="flex flex-col items-center py-20 gap-3">
          <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-800 rounded-full animate-spin" />
          <p className="text-xs text-gray-400">Loading…</p>
        </div>
      ) : contracts.length === 0 && !showForm ? (
        <div className="flex flex-col items-center py-20 gap-4 bg-white border border-dashed border-gray-200 rounded-2xl">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center text-3xl">🏗️</div>
          <div className="text-center">
            <p className="text-sm font-black text-gray-600">No contracts yet</p>
            <p className="text-xs text-gray-400 mt-1">Add your first contractor with a milestone payment schedule</p>
          </div>
          <button onClick={() => setShowForm(true)}
            className="px-5 py-2.5 bg-black text-white rounded-xl text-xs font-black hover:bg-gray-800 transition-colors">
            + Add First Contract
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-sm text-gray-400">
          No {CONTRACT_STATUS[statusFilter]?.label} contracts
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(c => (
            <ContractCard
              key={c.id}
              contract={c}
              bankAccounts={bankAccounts}
              onRefresh={load}
              onDelete={handleDelete}
              showConfirm={showConfirm}
              setPreviewDoc={setPreviewDoc}
            />
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={confirm.isOpen}
        title={confirm.title}
        message={confirm.message}
        onConfirm={confirm.onConfirm}
        onCancel={() => setConfirm(c => ({ ...c, isOpen: false }))}
        type={confirm.type}
        confirmText={confirm.type === 'danger' ? 'Yes, Delete' : 'Yes, Proceed'}
      />

      {previewDoc && (
        <DocPreviewModal
          url={previewDoc.url}
          title={previewDoc.title}
          onClose={() => setPreviewDoc(null)}
        />
      )}

      {/* ── Nepali Notes ─────────────────────────────────────────────────── */}
      {contracts.length > 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl px-5 py-4">
          <p className="text-xs font-black text-amber-800 mb-2 flex items-center gap-1.5">📋 भुक्तानी नियमहरू</p>
          <div className="space-y-1.5 text-[11px] text-amber-700 leading-relaxed">
            <p>• <strong>आंशिक भुक्तानी</strong> — एक किस्तामा धेरै पटक दिन मिल्छ (Partial देखिन्छ)।</p>
            <p>• <strong>क्रम</strong> — Paid (नयाँ पहिले) → Partial → Pending (due date अनुसार)।</p>
            <p>• <strong>सम्पादन</strong> — ✏ थिचेर किस्ताको नाम / रकम / मिति परिवर्तन गर्नुहोस्।</p>
            <p>• प्रत्येक भुक्तानीले DR Expense / CR Bank journal entry पोस्ट गर्छ।</p>
          </div>
        </div>
      )}
    </div>
  );
}
