import api from '../../../services/api';

const structureApi = {
    // ── Floors ──────────────────────────────────────────────────────────────
    getFloors: (projectId) =>
        api.get('/floors/', { params: { project: projectId } }),

    getFloor: (id) =>
        api.get(`/floors/${id}/`),

    createFloor: (data) =>
        api.post('/floors/', data),

    updateFloor: (id, data) =>
        api.patch(`/floors/${id}/`, data),

    deleteFloor: (id) =>
        api.delete(`/floors/${id}/`),

    // ── Rooms ────────────────────────────────────────────────────────────────
    getRooms: (projectId, floorId = null) => {
        const params = { project: projectId };
        if (floorId) params.floor = floorId;
        return api.get('/rooms/', { params });
    },

    getRoom: (id) =>
        api.get(`/rooms/${id}/`),

    createRoom: (data) =>
        api.post('/rooms/', data),

    updateRoom: (id, data) =>
        api.patch(`/rooms/${id}/`, data),

    deleteRoom: (id) =>
        api.delete(`/rooms/${id}/`),
};

export default structureApi;
