/**
 * MobileResourceList — shared scaffold for all mobile list pages.
 *
 * Handles the three things every mobile list shares:
 *   1. Container with correct bottom-padding so FAB doesn't cover items
 *   2. Empty state (emoji + message) when filtered list is empty
 *   3. Floating Action Button (FAB) for creating new items
 *
 * Each list's actual item cards are still rendered by the caller via `children`.
 * This avoids forcing a generic renderItem API that doesn't fit every list's
 * complex business logic (payments, history, progress bars, etc.).
 *
 * Props:
 *   children     {node}          — the list items to render
 *   isEmpty      {boolean}       — show empty state instead of children
 *   emptyIcon    {string}        — emoji for empty state  (default '📋')
 *   emptyText    {string}        — message for empty state (default 'No items found')
 *   onAdd        {() => void}    — called when FAB is clicked; omit to hide FAB
 *   loading      {boolean}       — show loading skeleton rows instead of children
 *   skeletonRows {number}        — how many skeleton rows to show (default 5)
 *
 * Usage:
 *   <MobileResourceList
 *     isEmpty={filtered.length === 0}
 *     emptyIcon="🏢"
 *     emptyText="No suppliers found"
 *     onAdd={() => openModal()}
 *   >
 *     {filtered.map(s => <SupplierRow key={s.id} supplier={s} />)}
 *   </MobileResourceList>
 */
import React from 'react';

const SkeletonRow = () => (
    <div className="bg-[var(--t-surface)] border-b border-[var(--t-border)] p-3 flex items-center justify-between animate-pulse">
        <div className="flex flex-col gap-2 flex-1 pr-4">
            <div className="h-3.5 bg-[var(--t-surface3)] rounded w-2/3" />
            <div className="h-2.5 bg-[var(--t-surface3)] rounded w-1/3" />
        </div>
        <div className="h-5 bg-[var(--t-surface3)] rounded w-16 shrink-0" />
    </div>
);

const MobileResourceList = ({
    children,
    isEmpty = false,
    emptyIcon = '📋',
    emptyText = 'No items found',
    onAdd,
    loading = false,
    skeletonRows = 5,
}) => (
    <div className="space-y-0.5 pb-[120px]">
        {/* Loading skeleton */}
        {loading && Array.from({ length: skeletonRows }).map((_, i) => (
            <SkeletonRow key={i} />
        ))}

        {/* Empty state */}
        {!loading && isEmpty && (
            <div className="text-center py-14 text-[var(--t-text3)]">
                <div className="text-3xl mb-2">{emptyIcon}</div>
                <p className="text-sm font-semibold">{emptyText}</p>
            </div>
        )}

        {/* List items */}
        {!loading && !isEmpty && children}

        {/* Floating Action Button */}
        {onAdd && (
            <div className="fixed bottom-24 right-4 z-10">
                <button
                    onClick={onAdd}
                    aria-label="Add new item"
                    className="w-14 h-14 bg-[var(--t-primary)] text-white rounded-full flex items-center justify-center shadow-[0_8px_16px_rgba(0,0,0,0.3)] hover:scale-105 active:scale-95 transition-all outline-none"
                    style={{
                        boxShadow: '0 8px 16px color-mix(in srgb, var(--t-primary) 40%, transparent)',
                    }}
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                </button>
            </div>
        )}
    </div>
);

export default MobileResourceList;
