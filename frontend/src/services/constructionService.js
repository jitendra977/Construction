import api from './client';

export const constructionService = {
    // Phases
    getPhases: async () => (await api.get('phases/')).data,
    createPhase: async (data) => (await api.post('phases/', data)).data,
    updatePhase: async (id, data) => (await api.patch(`phases/${id}/`, data)).data,
    deletePhase: async (id) => { await api.delete(`phases/${id}/`); },

    // Tasks
    getTasks: async () => (await api.get('tasks/')).data,
    getTasksByProject: async (projectId) =>
        (await api.get('tasks/', { params: { project: projectId } })).data,
    getTasksByPhase: async (phaseId) =>
        (await api.get('tasks/', { params: { phase: phaseId } })).data,
    createTask: async (data) => (await api.post('tasks/', data)).data,
    updateTask: async (id, data) => (await api.patch(`tasks/${id}/`, data)).data,
    deleteTask: async (id) => { await api.delete(`tasks/${id}/`); },
    reorderPhases: (order) => api.post('phases/reorder/', { order }),
    recalculateBudgets: async (projectId = null) => {
        const body = projectId ? { project_id: projectId } : {};
        return (await api.post('tasks/recalculate_budgets/', body)).data;
    },

    // Phase Documents
    uploadPhaseDocument: async (data) =>
        (await api.post('phase-documents/', data, {
            headers: { 'Content-Type': 'multipart/form-data' },
        })).data,
    deletePhaseDocument: async (id) => { await api.delete(`phase-documents/${id}/`); },

    // Task Media
    uploadTaskMedia: async (data) =>
        (await api.post('task-media/', data, {
            headers: { 'Content-Type': 'multipart/form-data' },
        })).data,
    deleteTaskMedia: async (id) => { await api.delete(`task-media/${id}/`); },
};

// Legacy calculator service (kept for backward compat with old BoQ wizard)
export const calculatorService = {
    calculateWall: (data) => api.post('estimate/wall/', data),
    calculateConcrete: (data) => api.post('estimate/concrete/', data),
    calculatePlaster: (data) => api.post('estimate/plaster/', data),
    calculateFlooring: (data) => api.post('estimate/flooring/', data),
    calculateBudget: (data) => api.post('estimate/budget/', data),
    getRates: () => api.get('estimate/rates/'),
    updateRate: (id, data) => api.patch(`estimate/rates/${id}/`, data),
};
