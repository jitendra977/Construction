/**
 * platformNav — platform-aware navigation helpers.
 *
 * Modules are mounted at both /dashboard/desktop/* and /dashboard/mobile/*.
 * These hooks detect which platform we're on so internal links work on both.
 *
 * Usage:
 *   const base = usePlatformBase();          // '/dashboard/mobile' or '/dashboard/desktop'
 *   const go   = usePlatformNavigate();      // go('/finance') navigates to the right base
 */
import { useLocation, useNavigate } from 'react-router-dom';

/** Returns '/dashboard/mobile' or '/dashboard/desktop' based on the current URL. */
export function usePlatformBase() {
    const { pathname } = useLocation();
    return pathname.startsWith('/dashboard/mobile') ? '/dashboard/mobile' : '/dashboard/desktop';
}

/** Returns a navigate() wrapper that automatically prepends the correct base. */
export function usePlatformNavigate() {
    const navigate = useNavigate();
    const base     = usePlatformBase();
    return (subPath, opts) => navigate(`${base}${subPath}`, opts);
}
