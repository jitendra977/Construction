import React, { useState } from 'react';

export default function WorkerHelp() {
    const [open, setOpen] = useState(false);

    return (
        <>
            {/* Floating Help Button for Worker Portal */}
            <button
                onClick={() => setOpen(true)}
                style={{
                    position: 'fixed',
                    bottom: 100, // Above the bottom nav bar
                    right: 16,
                    width: 50,
                    height: 50,
                    borderRadius: 25,
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: 'white',
                    border: '2px solid rgba(255,255,255,0.2)',
                    boxShadow: '0 8px 20px rgba(16, 185, 129, 0.4)',
                    cursor: 'pointer',
                    zIndex: 90,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 24,
                    animation: 'worker-pulse 2s infinite',
                    transition: 'transform 0.2s',
                }}
                title="मद्दत (Help)"
            >
                ❓
            </button>

            <style>
                {`
                @keyframes worker-pulse {
                    0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.6); }
                    70% { box-shadow: 0 0 0 12px rgba(16, 185, 129, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
                }
                `}
            </style>

            {/* Help Dialog */}
            {open && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 1000,
                    background: 'rgba(2, 6, 23, 0.85)',
                    backdropFilter: 'blur(8px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: 16,
                    animation: 'fade-in 0.2s ease-out',
                    color: '#f1f5f9'
                }}>
                    <style>{`
                        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                        @keyframes slide-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                    `}</style>
                    <div style={{
                        background: 'rgba(15, 23, 42, 0.95)',
                        borderRadius: 24,
                        width: '100%',
                        maxWidth: 400,
                        maxHeight: '85vh',
                        overflowY: 'auto',
                        border: '1px solid rgba(255,255,255,0.1)',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
                        position: 'relative',
                        animation: 'slide-up 0.3s ease-out'
                    }}>
                        {/* Header */}
                        <div style={{
                            background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                            padding: '24px',
                            position: 'sticky',
                            top: 0,
                            zIndex: 2,
                            borderTopLeftRadius: 24,
                            borderTopRightRadius: 24,
                        }}>
                            <button
                                onClick={() => setOpen(false)}
                                style={{
                                    position: 'absolute', top: 16, right: 16,
                                    background: 'rgba(255,255,255,0.2)',
                                    border: 'none', color: 'white',
                                    width: 32, height: 32, borderRadius: 16,
                                    cursor: 'pointer', fontSize: 16,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}
                            >
                                ✕
                            </button>
                            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span>👷</span> पोर्टल निर्देशिका
                            </h2>
                            <p style={{ margin: '6px 0 0', opacity: 0.9, fontSize: 13, fontWeight: 500 }}>
                                Worker Portal Help Guide
                            </p>
                        </div>

                        {/* Content */}
                        <div style={{ padding: '24px' }}>
                            <p style={{ fontSize: 14, color: '#cbd5e1', marginBottom: 20, lineHeight: 1.6 }}>
                                यो पोर्टलबाट तपाईंले आफ्नो हाजिरी, गर्नुपर्ने काम, र तलबको जानकारी सजिलै प्राप्त गर्न सक्नुहुन्छ।
                            </p>
                            
                            <div style={{ display: 'flex', gap: 14, marginBottom: 16, padding: 14, background: 'rgba(255,255,255,0.05)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ fontSize: 28 }}>🏠</div>
                                <div>
                                    <h3 style={{ margin: '0 0 4px', color: '#38bdf8', fontSize: 15, fontWeight: 800 }}>Home (गृहपृष्ठ)</h3>
                                    <p style={{ margin: 0, fontSize: 13, color: '#94a3b8', lineHeight: 1.5 }}>
                                        यहाँबाट आफ्नो दैनिक हाजिरी (Time Clock) गर्न सकिन्छ।
                                    </p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: 14, marginBottom: 16, padding: 14, background: 'rgba(255,255,255,0.05)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ fontSize: 28 }}>📋</div>
                                <div>
                                    <h3 style={{ margin: '0 0 4px', color: '#f59e0b', fontSize: 15, fontWeight: 800 }}>Tasks (कामहरू)</h3>
                                    <p style={{ margin: 0, fontSize: 13, color: '#94a3b8', lineHeight: 1.5 }}>
                                        तपाईंलाई दिइएको कामको सूची यहाँ हेर्न सकिन्छ।
                                    </p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: 14, marginBottom: 16, padding: 14, background: 'rgba(255,255,255,0.05)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ fontSize: 28 }}>📸</div>
                                <div>
                                    <h3 style={{ margin: '0 0 4px', color: '#f472b6', fontSize: 15, fontWeight: 800 }}>Photos (फोटोहरू)</h3>
                                    <p style={{ margin: 0, fontSize: 13, color: '#94a3b8', lineHeight: 1.5 }}>
                                        काम भइरहेको साइटको फोटो खिचेर पठाउन यसको प्रयोग गर्नुहोस्।
                                    </p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: 14, marginBottom: 16, padding: 14, background: 'rgba(255,255,255,0.05)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ fontSize: 28 }}>👤</div>
                                <div>
                                    <h3 style={{ margin: '0 0 4px', color: '#a78bfa', fontSize: 15, fontWeight: 800 }}>Profile (प्रोफाइल)</h3>
                                    <p style={{ margin: 0, fontSize: 13, color: '#94a3b8', lineHeight: 1.5 }}>
                                        आफ्नो ID Card, हाजिरीको रेकर्ड, र महिनाभरिको तलब (Earnings) यहाँ हेर्नुहोस्।
                                    </p>
                                </div>
                            </div>
                        </div>
                        
                        <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.2)', borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }}>
                            <button 
                                onClick={() => setOpen(false)}
                                style={{
                                    padding: '10px 24px',
                                    borderRadius: 12,
                                    background: '#10b981',
                                    color: 'white',
                                    border: 'none',
                                    fontWeight: 800,
                                    fontSize: 14,
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                                }}
                            >
                                मैले बुझें (Got it)
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
