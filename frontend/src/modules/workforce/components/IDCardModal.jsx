import React, { useState, useEffect, useRef } from 'react';
import workforceService from '../../../services/workforceService';

/**
 * IDCardModal
 * Displays the printable worker ID card rendered by the backend.
 *
 * Why srcdoc instead of src:
 *   The /badge/ endpoint requires IsAuthenticated.  A plain <iframe src="...">
 *   makes a raw browser GET with no Authorization header and gets a 401.
 *   We instead fetch the HTML via axios (which injects the JWT), then
 *   hand the raw HTML to the iframe via srcdoc so no second request is needed.
 */
export default function IDCardModal({ memberId, onClose }) {
  const [html, setHtml]       = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const printRef              = useRef(null);

  useEffect(() => {
    if (!memberId) return;
    setLoading(true);
    setError(null);
    workforceService.fetchBadgeHtml(memberId)
      .then(data => { setHtml(data); setLoading(false); })
      .catch(() => { setError('Could not load badge. Please try again.'); setLoading(false); });
  }, [memberId]);

  if (!memberId) return null;

  const handlePrint = () => {
    const blob = new Blob([html], { type: 'text/html' });
    const url  = URL.createObjectURL(blob);
    const win  = window.open(url, '_blank');
    if (win) win.onload = () => { win.print(); URL.revokeObjectURL(url); };
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        zIndex: 2000, padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'white', borderRadius: '24px', width: '600px', height: '420px',
          position: 'relative', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '16px 24px', borderBottom: '1px solid #eee',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#1e293b' }}>Digital ID Badge</span>
          <button
            onClick={onClose}
            style={{
              background: '#f1f5f9', border: 'none', width: '32px', height: '32px',
              borderRadius: '50%', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', fontWeight: 900,
            }}
          >✕</button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, position: 'relative', background: '#f8fafc', overflow: 'hidden' }}>
          {loading && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex',
              flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: '12px', color: '#64748b',
            }}>
              <div style={{
                width: '36px', height: '36px', border: '3px solid #e2e8f0',
                borderTopColor: '#3b82f6', borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              <span style={{ fontSize: '0.85rem' }}>Loading badge…</span>
            </div>
          )}
          {error && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              padding: '24px', textAlign: 'center', color: '#ef4444', fontSize: '0.9rem',
            }}>
              {error}
            </div>
          )}
          {!loading && !error && (
            <iframe
              ref={printRef}
              srcDoc={html}
              style={{ width: '100%', height: '100%', border: 'none', overflow: 'hidden' }}
              scrolling="no"
              sandbox="allow-same-origin allow-scripts"
              title="Worker ID Card"
            />
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px', background: 'white', borderTop: '1px solid #eee' }}>
          <button
            onClick={handlePrint}
            disabled={loading || !!error}
            style={{
              width: '100%', padding: '12px', borderRadius: '12px',
              background: loading || error ? '#94a3b8' : '#3b82f6',
              color: 'white', border: 'none', fontWeight: 700,
              cursor: loading || error ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
            }}
          >
            🖨️ Print Full Badge
          </button>
        </div>
      </div>
    </div>
  );
}
