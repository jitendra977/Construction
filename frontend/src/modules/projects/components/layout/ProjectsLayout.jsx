import React from 'react';
import ProjectsTopNav from './ProjectsTopNav';
import { Outlet } from 'react-router-dom';

export default function ProjectsLayout({ projectId, project }) {
    return (
        <div className="flex flex-col h-full min-h-screen" style={{ background: 'var(--t-bg)' }}>
            {/* Sub-nav */}
            {projectId && <ProjectsTopNav projectId={projectId} />}
            {/* Page content — 90 % wide, centred, consistent across all tabs */}
            <div className="flex-1 overflow-y-auto pb-28">
                <div style={{ width: '90%', maxWidth: '100%', margin: '0 auto' }}>
                    <Outlet context={{ project }} />
                </div>
            </div>
        </div>
    );
}
