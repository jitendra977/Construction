import React from 'react';
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Maximize2, Minimize2 } from 'lucide-react';
import QRScannerTab from './QRScannerTab';
import { MqttProvider } from './MqttContext';

function KioskViewportShell({ title, children }) {
    const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));

    useEffect(() => {
        const previousTitle = document.title;
        document.title = title;
        const handleFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => {
            document.title = previousTitle;
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, [title]);

    const toggleFullscreen = useCallback(async () => {
        try {
            if (document.fullscreenElement) {
                await document.exitFullscreen();
                return;
            }
            await document.documentElement.requestFullscreen?.({ navigationUI: 'hide' });
        } catch {
            // Ignore browsers that do not allow fullscreen here.
        }
    }, []);

    return (
        <div style={{ minHeight: '100vh', background: '#050508' }}>
            <button
                type="button"
                onClick={toggleFullscreen}
                title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                style={{
                    position: 'fixed',
                    top: 14,
                    right: 14,
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 14px',
                    borderRadius: 12,
                    border: '1px solid rgba(148, 163, 184, 0.25)',
                    background: 'rgba(15, 23, 42, 0.88)',
                    color: '#f8fafc',
                    fontSize: 12,
                    fontWeight: 700,
                    backdropFilter: 'blur(10px)',
                    boxShadow: '0 12px 32px rgba(15, 23, 42, 0.28)',
                }}
            >
                {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                <span>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
            </button>
            {children}
        </div>
    );
}

export default function AttendanceQrKiosk() {
    const { projectId } = useParams();

    if (!projectId) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#050508',
                color: '#fff',
                flexDirection: 'column',
                gap: 12,
            }}>
                <div style={{ fontSize: 48 }}>📷</div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>QR Kiosk</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
                    Use /qr-kiosk/&lt;projectId&gt;
                </div>
            </div>
        );
    }

    return (
        <MqttProvider projectId={projectId}>
            <KioskViewportShell title="ConstructPro QR Kiosk">
                <QRScannerTab projectId={projectId} />
            </KioskViewportShell>
        </MqttProvider>
    );
}
