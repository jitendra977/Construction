/**
 * MaterialsPage — table-view materials & stock manager.
 * Features: search, category filter pills, table layout, inline stock in/out
 *           (expandable drawer per row), inline create/edit, delete, summary stats.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useResource } from '../context/ResourceContext';
import { usePlatformBase } from '../../../shared/utils/platformNav';
import {
  getMaterials, createMaterial, updateMaterial, deleteMaterial,
  stockIn, stockOut, getPhases, getSuppliers, getPurchaseOrders,
} from '../services/resourceApi';

// ── Constants ─────────────────────────────────────────────────────────────────
const CATEGORIES = ['CEMENT', 'STEEL', 'SAND', 'BRICK', 'WOOD', 'ELECTRICAL', 'PLUMBING', 'OTHER'];
const UNITS      = ['kg', 'ton', 'bag', 'pcs', 'ft', 'm', 'm2', 'm3', 'ltr', 'bundle', 'box', 'roll'];

const CAT_COLOR = {
  CEMENT:     'bg-gray-100 text-gray-600',
  STEEL:      'bg-blue-100 text-blue-700',
  SAND:       'bg-yellow-100 text-yellow-700',
  BRICK:      'bg-red-100 text-red-700',
  WOOD:       'bg-amber-100 text-amber-700',
  ELECTRICAL: 'bg-purple-100 text-purple-700',
  PLUMBING:   'bg-cyan-100 text-cyan-700',
  OTHER:      'bg-green-100 text-green-700',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n, d = 0) => Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: d });
const inp = 'w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/10 bg-white';

// ── CreateMaterialRow ─────────────────────────────────────────────────────────
// Inline form that appears above the table when "+ Add Material" is clicked.
function CreateMaterialRow({ projectId, onSaved, onCancel }) {
  const [form,   setForm]   = useState({ name: '', category: 'CEMENT', unit: 'bag', unit_price: '', reorder_level: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const save = async () => {
    if (!form.name.trim())                                { setError('Name required.'); return; }
    if (form.unit_price === '' || Number(form.unit_price) < 0) { setError('Enter a valid price.'); return; }
    setSaving(true); setError('');
    try {
      await createMaterial({ ...form, project: projectId });
      onSaved();
    } catch (e) {
      setError(e?.response?.data ? JSON.stringify(e.response.data) : 'Failed.');
    } finally { setSaving(false); }
  };

  return (
    <div className="bg-blue-50/60 border border-blue-200 rounded-2xl p-4 space-y-3">
      <p className="text-[10px] font-black text-blue-600 uppercase tracking-wider">New Material</p>
      <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
        <div className="md:col-span-2">
          <label className="text-[9px] font-bold text-gray-400 uppercase block mb-0.5">Name *</label>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="e.g. OPC Cement 43" className={inp} autoFocus />
        </div>
        <div>
          <label className="text-[9px] font-bold text-gray-400 uppercase block mb-0.5">Category</label>
          <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className={inp}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[9px] font-bold text-gray-400 uppercase block mb-0.5">Unit</label>
          <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} className={inp}>
            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[9px] font-bold text-gray-400 uppercase block mb-0.5">Unit Price (NPR)</label>
          <input type="number" min="0" step="0.01" value={form.unit_price}
            onChange={e => setForm(f => ({ ...f, unit_price: e.target.value }))}
            placeholder="0.00" className={inp} />
        </div>
        <div>
          <label className="text-[9px] font-bold text-gray-400 uppercase block mb-0.5">Reorder Lvl</label>
          <input type="number" min="0" value={form.reorder_level}
            onChange={e => setForm(f => ({ ...f, reorder_level: e.target.value }))}
            placeholder="e.g. 50" className={inp} />
        </div>
      </div>
      {error && <p className="text-[10px] text-red-600 font-semibold">{error}</p>}
      <div className="flex gap-2">
        <button onClick={onCancel}
          className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-500 hover:bg-white transition-colors">
          Cancel
        </button>
        <button onClick={save} disabled={saving}
          className="px-5 py-2 bg-black text-white rounded-xl text-xs font-black hover:bg-gray-800 disabled:opacity-50 transition-colors">
          {saving ? 'Adding…' : 'Add Material'}
        </button>
      </div>
    </div>
  );
}

// ── TableRow ──────────────────────────────────────────────────────────────────
function TableRow({ mat, phases, suppliers, purchaseOrders, onRefresh, showConfirm }) {
  const [mode,       setMode]       = useState(null);  // null | 'stockIn' | 'stockOut' | 'edit'
  const [stockForm,  setStockForm]  = useState({
    qty: '', reference: '', notes: '', phase: '',
    supplier: '', purchase_order: '', unit_price: '',
  });
  const [stocking,   setStocking]   = useState(false);
  const [stockError, setStockError] = useState('');
  const [editForm,   setEditForm]   = useState({});
  const [saving,     setSaving]     = useState(false);
  const [saveError,  setSaveError]  = useState('');

  const totalValue = Number(mat.stock_qty || 0) * Number(mat.unit_price || 0);

  // Open stock drawer
  const openStock = (type) => {
    setStockForm({
      qty: '', reference: '', notes: '', phase: '',
      supplier: '', purchase_order: '', unit_price: String(mat.unit_price || ''),
    });
    setStockError('');
    setMode(type);
  };

  // When supplier changes, reset PO selection
  const handleSupplierChange = (supplierId) => {
    setStockForm(f => ({ ...f, supplier: supplierId, purchase_order: '' }));
  };

  // When PO changes, auto-fill reference and supplier
  const handlePOChange = (poId) => {
    const po = purchaseOrders.find(p => p.id === poId);
    setStockForm(f => ({
      ...f,
      purchase_order: poId,
      reference: po?.order_number ? `PO/${po.order_number}` : f.reference,
      supplier: po?.supplier || f.supplier,
    }));
  };

  // POs filtered to selected supplier (or all POs if no supplier chosen)
  const filteredPOs = stockForm.supplier
    ? purchaseOrders.filter(po => po.supplier === stockForm.supplier || po.supplier_id === stockForm.supplier)
    : purchaseOrders;

  // Submit stock movement
  const submitStock = async () => {
    const qty = parseFloat(stockForm.qty);
    if (!qty || qty <= 0) { setStockError('Enter a valid quantity.'); return; }
    setStocking(true); setStockError('');
    try {
      const payload = {
        quantity: qty,
        reference: stockForm.reference,
        notes: stockForm.notes,
      };
      if (mode === 'stockIn') {
        if (stockForm.unit_price) payload.unit_price = stockForm.unit_price;
        if (stockForm.supplier)   payload.supplier   = stockForm.supplier;
        if (stockForm.purchase_order) payload.purchase_order = stockForm.purchase_order;
        await stockIn(mat.id, payload);
      } else {
        if (stockForm.phase) payload.phase = stockForm.phase;
        await stockOut(mat.id, payload);
      }
      setMode(null);
      onRefresh();
    } catch (e) {
      setStockError(e?.response?.data?.error || e?.response?.data?.detail || JSON.stringify(e?.response?.data || 'Failed.'));
    } finally { setStocking(false); }
  };

  // Open edit mode
  const startEdit = () => {
    setEditForm({
      name: mat.name, category: mat.category, unit: mat.unit,
      unit_price: mat.unit_price, reorder_level: mat.reorder_level || '',
      description: mat.description || '',
    });
    setSaveError('');
    setMode('edit');
  };

  // Save edit
  const saveEdit = async () => {
    if (!editForm.name.trim()) { setSaveError('Name required.'); return; }
    setSaving(true); setSaveError('');
    try {
      await updateMaterial(mat.id, editForm);
      setMode(null);
      onRefresh();
    } catch (e) {
      setSaveError(e?.response?.data ? JSON.stringify(e.response.data) : 'Save failed.');
    } finally { setSaving(false); }
  };

  // Delete
  const handleDelete = () => {
    showConfirm(
      'Delete Material',
      `Delete "${mat.name}"? All stock history will also be removed.`,
      async () => {
        try { await deleteMaterial(mat.id); onRefresh(); }
        catch { alert('Could not delete material.'); }
      },
      'danger'
    );
  };

  const isLow = mat.is_low_stock;

  return (
    <>
      {/* Main data row */}
      <tr className={`border-b transition-colors ${isLow ? 'bg-red-50/40 border-red-100' : 'bg-white border-gray-50 hover:bg-gray-50/50'}`}>
        {/* Name */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${CAT_COLOR[mat.category] || CAT_COLOR.OTHER}`}>
              {(mat.category || 'OT').slice(0, 3)}
            </span>
            <span className="text-sm font-bold text-gray-800">{mat.name}</span>
            {isLow && (
              <span className="text-[9px] font-black px-1.5 py-0.5 bg-red-100 text-red-600 rounded-full">⚠ Low</span>
            )}
          </div>
          {mat.description && (
            <p className="text-[10px] text-gray-400 mt-0.5 pl-9 truncate max-w-xs">{mat.description}</p>
          )}
        </td>

        {/* Stock */}
        <td className="px-4 py-3 text-right">
          <span className={`text-sm font-black ${isLow ? 'text-red-600' : 'text-gray-800'}`}>
            {fmt(mat.stock_qty, 2)}
          </span>
          <span className="text-[10px] text-gray-400 ml-1">{mat.unit}</span>
          {mat.reorder_level != null && mat.reorder_level !== '' && (
            <p className="text-[9px] text-gray-400 mt-0.5">min {mat.reorder_level}</p>
          )}
        </td>

        {/* Unit Price */}
        <td className="px-4 py-3 text-right">
          <span className="text-sm font-semibold text-gray-700">NPR {fmt(mat.unit_price, 2)}</span>
          <p className="text-[9px] text-gray-400">/{mat.unit}</p>
        </td>

        {/* Total Value */}
        <td className="px-4 py-3 text-right">
          <span className="text-sm font-black text-gray-800">NPR {fmt(totalValue)}</span>
        </td>

        {/* Actions */}
        <td className="px-4 py-3">
          <div className="flex items-center justify-end gap-1">
            <button onClick={() => mode === 'stockIn' ? setMode(null) : openStock('stockIn')}
              className={`h-7 px-2.5 text-[10px] font-black rounded-lg border transition-colors ${
                mode === 'stockIn'
                  ? 'bg-green-600 text-white border-green-600'
                  : 'text-green-700 bg-green-50 border-green-200 hover:bg-green-100'
              }`}>
              +In
            </button>
            <button onClick={() => mode === 'stockOut' ? setMode(null) : openStock('stockOut')}
              className={`h-7 px-2.5 text-[10px] font-black rounded-lg border transition-colors ${
                mode === 'stockOut'
                  ? 'bg-red-600 text-white border-red-600'
                  : 'text-red-700 bg-red-50 border-red-200 hover:bg-red-100'
              }`}>
              −Out
            </button>
            <button onClick={() => mode === 'edit' ? setMode(null) : startEdit()}
              className={`h-7 w-7 flex items-center justify-center rounded-lg transition-colors text-sm ${
                mode === 'edit'
                  ? 'bg-blue-100 text-blue-600'
                  : 'text-gray-300 hover:text-blue-500 hover:bg-blue-50'
              }`}>✏</button>
            <button onClick={handleDelete}
              className="h-7 w-7 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors text-xs">
              🗑
            </button>
          </div>
        </td>
      </tr>

      {/* Expandable drawer — stock in/out */}
      {(mode === 'stockIn' || mode === 'stockOut') && (
        <tr className={`border-b ${mode === 'stockIn' ? 'bg-green-50/40 border-green-100' : 'bg-red-50/30 border-red-100'}`}>
          <td colSpan={5} className="px-6 py-4">
            <p className={`text-[10px] font-black uppercase tracking-wider mb-3 ${
              mode === 'stockIn' ? 'text-green-600' : 'text-red-600'
            }`}>
              {mode === 'stockIn' ? '+ Stock In' : '− Stock Out'} — {mat.name}
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-w-4xl">
              {/* Qty — always */}
              <div>
                <label className="text-[9px] font-bold text-gray-400 uppercase block mb-0.5">Qty ({mat.unit}) *</label>
                <input type="number" min="0.01" step="0.01" value={stockForm.qty}
                  onChange={e => setStockForm(f => ({ ...f, qty: e.target.value }))}
                  className={inp + ' font-bold'} autoFocus
                  onKeyDown={e => e.key === 'Enter' && submitStock()} />
              </div>

              {/* Unit Price — stock-in only */}
              {mode === 'stockIn' && (
                <div>
                  <label className="text-[9px] font-bold text-gray-400 uppercase block mb-0.5">Unit Price (NPR)</label>
                  <input type="number" min="0" step="0.01" value={stockForm.unit_price}
                    onChange={e => setStockForm(f => ({ ...f, unit_price: e.target.value }))}
                    placeholder={String(mat.unit_price || '0')} className={inp} />
                </div>
              )}

              {/* Supplier — stock-in only */}
              {mode === 'stockIn' && suppliers.length > 0 && (
                <div>
                  <label className="text-[9px] font-bold text-green-600 uppercase block mb-0.5">
                    Supplier
                  </label>
                  <select value={stockForm.supplier} onChange={e => handleSupplierChange(e.target.value)} className={inp}>
                    <option value="">— Select Supplier —</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Purchase Order — stock-in only, filtered by supplier */}
              {mode === 'stockIn' && filteredPOs.length > 0 && (
                <div>
                  <label className="text-[9px] font-bold text-green-600 uppercase block mb-0.5">
                    Purchase Order
                  </label>
                  <select value={stockForm.purchase_order} onChange={e => handlePOChange(e.target.value)} className={inp}>
                    <option value="">— No PO —</option>
                    {filteredPOs.map(po => (
                      <option key={po.id} value={po.id}>
                        {po.order_number ? `PO/${po.order_number}` : `PO ${po.id.slice(0, 8)}…`}
                        {po.status ? ` · ${po.status}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Phase — stock-out only */}
              {mode === 'stockOut' && phases.length > 0 && (
                <div>
                  <label className="text-[9px] font-bold text-red-400 uppercase block mb-0.5">Phase</label>
                  <select value={stockForm.phase} onChange={e => setStockForm(f => ({ ...f, phase: e.target.value }))} className={inp}>
                    <option value="">— No Phase —</option>
                    {phases.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.order ? `${p.order}. ` : ''}{p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Reference */}
              <div>
                <label className="text-[9px] font-bold text-gray-400 uppercase block mb-0.5">Reference / Invoice</label>
                <input value={stockForm.reference} onChange={e => setStockForm(f => ({ ...f, reference: e.target.value }))}
                  placeholder="e.g. INV-0042" className={inp} />
              </div>

              {/* Notes */}
              <div>
                <label className="text-[9px] font-bold text-gray-400 uppercase block mb-0.5">Notes</label>
                <input value={stockForm.notes} onChange={e => setStockForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Optional notes…" className={inp} />
              </div>
            </div>

            <div className="flex items-center gap-2 mt-3">
              <button onClick={() => setMode(null)}
                className="h-9 px-4 border border-gray-200 rounded-xl text-xs font-bold text-gray-500 hover:bg-white transition-colors">
                Cancel
              </button>
              <button onClick={submitStock} disabled={stocking}
                className={`h-9 px-5 rounded-xl text-xs font-black text-white transition-colors disabled:opacity-50 ${
                  mode === 'stockIn' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                }`}>
                {stocking ? 'Saving…' : mode === 'stockIn' ? 'Add Stock' : 'Deduct Stock'}
              </button>
              {mode === 'stockIn' && stockForm.supplier && (
                <span className="text-[10px] text-green-600 font-semibold">
                  📦 {suppliers.find(s => s.id === stockForm.supplier)?.name}
                  {stockForm.purchase_order && ` · ${stockForm.reference || 'PO linked'}`}
                </span>
              )}
            </div>
            {stockError && <p className="text-[10px] text-red-600 font-semibold mt-1.5">{stockError}</p>}
          </td>
        </tr>
      )}

      {/* Expandable drawer — edit */}
      {mode === 'edit' && (
        <tr className="bg-blue-50/40 border-b border-blue-100">
          <td colSpan={5} className="px-6 py-3">
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-wider mb-2">Editing: {mat.name}</p>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-2 max-w-3xl">
              <div className="md:col-span-2">
                <label className="text-[9px] font-bold text-gray-400 uppercase block mb-0.5">Name *</label>
                <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  className={inp} autoFocus />
              </div>
              <div>
                <label className="text-[9px] font-bold text-gray-400 uppercase block mb-0.5">Category</label>
                <select value={editForm.category} onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))} className={inp}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[9px] font-bold text-gray-400 uppercase block mb-0.5">Unit</label>
                <select value={editForm.unit} onChange={e => setEditForm(f => ({ ...f, unit: e.target.value }))} className={inp}>
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[9px] font-bold text-gray-400 uppercase block mb-0.5">Unit Price (NPR)</label>
                <input type="number" min="0" step="0.01" value={editForm.unit_price}
                  onChange={e => setEditForm(f => ({ ...f, unit_price: e.target.value }))} className={inp} />
              </div>
              <div>
                <label className="text-[9px] font-bold text-gray-400 uppercase block mb-0.5">Reorder Lvl</label>
                <input type="number" min="0" value={editForm.reorder_level}
                  onChange={e => setEditForm(f => ({ ...f, reorder_level: e.target.value }))} className={inp} />
              </div>
            </div>
            {saveError && <p className="text-[10px] text-red-600 font-semibold mt-1.5">{saveError}</p>}
            <div className="flex gap-2 mt-2">
              <button onClick={() => setMode(null)}
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

// ── MaterialsPage ─────────────────────────────────────────────────────────────
export default function MaterialsPage() {
  const { projectId, refresh } = useResource();
  const base = usePlatformBase();
  const isMobile = base.includes('/mobile');

  const [materials,       setMaterials]       = useState([]);
  const [phases,          setPhases]          = useState([]);  // stock-out phase linking
  const [suppliers,       setSuppliers]       = useState([]);  // stock-in supplier
  const [purchaseOrders,  setPurchaseOrders]  = useState([]);  // stock-in PO linking
  const [loading,         setLoading]         = useState(true);
  const [search,     setSearch]     = useState('');
  const [catFilter,  setCatFilter]  = useState('ALL');
  const [showCreate, setShowCreate] = useState(false);
  const [confirm,    setConfirm]    = useState({ open: false });

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
      const [matRes, phaseRes, supplierRes, poRes] = await Promise.all([
        getMaterials(projectId),
        getPhases(projectId).catch(() => ({ data: [] })),
        getSuppliers(projectId).catch(() => ({ data: [] })),
        getPurchaseOrders(projectId).catch(() => ({ data: [] })),
      ]);
      setMaterials(matRes.data?.results ?? matRes.data ?? []);
      const phaseData = phaseRes.data?.results ?? phaseRes.data ?? [];
      setPhases(phaseData.filter(p => p.status !== 'COMPLETED'));
      setSuppliers((supplierRes.data?.results ?? supplierRes.data ?? []).filter(s => s.is_active !== false));
      // Only show DRAFT/ORDERED POs — not yet fully received
      const allPOs = poRes.data?.results ?? poRes.data ?? [];
      setPurchaseOrders(allPOs.filter(po => ['DRAFT', 'ORDERED'].includes(po.status)));
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const handleSaved  = () => { setShowCreate(false); load(); refresh?.(); };
  const handleRefresh = () => { load(); refresh?.(); };

  // Filter
  const filtered = useMemo(() => {
    let list = materials;
    if (catFilter !== 'ALL') list = list.filter(m => m.category === catFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(m => m.name.toLowerCase().includes(q));
    }
    return list;
  }, [materials, catFilter, search]);

  // Summary
  const totalValue    = materials.reduce((s, m) => s + Number(m.stock_qty || 0) * Number(m.unit_price || 0), 0);
  const lowCount      = materials.filter(m => m.is_low_stock).length;
  const catCounts     = {};
  materials.forEach(m => { catCounts[m.category] = (catCounts[m.category] || 0) + 1; });

  return (
    <div className="space-y-4 pb-16">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className={`flex ${isMobile ? 'flex-col items-start gap-3' : 'items-center justify-between'}`}>
        <div>
          <h1 className="text-xl font-black text-gray-900">Materials</h1>
          <p className="text-xs text-gray-400 mt-0.5">सामग्री स्टक व्यवस्थापन</p>
        </div>
        {!showCreate && (
          <button onClick={() => setShowCreate(true)}
            className={`flex items-center gap-1.5 ${isMobile ? 'w-full justify-center px-4 py-3' : 'px-4 py-2.5'} bg-black text-white rounded-xl text-xs font-black hover:bg-gray-800 transition-colors shadow-sm`}>
            + Add Material
          </button>
        )}
      </div>

      {/* ── Summary strip ─────────────────────────────────────────────────── */}
      {materials.length > 0 && (
        <div className={`grid ${isMobile ? 'grid-cols-2' : 'grid-cols-3'} gap-3`}>
          <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3">
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Total Items</p>
            <p className="text-2xl font-black text-gray-900 mt-0.5">{materials.length}</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3">
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Stock Value</p>
            <p className="text-lg font-black text-gray-900 mt-0.5">NPR {fmt(totalValue)}</p>
          </div>
          <div className={`border rounded-2xl px-4 py-3 ${isMobile ? 'col-span-2' : ''} ${lowCount > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100'}`}>
            <p className={`text-[9px] font-bold uppercase tracking-wider ${lowCount > 0 ? 'text-red-500' : 'text-gray-400'}`}>Low Stock</p>
            <p className={`text-2xl font-black mt-0.5 ${lowCount > 0 ? 'text-red-600' : 'text-gray-300'}`}>{lowCount}</p>
          </div>
        </div>
      )}

      {/* ── Create form ───────────────────────────────────────────────────── */}
      {showCreate && (
        <CreateMaterialRow
          projectId={projectId}
          onSaved={handleSaved}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {/* ── Search + Category filters ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-2">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Search materials…"
          className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/10 bg-white" />
      </div>
      <div className="flex gap-1.5 flex-wrap">
        {['ALL', ...CATEGORIES].map(cat => {
          const count = cat === 'ALL' ? materials.length : (catCounts[cat] || 0);
          if (cat !== 'ALL' && count === 0) return null;
          return (
            <button key={cat} onClick={() => setCatFilter(cat)}
              className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${
                catFilter === cat
                  ? 'bg-black text-white shadow-sm'
                  : `${CAT_COLOR[cat] || 'bg-gray-100 text-gray-600'} hover:opacity-80`
              }`}>
              {cat === 'ALL' ? 'All' : cat} · {count}
            </button>
          );
        })}
      </div>

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex flex-col items-center py-20 gap-3">
          <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-800 rounded-full animate-spin" />
          <p className="text-xs text-gray-400">Loading materials…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16 gap-4 bg-white border border-dashed border-gray-200 rounded-2xl">
          <div className="text-4xl">🧱</div>
          <div className="text-center">
            <p className="text-sm font-black text-gray-600">
              {search || catFilter !== 'ALL' ? 'No materials match' : 'No materials yet'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {search || catFilter !== 'ALL'
                ? 'Try clearing the filter'
                : 'Add your first material to start tracking stock.'}
            </p>
          </div>
          {!search && catFilter === 'ALL' && (
            <button onClick={() => setShowCreate(true)}
              className="px-5 py-2.5 bg-black text-white rounded-xl text-xs font-black hover:bg-gray-800 transition-colors">
              + Add First Material
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider">Material</th>
                <th className="px-4 py-3 text-right text-[10px] font-black text-gray-400 uppercase tracking-wider">Stock</th>
                <th className="px-4 py-3 text-right text-[10px] font-black text-gray-400 uppercase tracking-wider">Unit Price</th>
                <th className="px-4 py-3 text-right text-[10px] font-black text-gray-400 uppercase tracking-wider">Total Value</th>
                <th className="px-4 py-3 text-right text-[10px] font-black text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(mat => (
                <TableRow
                  key={mat.id}
                  mat={mat}
                  phases={phases}
                  suppliers={suppliers}
                  purchaseOrders={purchaseOrders}
                  onRefresh={handleRefresh}
                  showConfirm={showConfirm}
                />
              ))}
            </tbody>
            {/* Footer total */}
            {filtered.length > 1 && (
              <tfoot>
                <tr className="bg-gray-50 border-t border-gray-200">
                  <td className="px-4 py-2.5 text-[10px] font-black text-gray-500 uppercase tracking-wider">
                    {filtered.length} items
                  </td>
                  <td colSpan={2} />
                  <td className="px-4 py-2.5 text-right text-sm font-black text-gray-800">
                    NPR {fmt(filtered.reduce((s, m) => s + Number(m.stock_qty || 0) * Number(m.unit_price || 0), 0))}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
          </div>
        </div>
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
