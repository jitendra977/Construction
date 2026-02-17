import api from './api';
import storage from '../utils/storage';

export const authService = {
    login: async (username, password) => {
        try {
            const response = await api.post('/auth/login/', {
                username,
                password,
            });

            const { access, refresh, user } = response.data;

            await storage.setItem('access_token', access);
            await storage.setItem('refresh_token', refresh);
            await storage.setItem('user', JSON.stringify(user));

            return { success: true, user };
        } catch (error) {
            console.error('Login error details:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.error || error.response?.data?.detail || 'Login failed',
            };
        }
    },

    logout: async () => {
        try {
            const refreshToken = await storage.getItem('refresh_token');
            if (refreshToken) {
                await api.post('/auth/logout/', {
                    refresh: refreshToken,
                });
            }
        } catch (error) {
            // Ignore API logout errors (400/401) as we are clearing local session anyway
            if (error.response && (error.response.status === 400 || error.response.status === 401)) {
                // Token already invalid or missing, safe to ignore
                console.log('Logout API: Token already invalid');
            } else {
                console.error('Logout error:', error);
            }
        } finally {
            await storage.deleteItem('access_token');
            await storage.deleteItem('refresh_token');
            await storage.deleteItem('user');
        }
    },

    isAuthenticated: async () => {
        const token = await storage.getItem('access_token');
        return !!token;
    },

    getCurrentUser: async () => {
        const userStr = await storage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    },
};
