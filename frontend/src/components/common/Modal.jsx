import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

const Modal = ({ isOpen, onClose, title, children, footer, maxWidth = 'max-w-3xl' }) => {
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

    const modalContent = (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 lg:p-12 pb-28 sm:pb-6 outline-none focus:outline-none overflow-hidden">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-fadeIn"
                onClick={onClose}
            ></div>

            {/* Modal Container */}
            <div className={`relative w-full ${maxWidth} z-[10000] animate-slideUp sm:animate-zoomIn max-h-[90vh] flex flex-col`}>
                <div className="relative flex flex-col w-full bg-[var(--t-surface)] sm:rounded-[2px] rounded-t-[2px] shadow-2xl border border-[var(--t-border)] outline-none focus:outline-none overflow-hidden h-full">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--t-border)] sticky top-0 bg-[var(--t-surface)] z-10 shrink-0">
                        <h3 className="text-xl font-['Bebas_Neue',sans-serif] text-[var(--t-text)] tracking-wider">
                            {title}
                        </h3>
                        <button
                            className="p-1 ml-auto text-[var(--t-text3)] hover:text-[var(--t-danger)] rounded-[2px] transition-all active:scale-95 flex items-center justify-center group"
                            onClick={onClose}
                        >
                            <span className="text-3xl leading-none font-light transition-transform group-hover:rotate-90">
                                ×
                            </span>
                        </button>
                    </div>

                    {/* Body */}
                    <div className="relative p-6 flex-1 overflow-y-auto bg-[var(--t-bg)] custom-scrollbar">
                        {children}
                    </div>

                    {/* Footer Slot */}
                    {footer && (
                        <div className="shrink-0 p-4 pb-10 sm:pb-4 border-t border-[var(--t-border)] bg-[var(--t-surface)]">
                            {footer}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default Modal;
