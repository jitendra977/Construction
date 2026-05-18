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

// ─────────────────────────────────────────────────────────────────────────────
// DEPRECATED: calculatorService calls /api/v1/estimator/* (legacy module).
// The canonical replacement is /api/v1/estimate/ but it uses a different
// request shape — a full migration requires updating EstimatorHub + BoQWizard.
// Sunset target: Phase 3 (see backend utils/deprecation_middleware.py).
// ─────────────────────────────────────────────────────────────────────────────
if (typeof window !== 'undefined') {
    console.warn(
        '[ConstructPro] calculatorService uses deprecated /api/v1/estimator/ endpoints. ' +
        'Migrate to /api/v1/estimate/ in Phase 3.'
    );
}

// Legacy calculator service (kept for backward compat with old BoQ wizard)
export const calculatorService = {
    calculateWall: (data) => api.post('estimator/wall/', data),
    calculateConcrete: (data) => api.post('estimator/concrete/', data),
    calculatePlaster: (data) => api.post('estimator/plaster/', data),
    calculateFlooring: (data) => api.post('estimator/flooring/', data),
    calculateBudget: (data) => api.post('estimator/budget/', data),
    getRates: () => api.get('estimator/rates/'),
    updateRate: (id, data) => api.patch(`estimator/rates/${id}/`, data),
};
