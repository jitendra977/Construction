import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Desktop Components
import DesktopHome from '../../components/desktop/DesktopHome';
import DesktopPhotos from '../../components/desktop/DesktopPhotos';
import DesktopManage from '../../components/desktop/DesktopManage';
import EstimatorHub from '../../pages/estimator/EstimatorHub';
import PermitPage from '../../pages/permits/PermitPage';
import Profile from '../../pages/Profile';
import ActivityLogs from '../../pages/accounts/ActivityLogs';
import UserManagement from '../../pages/accounts/UserManagement';
import DataImportPage from '../../pages/DataImportPage';
import UserGuidePage from '../../pages/desktop/UserGuidePage';
import TimelapsePage from '../../pages/TimelapsePage';
import AnalyticsPage from '../../pages/AnalyticsPage';

// Finance Module (self-contained)
import FinanceRoutes from '../../modules/finance';
import { useConstruction } from '../../context/ConstructionContext';

const DesktopRoutes = () => {
    const { activeProjectId } = useConstruction();

    return (
        <Routes>
            <Route index element={<Navigate to="home" replace />} />
            <Route path="home" element={<DesktopHome />} />
            <Route path="estimator" element={<EstimatorHub />} />
            <Route path="permits" element={<PermitPage />} />
            <Route path="manage" element={<DesktopManage />} />
            <Route path="photos" element={<DesktopPhotos />} />
            <Route path="profile" element={<Profile />} />
            <Route path="activity-logs" element={<ActivityLogs />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="import" element={<DataImportPage />} />
            <Route path="guides" element={<UserGuidePage />} />
            <Route path="timelapse" element={<TimelapsePage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            {/* Finance Module */}
            <Route path="finance/*" element={<FinanceRoutes projectId={activeProjectId} />} />
            {/* Catch-all to home */}
            <Route path="*" element={<Navigate to="/dashboard/desktop/home" replace />} />
        </Routes>
    );
};

export default DesktopRoutes;
