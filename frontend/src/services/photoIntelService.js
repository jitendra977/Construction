import api from './client';

export const photoIntelService = {
    // Analyses
    getAnalyses: (params = {}) => api.get('photo-intel/analyses/', { params }),
    getAnalysisForTask: (taskId) =>
        api.get('photo-intel/analyses/', { params: { task: taskId } }),
    getMismatches: () => api.get('photo-intel/analyses/mismatches/'),
    getAnalysisStats: () => api.get('photo-intel/analyses/stats/'),
    reanalyze: (id) => api.post(`photo-intel/analyses/${id}/reanalyze/`),

    // Timelapses
    getTimelapses: (params = {}) => api.get('photo-intel/timelapses/', { params }),
    generateTimelapse: (payload) => api.post('photo-intel/timelapses/generate/', payload),
    regenerateTimelapse: (id) => api.post(`photo-intel/timelapses/${id}/regenerate/`),
    deleteTimelapse: (id) => api.delete(`photo-intel/timelapses/${id}/`),

    // Weekly digests
    getDigests: () => api.get('photo-intel/digests/'),
    buildCurrentDigest: () => api.post('photo-intel/digests/build_current/'),
};
