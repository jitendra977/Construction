import React, { useState } from 'react';
import ResourceContext from '../../context/ResourceContext';
import teamsApi from '../../services/teamsApi';

export default function TeamForm({ team, onDone, projectId: propProjectId, workers = [] }) {
  const resourceCtx = React.useContext(ResourceContext);
  const projectId = propProjectId || resourceCtx?.projectId;
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  
  const [formData, setFormData] = useState({
    name: team?.name || '',
    description: team?.description || '',
    leader: team?.leader || '',
    is_active: team?.is_active ?? true,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!projectId) return;
    
    setLoading(true);
    setError('');
    
    try {
      const data = { 
        ...formData, 
        project: projectId,
        leader: formData.leader || null
      };
      
      if (team?.id) {
        await teamsApi.updateTeam(team.id, data);
      } else {
        await teamsApi.createTeam(data);
      }
      onDone();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save team.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = { 
    width:'100%', padding:'12px 14px', borderRadius:14, border:'1px solid var(--t-border)', 
    background:'var(--t-surface)', color:'var(--t-text)', fontSize:14, outline:'none', fontWeight:600 
  };

  const labelStyle = { 
    display:'block', fontSize:10, fontWeight:800, color:'var(--t-text3)', 
    textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:6, marginLeft:4 
  };

  return (
    <form onSubmit={handleSubmit} style={{ padding: 30, display:'flex', flexDirection:'column', gap:24 }}>
      {error && (
        <div style={{ padding:16, borderRadius:12, background:'rgba(239,68,68,0.1)', color:'#ef4444', fontSize:12, fontWeight:700, border:'1px solid rgba(239,68,68,0.2)' }}>
          ⚠️ {error}
        </div>
      )}

      <div>
        <label style={labelStyle}>Team Nomenclature</label>
        <input
          required
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          style={inputStyle}
          placeholder="e.g. Masonry Group A"
        />
      </div>

      <div>
        <label style={labelStyle}>Strategic Objectives / Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          style={{ ...inputStyle, height:100, resize:'none' }}
          placeholder="Define the scope and goals of this workforce team..."
        />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
        <div>
          <label style={labelStyle}>Team Lead Official</label>
          <select
            value={formData.leader}
            onChange={(e) => setFormData({ ...formData, leader: e.target.value })}
            style={inputStyle}
          >
            <option value="">Unassigned</option>
            {workers.map(w => (
              <option key={w.id} value={w.id}>{w.name} ({w.trade})</option>
            ))}
          </select>
        </div>
        
        <div style={{ display:'flex', alignItems:'center', gap:12, paddingTop:24 }}>
           <div 
             onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
             style={{ 
               width:44, height:24, borderRadius:20, background: formData.is_active ? '#22c55e' : '#e2e8f0',
               position:'relative', cursor:'pointer', transition:'0.3s'
             }}
           >
             <div style={{ position:'absolute', top:3, left: formData.is_active ? 23 : 3, width:18, height:18, borderRadius:'50%', background:'#fff', transition:'0.3s', boxShadow:'0 2px 4px rgba(0,0,0,0.1)' }} />
           </div>
           <span style={{ fontSize:12, fontWeight:800, color:'var(--t-text)' }}>Active Status</span>
        </div>
      </div>

      <div style={{ paddingTop:12 }}>
        <button
          disabled={loading}
          type="submit"
          style={{ 
            width:'100%', padding:16, borderRadius:16, border:'none', background:'#000', 
            color:'#fff', fontWeight:900, fontSize:15, cursor:'pointer',
            boxShadow:'0 10px 30px rgba(0,0,0,0.1)', opacity: loading ? 0.6 : 1
          }}
        >
          {loading ? 'Processing...' : team?.id ? 'Authorize Update' : 'Establish Team'}
        </button>
      </div>
    </form>
  );
}
