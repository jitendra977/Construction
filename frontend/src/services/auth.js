import api from './api';

const emitAuthChanged = () => {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('auth-changed'));
    }
};

const getBrowserDetails = () => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
        return {};
    }

    const ua = navigator.userAgent || '';
    const lowerUa = ua.toLowerCase();

    let browser = 'Unknown';
    if (lowerUa.includes('edg/')) browser = 'Microsoft Edge';
    else if (lowerUa.includes('chrome/') && !lowerUa.includes('edg/')) browser = 'Google Chrome';
    else if (lowerUa.includes('firefox/')) browser = 'Mozilla Firefox';
    else if (lowerUa.includes('safari/') && !lowerUa.includes('chrome/')) browser = 'Safari';

    let os = 'Unknown';
    if (lowerUa.includes('windows')) os = 'Windows';
    else if (lowerUa.includes('iphone') || lowerUa.includes('ipad') || lowerUa.includes('ios')) os = 'iOS';
    else if (lowerUa.includes('mac os x') || lowerUa.includes('macintosh')) os = 'macOS';
    else if (lowerUa.includes('android')) os = 'Android';
    else if (lowerUa.includes('linux')) os = 'Linux';

    let deviceType = 'Desktop';
    if (lowerUa.includes('ipad') || lowerUa.includes('tablet')) deviceType = 'Tablet';
    else if (lowerUa.includes('iphone') || (lowerUa.includes('android') && lowerUa.includes('mobile'))) deviceType = 'Mobile';

    const tz = Intl.DateTimeFormat?.().resolvedOptions?.().timeZone || 'Unknown';
    const uaData = navigator.userAgentData;

    return {
        browser,
        os,
        deviceType,
        deviceName: uaData?.platform || navigator.platform || 'Unknown',
        platform: navigator.platform || uaData?.platform || 'Unknown',
        language: navigator.language || 'Unknown',
        timezone: tz,
        screenWidth: window.screen?.width ?? null,
        screenHeight: window.screen?.height ?? null,
        viewportWidth: window.innerWidth ?? null,
        viewportHeight: window.innerHeight ?? null,
    };
};

export const authService = {
    // Login user
    login: async (username, password, loginContext = {}) => {
        try {
            const response = await api.post('auth/login/', {
                username,
                password,
                login_context: {
                    ...getBrowserDetails(),
                    ...loginContext,
                },
            });

            const { access, refresh, user } = response.data;

            // Store tokens and user info
            localStorage.setItem('access_token', access);
            localStorage.setItem('refresh_token', refresh);
            localStorage.setItem('user', JSON.stringify(user));
            emitAuthChanged();

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
                await api.post('auth/logout/', {
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
            emitAuthChanged();
        }
    },

    // Register new user
    register: async (userData) => {
        try {
            const response = await api.post('auth/register/', userData);
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
            const response = await api.get('auth/profile/');
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

            const response = await api.patch('auth/profile/', data, config);

            // Update stored user info
            localStorage.setItem('user', JSON.stringify(response.data));
            emitAuthChanged();

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
        } catch (_e) {
            return null;
        }
    },

    // Check if user has a specific permission
    hasPermission: (permissionName) => {
        const user = authService.getCurrentUser();
        if (!user) return false;
        if (user.is_system_admin || user.is_superuser) return true;
        if (Object.prototype.hasOwnProperty.call(user, permissionName)) {
            return !!user[permissionName];
        }
        if (!user.role) return false;
        if (user.role.can_manage_all_systems) return true;
        return !!user.role[permissionName];
    },
};
