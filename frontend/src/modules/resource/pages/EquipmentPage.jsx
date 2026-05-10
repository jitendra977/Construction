/**
 * EquipmentPage — fully self-contained equipment manager.
 * Features: search, status filter tabs, table + card view, inline create/edit,
 *           quick status toggle, delete.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useResource } from '../context/ResourceContext';
import {
  getEquipment, createEquipment, updateEquipment, deleteEquipment,
} from '../services/resourceApi';

// ── Constants ─────────────────────────────────────────────────────────────────
const EQUIPMENT_TYPES = [
  'EXCAVATOR', 'CRANE', 'BULLDOZER', 'MIXER', 'GENERATOR',
  'COMPACTOR', 'TRUCK', 'LOADER', 'DRILL', 'SCAFFOLDING', 'OTHER',
];
const STATUSES = ['AVAILABLE', 'IN_USE', 'MAINTENANCE', 'RETIRED'];

const STATUS_CFG = {
  AVAILABLE:   { label: 'Available',   cls: 'bg-green-100 text-green-700',  dot: 'bg-green-500'  },
  IN_USE:      { label: 'In Use',      cls: 'bg-blue-100 text-blue-700',    dot: 'bg-blue-500'   },
  MAINTENANCE: { label: 'Maintenance', cls: 'bg-amber-100 text-amber-700',  dot: 'bg-amber-500'  },
  RETIRED:     { label: 'Retired',     cls: 'bg-gray-100 text-gray-500',    dot: 'bg-gray-400'   },
};

// Next status in quick-cycle (Available → In Use → Maintenance → Available)
const NEXT_STATUS = {
  AVAILABLE:   'IN_USE',
  IN_USE:      'MAINTENANCE',
  MAINTENANCE: 'AVAILABLE',
  RETIRED:     'AVAILABLE',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n, d = 0) => Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: d });
const inp = 'w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/10 bg-white';

// ── CreateEquipmentRow ────────────────────────────────────────────────────────
function CreateEquipmentRow({ projectId, onSaved, onCancel }) {
  const [form,   setForm]   = useState({ name: '', equipment_type: 'OTHER', status: 'AVAILABLE', daily_rate: '', quantity: 1, description: '' });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const save = async () => {
    if (!form.name.trim())                                 { setError('Name required.'); return; }
    if (!form.daily_rate || Number(form.daily_rate) < 0)  { setError('Enter a valid daily rate.'); return; }
    setSaving(true); setError('');
    try {
      await createEquipment({ ...form, project: projectId });
      onSaved();
    } catch (e) {
      setError(e?.response?.data ? JSON.stringify(e.response.data) : 'Failed.');
    } finally { setSaving(false); }
  };

  return (
    <div className="bg-blue-50/60 border border-blue-200 rounded-2xl p-4 space-y-3">
      <p className="text-[10px] font-black text-blue-600 uppercase tracking-wider">New Equipment</p>
      <div className="grid grid-cols-6 gap-2">
        <div className="col-span-2">
          <label className="text-[9px] font-bold text-gray-400 uppercase block mb-0.5">Name *</label>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="e.g. JCB Excavator 3DX" className={inp} autoFocus />
        </div>
        <div>
          <label className="text-[9px] font-bold text-gray-400 uppercase block mb-0.5">Type</label>
          <select value={form.equipment_type} onChange={e => setForm(f => ({ ...f, equipment_type: e.target.value }))} className={inp}>
            {EQUIPMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[9px] font-bold text-gray-400 uppercase block mb-0.5">Status</label>
          <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className={inp}>
            {STATUSES.map(s => <option key={s} value={s}>{STATUS_CFG[s]?.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[9px] font-bold text-gray-400 uppercase block mb-0.5">Daily Rate (NPR)</label>
          <input type="number" min="0" step="0.01" value={form.daily_rate}
            onChange={e => setForm(f => ({ ...f, daily_rate: e.target.value }))}
            placeholder="0.00" className={inp} />
        </div>
        <div>
          <label className="text-[9px] font-bold text-gray-400 uppercase block mb-0.5">Qty</label>
          <input type="number" min="1" value={form.quantity}
            onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} className={inp} />
        </div>
      </div>
      <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
        placeholder="Notes (optional)" className={inp} />
      {error && <p className="text-[10px] text-red-600 font-semibold">{error}</p>}
      <div className="flex gap-2">
        <button onClick={onCancel}
          className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-500 hover:bg-white transition-colors">
          Cancel
        </button>
        <button onClick={save} disabled={saving}
          className="px-5 py-2 bg-black text-white rounded-xl text-xs font-black hover:bg-gray-800 disabled:opacity-50 transition-colors">
          {saving ? 'Adding…' : 'Add Equipment'}
        </button>
      </div>
    </div>
  );
}

// ── EquipmentTableRow ─────────────────────────────────────────────────────────
function EquipmentTableRow({ eq, onRefresh, showConfirm }) {
  const [editing,   setEditing]   = useState(false);
  const [editForm,  setEditForm]  = useState({});
  const [saving,    setSaving]    = useState(false);
  const [saveError, setSaveError] = useState('');
  const [toggling,  setToggling]  = useState(false);

  const st = STATUS_CFG[eq.status] || STATUS_CFG.AVAILABLE;

  // Quick status toggle
  const quickToggle = async () => {
    setToggling(true);
    try {
      await updateEquipment(eq.id, { status: NEXT_STATUS[eq.status] });
      onRefresh();
    } catch { /* ignore */ }
    finally { setToggling(false); }
  };

  // Start inline edit
  const startEdit = () => {
    setEditForm({
      name: eq.name, equipment_type: eq.equipment_type, status: eq.status,
      daily_rate: eq.daily_rate, quantity: eq.quantity || 1, description: eq.description || '',
    });
    setSaveError('');
    setEditing(true);
  };

  // Save edit
  const saveEdit = async () => {
    if (!editForm.name.trim()) { setSaveError('Name required.'); return; }
    setSaving(true); setSaveError('');
    try {
      await updateEquipment(eq.id, editForm);
      setEditing(false);
      onRefresh();
    } catch (e) {
      setSaveError(e?.response?.data ? JSON.stringify(e.response.data) : 'Save failed.');
    } finally { setSaving(false); }
  };

  // Delete
  const handleDelete = () => {
    showConfirm(
      'Delete Equipment',
      `Delete "${eq.name}"? This cannot be undone.`,
      async () => {
        try { await deleteEquipment(eq.id); onRefresh(); }
        catch { alert('Could not delete equipment.'); }
      }
    );
  };

  return (
    <>
      <tr className="bg-white border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
        {/* Name + type */}
        <td className="px-4 py-3">
          <p className="text-sm font-bold text-gray-800">{eq.name}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{eq.equipment_type}</p>
          {eq.description && (
            <p className="text-[10px] text-gray-400 mt-0.5 truncate max-w-xs">{eq.description}</p>
          )}
        </td>

        {/* Status — clickable quick toggle */}
        <td className="px-4 py-3">
          <button onClick={quickToggle} disabled={toggling}
            title={`Click to → ${STATUS_CFG[NEXT_STATUS[eq.status]]?.label}`}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black transition-all hover:opacity-80 ${st.cls}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
            {st.label}
          </button>
        </td>

        {/* Qty */}
        <td className="px-4 py-3 text-right">
          <span className="text-sm font-bold text-gray-700">{eq.quantity || 1}</span>
          <span className="text-[10px] text-gray-400 ml-1">units</span>
        </td>

        {/* Daily Rate */}
        <td className="px-4 py-3 text-right">
          <span className="text-sm font-semibold text-gray-700">NPR {fmt(eq.daily_rate)}</span>
          <p className="text-[9px] text-gray-400">/day</p>
        </td>

        {/* Actions */}
        <td className="px-4 py-3">
          <div className="flex items-center justify-end gap-1">
            <button onClick={() => editing ? setEditing(false) : startEdit()}
              className={`h-7 w-7 flex items-center justify-center rounded-lg transition-colors text-sm ${
                editing ? 'bg-blue-100 text-blue-600' : 'text-gray-300 hover:text-blue-500 hover:bg-blue-50'
              }`}>✏</button>
            <button onClick={handleDelete}
              className="h-7 w-7 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors text-xs">
              🗑
            </button>
          </div>
        </td>
      </tr>

      {/* Edit drawer */}
      {editing && (
        <tr className="bg-blue-50/40 border-b border-blue-100">
          <td colSpan={5} className="px-6 py-3">
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-wider mb-2">Editing: {eq.name}</p>
            <div className="grid grid-cols-6 gap-2 max-w-3xl">
              <div className="col-span-2">
                <label className="text-[9px] font-bold text-gray-400 uppercase block mb-0.5">Name *</label>
                <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  className={inp} autoFocus />
              </div>
              <div>
                <label className="text-[9px] font-bold text-gray-400 uppercase block mb-0.5">Type</label>
                <select value={editForm.equipment_type} onChange={e => setEditForm(f => ({ ...f, equipment_type: e.target.value }))} className={inp}>
                  {EQUIPMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[9px] font-bold text-gray-400 uppercase block mb-0.5">Status</label>
                <select value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))} className={inp}>
                  {STATUSES.map(s => <option key={s} value={s}>{STATUS_CFG[s]?.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[9px] font-bold text-gray-400 uppercase block mb-0.5">Daily Rate (NPR)</label>
                <input type="number" min="0" step="0.01" value={editForm.daily_rate}
                  onChange={e => setEditForm(f => ({ ...f, daily_rate: e.target.value }))} className={inp} />
              </div>
              <div>
                <label className="text-[9px] font-bold text-gray-400 uppercase block mb-0.5">Qty</label>
                <input type="number" min="1" value={editForm.quantity}
                  onChange={e => setEditForm(f => ({ ...f, quantity: e.target.value }))} className={inp} />
              </div>
            </div>
            <input value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Notes (optional)" className={inp + ' mt-2 max-w-3xl'} />
            {saveError && <p className="text-[10px] text-red-600 font-semibold mt-1.5">{saveError}</p>}
            <div className="flex gap-2 mt-2">
              <button onClick={() => setEditing(false)}
                className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-500 hover:bg-white transition-colors">
                Cancel
              </button>
              <button onClick={saveEdit} disabled={saving}
                className="px-5 py-2 bg-black text-white rounded-xl text-xs font-black hover:bg-gray-800 disabled:opacity-50 transition-colors">
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ── EquipmentPage ─────────────────────────────────────────────────────────────
export default function EquipmentPage() {
  const { projectId } = useResource();

  const [equipment,    setEquipment]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showCreate,   setShowCreate]   = useState(false);
  const [confirm,      setConfirm]      = useState({ open: false });

  const showConfirm = (title, message, onConfirm) => {
    setConfirm({ open: true, title, message, onConfirm: async () => {
      await onConfirm();
      setConfirm(c => ({ ...c, open: false }));
    }});
  };

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await getEquipment(projectId);
      setEquipment(res.data?.results ?? res.data ?? []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const handleSaved   = () => { setShowCreate(false); load(); };
  const handleRefresh = () => { load(); };

  // Filter
  const filtered = useMemo(() => {
    let list = equipment;
    if (statusFilter !== 'ALL') list = list.filter(eq => eq.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(eq => eq.name.toLowerCase().includes(q) || eq.equipment_type.toLowerCase().includes(q));
    }
    return list;
  }, [equipment, statusFilter, search]);

  // Status counts
  const statusCounts = {};
  equipment.forEach(eq => { statusCounts[eq.status] = (statusCounts[eq.status] || 0) + 1; });

  const totalDailyRate = filtered.reduce((s, eq) => s + Number(eq.daily_rate || 0) * Number(eq.quantity || 1), 0);

  return (
    <div className="space-y-4 pb-16">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-gray-900">Equipment</h1>
          <p className="text-xs text-gray-400 mt-0.5">मेशिनरी र उपकरण व्यवस्थापन</p>
        </div>
        {!showCreate && (
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-black text-white rounded-xl text-xs font-black hover:bg-gray-800 transition-colors shadow-sm">
            + Add Equipment
          </button>
        )}
      </div>

      {/* ── Summary strip ─────────────────────────────────────────────────── */}
      {equipment.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Total',       value: equipment.length,                    cls: 'text-gray-900'  },
            { label: 'Available',   value: statusCounts['AVAILABLE']   || 0,    cls: 'text-green-600' },
            { label: 'In Use',      value: statusCounts['IN_USE']      || 0,    cls: 'text-blue-600'  },
            { label: 'Maintenance', value: statusCounts['MAINTENANCE'] || 0,    cls: 'text-amber-600' },
          ].map(s => (
            <div key={s.label} className="bg-white border border-gray-100 rounded-2xl px-4 py-3">
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{s.label}</p>
              <p className={`text-2xl font-black mt-0.5 ${s.cls}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Create form ───────────────────────────────────────────────────── */}
      {showCreate && (
        <CreateEquipmentRow
          projectId={projectId}
          onSaved={handleSaved}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {/* ── Search + Status filters ───────────────────────────────────────── */}
      <input value={search} onChange={e => setSearch(e.target.value)}
        placeholder="🔍 Search equipment…"
        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/10 bg-white" />

      <div className="flex gap-1.5 flex-wrap">
        {['ALL', ...STATUSES].map(st => {
          const cfg   = STATUS_CFG[st];
          const count = st === 'ALL' ? equipment.length : (statusCounts[st] || 0);
          if (st !== 'ALL' && count === 0) return null;
          return (
            <button key={st} onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${
                statusFilter === st
                  ? 'bg-black text-white shadow-sm'
                  : cfg ? `${cfg.cls} hover:opacity-80` : 'bg-gray-100 text-gray-600 hover:opacity-80'
              }`}>
              {st === 'ALL' ? 'All' : cfg?.label} · {count}
            </button>
          );
        })}
      </div>

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex flex-col items-center py-20 gap-3">
          <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-800 rounded-full animate-spin" />
          <p className="text-xs text-gray-400">Loading equipment…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16 gap-4 bg-white border border-dashed border-gray-200 rounded-2xl">
          <div className="text-4xl">🚜</div>
          <div className="text-center">
            <p className="text-sm font-black text-gray-600">
              {search || statusFilter !== 'ALL' ? 'No equipment match' : 'No equipment yet'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {search || statusFilter !== 'ALL' ? 'Try clearing the filter' : 'Add your first piece of equipment.'}
            </p>
          </div>
          {!search && statusFilter === 'ALL' && (
            <button onClick={() => setShowCreate(true)}
              className="px-5 py-2.5 bg-black text-white rounded-xl text-xs font-black hover:bg-gray-800 transition-colors">
              + Add First Equipment
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider">Equipment</th>
                <th className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-[10px] font-black text-gray-400 uppercase tracking-wider">Qty</th>
                <th className="px-4 py-3 text-right text-[10px] font-black text-gray-400 uppercase tracking-wider">Daily Rate</th>
                <th className="px-4 py-3 text-right text-[10px] font-black text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(eq => (
                <EquipmentTableRow
                  key={eq.id}
                  eq={eq}
                  onRefresh={handleRefresh}
                  showConfirm={showConfirm}
                />
              ))}
            </tbody>
            {filtered.length > 1 && (
              <tfoot>
                <tr className="bg-gray-50 border-t border-gray-200">
                  <td className="px-4 py-2.5 text-[10px] font-black text-gray-500 uppercase">{filtered.length} items</td>
                  <td colSpan={2} />
                  <td className="px-4 py-2.5 text-right text-sm font-black text-gray-800">
                    NPR {fmt(totalDailyRate)}/day
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {/* ── Status toggle hint ────────────────────────────────────────────── */}
      {equipment.length > 0 && (
        <p className="text-[10px] text-gray-400 text-center">
          💡 Click the status badge to quickly cycle: Available → In Use → Maintenance
        </p>
      )}

      {/* ── Confirm Dialog ────────────────────────────────────────────────── */}
      {confirm.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <p className="text-sm font-black text-gray-900">{confirm.title}</p>
            <p className="text-xs text-gray-500">{confirm.message}</p>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setConfirm(c => ({ ...c, open: false }))}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={confirm.onConfirm}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-xs font-black hover:bg-red-700 transition-colors">
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
