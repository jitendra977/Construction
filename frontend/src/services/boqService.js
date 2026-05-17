import api from './client';

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
