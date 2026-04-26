import React from 'react';
import ProjectsTopNav from './ProjectsTopNav';
import { Outlet } from 'react-router-dom';

export default function ProjectsLayout({ projectId, project }) {
    return (
        <div className="flex flex-col h-full min-h-screen" style={{ background: 'var(--t-bg)' }}>
            {/* Sub-nav */}
            {projectId && <ProjectsTopNav projectId={projectId} />}
            {/* Page content */}
            <div className="flex-1 overflow-y-auto pb-28">
                <Outlet context={{ project }} />
            </div>
        </div>
    );
}
