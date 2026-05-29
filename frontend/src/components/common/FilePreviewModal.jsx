import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { getMediaUrl } from '../../services/api';
import CustomVideoPlayer from './CustomVideoPlayer';

export default function FilePreviewModal({ file, name, onClose }) {
    const url = getMediaUrl(file);
    const ext = (file || '').split('.').pop().toLowerCase().split('?')[0];
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext);
    const isPdf   = ext === 'pdf';
    const isVideo = ['mp4', 'webm', 'ogg', 'mov'].includes(ext);

    // Close on Escape key
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    const modal = (
        <div
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0, zIndex: 10001,
                background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(8px)',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
            }}
        >
            {/* Header */}
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    width: '100%', maxWidth: 1100, display: 'flex',
                    alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(0,0,0,0.5)',
                }}
            >
                <span style={{ color: '#fff', fontSize: 13, fontWeight: 700, maxWidth: '80%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {name || file?.split('/').pop()}
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                    <a
                        href={url} target="_blank" rel="noopener noreferrer"
                        style={{ padding: '6px 14px', borderRadius: 8, background: '#3b82f6', color: '#fff', fontSize: 11, fontWeight: 700, textDecoration: 'none' }}
                    >↗ Open in Tab</a>
                    <a
                        href={url} download
                        style={{ padding: '6px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.12)', color: '#fff', fontSize: 11, fontWeight: 700, textDecoration: 'none' }}
                    >⬇ Download</a>
                    <button
                        onClick={onClose}
                        style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'rgba(239,68,68,0.7)', color: '#fff', cursor: 'pointer', fontSize: 16, fontWeight: 900 }}
                    >✕</button>
                </div>
            </div>

            {/* Content */}
            <div
                onClick={e => e.stopPropagation()}
                style={{ flex: 1, width: '100%', maxWidth: 1100, minHeight: 0, overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
            >
                {isImage && (
                    <img
                        src={url} alt={name}
                        style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain', borderRadius: 8, boxShadow: '0 4px 40px rgba(0,0,0,0.5)' }}
                    />
                )}
                {isPdf && (
                    <iframe
                        src={url}
                        title={name}
                        style={{ width: '100%', height: '80vh', border: 'none', borderRadius: 8, background: '#fff' }}
                    />
                )}
                {isVideo && (
                    <CustomVideoPlayer
                        src={url}
                        className="w-full h-full max-h-[80vh]"
                    />
                )}
                {!isImage && !isPdf && !isVideo && (
                    <div style={{ textAlign: 'center', color: '#fff' }}>
                        <div style={{ fontSize: 64, marginBottom: 16 }}>📄</div>
                        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{name || file?.split('/').pop()}</div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 24 }}>
                            This file type cannot be previewed inline.
                        </div>
                        <a
                            href={url} download
                            style={{ padding: '12px 24px', borderRadius: 8, background: '#3b82f6', color: '#fff', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}
                        >⬇ Download File</a>
                    </div>
                )}
            </div>
        </div>
    );
    return createPortal(modal, document.body);
}
