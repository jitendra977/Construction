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
      
      {/* Header / Action Bar */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div>
          <h2 style={{ margin:0, fontSize:18, fontWeight:900 }}>Workforce Teams</h2>
          <p style={{ margin:0, fontSize:11, color:'var(--t-text3)', fontWeight:700 }}>{teams.length} teams registered</p>
        </div>
        <button 
          onClick={handleCreate}
          style={{ 
            padding:'10px 20px', borderRadius:12, border:'none', background:'#f97316', 
            color:'#fff', fontWeight:900, fontSize:13, cursor:'pointer',
            boxShadow:'0 10px 20px rgba(249,115,22,0.15)'
          }}
        >
          + Create New Team
        </button>
      </div>

      <TeamList 
        teams={teams} 
        onEdit={handleEdit} 
        onManageMembers={handleManage} 
      />

      {/* Modals */}
      {(showCreate || editingTeam) && (
        <Modal onClose={handleDone} title={editingTeam ? 'Edit Team' : 'Create Team'}>
          <TeamForm 
            projectId={projectId} 
            team={editingTeam} 
            workers={workers}
            onDone={handleDone} 
          />
        </Modal>
      )}

      {managingTeam && (
        <Modal onClose={handleDone} title={`Manage Members: ${managingTeam.name}`}>
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
