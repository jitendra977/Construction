import StatusBadge from '../shared/StatusBadge';

export default function MaterialCard({ material, onStockIn, onStockOut, onEdit }) {
  const {
    name,
    category,
    stock_qty,
    unit,
    unit_price,
    is_low_stock,
    reorder_level,
  } = material;

  return (
    <div className={`bg-white rounded-2xl border p-5 flex flex-col gap-3 ${is_low_stock ? 'border-red-200' : 'border-gray-200'}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-gray-900 truncate">{name}</p>
          <div className="mt-1">
            <StatusBadge status={category} type="material_category" />
          </div>
        </div>
        {is_low_stock && (
          <span className="flex-shrink-0 px-2 py-0.5 bg-red-50 border border-red-200 rounded-full text-[10px] font-black text-red-600 whitespace-nowrap">
            ⚠️ Low Stock
          </span>
        )}
      </div>

      {/* Stock info */}
      <div className="flex items-end justify-between bg-gray-50 rounded-xl p-3">
        <div>
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Stock</p>
          <p className={`text-xl font-black ${is_low_stock ? 'text-red-600' : 'text-gray-900'}`}>
            {Number(stock_qty || 0).toLocaleString()}
            <span className="text-xs font-semibold text-gray-400 ml-1">{unit}</span>
          </p>
          {reorder_level != null && (
            <p className="text-[9px] text-gray-400 mt-0.5">Reorder at: {reorder_level} {unit}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Unit Price</p>
          <p className="text-sm font-black text-gray-700">
            NPR {Number(unit_price || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onStockIn(material)}
          className="flex-1 px-3 py-2 bg-green-50 border border-green-200 text-green-700 text-xs font-black rounded-xl hover:bg-green-100 transition-colors"
        >
          + Stock In
        </button>
        <button
          onClick={() => onStockOut(material)}
          className="flex-1 px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-xs font-black rounded-xl hover:bg-red-100 transition-colors"
        >
          - Stock Out
        </button>
        <button
          onClick={() => onEdit(material)}
          className="px-3 py-2 bg-gray-100 text-gray-600 text-xs font-black rounded-xl hover:bg-gray-200 transition-colors"
        >
          Edit
        </button>
      </div>
    </div>
  );
}
