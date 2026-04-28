import api from '../../../services/api';

const teamsApi = {
  getTeams: (projectId) => api.get(`/teams/?project=${projectId}`),
  createTeam: (data) => api.post('/teams/', data),
  updateTeam: (id, data) => api.patch(`/teams/${id}/`, data),
  deleteTeam: (id) => api.delete(`/teams/${id}/`),
  addMembers: (id, memberIds) => api.post(`/teams/${id}/add_members/`, { member_ids: memberIds }),
  removeMembers: (id, memberIds) => api.post(`/teams/${id}/remove_members/`, { member_ids: memberIds }),
};

export default teamsApi;
