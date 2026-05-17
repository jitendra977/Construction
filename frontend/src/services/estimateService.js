import api from './client';

export const estimateService = {
    // Material rates
    getMaterialRates: (params = {}) => api.get('estimate/material-rates/', { params }),
    createMaterialRate: (data)       => api.post('estimate/material-rates/', data),
    updateMaterialRate: (id, data)   => api.patch(`estimate/material-rates/${id}/`, data),
    deleteMaterialRate: (id)         => api.delete(`estimate/material-rates/${id}/`),
    seedMaterialRates: ()            => api.post('estimate/material-rates/seed-defaults/'),
    bulkUpdateRates: (data)          => api.post('estimate/material-rates/bulk-update/', data),
    getAllRates: ()                   => api.get('estimate/material-rates/all_rates/'),

    // Labor rates
    getLaborRates: ()                => api.get('estimate/labor-rates/'),
    updateLaborRate: (id, data)      => api.patch(`estimate/labor-rates/${id}/`, data),
    seedLaborRates: ()               => api.post('estimate/labor-rates/seed-defaults/'),

    // Estimates CRUD
    listEstimates: (params = {})     => api.get('estimate/estimates/', { params }),
    getEstimate: (id)                => api.get(`estimate/estimates/${id}/`),
    createEstimate: (data)           => api.post('estimate/estimates/', data),
    updateEstimate: (id, data)       => api.patch(`estimate/estimates/${id}/`, data),
    deleteEstimate: (id)             => api.delete(`estimate/estimates/${id}/`),
    generateEstimate: (id)           => api.post(`estimate/estimates/${id}/generate/`),
    duplicateEstimate: (id)          => api.post(`estimate/estimates/${id}/duplicate/`),
    setStatus: (id, status)          => api.patch(`estimate/estimates/${id}/set_status/`, { status }),
    recalculate: (id)                => api.post(`estimate/estimates/${id}/recalculate/`),

    // Quick estimate (create + generate in one call)
    quickEstimate: (data)            => api.post('estimate/quick/', data),

    // Unified calculator
    calculate: (calculator, params)  => api.post('estimate/calculate/', { calculator, params }),

    // Line items
    updateItem: (id, data)           => api.patch(`estimate/items/${id}/`, data),
    deleteItem: (id)                 => api.delete(`estimate/items/${id}/`),
};
