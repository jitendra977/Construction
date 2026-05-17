import api from './client';

export const accountsService = {
    getActivityLogs: ()          => api.get('accounts/activity-logs/'),
    getUsers:        ()          => api.get('accounts/users/'),
    createUser:  (data)          => api.post('accounts/users/', data),
    updateUser:  (id, data)      => api.patch(`accounts/users/${id}/`, data),
    deleteUser:  (id)            => api.delete(`accounts/users/${id}/`),
    getRoles:    ()              => api.get('accounts/roles/'),
};
