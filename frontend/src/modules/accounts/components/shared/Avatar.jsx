/** Displays a user avatar (image or initials fallback). */
import { useState } from 'react';

const PALETTE = ['#6366f1','#ec4899','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ef4444','#ea580c'];

const API_BASE = (import.meta.env.VITE_API_URL || '/api/v1').replace('/api/v1', '').replace(/\/$/, '');

function getMediaUrl(url) {
    if (!url) return '';
    if (url.startsWith('http') || url.startsWith('blob:') || url.startsWith('data:')) return url;
    return `${API_BASE}${url}`;
}

function initials(name = '') {
    return (name || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}
function pickColor(name = '') {
    return PALETTE[(name || '').charCodeAt(0) % PALETTE.length];
}

const SIZES = { xs: 24, sm: 32, md: 40, lg: 56, xl: 80 };
const FONT  = { xs: 9,  sm: 11, md: 14, lg: 20, xl: 28 };

export default function Avatar({ user, size = 'md', className = '', src: srcProp }) {
    const [imgFailed, setImgFailed] = useState(false);
    const px   = SIZES[size] || SIZES.md;
    const fs   = FONT[size]  || FONT.md;
    const name = `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.username || '';
    const bg   = pickColor(name || user?.email);
    const rawSrc = srcProp || user?.profile_image;
    const src  = rawSrc ? getMediaUrl(rawSrc) : null;

    return (
        <div
            className={`rounded-full shrink-0 overflow-hidden flex items-center justify-center font-bold ${className}`}
            style={{ width: px, height: px, background: bg, fontSize: fs, color: '#fff', flexShrink: 0 }}
        >
            {src && !imgFailed ? (
                <img
                    src={src}
                    alt={name || 'avatar'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={() => setImgFailed(true)}
                />
            ) : (
                initials(name || user?.email)
            )}
        </div>
    );
}
