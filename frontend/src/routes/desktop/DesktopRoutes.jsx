import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Desktop Components
import Dashboard       from '../../modules/dashboard';
import DesktopPhotos   from '../../components/desktop/DesktopPhotos';
import DesktopManage   from '../../components/desktop/DesktopManage';
import EstimatorHub    from '../../pages/estimator/EstimatorHub';
import AttendanceHub   from '../../modules/attendance/AttendanceHub';
import WorkforceHub    from '../../modules/workforce/WorkforceHub';
import PermitPage      from '../../pages/permits/PermitPage';
import DataTransferPage  from '../../pages/DataTransferPage';
import UserGuidePage   from '../../pages/desktop/UserGuidePage';
import PhasesPage      from '../../pages/desktop/PhasesPage';
import TimelapsePage   from '../../pages/TimelapsePage';
import AnalyticsPage   from '../../pages/AnalyticsPage';
import WorkerPortal    from '../../modules/worker/WorkerPortal';
import TeamManagementPage from '../../pages/desktop/TeamManagementPage';
import SettingsPage       from '../../pages/desktop/SettingsPage';

// Self-contained modules
import FinanceRoutes   from '../../modules/finance';
import ResourceRoutes  from '../../modules/resource';
import StructureRoutes from '../../modules/structure';
import ProjectsRoutes  from '../../modules/projects';
import TimelineRoutes  from '../../modules/timeline';
import AccountsRoutes  from '../../modules/accounts';
import LocationRoutes  from '../../modules/location/LocationRoutes';

import { useConstruction } from '../../context/ConstructionContext';
import { authService } from '../../services/auth';

function AccessDenied() {
    return (
        <div style={{ padding: 48, color: 'var(--t-text)' }}>
            <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 900 }}>Access denied</h2>
            <p style={{ margin: 0, color: 'var(--t-text3)', fontSize: 14 }}>
                Your account role does not allow access to this page.
            </p>
        </div>
    );
}

function RequirePermission({ permission, children }) {
    if (permission && !authService.hasPermission(permission)) {
        return <AccessDenied />;
    }
    return children;
}

function RequireAnyPermission({ permissions, children }) {
    if (!permissions || permissions.length === 0) return children;
    if (permissions.some(permission => authService.hasPermission(permission))) return children;
    return <AccessDenied />;
}

const DesktopRoutes = () => {
    const { activeProjectId } = useConstruction();

    return (
        <Routes>
            {/* Default → Projects gateway */}
            <Route index element={<Navigate to="projects" replace />} />

            {/* Stand-alone pages */}
            <Route path="home"       element={<RequirePermission permission="can_view_dashboard"><Dashboard /></RequirePermission>}      />
            <Route path="estimator"  element={<RequirePermission permission="can_view_dashboard"><EstimatorHub /></RequirePermission>}   />
            <Route path="permits"    element={<RequirePermission permission="can_manage_phases"><PermitPage /></RequirePermission>}     />
            <Route path="manage"     element={<RequirePermission permission="can_manage_phases"><DesktopManage /></RequirePermission>}  />
            <Route path="phases"     element={<RequirePermission permission="can_view_phases"><PhasesPage /></RequirePermission>}     />
            <Route path="photos"     element={<RequirePermission permission="can_view_dashboard"><DesktopPhotos /></RequirePermission>}  />
            <Route path="data-transfer"  element={<RequirePermission permission="can_manage_data_transfer"><DataTransferPage /></RequirePermission>}  />
            <Route path="guides"     element={<RequirePermission permission="can_view_dashboard"><UserGuidePage /></RequirePermission>}  />
            <Route path="timelapse"  element={<RequirePermission permission="can_view_dashboard"><TimelapsePage /></RequirePermission>}  />
            <Route path="analytics"  element={<RequirePermission permission="can_view_dashboard"><AnalyticsPage /></RequirePermission>}  />
            <Route path="attendance" element={<RequirePermission permission="can_view_workforce"><AttendanceHub /></RequirePermission>}  />
            <Route path="workforce"  element={<RequirePermission permission="can_view_workforce"><WorkforceHub /></RequirePermission>}  />
            {/* /teams redirects into the Workforce hub (Teams tab) */}
            <Route path="teams"      element={<Navigate to="/dashboard/desktop/workforce" replace />} />
            <Route path="settings"   element={<RequirePermission permission="can_manage_settings"><SettingsPage /></RequirePermission>}      />

            {/* Self-contained modules */}
            <Route path="projects/*"  element={<RequirePermission permission="can_view_projects"><ProjectsRoutes /></RequirePermission>} />
            <Route path="finance/*"   element={<RequirePermission permission="can_view_finances"><FinanceRoutes   projectId={activeProjectId} /></RequirePermission>} />
            <Route path="resource/*"  element={<RequirePermission permission="can_view_resources"><ResourceRoutes  projectId={activeProjectId} /></RequirePermission>} />
            <Route path="structure/*" element={<RequirePermission permission="can_view_structure"><StructureRoutes projectId={activeProjectId} /></RequirePermission>} />
            <Route path="timeline/*"  element={<RequirePermission permission="can_view_phases"><TimelineRoutes /></RequirePermission>} />

            {/* Accounts module — users, roles, profile, activity */}
            <Route path="accounts/*"  element={<RequireAnyPermission permissions={['can_view_profile', 'can_manage_admin_config', 'can_manage_users']}><AccountsRoutes /></RequireAnyPermission>} />

            {/* Location Tracking module */}
            <Route path="location/*"  element={<RequirePermission permission="can_view_workforce"><LocationRoutes projectId={activeProjectId} /></RequirePermission>} />

            {/* Legacy redirects for old scattered account routes */}
            <Route path="profile"       element={<Navigate to="/dashboard/desktop/accounts/profile"  replace />} />
            <Route path="users"         element={<Navigate to="/dashboard/desktop/accounts/users"    replace />} />
            <Route path="activity-logs" element={<Navigate to="/dashboard/desktop/accounts/activity" replace />} />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/dashboard/desktop/projects" replace />} />
        </Routes>
    );
};

export default DesktopRoutes;
