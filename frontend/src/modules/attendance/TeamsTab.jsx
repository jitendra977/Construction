/**
 * TeamsTab — Manage Workforce Groups & Teams
 * ─────────────────────────────────────────────────────────────────────────────
 * Provides a dedicated space to organize workers into teams.
 */
import React, { useState, useEffect, useCallback } from 'react';
import teamsApi from '../resource/services/teamsApi';
import workforceService from '../../services/workforceService';
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
        workforceService.getMembers({ project: projectId, page_size: 200 }),
      ]);
      setTeams(tRes.data?.results || tRes.data || []);
      const membersRaw = wRes?.results ?? wRes ?? [];
      setWorkers(Array.isArray(membersRaw) ? membersRaw : []);
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

      {/* ── Nepali Note Section (Workforce Teams) ── */}
      <div style={{ marginTop: 60, padding: 30, background: 'linear-gradient(135deg, #fff 0%, #f9fafb 100%)', borderRadius: 24, border: '1px solid var(--t-border)', boxShadow: '0 10px 30px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
              <div style={{ width: 48, height: 48, borderRadius: 16, background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 24, flexShrink: 0 }}>👥</div>
              <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 900, color: 'var(--t-text)' }}>कामदार टोली निर्देशिका (Workforce Team Guide)</h3>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--t-text3)', lineHeight: 1.6, fontWeight: 600 }}>
                      कामदारहरूलाई विभिन्न टोलीमा विभाजन गरेर कामलाई अझ प्रभावकारी बनाउनुहोस्:
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 30, marginTop: 24 }}>
                      {/* What & Why */}
                      <div style={{ background: '#fff', padding: 20, borderRadius: 16, border: '1px solid var(--t-border)' }}>
                          <div style={{ marginBottom: 16 }}>
                              <div style={{ fontSize: 12, fontWeight: 900, color: '#10b981', marginBottom: 4 }}>📌 यो के हो? (What is this?)</div>
                              <p style={{ margin: 0, fontSize: 11, color: 'var(--t-text3)', lineHeight: 1.5 }}>
                                  यो धेरै कामदारहरूलाई एउटा समूहमा (टोली) राख्ने ठाउँ हो। जस्तै: 'गारो लगाउने टोली' वा 'ढलान गर्ने टोली'।
                              </p>
                          </div>
                          <div>
                              <div style={{ fontSize: 12, fontWeight: 900, color: '#3b82f6', marginBottom: 4 }}>❓ किन प्रयोग गर्ने? (Why use it?)</div>
                              <p style={{ margin: 0, fontSize: 11, color: 'var(--t-text3)', lineHeight: 1.5 }}>
                                  टोली बनाउँदा एकैपटक धेरैको हाजिरी गर्न सजिलो हुन्छ र कुन टोलीले कति काम गर्यो भन्ने कुराको स्पष्ट हिसाब रहन्छ।
                              </p>
                          </div>
                      </div>

                      {/* When & Who */}
                      <div style={{ background: '#fff', padding: 20, borderRadius: 16, border: '1px solid var(--t-border)' }}>
                          <div style={{ marginBottom: 16 }}>
                              <div style={{ fontSize: 12, fontWeight: 900, color: '#f59e0b', marginBottom: 4 }}>⏰ कहिले प्रयोग गर्ने? (When to use it?)</div>
                              <p style={{ margin: 0, fontSize: 11, color: 'var(--t-text3)', lineHeight: 1.5 }}>
                                  कुनै नयाँ कामको चरण (Phase) सुरु गर्दा वा धेरै कामदारहरूलाई एउटै जिम्मेवारी सुम्पिँदा टोली बनाउनुहोस्।
                              </p>
                          </div>
                          <div>
                              <div style={{ fontSize: 12, fontWeight: 900, color: '#6366f1', marginBottom: 4 }}>👤 कसले प्रयोग गर्ने? (Who can use it?)</div>
                              <p style={{ margin: 0, fontSize: 11, color: 'var(--t-text3)', lineHeight: 1.5 }}>
                                  यो सेक्सन मुख्य रूपमा साइट सुपरभाइजर र प्रोजेक्ट म्यानेजरहरूले कामदार परिचालन गर्नका लागि प्रयोग गर्छन्।
                              </p>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
}
