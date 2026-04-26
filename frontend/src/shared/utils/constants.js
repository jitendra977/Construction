/**
 * shared/utils/constants — app-wide constants.
 * Import individual exports; don't import the whole file as a default.
 */

// ── Role colours ──────────────────────────────────────────────────────────────
export const ROLE_COLORS = {
    SUPER_ADMIN:    '#ef4444',
    HOME_OWNER:     '#f97316',
    LEAD_ENGINEER:  '#3b82f6',
    CONTRACTOR:     '#8b5cf6',
    VIEWER:         '#6b7280',
};

// ── Status colours ────────────────────────────────────────────────────────────
export const STATUS_COLORS = {
    // Generic
    active:      '#10b981',
    inactive:    '#ef4444',
    pending:     '#f59e0b',
    completed:   '#10b981',
    cancelled:   '#6b7280',
    draft:       '#6b7280',

    // Task / Phase
    NOT_STARTED: '#6b7280',
    IN_PROGRESS: '#3b82f6',
    COMPLETED:   '#10b981',
    BLOCKED:     '#ef4444',
    ON_HOLD:     '#f59e0b',

    // Finance
    UNPAID:      '#f59e0b',
    PAID:        '#10b981',
    OVERDUE:     '#ef4444',
    PARTIAL:     '#f97316',
};

// ── Languages ─────────────────────────────────────────────────────────────────
export const LANGUAGES = [
    { code: 'en', label: 'English' },
    { code: 'ne', label: 'नेपाली' },
];

// ── Pagination ────────────────────────────────────────────────────────────────
export const PAGE_SIZE = 20;

// ── Date formats ──────────────────────────────────────────────────────────────
export const DATE_FORMAT_DISPLAY = { day: '2-digit', month: 'short', year: 'numeric' };
export const DATE_FORMAT_SHORT   = { day: '2-digit', month: 'short' };

// ── File upload ───────────────────────────────────────────────────────────────
export const ACCEPTED_IMAGE_TYPES  = 'image/jpeg,image/png,image/webp,image/gif';
export const ACCEPTED_DOC_TYPES    = 'application/pdf,.doc,.docx,.xls,.xlsx';
export const MAX_UPLOAD_SIZE_MB    = 10;
export const MAX_UPLOAD_BYTES      = MAX_UPLOAD_SIZE_MB * 1024 * 1024;

// ── Avatar palette (deterministic from name) ──────────────────────────────────
export const AVATAR_PALETTE = [
    '#6366f1', '#ec4899', '#f59e0b', '#10b981',
    '#3b82f6', '#8b5cf6', '#ef4444', '#ea580c',
];
