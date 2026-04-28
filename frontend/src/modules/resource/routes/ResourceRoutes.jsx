/**
 * ResourceRoutes — all routes for the Resource module.
 *
 * Mount point (add to DesktopRoutes.jsx):
 *   <Route path="resource/*" element={<ResourceRoutes projectId={projectId} />} />
 *
 * Pages
 * ─────
 *   /resource/                → ResourceDashboard  (overview + KPIs)
 *   /resource/materials       → MaterialsPage      (materials + stock)
 *   /resource/equipment       → EquipmentPage      (equipment management)
 *   /resource/labor           → LaborPage          (workers + attendance)
 *   /resource/suppliers       → SuppliersPage      (supplier management)
 *   /resource/purchases       → PurchasesPage      (purchase orders)
 *   /resource/help            → HelpPage           (Nepali help — how/why/when/who)
 */
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import { ResourceProvider } from '../context/ResourceContext';
import ResourceLayout        from '../components/layout/ResourceLayout';

import ResourceDashboard from '../pages/ResourceDashboard';
import MaterialsPage     from '../pages/MaterialsPage';
import EquipmentPage     from '../pages/EquipmentPage';
import LaborPage         from '../pages/LaborPage';
import SuppliersPage     from '../pages/SuppliersPage';
import PurchasesPage     from '../pages/PurchasesPage';
import HelpPage          from '../pages/HelpPage';

export default function ResourceRoutes({ projectId }) {
  return (
    <ResourceProvider projectId={projectId}>
      <ResourceLayout>
        <Routes>
          <Route index                element={<ResourceDashboard />} />
          <Route path="materials"     element={<MaterialsPage />} />
          <Route path="equipment"     element={<EquipmentPage />} />
          <Route path="labor"         element={<LaborPage />} />
          <Route path="suppliers"     element={<SuppliersPage />} />
          <Route path="purchases"     element={<PurchasesPage />} />
          <Route path="help"          element={<HelpPage />} />
          <Route path="*"             element={<Navigate to="" replace />} />
        </Routes>
      </ResourceLayout>
    </ResourceProvider>
  );
}
