/**
 * LaborPage — Centralized Workforce Hub
 * ─────────────────────────────────────────────────────────────────────────────
 * Manages the Project Roster (Staff) and Team Structures.
 */
import React, { useState } from 'react';
import { useResource } from '../context/ResourceContext';
import WorkforceMembersView from '../../workforce/components/WorkforceMembersView';
import TeamsTab   from '../../attendance/TeamsTab';

export default function LaborPage() {
  const { projectId } = useResource();
  const [activeTab, setActiveTab] = useState('STAFF'); // 'STAFF' or 'TEAMS'

  if (!projectId) {
    return (
      <div style={{ padding:60, textAlign:'center', color:'var(--t-text3)' }}>
        🏗️ Select a project to manage workforce.
      </div>
    );
  }

  return (
    <div style={{ padding: '20px 0' }}>
      
      {/* Header & Internal Switcher */}
      <div style={{ 
        display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:32,
        paddingBottom:16, borderBottom:'1px solid var(--t-border)'
      }}>
        <div>
          <h1 style={{ margin:0, fontSize:22, fontWeight:900, color:'var(--t-text)' }}>Workforce Hub</h1>
          <p style={{ margin:'4px 0 0', fontSize:13, color:'var(--t-text3)' }}>Administration of personnel and team structures.</p>
        </div>

        <div style={{ display:'flex', gap:4, background:'var(--t-surface2)', padding:4, borderRadius:12, border:'1px solid var(--t-border)' }}>
          {[
            { id: 'STAFF', label: 'Personnel Roster', icon: '👷' },
            { id: 'TEAMS', label: 'Project Teams',    icon: '👥' }
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding:'8px 16px', borderRadius:8, border:'none', fontSize:12, fontWeight:800, cursor:'pointer',
                display:'flex', alignItems:'center', gap:8,
                background: activeTab === tab.id ? '#000' : 'transparent',
                color: activeTab === tab.id ? '#fff' : 'var(--t-text3)',
                transition:'0.2s'
              }}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
        {activeTab === 'STAFF' ? (
          <WorkforceMembersView projectId={projectId} hideProjectFilter={true} />
        ) : (
          <TeamsTab projectId={projectId} />
        )}
      </div>

    </div>
  );
}
