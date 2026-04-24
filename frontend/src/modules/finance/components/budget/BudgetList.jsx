/**
 * BudgetList — shows budget categories with allocated vs spent.
 */
const fmt = (v) => Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

function pct(spent, allocated) {
  if (!allocated || allocated <= 0) return 0;
  return Math.min(100, (spent / allocated) * 100);
}

function barColor(p) {
  if (p >= 100) return 'bg-red-500';
  if (p >= 80)  return 'bg-yellow-400';
  return 'bg-green-400';
}

export default function BudgetList({ categories = [], allocations = [], onEdit }) {
  // Build a map: category_id → { allocated, spent }
  const allocMap = {};
  allocations.forEach((a) => {
    const id = a.category;
    if (!allocMap[id]) allocMap[id] = { allocated: 0, spent: 0 };
    allocMap[id].allocated += Number(a.allocated_amount || 0);
    allocMap[id].spent     += Number(a.spent_amount    || 0);
  });

  if (!categories.length) {
    return (
      <div className="text-center py-12">
        <p className="text-3xl mb-2">🎯</p>
        <p className="text-sm text-gray-500 font-semibold">No budget categories yet</p>
        <p className="text-xs text-gray-400 mt-1">Add categories to start tracking budget vs actuals.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {categories.map((cat) => {
        const { allocated = 0, spent = 0 } = allocMap[cat.id] || {};
        const remaining = allocated - spent;
        const p         = pct(spent, allocated);

        return (
          <div key={cat.id} className="bg-white border border-gray-200 rounded-2xl p-4 hover:shadow-sm transition-all">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="font-black text-sm text-gray-800">{cat.name}</p>
                {cat.description && <p className="text-[10px] text-gray-400 mt-0.5">{cat.description}</p>}
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${p >= 100 ? 'bg-red-50 text-red-600' : p >= 80 ? 'bg-yellow-50 text-yellow-600' : 'bg-green-50 text-green-600'}`}>
                  {p.toFixed(0)}%
                </span>
                <button onClick={() => onEdit(cat)} className="text-gray-300 hover:text-gray-600 text-sm">✏️</button>
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-3">
              <div className={`h-full rounded-full transition-all ${barColor(p)}`} style={{ width: `${p}%` }} />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Allocated</p>
                <p className="text-xs font-black text-gray-700">NPR {fmt(allocated)}</p>
              </div>
              <div>
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Spent</p>
                <p className={`text-xs font-black ${p >= 100 ? 'text-red-600' : 'text-gray-700'}`}>NPR {fmt(spent)}</p>
              </div>
              <div>
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Remaining</p>
                <p className={`text-xs font-black ${remaining < 0 ? 'text-red-600' : 'text-green-600'}`}>NPR {fmt(remaining)}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
