/**
 * shared/utils/formatters — pure formatting helpers used across all modules.
 * No React, no side-effects — safe to import anywhere.
 */

// ── Currency ──────────────────────────────────────────────────────────────────

/**
 * Format a number as Nepali Rupees.
 * @param {number} amount
 * @param {boolean} compact — use 'K / L / Cr' abbreviations for large amounts
 */
export function formatNPR(amount, compact = false) {
    if (amount == null || isNaN(amount)) return '—';
    const n = Number(amount);

    if (compact) {
        if (Math.abs(n) >= 1_00_00_000) return `रू ${(n / 1_00_00_000).toFixed(2)} Cr`;
        if (Math.abs(n) >= 1_00_000)    return `रू ${(n / 1_00_000).toFixed(2)} L`;
        if (Math.abs(n) >= 1_000)       return `रू ${(n / 1_000).toFixed(1)} K`;
    }

    return new Intl.NumberFormat('ne-NP', {
        style:    'currency',
        currency: 'NPR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(n);
}

/** Format as a plain number with comma separators (no currency symbol). */
export function formatNumber(value, decimals = 0) {
    if (value == null || isNaN(value)) return '—';
    return Number(value).toLocaleString('en-IN', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });
}

/** Format as a percentage string. */
export function formatPercent(value, decimals = 1) {
    if (value == null || isNaN(value)) return '—';
    return `${Number(value).toFixed(decimals)}%`;
}

// ── Dates ─────────────────────────────────────────────────────────────────────

/**
 * Format an ISO date string or Date object.
 * @param {string|Date} date
 * @param {'short'|'medium'|'long'|'relative'} style
 */
export function formatDate(date, style = 'medium') {
    if (!date) return '—';
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d)) return '—';

    if (style === 'relative') return relativeTime(d);

    const opts = {
        short:  { day: '2-digit', month: 'short' },
        medium: { day: '2-digit', month: 'short', year: 'numeric' },
        long:   { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' },
    };

    return d.toLocaleDateString('en-IN', opts[style] ?? opts.medium);
}

/** Human-readable relative time ('2 days ago', 'just now', etc.) */
export function relativeTime(date) {
    const d     = date instanceof Date ? date : new Date(date);
    const delta = Math.floor((Date.now() - d) / 1000);

    if (delta < 60)           return 'just now';
    if (delta < 3_600)        return `${Math.floor(delta / 60)}m ago`;
    if (delta < 86_400)       return `${Math.floor(delta / 3_600)}h ago`;
    if (delta < 86_400 * 7)   return `${Math.floor(delta / 86_400)}d ago`;
    if (delta < 86_400 * 30)  return `${Math.floor(delta / (86_400 * 7))}w ago`;
    if (delta < 86_400 * 365) return `${Math.floor(delta / (86_400 * 30))}mo ago`;
    return `${Math.floor(delta / (86_400 * 365))}y ago`;
}

/** Format a date as YYYY-MM-DD (for form inputs). */
export function toInputDate(date) {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    return d.toISOString().slice(0, 10);
}

// ── Strings ───────────────────────────────────────────────────────────────────

/** Capitalize the first letter of each word. */
export function titleCase(str = '') {
    return str.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

/** Convert snake_case or SCREAMING_SNAKE to human-readable label. */
export function humanize(str = '') {
    return str.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/** Truncate a string to `maxLen` characters, appending '…'. */
export function truncate(str = '', maxLen = 60) {
    return str.length > maxLen ? str.slice(0, maxLen) + '…' : str;
}

// ── Files ─────────────────────────────────────────────────────────────────────

/** Format byte counts as KB / MB / GB. */
export function formatFileSize(bytes) {
    if (!bytes) return '—';
    if (bytes < 1_024)           return `${bytes} B`;
    if (bytes < 1_048_576)       return `${(bytes / 1_024).toFixed(1)} KB`;
    if (bytes < 1_073_741_824)   return `${(bytes / 1_048_576).toFixed(1)} MB`;
    return `${(bytes / 1_073_741_824).toFixed(2)} GB`;
}
