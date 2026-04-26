export default function SupplierList({ suppliers, onEdit }) {
  if (!suppliers.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
        <div className="text-4xl mb-3 opacity-40">🏪</div>
        <p className="text-sm font-bold text-gray-400">No suppliers found</p>
        <p className="text-xs text-gray-300 mt-1">Add suppliers to manage your vendors.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 text-[10px] font-black text-gray-500 uppercase tracking-wider">Supplier</th>
              <th className="text-left px-4 py-3 text-[10px] font-black text-gray-500 uppercase tracking-wider">Contact Person</th>
              <th className="text-left px-4 py-3 text-[10px] font-black text-gray-500 uppercase tracking-wider">Phone</th>
              <th className="text-left px-4 py-3 text-[10px] font-black text-gray-500 uppercase tracking-wider">Specialty</th>
              <th className="text-center px-4 py-3 text-[10px] font-black text-gray-500 uppercase tracking-wider">Active</th>
              <th className="text-right px-4 py-3 text-[10px] font-black text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((s) => (
              <tr key={s.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <p className="text-xs font-bold text-gray-900">{s.name}</p>
                  {s.email && <p className="text-[10px] text-gray-400">{s.email}</p>}
                </td>
                <td className="px-4 py-3 text-xs text-gray-600">{s.contact_person || '—'}</td>
                <td className="px-4 py-3 text-xs text-gray-600">{s.phone || '—'}</td>
                <td className="px-4 py-3">
                  {s.specialty ? (
                    <span className="px-2 py-0.5 bg-gray-100 border border-gray-200 text-[10px] font-bold text-gray-600 rounded-full">
                      {s.specialty}
                    </span>
                  ) : '—'}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-block w-2 h-2 rounded-full ${s.is_active ? 'bg-green-500' : 'bg-red-400'}`} />
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => onEdit(s)}
                    className="px-3 py-1 bg-gray-100 text-gray-600 text-[10px] font-black rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
