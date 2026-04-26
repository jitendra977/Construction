/**
 * StructureRoutes — all routes for the Structure module.
 *
 * Mount point (DesktopRoutes.jsx):
 *   <Route path="structure/*" element={<StructureRoutes projectId={activeProjectId} />} />
 *
 * Pages
 * ─────
 *   /structure/              → StructureDashboard  (overview + floor cards)
 *   /structure/floorplan     → FloorPlanPage       (interactive 2D canvas)
 *   /structure/rooms         → RoomsPage           (all rooms list + CRUD)
 *   /structure/progress      → ProgressPage        (completion report)
 *   /structure/help          → HelpPage            (Nepali help)
 */
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import { StructureProvider } from '../context/StructureContext';
import StructureLayout       from '../components/layout/StructureLayout';

import StructureDashboard    from '../pages/StructureDashboard';
import FloorPlanPage         from '../pages/FloorPlanPage';
import RoomsPage             from '../pages/RoomsPage';
import ProgressPage          from '../pages/ProgressPage';
import HelpPage              from '../pages/HelpPage';

export default function StructureRoutes({ projectId }) {
    return (
        <StructureProvider projectId={projectId}>
            <StructureLayout>
                <Routes>
                    <Route index                element={<StructureDashboard />} />
                    <Route path="floorplan"     element={<FloorPlanPage />} />
                    <Route path="rooms"         element={<RoomsPage />} />
                    <Route path="progress"      element={<ProgressPage />} />
                    <Route path="help"          element={<HelpPage />} />
                    <Route path="*"             element={<Navigate to="/dashboard/desktop/structure" replace />} />
                </Routes>
            </StructureLayout>
        </StructureProvider>
    );
}
