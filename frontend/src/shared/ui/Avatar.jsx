/**
 * shared/ui/Avatar — user avatar with image + initials fallback.
 *
 * Props:
 *   user      {object}  — { first_name, last_name, username, email, profile_image }
 *   size      {string}  — 'xs' | 'sm' | 'md' | 'lg' | 'xl'  (default 'md')
 *   src       {string}  — override image URL (skips user.profile_image)
 *   className {string}  — extra CSS classes on the wrapper div
 */
import { useState } from 'react';
import { mediaUrl } from '../../services/createApiClient';

const PALETTE = [
    '#6366f1', '#ec4899', '#f59e0b', '#10b981',
    '#3b82f6', '#8b5cf6', '#ef4444', '#ea580c',
];

const SIZES = { xs: 24, sm: 32, md: 40, lg: 56, xl: 80 };
const FONTS = { xs: 9,  sm: 11, md: 14, lg: 20, xl: 28 };

function initials(name = '') {
    return (name || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function pickColor(seed = '') {
    return PALETTE[(seed || '').charCodeAt(0) % PALETTE.length];
}

export default function Avatar({ user, size = 'md', className = '', src: srcProp }) {
    const [imgFailed, setImgFailed] = useState(false);

    const px   = SIZES[size] ?? SIZES.md;
    const fs   = FONTS[size] ?? FONTS.md;
    const name = `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.username || '';
    const bg   = pickColor(name || user?.email);

    const rawSrc = srcProp || user?.profile_image;
    const src    = rawSrc ? mediaUrl(rawSrc) : null;

    return (
        <div
            className={`rounded-full shrink-0 overflow-hidden flex items-center justify-center font-bold ${className}`}
            style={{
                width: px, height: px,
                background: bg,
                fontSize: fs,
                color: '#fff',
                flexShrink: 0,
            }}
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
