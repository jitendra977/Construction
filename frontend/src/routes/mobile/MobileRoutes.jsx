import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Mobile Components
import HomeTab from '../../components/mobile/HomeTab';
import MobileManage from '../../components/mobile/MobileManage';
import BudgetTab from '../../components/mobile/BudgetTab';
import PhotosTab from '../../components/mobile/PhotosTab';
import EstimatorHub from '../../pages/estimator/EstimatorHub';
import PermitPage from '../../pages/permits/PermitPage';
import Profile from '../../pages/Profile';
import DataImportPage from '../../pages/DataImportPage';

const MobileRoutes = () => {
    return (
        <Routes>
            <Route index element={<Navigate to="home" replace />} />
            <Route path="home" element={<HomeTab />} />
            <Route path="manage" element={<MobileManage />} />
            <Route path="budget" element={<BudgetTab />} />
            <Route path="estimator" element={<EstimatorHub />} />
            <Route path="permits" element={<PermitPage />} />
            <Route path="photos" element={<PhotosTab />} />
            <Route path="profile" element={<Profile />} />
            <Route path="import" element={<DataImportPage />} />
            {/* Catch-all to home */}
            <Route path="*" element={<Navigate to="home" replace />} />
        </Routes>
    );
};


export default MobileRoutes;
