import api from './client';

export const permitService = {
    getSteps: () => api.get('permits/steps/'),
    createStep: (data) => api.post('permits/steps/', data),
    updateStep: (id, data) => api.put(`/permits/steps/${id}/`, data),
    deleteStep: (id) => api.delete(`permits/steps/${id}/`),
    attachDocument: (stepId, documentId) =>
        api.post(`permits/steps/${stepId}/attach_document/`, { document_id: documentId }),
    detachDocument: (stepId, documentId) =>
        api.post(`permits/steps/${stepId}/detach_document/`, { document_id: documentId }),
    getDocuments: () => api.get('documents/'),
    createDocument: (data) =>
        api.post('documents/', data, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),
    deleteDocument: (id) => api.delete(`documents/${id}/`),
};

export const permitCopilotService = {
    getTemplates: () => api.get('permits/municipality-templates/'),
    seedKathmandu: () => api.post('permits/municipality-templates/seed-kathmandu/'),

    getChecklists: (projectId) =>
        api.get('permits/checklists/', { params: projectId ? { project: projectId } : {} }),
    getChecklistDetail: (id) => api.get(`permits/checklists/${id}/`),
    materialiseChecklist: (payload) => api.post('permits/checklists/materialise/', payload),
    refreshDeadlines: () => api.post('permits/checklists/refresh-deadlines/'),

    getItems: (checklistId) =>
        api.get('permits/checklist-items/', { params: { checklist: checklistId } }),
    updateItem: (id, payload) => api.patch(`permits/checklist-items/${id}/`, payload),
};
