/**
 * AiChatButton — floating trigger for the साथी AI panel.
 *
 * Desktop: fixed bottom-right, opens AiChatPanel as a floating card.
 * Mobile:  fixed bottom-right above the nav bar, opens as a sheet.
 *
 * Props:
 *   projectId  number|null  — passed to AiChatPanel for project context
 *   isMobile   boolean      — adjusts position for bottom nav
 */
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import AiChatPanel from './AiChatPanel';

const CSS = `
  @keyframes sathi-fab-in {
    from { transform: scale(0.5) rotate(-20deg); opacity: 0; }
    to   { transform: scale(1) rotate(0deg);    opacity: 1; }
  }
  .sathi-fab {
    animation: sathi-fab-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  }
  @keyframes sathi-panel-in {
    from { transform: scale(0.92) translateY(12px); opacity: 0; }
    to   { transform: scale(1)    translateY(0);    opacity: 1; }
  }
  .sathi-panel-wrap {
    animation: sathi-panel-in 0.22s cubic-bezier(0.34, 1.2, 0.64, 1) forwards;
  }

  /* Notification pulse on the FAB */
  @keyframes sathi-ring {
    0%   { box-shadow: 0 0 0 0   color-mix(in srgb, var(--t-primary) 50%, transparent); }
    70%  { box-shadow: 0 0 0 10px transparent; }
    100% { box-shadow: 0 0 0 0   transparent; }
  }
  .sathi-fab-ring { animation: sathi-ring 2.5s infinite; }
`;

export default function AiChatButton({ projectId = null, isMobile = false }) {
    const [open, setOpen] = useState(false);

    // Close on Escape
    useEffect(() => {
        if (!open) return;
        const handler = (e) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [open]);

    // Desktop positioning: bottom-right, above footer if any
    const fabBottom  = isMobile ? '88px' : '24px';  // above mobile nav
    const panelBottom = isMobile ? '160px' : '90px';
    const panelRight  = '20px';

    return createPortal(
        <>
            <style>{CSS}</style>

            {/* Floating trigger button */}
            <button
                onClick={() => setOpen(o => !o)}
                className={`sathi-fab sathi-fab-ring fixed z-[9000] flex items-center justify-center rounded-2xl shadow-2xl transition-all active:scale-95`}
                style={{
                    bottom: fabBottom,
                    right: '20px',
                    width: open ? 44 : 52,
                    height: open ? 44 : 52,
                    background: open
                        ? 'var(--t-surface2)'
                        : 'linear-gradient(135deg, var(--t-primary), color-mix(in srgb, var(--t-primary) 70%, black))',
                    border: open ? '1px solid var(--t-border)' : 'none',
                    color: open ? 'var(--t-text3)' : '#fff',
                    boxShadow: open
                        ? 'none'
                        : '0 8px 24px color-mix(in srgb, var(--t-primary) 40%, transparent)',
                    fontSize: open ? 18 : 22,
                    cursor: 'pointer',
                    transition: 'all 0.22s cubic-bezier(0.34, 1.2, 0.64, 1)',
                }}
                aria-label={open ? 'Close साथी' : 'Open साथी AI'}
                title={open ? 'Close' : 'साथी AI — Ask anything about your project'}
            >
                {open ? '✕' : '🤖'}
            </button>

            {/* Tooltip label (only when closed) */}
            {!open && (
                <div
                    className="fixed z-[8999] pointer-events-none"
                    style={{
                        bottom: `calc(${fabBottom} + 4px)`,
                        right: 80,
                        background: 'var(--t-surface)',
                        border: '1px solid var(--t-border)',
                        borderRadius: 8,
                        padding: '5px 10px',
                        opacity: 0,  // shown on hover via parent group — skipped for simplicity
                    }}
                >
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--t-text)', whiteSpace: 'nowrap' }}>
                        Ask साथी AI
                    </p>
                </div>
            )}

            {/* Panel */}
            {open && (
                <div
                    className="sathi-panel-wrap fixed z-[9000]"
                    style={{
                        bottom: panelBottom,
                        right: panelRight,
                    }}
                >
                    <AiChatPanel
                        onClose={() => setOpen(false)}
                        projectId={projectId}
                        isDesktop={!isMobile}
                    />
                </div>
            )}
        </>,
        document.body
    );
}
