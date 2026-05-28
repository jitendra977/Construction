/**
 * WorkerUploadContext.jsx
 * ────────────────────────
 * Global background upload manager for the Worker Portal.
 * 
 * Features:
 *  - Continues uploads across tab/route changes
 *  - Shows a persistent floating progress card at the bottom
 *  - Fires a browser notification when upload finishes (even if browser is minimized)
 *  - Multiple concurrent uploads tracked individually
 */
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const WorkerUploadContext = createContext(null);

// ── Request notification permission on mount ─────────────────────────────────
async function requestNotificationPermission() {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
        await Notification.requestPermission();
    }
}

function sendNotification(title, body) {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    try {
        new Notification(title, {
            body,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
        });
    } catch {}
}

export function WorkerUploadProvider({ children }) {
    const [uploads, setUploads] = useState({});

    // Request notification permission when provider mounts
    useEffect(() => {
        requestNotificationPermission();
    }, []);

    const dispatchWorkerUpload = useCallback(async (uploadFn, filename) => {
        const uploadId = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

        setUploads(prev => ({
            ...prev,
            [uploadId]: { id: uploadId, filename, progress: 0, status: 'UPLOADING' }
        }));

        try {
            // uploadFn is expected to be a promise factory that accepts an onProgress cb
            await uploadFn((evt) => {
                if (!evt.total) return;
                const pct = Math.round((evt.loaded * 100) / evt.total);
                setUploads(prev => ({
                    ...prev,
                    [uploadId]: { ...prev[uploadId], progress: pct }
                }));
            });

            setUploads(prev => ({
                ...prev,
                [uploadId]: { ...prev[uploadId], progress: 100, status: 'COMPLETED' }
            }));

            // Notify even if browser is in background
            sendNotification('Upload complete! 📸', `"${filename}" was uploaded successfully.`);

            setTimeout(() => {
                setUploads(prev => {
                    const next = { ...prev };
                    delete next[uploadId];
                    return next;
                });
            }, 4000);
        } catch (error) {
            console.error('Worker upload failed', error);
            setUploads(prev => ({
                ...prev,
                [uploadId]: { ...prev[uploadId], status: 'ERROR' }
            }));

            sendNotification('Upload failed ❌', `Failed to upload "${filename}". Please try again.`);

            setTimeout(() => {
                setUploads(prev => {
                    const next = { ...prev };
                    delete next[uploadId];
                    return next;
                });
            }, 6000);
        }
    }, []);

    const value = { dispatchWorkerUpload };

    const uploadList = Object.values(uploads);

    return (
        <WorkerUploadContext.Provider value={value}>
            {children}
            {/* ── Floating upload progress overlay ── */}
            {uploadList.length > 0 && (
                <div style={{
                    position: 'fixed', bottom: 80, left: 0, right: 0,
                    zIndex: 99998,
                    display: 'flex', flexDirection: 'column', gap: 10,
                    padding: '0 16px',
                    pointerEvents: 'none',
                }}>
                    {uploadList.map(upload => (
                        <div key={upload.id} style={{
                            background: 'rgba(15,23,42,0.97)',
                            backdropFilter: 'blur(16px)',
                            border: upload.status === 'ERROR'
                                ? '1.5px solid rgba(248,113,113,0.5)'
                                : upload.status === 'COMPLETED'
                                    ? '1.5px solid rgba(74,222,128,0.5)'
                                    : '1.5px solid rgba(56,189,248,0.3)',
                            borderRadius: 18,
                            padding: '14px 18px',
                            boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
                            pointerEvents: 'auto',
                        }}>
                            {/* Title row */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                                    <span style={{ fontSize: 18 }}>
                                        {upload.status === 'UPLOADING' ? '📤' : upload.status === 'ERROR' ? '❌' : '✅'}
                                    </span>
                                    <div style={{ minWidth: 0 }}>
                                        <p style={{ fontSize: 13, fontWeight: 800, color: '#f1f5f9', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {upload.status === 'UPLOADING' ? 'Uploading…' : upload.status === 'COMPLETED' ? 'Upload complete!' : 'Upload failed'}
                                        </p>
                                        <p style={{ fontSize: 11, color: '#64748b', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {upload.filename}
                                        </p>
                                    </div>
                                </div>
                                <span style={{
                                    fontSize: 15, fontWeight: 900, flexShrink: 0, marginLeft: 12,
                                    color: upload.status === 'ERROR' ? '#f87171' : upload.status === 'COMPLETED' ? '#4ade80' : '#38bdf8'
                                }}>
                                    {upload.status === 'ERROR' ? 'Error' : upload.status === 'COMPLETED' ? '100%' : `${upload.progress}%`}
                                </span>
                            </div>

                            {/* Progress bar */}
                            <div style={{ width: '100%', height: 10, background: '#1e293b', borderRadius: 5, overflow: 'hidden' }}>
                                <div style={{
                                    width: `${upload.progress}%`, height: '100%',
                                    background: upload.status === 'ERROR'
                                        ? '#ef4444'
                                        : upload.status === 'COMPLETED'
                                            ? '#22c55e'
                                            : 'linear-gradient(90deg, #0369a1, #38bdf8)',
                                    transition: 'width 0.25s ease-out',
                                    borderRadius: 5,
                                }} />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </WorkerUploadContext.Provider>
    );
}

export function useWorkerUpload() {
    const ctx = useContext(WorkerUploadContext);
    if (!ctx) throw new Error('useWorkerUpload must be used inside WorkerUploadProvider');
    return ctx;
}
