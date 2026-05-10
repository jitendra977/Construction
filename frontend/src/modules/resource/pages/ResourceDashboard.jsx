/**
 * ResourceDashboard — premium "Command Center" overview.
 * Uses advanced visuals, glassmorphism, and full logistics analytics.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useResource } from '../context/ResourceContext';
import resourceApi from '../services/resourceApi';
import StatusBadge from '../shared/StatusBadge';

const fmt = (v) => Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
const fmtCurr = (v) => Number(v || 0).toLocaleString('en-IN', { style: 'currency', currency: 'NPR', maximumFractionDigits: 0 });

/* ── KPI Components ─────────────────────────────────────── */

function PremiumKpi({ icon, label, value, sub, color, onClick }) {
  const glowColors = {
    emerald: 'rgba(16, 185, 129, 0.1)',
    blue:    'rgba(59, 130, 246, 0.1)',
    amber:   'rgba(245, 158, 11, 0.1)',
    rose:    'rgba(244, 63, 94, 0.1)',
    indigo:  'rgba(99, 102, 241, 0.1)',
  };
  const textColors = {
    emerald: 'text-emerald-600',
    blue:    'text-blue-600',
    amber:   'text-amber-600',
    rose:    'text-rose-600',
    indigo:  'text-indigo-600',
  };

  return (
    <div 
      onClick={onClick}
      className={`card-glass p-6 group cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${onClick ? 'cursor-pointer' : ''}`}
      style={{ '--glow-color': glowColors[color] || 'rgba(0,0,0,0.05)' }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,var(--glow-color),transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-white shadow-sm border border-gray-100`}>
            {icon}
          </div>
          <div className="glow-dot opacity-0 group-hover:opacity-100" />
        </div>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
        <p className={`text-2xl font-black ${textColors[color] || 'text-gray-900'} tracking-tight`}>{value}</p>
        {sub && <p className="text-[10px] text-gray-400 font-bold mt-1.5 flex items-center gap-1.5">
          <span className="w-1 h-1 rounded-full bg-gray-300" /> {sub}
        </p>}
      </div>
    </div>
  );
}

export default function ResourceDashboard() {
  const navigate = useNavigate();
  const { dashboard, loading, projectId } = useResource();
  const [movements, setMovements] = useState([]);

  useEffect(() => {
    if (!projectId) return;
    resourceApi.getStockMovements(projectId).then(r => {
      setMovements((r.data?.results || r.data || []).slice(0, 8));
    }).catch(() => {});
  }, [projectId]);

  if (loading && !dashboard) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full shadow-lg" />
        <p className="text-xs font-black text-emerald-600 animate-pulse uppercase tracking-widest">Initialising Terminal...</p>
      </div>
    );
  }

  const d = dashboard || {};
  const mat = d.materials || {};
  const eq  = d.equipment || {};
  const lab = d.labor || {};
  const pur = d.purchases || {};

  // Compute inventory health %
  const stockHealth = mat.total > 0 
    ? Math.max(0, 100 - (mat.low_stock_count / mat.total * 100)) 
    : 100;

  return (
    <div className="relative space-y-8 pb-20">
      <div className="ambient-glow" />
      
      {/* ── Page Header ───────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="dynamic-header text-gray-900">Resource Command</h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="dynamic-subtitle text-emerald-600">Logistic Intelligence</p>
            <span className="text-gray-300">/</span>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Project #{projectId || '—'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 py-2 bg-white border border-gray-100 rounded-2xl shadow-sm">
          <div className="flex -space-x-2">
            {[1,2,3].map(i => (
              <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-gray-100 overflow-hidden">
                <img src={`https://i.pravatar.cc/100?u=${i}`} alt="user" />
              </div>
            ))}
          </div>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
            {lab.active_workers || 0} Team Members Active
          </p>
        </div>
      </div>

      {/* ── High-Level Analytics ─────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <PremiumKpi
          icon="🏦"
          label="Inventory Valuation"
          value={fmtCurr(mat.total_value)}
          sub="Total asset worth"
          color="indigo"
          onClick={() => navigate('materials')}
        />
        <PremiumKpi
          icon="🌡️"
          label="Stock Health"
          value={`${stockHealth.toFixed(0)}%`}
          sub={`${mat.low_stock_count || 0} items below threshold`}
          color={stockHealth < 80 ? 'rose' : 'emerald'}
          onClick={() => navigate('materials')}
        />
        <PremiumKpi
          icon="🏗️"
          label="Equipment Utilization"
          value={`${eq.total > 0 ? Math.round((eq.in_use / eq.total) * 100) : 0}%`}
          sub={`${eq.available || 0} units available`}
          color="blue"
          onClick={() => navigate('equipment')}
        />
        <PremiumKpi
          icon="📦"
          label="Pending Logistics"
          value={pur.ordered || 0}
          sub="Active shipments in transit"
          color="amber"
          onClick={() => navigate('purchases')}
        />
      </div>

      {/* ── Main Content Grid ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Resource Mix & Directory */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Materials Summary */}
            <div className="card-glass p-5 hover:border-emerald-200 transition-colors cursor-pointer" onClick={() => navigate('materials')}>
              <div className="flex items-center justify-between mb-6">
                <p className="text-[11px] font-black text-gray-500 uppercase tracking-widest">Inventory Ledger</p>
                <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">View List →</span>
              </div>
              <div className="flex items-end gap-3 mb-4">
                <p className="text-4xl font-black text-gray-900">{mat.total || 0}</p>
                <p className="text-xs font-bold text-gray-400 mb-1.5 uppercase">Material Types</p>
              </div>
              <div className="space-y-2.5">
                <div className="flex justify-between items-center text-[10px] font-bold">
                  <span className="text-gray-400 uppercase">Critical Scarcity</span>
                  <span className="text-rose-600">{mat.low_stock_count || 0} Items</span>
                </div>
                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full transition-all duration-1000" 
                    style={{ width: `${stockHealth}%` }} 
                  />
                </div>
              </div>
            </div>

            {/* Labor Summary */}
            <div className="card-glass p-5 hover:border-blue-200 transition-colors cursor-pointer" onClick={() => navigate('labor')}>
              <div className="flex items-center justify-between mb-6">
                <p className="text-[11px] font-black text-gray-500 uppercase tracking-widest">Workforce Status</p>
                <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">Attendance →</span>
              </div>
              <div className="flex items-end gap-3 mb-4">
                <p className="text-4xl font-black text-gray-900">{lab.total_workers || 0}</p>
                <p className="text-xs font-bold text-gray-400 mb-1.5 uppercase">Total Crew</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase mb-1">On-Site Now</p>
                  <p className="text-sm font-black text-blue-600">{lab.active_workers || 0}</p>
                </div>
                <div className="w-px h-8 bg-gray-100" />
                <div className="flex-1 text-right">
                  <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Suppliers</p>
                  <p className="text-sm font-black text-gray-700">{d.suppliers?.total || 0}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Stock Movements Feed */}
          <div className="card-glass overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50 bg-gray-50/30 flex items-center justify-between">
              <h3 className="text-[11px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Logistics Activity
              </h3>
              <button onClick={() => navigate('materials')} className="text-[10px] font-black text-emerald-600 hover:underline">
                Audit Trail →
              </button>
            </div>
            <div className="divide-y divide-gray-50">
              {movements.length > 0 ? movements.map((mv, i) => (
                <div key={mv.id || i} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50/50 transition-colors group">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs shrink-0 ${
                    mv.movement_type === 'IN' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                  }`}>
                    {mv.movement_type === 'IN' ? '↓' : '↑'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-gray-900 group-hover:text-emerald-600 transition-colors">
                      {mv.material_name || mv.material}
                    </p>
                    <p className="text-[10px] font-medium text-gray-400 truncate mt-0.5">
                      {mv.reference || mv.notes || 'Warehouse adjustment'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-xs font-black ${mv.movement_type === 'IN' ? 'text-green-600' : 'text-red-600'}`}>
                      {mv.movement_type === 'IN' ? '+' : '−'}{fmt(mv.quantity)}
                    </p>
                    <p className="text-[9px] font-bold text-gray-300 uppercase mt-0.5">
                      {new Date(mv.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              )) : (
                <div className="py-12 text-center">
                  <p className="text-xs font-bold text-gray-300">No activity recorded today.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Alerts & Quick Stats */}
        <div className="space-y-6">
          {/* Critical Alerts */}
          <div className="card-glass border-rose-100 p-5 bg-gradient-to-br from-white to-rose-50/30">
            <div className="flex items-center gap-2 mb-4 text-rose-600">
              <span className="text-lg">⚠️</span>
              <p className="text-[11px] font-black uppercase tracking-widest">Inventory Alerts</p>
            </div>
            <div className="space-y-3">
              {mat.low_stock_count > 0 ? (
                <div className="p-3 bg-white border border-rose-100 rounded-xl shadow-sm">
                  <p className="text-xs font-black text-gray-900">{mat.low_stock_count} Items Low Stock</p>
                  <p className="text-[10px] text-gray-500 mt-1">Project operation may be hindered by material shortages. Review procurement plan.</p>
                  <button 
                    onClick={() => navigate('materials')}
                    className="mt-3 w-full py-2 bg-rose-600 text-white text-[10px] font-black rounded-lg hover:bg-rose-700 transition-colors"
                  >
                    Resolve Shortage
                  </button>
                </div>
              ) : (
                <div className="p-4 text-center border-2 border-dashed border-emerald-100 rounded-xl">
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">Systems Nominal</p>
                  <p className="text-[9px] text-gray-400 mt-1">All stock levels are within safe operating parameters.</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Equipment Status */}
          <div className="card-glass p-5">
            <p className="text-[11px] font-black text-gray-500 uppercase tracking-widest mb-4">Equipment Fleet</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-2xl font-black text-emerald-600">{eq.available || 0}</p>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Ready</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-blue-600">{eq.in_use || 0}</p>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">In Use</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-50">
              <button 
                onClick={() => navigate('equipment')}
                className="w-full py-2 bg-gray-900 text-white text-[10px] font-black rounded-xl hover:bg-black transition-colors shadow-lg shadow-black/10"
              >
                Manage Fleet
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
