/**
 * shared/ui/Modal — unified modal used across all modules.
 *
 * Props:
 *   isOpen     {boolean}   — controls visibility
 *   onClose    {function}  — called on Escape / backdrop click / × button
 *   title      {string}    — header title
 *   children   {ReactNode} — body content
 *   maxWidth   {string}    — Tailwind max-w-* class (default 'max-w-lg')
 *   noPadding  {boolean}   — skip default body padding (useful for tables)
 */
import { useEffect } from 'react';

export default function Modal({
    isOpen,
    onClose,
    title,
    children,
    maxWidth = 'max-w-lg',
    noPadding = false,
}) {
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div
                className={`w-full ${maxWidth} rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]`}
                style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)' }}
            >
                {/* Header */}
                <div
                    className="flex items-center justify-between px-6 py-4"
                    style={{ borderBottom: '1px solid var(--t-border)', background: 'var(--t-bg)' }}
                >
                    <h3
                        className="text-xs font-black uppercase tracking-widest"
                        style={{ color: 'var(--t-text)' }}
                    >
                        {title}
                    </h3>
                    <button
                        onClick={onClose}
                        className="w-7 h-7 flex items-center justify-center rounded-full text-lg transition-colors"
                        style={{ color: 'var(--t-text3)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--t-border)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                        ×
                    </button>
                </div>

                {/* Body */}
                <div className={`overflow-y-auto flex-1 ${noPadding ? '' : 'p-6'}`}>
                    {children}
                </div>
            </div>
        </div>
    );
}
