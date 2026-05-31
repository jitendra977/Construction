import api from '../../services/client';

export async function fetchCameras(projectId) {
  const params = { active: 'true' };
  if (projectId) params.project = projectId;
  const res = await api.get('cctv/cameras/', { params });
  return res.data || [];
}

export async function fetchAllCameras(projectId) {
  const params = {};
  if (projectId) params.project = projectId;
  const res = await api.get('cctv/cameras/', { params });
  return res.data || [];
}

export async function createCamera(payload) {
  const res = await api.post('cctv/cameras/', payload);
  return res.data;
}

export async function updateCamera(id, payload) {
  const res = await api.patch(`cctv/cameras/${id}/`, payload);
  return res.data;
}

export async function deleteCamera(id) {
  await api.delete(`cctv/cameras/${id}/`);
}
