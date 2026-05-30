import React, { useState } from 'react';

export default function WorkerHelp() {
    const [open, setOpen] = useState(false);

    return (
        <>
            {/* Floating Help Button for Worker Portal - Top Right */}
            <button
                onClick={() => setOpen(true)}
                style={{
                    position: 'fixed',
                    top: 24,
                    right: 24,
                    width: 52,
                    height: 52,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05))',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.3)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 0 0 1px rgba(255,255,255,0.2)',
                    cursor: 'pointer',
                    zIndex: 900,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 26,
                    animation: 'worker-float 3s ease-in-out infinite, worker-pulse-glow 2s infinite',
                    transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.15)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                title="मद्दत (Help)"
            >
                <span style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>💡</span>
            </button>

            <style>
                {`
                @keyframes worker-float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-6px); }
                }
                @keyframes worker-pulse-glow {
                    0% { box-shadow: 0 8px 32px rgba(0,0,0,0.3), 0 0 0 0 rgba(56, 189, 248, 0.4); }
                    70% { box-shadow: 0 8px 32px rgba(0,0,0,0.3), 0 0 0 15px rgba(56, 189, 248, 0); }
                    100% { box-shadow: 0 8px 32px rgba(0,0,0,0.3), 0 0 0 0 rgba(56, 189, 248, 0); }
                }
                .worker-glass-card {
                    background: rgba(30, 41, 59, 0.6);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 20px;
                    padding: 18px;
                    margin-bottom: 16px;
                    transition: transform 0.2s, background 0.2s;
                }
                .worker-glass-card:active {
                    transform: scale(0.97);
                    background: rgba(30, 41, 59, 0.8);
                }
                `}
            </style>

            {/* Premium Glassmorphism Help Dialog */}
            {open && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 1000,
                    background: 'rgba(2, 6, 23, 0.75)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: 16,
                    animation: 'fade-in 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                    color: '#f1f5f9'
                }}>
                    <style>{`
                        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                        @keyframes pop-in { from { opacity: 0; transform: scale(0.92) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
                    `}</style>
                    <div style={{
                        background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)',
                        borderRadius: 32,
                        width: '100%',
                        maxWidth: 440,
                        maxHeight: '88vh',
                        display: 'flex',
                        flexDirection: 'column',
                        border: '1px solid rgba(255,255,255,0.15)',
                        boxShadow: '0 30px 60px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255,255,255,0.2)',
                        animation: 'pop-in 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                        overflow: 'hidden'
                    }}>
                        {/* Header area with rich gradient */}
                        <div style={{
                            background: 'linear-gradient(135deg, #0ea5e9 0%, #3b82f6 50%, #6366f1 100%)',
                            padding: '30px 24px 24px',
                            position: 'relative',
                        }}>
                            {/* Decorative background circles */}
                            <div style={{ position: 'absolute', top: -30, right: -20, width: 120, height: 120, background: 'rgba(255,255,255,0.1)', borderRadius: '50%', filter: 'blur(20px)' }} />
                            <div style={{ position: 'absolute', bottom: -10, left: 20, width: 80, height: 80, background: 'rgba(255,255,255,0.15)', borderRadius: '50%', filter: 'blur(15px)' }} />

                            <button
                                onClick={() => setOpen(false)}
                                style={{
                                    position: 'absolute', top: 20, right: 20,
                                    background: 'rgba(0,0,0,0.2)',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    color: 'white',
                                    width: 36, height: 36, borderRadius: '50%',
                                    cursor: 'pointer', fontSize: 18,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    backdropFilter: 'blur(4px)',
                                    zIndex: 10
                                }}
                            >
                                ✕
                            </button>
                            
                            <div style={{ position: 'relative', zIndex: 2 }}>
                                <div style={{ fontSize: 42, filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))', marginBottom: 12 }}>📱</div>
                                <h2 style={{ margin: 0, fontSize: 24, fontWeight: 900, textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                                    प्रयोगकर्ता निर्देशिका
                                </h2>
                                <p style={{ margin: '6px 0 0', opacity: 0.9, fontSize: 14, fontWeight: 600, textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                                    Worker Portal Advanced Guide
                                </p>
                            </div>
                        </div>

                        {/* Scrollable Content */}
                        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
                            <p style={{ fontSize: 15, color: '#94a3b8', marginBottom: 24, lineHeight: 1.6, fontWeight: 500 }}>
                                नमस्ते! यो एप चलाउन एकदमै सजिलो छ। तलका बटनहरू थिचेर तपाईंले आफ्नो काम र हाजिरी सम्बन्धी सबै विवरण हेर्न सक्नुहुन्छ:
                            </p>
                            
                            <div className="worker-glass-card">
                                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                                    <div style={{ fontSize: 32, background: 'rgba(56, 189, 248, 0.2)', padding: '12px', borderRadius: 16, border: '1px solid rgba(56, 189, 248, 0.3)' }}>🏠</div>
                                    <div>
                                        <h3 style={{ margin: '0 0 6px', color: '#38bdf8', fontSize: 17, fontWeight: 900 }}>१. गृहपृष्ठ (Home)</h3>
                                        <p style={{ margin: 0, fontSize: 14, color: '#cbd5e1', lineHeight: 1.6 }}>
                                            यो तपाईंको मुख्य पृष्ठ हो। काम सुरु गर्दा हरियो <strong>'हाजिरी गर्ने (Clock In)'</strong> बटन थिच्नुहोस्। काम सकिएपछि रातो <strong>'हाजिरी बन्द गर्ने (Clock Out)'</strong> बटन थिचेर आफ्नो हाजिरी पूरा गर्नुहोस्।
                                        </p>
                                        <img src="/images/worker_home_screen_nepali_1780138051410.png" alt="Home Screen" style={{ width: '100%', marginTop: 12, borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }} />
                                    </div>
                                </div>
                            </div>

                            <div className="worker-glass-card">
                                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                                    <div style={{ fontSize: 32, background: 'rgba(245, 158, 11, 0.2)', padding: '12px', borderRadius: 16, border: '1px solid rgba(245, 158, 11, 0.3)' }}>📋</div>
                                    <div>
                                        <h3 style={{ margin: '0 0 6px', color: '#f59e0b', fontSize: 17, fontWeight: 900 }}>२. कामहरू (Tasks)</h3>
                                        <p style={{ margin: 0, fontSize: 14, color: '#cbd5e1', lineHeight: 1.6 }}>
                                            सुपरभाइजरले तपाईंलाई दिएको आजको कामको सूची यहाँ देखिन्छ। काम सकिएपछि स्थिति अपडेट गरेर <strong>'सम्पन्न (Done)'</strong> गर्न नभुल्नुहोला।
                                        </p>
                                        <img src="/images/worker_tasks_screen_nepali_1780138066449.png" alt="Tasks Screen" style={{ width: '100%', marginTop: 12, borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }} />
                                    </div>
                                </div>
                            </div>

                            <div className="worker-glass-card">
                                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                                    <div style={{ fontSize: 32, background: 'rgba(244, 114, 182, 0.2)', padding: '12px', borderRadius: 16, border: '1px solid rgba(244, 114, 182, 0.3)' }}>📸</div>
                                    <div>
                                        <h3 style={{ margin: '0 0 6px', color: '#f472b6', fontSize: 17, fontWeight: 900 }}>३. फोटोहरू (Photos)</h3>
                                        <p style={{ margin: 0, fontSize: 14, color: '#cbd5e1', lineHeight: 1.6 }}>
                                            साइटमा भएको प्रगति र नयाँ कामको फोटो <strong>'लाइभ फोटो'</strong> वा <strong>'ग्यालरी'</strong> मार्फत खिचेर सुरक्षित रूपमा पठाउन सकिन्छ।
                                        </p>
                                        <img src="/images/worker_photos_screen_nepali_1780138097561.png" alt="Photos Screen" style={{ width: '100%', marginTop: 12, borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }} />
                                    </div>
                                </div>
                            </div>

                            <div className="worker-glass-card">
                                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                                    <div style={{ fontSize: 32, background: 'rgba(167, 139, 250, 0.2)', padding: '12px', borderRadius: 16, border: '1px solid rgba(167, 139, 250, 0.3)' }}>👤</div>
                                    <div>
                                        <h3 style={{ margin: '0 0 6px', color: '#a78bfa', fontSize: 17, fontWeight: 900 }}>४. प्रोफाइल (Profile)</h3>
                                        <p style={{ margin: 0, fontSize: 14, color: '#cbd5e1', lineHeight: 1.6 }}>
                                            आफ्नो <strong>'मेरो परिचय पत्र (ID Badge)'</strong>, महिनाभरिको <strong>'हाजिरी विवरण (Attendance Log)'</strong>, र <strong>'कुल तलब (Earnings)'</strong> आफैंले हेर्न सक्नुहुन्छ।
                                        </p>
                                        <img src="/images/worker_profile_screen_nepali_1780138113231.png" alt="Profile Screen" style={{ width: '100%', marginTop: 12, borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Footer / Action */}
                        <div style={{ 
                            padding: '20px 24px', 
                            background: 'rgba(15, 23, 42, 0.95)',
                            borderTop: '1px solid rgba(255,255,255,0.1)',
                            display: 'flex', justifyContent: 'center'
                        }}>
                            <button 
                                onClick={() => setOpen(false)}
                                style={{
                                    width: '100%',
                                    padding: '14px',
                                    borderRadius: 16,
                                    background: 'linear-gradient(135deg, #38bdf8 0%, #3b82f6 100%)',
                                    color: 'white',
                                    border: 'none',
                                    fontWeight: 900,
                                    fontSize: 16,
                                    cursor: 'pointer',
                                    boxShadow: '0 8px 20px rgba(59, 130, 246, 0.4), inset 0 2px 0 rgba(255,255,255,0.2)',
                                    transition: 'transform 0.1s'
                                }}
                                onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.96)'}
                                onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                मैले बुझें (Understood)
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
