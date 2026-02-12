import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Desktop Components
import DesktopHome from '../../components/desktop/DesktopHome';
import DesktopBudget from '../../components/desktop/DesktopBudget';
import DesktopPhotos from '../../components/desktop/DesktopPhotos';
import DesktopManage from '../../components/desktop/DesktopManage';
import EstimatorHub from '../../pages/estimator/EstimatorHub';
import PermitPage from '../../pages/permits/PermitPage';

const DesktopRoutes = () => {
    return (
        <Routes>
            <Route index element={<Navigate to="home" replace />} />
            <Route path="home" element={<DesktopHome />} />
            <Route path="budget" element={<DesktopBudget />} />
            <Route path="estimator" element={<EstimatorHub />} />
            <Route path="permits" element={<PermitPage />} />
            <Route path="manage" element={<DesktopManage />} />
            <Route path="photos" element={<DesktopPhotos />} />
            {/* Catch-all to home */}
            <Route path="*" element={<Navigate to="/dashboard/desktop/home" replace />} />
        </Routes>
    );
};

export default DesktopRoutes;
