/**
 * MonthlyReportTab — Advanced Master Attendance Sheet
 * ─────────────────────────────────────────────────────────────────────────────
 * Provides a bird's-eye view of the entire workforce's monthly performance.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import attendanceService from '../../services/attendanceService';
import WorkerHistoryModal from './WorkerHistoryModal';

const STATUS_MAP = {
  PRESENT: { short: 'P', color: '#22c55e', label: 'Present' },
  ABSENT:  { short: 'A', color: '#ef4444', label: 'Absent' },
  HALFDAY: { short: 'H', color: '#f59e0b', label: 'Half Day' },
  LEAVE:   { short: 'L', color: '#6366f1', label: 'Leave' },
  HOLIDAY: { short: 'HO', color: '#94a3b8', label: 'Holiday' }
};

export default function MonthlyReportTab({ projectId }) {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [data, setData] = useState({ workers: [], records: [] });
  const [loading, setLoading] = useState(true);
  const [selectedWorker, setSelectedWorker] = useState(null);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const [summary, recs] = await Promise.all([
        attendanceService.getMonthlySummary(projectId, month),
        attendanceService.getRecords({ project: projectId, month })
      ]);
      setData({ 
        workers: summary.workers || [], 
        records: Array.isArray(recs) ? recs : recs.results || [] 
      });
    } catch (err) {
      console.error("Failed to load monthly master sheet:", err);
    } finally {
      setLoading(false);
    }
  }, [projectId, month]);

  useEffect(() => { load(); }, [load]);

  const { days, gridMap } = useMemo(() => {
    const [y, m] = month.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const dayArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    
    const map = {};
    data.records.forEach(r => {
      const day = parseInt(r.date.split('-')[2]);
      if (!map[r.worker]) map[r.worker] = {};
      map[r.worker][day] = r;
    });
    
    return { days: dayArray, gridMap: map };
  }, [month, data.records]);

  if (!projectId) return <div style={emptyStyle}>Select a project to view master sheet.</div>;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
      
      {/* Top Bar */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ display:'flex', gap:12, alignItems:'center' }}>
          <input 
            type="month" 
            value={month}
            onChange={e => setMonth(e.target.value)}
            style={{ padding:'10px 14px', borderRadius:12, border:'1px solid var(--t-border)', background:'var(--t-surface)', fontWeight:900, fontSize:14 }}
          />
          <div style={{ fontSize:12, color:'var(--t-text3)', fontWeight:700 }}>
            {data.workers.length} Personnel · {days.length} Operating Days
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
           {Object.entries(STATUS_MAP).map(([key, cfg]) => (
             <div key={key} style={{ display:'flex', alignItems:'center', gap:4 }}>
               <div style={{ width:8, height:8, borderRadius:'50%', background:cfg.color }} />
               <span style={{ fontSize:10, fontWeight:800, color:'var(--t-text3)', textTransform:'uppercase' }}>{cfg.short}</span>
             </div>
           ))}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:60, color:'var(--t-text3)' }}>Compiling monthly records...</div>
      ) : (
        <div style={{ 
          background:'var(--t-surface)', borderRadius:20, border:'1px solid var(--t-border)', 
          overflow:'hidden', boxShadow:'0 10px 30px rgba(0,0,0,0.05)' 
        }}>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
              <thead>
                <tr style={{ background:'var(--t-bg)', borderBottom:'1px solid var(--t-border)' }}>
                  <th style={{ ...stickyCol, padding:'16px 20px', minWidth:180, textAlign:'left', zIndex:20 }}>PERSONNEL</th>
                  {days.map(d => {
                    const dateObj = new Date(month.split('-')[0], month.split('-')[1]-1, d);
                    const isSaturday = dateObj.getDay() === 6;
                    
                    const todayDate = new Date();
                    const isToday = todayDate.getDate() === d && 
                                    todayDate.getMonth() === (month.split('-')[1]-1) && 
                                    todayDate.getFullYear() === parseInt(month.split('-')[0]);

                    return (
                      <th 
                        key={d} 
                        style={{ 
                          padding:'8px 4px', minWidth:32, textAlign:'center', 
                          fontWeight:900, 
                          color: isToday ? '#1d4ed8' : (isSaturday ? '#ef4444' : 'var(--t-text3)'),
                          background: isToday ? 'rgba(59,130,246,0.25)' : (isSaturday ? 'rgba(239,68,68,0.05)' : 'transparent'),
                          borderBottom: isToday ? '4px solid #1d4ed8' : 'none',
                          borderRadius: isToday ? '8px 8px 0 0' : '0',
                          boxShadow: isToday ? 'inset 0 -2px 0 rgba(0,0,0,0.1)' : 'none'
                        }}
                      >
                        {d}
                        <div style={{ fontSize:7, opacity:0.8, color: isToday ? '#1d4ed8' : 'inherit' }}>{dateObj.toLocaleDateString('en-US', { weekday: 'short' }).slice(0,2)}</div>
                      </th>
                    );
                  })}
                  <th style={{ padding:'16px 20px', minWidth:80, textAlign:'center', fontWeight:900, color:'var(--t-text3)' }}>TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {data.workers.length === 0 ? (
                  <tr><td colSpan={days.length + 2} style={{ padding:60, textAlign:'center', color:'var(--t-text3)' }}>No personnel records for this period.</td></tr>
                ) : data.workers.map(w => {
                  const workerRecords = gridMap[w.worker_id] || {};
                  return (
                    <tr key={w.worker_id} style={{ borderBottom:'1px solid var(--t-border)', transition:'background 0.2s' }}>
                      <td 
                        onClick={() => setSelectedWorker(w.worker_id)}
                        style={{ ...stickyCol, padding:'12px 20px', fontWeight:800, cursor:'pointer' }}
                        onMouseOver={e => e.currentTarget.style.background = 'var(--t-bg)'}
                        onMouseOut={e => e.currentTarget.style.background = 'var(--t-surface)'}
                      >
                        <div style={{ color:'var(--t-text)', display:'flex', alignItems:'center', gap:6 }}>
                          {w.worker_name}
                          <span style={{ fontSize:10 }}>🔗</span>
                        </div>
                        <div style={{ fontSize:9, color:'var(--t-text3)', textTransform:'uppercase' }}>{w.trade}</div>
                      </td>
                      {days.map(d => {
                        const rec = workerRecords[d];
                        const cfg = rec ? STATUS_MAP[rec.status] : null;
                        const isPresent = rec?.status === 'PRESENT';
                        
                        const dateObj = new Date(month.split('-')[0], month.split('-')[1]-1, d);
                        const isSaturday = dateObj.getDay() === 6;
                        const todayDate = new Date();
                        const isToday = todayDate.getDate() === d && 
                                        todayDate.getMonth() === (month.split('-')[1]-1) && 
                                        todayDate.getFullYear() === parseInt(month.split('-')[0]);

                        return (
                          <td key={d} style={{ 
                            padding:1, textAlign:'center', 
                            background: isToday ? 'rgba(59,130,246,0.12)' : (isSaturday ? 'rgba(0,0,0,0.02)' : 'transparent'),
                            borderLeft: isToday ? '1px solid rgba(59,130,246,0.2)' : 'none',
                            borderRight: isToday ? '1px solid rgba(59,130,246,0.2)' : 'none',
                          }}>
                            <div style={{ 
                              width:28, height:28, margin:'0 auto', borderRadius:4, 
                              display:'flex', alignItems:'center', justifyContent:'center',
                              fontSize:10, fontWeight:900,
                              background: cfg ? (isPresent ? `${cfg.color}15` : cfg.color) : 'transparent',
                              color: cfg ? (isPresent ? cfg.color : '#fff') : 'transparent',
                              border: cfg ? (isPresent ? `1px solid ${cfg.color}30` : 'none') : (isToday ? '1px dashed #1d4ed8' : '1px dashed var(--t-border)'),
                              boxShadow: cfg && !isPresent ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
                            }}>
                              {cfg ? cfg.short : '·'}
                            </div>
                          </td>
                        );
                      })}
                      <td style={{ padding:'12px 20px', textAlign:'center' }}>
                        <div style={{ fontWeight:900, color:'#10b981' }}>{w.days_present}P</div>
                        <div style={{ fontSize:9, color:'var(--t-text3)' }}>{Math.round(w.total_overtime_hours)}h OT</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer Legend / Actions */}
          <div style={{ padding:'16px 20px', background:'var(--t-bg)', borderTop:'1px solid var(--t-border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ display:'flex', gap:16 }}>
               {Object.entries(STATUS_MAP).map(([key, cfg]) => (
                 <div key={key} style={{ display:'flex', alignItems:'center', gap:8 }}>
                   <div style={{ 
                     width:24, height:24, borderRadius:4, 
                     background: key === 'PRESENT' ? `${cfg.color}15` : cfg.color, 
                     display:'flex', alignItems:'center', justifyContent:'center', 
                     fontSize:10, fontWeight:900, 
                     color: key === 'PRESENT' ? cfg.color : '#fff',
                     border: key === 'PRESENT' ? `1px solid ${cfg.color}30` : 'none'
                   }}>
                     {cfg.short}
                   </div>
                   <span style={{ fontSize:11, fontWeight:700, color:'var(--t-text3)' }}>{cfg.label}</span>
                 </div>
               ))}
            </div>
            <button 
              onClick={() => window.print()}
              style={{ padding:'8px 16px', borderRadius:10, border:'1px solid var(--t-border)', background:'var(--t-surface)', fontSize:12, fontWeight:800, cursor:'pointer' }}
            >
              📥 Export PDF
            </button>
          </div>
        </div>
      )}

      {/* Financial Summary Card */}
      {!loading && data.workers.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:24 }}>
          <div style={{ background:'var(--t-surface)', padding:24, borderRadius:20, border:'1px solid var(--t-border)' }}>
             <h4 style={{ margin:'0 0 16px', fontSize:14, fontWeight:900 }}>💰 Monthly Payroll Outlook</h4>
             <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:20 }}>
                <div style={sumBox}>
                  <div style={sumLabel}>Basic Wages</div>
                  <div style={sumVal}>NPR {Math.round(data.workers.reduce((a,b)=>a + parseFloat(b.total_wage || 0), 0)).toLocaleString()}</div>
                </div>
                <div style={sumBox}>
                  <div style={sumLabel}>Overtime Pay</div>
                  <div style={sumVal}>NPR {Math.round(data.workers.reduce((a,b)=>a + parseFloat(b.total_overtime_pay || 0), 0)).toLocaleString()}</div>
                </div>
                <div style={{ ...sumBox, background:'rgba(16,185,129,0.05)', borderColor:'#10b981' }}>
                  <div style={sumLabel}>Grand Total</div>
                  <div style={{ ...sumVal, color:'#10b981' }}>NPR {Math.round(data.workers.reduce((a,b)=>a + parseFloat(b.grand_total || 0), 0)).toLocaleString()}</div>
                </div>
             </div>
          </div>
          <div style={{ background:'var(--t-surface)', padding:24, borderRadius:20, border:'1px solid var(--t-border)', display:'flex', flexDirection:'column', justifyContent:'center', textAlign:'center' }}>
             <div style={{ fontSize:32, marginBottom:8 }}>📊</div>
             <div style={{ fontWeight:900, fontSize:18 }}>{ (data.workers.reduce((a,b)=>a+b.days_present, 0) / (data.workers.length * days.length) * 100).toFixed(1) }%</div>
             <div style={{ fontSize:11, fontWeight:700, color:'var(--t-text3)', textTransform:'uppercase' }}>Overall Attendance Rate</div>
          </div>
        </div>
      )}

      {selectedWorker && (
        <WorkerHistoryModal 
          workerId={selectedWorker} 
          onClose={() => setSelectedWorker(null)} 
        />
      )}

    </div>
  );
}

const stickyCol = { position:'sticky', left:0, background:'var(--t-surface)', borderRight:'1px solid var(--t-border)' };
const emptyStyle = { padding:60, textAlign:'center', color:'var(--t-text3)', fontSize:14 };
const sumBox = { padding:16, borderRadius:16, border:'1px solid var(--t-border)', background:'var(--t-bg)' };
const sumLabel = { fontSize:10, fontWeight:800, color:'var(--t-text3)', textTransform:'uppercase', marginBottom:4 };
const sumVal = { fontSize:16, fontWeight:900 };
