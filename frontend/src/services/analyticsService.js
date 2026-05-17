import api from './client';

export const analyticsService = {
    getForecasts: () => api.get('analytics/forecasts/'),
    refreshForecasts: () => api.post('analytics/forecasts/refresh/'),

    getRateTrends: () => api.get('analytics/rate-trends/'),
    refreshRateTrends: () => api.post('analytics/rate-trends/refresh/'),

    getAlerts: (params = {}) => api.get('analytics/alerts/', { params }),
    resolveAlert: (id, note = '') =>
        api.post(`analytics/alerts/${id}/resolve/`, { note }),
    rebuildAll: () => api.post('analytics/alerts/rebuild/'),
};
