import React from 'react';
import TimelapseGallery from '../components/photo_intel/TimelapseGallery';
import MismatchFeed from '../components/photo_intel/MismatchFeed';
import ManagementTabs from '../components/desktop/manage/ManagementTabs';

const TimelapsePage = () => (
    <div className="min-h-screen bg-[var(--t-bg)]">
        <ManagementTabs />
        <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
                <div className="lg:col-span-2">
                    <TimelapseGallery />
                </div>
                <aside className="space-y-4">
                    <MismatchFeed />
                </aside>
            </div>
        </div>
    </div>
);

export default TimelapsePage;
