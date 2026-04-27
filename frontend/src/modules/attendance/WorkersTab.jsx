/**
 * WorkersTab — worker roster with QR badge generation & printing.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import attendanceService from '../../services/attendanceService';
import WorkerHistoryModal from './WorkerHistoryModal';

const TRADES = ['MASON','HELPER','CARPENTER','ELECTRICIAN','PLUMBER','PAINTER',
  'STEEL_FIXER','SUPERVISOR','TILE_SETTER','EXCAVATOR','WATERPROOF',
  'DRIVER','SECURITY','ENGINEER','ACCOUNTANT','MANAGER','OTHER'];
const TRADE_LABELS = {
  MASON:'Mason (Dakarmi)', HELPER:'Helper (Jugi)', CARPENTER:'Carpenter (Mistri)',
  ELECTRICIAN:'Electrician', PLUMBER:'Plumber', PAINTER:'Painter',
  STEEL_FIXER:'Steel Fixer (Lohari)', SUPERVISOR:'Site Supervisor',
  TILE_SETTER:'Tile Setter', EXCAVATOR:'Excavator Operator',
  WATERPROOF:'Waterproofing Applicator', DRIVER:'Driver',
  SECURITY:'Security Guard', ENGINEER:'Engineer',
  ACCOUNTANT:'Accountant', MANAGER:'Project Manager', OTHER:'Other',
};
const ROLE_COLORS = {
  OWNER:'#f97316', MANAGER:'#f97316', ENGINEER:'#3b82f6',
  SUPERVISOR:'#8b5cf6', CONTRACTOR:'#10b981', VIEWER:'#64748b',
};
const EMPTY_FORM = {
  name:'', trade:'MASON', worker_type:'LABOUR',
  daily_rate:'', overtime_rate_per_hour:'', phone:'', joined_date:'', notes:'',
};

// ── QR Badge Modal ────────────────────────────────────────────────────────────
function QRBadgeModal({ worker, onClose }) {
  const [qrData, setQrData]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [regen, setRegen]     = useState(false);
  const printRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await attendanceService.getWorkerQRCode(worker.id);
      setQrData(d);
    } catch { setQrData(null); }
    finally { setLoading(false); }
  }, [worker.id]);

  useEffect(() => { load(); }, [load]);

  const handleRegenerate = async () => {
    if (!window.confirm('Regenerate QR? All previously printed badges for this worker will become invalid.')) return;
    setRegen(true);
    await attendanceService.regenerateQR(worker.id);
    await load();
    setRegen(false);
  };

  const handlePrint = () => {
    const w = window.open('', '_blank', 'width=400,height=500');
    w.document.write(`
      <html><head><title>QR Badge — ${worker.name}</title>
      <style>
        body { margin: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; font-family: sans-serif; background: #fff; }
        .badge { border: 2px solid #1a1a2e; border-radius: 16px; padding: 24px 28px; text-align: center; width: 280px; }
        .badge h2 { margin: 0 0 4px; font-size: 18px; font-weight: 900; color: #1a1a2e; }
        .badge p  { margin: 0 0 12px; font-size: 12px; color: #64748b; }
        .badge img { width: 200px; height: 200px; }
        .badge .tag { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 800; background: #1a1a2e; color: #fff; margin-top: 12px; }
        .badge .note { font-size: 10px; color: #94a3b8; margin-top: 10px; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      </style></head>
      <body><div class="badge">
        <h2>${worker.name}</h2>
        <p>${qrData?.trade || worker.trade_display}</p>
        <img src="${qrData?.qr_image}" alt="QR" />
        <div class="tag">${qrData?.project || 'Project'}</div>
        <p class="note">Scan to mark attendance</p>
      </div></body></html>
    `);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 400);
  };

  return (
    <div style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,0.6)',
      display:'flex', alignItems:'center', justifyContent:'center', zIndex:2000, padding:16,
    }}>
      <div style={{
        background:'var(--t-surface)', borderRadius:20, padding:28,
        width:'100%', maxWidth:400, border:'1px solid var(--t-border)',
        textAlign:'center',
      }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <h3 style={{ margin:0, fontSize:16, fontWeight:900, color:'var(--t-text)' }}>
            📱 QR Badge — {worker.name}
          </h3>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'var(--t-text3)' }}>✕</button>
        </div>

        {loading ? (
          <div style={{ padding:40, color:'var(--t-text3)' }}>Generating QR code…</div>
        ) : qrData ? (
          <>
            {/* Badge preview */}
            <div ref={printRef} style={{
              display:'inline-block', border:'2px solid var(--t-border)',
              borderRadius:16, padding:'20px 24px', background:'#fff',
              marginBottom:20,
            }}>
              <p style={{ margin:'0 0 4px', fontWeight:900, fontSize:16, color:'#1a1a2e' }}>
                {worker.name}
              </p>
              <p style={{ margin:'0 0 12px', fontSize:11, color:'#64748b' }}>
                {qrData.trade} · {qrData.project}
              </p>
              <img src={qrData.qr_image} alt="QR" style={{ width:180, height:180, display:'block', margin:'0 auto' }} />
              <p style={{ margin:'10px 0 0', fontSize:10, color:'#94a3b8' }}>
                Scan to mark attendance
              </p>
            </div>

            {/* Actions */}
            <div style={{ display:'flex', gap:10, marginBottom:14 }}>
              <button onClick={handlePrint} style={{
                flex:1, padding:'10px', borderRadius:10, fontWeight:800, fontSize:13,
                background:'#1a1a2e', color:'#fff', border:'none', cursor:'pointer',
              }}>🖨️ Print Badge</button>
              <button onClick={() => {
                const a = document.createElement('a');
                a.href = qrData.qr_image;
                a.download = `qr-${worker.name.replace(/\s+/g,'-')}.png`;
                a.click();
              }} style={{
                flex:1, padding:'10px', borderRadius:10, fontWeight:800, fontSize:13,
                background:'var(--t-bg)', color:'var(--t-text)',
                border:'1px solid var(--t-border)', cursor:'pointer',
              }}>⬇️ Download PNG</button>
            </div>

            <button onClick={handleRegenerate} disabled={regen} style={{
              width:'100%', padding:'8px', borderRadius:8, fontWeight:700, fontSize:12,
              border:'1px solid #ef4444', background:'rgba(239,68,68,0.06)',
              color:'#ef4444', cursor:'pointer', opacity: regen ? 0.6 : 1,
            }}>
              {regen ? 'Regenerating…' : '🔄 Regenerate QR (invalidates old badges)'}
            </button>
          </>
        ) : (
          <div style={{ padding:40, color:'#ef4444' }}>Failed to load QR code.</div>
        )}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function WorkersTab({ projectId }) {
  const [workers, setWorkers]           = useState([]);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [showForm, setShowForm]         = useState(false);
  const [editing, setEditing]           = useState(null);
  const [form, setForm]                 = useState(EMPTY_FORM);
  const [saving, setSaving]             = useState(false);
  const [filter, setFilter]             = useState('ALL');
  const [searchTerm, setSearchTerm]     = useState('');
  const [showImport, setShowImport]     = useState(false);
  const [unlinked, setUnlinked]         = useState([]);
  const [importRates, setImportRates]   = useState({});
  const [importing, setImporting]       = useState(null);
  const [qrWorker, setQrWorker]         = useState(null);  // worker for QR modal
  const [historyId, setHistoryId]       = useState(null);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const data = await attendanceService.getWorkers({ project: projectId });
      setWorkers(Array.isArray(data) ? data : data.results || []);
    } catch { setError('Failed to load workers.'); }
    finally  { setLoading(false); }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const deleteWorker = async (id) => {
    if (!window.confirm('Delete this worker and all their attendance records?')) return;
    try { await attendanceService.deleteWorker(id); load(); }
    catch { setError('Delete failed.'); }
  };

  const openImport = async () => {
    const data = await attendanceService.getUnlinkedTeamMembers(projectId);
    const list = Array.isArray(data) ? data : [];
    setUnlinked(list);
    const rates = {};
    list.forEach(m => { rates[m.member_id] = ''; });
    setImportRates(rates);
    setShowImport(true);
  };

  const doImport = async (member) => {
    setImporting(member.member_id);
    try {
      await attendanceService.importTeamMember({
        project: projectId, member_id: member.member_id,
        daily_rate: importRates[member.member_id] || 0, worker_type: 'STAFF',
      });
      setUnlinked(u => u.filter(m => m.member_id !== member.member_id));
      load();
    } catch (e) { setError(e.response?.data?.error || 'Import failed.'); }
    finally     { setImporting(null); }
  };

  const openEdit = (w) => {
    setEditing(w.id);
    setForm({
      name: w.name, trade: w.trade, worker_type: w.worker_type,
      daily_rate: w.daily_rate, overtime_rate_per_hour: w.overtime_rate_per_hour || '',
      phone: w.phone || '', joined_date: w.joined_date || '', notes: w.notes || '',
    });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = { ...form, project: projectId };
      if (editing) await attendanceService.updateWorker(editing, payload);
      else         await attendanceService.createWorker(payload);
      setShowForm(false);
      load();
    } catch (e) { setError(e.response?.data ? JSON.stringify(e.response.data) : 'Save failed.'); }
    finally     { setSaving(false); }
  };

  const toggleActive = async (w) => {
    try { await attendanceService.updateWorker(w.id, { is_active: !w.is_active }); load(); }
    catch { setError('Update failed.'); }
  };

  const displayed = workers.filter(w => {
    const matchType   = filter === 'ALL' || w.worker_type === filter;
    const matchSearch = w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        w.trade_display.toLowerCase().includes(searchTerm.toLowerCase());
    return matchType && matchSearch;
  });

  if (!projectId) return (
    <div style={{ padding:40, textAlign:'center', color:'var(--t-text3)' }}>Select a project first.</div>
  );

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16, flexWrap:'wrap' }}>
        <div style={{ display:'flex', gap:4 }}>
          {['ALL','LABOUR','STAFF'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding:'6px 14px', borderRadius:8, fontSize:12, fontWeight:700,
              border:'1px solid var(--t-border)',
              background: filter===f ? '#f97316' : 'var(--t-surface)',
              color: filter===f ? '#fff' : 'var(--t-text)', cursor:'pointer',
            }}>{f}</button>
          ))}
        </div>
        <input type="text" placeholder="Search worker…" value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)} style={{
            padding:'6px 12px', borderRadius:8, fontSize:12,
            border:'1px solid var(--t-border)', background:'var(--t-surface)',
            color:'var(--t-text)', width:180,
          }} />
        <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
          <button onClick={openImport} style={{
            padding:'8px 16px', borderRadius:10, fontSize:13, fontWeight:700,
            background:'var(--t-surface)', color:'#3b82f6',
            border:'1px solid #3b82f6', cursor:'pointer',
          }}>👥 Import from Team</button>
          <button onClick={() => { setEditing(null); setForm(EMPTY_FORM); setShowForm(true); }} style={{
            padding:'8px 18px', borderRadius:10, fontSize:13, fontWeight:800,
            background:'#f97316', color:'#fff', border:'none', cursor:'pointer',
          }}>+ Add Worker</button>
        </div>
      </div>

      {error && (
        <div style={{ padding:'8px 14px', borderRadius:8, background:'rgba(239,68,68,0.1)', color:'#ef4444', fontSize:13, marginBottom:12 }}>
          {error}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div style={{ padding:40, textAlign:'center', color:'var(--t-text3)' }}>Loading…</div>
      ) : displayed.length === 0 ? (
        <div style={{ padding:40, textAlign:'center', borderRadius:12, background:'var(--t-surface)', border:'1px solid var(--t-border)', color:'var(--t-text3)' }}>
          No workers yet. Click "+ Add Worker" to get started.
        </div>
      ) : (
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead>
              <tr style={{ background:'var(--t-surface)' }}>
                {['Name','Type','Trade','Daily Rate','OT Rate/hr','Phone','Status','QR',''].map(h => (
                  <th key={h} style={{
                    padding:'10px 12px', textAlign:'left', fontWeight:800, fontSize:11,
                    textTransform:'uppercase', letterSpacing:'0.05em',
                    color:'var(--t-text3)', borderBottom:'2px solid var(--t-border)',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayed.map((w, i) => (
                <tr key={w.id} style={{
                  borderBottom:'1px solid var(--t-border)',
                  opacity: w.is_active ? 1 : 0.5,
                  background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.02)',
                }}>
                  <td style={{ padding:'10px 12px', fontWeight:700, color:'var(--t-text)' }}>{w.name}</td>
                  <td style={{ padding:'10px 12px' }}>
                    <span style={{
                      padding:'2px 8px', borderRadius:6, fontSize:11, fontWeight:700,
                      background: w.worker_type==='STAFF' ? 'rgba(59,130,246,0.1)' : 'rgba(249,115,22,0.1)',
                      color: w.worker_type==='STAFF' ? '#3b82f6' : '#f97316',
                    }}>{w.worker_type}</span>
                  </td>
                  <td style={{ padding:'10px 12px', color:'var(--t-text3)' }}>{w.trade_display}</td>
                  <td style={{ padding:'10px 12px', fontWeight:700 }}>NPR {Number(w.daily_rate).toLocaleString()}</td>
                  <td style={{ padding:'10px 12px', color:'var(--t-text3)' }}>
                    {Number(w.overtime_rate_per_hour) > 0
                      ? `NPR ${Number(w.overtime_rate_per_hour).toLocaleString()}`
                      : <span style={{ color:'#10b981', fontSize:11 }}>Auto (1.5×)</span>}
                  </td>
                  <td style={{ padding:'10px 12px', color:'var(--t-text3)' }}>{w.phone || '—'}</td>
                  <td style={{ padding:'10px 12px' }}>
                    <button onClick={() => toggleActive(w)} style={{
                      padding:'3px 10px', borderRadius:6, fontSize:11, fontWeight:700,
                      border:`1px solid ${w.is_active ? '#10b981' : '#ef4444'}`,
                      background: w.is_active ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                      color: w.is_active ? '#10b981' : '#ef4444', cursor:'pointer',
                    }}>{w.is_active ? 'Active' : 'Inactive'}</button>
                  </td>
                  {/* QR button */}
                  <td style={{ padding:'10px 12px' }}>
                    <button onClick={() => setQrWorker(w)} title="Show QR Badge" style={{
                      padding:'4px 10px', borderRadius:6, fontSize:13, fontWeight:700,
                      border:'1px solid #f97316', background:'rgba(249,115,22,0.08)',
                      color:'#f97316', cursor:'pointer',
                    }}>📱 QR</button>
                  </td>
                  <td style={{ padding:'10px 12px' }}>
                    <div style={{ display:'flex', gap:6 }}>
                      <button onClick={() => openEdit(w)} style={{
                        padding:'4px 10px', borderRadius:6, fontSize:12, fontWeight:700,
                        border:'1px solid var(--t-border)', background:'var(--t-bg)',
                        color:'var(--t-text)', cursor:'pointer',
                      }}>✏️</button>
                      <button onClick={() => setHistoryId(w.id)} style={{
                        padding:'4px 10px', borderRadius:6, fontSize:12, fontWeight:700,
                        border:'1px solid var(--t-border)', background:'var(--t-bg)',
                        color:'var(--t-text3)', cursor:'pointer',
                      }}>🕒</button>
                      <button onClick={() => deleteWorker(w.id)} style={{
                        padding:'4px 10px', borderRadius:6, fontSize:12, fontWeight:700,
                        border:'1px solid rgba(239,68,68,0.2)', background:'rgba(239,68,68,0.05)',
                        color:'#ef4444', cursor:'pointer',
                      }}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* QR Badge Modal */}
      {qrWorker && <QRBadgeModal worker={qrWorker} onClose={() => setQrWorker(null)} />}

      {/* History Modal */}
      {historyId && <WorkerHistoryModal workerId={historyId} onClose={() => setHistoryId(null)} />}

      {/* Import Modal */}
      {showImport && (
        <div style={{
          position:'fixed', inset:0, background:'rgba(0,0,0,0.5)',
          display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:16,
        }}>
          <div style={{
            background:'var(--t-surface)', borderRadius:16, padding:28,
            width:'100%', maxWidth:540, maxHeight:'90vh', overflowY:'auto',
            border:'1px solid var(--t-border)',
          }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
              <h3 style={{ margin:0, fontSize:16, fontWeight:800, color:'var(--t-text)' }}>👥 Import from Project Team</h3>
              <button onClick={() => setShowImport(false)} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'var(--t-text3)' }}>✕</button>
            </div>
            {unlinked.length === 0 ? (
              <div style={{ textAlign:'center', padding:'30px 0', color:'var(--t-text3)', fontSize:14 }}>
                All team members are already imported.
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                <p style={{ margin:'0 0 12px', fontSize:12, color:'var(--t-text3)' }}>
                  Set daily rate then click Import.
                </p>
                {unlinked.map(m => (
                  <div key={m.member_id} style={{
                    display:'flex', alignItems:'center', gap:12, padding:'12px 14px',
                    borderRadius:10, border:'1px solid var(--t-border)', background:'var(--t-bg)',
                  }}>
                    <div style={{
                      width:36, height:36, borderRadius:'50%', flexShrink:0,
                      background: ROLE_COLORS[m.role] || '#64748b',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      color:'#fff', fontWeight:800, fontSize:14,
                    }}>{m.name.charAt(0).toUpperCase()}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:700, fontSize:13, color:'var(--t-text)' }}>{m.name}</div>
                      <div style={{ fontSize:11, color:'var(--t-text3)' }}>
                        <span style={{ padding:'1px 6px', borderRadius:4, fontWeight:700, marginRight:6,
                          background:`${ROLE_COLORS[m.role]||'#64748b'}22`, color:ROLE_COLORS[m.role]||'#64748b' }}>
                          {m.role}
                        </span>
                        {m.email}
                      </div>
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:2, flexShrink:0 }}>
                      <label style={{ fontSize:10, fontWeight:700, color:'var(--t-text3)', textTransform:'uppercase' }}>Daily Rate</label>
                      <input type="number" placeholder="NPR"
                        value={importRates[m.member_id] || ''}
                        onChange={e => setImportRates(r => ({ ...r, [m.member_id]: e.target.value }))}
                        style={{ width:90, padding:'5px 8px', borderRadius:7, border:'1px solid var(--t-border)', background:'var(--t-surface)', color:'var(--t-text)', fontSize:12, textAlign:'right' }} />
                    </div>
                    <button onClick={() => doImport(m)} disabled={importing===m.member_id} style={{
                      padding:'7px 14px', borderRadius:8, fontSize:12, fontWeight:800,
                      background: importing===m.member_id ? '#94a3b8' : '#3b82f6',
                      color:'#fff', border:'none', cursor:'pointer', flexShrink:0,
                    }}>{importing===m.member_id ? '…' : 'Import'}</button>
                  </div>
                ))}
              </div>
            )}
            <div style={{ marginTop:20, textAlign:'right' }}>
              <button onClick={() => setShowImport(false)} style={{
                padding:'9px 22px', borderRadius:10, fontWeight:700, fontSize:13,
                border:'1px solid var(--t-border)', background:'var(--t-bg)', color:'var(--t-text)', cursor:'pointer',
              }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showForm && (
        <div style={{
          position:'fixed', inset:0, background:'rgba(0,0,0,0.5)',
          display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:16,
        }}>
          <div style={{
            background:'var(--t-surface)', borderRadius:16, padding:28,
            width:'100%', maxWidth:480, maxHeight:'90vh', overflowY:'auto',
            border:'1px solid var(--t-border)',
          }}>
            <h3 style={{ margin:'0 0 20px', fontSize:16, fontWeight:800, color:'var(--t-text)' }}>
              {editing ? '✏️ Edit Worker' : '➕ Add Worker'}
            </h3>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {[
                { label:'Name *', key:'name', type:'text' },
                { label:'Phone', key:'phone', type:'text' },
                { label:'Daily Rate (NPR)', key:'daily_rate', type:'number' },
                { label:'OT Rate/hour (NPR, 0=auto 1.5×)', key:'overtime_rate_per_hour', type:'number' },
                { label:'Joining Date', key:'joined_date', type:'date' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize:11, fontWeight:700, color:'var(--t-text3)', textTransform:'uppercase' }}>{f.label}</label>
                  <input type={f.type} value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} style={{
                    width:'100%', marginTop:4, padding:'8px 12px', borderRadius:8,
                    border:'1px solid var(--t-border)', background:'var(--t-bg)',
                    color:'var(--t-text)', fontSize:13, boxSizing:'border-box',
                  }} />
                </div>
              ))}
              <div>
                <label style={{ fontSize:11, fontWeight:700, color:'var(--t-text3)', textTransform:'uppercase' }}>Type</label>
                <select value={form.worker_type} onChange={e => setForm(p => ({ ...p, worker_type: e.target.value }))} style={{ width:'100%', marginTop:4, padding:'8px 12px', borderRadius:8, border:'1px solid var(--t-border)', background:'var(--t-bg)', color:'var(--t-text)', fontSize:13 }}>
                  <option value="LABOUR">Daily Labour</option>
                  <option value="STAFF">Salaried Staff</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:700, color:'var(--t-text3)', textTransform:'uppercase' }}>Trade / Role</label>
                <select value={form.trade} onChange={e => setForm(p => ({ ...p, trade: e.target.value }))} style={{ width:'100%', marginTop:4, padding:'8px 12px', borderRadius:8, border:'1px solid var(--t-border)', background:'var(--t-bg)', color:'var(--t-text)', fontSize:13 }}>
                  {TRADES.map(t => <option key={t} value={t}>{TRADE_LABELS[t]}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:700, color:'var(--t-text3)', textTransform:'uppercase' }}>Notes</label>
                <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} style={{ width:'100%', marginTop:4, padding:'8px 12px', borderRadius:8, border:'1px solid var(--t-border)', background:'var(--t-bg)', color:'var(--t-text)', fontSize:13, resize:'vertical', boxSizing:'border-box' }} />
              </div>
            </div>
            <div style={{ display:'flex', gap:10, marginTop:20 }}>
              <button onClick={() => setShowForm(false)} style={{ flex:1, padding:'10px', borderRadius:10, fontWeight:700, border:'1px solid var(--t-border)', background:'var(--t-bg)', color:'var(--t-text)', cursor:'pointer' }}>Cancel</button>
              <button onClick={save} disabled={saving || !form.name.trim()} style={{ flex:2, padding:'10px', borderRadius:10, fontWeight:800, background:'#f97316', color:'#fff', border:'none', cursor:'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Saving…' : editing ? 'Update Worker' : 'Add Worker'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
