import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel, confirmText = "Yes, Proceed", cancelText = "No, Cancel", type = "warning" }) => {
    // Prevent scrolling behind modal
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const typeColors = {
        warning: 'var(--t-warn)',
        danger: 'var(--t-danger)',
        info: 'var(--t-info)',
        primary: 'var(--t-primary)'
    };

    const color = typeColors[type] || typeColors.warning;

    const modalContent = (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 pb-28 sm:pb-4">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-fadeIn"
                onClick={onCancel}
            ></div>

            {/* Modal Content */}
            <div className="relative w-full max-w-[340px] bg-[var(--t-surface)] rounded-[4px] shadow-2xl overflow-hidden animate-zoomIn border border-[var(--t-border)]">
                <div className="p-6 text-center">
                    {/* Icon */}
                    <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-full border-2" style={{ borderColor: `${color}40`, color: color }}>
                        {type === 'warning' && <span className="text-xl">⚠️</span>}
                        {type === 'danger' && <span className="text-xl">🛑</span>}
                        {type === 'info' && <span className="text-xl">ℹ️</span>}
                        {type === 'primary' && <span className="text-xl">⚡</span>}
                    </div>

                    <h3 className="text-sm font-['DM_Mono',monospace] uppercase tracking-widest text-[var(--t-text)] mb-2">
                        {title}
                    </h3>
                    <p className="text-[12px] text-[var(--t-text2)] font-medium leading-relaxed mb-6">
                        {message}
                    </p>

                    <div className="flex flex-col gap-2">
                        <button
                            onClick={onConfirm}
                            className="w-full py-2.5 text-[10px] font-['DM_Mono',monospace] uppercase tracking-widest transition-all rounded-[2px]"
                            style={{ backgroundColor: color, color: 'var(--t-bg)' }}
                        >
                            {confirmText}
                        </button>
                        <button
                            onClick={onCancel}
                            className="w-full py-2.5 text-[10px] font-['DM_Mono',monospace] uppercase tracking-widest text-[var(--t-text3)] hover:text-[var(--t-text)] border border-[var(--t-border)] rounded-[2px] transition-colors"
                        >
                            {cancelText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default ConfirmModal;
