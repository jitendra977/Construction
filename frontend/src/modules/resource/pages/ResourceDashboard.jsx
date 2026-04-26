/**
 * ResourceDashboard — overview of the project's resources.
 */
import { useState, useEffect } from 'react';
import { useResource } from '../context/ResourceContext';
import resourceApi from '../services/resourceApi';
import StatusBadge from '../components/shared/StatusBadge';

const KpiCard = ({ icon, label, value, sub, color = 'gray' }) => {
  const colors = {
    green:  'bg-green-50 border-green-100',
    blue:   'bg-blue-50 border-blue-100',
    red:    'bg-red-50 border-red-100',
    yellow: 'bg-yellow-50 border-yellow-100',
    gray:   'bg-gray-50 border-gray-100',
  };
  const textColors = {
    green: 'text-green-700', blue: 'text-blue-700', red: 'text-red-700',
    yellow: 'text-yellow-700', gray: 'text-gray-700',
  };
  return (
    <div className={`rounded-2xl border p-5 ${colors[color]}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">{icon}</span>
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{label}</p>
      </div>
      <p className={`text-2xl font-black ${textColors[color]}`}>{value}</p>
      {sub && <p className="text-[10px] text-gray-400 mt-1">{sub}</p>}
    </div>
  );
};

export default function ResourceDashboard() {
  const { dashboard, materials, lowStockMaterials, workers, activeWorkers, suppliers, loading, projectId } = useResource();
  const [stockMovements, setStockMovements] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);

  useEffect(() => {
    if (!projectId) return;
    resourceApi.getStockMovements(projectId).then((r) => {
      const d = r.data?.results || r.data || [];
      setStockMovements(d.slice(0, 8));
    }).catch(() => {});
    resourceApi.getPurchaseOrders(projectId).then((r) => {
      const d = r.data?.results || r.data || [];
      setPurchaseOrders(d);
    }).catch(() => {});
  }, [projectId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin w-6 h-6 border-2 border-black border-t-transparent rounded-full" />
      </div>
    );
  }

  const dash = dashboard || {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-black text-gray-900">Resource Dashboard</h1>
        <p className="text-xs text-gray-400 mt-0.5">स्रोत सारांश</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard
          icon="🧱"
          label="Total Materials"
          value={dash.total_materials ?? materials.length}
          sub="types tracked"
          color="blue"
        />
        <KpiCard
          icon="⚠️"
          label="Low Stock Items"
          value={dash.low_stock_count ?? lowStockMaterials.length}
          sub="need restocking"
          color={lowStockMaterials.length > 0 ? 'red' : 'gray'}
        />
        <KpiCard
          icon="👷"
          label="Total Workers"
          value={dash.total_workers ?? workers.length}
          sub={`${activeWorkers.length} active`}
          color="gray"
        />
        <KpiCard
          icon="✅"
          label="Active Workers"
          value={dash.active_workers ?? activeWorkers.length}
          sub="on-site today"
          color="green"
        />
        <KpiCard
          icon="🏪"
          label="Total Suppliers"
          value={dash.total_suppliers ?? suppliers.length}
          sub="registered vendors"
          color="gray"
        />
        <KpiCard
          icon="📦"
          label="Purchase Orders"
          value={dash.total_purchase_orders ?? purchaseOrders.length}
          sub={`${purchaseOrders.filter(o => o.status === 'ORDERED').length} pending`}
          color="yellow"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Low Stock Materials */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <p className="text-xs font-black text-gray-700 uppercase tracking-wider mb-3">⚠️ Low Stock Materials</p>
          {lowStockMaterials.length ? (
            <div className="space-y-2">
              {lowStockMaterials.map((m) => (
                <div key={m.id} className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-xs font-semibold text-gray-700">{m.name}</p>
                    <StatusBadge status={m.category} type="material_category" />
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-red-600">{Number(m.stock_qty || 0).toLocaleString()} {m.unit}</p>
                    <p className="text-[9px] text-gray-400">reorder: {m.reorder_level}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 text-center py-4">All materials well-stocked ✓</p>
          )}
        </div>

        {/* Recent Stock Movements */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <p className="text-xs font-black text-gray-700 uppercase tracking-wider mb-3">📈 Recent Stock Movements</p>
          {stockMovements.length ? (
            <div className="space-y-2">
              {stockMovements.map((mv, i) => (
                <div key={mv.id || i} className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-xs font-semibold text-gray-700">{mv.material_name || mv.material}</p>
                    <p className="text-[9px] text-gray-400">{mv.reference || mv.notes || '—'}</p>
                  </div>
                  <span className={`text-xs font-black ${mv.movement_type === 'IN' ? 'text-green-600' : 'text-red-600'}`}>
                    {mv.movement_type === 'IN' ? '+' : '-'}{Number(mv.quantity || 0).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 text-center py-4">No stock movements yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
