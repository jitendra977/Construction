import StatusBadge from '../shared/StatusBadge';

export default function EquipmentCard({ equipment, onEdit }) {
  const {
    name,
    equipment_type,
    status,
    daily_rate,
    quantity,
    description,
  } = equipment;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-gray-900 truncate">{name}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="px-2 py-0.5 bg-gray-100 border border-gray-200 text-[10px] font-bold text-gray-600 rounded-full">
              {equipment_type}
            </span>
            <StatusBadge status={status} type="equipment_status" />
          </div>
        </div>
        <button
          onClick={() => onEdit(equipment)}
          className="flex-shrink-0 px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-black rounded-xl hover:bg-gray-200 transition-colors"
        >
          Edit
        </button>
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Daily Rate</p>
          <p className="text-sm font-black text-gray-700">
            NPR {Number(daily_rate || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Quantity</p>
          <p className="text-sm font-black text-gray-700">{quantity || 1} units</p>
        </div>
      </div>

      {description && (
        <p className="text-[11px] text-gray-400 leading-relaxed">{description}</p>
      )}
    </div>
  );
}
