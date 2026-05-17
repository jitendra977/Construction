/**
 * UnifiedButton — fixed chat window (bottom-right).
 * Collapsed = small icon button. Expanded = full chat window.
 */
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import UnifiedPanel from './UnifiedPanel';

/* ── Tab meta ─────────────────────────────────────────────────────────────── */
const TABS = [
    { id: 'ai',         icon: '🤖', label: 'साथी'   },
    { id: 'task',       icon: '📋', label: 'काम'    },
    { id: 'photo',      icon: '📷', label: 'फोटो'   },
    { id: 'attendance', icon: '👷', label: 'हाजिरी' },
    { id: 'expense',    icon: '💰', label: 'खर्च'   },
];

/* ── CSS ─────────────────────────────────────────────────────────────────── */
const CSS = `
  /* Icon button (collapsed) */
  @keyframes cw-icon-in {
    from { transform: scale(0.6) rotate(-15deg); opacity: 0; }
    to   { transform: scale(1)   rotate(0deg);   opacity: 1; }
  }
  .cw-icon-btn {
    animation: cw-icon-in 0.28s cubic-bezier(0.34,1.56,0.64,1) forwards;
  }
  @keyframes cw-ring {
    0%   { box-shadow: 0 0 0 0    rgba(99,102,241,.5); }
    70%  { box-shadow: 0 0 0 12px transparent; }
    100% { box-shadow: 0 0 0 0    transparent; }
  }
  .cw-ring { animation: cw-ring 3s ease-out infinite; }

  /* Window (expanded) */
  @keyframes cw-win-in {
    from { transform: translateY(20px) scale(0.96); opacity: 0; }
    to   { transform: translateY(0)    scale(1);    opacity: 1; }
  }
  .cw-window {
    animation: cw-win-in 0.22s cubic-bezier(0.34,1.2,0.64,1) forwards;
    display: flex; flex-direction: column;
    background: var(--t-bg);
    border: 1px solid var(--t-border);
    border-radius: 18px;
    overflow: hidden;
    box-shadow: 0 24px 64px rgba(0,0,0,.32), 0 0 0 1px var(--t-border);
  }

  /* Title bar */
  .cw-bar {
    display: flex; align-items: center; gap: 9px;
    padding: 0 10px 0 12px; height: 48px;
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    flex-shrink: 0; user-select: none;
  }
  .cw-bar-btn {
    width: 26px; height: 26px; border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    background: rgba(255,255,255,.15); border: none; cursor: pointer;
    color: #fff; font-size: 13px; transition: background .15s; flex-shrink: 0;
  }
  .cw-bar-btn:hover { background: rgba(255,255,255,.3); }

  /* Tab strip */
  .cw-tab-strip {
    display: flex; border-bottom: 1px solid var(--t-border);
    background: var(--t-surface); flex-shrink: 0;
  }
  .cw-tab {
    flex: 1; padding: 8px 2px; border: none; cursor: pointer;
    font-size: 8.5px; font-weight: 800; letter-spacing: .04em;
    font-family: 'DM Mono', monospace; text-transform: uppercase;
    background: transparent; color: var(--t-text3);
    border-bottom: 2px solid transparent;
    display: flex; flex-direction: column; align-items: center; gap: 2px;
    transition: all .14s;
  }
  .cw-tab.active {
    color: var(--t-primary); border-bottom-color: var(--t-primary);
    background: color-mix(in srgb, var(--t-primary) 6%, transparent);
  }
  .cw-tab:hover:not(.active) { color: var(--t-text2); }
  .cw-tab-icon { font-size: 15px; line-height: 1; }

  @keyframes cw-dot {
    0%,100% { transform: scale(1); opacity: 1; }
    50%      { transform: scale(1.5); opacity: .6; }
  }
  .cw-dot { animation: cw-dot 2.4s ease-in-out infinite; }
`;

/* ── Chat bubble SVG ──────────────────────────────────────────────────────── */
const BubbleIcon = () => (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
            fill="rgba(255,255,255,.25)" stroke="#fff" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="8.5"  cy="10.5" r="1.1" fill="#fff"/>
        <circle cx="12"   cy="10.5" r="1.1" fill="#fff"/>
        <circle cx="15.5" cy="10.5" r="1.1" fill="#fff"/>
    </svg>
);

/* ── Component ───────────────────────────────────────────────────────────── */
export default function UnifiedButton({ projectId = null, isMobile = false }) {
    const [open, setOpen] = useState(false);
    const [tab,  setTab]  = useState('ai');

    /* Escape → collapse */
    useEffect(() => {
        if (!open) return;
        const fn = (e) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('keydown', fn);
        return () => document.removeEventListener('keydown', fn);
    }, [open]);

    const right  = isMobile ? '16px' : '24px';
    const bottom = isMobile ? '76px' : '24px';

    const winW = isMobile ? `calc(100vw - 32px)` : '420px';
    const winH = isMobile ? `calc(100vh - 110px)` : '620px';

    return createPortal(
        <>
            <style>{CSS}</style>

            {/* ── Collapsed: icon only ─────────────────────────────────── */}
            {!open && (
                <button
                    className="cw-icon-btn cw-ring"
                    onClick={() => setOpen(true)}
                    style={{
                        position: 'fixed', bottom, right, zIndex: 9000,
                        width: 52, height: 52, borderRadius: 16,
                        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                        border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 8px 28px rgba(99,102,241,.5)',
                    }}
                    aria-label="साथी खोल्नुस्"
                    title="साथी — AI सहायक + दैनिक अपडेट"
                >
                    <BubbleIcon />
                </button>
            )}

            {/* ── Expanded: full window ────────────────────────────────── */}
            {open && (
                <div
                    className="cw-window"
                    style={{
                        position: 'fixed', bottom, right, zIndex: 9000,
                        width: winW, height: winH,
                    }}
                >
                    {/* Title bar */}
                    <div className="cw-bar">
                        <div style={{
                            width: 30, height: 30, borderRadius: 10, flexShrink: 0,
                            background: 'rgba(255,255,255,.2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                        }}>
                            {TABS.find(t => t.id === tab)?.icon ?? '🤖'}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 13, fontWeight: 800, color: '#fff', lineHeight: 1 }}>साथी</p>
                            <p style={{ fontSize: 9, color: 'rgba(255,255,255,.7)', fontWeight: 600, fontFamily: "'DM Mono',monospace", textTransform: 'uppercase', letterSpacing: '.08em', marginTop: 2 }}>
                                {new Date().toLocaleDateString('ne-NP', { month: 'short', day: 'numeric' })} · निर्माण AI
                            </p>
                        </div>

                        <div className="cw-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80', flexShrink: 0 }} />

                        {/* Minimise → icon */}
                        <button
                            className="cw-bar-btn"
                            onClick={() => setOpen(false)}
                            title="Minimise"
                            aria-label="सानो पार्नुस्"
                        >
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                <path d="M2 8l4 4 4-4M6 2v10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </button>
                    </div>

                    {/* Tab strip */}
                    <div className="cw-tab-strip">
                        {TABS.map(t => (
                            <button
                                key={t.id}
                                className={`cw-tab${tab === t.id ? ' active' : ''}`}
                                onClick={() => setTab(t.id)}
                            >
                                <span className="cw-tab-icon">{t.icon}</span>
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {/* Content */}
                    <UnifiedPanel
                        onClose={null}
                        projectId={projectId}
                        isDesktop={!isMobile}
                        initialTab={tab}
                        activeTab={tab}
                        hideChrome={true}
                        onTabSwitch={setTab}
                    />
                </div>
            )}
        </>,
        document.body
    );
}
