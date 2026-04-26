/**
 * projectsApi.js — Projects Module API client
 * All requests go to /api/v1/projects/ and /api/v1/project-members/
 */
import createApiClient from '../../../services/createApiClient';

const http = createApiClient();

const projectsApi = {
    // ── Projects ─────────────────────────────────────────────────────────────
    listProjects:  ()            => http.get('/projects/'),
    getProject:    (id)          => http.get(`/projects/${id}/`),
    createProject: (data)        => http.post('/projects/', data),
    updateProject: (id, data)    => http.patch(`/projects/${id}/`, data),
    deleteProject: (id)          => http.delete(`/projects/${id}/`),
    getStats:      (id)          => http.get(`/projects/${id}/stats/`),

    // ── Members ───────────────────────────────────────────────────────────────
    listMembers:  (projectId)    => http.get('/project-members/', { params: { project: projectId } }),
    addMember:    (data)         => http.post('/project-members/', data),
    updateMember: (id, data)     => http.patch(`/project-members/${id}/`, data),
    removeMember: (id)           => http.delete(`/project-members/${id}/`),

    // ── Users (for member picker) ─────────────────────────────────────────────
    listUsers: ()                => http.get('/users/'),
};

export default projectsApi;
