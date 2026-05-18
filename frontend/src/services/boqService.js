import api from './client';

// ─────────────────────────────────────────────────────────────────────────────
// DEPRECATED: boqService calls /api/v1/estimator/boq-templates/ and boqs/.
// The canonical estimator module is /api/v1/estimate/ but it does not yet
// expose BoQ template or generation endpoints. Full migration is Phase 3.
// Backend: see utils/deprecation_middleware.py — /estimator/ gets Sunset headers.
// ─────────────────────────────────────────────────────────────────────────────

export const boqService = {
    getTemplates: (params = {}) => api.get('estimator/boq-templates/', { params }),
    createTemplate: (payload) => api.post('estimator/boq-templates/', payload),
    seedDefaults: () => api.post('estimator/boq-templates/seed-defaults/'),

    getGenerated: (projectId) =>
        api.get('estimator/boqs/', { params: projectId ? { project: projectId } : {} }),
    getGeneratedDetail: (id) => api.get(`estimator/boqs/${id}/`),
    generateBoQ: (payload) => api.post('estimator/boqs/generate/', payload),
    applyToBudget: (id) => api.post(`estimator/boqs/${id}/apply/`),
};
