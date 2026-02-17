import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/auth';
import { dashboardService } from '../services/api';
import storage from '../utils/storage';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [dashboardData, setDashboardData] = useState(null);

    const loadUser = async () => {
        try {
            const currentUser = await authService.getCurrentUser();
            setUser(currentUser);
            if (currentUser) {
                await fetchDashboardData();
            }
        } catch (error) {
            console.error('Failed to load user', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDashboardData = async () => {
        try {
            // Check if user is authenticated before fetching
            const token = await storage.getItem('access_token');
            if (!token) {
                // User not authenticated, skip fetching
                return;
            }

            // Fetch fresh data from API
            const data = await dashboardService.getDashboardData();

            // Update state
            setDashboardData(data);
        } catch (error) {
            // Only log if it's not an authentication error
            if (error.response?.status !== 401) {
                console.error('Failed to fetch dashboard data', error);
            }
        }
    };

    const login = async (username, password) => {
        const result = await authService.login(username, password);
        if (result.success) {
            setUser(result.user);
            await fetchDashboardData();
        }
        return result;
    };

    const logout = async () => {
        await authService.logout();
        setUser(null);
        setDashboardData(null);
    };

    useEffect(() => {
        loadUser();
    }, []);

    return (
        <AuthContext.Provider value={{
            user,
            setUser,
            loading,
            dashboardData,
            login,
            logout,
            refreshData: fetchDashboardData
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
