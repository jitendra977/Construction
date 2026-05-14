import React from 'react';

/**
 * lazyWithRetry
 * ─────────────
 * Wraps React.lazy to handle "chunk load errors" which happen when
 * the server has new files but the browser is trying to fetch old hashes.
 */
export const lazyWithRetry = (componentImport) => {
    return React.lazy(async () => {
        const pageHasBeenForceRefreshed = JSON.parse(
            window.localStorage.getItem('page-has-been-force-refreshed') || 'false'
        );

        try {
            const component = await componentImport();
            window.localStorage.setItem('page-has-been-force-refreshed', 'false');
            return component;
        } catch (error) {
            if (!pageHasBeenForceRefreshed) {
                // We've got a chunk load error, try one refresh
                window.localStorage.setItem('page-has-been-force-refreshed', 'true');
                return window.location.reload();
            }

            // If we already refreshed and it's still failing, show a better error or rethrow
            throw error;
        }
    });
};
