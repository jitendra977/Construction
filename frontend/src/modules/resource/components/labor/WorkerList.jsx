import StatusBadge from '../shared/StatusBadge';

export default function WorkerList({ workers, onEdit, onAttendance }) {
  if (!workers.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
        <div className="text-4xl mb-3 opacity-40">👷</div>
        <p className="text-sm font-bold text-gray-400">No workers found</p>
        <p className="text-xs text-gray-300 mt-1">Add workers to track labor.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 text-[10px] font-black text-gray-500 uppercase tracking-wider">Name</th>
              <th className="text-left px-4 py-3 text-[10px] font-black text-gray-500 uppercase tracking-wider">Role</th>
              <th className="text-right px-4 py-3 text-[10px] font-black text-gray-500 uppercase tracking-wider">Daily Wage</th>
              <th className="text-left px-4 py-3 text-[10px] font-black text-gray-500 uppercase tracking-wider">Phone</th>
              <th className="text-right px-4 py-3 text-[10px] font-black text-gray-500 uppercase tracking-wider">Days Worked</th>
              <th className="text-right px-4 py-3 text-[10px] font-black text-gray-500 uppercase tracking-wider">Total Earnings</th>
              <th className="text-right px-4 py-3 text-[10px] font-black text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {workers.map((w) => (
              <tr key={w.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gray-900 text-white flex items-center justify-center text-[10px] font-black flex-shrink-0">
                      {(w.name || '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900">{w.name}</p>
                      {!w.is_active && (
                        <span className="text-[9px] text-red-500 font-bold">Inactive</span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={w.role} type="worker_role" />
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-xs font-bold text-gray-700">
                    NPR {Number(w.daily_wage || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{w.phone || '—'}</td>
                <td className="px-4 py-3 text-right">
                  <span className="text-xs font-bold text-gray-700">{w.total_days_worked || 0}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-xs font-bold text-gray-700">
                    NPR {Number(w.total_earnings || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => onAttendance(w)}
                      className="px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-black rounded-lg hover:bg-blue-100 transition-colors whitespace-nowrap"
                    >
                      Attendance
                    </button>
                    <button
                      onClick={() => onEdit(w)}
                      className="px-2.5 py-1 bg-gray-100 text-gray-600 text-[10px] font-black rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Edit
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
