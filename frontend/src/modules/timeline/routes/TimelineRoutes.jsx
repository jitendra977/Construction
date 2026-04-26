import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { TimelineProvider } from '../context/TimelineContext';
import TimelineDashboard from '../pages/TimelineDashboard';
import TimelineHelp from '../pages/TimelineHelp';

export default function TimelineRoutes() {
    return (
        <TimelineProvider>
            <Routes>
                <Route index element={<TimelineDashboard />} />
                <Route path="help" element={<TimelineHelp />} />
            </Routes>
        </TimelineProvider>
    );
}
