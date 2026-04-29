import api from '../../../services/api';

// Teams now live under /workforce/teams/ (merged from the old /teams/ endpoint).
// Members are WorkforceMember objects — use full_name / effective_trade instead
// of the legacy name / trade fields from AttendanceWorker.
const teamsApi = {
  getTeams:     (projectId) => api.get(`/workforce/teams/?project=${projectId}`),
  createTeam:   (data)      => api.post('/workforce/teams/', data),
  updateTeam:   (id, data)  => api.patch(`/workforce/teams/${id}/`, data),
  deleteTeam:   (id)        => api.delete(`/workforce/teams/${id}/`),
  addMembers:   (id, memberIds) => api.post(`/workforce/teams/${id}/add_members/`,    { member_ids: memberIds }),
  removeMembers:(id, memberIds) => api.post(`/workforce/teams/${id}/remove_members/`, { member_ids: memberIds }),
};

export default teamsApi;
