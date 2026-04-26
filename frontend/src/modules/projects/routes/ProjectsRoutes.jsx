import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { ProjectsProvider }     from '../context/ProjectsContext';
import ProjectsLayout           from '../components/layout/ProjectsLayout';
import ProjectGateway           from '../pages/ProjectGateway';
import ProjectDetailPage        from '../pages/ProjectDetailPage';
import ProjectSettingsPage      from '../pages/ProjectSettingsPage';
import TeamPage                 from '../pages/TeamPage';
import api                      from '../services/projectsApi';

/** Wrapper that fetches a single project and passes it via layout context */
function ProjectShell() {
    const { id }              = useParams();
    const [project, setProject] = useState(null);

    useEffect(() => {
        if (id) {
            api.getProject(id)
               .then(r => setProject(r.data))
               .catch(console.error);
        }
    }, [id]);

    return (
        <ProjectsLayout projectId={id} project={project}>
            {/* Outlet receives { project } via context */}
        </ProjectsLayout>
    );
}

export default function ProjectsRoutes() {
    return (
        <ProjectsProvider>
            <Routes>
                {/* Entry gate — list all projects */}
                <Route index element={<ProjectGateway />} />

                {/* Single project shell with sub-nav */}
                <Route path=":id" element={<ProjectShell />}>
                    <Route index element={<Navigate to="overview" replace />} />
                    <Route path="overview"  element={<ProjectDetailPage />} />
                    <Route path="settings"  element={<ProjectSettingsPage />} />
                    <Route path="team"      element={<TeamPage />} />
                </Route>
            </Routes>
        </ProjectsProvider>
    );
}
