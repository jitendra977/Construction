/**
 * AttendanceLogsTab — Advanced Management View
 * ─────────────────────────────────────────────────────────────────────────────
 * Provides a searchable, editable list of historical attendance records.
 */
import React, { useState, useEffect, useCallback } from 'react';
import attendanceService from '../../services/attendanceService';
import Modal from '../resource/components/shared/Modal';

const STATUS_COLORS = {
  PRESENT: '#22c55e',
  ABSENT: '#ef4444',
  HALFDAY: '#f59e0b',
  HALF_DAY: '#f59e0b',
  LEAVE: '#6366f1',
  HOLIDAY: '#94a3b8'
};

export default function AttendanceLogsTab({ projectId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingLog, setEditingLog] = useState(null);
  const [filters, setFilters] = useState({
    date: new Date().toISOString().split('T')[0],
    searchTerm: ''
  });

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      // Fetching records for the selected date
      const data = await attendanceService.getRecords({ project: projectId, date: filters.date });
      setLogs(data.results || data || []);
    } catch (err) {
      console.error("Failed to load logs:", err);
    } finally {
      setLoading(false);
    }
  }, [projectId, filters.date]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this record?')) return;
    try {
      await attendanceService.deleteRecord(id);
      load();
    } catch (err) {
      alert('Failed to delete record.');
    }
  };

  const filteredLogs = logs.filter(l => 
    l.worker_name?.toLowerCase().includes(filters.searchTerm.toLowerCase())
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      
      {/* Filters Bar */}
      <div style={{ display:'flex', gap:12, alignItems:'center', background:'var(--t-bg)', padding:12, borderRadius:16, border:'1px solid var(--t-border)' }}>
        <div style={{ flex:1, position:'relative' }}>
          <span style={{ position:'absolute', left:12, top:10 }}>🔍</span>
          <input 
            type="text" 
            placeholder="Search by worker name..." 
            value={filters.searchTerm}
            onChange={e => setFilters({...filters, searchTerm: e.target.value})}
            style={{ width:'100%', padding:'10px 14px 10px 36px', borderRadius:10, border:'1px solid var(--t-border)', background:'var(--t-surface)', fontSize:13 }}
          />
        </div>
        <input 
          type="date" 
          value={filters.date}
          onChange={e => setFilters({...filters, date: e.target.value})}
          style={{ padding:'10px 14px', borderRadius:10, border:'1px solid var(--t-border)', background:'var(--t-surface)', fontSize:13, fontWeight:700 }}
        />
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:40, color:'var(--t-text3)' }}>Fetching records...</div>
      ) : (
        <div style={{ background:'var(--t-surface)', borderRadius:20, border:'1px solid var(--t-border)', overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead>
              <tr style={{ background:'var(--t-bg)', borderBottom:'1px solid var(--t-border)' }}>
                {['Worker', 'Status', 'In', 'Out', 'OT', 'Method', 'Actions'].map(h => (
                  <th key={h} style={{ padding:'14px 16px', textAlign:'left', fontSize:11, fontWeight:800, color:'var(--t-text3)', textTransform:'uppercase', letterSpacing:'0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr><td colSpan={7} style={{ padding:40, textAlign:'center', color:'var(--t-text3)' }}>No records found for this date.</td></tr>
              ) : filteredLogs.map(l => (
                <tr key={l.id} style={{ borderBottom:'1px solid var(--t-border)' }}>
                  <td style={{ padding:'14px 16px' }}>
                    <div style={{ fontWeight:700 }}>{l.worker_name}</div>
                    <div style={{ fontSize:10, color:'var(--t-text3)' }}>{l.trade}</div>
                  </td>
                  <td style={{ padding:'14px 16px' }}>
                    <span style={{ 
                      padding:'4px 10px', borderRadius:8, fontSize:10, fontWeight:900, 
                      background:`${STATUS_COLORS[l.status] || '#ccc'}15`, color:STATUS_COLORS[l.status] || '#666'
                    }}>
                      {l.status}
                    </span>
                  </td>
                  <td style={{ padding:'14px 16px', fontWeight:600 }}>{l.check_in || '—'}</td>
                  <td style={{ padding:'14px 16px', fontWeight:600 }}>{l.check_out || '—'}</td>
                  <td style={{ padding:'14px 16px', color:'#f97316', fontWeight:800 }}>{l.overtime_hours > 0 ? `${l.overtime_hours}h` : '—'}</td>
                  <td style={{ padding:'14px 16px', fontSize:11, color:'var(--t-text3)' }}>{l.check_in_method === 'QR' ? '📱 QR' : '✍️ Manual'}</td>
                  <td style={{ padding:'14px 16px' }}>
                    <div style={{ display:'flex', gap:8 }}>
                      <button onClick={() => setEditingLog(l)} style={miniBtnStyle}>✏️</button>
                      <button onClick={() => handleDelete(l.id)} style={{ ...miniBtnStyle, color:'#ef4444' }}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editingLog && (
        <Modal isOpen={true} onClose={() => setEditingLog(null)} title="Edit Record">
           <EditRecordForm 
             record={editingLog} 
             onDone={() => { setEditingLog(null); load(); }} 
           />
        </Modal>
      )}
    </div>
  );
}

function EditRecordForm({ record, onDone }) {
  const [form, setForm] = useState({
    status: record.status,
    check_in: (record.check_in || '').slice(0, 5),
    check_out: (record.check_out || '').slice(0, 5),
    overtime_hours: record.overtime_hours || 0,
    note: record.note || ''
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await attendanceService.updateRecord(record.id, form);
      onDone();
    } catch (err) {
      alert('Failed to update record.');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = { width:'100%', padding:'12px', borderRadius:12, border:'1px solid var(--t-border)', background:'var(--t-bg)', color:'var(--t-text)', fontSize:14 };

  return (
    <form onSubmit={handleSubmit} style={{ padding:24, display:'flex', flexDirection:'column', gap:20 }}>
      <div>
        <label style={labelStyle}>Status</label>
        <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} style={inputStyle}>
          {['PRESENT', 'ABSENT', 'HALFDAY', 'LEAVE'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        <div>
          <label style={labelStyle}>Check In</label>
          <input type="time" value={form.check_in} onChange={e => setForm({...form, check_in: e.target.value})} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Check Out</label>
          <input type="time" value={form.check_out} onChange={e => setForm({...form, check_out: e.target.value})} style={inputStyle} />
        </div>
      </div>
      <div>
        <label style={labelStyle}>Overtime Hours</label>
        <input type="number" step="0.5" value={form.overtime_hours} onChange={e => setForm({...form, overtime_hours: e.target.value})} style={inputStyle} />
      </div>
      <div>
        <label style={labelStyle}>Admin Note</label>
        <textarea value={form.note} onChange={e => setForm({...form, note: e.target.value})} style={{ ...inputStyle, height:80, resize:'none' }} placeholder="Reason for manual edit..." />
      </div>
      <button disabled={saving} type="submit" style={{ padding:14, borderRadius:14, border:'none', background:'#000', color:'#fff', fontWeight:900, fontSize:14, cursor:'pointer' }}>
        {saving ? 'Saving...' : 'Update Record'}
      </button>
    </form>
  );
}

const labelStyle = { display:'block', fontSize:10, fontWeight:800, color:'var(--t-text3)', textTransform:'uppercase', marginBottom:6 };
const miniBtnStyle = { width:32, height:32, borderRadius:8, border:'1px solid var(--t-border)', background:'var(--t-bg)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 };
