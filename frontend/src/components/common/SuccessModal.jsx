import React, { useEffect } from 'react';

const SuccessModal = ({ isOpen, onClose, title, message, supplierName }) => {
    // Prevent scrolling behind modal
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            // Auto close after 5 seconds if not closed manually
            const timer = setTimeout(() => {
                onClose();
            }, 5000);
            return () => {
                document.body.style.overflow = 'unset';
                clearTimeout(timer);
            };
        }
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/40 backdrop-blur-md transition-opacity animate-fadeIn"
                onClick={onClose}
            ></div>

            {/* Modal Content */}
            <div className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden animate-zoomIn border border-white">
                {/* Decorative Background */}
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-green-400/20 to-emerald-500/20 -z-10"></div>

                <div className="p-8 text-center">
                    {/* Animated Checkmark Icon */}
                    <div className="mb-6 inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full animate-bounceIn">
                        <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>

                    <h3 className="text-2xl font-black text-gray-900 mb-2 leading-tight">
                        {title || 'Order Successful!'}
                    </h3>

                    <div className="space-y-4">
                        <p className="text-gray-600 font-medium">
                            {message || 'Order email has been sent successfully.'}
                        </p>

                        {supplierName && (
                            <div className="inline-block px-4 py-2 bg-gray-50 rounded-2xl border border-gray-100">
                                <span className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-1">Supplier Involved</span>
                                <span className="text-sm font-bold text-gray-900">✅ {supplierName}</span>
                            </div>
                        )}

                        <div className="pt-4">
                            <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest leading-relaxed">
                                Added to Pending Orders<br />& Sent to Supplier's Inbox
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="mt-8 w-full py-4 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-gray-200 hover:shadow-xl hover:-translate-y-0.5 transition-all active:scale-95"
                    >
                        Great, Thanks!
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SuccessModal;
