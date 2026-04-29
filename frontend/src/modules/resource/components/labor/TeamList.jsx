import React from 'react';

const TRADE_ICONS = {
  MASON: '🧱', HELPER: '🤝', CARPENTER: '🪚', ELECTRICIAN: '⚡', PLUMBER: '🔧',
  PAINTER: '🎨', STEEL_FIXER: '🏗️', SUPERVISOR: '🦺', TILE_SETTER: '📐',
  EXCAVATOR: '🚜', WATERPROOF: '💧', DRIVER: '🚛', SECURITY: '🛡️',
  ENGINEER: '⚙️', ACCOUNTANT: '📑', MANAGER: '💼', OTHER: '👷'
};

export default function TeamList({ teams, onEdit, onManageMembers }) {
  if (!teams.length) {
    return (
      <div style={{ background:'var(--t-surface)', borderRadius:24, padding:60, textAlign:'center', border:'1px dashed var(--t-border)' }}>
        <div style={{ fontSize:40, marginBottom:16 }}>👥</div>
        <p style={{ fontSize:15, fontWeight:900, color:'var(--t-text)' }}>No Project Teams</p>
        <p style={{ fontSize:12, color:'var(--t-text3)', marginTop:4 }}>Create teams to begin organizing your project workforce.</p>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--t-surface)', borderRadius: 24, border: '1px solid var(--t-border)', overflow: 'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.03)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: 'var(--t-bg)', borderBottom: '1px solid var(--t-border)' }}>
            <th style={thStyle}>Team Identity</th>
            <th style={thStyle}>Team Leader</th>
            <th style={thStyle}>Composition</th>
            <th style={thStyle}>Members</th>
            <th style={{ ...thStyle, textAlign:'right' }}>Operations</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((t) => (
            <tr key={t.id} style={{ borderBottom: '1px solid var(--t-border)', transition: '0.2s' }}>
              
              {/* Identity */}
              <td style={{ padding: '20px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width:48, height:48, borderRadius:14, background:'var(--t-bg)', border:'1px solid var(--t-border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>
                    {t.name[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 14, color: 'var(--t-text)' }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--t-text3)', fontWeight: 700 }}>{t.is_active ? '✅ Active Deployment' : '⚪ Standby'}</div>
                  </div>
                </div>
              </td>

              {/* Leader */}
              <td style={{ padding: '20px 24px' }}>
                {t.leader_name ? (
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:32, height:32, borderRadius:'50%', background:'#f97316', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:900 }}>
                      {t.leader_name[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight:800, fontSize:12 }}>{t.leader_name}</div>
                      <div style={{ fontSize:10, color:'#f97316', fontWeight:900, textTransform:'uppercase' }}>Lead Official</div>
                    </div>
                  </div>
                ) : (
                  <span style={{ fontSize:11, color:'var(--t-text3)', fontStyle:'italic' }}>Unassigned</span>
                )}
              </td>

              {/* Composition */}
              <td style={{ padding: '20px 24px' }}>
                <div style={{ width: 120 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                    <span style={{ fontSize:11, fontWeight:900 }}>{t.member_count} Members</span>
                  </div>
                  <div style={{ height:6, background:'var(--t-bg)', borderRadius:3, overflow:'hidden' }}>
                    <div style={{ height:'100%', width: `${Math.min(t.member_count * 10, 100)}%`, background: '#f97316', borderRadius:3 }} />
                  </div>
                </div>
              </td>

              {/* Member Preview */}
              <td style={{ padding: '20px 24px' }}>
                <div style={{ display:'flex', flexWrap:'wrap', gap:4, maxWidth:180 }}>
                   {(t.members_detail || []).slice(0, 5).map(m => (
                     <div
                      key={m.id}
                      title={m.full_name}
                      style={{
                        width:24, height:24, borderRadius:6, background:'var(--t-bg)', border:'1px solid var(--t-border)',
                        display:'flex', alignItems:'center', justifyContent:'center', fontSize:12
                      }}
                     >
                       {TRADE_ICONS[m.effective_trade] || '👷'}
                     </div>
                   ))}
                   {t.member_count > 5 && (
                     <div style={{ width:24, height:24, borderRadius:6, background:'var(--t-bg)', border:'1px solid var(--t-border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:900, color:'var(--t-text3)' }}>
                       +{t.member_count - 5}
                     </div>
                   )}
                </div>
              </td>

              {/* Actions */}
              <td style={{ padding: '20px 24px', textAlign: 'right' }}>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button 
                    onClick={() => onManageMembers(t)}
                    style={actionBtnStyle('#000', '#fff')}
                  >
                    Manage Force
                  </button>
                  <button 
                    onClick={() => onEdit(t)}
                    style={actionBtnStyle('var(--t-bg)', 'var(--t-text)', '1px solid var(--t-border)')}
                  >
                    Edit
                  </button>
                </div>
              </td>

            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const thStyle = {
  padding: '16px 24px',
  textAlign: 'left',
  fontSize: 10,
  fontWeight: 900,
  color: 'var(--t-text3)',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
};

const actionBtnStyle = (bg, color, border = 'none') => ({
  padding: '8px 16px',
  borderRadius: 10,
  border,
  background: bg,
  color,
  fontSize: 11,
  fontWeight: 900,
  cursor: 'pointer',
  transition: '0.2s',
  boxShadow: bg === '#000' ? '0 4px 12px rgba(0,0,0,0.1)' : 'none'
});
