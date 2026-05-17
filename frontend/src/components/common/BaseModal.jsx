/**
 * BaseModal — shared modal shell used by all feature modals.
 *
 * Props:
 *   isOpen      {boolean}         — controls visibility
 *   onClose     {() => void}      — called when backdrop or × is clicked, or ESC pressed
 *   title       {string|node}     — header text / element
 *   children    {node}            — body content
 *   footer      {node}            — optional footer slot (action buttons, etc.)
 *   maxWidth    {string}          — Tailwind max-w class (default 'max-w-3xl')
 *   hideHeader  {boolean}         — render without the title bar (for fully custom modals)
 *   closeOnBackdrop {boolean}     — whether clicking the backdrop closes (default true)
 *
 * Usage:
 *   <BaseModal isOpen={open} onClose={() => setOpen(false)} title="Add Supplier">
 *     <SupplierForm … />
 *   </BaseModal>
 */
import React, { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

const BaseModal = ({
    isOpen,
    onClose,
    title,
    children,
    footer,
    maxWidth = 'max-w-3xl',
    hideHeader = false,
    closeOnBackdrop = true,
}) => {
    // Lock body scroll while open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    // ESC key closes modal
    const handleKeyDown = useCallback(
        (e) => { if (e.key === 'Escape') onClose?.(); },
        [onClose],
    );
    useEffect(() => {
        if (!isOpen) return;
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, handleKeyDown]);

    if (!isOpen) return null;

    const content = (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 lg:p-12 pb-28 sm:pb-6 overflow-hidden">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-fadeIn"
                onClick={closeOnBackdrop ? onClose : undefined}
            />

            {/* Panel */}
            <div className={`relative w-full ${maxWidth} z-[10000] animate-slideUp sm:animate-zoomIn max-h-[90vh] flex flex-col`}>
                <div className="relative flex flex-col w-full bg-[var(--t-surface)] sm:rounded-[2px] rounded-t-[2px] shadow-2xl border border-[var(--t-border)] overflow-hidden h-full">

                    {/* Header */}
                    {!hideHeader && (
                        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--t-border)] sticky top-0 bg-[var(--t-surface)] z-10 shrink-0">
                            <h3 className="text-xl font-[var(--title-font,'Bebas_Neue',sans-serif)] text-[var(--t-text)] tracking-wider">
                                {title}
                            </h3>
                            <button
                                onClick={onClose}
                                aria-label="Close"
                                className="p-1 ml-auto text-[var(--t-text3)] hover:text-[var(--t-danger)] rounded-[2px] transition-all active:scale-95 flex items-center justify-center group"
                            >
                                <span className="text-3xl leading-none font-light transition-transform group-hover:rotate-90">
                                    ×
                                </span>
                            </button>
                        </div>
                    )}

                    {/* Body */}
                    <div className="relative p-6 flex-1 overflow-y-auto bg-[var(--t-bg)] custom-scrollbar">
                        {children}
                    </div>

                    {/* Footer */}
                    {footer && (
                        <div className="shrink-0 p-4 pb-10 sm:pb-4 border-t border-[var(--t-border)] bg-[var(--t-surface)]">
                            {footer}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    return createPortal(content, document.body);
};

export default BaseModal;
