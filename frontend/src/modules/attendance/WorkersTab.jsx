/**
 * WorkersTab — Premium Redesign
 * ─────────────────────────────────────────────────────────────────────────────
 * A high-end staff management interface combining Workers & Manpower.
 */
import React, { useState, useEffect, useCallback } from 'react';
import attendanceService from '../../services/attendanceService';
import workforceService from '../../services/workforceService';
import WorkerHistoryModal from './WorkerHistoryModal';
import IDCardModal from '../workforce/components/IDCardModal';

const TRADES = ['MASON','HELPER','CARPENTER','ELECTRICIAN','PLUMBER','PAINTER',
  'STEEL_FIXER','SUPERVISOR','TILE_SETTER','EXCAVATOR','WATERPROOF',
  'DRIVER','SECURITY','ENGINEER','ACCOUNTANT','MANAGER','OTHER'];

const TRADE_ICONS = {
  MASON: '🧱', HELPER: '🤝', CARPENTER: '🪚', ELECTRICIAN: '⚡', PLUMBER: '🔧',
  PAINTER: '🎨', STEEL_FIXER: '🏗️', SUPERVISOR: '🦺', TILE_SETTER: '📐',
  EXCAVATOR: '🚜', WATERPROOF: '💧', DRIVER: '🚛', SECURITY: '🛡️',
  ENGINEER: '⚙️', ACCOUNTANT: '📑', MANAGER: '💼', OTHER: '👷'
};

const EMPTY_FORM = {
  name:'', trade:'MASON', worker_type:'LABOUR',
  daily_rate:'', overtime_rate_per_hour:'', phone:'', joined_date:'', notes:'',
  role_attendance: true, role_payment: false, contractor_role: 'LABOUR'
};

// ── Shared UI ─────────────────────────────────────────────────────────────────

const Card = ({ children, style, onClick }) => (
  <div 
    onClick={onClick}
    style={{
      background: 'var(--t-surface)',
      borderRadius: 20,
      border: '1px solid var(--t-border)',
      boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      position: 'relative',
      overflow: 'hidden',
      cursor: onClick ? 'pointer' : 'default',
      ...style
    }}
  >
    {children}
  </div>
);

const Badge = ({ children, color, icon }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '4px 10px', borderRadius: 8, fontSize: 10, fontWeight: 800,
    background: `${color}15`, color: color,
    border: `1px solid ${color}30`,
    textTransform: 'uppercase', letterSpacing: '0.02em'
  }}>
    {icon && <span>{icon}</span>}
    {children}
  </span>
);

const miniBtnStyle = {
  width: 28, height: 28, borderRadius: 8, border: '1px solid var(--t-border)',
  background: 'var(--t-bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', 
  justifyContent: 'center', fontSize: 14, transition: '0.2s'
};

// ── Modals ────────────────────────────────────────────────────────────────────

function QRBadgeModal({ worker, onClose }) {
  const [qrData,  setQrData]  = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { const d = await attendanceService.getWorkerQRCode(worker.worker_id); setQrData(d); }
    catch { setQrData(null); }
    finally { setLoading(false); }
  }, [worker.worker_id]);

  useEffect(() => { load(); }, [load]);

  const handlePrint = () => {
    const w = window.open('', '_blank', 'width=400,height=500');
    w.document.write(`<html><head><title>QR Badge — ${worker.name}</title>
      <style>
        body { margin:0; display:flex; align-items:center; justify-content:center; min-height:100vh; font-family:'Inter', sans-serif; background:#f8fafc; }
        .badge { background:#fff; border-radius:24px; padding:32px; text-align:center; width:300px; box-shadow:0 10px 40px rgba(0,0,0,0.1); border:1px solid #e2e8f0; }
        .badge h2 { margin:0 0 4px; font-size:22px; font-weight:900; color:#1e293b; }
        .badge p { margin:0 0 20px; font-size:14px; color:#64748b; font-weight:600; }
        .badge img { width:220px; height:220px; border-radius:12px; }
        @media print { body { background:#fff; } .badge { box-shadow:none; border:2px solid #000; } }
      </style></head><body><div class="badge"><h2>${worker.name}</h2><p>${worker.trade_label}</p><img src="${qrData?.qr_image}" /></div></body></html>`);
    w.print();
  };

  return (
    <div style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.4)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ background:'var(--t-surface)', width:360, borderRadius:24, padding:32, textAlign:'center', position:'relative', border:'1px solid var(--t-border)', boxShadow:'0 20px 50px rgba(0,0,0,0.2)' }}>
        <button onClick={onClose} style={{ position:'absolute', right:20, top:20, background:'none', border:'none', fontSize:18, cursor:'pointer' }}>✕</button>
        <div style={{ fontSize:40, marginBottom:16 }}>🪪</div>
        <h2 style={{ margin:0, fontWeight:900, color:'var(--t-text)' }}>Worker Badge</h2>
        <p style={{ margin:'4px 0 24px', fontSize:14, color:'var(--t-text3)', fontWeight:600 }}>{worker.name}</p>
        
        <div style={{ background:'var(--t-bg)', borderRadius:20, padding:20, border:'1px solid var(--t-border)', marginBottom:24, minHeight:200, display:'flex', alignItems:'center', justifyContent:'center' }}>
          {loading ? <div className="loading-spinner" /> : <img src={qrData?.qr_image} style={{ width:180, height:180, borderRadius:12 }} />}
        </div>

        <button onClick={handlePrint} style={{ width:'100%', padding:'14px', borderRadius:14, border:'none', background:'var(--t-text)', color:'var(--t-surface)', fontWeight:900, cursor:'pointer' }}>🖨️ Print Badge</button>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function WorkersTab({ projectId }) {
  const [persons,    setPersons]    = useState([]);
  const [orphans,    setOrphans]    = useState([]);
  const [summary,    setSummary]    = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab,  setFilterTab]  = useState('ALL'); 
  const [viewMode,   setViewMode]   = useState('TABLE'); 
  const [groupBy,    setGroupBy]    = useState('NONE'); 

  const [qrPerson,      setQrPerson]      = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showIDCard, setShowIDCard] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [showForm,      setShowForm]      = useState(false);
  const [editingId,     setEditingId]     = useState(null);
  const [form,          setForm]          = useState(EMPTY_FORM);
  const [saving,        setSaving]        = useState(false);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true); setError('');
    try {
      const data = await attendanceService.getPersons(projectId, 'all');
      setPersons(data.persons || []);
      setOrphans(data.orphan_contractors || []);
      setSummary(data.summary);
    } catch { setError('Connection lost. Please try again.'); }
    finally  { setLoading(false); }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = { ...form, project: projectId };
      if (editingId) await attendanceService.updatePerson(editingId, payload);
      else           await attendanceService.addPerson(payload);
      setShowForm(false); load();
    } catch (e) { setError('Failed to save record.'); }
    finally     { setSaving(false); }
  };

  const filteredPersons = persons.filter(p => {
    const search = searchTerm.toLowerCase();
    const matchSearch = p.name.toLowerCase().includes(search) || (p.trade_label||'').toLowerCase().includes(search);
    const matchTab    = filterTab === 'ALL' || (filterTab === 'ORPHAN' ? false : p.worker_type === filterTab);
    return matchSearch && matchTab;
  });

  const filteredOrphans = filterTab === 'ALL' || filterTab === 'ORPHAN' ? orphans.filter(o => o.name.toLowerCase().includes(searchTerm.toLowerCase())) : [];

  if (!projectId) return <div style={{ textAlign:'center', padding:100 }}>🏗️ Select a project first.</div>;

  const renderWorkerList = (list) => {
    if (viewMode === 'GRID') {
      return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {list.map(p => (
            <PersonCard 
              key={p.worker_id} p={p} 
              onEdit={() => { setEditingId(p.worker_id); setForm(p); setShowForm(true); }} 
              onQR={() => setQrPerson(p)} 
              onHistory={() => { setSelectedWorker(p); setShowHistory(true); }} 
              onIDCard={() => { setSelectedWorker(p); setShowIDCard(true); }}
            />
          ))}
        </div>
      );
    }
    return (
      <div style={{ background: 'var(--t-surface)', borderRadius: 20, border: '1px solid var(--t-border)', overflow: 'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
          <thead style={{ background:'var(--t-bg)', borderBottom:'1px solid var(--t-border)' }}>
            <tr>
              {['Staff Name', 'Team', 'Trade', 'Type', 'Daily Rate', 'Status', 'Actions'].map(h => (
                <th key={h} style={{ padding:'14px 16px', textAlign:'left', fontSize:11, fontWeight:800, color:'var(--t-text3)', textTransform:'uppercase', letterSpacing:'0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.map(p => (
              <PersonRow 
                key={p.worker_id} p={p} 
                onEdit={() => { setEditingId(p.worker_id); setForm(p); setShowForm(true); }} 
                onQR={() => setQrPerson(p)} 
                onHistory={() => { setSelectedWorker(p); setShowHistory(true); }} 
                onIDCard={() => { setSelectedWorker(p); setShowIDCard(true); }}
              />
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div style={{ padding: '0 0 40px' }}>
      
      {/* ── Summary Section ── */}
      <div style={{ display:'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap:16, marginBottom:24 }}>
        <SummaryCard label="Total Force" value={summary?.total || 0} color="#6366f1" icon="👥" />
        <SummaryCard label="Active Now" value={summary?.active || 0} color="#22c55e" icon="⚡" />
        <SummaryCard label="Pay Linked" value={summary?.with_payment || 0} color="#f59e0b" icon="💰" />
        <SummaryCard label="ID Cards Ready" value={summary?.with_workforce || 0} color="#3b82f6" icon="🪪" />
        <SummaryCard label="Login Ready" value={summary?.with_login || 0} color="#6366f1" icon="🔐" />
    </div>

      {/* ── Action Bar ── */}
      <div style={{ display:'flex', gap:12, marginBottom:24, flexWrap:'wrap', alignItems:'center', background:'var(--t-surface)', padding:12, borderRadius:16, border:'1px solid var(--t-border)' }}>
        <div style={{ position:'relative', flex:1, minWidth:240 }}>
          <span style={{ position:'absolute', left:14, top:10, color:'var(--t-text3)' }}>🔍</span>
          <input type="text" placeholder="Search roster..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            style={{ width:'100%', padding:'10px 14px 10px 40px', borderRadius:12, border:'1px solid var(--t-border)', background:'var(--t-bg)', color:'var(--t-text)', fontSize:14, outline:'none' }} />
        </div>

        <div style={{ display:'flex', gap:6, background:'var(--t-bg)', padding:4, borderRadius:10 }}>
          {['ALL', 'LABOUR', 'STAFF', 'ORPHAN'].map(tab => (
            <button key={tab} onClick={() => setFilterTab(tab)} style={{
              padding:'7px 14px', borderRadius:8, border:'none', fontSize:11, fontWeight:800, cursor:'pointer',
              background: filterTab === tab ? '#f97316' : 'transparent', color: filterTab === tab ? '#fff' : 'var(--t-text3)'
            }}>{tab}</button>
          ))}
        </div>

        <select value={groupBy} onChange={e => setGroupBy(e.target.value)} style={{ padding:'8px 12px', borderRadius:12, border:'1px solid var(--t-border)', background:'var(--t-bg)', color:'var(--t-text)', fontSize:11, fontWeight:900 }}>
          <option value="NONE">Ungrouped</option>
          <option value="TEAM">Group by Team</option>
          <option value="TRADE">Group by Trade</option>
        </select>

        <button onClick={() => { setEditingId(null); setForm(EMPTY_FORM); setShowForm(true); }}
          style={{ padding:'10px 20px', borderRadius:12, border:'none', background:'#f97316', color:'#fff', fontWeight:900, fontSize:13, cursor:'pointer' }}>+ Register Staff</button>
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:60 }}>Loading workforce roster...</div>
      ) : (
        <>
          {groupBy === 'NONE' ? (
            renderWorkerList(filteredPersons)
          ) : (
            (() => {
              const groups = {};
              filteredPersons.forEach(p => {
                let key = groupBy === 'TEAM' ? (p.teams?.[0]?.name || 'Unassigned') : (p.trade_label || 'Other');
                if (!groups[key]) groups[key] = [];
                groups[key].push(p);
              });
              return Object.entries(groups).sort().map(([key, members]) => (
                <div key={key} style={{ marginBottom:32 }}>
                   <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16, padding:'0 4px' }}>
                    <div style={{ padding:'4px 12px', borderRadius:8, background:'var(--t-surface2)', fontSize:12, fontWeight:900, color:'var(--t-primary)' }}>{key}</div>
                    <div style={{ flex:1, height:1, background:'var(--t-border)', opacity:0.5 }} />
                  </div>
                  {renderWorkerList(members)}
                </div>
              ));
            })()
          )}

          {/* Orphans */}
          {filteredOrphans.length > 0 && (
            <div style={{ marginTop:40 }}>
               <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16, padding:'0 4px' }}>
                <div style={{ padding:'4px 12px', borderRadius:8, background:'#fef3c7', fontSize:12, fontWeight:900, color:'#92400e' }}>UNLINKED CONTRACTORS</div>
                <div style={{ flex:1, height:1, background:'var(--t-border)', opacity:0.5 }} />
              </div>
              <div style={{ opacity:0.7 }}>{renderWorkerList(filteredOrphans.map(o => ({ ...o, worker_id: o.contractor_id, worker_type:'ORPHAN', is_orphan:true })))}</div>
            </div>
          )}
        </>
      )}

      {qrPerson && <QRBadgeModal worker={qrPerson} onClose={() => setQrPerson(null)} />}
      {showHistory && selectedWorker && (
        <WorkerHistoryModal worker={selectedWorker} onClose={() => setShowHistory(false)} />
      )}
      {showIDCard && selectedWorker && (
        <IDCardModal 
          badgeUrl={workforceService.getBadgeUrl(selectedWorker.workforce_member_id)} 
          onClose={() => setShowIDCard(false)} 
        />
      )}
      {showForm && <StaffFormSheet editingId={editingId} form={form} setForm={setForm} onSave={handleSave} onClose={() => setShowForm(false)} saving={saving} />}
    </div>
  );
}

// ── Components ───────────────────────────────────────────────────────────────

function SummaryCard({ label, value, color, icon }) {
  return (
    <Card style={{ padding:20, borderLeft: `4px solid ${color}` }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <div style={{ fontSize:28, fontWeight:900, color:color, marginBottom:2 }}>{value}</div>
          <div style={{ fontSize:11, fontWeight:800, color:'var(--t-text3)', textTransform:'uppercase', letterSpacing:'0.05em' }}>{label}</div>
        </div>
        <div style={{ fontSize:24 }}>{icon}</div>
      </div>
    </Card>
  );
}

function PersonRow({ p, onEdit, onQR, onHistory, onIDCard }) {
  const isPresent = p.today_status === 'PRESENT';
  return (
    <tr style={{ borderBottom:'1px solid var(--t-border)' }}>
      <td style={{ padding:'12px 16px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:8, background:'var(--t-bg)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>{TRADE_ICONS[p.trade]||'👷'}</div>
          <div style={{ fontWeight:700, color:p.is_orphan ? '#f59e0b' : 'var(--t-text)' }}>{p.name}</div>
        </div>
      </td>
      <td style={{ padding:'12px 16px' }}>
        <div style={{ fontSize:10, fontWeight:900, color:p.teams?.[0]?.name ? '#f97316' : 'var(--t-text3)', textTransform:'uppercase', letterSpacing:'0.05em' }}>
          {p.teams?.[0]?.name || 'No Team'}
        </div>
      </td>
      <td style={{ padding:'12px 16px', color:'var(--t-text3)', fontWeight:600 }}>{p.trade_label || 'Other'}</td>
      <td style={{ padding:'12px 16px' }}><Badge color={p.worker_type==='STAFF'?'#6366f1':'#94a3b8'}>{p.worker_type}</Badge></td>
      <td style={{ padding:'12px 16px', fontWeight:700, color:'#f97316' }}>{p.daily_rate ? `NPR ${Number(p.daily_rate).toLocaleString()}` : '—'}</td>
      <td style={{ padding:'12px 16px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background: isPresent?'#22c55e':p.today_status==='ABSENT'?'#ef4444':'#d1d5db' }} />
          <span style={{ fontSize:11, fontWeight:700, color:'var(--t-text3)' }}>{p.today_status || 'NOT MARKED'}</span>
        </div>
      </td>
      <td style={{ padding:'12px 16px' }}>
        <div style={{ display:'flex', gap:4 }}>
          {p.workforce_member_id && (
            <button 
              onClick={onIDCard}
              style={{ ...miniBtnStyle, border: '1px solid #3b82f6', background: '#eff6ff', color: '#1d4ed8' }} 
              title="Print ID Card"
            >
              🪪
            </button>
          )}
          {!p.workforce_member_id && (
            <button onClick={onQR} style={miniBtnStyle} title="Attendance QR">🔍</button>
          )}
          <button onClick={onHistory} style={miniBtnStyle} title="View Service Record">📄</button>
          <button onClick={onEdit} style={miniBtnStyle} title="Edit Profile">✏️</button>
        </div>
      </td>
    </tr>
  );
}

function PersonCard({ p, onEdit, onQR, onHistory, onIDCard }) {
  const isPresent = p.today_status === 'PRESENT';
  return (
    <Card style={{ padding:20 }}>
       <div style={{ display:'flex', gap:16, alignItems:'flex-start', marginBottom:16 }}>
          <div style={{ 
            width:54, height:54, borderRadius:16, background:'var(--t-bg)', 
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, border:'1px solid var(--t-border)'
          }}>
            {TRADE_ICONS[p.trade] || '👷'}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontWeight:900, fontSize:16, color:'var(--t-text)', marginBottom:2 }}>{p.name}</div>
            <div style={{ fontSize:12, fontWeight:700, color:'var(--t-text3)' }}>{p.trade_label} • <span style={{color:'#f97316'}}>Rs. {Number(p.daily_rate||0).toLocaleString()}</span></div>
          </div>
       </div>
       <div style={{ display:'flex', gap:8, borderTop:'1px solid var(--t-border)', paddingTop:16 }}>
          {p.workforce_member_id ? (
            <button 
              onClick={onIDCard}
              style={{flex:1, padding:'8px', borderRadius:10, border:'1px solid #3b82f6', background:'#eff6ff', color:'#1d4ed8', fontSize:12, fontWeight:800}}
            >
              ID Card
            </button>
          ) : (
            <button onClick={onQR} style={{flex:1, padding:'8px', borderRadius:10, border:'1px solid var(--t-border)', background:'var(--t-bg)', fontSize:12, fontWeight:800}}>QR Code</button>
          )}
          <button onClick={onHistory} style={{flex:1, padding:'8px', borderRadius:10, border:'1px solid var(--t-border)', background:'var(--t-bg)', fontSize:12, fontWeight:800}}>Record</button>
          <button onClick={onEdit} style={{flex:1, padding:'8px', borderRadius:10, border:'1px solid var(--t-border)', background:'var(--t-bg)', fontSize:12, fontWeight:800}}>Edit</button>
       </div>
    </Card>
  );
}

function StaffFormSheet({ editingId, form, setForm, onSave, onClose, saving }) {
  const set = (f, v) => setForm(prev => ({ ...prev, [f]: v }));
  
  const sectionTitleStyle = { fontSize:13, fontWeight:900, marginBottom:16, color:'var(--t-text)', display:'flex', alignItems:'center', gap:8 };
  const inputStyle = { width:'100%', padding:'12px 14px', borderRadius:14, border:'1px solid var(--t-border)', background:'var(--t-surface)', color:'var(--t-text)', fontSize:14, outline:'none', fontWeight:600 };
  
  const Field = ({ label, children }) => (
    <div style={{ flex:1 }}>
      <label style={{ display:'block', fontSize:10, fontWeight:800, color:'var(--t-text3)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:6, marginLeft:4 }}>{label}</label>
      {children}
    </div>
  );

  const RoleToggle = ({ icon, title, desc, checked, onChange }) => (
    <div onClick={() => onChange(!checked)} style={{ display:'flex', gap:12, alignItems:'center', padding:12, borderRadius:16, border:`1px solid ${checked?'var(--t-primary)':'var(--t-border)'}`, background:checked?'var(--t-primary)05':'transparent', cursor:'pointer', transition:'0.2s' }}>
      <div style={{ width:36, height:36, borderRadius:10, background:'var(--t-bg)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, border:'1px solid var(--t-border)' }}>{icon}</div>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:13, fontWeight:900, color:'var(--t-text)' }}>{title}</div>
        <div style={{ fontSize:11, color:'var(--t-text3)', fontWeight:600 }}>{desc}</div>
      </div>
      <div style={{ width:40, height:22, borderRadius:20, background:checked?'#f97316':'#e2e8f0', position:'relative', transition:'0.3s' }}>
        <div style={{ position:'absolute', top:3, left:checked?21:3, width:16, height:16, borderRadius:'50%', background:'#fff', transition:'0.3s', boxShadow:'0 2px 4px rgba(0,0,0,0.1)' }} />
      </div>
    </div>
  );

  return (
    <div style={{ position:'fixed', inset:0, zIndex:300, display:'flex', justifyContent:'flex-end', background:'rgba(0,0,0,0.4)', backdropFilter:'blur(8px)' }}>
      <style>{`
        .form-section { padding: 30px; border-bottom: 1px solid var(--t-border); }
        .form-section:last-child { border-bottom: none; }
      `}</style>

      <div style={{ width:480, background:'var(--t-bg)', height:'100%', display:'flex', flexDirection:'column', boxShadow:'-20px 0 60px rgba(0,0,0,0.2)' }}>
        {/* Header */}
        <div style={{ padding:'24px 30px', borderBottom:'1px solid var(--t-border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <h2 style={{ margin:0, fontWeight:900, fontSize:22 }}>{editingId ? 'Edit Profile' : 'Register New Staff'}</h2>
            <p style={{ margin:'4px 0 0', fontSize:12, color:'var(--t-text3)', fontWeight:600 }}>Manage workforce identity & roles.</p>
          </div>
          <button onClick={onClose} style={{ background:'var(--t-bg)', border:'1px solid var(--t-border)', width:36, height:36, borderRadius:12, cursor:'pointer', fontSize:18 }}>✕</button>
        </div>

        <div style={{ flex:1, overflowY:'auto' }}>
          {/* Identity Section */}
          <div className="form-section">
            <h3 style={sectionTitleStyle}>👤 Identity</h3>
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <Field label="Full Name">
                <input style={inputStyle} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Ram Bahadur Tamang" />
              </Field>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                <Field label="Phone Number">
                  <input style={inputStyle} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="98XXXXXXXX" />
                </Field>
                <Field label="Staff Type">
                  <select style={inputStyle} value={form.worker_type} onChange={e => set('worker_type', e.target.value)}>
                    <option value="LABOUR">Daily Labour</option>
                    <option value="STAFF">Internal Staff</option>
                  </select>
                </Field>
              </div>
            </div>
          </div>

          {/* Work Section */}
          <div className="form-section" style={{ background:'rgba(249,115,22,0.02)' }}>
            <h3 style={sectionTitleStyle}>🏗️ Work & Pay</h3>
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <Field label="Primary Trade">
                <select style={inputStyle} value={form.trade} onChange={e => set('trade', e.target.value)}>
                  {TRADES.map(t => <option key={t} value={t}>{TRADE_ICONS[t]} {t}</option>)}
                </select>
              </Field>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                <Field label="Daily Wage (NPR)">
                  <input style={inputStyle} type="number" value={form.daily_rate} onChange={e => set('daily_rate', e.target.value)} />
                </Field>
                <Field label="Joined Date">
                  <input style={inputStyle} type="date" value={form.joined_date} onChange={e => set('joined_date', e.target.value)} />
                </Field>
              </div>
            </div>
          </div>

          {/* Roles Section */}
          <div className="form-section">
            <h3 style={sectionTitleStyle}>🔐 Capabilities</h3>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <RoleToggle 
                icon="📋" title="Attendance Tracking" desc="Enable QR scanning for check-in" 
                checked={form.role_attendance} onChange={v => set('role_attendance', v)} 
              />
              <RoleToggle 
                icon="💰" title="Financial Linking" desc="Connect to payment ledger" 
                checked={form.role_payment} onChange={v => set('role_payment', v)} 
              />
            </div>
          </div>

          <div className="form-section">
             <Field label="Internal Notes">
               <textarea style={{...inputStyle, height:80, resize:'none'}} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Skills, equipment provided..." />
             </Field>
          </div>
        </div>

        <div style={{ padding:'24px 30px', borderTop:'1px solid var(--t-border)', background:'var(--t-surface)' }}>
          <button 
            onClick={onSave} 
            disabled={saving}
            style={{ width:'100%', padding:16, borderRadius:16, border:'none', background:'#000', color:'#fff', fontWeight:900, fontSize:15, cursor:'pointer', boxShadow:'0 10px 30px rgba(0,0,0,0.1)' }}
          >
            {saving ? 'Synchronizing...' : editingId ? 'Update Profile' : 'Register Staff'}
          </button>
        </div>
      </div>
    </div>
  );
}
