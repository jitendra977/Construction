/**
 * Projects API — wraps /api/v1/projects/ and /api/v1/project-members/
 */
import axios from 'axios';

const BASE = '/api/v1';

const api = {
    // ── Projects ─────────────────────────────────────────────────────────────
    listProjects: ()              => axios.get(`${BASE}/projects/`),
    getProject:   (id)            => axios.get(`${BASE}/projects/${id}/`),
    createProject: (data)         => axios.post(`${BASE}/projects/`, data),
    updateProject: (id, data)     => axios.patch(`${BASE}/projects/${id}/`, data),
    deleteProject: (id)           => axios.delete(`${BASE}/projects/${id}/`),
    getStats:      (id)           => axios.get(`${BASE}/projects/${id}/stats/`),

    // ── Members ───────────────────────────────────────────────────────────────
    listMembers:  (projectId)     => axios.get(`${BASE}/project-members/?project=${projectId}`),
    addMember:    (data)          => axios.post(`${BASE}/project-members/`, data),
    updateMember: (id, data)      => axios.patch(`${BASE}/project-members/${id}/`, data),
    removeMember: (id)            => axios.delete(`${BASE}/project-members/${id}/`),

    // ── Users (for member picker) ─────────────────────────────────────────────
    listUsers: ()                 => axios.get(`${BASE}/users/`),
};

export default api;
