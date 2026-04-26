import { useState } from 'react';
import resourceApi from '../../services/resourceApi';
import { useResource } from '../../context/ResourceContext';

const SPECIALTIES = [
  'CEMENT', 'STEEL', 'SAND', 'BRICK', 'WOOD',
  'ELECTRICAL', 'PLUMBING', 'HARDWARE', 'PAINT', 'EQUIPMENT', 'GENERAL',
];

export default function SupplierForm({ supplier, onDone }) {
  const { projectId } = useResource();
  const isEdit = Boolean(supplier);

  const [form, setForm] = useState({
    name:           supplier?.name           || '',
    contact_person: supplier?.contact_person || '',
    phone:          supplier?.phone          || '',
    email:          supplier?.email          || '',
    address:        supplier?.address        || '',
    specialty:      supplier?.specialty      || 'GENERAL',
    notes:          supplier?.notes          || '',
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
        await resourceApi.updateSupplier(supplier.id, payload);
      } else {
        await resourceApi.createSupplier(payload);
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
          Company Name *
        </label>
        <input
          value={form.name}
          onChange={set('name')}
          required
          placeholder="e.g. Shiva Hardware Suppliers"
          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-black transition-colors"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Contact Person */}
        <div>
          <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">
            Contact Person
          </label>
          <input
            value={form.contact_person}
            onChange={set('contact_person')}
            placeholder="e.g. Suresh Sharma"
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-black transition-colors"
          />
        </div>

        {/* Specialty */}
        <div>
          <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">
            Specialty
          </label>
          <select
            value={form.specialty}
            onChange={set('specialty')}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-black transition-colors"
          >
            {SPECIALTIES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Phone */}
        <div>
          <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">
            Phone
          </label>
          <input
            value={form.phone}
            onChange={set('phone')}
            placeholder="e.g. 01-4567890"
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-black transition-colors"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">
            Email
          </label>
          <input
            type="email"
            value={form.email}
            onChange={set('email')}
            placeholder="supplier@example.com"
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-black transition-colors"
          />
        </div>
      </div>

      {/* Address */}
      <div>
        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">
          Address
        </label>
        <input
          value={form.address}
          onChange={set('address')}
          placeholder="e.g. New Road, Kathmandu"
          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-black transition-colors"
        />
      </div>

      {/* Notes */}
      <div>
        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">
          Notes
        </label>
        <textarea
          value={form.notes}
          onChange={set('notes')}
          rows={3}
          placeholder="Credit terms, delivery notes..."
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
          {saving ? 'Saving...' : isEdit ? 'Update Supplier' : 'Add Supplier'}
        </button>
      </div>
    </form>
  );
}
