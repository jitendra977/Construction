/**
 * ResourceDashboard — premium "Command Center" overview.
 * Uses advanced visuals, glassmorphism, and full logistics analytics.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useResource } from '../context/ResourceContext';
import resourceApi from '../services/resourceApi';
import StatusBadge from '../components/shared/StatusBadge';

const fmt = (v) => Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const fmtCurr = (v) => Number(v || 0).toLocaleString('en-IN', { style: 'currency', currency: 'NPR', maximumFractionDigits: 0 });

/* ── KPI Components ─────────────────────────────────────── */

function PremiumKpi({ icon, label, value, sub, color, onClick }) {
  const glowColors = {
    emerald: 'rgba(16, 185, 129, 0.15)',
    blue:    'rgba(59, 130, 246, 0.15)',
    amber:   'rgba(245, 158, 11, 0.15)',
    rose:    'rgba(244, 63, 94, 0.15)',
    indigo:  'rgba(99, 102, 241, 0.15)',
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
      className={`card-glass p-6 group cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] hud-border`}
      style={{ '--glow-color': glowColors[color] || 'rgba(0,0,0,0.05)' }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,var(--glow-color),transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-white shadow-sm border border-gray-100 group-hover:border-${color}-200 transition-colors`}>
            {icon}
          </div>
          <div className="glow-dot opacity-20 group-hover:opacity-100 transition-opacity" />
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
      setMovements((r.data?.results || r.data || []).slice(0, 10));
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
        <div className="animate-in fade-in slide-in-from-left duration-700">
          <h1 className="dynamic-header text-gray-900">Resource Command</h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="dynamic-subtitle text-emerald-600">Logistic Intelligence</p>
            <span className="text-gray-300">/</span>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Project #{projectId || '—'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 py-2 bg-white border border-gray-100 rounded-2xl shadow-sm animate-in fade-in slide-in-from-right duration-700">
          <div className="flex -space-x-2">
            {[1,2,3].map(i => (
              <div key={i} className="w-7 h-7 rounded-full border-2 border-white bg-gray-100 overflow-hidden shadow-sm">
                <img src={`https://i.pravatar.cc/100?u=${i+20}`} alt="user" />
              </div>
            ))}
          </div>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
            {lab.active_workers || 0} Team Members Active
          </p>
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-1" />
        </div>
      </div>

      {/* ── High-Level Analytics ─────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom duration-500 delay-100">
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
            <div className="card-glass p-6 hover:border-emerald-200 transition-all cursor-pointer group" onClick={() => navigate('materials')}>
              <div className="flex items-center justify-between mb-6">
                <p className="text-[11px] font-black text-gray-500 uppercase tracking-widest">Inventory Ledger</p>
                <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full group-hover:bg-emerald-600 group-hover:text-white transition-all">View List →</span>
              </div>
              <div className="flex items-end gap-3 mb-4">
                <p className="text-4xl font-black text-gray-900 group-hover:text-emerald-600 transition-colors">{mat.total || 0}</p>
                <p className="text-xs font-bold text-gray-400 mb-1.5 uppercase">Material Types</p>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-[10px] font-bold">
                  <span className="text-gray-400 uppercase">System Integrity</span>
                  <span className={stockHealth < 80 ? 'text-rose-600' : 'text-emerald-600'}>
                    {stockHealth.toFixed(1)}% Nominal
                  </span>
                </div>
                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden shadow-inner">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ${stockHealth < 80 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                    style={{ width: `${stockHealth}%` }} 
                  />
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-[9px] text-gray-400 font-bold uppercase">Valuation: {fmtCurr(mat.total_value)}</p>
                  <p className="text-[9px] text-rose-500 font-black uppercase">{mat.low_stock_count} Low Stock</p>
                </div>
              </div>
            </div>

            {/* Labor Summary */}
            <div className="card-glass p-6 hover:border-blue-200 transition-all cursor-pointer group" onClick={() => navigate('labor')}>
              <div className="flex items-center justify-between mb-6">
                <p className="text-[11px] font-black text-gray-500 uppercase tracking-widest">Workforce Status</p>
                <span className="text-xs font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full group-hover:bg-blue-600 group-hover:text-white transition-all">Attendance →</span>
              </div>
              <div className="flex items-end gap-3 mb-4">
                <p className="text-4xl font-black text-gray-900 group-hover:text-blue-600 transition-colors">{lab.total_workers || 0}</p>
                <p className="text-xs font-bold text-gray-400 mb-1.5 uppercase">Total Crew</p>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase mb-1">On-Site Now</p>
                  <div className="flex items-center gap-2">
                    <p className="text-xl font-black text-blue-600">{lab.active_workers || 0}</p>
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                  </div>
                </div>
                <div className="w-px h-10 bg-gray-100" />
                <div className="flex-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Suppliers</p>
                  <p className="text-xl font-black text-gray-700">{d.suppliers?.total || 0}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Stock Movements Feed — Timeline Style */}
          <div className="card-glass overflow-hidden shadow-sm">
            <div className="px-6 py-5 border-b border-gray-50 bg-gray-50/20 flex items-center justify-between">
              <div>
                <h3 className="text-[11px] font-black text-gray-800 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping opacity-50" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 absolute" />
                  Live Logistics Timeline
                </h3>
                <p className="text-[9px] text-gray-400 font-bold uppercase mt-1">Real-time inventory flow</p>
              </div>
              <button onClick={() => navigate('materials')} className="text-[10px] font-black text-emerald-600 hover:text-emerald-700 transition-colors px-3 py-1.5 bg-emerald-50 rounded-lg">
                Full Audit Trail →
              </button>
            </div>
            <div className="p-6 relative">
              {/* Vertical line for timeline */}
              <div className="absolute left-10 top-8 bottom-8 w-px bg-gray-100" />
              
              <div className="space-y-8 relative">
                {movements.length > 0 ? movements.map((mv, i) => (
                  <div key={mv.id || i} className="flex items-start gap-4 group">
                    <div className="w-8 h-8 rounded-full bg-white border border-gray-100 shadow-sm flex items-center justify-center z-10 shrink-0 group-hover:border-emerald-200 group-hover:scale-110 transition-all">
                      <span className={`text-[10px] font-black ${mv.movement_type === 'IN' ? 'text-green-600' : 'text-red-600'}`}>
                        {mv.movement_type === 'IN' ? '↓' : '↑'}
                      </span>
                    </div>
                    <div className="flex-1 pt-0.5">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-black text-gray-900 group-hover:text-emerald-600 transition-colors">
                          {mv.material_name || "Unknown Material"}
                        </p>
                        <p className={`text-sm font-black ${mv.movement_type === 'IN' ? 'text-green-600' : 'text-red-600'}`}>
                          {mv.movement_type === 'IN' ? '+' : '−'}{fmt(mv.quantity)}
                        </p>
                      </div>
                      
                      <div className="flex flex-col mt-1 gap-1">
                        <div className="flex items-center gap-2">
                           <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">
                            {mv.reference || mv.notes || 'Warehouse adjustment'}
                          </p>
                          {mv.po_number && (
                            <span className="text-[9px] font-black bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded uppercase">
                              PO: {mv.po_number}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {mv.supplier_name && (
                              <p className="text-[9px] text-gray-400 font-bold uppercase italic">via {mv.supplier_name}</p>
                            )}
                            {mv.delivered_by && (
                              <p className="text-[9px] text-gray-400 font-bold uppercase italic">· {mv.delivered_by}</p>
                            )}
                          </div>
                          <p className="text-[10px] font-black text-gray-300 uppercase tabular-nums">
                            {new Date(mv.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
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
        </div>

        {/* Right Column: Alerts & Quick Stats */}
        <div className="space-y-6">
          {/* Critical Alerts */}
          <div className="card-glass border-rose-100 p-6 bg-gradient-to-br from-white to-rose-50/30 hud-border">
            <div className="flex items-center gap-2 mb-5 text-rose-600">
              <span className="text-xl">⚠️</span>
              <p className="text-[11px] font-black uppercase tracking-widest">Inventory Alerts</p>
            </div>
            <div className="space-y-4">
              {mat.low_stock_count > 0 ? (
                <div className="p-4 bg-white border border-rose-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                  <p className="text-xs font-black text-gray-900">{mat.low_stock_count} Items Low Stock</p>
                  <p className="text-[10px] text-gray-500 mt-1.5 leading-relaxed">Critical items have reached reorder thresholds. Procurement intervention required to avoid site delays.</p>
                  <button 
                    onClick={() => navigate('materials')}
                    className="mt-4 w-full py-2.5 bg-rose-600 text-white text-[10px] font-black rounded-xl hover:bg-rose-700 transition-all shadow-lg shadow-rose-200 uppercase tracking-widest"
                  >
                    Resolve Shortage
                  </button>
                </div>
              ) : (
                <div className="p-6 text-center border-2 border-dashed border-emerald-100 rounded-2xl bg-emerald-50/10">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                    <span className="text-emerald-600 text-lg">✓</span>
                  </div>
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">Systems Nominal</p>
                  <p className="text-[9px] text-gray-400 mt-1">All stock levels are optimal.</p>
                </div>
              )}
            </div>
          </div>

          {/* Equipment Fleet HUD */}
          <div className="card-glass p-6">
            <div className="flex items-center justify-between mb-6">
              <p className="text-[11px] font-black text-gray-500 uppercase tracking-widest">Equipment Fleet</p>
              <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
            </div>
            <div className="grid grid-cols-2 gap-6 relative">
              <div className="w-px h-8 bg-gray-100 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
              <div className="text-center group cursor-pointer" onClick={() => navigate('equipment')}>
                <p className="text-3xl font-black text-emerald-600 group-hover:scale-110 transition-transform">{eq.available || 0}</p>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">Available</p>
              </div>
              <div className="text-center group cursor-pointer" onClick={() => navigate('equipment')}>
                <p className="text-3xl font-black text-blue-600 group-hover:scale-110 transition-transform">{eq.in_use || 0}</p>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">In Use</p>
              </div>
            </div>
            <div className="mt-8 pt-6 border-t border-gray-50">
              <button 
                onClick={() => navigate('equipment')}
                className="w-full py-3 bg-gray-900 text-white text-[10px) font-black rounded-xl hover:bg-black transition-all shadow-lg shadow-black/10 uppercase tracking-widest"
              >
                Manage Fleet Status
              </button>
            </div>
          </div>

          {/* Mini Order Tracking */}
          <div className="card-glass p-6 bg-gradient-to-br from-amber-50/20 to-white">
            <p className="text-[11px] font-black text-amber-600 uppercase tracking-widest mb-4 flex items-center gap-2">
               🚚 Order Tracking
            </p>
            <div className="space-y-3">
              <div className="flex justify-between items-center px-3 py-2 bg-white border border-gray-100 rounded-xl">
                <span className="text-[10px] font-bold text-gray-500 uppercase">Ordered</span>
                <span className="text-sm font-black text-amber-600">{pur.ordered || 0}</span>
              </div>
              <div className="flex justify-between items-center px-3 py-2 bg-white border border-gray-100 rounded-xl">
                <span className="text-[10px] font-bold text-gray-500 uppercase">Received</span>
                <span className="text-sm font-black text-emerald-600">{pur.received || 0}</span>
              </div>
            </div>
            <button 
              onClick={() => navigate('purchases')}
              className="mt-4 w-full text-[10px] font-black text-gray-400 hover:text-gray-600 transition-colors uppercase tracking-widest"
            >
              Logistics Portal →
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
