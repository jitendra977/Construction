/**
 * TeamsTab — Manage Workforce Groups & Teams
 * ─────────────────────────────────────────────────────────────────────────────
 * Provides a dedicated space to organize workers into teams.
 */
import React, { useState, useEffect, useCallback } from 'react';
import teamsApi from '../resource/services/teamsApi';
import attendanceService from '../../services/attendanceService';
import TeamList from '../resource/components/labor/TeamList';
import TeamForm from '../resource/components/labor/TeamForm';
import ManageMembers from '../resource/components/labor/ManageMembers';
import Modal from '../resource/components/shared/Modal';

export default function TeamsTab({ projectId }) {
  const [teams, setTeams] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [managingTeam, setManagingTeam] = useState(null);

  const loadData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const [tRes, wRes] = await Promise.all([
        teamsApi.getTeams(projectId),
        attendanceService.getWorkers({ project: projectId })
      ]);
      setTeams(tRes.data?.results || tRes.data || []);
      setWorkers(Array.isArray(wRes) ? wRes : wRes.results || []);
    } catch (err) {
      console.error("Failed to load workforce teams data:", err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = () => { setEditingTeam(null); setShowCreate(true); };
  const handleEdit   = (team) => { setEditingTeam(team); setShowCreate(true); };
  const handleManage = (team) => { setManagingTeam(team); };

  const handleDone = () => {
    setShowCreate(false);
    setEditingTeam(null);
    setManagingTeam(null);
    loadData();
  };

  if (loading && !teams.length) {
    return (
      <div style={{ textAlign:'center', padding:60 }}>
        <div className="animate-pulse" style={{ fontSize:32 }}>👥</div>
        <p style={{ color:'var(--t-text3)', marginTop:12 }}>Loading workforce groups...</p>
      </div>
    );
  }

  return (
    <div style={{ padding:'0 0 40px' }}>
      
      {/* Advanced Header */}
      <div style={{ 
        display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:32,
        padding: '24px 30px', background: 'var(--t-surface)', borderRadius: 24, border: '1px solid var(--t-border)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display:'flex', gap:32 }}>
          <div>
            <div style={{ fontSize:11, fontWeight:800, color:'var(--t-text3)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:4 }}>Operational Teams</div>
            <div style={{ fontSize:24, fontWeight:900, color:'var(--t-text)' }}>{teams.length} <span style={{ fontSize:14, fontWeight:700, color:'var(--t-text3)' }}>Groups</span></div>
          </div>
          <div style={{ width:1, height:40, background:'var(--t-border)' }} />
          <div>
            <div style={{ fontSize:11, fontWeight:800, color:'var(--t-text3)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:4 }}>Total Assignment</div>
            <div style={{ fontSize:24, fontWeight:900, color:'#f97316' }}>{teams.reduce((acc, t) => acc + (t.member_count || 0), 0)} <span style={{ fontSize:14, fontWeight:700, color:'var(--t-text3)' }}>Personnel</span></div>
          </div>
        </div>
        
        <button 
          onClick={handleCreate}
          style={{ 
            padding:'12px 24px', borderRadius:14, border:'none', background:'#000', 
            color:'#fff', fontWeight:900, fontSize:14, cursor:'pointer',
            boxShadow:'0 10px 25px rgba(0,0,0,0.1)', display:'flex', alignItems:'center', gap:10
          }}
        >
          <span style={{ fontSize:18 }}>+</span>
          Establish New Team
        </button>
      </div>

      <TeamList 
        teams={teams} 
        onEdit={handleEdit} 
        onManageMembers={handleManage} 
      />

      {/* Modals */}
      {(showCreate || editingTeam) && (
        <Modal 
          isOpen={true} 
          onClose={handleDone} 
          title={editingTeam ? 'Edit Team' : 'Create Team'}
        >
          <TeamForm 
            projectId={projectId} 
            team={editingTeam} 
            workers={workers}
            onDone={handleDone} 
          />
        </Modal>
      )}

      {managingTeam && (
        <Modal 
          isOpen={true} 
          onClose={handleDone} 
          title={`Manage Members: ${managingTeam.name}`}
        >
          <ManageMembers 
            projectId={projectId} 
            team={managingTeam} 
            allWorkers={workers}
            onDone={handleDone} 
          />
        </Modal>
      )}

    </div>
  );
}
