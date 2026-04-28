/**
 * WorkerHistoryModal — High-Fidelity Monthly Service Record
 * ─────────────────────────────────────────────────────────────────────────────
 * Provides a detailed audit of a worker's attendance, OT, and earnings for a month.
 */
import React, { useState, useEffect, useCallback } from 'react';
import attendanceService from '../../services/attendanceService';

const STATUS_COLORS = {
  PRESENT: '#22c55e', 
  ABSENT: '#ef4444',
  HALFDAY: '#f59e0b', 
  HALF_DAY: '#f59e0b',
  LEAVE: '#6366f1', 
  HOLIDAY: '#94a3b8',
};

export default function WorkerHistoryModal({ workerId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

  const load = useCallback(async () => {
    if (!workerId) return;
    setLoading(true);
    setError('');
    try {
      // Assuming getWorkerHistory can take a month param or we filter client-side.
      // Based on the previous code, it returned all records. I'll add month filtering logic.
      const d = await attendanceService.getWorkerHistory(workerId);
      
      // Filter records for the selected month (unless 'total' is selected)
      const filteredRecords = selectedMonth === 'total' 
        ? d.records 
        : d.records.filter(r => r.date.startsWith(selectedMonth));
      
      // Re-calculate stats
      const stats = filteredRecords.reduce((acc, r) => {
        if (r.status === 'PRESENT') acc.present_days += 1;
        else if (r.status === 'ABSENT') acc.absent_days += 1;
        else if (r.status === 'HALFDAY' || r.status === 'HALF_DAY') acc.half_days += 1;
        
        acc.total_ot += parseFloat(r.overtime_hours || 0);
        acc.total_wage += parseFloat(r.wage_earned || 0);
        
        // Take daily wage from snapshots (latest record usually first due to order)
        if (!acc.daily_wage && r.daily_rate_snapshot) {
          acc.daily_wage = parseFloat(r.daily_rate_snapshot);
        }
        return acc;
      }, { present_days: 0, absent_days: 0, half_days: 0, total_ot: 0, total_wage: 0, daily_wage: 0 });

      setData({ ...d, records: filteredRecords, monthStats: stats });
    } catch (err) {
      setError('System could not retrieve historical data.');
    } finally {
      setLoading(false);
    }
  }, [workerId, selectedMonth]);

  useEffect(() => { load(); }, [load]);

  const handlePrint = () => {
    const w = window.open('', '_blank');
    w.document.write(`
      <html><head><title>Service Record - ${data.worker}</title>
      <style>
        body { font-family: sans-serif; padding: 40px; color: #333; }
        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
        .title { font-size: 24px; font-weight: 900; text-transform: uppercase; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background: #f4f4f4; text-align: left; padding: 12px; border: 1px solid #ddd; font-size: 12px; }
        td { padding: 12px; border: 1px solid #ddd; font-size: 13px; }
        .summary { margin-top: 30px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; }
        .stat-box { border: 1px solid #000; padding: 15px; text-align: center; }
      </style></head>
      <body>
        <div class="header">
          <div>
            <div class="title">Worker Service Record</div>
            <div style="font-size: 18px; font-weight: 700; margin-top: 5px;">${data.worker}</div>
            <div style="color: #666; font-size: 14px;">Month: ${selectedMonth}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-weight: 800;">Statement Date</div>
            <div>${new Date().toLocaleDateString()}</div>
          </div>
        </div>
        <table>
          <thead><tr><th>Date</th><th>Status</th><th>Check In</th><th>Check Out</th><th>OT</th></tr></thead>
          <tbody>
            ${data.records.map(r => {
              let totalHrs = '—';
              if (r.check_in && r.check_out) {
                const [h1, m1] = r.check_in.split(':').map(Number);
                const [h2, m2] = r.check_out.split(':').map(Number);
                totalHrs = ((h2 + m2/60) - (h1 + m1/60)).toFixed(1) + 'h';
              }
              return `
                <tr>
                  <td>${r.date}</td>
                  <td>${r.status}</td>
                  <td>${r.check_in || '—'}</td>
                  <td>${r.check_out || '—'}</td>
                  <td>${totalHrs}</td>
                  <td>${r.overtime_hours || 0}h</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
        <div class="summary">
          <div class="stat-box"><strong>Daily Wage</strong><br/>Rs. ${data.monthStats.daily_wage.toLocaleString()}</div>
          <div class="stat-box"><strong>Present / Absent</strong><br/>${data.monthStats.present_days} / ${data.monthStats.absent_days}</div>
          <div class="stat-box"><strong>Total OT</strong><br/>${data.monthStats.total_ot}h</div>
          <div class="stat-box" style="background:#f0fff4;"><strong>Net Payable</strong><br/>Rs. ${Math.round(data.monthStats.total_wage).toLocaleString()}</div>
        </div>
      </body></html>
    `);
    w.document.close();
    w.print();
  };

  if (!workerId) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1200, background: 'rgba(0,0,0,0.4)',
      backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
    }}>
      <div style={{
        background: 'var(--t-surface)', width: '100%', maxWidth: 720, borderRadius: 24,
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)', border: '1px solid var(--t-border)',
        maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden'
      }}>
        
        {/* Header */}
        <div style={{ padding: '24px 30px', borderBottom: '1px solid var(--t-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: 'var(--t-text)' }}>Personnel Service Record</h3>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--t-text3)', fontWeight: 700 }}>{data?.worker || 'Loading worker profile...'}</p>
          </div>
          <button onClick={onClose} style={{ background: 'var(--t-surface2)', border: '1px solid var(--t-border)', width: 32, height: 32, borderRadius: 8, cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 30 }}>
          {/* Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <select 
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                style={{ padding: '10px 14px', borderRadius: 12, border: '1px solid var(--t-border)', background: 'var(--t-bg)', fontWeight: 900, fontSize: 14, cursor: 'pointer' }}
              >
                <option value="total">📊 All Time (Cumulative)</option>
                {Array.from({ length: 12 }).map((_, i) => {
                  const d = new Date();
                  d.setMonth(d.getMonth() - i);
                  const val = d.toISOString().slice(0, 7);
                  const isCurrent = i === 0;
                  return (
                    <option key={val} value={val}>
                      {d.toLocaleString('default', { month: 'long', year: 'numeric' })} 
                      {isCurrent ? ' (Current Month)' : ''}
                    </option>
                  );
                })}
              </select>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--t-text3)' }}>
                {selectedMonth === 'total' ? 'Full Historical Audit' : 'Focused Monthly Report'}
              </span>
            </div>
            {!loading && (
              <button onClick={handlePrint} style={{ padding: '10px 20px', borderRadius: 12, border: 'none', background: '#000', color: '#fff', fontSize: 12, fontWeight: 900, cursor: 'pointer' }}>
                🖨️ Print Statement
              </button>
            )}
          </div>

          {loading ? (
            <div style={{ padding: 60, textAlign: 'center', color: 'var(--t-text3)' }}>Synchronizing records...</div>
          ) : error ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#ef4444', fontWeight: 700 }}>{error}</div>
          ) : (
            <>
              {/* Monthly Stats Summary */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 30 }}>
                <StatBox label="Daily Wage" value={`Rs. ${data.monthStats.daily_wage.toLocaleString()}`} icon="🏷️" color="var(--t-text)" />
                <StatBox label="Present / Absent" value={`${data.monthStats.present_days} / ${data.monthStats.absent_days}`} icon="✅" color="#3b82f6" />
                <StatBox label="Total OT" value={`${data.monthStats.total_ot}h`} icon="⚡" color="#8b5cf6" />
                <StatBox label="Net Payable" value={`Rs. ${Math.round(data.monthStats.total_wage).toLocaleString()}`} icon="💰" color="#10b981" />
              </div>

              {/* Records Table */}
              <div style={{ border: '1px solid var(--t-border)', borderRadius: 16, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead style={{ background: 'var(--t-bg)', borderBottom: '1px solid var(--t-border)' }}>
                    <tr>
                      {['Date', 'Status', 'In/Out', 'Total', 'OT'].map(h => (
                        <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 10, fontWeight: 900, color: 'var(--t-text3)', textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.records.length === 0 ? (
                      <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: 'var(--t-text3)' }}>No entries for this month.</td></tr>
                    ) : data.records.map(r => {
                      let totalHrs = '—';
                      if (r.check_in && r.check_out) {
                        const [h1, m1] = r.check_in.split(':').map(Number);
                        const [h2, m2] = r.check_out.split(':').map(Number);
                        totalHrs = ((h2 + m2/60) - (h1 + m1/60)).toFixed(1) + 'h';
                      }
                      return (
                        <tr key={r.id} style={{ borderBottom: '1px solid var(--t-border)' }}>
                          <td style={{ padding: '12px 16px', fontWeight: 800 }}>{r.date.split('-').slice(1).join('/')}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ 
                              padding: '4px 8px', borderRadius: 6, fontSize: 9, fontWeight: 900,
                              background: `${STATUS_COLORS[r.status] || '#ccc'}15`, color: STATUS_COLORS[r.status] || '#666'
                            }}>{r.status}</span>
                          </td>
                          <td style={{ padding: '12px 16px', color: 'var(--t-text3)', fontSize: 11 }}>
                            {r.check_in ? `${r.check_in} — ${r.check_out || '??'}` : '—'}
                          </td>
                          <td style={{ padding: '12px 16px', fontWeight: 700 }}>{totalHrs}</td>
                          <td style={{ padding: '12px 16px', color: '#8b5cf6', fontWeight: 700 }}>{r.overtime_hours > 0 ? `${r.overtime_hours}h` : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div style={{ padding: '24px 30px', borderTop: '1px solid var(--t-border)', background: 'var(--t-surface2)', textAlign: 'right' }}>
          <button onClick={onClose} style={{ padding: '10px 30px', borderRadius: 12, border: '1px solid var(--t-border)', background: 'var(--t-bg)', fontWeight: 900, fontSize: 13, cursor: 'pointer' }}>
            Close Record
          </button>
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, icon, color }) {
  return (
    <div style={{ background: 'var(--t-bg)', padding: 16, borderRadius: 16, border: '1px solid var(--t-border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 900, color: 'var(--t-text3)', textTransform: 'uppercase' }}>{label}</span>
        <span>{icon}</span>
      </div>
      <div style={{ fontSize: 18, fontWeight: 900, color: color }}>{value}</div>
    </div>
  );
}
