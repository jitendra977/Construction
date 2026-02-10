import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Mobile Components
import HomeTab from '../../components/mobile/HomeTab';
import RoomsTab from '../../components/mobile/RoomsTab';
import BudgetTab from '../../components/mobile/BudgetTab';
import PhotosTab from '../../components/mobile/PhotosTab';
import EstimatorHub from '../../pages/estimator/EstimatorHub';
import PermitPage from '../../pages/permits/PermitPage';

const MobileRoutes = () => {
    return (
        <Routes>
            <Route index element={<Navigate to="home" replace />} />
            <Route path="home" element={<HomeTab />} />
            <Route path="rooms" element={<RoomsTab />} />
            <Route path="budget" element={<BudgetTab />} />
            <Route path="estimator" element={<EstimatorHub />} />
            <Route path="permits" element={<PermitPage />} />
            <Route path="photos" element={<PhotosTab />} />
            {/* Catch-all to home */}
            <Route path="*" element={<Navigate to="home" replace />} />
        </Routes>
    );
};

export default MobileRoutes;
