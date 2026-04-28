import React, { useState, useMemo } from 'react';
import teamsApi from '../../services/teamsApi';

/**
 * ManageMembers — A premium system to assign/remove workers from a team.
 * Features:
 * - Real-time search & trade filtering
 * - View toggling (All vs Selected)
 * - Bulk selection summaries
 */
export default function ManageMembers({ team, allWorkers, onDone }) {
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => {
    if (team.members && Array.isArray(team.members)) return team.members;
    if (team.members_detail) return team.members_detail.map(m => m.id);
    return [];
  });
  const [search, setSearch] = useState('');
  const [tradeFilter, setTradeFilter] = useState('ALL');
  const [viewTab, setViewTab] = useState('ALL'); // ALL, SELECTED

  // Get unique trades for filtering
  const trades = useMemo(() => {
    const t = new Set(allWorkers.map(w => w.trade));
    return ['ALL', ...Array.from(t).sort()];
  }, [allWorkers]);

  const toggleWorker = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const filteredWorkers = useMemo(() => {
    return allWorkers.filter(w => {
      const matchesSearch = w.name.toLowerCase().includes(search.toLowerCase());
      const matchesTrade  = tradeFilter === 'ALL' || w.trade === tradeFilter;
      const matchesTab    = viewTab === 'ALL' || selectedIds.includes(w.id);
      return matchesSearch && matchesTrade && matchesTab;
    });
  }, [allWorkers, search, tradeFilter, viewTab, selectedIds]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await teamsApi.updateTeam(team.id, { members: selectedIds });
      onDone();
    } catch (err) {
      alert('Failed to update members. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'600px', maxHeight:'80vh' }}>
      
      {/* Search & Filter Header */}
      <div style={{ padding: '0 20px 20px', borderBottom: '1px solid var(--t-border)' }}>
        <div style={{ display:'flex', gap:10, marginBottom:16 }}>
          <div style={{ position:'relative', flex:1 }}>
            <span style={{ position:'absolute', left:12, top:10, fontSize:12, opacity:0.5 }}>🔍</span>
            <input 
              type="text" 
              placeholder="Search by name..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ 
                width:'100%', padding:'10px 10px 10px 34px', borderRadius:12, border:'1px solid var(--t-border)',
                background:'var(--t-bg)', color:'var(--t-text)', fontSize:13, outline:'none'
              }}
            />
          </div>
          <select 
            value={tradeFilter}
            onChange={e => setTradeFilter(e.target.value)}
            style={{ 
              padding:'10px', borderRadius:12, border:'1px solid var(--t-border)',
              background:'var(--t-bg)', color:'var(--t-text)', fontSize:12, fontWeight:800, outline:'none'
            }}
          >
            {trades.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* View Tabs */}
        <div style={{ display:'flex', gap:8, background:'var(--t-bg)', padding:4, borderRadius:12, border:'1px solid var(--t-border)' }}>
          <button 
            onClick={() => setViewTab('ALL')}
            style={{ 
              flex:1, padding:'8px', borderRadius:10, border:'none', fontSize:11, fontWeight:900, cursor:'pointer',
              background: viewTab === 'ALL' ? '#000' : 'transparent',
              color: viewTab === 'ALL' ? '#fff' : 'var(--t-text3)',
              transition:'0.2s'
            }}
          >
            All Workers ({allWorkers.length})
          </button>
          <button 
            onClick={() => setViewTab('SELECTED')}
            style={{ 
              flex:1, padding:'8px', borderRadius:10, border:'none', fontSize:11, fontWeight:900, cursor:'pointer',
              background: viewTab === 'SELECTED' ? '#000' : 'transparent',
              color: viewTab === 'SELECTED' ? '#fff' : 'var(--t-text3)',
              transition:'0.2s'
            }}
          >
            Selected ({selectedIds.length})
          </button>
        </div>
      </div>

      {/* Workers List */}
      <div style={{ flex:1, overflowY:'auto', padding:20, display:'flex', flexDirection:'column', gap:8 }}>
        {filteredWorkers.length === 0 ? (
          <div style={{ textAlign:'center', padding:40, color:'var(--t-text3)', fontSize:13, fontWeight:600 }}>
            No workers found matching your criteria.
          </div>
        ) : (
          filteredWorkers.map(w => {
            const isSelected = selectedIds.includes(w.id);
            return (
              <div 
                key={w.id} 
                onClick={() => toggleWorker(w.id)}
                style={{ 
                  display:'flex', alignItems:'center', justifyContent:'space-between', padding:12, borderRadius:16, border:'1px solid var(--t-border)',
                  background: isSelected ? 'rgba(249,115,22,0.05)' : 'var(--t-surface)',
                  borderColor: isSelected ? '#f97316' : 'var(--t-border)',
                  cursor:'pointer', transition:'all 0.1s'
                }}
              >
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                   <div style={{ 
                      width:36, height:36, borderRadius:12, background:'var(--t-bg)', 
                      display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, border:'1px solid var(--t-border)'
                    }}>
                      {w.name[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize:13, fontWeight:900, color:'var(--t-text)' }}>{w.name}</div>
                      <div style={{ fontSize:10, fontWeight:800, color:'var(--t-text3)', textTransform:'uppercase' }}>{w.trade}</div>
                    </div>
                </div>
                <div style={{ 
                  width:22, height:22, borderRadius:'50%', border:'2px solid var(--t-border)', 
                  display:'flex', alignItems:'center', justifyContent:'center',
                  background: isSelected ? '#f97316' : 'transparent',
                  borderColor: isSelected ? '#f97316' : 'var(--t-border)',
                  color:'#fff', fontSize:10
                }}>
                  {isSelected && '✓'}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Actions */}
      <div style={{ padding:20, borderTop:'1px solid var(--t-border)', background:'var(--t-surface)' }}>
        <button 
          onClick={handleSave}
          disabled={loading}
          style={{ 
            width:'100%', padding:14, borderRadius:16, border:'none', background:'#000', 
            color:'#fff', fontWeight:900, fontSize:14, cursor:'pointer',
            boxShadow:'0 10px 30px rgba(0,0,0,0.1)',
            opacity: loading ? 0.6 : 1
          }}
        >
          {loading ? 'Updating Roster...' : `Assign ${selectedIds.length} Members`}
        </button>
      </div>

    </div>
  );
}
