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

// Self-contained modules
import FinanceRoutes   from '../../modules/finance';
import ResourceRoutes  from '../../modules/resource';
import StructureRoutes from '../../modules/structure';
import ProjectsRoutes  from '../../modules/projects';
import TimelineRoutes  from '../../modules/timeline';
import AccountsRoutes  from '../../modules/accounts';
import LocationRoutes  from '../../modules/location/LocationRoutes';

import { useConstruction } from '../../context/ConstructionContext';

const DesktopRoutes = () => {
    const { activeProjectId } = useConstruction();

    return (
        <Routes>
            {/* Default → Projects gateway */}
            <Route index element={<Navigate to="projects" replace />} />

            {/* Stand-alone pages */}
            <Route path="home"       element={<Dashboard />}      />
            <Route path="estimator"  element={<EstimatorHub />}   />
            <Route path="permits"    element={<PermitPage />}     />
            <Route path="manage"     element={<DesktopManage />}  />
            <Route path="phases"     element={<PhasesPage />}     />
            <Route path="photos"     element={<DesktopPhotos />}  />
            <Route path="data-transfer"  element={<DataTransferPage />}  />
            <Route path="guides"     element={<UserGuidePage />}  />
            <Route path="timelapse"  element={<TimelapsePage />}  />
            <Route path="analytics"  element={<AnalyticsPage />}  />
            <Route path="attendance" element={<AttendanceHub />}  />
            <Route path="workforce"  element={<WorkforceHub />}  />
            <Route path="teams"      element={<TeamManagementPage />} />

            {/* Self-contained modules */}
            <Route path="projects/*"  element={<ProjectsRoutes />} />
            <Route path="finance/*"   element={<FinanceRoutes   projectId={activeProjectId} />} />
            <Route path="resource/*"  element={<ResourceRoutes  projectId={activeProjectId} />} />
            <Route path="structure/*" element={<StructureRoutes projectId={activeProjectId} />} />
            <Route path="timeline/*"  element={<TimelineRoutes />} />

            {/* Accounts module — users, roles, profile, activity */}
            <Route path="accounts/*"  element={<AccountsRoutes />} />

            {/* Location Tracking module */}
            <Route path="location/*"  element={<LocationRoutes projectId={activeProjectId} />} />

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
