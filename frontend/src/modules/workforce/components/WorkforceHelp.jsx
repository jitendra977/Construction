import React, { useState, useEffect } from 'react';

export default function WorkforceHelp() {
    const [open, setOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <>
            {/* Floating Help Button */}
            <button
                onClick={() => setOpen(true)}
                style={{
                    position: 'fixed',
                    bottom: isMobile ? 100 : 40,
                    right: isMobile ? 16 : 40,
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                    color: 'white',
                    border: '3px solid rgba(255,255,255,0.3)',
                    boxShadow: '0 10px 25px rgba(37, 99, 235, 0.5)',
                    cursor: 'pointer',
                    zIndex: 90,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 28,
                    animation: 'pulse-glow 2s infinite',
                    transition: 'transform 0.2s',
                }}
                onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'}
                onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                title="मद्दत (Help)"
            >
                ❓
            </button>

            <style>
                {`
                @keyframes pulse-glow {
                    0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
                    70% { box-shadow: 0 0 0 15px rgba(59, 130, 246, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
                }
                `}
            </style>

            {/* Help Dialog */}
            {open && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 1000,
                    background: 'rgba(15, 23, 42, 0.75)',
                    backdropFilter: 'blur(8px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: 16,
                    animation: 'fade-in 0.2s ease-out'
                }}>
                    <style>{`
                        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                        @keyframes slide-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                    `}</style>
                    <div style={{
                        background: 'var(--t-bg, #ffffff)',
                        borderRadius: 24,
                        width: '100%',
                        maxWidth: 550,
                        maxHeight: '90vh',
                        overflowY: 'auto',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                        position: 'relative',
                        animation: 'slide-up 0.3s ease-out'
                    }}>
                        {/* Header */}
                        <div style={{
                            background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
                            padding: '30px 32px',
                            color: 'white',
                            position: 'sticky',
                            top: 0,
                            zIndex: 2,
                            borderTopLeftRadius: 24,
                            borderTopRightRadius: 24,
                        }}>
                            <button
                                onClick={() => setOpen(false)}
                                style={{
                                    position: 'absolute', top: 20, right: 20,
                                    background: 'rgba(255,255,255,0.2)',
                                    border: 'none', color: 'white',
                                    width: 36, height: 36, borderRadius: 18,
                                    cursor: 'pointer', fontSize: 18,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    transition: 'background 0.2s'
                                }}
                                onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
                                onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                            >
                                ✕
                            </button>
                            <h2 style={{ margin: 0, fontSize: 26, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 12 }}>
                                <span>👷</span> कामदार व्यवस्थापन
                            </h2>
                            <p style={{ margin: '8px 0 0', opacity: 0.9, fontSize: 15, fontWeight: 500 }}>
                                Workforce Management Help Guide
                            </p>
                        </div>

                        {/* Content */}
                        <div style={{ padding: '32px' }}>
                            <p style={{ fontSize: 15, color: 'var(--t-text, #333)', marginBottom: 28, lineHeight: 1.6 }}>
                                यस पृष्ठबाट तपाईंले आफ्नो प्रोजेक्टका सम्पूर्ण कामदारहरूको रेकर्ड, हाजिरी, तलब र सुरक्षा विवरणहरू सजिलै हेर्न र व्यवस्थापन गर्न सक्नुहुन्छ।
                            </p>
                            
                            <div style={{ display: 'flex', gap: 16, marginBottom: 24, padding: 16, background: 'var(--t-surface, #f8fafc)', borderRadius: 16, border: '1px solid var(--t-border, #e2e8f0)' }}>
                                <div style={{ fontSize: 32 }}>👥</div>
                                <div>
                                    <h3 style={{ margin: '0 0 6px', color: '#1d4ed8', fontSize: 16, fontWeight: 800 }}>Members (सदस्यहरू)</h3>
                                    <p style={{ margin: 0, fontSize: 14, color: 'var(--t-text, #475569)', lineHeight: 1.5 }}>
                                        सम्पूर्ण कामदारहरूको सूची यहाँ हुन्छ। नयाँ कामदार थप्न <strong>"+ Add Member"</strong> बटन थिच्नुहोस्।
                                    </p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: 16, marginBottom: 24, padding: 16, background: 'var(--t-surface, #f8fafc)', borderRadius: 16, border: '1px solid var(--t-border, #e2e8f0)' }}>
                                <div style={{ fontSize: 32 }}>💰</div>
                                <div>
                                    <h3 style={{ margin: '0 0 6px', color: '#10b981', fontSize: 16, fontWeight: 800 }}>Payroll (तलब/भत्ता)</h3>
                                    <p style={{ margin: 0, fontSize: 14, color: 'var(--t-text, #475569)', lineHeight: 1.5 }}>
                                        हाजिरीको आधारमा कामदारहरूको तलब आफैं हिसाब हुन्छ। यहाँबाट तलबलाई सिधै "Finance" मा पठाउन सकिन्छ।
                                    </p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: 16, marginBottom: 24, padding: 16, background: 'var(--t-surface, #f8fafc)', borderRadius: 16, border: '1px solid var(--t-border, #e2e8f0)' }}>
                                <div style={{ fontSize: 32 }}>🏗️</div>
                                <div>
                                    <h3 style={{ margin: '0 0 6px', color: '#f59e0b', fontSize: 16, fontWeight: 800 }}>Assignments (कामको बाँडफाँड)</h3>
                                    <p style={{ margin: 0, fontSize: 14, color: 'var(--t-text, #475569)', lineHeight: 1.5 }}>
                                        कुन कामदार कुन साइट वा फेज (Phase) मा काम गर्दैछ भनेर यहाँबाट तोक्न सकिन्छ।
                                    </p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: 16, marginBottom: 24, padding: 16, background: 'var(--t-surface, #f8fafc)', borderRadius: 16, border: '1px solid var(--t-border, #e2e8f0)' }}>
                                <div style={{ fontSize: 32 }}>🦺</div>
                                <div>
                                    <h3 style={{ margin: '0 0 6px', color: '#ef4444', fontSize: 16, fontWeight: 800 }}>Safety (सुरक्षा)</h3>
                                    <p style={{ margin: 0, fontSize: 14, color: 'var(--t-text, #475569)', lineHeight: 1.5 }}>
                                        कामदारको सुरक्षा नियम उल्लङ्घन वा कुनै घटना भएमा त्यसको रेकर्ड राख्न यसको प्रयोग गरिन्छ।
                                    </p>
                                </div>
                            </div>

                            <div style={{ background: '#eff6ff', padding: 20, borderRadius: 16, border: '1px solid #bfdbfe', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                                <div style={{ fontSize: 24 }}>💡</div>
                                <div>
                                    <p style={{ margin: 0, fontSize: 14, color: '#1e40af', fontWeight: 600, lineHeight: 1.5 }}>
                                        <strong>महत्वपूर्ण जानकारी:</strong> कामदारहरूलाई आफ्नो विवरण हेर्न अनलाइन पोर्टलमा पहुँच दिन उनीहरूको प्रोफाइल खोलेर "Create Worker Portal Account" गर्न सकिन्छ।
                                    </p>
                                </div>
                            </div>
                        </div>
                        
                        <div style={{ padding: '20px 32px', borderTop: '1px solid var(--t-border, #e2e8f0)', display: 'flex', justifyContent: 'flex-end', background: 'var(--t-surface, #f8fafc)', borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }}>
                            <button 
                                onClick={() => setOpen(false)}
                                style={{
                                    padding: '12px 28px',
                                    borderRadius: 12,
                                    background: '#2563eb',
                                    color: 'white',
                                    border: 'none',
                                    fontWeight: 800,
                                    fontSize: 15,
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 6px rgba(37, 99, 235, 0.2)',
                                    transition: 'transform 0.1s, background 0.2s'
                                }}
                                onMouseOver={e => e.currentTarget.style.background = '#1d4ed8'}
                                onMouseOut={e => e.currentTarget.style.background = '#2563eb'}
                                onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
                                onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
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
