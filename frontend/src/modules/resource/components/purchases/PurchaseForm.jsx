/**
 * PurchaseForm — Create / edit a Purchase Order.
 * Each line item supports two modes:
 *   • catalog — pick an existing Material; auto-fills description + unit price
 *   • custom  — type a free-form description
 */
import { useState, useEffect, useMemo } from 'react';
import resourceApi from '../../services/resourceApi';
import { useResource } from '../../context/ResourceContext';
import SignaturePad from '../../../../components/common/SignaturePad';
import { useConstruction } from '../../../../context/ConstructionContext';

const STATUSES = ['DRAFT', 'ORDERED', 'RECEIVED', 'CANCELLED'];
const inp = 'w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-black/20 bg-white text-gray-900';

const emptyItem = () => ({
  id:          null,
  mode:        'catalog',   // 'catalog' | 'custom'
  material:    '',          // material UUID (FK)
  description: '',          // free-form override / catalog name
  quantity:    '',
  unit_price:  '',
  amount:      0,
});

function calcAmount(qty, price) {
  const q = parseFloat(qty) || 0;
  const p = parseFloat(price) || 0;
  return q * p;
}

// ── LineItem ──────────────────────────────────────────────────────────────────
function LineItem({ item, index, materials, onUpdate, onRemove, showRemove }) {
  const [search, setSearch] = useState('');
  const [open,   setOpen]   = useState(false);

  // Filtered materials for dropdown
  const filteredMats = useMemo(() => {
    if (!search.trim()) return materials.slice(0, 30);
    const q = search.toLowerCase();
    return materials.filter(m =>
      m.name.toLowerCase().includes(q) || (m.category || '').toLowerCase().includes(q)
    ).slice(0, 20);
  }, [materials, search]);

  const selectedMat = materials.find(m => m.id === item.material);

  const update = (changes) => {
    const next = { ...item, ...changes };
    next.amount = calcAmount(next.quantity, next.unit_price);
    onUpdate(index, next);
  };

  const pickMaterial = (mat) => {
    update({
      material:    mat.id,
      description: mat.name,
      unit_price:  mat.unit_price || '',
      amount:      calcAmount(item.quantity, mat.unit_price || ''),
    });
    setSearch('');
    setOpen(false);
  };

  const clearMaterial = () => {
    update({ material: '', description: '' });
    setSearch('');
  };

  const switchMode = (mode) => {
    update({ mode, material: '', description: '', unit_price: '', amount: 0 });
    setSearch('');
    setOpen(false);
  };

  return (
    <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 space-y-2">
      {/* Mode toggle + remove */}
      <div className="flex items-center gap-2">
        <div className="flex bg-white border border-gray-200 rounded-lg overflow-hidden text-[10px] font-black">
          <button type="button"
            onClick={() => switchMode('catalog')}
            className={`px-2.5 py-1 transition-colors ${item.mode === 'catalog' ? 'bg-black text-white' : 'text-gray-400 hover:text-gray-700'}`}>
            📦 Catalog
          </button>
          <button type="button"
            onClick={() => switchMode('custom')}
            className={`px-2.5 py-1 transition-colors ${item.mode === 'custom' ? 'bg-black text-white' : 'text-gray-400 hover:text-gray-700'}`}>
            ✏ Custom
          </button>
        </div>
        <span className="flex-1 text-[10px] text-gray-400">
          {item.mode === 'catalog'
            ? selectedMat ? <span className="text-green-600 font-bold">✓ {selectedMat.name}</span> : 'Select from material catalog'
            : 'Enter a custom item description'}
        </span>
        {showRemove && (
          <button type="button" onClick={() => onRemove(index)}
            className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors text-base">
            ×
          </button>
        )}
      </div>

      {/* Material picker (catalog mode) */}
      {item.mode === 'catalog' && (
        <div className="relative">
          {selectedMat ? (
            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-800 truncate">{selectedMat.name}</p>
                <p className="text-[10px] text-gray-400">{selectedMat.category} · {selectedMat.unit} · Stock: {selectedMat.stock_qty}</p>
              </div>
              <button type="button" onClick={clearMaterial}
                className="text-gray-400 hover:text-red-500 text-sm transition-colors flex-shrink-0">✕</button>
            </div>
          ) : (
            <div>
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setOpen(true); }}
                onFocus={() => setOpen(true)}
                onBlur={() => setTimeout(() => setOpen(false), 150)}
                placeholder="Search materials…"
                className={inp}
              />
              {open && (
                <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                  {filteredMats.length === 0 ? (
                    <div className="px-3 py-2 text-[10px] text-gray-400">No materials found</div>
                  ) : filteredMats.map(mat => (
                    <button key={mat.id} type="button"
                      onMouseDown={() => pickMaterial(mat)}
                      className="w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0">
                      <p className="text-xs font-bold text-gray-800">{mat.name}</p>
                      <p className="text-[10px] text-gray-400">
                        {mat.category} · {mat.unit} · NPR {Number(mat.unit_price || 0).toLocaleString()} · Stock: {mat.stock_qty}
                      </p>
                    </button>
                  ))}
                  {materials.length > 30 && !search && (
                    <div className="px-3 py-1.5 text-[10px] text-gray-400 text-center border-t border-gray-100">
                      Type to search more…
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Description (custom mode, or override for catalog) */}
      {(item.mode === 'custom' || (item.mode === 'catalog' && selectedMat)) && (
        <div>
          <label className="text-[9px] font-bold text-gray-400 uppercase block mb-0.5">
            {item.mode === 'catalog' ? 'Description override (optional)' : 'Description *'}
          </label>
          <input
            value={item.description}
            onChange={e => update({ description: e.target.value })}
            placeholder={item.mode === 'catalog' ? selectedMat?.name : 'e.g. 50kg OPC Cement bags'}
            required={item.mode === 'custom'}
            className={inp}
          />
        </div>
      )}

      {/* Qty + Price + Amount */}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-[9px] font-bold text-gray-400 uppercase block mb-0.5">
            Qty{selectedMat ? ` (${selectedMat.unit})` : ''} *
          </label>
          <input
            type="number" min="0.01" step="0.01"
            value={item.quantity}
            onChange={e => update({ quantity: e.target.value })}
            placeholder="0"
            required
            className={inp + ' font-bold'}
          />
        </div>
        <div>
          <label className="text-[9px] font-bold text-gray-400 uppercase block mb-0.5">Unit Price (NPR) *</label>
          <input
            type="number" min="0" step="0.01"
            value={item.unit_price}
            onChange={e => update({ unit_price: e.target.value })}
            placeholder="0.00"
            required
            className={inp}
          />
        </div>
        <div>
          <label className="text-[9px] font-bold text-gray-400 uppercase block mb-0.5">Amount</label>
          <div className="px-2 py-1.5 bg-white border border-gray-100 rounded-lg text-xs font-black text-gray-700">
            NPR {Number(item.amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
        </div>
      </div>
    </div>
  );
}


// ── PurchaseForm ───────────────────────────────────────────────────────────────
export default function PurchaseForm({ order, onDone }) {
  const { projectId, suppliers, materials } = useResource();
  const { user, updateProfile } = useConstruction();
  const isEdit = Boolean(order);

  const [form, setForm] = useState({
    order_number:  order?.order_number  || '',
    supplier:      order?.supplier      || '',
    order_date:    order?.order_date    || new Date().toISOString().slice(0, 10),
    expected_date: order?.expected_date || '',
    status:        order?.status        || 'DRAFT',
    notes:         order?.notes         || '',
    signature_data: order?.signature_data || user?.digital_signature || '',
    signature_name: order?.signature_name || (user ? `${user.first_name} ${user.last_name}`.trim() || user.username : ''),
  });
  const [items,  setItems]  = useState([emptyItem()]);
  const [saving, setSaving] = useState(false);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [error, setError] = useState(null);
  const [placeImmediately, setPlaceImmediately] = useState(!isEdit);
  const [saveSignature, setSaveSignature] = useState(false);

  // Auto-update signature if user changes or first load
  useEffect(() => {
    if (!isEdit && user) {
      setForm(f => ({
        ...f,
        signature_name: f.signature_name || `${user.first_name} ${user.last_name}`.trim() || user.username,
        signature_data: f.signature_data || user.digital_signature || '',
      }));
    }
  }, [user, isEdit]);

  // Load existing items when editing
  useEffect(() => {
    if (!isEdit || !order?.id) return;
    resourceApi.getPurchaseItems(order.id)
      .then(res => {
        const data = res.data?.results || res.data || [];
        if (data.length) {
          setItems(data.map(it => ({
            id:          it.id,
            mode:        it.material ? 'catalog' : 'custom',
            material:    it.material  || '',
            description: it.description || '',
            quantity:    it.quantity   || '',
            unit_price:  it.unit_price || '',
            amount:      calcAmount(it.quantity, it.unit_price),
          })));
        }
      })
      .catch(() => {});
  }, [isEdit, order?.id]);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const updateItem = (index, next) => {
    setItems(prev => { const a = [...prev]; a[index] = next; return a; });
  };
  const addItem    = () => setItems(p => [...p, emptyItem()]);
  const removeItem = i  => setItems(p => p.filter((_, idx) => idx !== i));

  const totalAmount = items.reduce((s, it) => s + (parseFloat(it.amount) || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = { ...form, project: projectId };
      let orderId;
      if (isEdit) {
        await resourceApi.updatePurchaseOrder(order.id, payload);
        orderId = order.id;
      } else {
        const res = await resourceApi.createPurchaseOrder(payload);
        orderId = res.data.id;
      }

      // Save signature to profile if requested
      if (saveSignature && form.signature_data) {
        try {
          console.log("Saving signature to profile...");
          await updateProfile({ digital_signature: form.signature_data });
          console.log("Signature saved successfully.");
        } catch (profileErr) {
          console.error("Failed to update profile signature:", profileErr);
          // Don't block the order if profile update fails, but maybe log it
        }
      }

      // Build item payloads — strip UI-only fields
      await Promise.all(items.map(it => {
        const itemPayload = {
          order:       orderId,
          material:    it.material   || null,
          description: it.description || (it.mode === 'catalog' && it.material
            ? (materials.find(m => m.id === it.material)?.name || '')
            : ''),
          quantity:    it.quantity,
          unit_price:  it.unit_price,
        };
        return it.id
          ? resourceApi.updatePurchaseItem(it.id, itemPayload)
          : resourceApi.createPurchaseItem(itemPayload);
      }));

      if (placeImmediately && (!isEdit || form.status === 'DRAFT')) {
        await resourceApi.updatePurchaseOrder(orderId, { status: 'ORDERED', send_email: true });
      }

      onDone();
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
        JSON.stringify(err?.response?.data) ||
        'Save failed.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-5">
      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold">
          {error}
        </div>
      )}

      {/* Order header fields */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">
            Order Number
          </label>
          <input 
            value={isEdit ? form.order_number : (form.order_number || 'Auto-generated')} 
            onChange={set('order_number')} 
            readOnly={!isEdit}
            className={`w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black bg-white text-gray-900 ${!isEdit ? 'bg-gray-50 text-gray-400 font-bold' : ''}`} 
          />
          {!isEdit && (
            <p className="text-[9px] text-gray-400 mt-1 italic font-medium">
              System will automatically assign a professional ID on save.
            </p>
          )}
        </div>
        <div>
          <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Supplier *</label>
          <select value={form.supplier} onChange={set('supplier')} required
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black bg-white text-gray-900">
            <option value="">Select supplier…</option>
            {(suppliers || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Order Date *</label>
          <input type="date" value={form.order_date} onChange={set('order_date')} required
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black bg-white text-gray-900" />
        </div>
        <div>
          <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Expected Date</label>
          <input type="date" value={form.expected_date} onChange={set('expected_date')}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black bg-white text-gray-900" />
        </div>
      </div>

      <div>
        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Notes</label>
        <textarea value={form.notes} onChange={set('notes')} rows={2}
          placeholder="Delivery instructions, payment terms…"
          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black bg-white text-gray-900 resize-none" />
      </div>

      {/* Line Items */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider">
            Line Items ({items.length})
          </label>
          <button type="button" onClick={addItem}
            className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-600 text-[10px] font-black rounded-lg hover:bg-gray-200 transition-colors">
            + Add Item
          </button>
        </div>

        <div className="space-y-2">
          {items.map((item, i) => (
            <LineItem
              key={i}
              item={item}
              index={i}
              materials={materials || []}
              onUpdate={updateItem}
              onRemove={removeItem}
              showRemove={items.length > 1}
            />
          ))}
        </div>

        {/* Total */}
        <div className="flex justify-end mt-3">
          <div className="bg-gray-900 text-white px-5 py-2.5 rounded-xl flex items-center gap-4">
            <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wider">
              {items.length} item{items.length !== 1 ? 's' : ''} · Total
            </span>
            <span className="text-sm font-black">
              NPR {totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>

        {(!isEdit || form.status === 'DRAFT') && (
          <div className="flex flex-col gap-4 mt-6 border-t border-gray-100 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider block mb-1">
                  Ordered By (Signed Name) *
                </label>
                <input
                  value={form.signature_name}
                  onChange={set('signature_name')}
                  placeholder="Enter full name"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                  required={placeImmediately}
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider block mb-1">
                  Digital Signature *
                </label>
                {(form.signature_data || user?.digital_signature) && !showSignaturePad ? (
                  <div className="p-3 border border-gray-100 rounded-lg bg-gray-50 flex flex-col items-center">
                    <img src={form.signature_data || user.digital_signature} alt="Signature" className="max-h-16 mb-2" />
                    <button 
                      type="button"
                      onClick={() => setShowSignaturePad(true)}
                      className="text-[10px] font-bold text-blue-600 hover:underline"
                    >
                      Change Signature
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <SignaturePad 
                      label=""
                      initialValue={form.signature_data}
                      onSave={data => {
                        setForm(f => ({ ...f, signature_data: data }));
                        setShowSignaturePad(false);
                      }}
                      onClear={() => setForm(f => ({ ...f, signature_data: '' }))}
                    />
                    {user?.digital_signature && (
                      <button 
                        type="button"
                        onClick={() => setShowSignaturePad(false)}
                        className="absolute top-0 right-0 text-[10px] font-bold text-gray-400 hover:text-gray-600"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                )}
                {!user?.digital_signature && form.signature_data && (
                  <label className="flex items-center gap-2 cursor-pointer text-[10px] font-bold text-slate-500">
                    <input 
                      type="checkbox" 
                      checked={saveSignature} 
                      onChange={(e) => setSaveSignature(e.target.checked)} 
                      className="rounded border-slate-300 text-slate-600 focus:ring-slate-500 w-3 h-3"
                    />
                    Save as my default signature for future orders
                  </label>
                )}
                {user?.digital_signature && form.signature_data === user.digital_signature && (
                  <p className="text-[10px] text-emerald-600 font-bold">
                    ✓ Using saved signature from your profile
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-600 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-100">
                <input 
                  type="checkbox" 
                  checked={placeImmediately} 
                  onChange={(e) => setPlaceImmediately(e.target.checked)} 
                  className="rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                Place Order & Email Supplier Immediately
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button type="button" onClick={onDone}
          className="px-4 py-2 text-xs font-black text-gray-500 hover:text-gray-800 transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={saving}
          className="px-6 py-2 bg-black text-white text-xs font-black rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-colors">
          {saving ? 'Saving…' : isEdit ? 'Update Order' : 'Create Order'}
        </button>
      </div>
    </form>
  );
}
