import api from './api';

export const authService = {
    // Login user
    login: async (username, password) => {
        try {
            const response = await api.post('/auth/login/', {
                username,
                password,
            });

            const { access, refresh, user } = response.data;

            // Store tokens and user info
            localStorage.setItem('access_token', access);
            localStorage.setItem('refresh_token', refresh);
            localStorage.setItem('user', JSON.stringify(user));

            return { success: true, user };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.error || 'Login failed',
            };
        }
    },

    // Logout user
    logout: async () => {
        try {
            const refreshToken = localStorage.getItem('refresh_token');
            if (refreshToken) {
                await api.post('/auth/logout/', {
                    refresh: refreshToken,
                });
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            // Clear local storage regardless of API call success
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('user');
        }
    },

    // Register new user
    register: async (userData) => {
        try {
            const response = await api.post('/auth/register/', userData);
            return { success: true, data: response.data };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data || 'Registration failed',
            };
        }
    },

    // Get current user profile
    getProfile: async () => {
        try {
            const response = await api.get('/auth/profile/');
            return { success: true, user: response.data };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data || 'Failed to fetch profile',
            };
        }
    },

    // Update user profile
    updateProfile: async (userData) => {
        try {
            const config = {};
            let data = userData;

            // Use FormData for file uploads (profile_image)
            const hasFile = userData.profile_image instanceof File;

            if (hasFile) {
                config.headers = { 'Content-Type': 'multipart/form-data' };
                const formData = new FormData();

                Object.keys(userData).forEach(key => {
                    if (key === 'profile_image' && !(userData[key] instanceof File)) return;
                    if (userData[key] !== null && userData[key] !== undefined) {
                        formData.append(key, userData[key]);
                    }
                });
                data = formData;
            }

            const response = await api.patch('/auth/profile/', data, config);

            // Update stored user info
            localStorage.setItem('user', JSON.stringify(response.data));

            return { success: true, user: response.data };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data || 'Failed to update profile',
            };
        }
    },

    // Check if user is authenticated
    isAuthenticated: () => {
        return !!localStorage.getItem('access_token');
    },

    // Get current user from localStorage
    getCurrentUser: () => {
        const userStr = localStorage.getItem('user');
        if (!userStr || userStr === "undefined") return null;
        try {
            return JSON.parse(userStr);
        } catch (e) {
            return null;
        }
    },

    // Check if user has a specific permission
    hasPermission: (permissionName) => {
        const user = authService.getCurrentUser();
        if (!user) return false;
        if (user.is_system_admin) return true;
        if (!user.role) return false;
        if (user.role.can_manage_all_systems) return true;
        return !!user.role[permissionName];
    },
};
