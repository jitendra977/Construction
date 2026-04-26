import { useState } from 'react';
import resourceApi from '../../services/resourceApi';
import { useResource } from '../../context/ResourceContext';

const ROLES = [
  'MASON', 'CARPENTER', 'ELECTRICIAN', 'PLUMBER',
  'PAINTER', 'HELPER', 'SUPERVISOR', 'ENGINEER', 'OTHER',
];

export default function WorkerForm({ worker, onDone }) {
  const { projectId } = useResource();
  const isEdit = Boolean(worker);

  const [form, setForm] = useState({
    name:       worker?.name       || '',
    role:       worker?.role       || 'HELPER',
    daily_wage: worker?.daily_wage || '',
    phone:      worker?.phone      || '',
    address:    worker?.address    || '',
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
        await resourceApi.updateWorker(worker.id, payload);
      } else {
        await resourceApi.createWorker(payload);
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
          Full Name *
        </label>
        <input
          value={form.name}
          onChange={set('name')}
          required
          placeholder="e.g. Ram Bahadur Tamang"
          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-black transition-colors"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Role */}
        <div>
          <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">
            Role *
          </label>
          <select
            value={form.role}
            onChange={set('role')}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-black transition-colors"
          >
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        {/* Daily Wage */}
        <div>
          <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">
            Daily Wage (NPR) *
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.daily_wage}
            onChange={set('daily_wage')}
            required
            placeholder="0.00"
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-black transition-colors"
          />
        </div>
      </div>

      {/* Phone */}
      <div>
        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">
          Phone
        </label>
        <input
          value={form.phone}
          onChange={set('phone')}
          placeholder="e.g. 9841234567"
          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-black transition-colors"
        />
      </div>

      {/* Address */}
      <div>
        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">
          Address
        </label>
        <textarea
          value={form.address}
          onChange={set('address')}
          rows={2}
          placeholder="Home address..."
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
          {saving ? 'Saving...' : isEdit ? 'Update Worker' : 'Add Worker'}
        </button>
      </div>
    </form>
  );
}
