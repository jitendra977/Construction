import React, { useEffect } from 'react';

const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-3xl' }) => {
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

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 outline-none focus:outline-none">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-fadeIn"
                onClick={onClose}
            ></div>

            {/* Modal Container */}
            <div className={`relative w-full ${maxWidth} mx-auto z-[101] animate-slideUp sm:animate-zoomIn max-h-[92vh] sm:max-h-[90vh] flex flex-col`}>
                <div className="relative flex flex-col w-full bg-white sm:rounded-2xl rounded-t-[32px] shadow-2xl outline-none focus:outline-none overflow-hidden h-full">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 sticky top-0 bg-white z-10">
                        <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">
                            {title}
                        </h3>
                        <button
                            className="p-2 ml-auto bg-gray-50 border-0 text-gray-400 hover:text-gray-900 rounded-full transition-all active:scale-95 flex items-center justify-center group"
                            onClick={onClose}
                        >
                            <span className="text-2xl leading-none font-medium transition-transform group-hover:rotate-90">
                                ×
                            </span>
                        </button>
                    </div>

                    {/* Body */}
                    <div className="relative p-6 flex-auto overflow-y-auto custom-scrollbar">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Modal;
