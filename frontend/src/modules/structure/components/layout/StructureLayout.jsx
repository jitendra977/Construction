import React from 'react';
import { useLocation } from 'react-router-dom';
import StructureTopNav from './StructureTopNav';
import ManagementTabs from '../../../../components/desktop/manage/ManagementTabs';

export default function StructureLayout({ children }) {
    const location = useLocation();
    const isFloorPlan = location.pathname.endsWith('/floorplan');

    return (
        <div className="flex flex-col h-full" style={{ background: 'var(--t-bg)' }}>
            <ManagementTabs />
            <StructureTopNav />
            <main className={`flex-1 overflow-hidden flex flex-col ${isFloorPlan ? 'p-0' : 'p-4 pb-4'}`}>
                {children}
            </main>
        </div>
    );
}
