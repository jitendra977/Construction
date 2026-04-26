import { useEffect } from 'react';

export default function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-lg' }) {
    useEffect(() => {
        if (!isOpen) return;
        const h = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className={`w-full ${maxWidth} rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]`}
                style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
                <div className="flex items-center justify-between px-6 py-4"
                    style={{ borderBottom: '1px solid var(--t-border)' }}>
                    <h3 className="text-sm font-black uppercase tracking-wide" style={{ color: 'var(--t-text)' }}>
                        {title}
                    </h3>
                    <button onClick={onClose}
                        className="w-7 h-7 flex items-center justify-center rounded-full text-lg transition-colors"
                        style={{ color: 'var(--t-text3)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--t-border)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >×</button>
                </div>
                <div className="overflow-y-auto flex-1">{children}</div>
            </div>
        </div>
    );
}
