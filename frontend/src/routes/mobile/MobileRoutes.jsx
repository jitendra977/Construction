import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// ── Existing mobile-specific pages ───────────────────────────────────────────
import HomeTab       from '../../components/mobile/HomeTab';
import MobileManage  from '../../components/mobile/MobileManage';
import BudgetTab     from '../../components/mobile/BudgetTab';
import PhotosTab     from '../../components/mobile/PhotosTab';
import Profile       from '../../pages/Profile';
import ActivityLogs  from '../../pages/accounts/ActivityLogs';

// ── Shared pages (same component, works on both desktop + mobile) ─────────────
import EstimatorHub  from '../../pages/estimator/EstimatorHub';
import AttendanceHub from '../../modules/attendance/AttendanceHub';
import PermitPage    from '../../pages/permits/PermitPage';
import DataTransferPage  from '../../pages/DataTransferPage';
import TimelapsePage from '../../pages/TimelapsePage';
import AnalyticsPage from '../../pages/AnalyticsPage';
import UserGuidePage from '../../pages/desktop/UserGuidePage';
import PhasesPage    from '../../pages/desktop/PhasesPage';

// ── Full feature modules (same module used by desktop) ────────────────────────
import ProjectsRoutes  from '../../modules/projects';
import FinanceRoutes   from '../../modules/finance';
import ResourceRoutes  from '../../modules/resource';
import StructureRoutes from '../../modules/structure';
import TimelineRoutes  from '../../modules/timeline';
import AccountsRoutes  from '../../modules/accounts';

import { useConstruction } from '../../context/ConstructionContext';

const MobileRoutes = () => {
    const { activeProjectId } = useConstruction();

    return (
        <Routes>
            {/* Default → home */}
            <Route index element={<Navigate to="home" replace />} />

            {/* ── Mobile-specific pages ──────────────────────────────────── */}
            <Route path="home"         element={<HomeTab />}         />
            <Route path="manage"       element={<MobileManage />}    />
            <Route path="budget"       element={<BudgetTab />}       />
            <Route path="photos"       element={<PhotosTab />}       />
            <Route path="profile"      element={<Profile />}         />
            <Route path="activity-logs" element={<ActivityLogs />}   />

            {/* ── Shared pages ───────────────────────────────────────────── */}
            <Route path="estimator"    element={<EstimatorHub />}    />
            <Route path="attendance"   element={<AttendanceHub />}   />
            <Route path="permits"      element={<PermitPage />}      />
            <Route path="data-transfer"  element={<DataTransferPage />} />
            <Route path="timelapse"    element={<TimelapsePage />}   />
            <Route path="analytics"    element={<AnalyticsPage />}   />
            <Route path="guides"       element={<UserGuidePage />}   />
            <Route path="phases"       element={<PhasesPage />}      />

            {/* ── Full feature modules ───────────────────────────────────── */}
            <Route path="projects/*"   element={<ProjectsRoutes />}                                  />
            <Route path="finance/*"    element={<FinanceRoutes   projectId={activeProjectId} />}     />
            <Route path="resource/*"   element={<ResourceRoutes  projectId={activeProjectId} />}     />
            <Route path="structure/*"  element={<StructureRoutes projectId={activeProjectId} />}     />
            <Route path="timeline/*"   element={<TimelineRoutes />}                                  />
            <Route path="accounts/*"   element={<AccountsRoutes />}                                  />

            {/* ── Legacy redirects ───────────────────────────────────────── */}
            <Route path="account"      element={<Navigate to="/dashboard/mobile/accounts/profile"  replace />} />

            {/* Catch-all */}
            <Route path="*"            element={<Navigate to="/dashboard/mobile/home" replace />}    />
        </Routes>
    );
};

export default MobileRoutes;
