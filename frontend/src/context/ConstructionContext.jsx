import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { dashboardService, constructionService, permitService } from '../services/api';
import { authService } from '../services/auth';

// Create Context
const ConstructionContext = createContext(null);

// Provider Component
export const ConstructionProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
    const [dashboardData, setDashboardData] = useState({
        project: null,
        rooms: [],
        tasks: [],
        phases: [],
        expenses: [],
        materials: [],
        contractors: [],
        budgetCategories: [],
        suppliers: [],
        floors: [],
        permitSteps: [],
        funding: [],
        transactions: []
    });

    // Fetch all dashboard data
    const fetchData = useCallback(async (silent = false) => {
        if (!authService.isAuthenticated()) return;
        try {
            if (!silent) setLoading(true);
            const data = await dashboardService.getDashboardData();
            setDashboardData(data);
        } catch (error) {
            console.error("Failed to load dashboard data", error);
        } finally {
            if (!silent) setLoading(false);
        }
    }, []);

    // Auth actions
    const login = useCallback(async (username, password) => {
        const result = await authService.login(username, password);
        if (result.success) {
            setUser(result.user);
            fetchData();
        }
        return result;
    }, [fetchData]);

    const logout = useCallback(async () => {
        await authService.logout();
        setUser(null);
        setDashboardData({
            project: null, rooms: [], tasks: [], phases: [], expenses: [],
            materials: [], contractors: [], budgetCategories: [], suppliers: [],
            floors: [], permitSteps: [], funding: [], transactions: []
        });
    }, []);

    // Initialize on mount
    useEffect(() => {
        const currentUser = authService.getCurrentUser();
        if (currentUser) {
            setUser(currentUser);
            fetchData();
        } else {
            setLoading(false);
        }
    }, [fetchData]);

    // Currency formatter
    const formatCurrency = useCallback((amount) => {
        if (!amount) return 'Rs. 0';
        const val = Number(amount);
        if (val >= 10000000) return `Rs. ${(val / 10000000).toFixed(2)} Cr`;
        if (val >= 100000) return `Rs. ${(val / 100000).toFixed(2)} Lakh`;
        return `Rs. ${val.toLocaleString('en-IN')}`;
    }, []);

    // Computed Stats
    const stats = useMemo(() => {
        const project = dashboardData.project;
        const expenses = dashboardData.expenses || [];
        const phases = dashboardData.phases || [];

        if (!phases.length) return [];

        const totalPhases = phases.length;
        const completedPhases = phases.filter(p => p.status === 'COMPLETED').length;
        const phaseProgress = totalPhases > 0 ? Math.round((completedPhases / totalPhases) * 100) : 0;
        const totalSpent = expenses.reduce((acc, exp) => acc + Number(exp.amount), 0);
        const daysElapsed = project ? Math.floor((new Date() - new Date(project.start_date)) / (1000 * 60 * 60 * 24)) : 0;
        const currentPhase = phases.find(p => p.status === 'IN_PROGRESS') || phases[0] || { name: 'N/A' };

        return [
            { id: 'progress', title: 'Overall Progress', value: `${phaseProgress}%`, change: 'On Track', trend: 'up', icon: '🏗️', color: 'from-purple-500 to-indigo-500' },
            { id: 'spent', title: 'Budget Spent', value: formatCurrency(totalSpent), change: 'Low', trend: 'down', icon: '💰', color: 'from-green-500 to-emerald-500' },
            { id: 'days', title: 'Days Elapsed', value: daysElapsed.toString(), change: '+1', trend: 'up', icon: '📅', color: 'from-blue-500 to-cyan-500' },
            { id: 'phase', title: 'Current Phase', value: currentPhase.name.split(' ')[0], change: 'Active', trend: 'neutral', icon: '🚧', color: 'from-orange-500 to-red-500' },
        ];
    }, [dashboardData, formatCurrency]);

    // Budget & Funding Stats
    const budgetStats = useMemo(() => {
        const expenses = dashboardData.expenses || [];
        const totalBudget = dashboardData.project ? Number(dashboardData.project.total_budget) : 0;
        const totalSpent = expenses.reduce((acc, exp) => acc + Number(exp.amount), 0);

        // Funding calculations
        const fundingSources = dashboardData.funding || [];
        const totalFunded = fundingSources.reduce((acc, f) => acc + Number(f.amount), 0);

        // Categorize debt vs capital
        const totalDebt = fundingSources
            .filter(f => f.source_type === 'LOAN' || f.source_type === 'BORROWED')
            .reduce((acc, f) => acc + Number(f.amount), 0);

        const ownCapital = fundingSources
            .filter(f => f.source_type === 'OWN_MONEY')
            .reduce((acc, f) => acc + Number(f.amount), 0);

        const remainingBudget = Math.max(0, totalBudget - totalSpent);
        const budgetPercent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

        // Liquidity: Money actually received and available to spend
        const availableCash = Math.max(0, totalFunded - totalSpent);

        // Coverage: How much of the total project budget is secured by funding
        const fundingCoverage = totalBudget > 0 ? (totalFunded / totalBudget) * 100 : 0;

        // Inventory Valuation: Current Stock * Average Cost
        const inventoryValue = dashboardData.materials.reduce((acc, m) => {
            return acc + (Number(m.current_stock) * Number(m.avg_cost_per_unit || 0));
        }, 0);

        // Debt to Equity Ratio
        let dte = '0';
        if (ownCapital > 0) dte = (totalDebt / ownCapital).toFixed(2);
        else if (totalDebt > 0) dte = 'High';

        // Category breakdown
        const categories = (dashboardData.budgetCategories || []).map(cat => {
            const spentInCat = expenses
                .filter(e => e.category === cat.id)
                .reduce((acc, e) => acc + Number(e.amount), 0);
            return {
                ...cat,
                spent: spentInCat,
                percent: cat.allocation > 0 ? (spentInCat / cat.allocation) * 100 : 0,
                remaining: Math.max(0, cat.allocation - spentInCat)
            };
        });

        const transactions = dashboardData.transactions || [];
        const lowStockItems = (dashboardData.materials || []).filter(m =>
            Number(m.current_stock) <= Number(m.min_stock_level)
        ).map(m => {
            const pending = transactions.find(t => t.material === m.id && t.status === 'PENDING');
            return { ...m, pendingTransaction: pending };
        });

        return {
            totalBudget,
            totalSpent,
            remainingBudget,
            budgetPercent,
            totalFunded,
            totalDebt,
            ownCapital,
            fundingCoverage,
            inventoryValue,
            availableCash,
            debtToEquity: dte,
            isOverBudget: totalSpent > totalBudget,
            isUnderFunded: totalFunded < totalSpent,
            categories,
            lowStockItems,
            projectHealth: dashboardData.project?.budget_health || { status: 'UNKNOWN' }
        };
    }, [dashboardData]);

    // Recent Activities
    const recentActivities = useMemo(() => {
        const activities = [
            ...dashboardData.tasks.slice(0, 3).map(t => ({
                id: `task-${t.id}`,
                title: t.title,
                message: `Task "${t.title}" is ${t.status.toLowerCase()}`,
                rawDate: new Date(t.updated_at),
                time: new Date(t.updated_at).toLocaleDateString(),
                icon: '🔧'
            })),
            ...(dashboardData.expenses || []).slice(0, 3).map(e => ({
                id: `exp-${e.id}`,
                title: e.title,
                message: `Paid ${formatCurrency(e.amount)} for ${e.title}`,
                rawDate: new Date(e.date),
                time: new Date(e.date).toLocaleDateString(),
                icon: '💵'
            }))
        ].sort((a, b) => b.rawDate - a.rawDate).slice(0, 5);
        return activities;
    }, [dashboardData, formatCurrency]);

    // Action Handlers with Optimistic Updates
    const updatePhase = useCallback(async (phaseId, updateData) => {
        // Optimistic update
        const previousData = { ...dashboardData };
        setDashboardData(prev => ({
            ...prev,
            phases: prev.phases.map(p => p.id === phaseId ? { ...p, ...updateData } : p)
        }));

        try {
            await constructionService.updatePhase(phaseId, updateData);
            // Fetch fresh data in background to ensure sync
            await fetchData(true);
        } catch (error) {
            // Rollback on error
            setDashboardData(previousData);
            console.error("Failed to update phase", error);
            throw error;
        }
    }, [dashboardData, fetchData]);

    const updatePhaseStatus = useCallback(async (phaseId, newStatus) => {
        return updatePhase(phaseId, { status: newStatus });
    }, [updatePhase]);

    const updateTask = useCallback(async (taskId, updateData) => {
        // Optimistic update
        const previousData = { ...dashboardData };
        setDashboardData(prev => ({
            ...prev,
            tasks: prev.tasks.map(t => t.id === taskId ? { ...t, ...updateData } : t)
        }));

        try {
            await constructionService.updateTask(taskId, updateData);
            await fetchData(true);
        } catch (error) {
            setDashboardData(previousData);
            console.error("Failed to update task", error);
            throw error;
        }
    }, [dashboardData, fetchData]);

    const updateTaskStatus = useCallback(async (taskId, newStatus) => {
        return updateTask(taskId, { status: newStatus });
    }, [updateTask]);

    const updatePermitStep = useCallback(async (stepId, updateData) => {
        try {
            await permitService.updateStep(stepId, updateData);
            await fetchData(true);
        } catch (error) {
            console.error("Failed to update permit status", error);
            throw error;
        }
    }, [fetchData]);

    const updatePermitStatus = useCallback(async (stepId, newStatus) => {
        return updatePermitStep(stepId, { status: newStatus });
    }, [updatePermitStep]);

    const createPermitStep = useCallback(async (permitData) => {
        try {
            await permitService.createStep(permitData);
            await fetchData(true);
        } catch (error) {
            console.error("Failed to create permit step", error);
            throw error;
        }
    }, [fetchData]);

    const deletePermitStep = useCallback(async (stepId) => {
        try {
            await permitService.deleteStep(stepId);
            await fetchData(true);
        } catch (error) {
            console.error("Failed to delete permit step", error);
            throw error;
        }
    }, [fetchData]);

    const updateProfile = useCallback(async (userData) => {
        setLoading(true);
        try {
            const result = await authService.updateProfile(userData);
            if (result.success) {
                setUser(result.user);
            }
            return result;
        } catch (error) {
            console.error("Failed to update profile", error);
            return { success: false, error: "An unexpected error occurred" };
        } finally {
            setLoading(false);
        }
    }, []);

    const value = {
        // State
        user,
        loading,
        dashboardData,
        stats,
        budgetStats,
        recentActivities,

        // Utilities
        formatCurrency,

        // Actions
        login,
        logout,
        refreshData: (silent = true) => fetchData(silent),
        updatePhase,
        updateTask,
        updatePhaseStatus,
        updateTaskStatus,
        updatePermitStep,
        updatePermitStatus,
        createPermitStep,
        deletePermitStep,
        updateProfile,
        isCalculatorOpen,
        setIsCalculatorOpen: (val) => setIsCalculatorOpen(val),
        toggleCalculator: () => setIsCalculatorOpen(prev => !prev),
    };

    return (
        <ConstructionContext.Provider value={value}>
            {children}
        </ConstructionContext.Provider>
    );
};

// Custom Hook
export const useConstruction = () => {
    const context = useContext(ConstructionContext);
    if (!context) {
        throw new Error('useConstruction must be used within ConstructionProvider');
    }
    return context;
};
