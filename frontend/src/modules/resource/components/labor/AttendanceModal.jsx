/**
 * AttendanceModal — mark attendance for a worker.
 */
import { useState } from 'react';
import Modal from '../shared/Modal';
import resourceApi from '../../services/resourceApi';

const today = () => new Date().toISOString().slice(0, 10);

export default function AttendanceModal({ worker, onClose }) {
  const [form, setForm] = useState({
    date:           today(),
    is_present:     true,
    overtime_hours: '',
    notes:          '',
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState(null);

  const set = (k) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [k]: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await resourceApi.createAttendance({ ...form, worker: worker.id });
      onClose(true);
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
        JSON.stringify(err?.response?.data) ||
        'Failed to mark attendance.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={() => onClose(false)} title="Mark Attendance" maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {/* Worker info */}
        <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gray-900 text-white flex items-center justify-center text-sm font-black flex-shrink-0">
            {(worker.name || '?')[0].toUpperCase()}
          </div>
          <div>
            <p className="text-xs font-black text-gray-900">{worker.name}</p>
            <p className="text-[10px] text-gray-400">{worker.role} — NPR {Number(worker.daily_wage || 0).toLocaleString()}/day</p>
          </div>
        </div>

        {error && (
          <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold">
            {error}
          </div>
        )}

        {/* Date */}
        <div>
          <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">
            Date *
          </label>
          <input
            type="date"
            value={form.date}
            onChange={set('date')}
            required
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-black transition-colors"
          />
        </div>

        {/* Present toggle */}
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_present}
              onChange={set('is_present')}
              className="sr-only peer"
            />
            <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500" />
          </label>
          <div>
            <p className="text-xs font-black text-gray-700">
              {form.is_present ? 'Present' : 'Absent'}
            </p>
            <p className="text-[10px] text-gray-400">Toggle attendance status</p>
          </div>
        </div>

        {/* Overtime */}
        <div>
          <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">
            Overtime Hours
          </label>
          <input
            type="number"
            min="0"
            step="0.5"
            value={form.overtime_hours}
            onChange={set('overtime_hours')}
            placeholder="0"
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
            rows={2}
            placeholder="Optional..."
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-black transition-colors resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => onClose(false)}
            className="px-4 py-2 text-xs font-black text-gray-500 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-black text-white text-xs font-black rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Mark Attendance'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
