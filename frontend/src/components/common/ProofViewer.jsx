import React from 'react';
import { createPortal } from 'react-dom';
import { getMediaUrl } from '../../services/api';

/**
 * ProofViewer
 * A cinematic overlay component to view payment receipts and proof photos.
 */
const ProofViewer = ({ photo, onClose }) => {
    if (!photo) return null;

    const content = (
        <div 
            className="fixed inset-0 z-[10001] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 md:p-20 transition-all animate-in fade-in duration-300"
            onClick={onClose}
        >
            <div 
                className="relative max-w-5xl w-full bg-[var(--t-surface)] rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button */}
                <div className="absolute top-6 right-6 z-10">
                    <button 
                        className="bg-black/40 text-white w-10 h-10 rounded-full flex items-center justify-center hover:bg-black transition-all shadow-lg"
                        onClick={onClose}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                
                {/* Image Area */}
                <div className="flex-1 min-h-0 bg-gray-900 flex items-center justify-center">
                    <img 
                        src={getMediaUrl(photo)} 
                        alt="Transaction Verification Proof" 
                        className="max-w-full max-h-[80vh] object-contain shadow-2xl transition-all"
                    />
                </div>
                
                {/* Footer / Controls */}
                <div className="px-8 py-4 bg-[var(--t-surface2)] border-t border-[var(--t-border)] flex justify-between items-center">
                    <div>
                        <div className="text-[10px] font-['DM_Mono',monospace] font-bold text-[var(--t-text)] uppercase tracking-[0.3em] mb-1">
                            Authenticated Ledger Proof
                        </div>
                        <div className="text-[9px] font-['DM_Mono',monospace] text-[var(--t-text3)] uppercase tracking-tighter opacity-60">
                            Reference ID: {photo.split('/').pop()}
                        </div>
                    </div>
                    <a 
                        href={getMediaUrl(photo)} 
                        target="_blank" 
                        rel="noreferrer"
                        className="px-5 py-2.5 bg-[var(--t-text)] text-[var(--t-bg)] rounded-[2px] text-[9px] font-['DM_Mono',monospace] font-bold uppercase tracking-[0.2em] hover:brightness-110 active:scale-95 transition-all shadow-xl shadow-black/10"
                    >
                        Download High-Res Original
                    </a>
                </div>
            </div>
        </div>
    );

    return createPortal(content, document.body);
};

export default ProofViewer;
