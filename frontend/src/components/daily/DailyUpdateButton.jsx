/**
 * DailyUpdateButton — floating green "📅" trigger for DailyUpdatePanel.
 * Renders via portal so it sits above all page content.
 */
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import DailyUpdatePanel from './DailyUpdatePanel';

const CSS = `
  @keyframes dup-fab-in {
    from { transform: scale(0.5) rotate(-20deg); opacity:0; }
    to   { transform: scale(1)   rotate(0deg);   opacity:1; }
  }
  .dup-fab { animation: dup-fab-in 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards; }

  @keyframes dup-panel-in {
    from { transform: scale(0.92) translateY(14px); opacity:0; }
    to   { transform: scale(1)    translateY(0);    opacity:1; }
  }
  .dup-panel-wrap { animation: dup-panel-in 0.22s cubic-bezier(0.34,1.2,0.64,1) forwards; }

  @keyframes dup-ring {
    0%   { box-shadow: 0 0 0 0   rgba(16,185,129,.55); }
    70%  { box-shadow: 0 0 0 10px transparent; }
    100% { box-shadow: 0 0 0 0   transparent; }
  }
  .dup-fab-ring { animation: dup-ring 2.8s infinite; }
`;

export default function DailyUpdateButton({ projectId = null, isMobile = false }) {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (!open) return;
        const fn = (e) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('keydown', fn);
        return () => document.removeEventListener('keydown', fn);
    }, [open]);

    const fabBottom   = isMobile ? '88px' : '84px'; // above AI button
    const panelBottom = isMobile ? '160px' : '90px';

    return createPortal(
        <>
            <style>{CSS}</style>

            {/* FAB */}
            <button
                onClick={() => setOpen(o => !o)}
                className={`dup-fab dup-fab-ring fixed z-[8990] flex items-center justify-center rounded-2xl shadow-2xl transition-all active:scale-95`}
                style={{
                    bottom: fabBottom,
                    right: open ? '76px' : '84px',
                    width: open ? 40 : 48,
                    height: open ? 40 : 48,
                    background: open
                        ? 'var(--t-surface2)'
                        : 'linear-gradient(135deg,#10b981,#059669)',
                    border: open ? '1px solid var(--t-border)' : 'none',
                    color: open ? 'var(--t-text3)' : '#fff',
                    fontSize: open ? 16 : 20,
                    cursor: 'pointer',
                    boxShadow: open ? 'none' : '0 8px 24px rgba(16,185,129,.4)',
                    transition: 'all 0.22s cubic-bezier(0.34,1.2,0.64,1)',
                }}
                aria-label={open ? 'बन्द गर्नुस्' : 'दैनिक अपडेट'}
                title={open ? 'Close' : 'दैनिक अपडेट — काम, फोटो, हाजिरी, खर्च'}
            >
                {open ? '✕' : '📅'}
            </button>

            {/* Panel */}
            {open && (
                <div
                    className="dup-panel-wrap fixed z-[8990]"
                    style={{ bottom: panelBottom, right: '20px' }}
                >
                    <DailyUpdatePanel
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
