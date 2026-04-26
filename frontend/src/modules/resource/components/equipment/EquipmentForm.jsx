import { useState } from 'react';
import resourceApi from '../../services/resourceApi';
import { useResource } from '../../context/ResourceContext';

const EQUIPMENT_TYPES = [
  'EXCAVATOR', 'CRANE', 'BULLDOZER', 'MIXER', 'GENERATOR',
  'COMPACTOR', 'TRUCK', 'LOADER', 'DRILL', 'SCAFFOLDING', 'OTHER',
];
const STATUSES = ['AVAILABLE', 'IN_USE', 'MAINTENANCE', 'RETIRED'];

export default function EquipmentForm({ equipment, onDone }) {
  const { projectId } = useResource();
  const isEdit = Boolean(equipment);

  const [form, setForm] = useState({
    name:           equipment?.name           || '',
    equipment_type: equipment?.equipment_type || 'OTHER',
    status:         equipment?.status         || 'AVAILABLE',
    daily_rate:     equipment?.daily_rate     || '',
    quantity:       equipment?.quantity       || 1,
    description:    equipment?.description    || '',
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = { ...form, project: projectId };
      if (isEdit) {
        await resourceApi.updateEquipment(equipment.id, payload);
      } else {
        await resourceApi.createEquipment(payload);
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
          Equipment Name *
        </label>
        <input
          value={form.name}
          onChange={set('name')}
          required
          placeholder="e.g. JCB Excavator 3DX"
          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-black transition-colors"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Type */}
        <div>
          <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">
            Equipment Type *
          </label>
          <select
            value={form.equipment_type}
            onChange={set('equipment_type')}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-black transition-colors"
          >
            {EQUIPMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Status */}
        <div>
          <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">
            Status *
          </label>
          <select
            value={form.status}
            onChange={set('status')}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-black transition-colors"
          >
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Daily Rate */}
        <div>
          <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">
            Daily Rate (NPR) *
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.daily_rate}
            onChange={set('daily_rate')}
            required
            placeholder="0.00"
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-black transition-colors"
          />
        </div>

        {/* Quantity */}
        <div>
          <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">
            Quantity
          </label>
          <input
            type="number"
            min="1"
            value={form.quantity}
            onChange={set('quantity')}
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
          {saving ? 'Saving...' : isEdit ? 'Update Equipment' : 'Add Equipment'}
        </button>
      </div>
    </form>
  );
}
