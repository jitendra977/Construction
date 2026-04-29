import React from 'react';

/**
 * IDCardModal
 * Displays the printable worker ID card (rendered by backend) inside a premium floating modal.
 */
export default function IDCardModal({ badgeUrl, onClose }) {
  if (!badgeUrl) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      zIndex: 2000, padding: '20px'
    }} onClick={onClose}>
      
      <div style={{
        background: 'white', borderRadius: '24px', width: '380px', height: '720px',
        position: 'relative', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden'
      }} onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div style={{
          padding: '16px 24px', borderBottom: '1px solid #eee',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#1e293b' }}>Digital ID Badge</span>
          <button 
            onClick={onClose}
            style={{ 
              background: '#f1f5f9', border: 'none', width: '32px', height: '32px', 
              borderRadius: '50%', cursor: 'pointer', display: 'flex', 
              alignItems: 'center', justifyContent: 'center', fontWeight: 900
            }}
          >✕</button>
        </div>

        {/* Content - Iframe to Backend Template */}
        <div style={{ flex: 1, position: 'relative', background: '#f8fafc', overflow: 'hidden' }}>
          <iframe 
            src={badgeUrl} 
            style={{ width: '100%', height: '100%', border: 'none', overflow: 'hidden' }}
            scrolling="no"
            title="Worker ID Card"
          />
        </div>

        {/* Footer Actions */}
        <div style={{ padding: '16px', background: 'white', borderTop: '1px solid #eee' }}>
          <button 
            onClick={() => window.open(badgeUrl, '_blank')}
            style={{ 
              width: '100%', padding: '12px', borderRadius: '12px', 
              background: '#3b82f6', color: 'white', border: 'none', 
              fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            🖨️ Print Full Badge
          </button>
        </div>
      </div>
    </div>
  );
}
