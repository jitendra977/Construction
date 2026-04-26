import { useState } from 'react';
import resourceApi from '../../services/resourceApi';
import { useResource } from '../../context/ResourceContext';

const CATEGORIES = ['CEMENT', 'STEEL', 'SAND', 'BRICK', 'WOOD', 'ELECTRICAL', 'PLUMBING', 'OTHER'];
const UNITS = ['kg', 'ton', 'bag', 'pcs', 'ft', 'm', 'm2', 'm3', 'ltr', 'bundle', 'box', 'roll'];

export default function MaterialForm({ material, onDone }) {
  const { projectId } = useResource();
  const isEdit = Boolean(material);

  const [form, setForm] = useState({
    name:          material?.name          || '',
    category:      material?.category      || 'CEMENT',
    unit:          material?.unit          || 'bag',
    unit_price:    material?.unit_price    || '',
    reorder_level: material?.reorder_level || '',
    description:   material?.description   || '',
  });
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = { ...form, project: projectId };
      if (isEdit) {
        await resourceApi.updateMaterial(material.id, payload);
      } else {
        await resourceApi.createMaterial(payload);
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
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold">
          {error}
        </div>
      )}

      {/* Name */}
      <div>
        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">
          Material Name *
        </label>
        <input
          value={form.name}
          onChange={set('name')}
          required
          placeholder="e.g. OPC Cement 43 Grade"
          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-black transition-colors"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Category */}
        <div>
          <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">
            Category *
          </label>
          <select
            value={form.category}
            onChange={set('category')}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-black transition-colors"
          >
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Unit */}
        <div>
          <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">
            Unit *
          </label>
          <select
            value={form.unit}
            onChange={set('unit')}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-black transition-colors"
          >
            {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Unit Price */}
        <div>
          <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">
            Unit Price (NPR) *
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.unit_price}
            onChange={set('unit_price')}
            required
            placeholder="0.00"
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-black transition-colors"
          />
        </div>

        {/* Reorder Level */}
        <div>
          <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">
            Reorder Level
          </label>
          <input
            type="number"
            min="0"
            value={form.reorder_level}
            onChange={set('reorder_level')}
            placeholder="e.g. 50"
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-black transition-colors"
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">
          Description
        </label>
        <textarea
          value={form.description}
          onChange={set('description')}
          rows={3}
          placeholder="Optional notes..."
          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-black transition-colors resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onDone}
          className="px-4 py-2 text-xs font-black text-gray-500 hover:text-gray-800 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2 bg-black text-white text-xs font-black rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving...' : isEdit ? 'Update Material' : 'Create Material'}
        </button>
      </div>
    </form>
  );
}
