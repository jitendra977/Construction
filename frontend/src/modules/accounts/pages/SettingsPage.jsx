/**
 * MOVED — Settings is now a standalone page at /dashboard/desktop/settings
 * This file redirects any old link that lands here.
 */
import { Navigate } from 'react-router-dom';
import { usePlatformBase } from '../../../shared/utils/platformNav';

export default function SettingsPageRedirect() {
    const base = usePlatformBase();
    return <Navigate to={`${base}/settings`} replace />;
}
