import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { dashboardService, constructionService, permitService, financeService } from '../services/api';
import { authService } from '../services/auth';

// Create Context
const ConstructionContext = createContext(null);

// Provider Component
export const ConstructionProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
    const [activeHelpKey, setActiveHelpKey] = useState('home');
    const [language, setLanguage] = useState(localStorage.getItem('mero-ghar-lang') || 'ne');

    useEffect(() => {
        localStorage.setItem('mero-ghar-lang', language);
    }, [language]);
    
    // Extreme Style Lab Engine
    const DEFAULT_TYPOGRAPHY = {
        baseSize: 16,
        globalWeight: '500',
        title: { family: 'Space Grotesk', scale: 1.5, weight: '900', spacing: '0em', transform: 'none' },
        subtitle: { family: 'Space Grotesk', scale: 0.8, weight: '700', spacing: '0.2em', transform: 'none' },
        header: { family: 'Space Grotesk', scale: 2.0, weight: '900', spacing: '-0.02em', transform: 'none' },
        body: { family: 'Space Grotesk', scale: 1.0, weight: '400', spacing: '0em', transform: 'none' }
    };

    const [typography, setTypography] = useState(DEFAULT_TYPOGRAPHY);

    // Initial Load from user profile or local storage
    useEffect(() => {
        if (user?.typography_settings) {
            setTypography(user.typography_settings);
        } else {
            const saved = localStorage.getItem('mero-ghar-typography-v2');
            if (saved) setTypography(JSON.parse(saved));
        }
    }, [user?.id]); // Only run when user changes (login/logout)


    const resetTypography = useCallback(async () => {
        setTypography(DEFAULT_TYPOGRAPHY);
        if (user) {
            await authService.updateProfile({ typography_settings: DEFAULT_TYPOGRAPHY });
        }
    }, [user, DEFAULT_TYPOGRAPHY]);

    useEffect(() => {
        localStorage.setItem('mero-ghar-typography-v2', JSON.stringify(typography));
        const root = document.documentElement;
        
        root.style.fontSize = `${typography.baseSize}px`;
        root.style.setProperty('--font-weight-global', typography.globalWeight);

        ['title', 'subtitle', 'header', 'body'].forEach(key => {
            const config = typography[key];
            root.style.setProperty(`--${key}-font`, config.family);
            root.style.setProperty(`--${key}-scale`, config.scale);
            root.style.setProperty(`--${key}-weight`, config.weight);
            root.style.setProperty(`--${key}-spacing`, config.spacing);
            root.style.setProperty(`--${key}-transform`, config.transform);
        });
    }, [typography]);

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
        transactions: [],
        userGuides: [],
        accounts: [],
    });

    const [financeOverview, setFinanceOverview] = useState(null);

    // Multi-project support
    const [projects, setProjects] = useState([]);
    const [activeProjectId, setActiveProjectId] = useState(() => {
        return localStorage.getItem('active-project-id') || null;
    });

    // Fetch all dashboard data for the active project
    const fetchData = useCallback(async (silent = false, projectId = null) => {
        if (!authService.isAuthenticated()) return;
        const resolvedProjectId = projectId ?? activeProjectId;
        try {
            if (!silent) setLoading(true);
            const [data, overview, projectList] = await Promise.all([
                dashboardService.getDashboardData(resolvedProjectId),
                financeService.getOverview(),
                dashboardService.getProjects(),
            ]);
            setDashboardData(data);
            setFinanceOverview(overview.data);
            const projectsList = projectList.data?.results ?? projectList.data ?? [];
            setProjects(projectsList);
            
            // Validate activeProjectId
            if (resolvedProjectId && projectsList.length > 0) {
                const hasAccess = projectsList.some(p => p.id.toString() === resolvedProjectId.toString());
                if (!hasAccess) {
                    console.warn(`User does not have access to project ${resolvedProjectId}, switching to available project.`);
                    setActiveProjectId(projectsList[0].id);
                    localStorage.setItem('active-project-id', projectsList[0].id);
                    // Next cycle will pick this up
                }
            } else if (!resolvedProjectId && projectsList.length > 0) {
                setActiveProjectId(projectsList[0].id);
                localStorage.setItem('active-project-id', projectsList[0].id);
            }
        } catch (error) {
            console.error("Failed to load dashboard data", error);
        } finally {
            if (!silent) setLoading(false);
        }
    }, [activeProjectId]);

    // Switch active project and reload dashboard data
    const switchProject = useCallback(async (projectId) => {
        setActiveProjectId(projectId);
        if (projectId) {
            localStorage.setItem('active-project-id', projectId);
        } else {
            localStorage.removeItem('active-project-id');
        }
        await fetchData(false, projectId);
    }, [fetchData]);

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
            floors: [], permitSteps: [], funding: [], transactions: [],
            userGuides: [], accounts: [], finance_summary: null,
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

        // Cashflow Total (Purcheses only)
        const totalSpent = expenses.filter(e => !e.is_inventory_usage).reduce((acc, exp) => acc + Number(exp.amount), 0);

        const daysElapsed = project ? Math.floor((new Date() - new Date(project.start_date)) / (1000 * 60 * 60 * 24)) : 0;
        
        // Ensure currentPhase is robust
        const inProgressPhase = phases.find(p => p && p.status === 'IN_PROGRESS');
        const firstPhase = phases.find(p => p !== null && p !== undefined);
        const currentPhase = inProgressPhase || firstPhase || { name: 'N/A' };
        
        const phaseName = (currentPhase && typeof currentPhase.name === 'string') ? currentPhase.name : 'N/A';

        return [
            { id: 'progress', title: 'Overall Progress', value: `${phaseProgress}%`, change: 'On Track', trend: 'up', icon: '🏗️', color: 'from-purple-500 to-indigo-500' },
            { id: 'spent', title: 'Budget Spent', value: formatCurrency(totalSpent), change: 'Low', trend: 'down', icon: '💰', color: 'from-green-500 to-emerald-500' },
            { id: 'days', title: 'Days Elapsed', value: daysElapsed.toString(), change: '+1', trend: 'up', icon: '📅', color: 'from-blue-500 to-cyan-500' },
            { id: 'phase', title: 'Current Phase', value: phaseName.split(' ')[0], change: 'Active', trend: 'neutral', icon: '🚧', color: 'from-orange-500 to-red-500' },
        ];
    }, [dashboardData, formatCurrency]);

    // Budget & Funding Stats
    const budgetStats = useMemo(() => {
        const expenses = dashboardData.expenses || [];
        const phases = dashboardData.phases || [];
        const totalBudget = dashboardData.project ? Number(dashboardData.project.total_budget) : 0;
        const financeSummary = dashboardData.finance_summary;

        // Cashflow Total (Purchases only)
        const totalSpent = expenses.filter(e => !e.is_inventory_usage).reduce((acc, exp) => acc + Number(exp.amount), 0);

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

        // Priority: Use GL (General Ledger) data if available for accurate cash position
        const glAssets = financeOverview ? Number(financeOverview.account_balances?.ASSET || 0) : null;
        const glLiabilities = financeOverview ? Number(financeOverview.account_balances?.LIABILITY || 0) : null;
        const glAccountsPayable = financeOverview ? Number(financeOverview.total_accounts_payable || 0) : null;
        const glExpenses = financeOverview ? Number(financeOverview.total_spent || 0) : null;

        // Available Cash: prefer GL asset balance; fallback to legacy funding calc
        const availableCash = glAssets !== null ? glAssets : Math.max(0, totalFunded - totalSpent);
        // Accounts Payable: outstanding bills (UNPAID + PARTIAL)
        const totalPayables = glAccountsPayable !== null ? glAccountsPayable : 0;
        // Net Financial Position: total assets minus all outstanding liabilities
        const netPosition = glAssets !== null ? glAssets - totalPayables : null;
        // Full GL liability balance (for advanced analysis)
        const glNetPosition = glAssets !== null && glLiabilities !== null ? glAssets - glLiabilities : null;

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
                .filter(e => e.category === cat.id && !e.is_inventory_usage)
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

        const tasks = dashboardData.tasks || [];
        const completedTasks = tasks.filter(t => t.status === 'COMPLETED').length;
        const activeTasks = tasks.filter(t => t.status === 'IN_PROGRESS').length;
        const pendingTasks = tasks.filter(t => t.status === 'PENDING').length;
        const activePhases = phases.filter(p => p.status === 'IN_PROGRESS').length;

        return {
            totalBudget,
            totalSpent: glExpenses !== null ? glExpenses : totalSpent,
            remainingBudget,
            budgetPercent,
            totalFunded,
            totalDebt,
            ownCapital,
            fundingCoverage,
            inventoryValue,
            availableCash,
            totalPayables,
            netPosition,
            glNetPosition,
            debtToEquity: dte,
            isOverBudget: totalSpent > totalBudget,
            isUnderFunded: totalFunded < totalSpent,
            categories,
            lowStockItems,
            projectHealth: dashboardData.project?.budget_health || { status: 'UNKNOWN' },
            completedTasks,
            activeTasks,
            pendingTasks,
            activePhases,
            // Expose raw GL summary for direct use by GL-aware components
            glSummary: financeOverview,
        };
    }, [dashboardData, financeOverview]);

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

    const createTask = useCallback(async (taskData) => {
        try {
            const result = await constructionService.createTask(taskData);
            await fetchData(true);
            return result;
        } catch (error) {
            console.error("Failed to create task", error);
            throw error;
        }
    }, [fetchData]);

    const uploadTaskMedia = useCallback(async (uploadData) => {
        try {
            const result = await constructionService.uploadTaskMedia(uploadData);
            await fetchData(true);
            return result;
        } catch (error) {
            console.error("Failed to upload task media", error);
            throw error;
        }
    }, [fetchData]);

    const deleteTaskMedia = useCallback(async (mediaId) => {
        try {
            await constructionService.deleteTaskMedia(mediaId);
            await fetchData(true);
        } catch (error) {
            console.error("Failed to delete task media", error);
            throw error;
        }
    }, [fetchData]);

    const deleteTask = useCallback(async (taskId) => {
        const previousData = { ...dashboardData };
        setDashboardData(prev => ({
            ...prev,
            tasks: prev.tasks.filter(t => t.id !== taskId)
        }));

        try {
            await constructionService.deleteTask(taskId);
            await fetchData(true);
        } catch (error) {
            setDashboardData(previousData);
            console.error("Failed to delete task", error);
            throw error;
        }
    }, [dashboardData, fetchData]);

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

    const createExpense = useCallback(async (expenseData) => {
        try {
            await dashboardService.createExpense(expenseData);
            await fetchData(true);
        } catch (error) {
            console.error("Failed to create expense", error);
            throw error;
        }
    }, [fetchData]);

    const deleteExpense = useCallback(async (expenseId) => {
        try {
            await dashboardService.deleteExpense(expenseId);
            await fetchData(true);
        } catch (error) {
            console.error("Failed to delete expense", error);
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

    const createMaterialTransaction = useCallback(async (transactionData) => {
        try {
            await dashboardService.createMaterialTransaction(transactionData);
            await fetchData(true);
        } catch (error) {
            console.error("Failed to create material transaction", error);
            throw error;
        }
    }, [fetchData]);

    const updateGuideProgress = useCallback(async (guideId, data) => {
        try {
            await dashboardService.updateGuideProgress(guideId, data);
            await fetchData(true); // refresh to get updated progress
        } catch (error) {
            console.error("Failed to update guide progress", error);
            throw error;
        }
    }, [fetchData]);

    const value = {
        // State
        user,
        loading,
        dashboardData,
        financeOverview,
        stats,
        budgetStats,
        recentActivities,

        // Multi-project
        projects,
        activeProjectId,
        switchProject,

        // Utilities
        formatCurrency,

        // Actions
        login,
        logout,
        refreshData: (silent = true) => fetchData(silent),
        updatePhase,
        updateTask,
        createTask,
        deleteTask,
        updatePhaseStatus,
        updateTaskStatus,
        uploadTaskMedia,
        deleteTaskMedia,
        updatePermitStep,
        updatePermitStatus,
        createPermitStep,
        deletePermitStep,
        createExpense,
        deleteExpense,
        createMaterialTransaction,
        updateProfile,
        updateGuideProgress,
        isCalculatorOpen,
        setIsCalculatorOpen: (val) => setIsCalculatorOpen(val),
        toggleCalculator: () => setIsCalculatorOpen(prev => !prev),

        // Dynamic Help Context
        activeHelpKey,
        setActiveHelpKey,
        language,
        setLanguage,
        
        // Extreme Typography Settings
        typography,
        updateTypography: (key, settings) => {
            let newTypography;
            if (key === 'global') {
                newTypography = { ...typography, ...settings };
            } else {
                newTypography = {
                    ...typography,
                    [key]: { ...typography[key], ...settings }
                };
            }
            
            setTypography(newTypography);
            
            // Sync to backend if user exists
            if (user) {
                // Debounce sync to avoid hammering API
                if (window.typographySyncTimer) clearTimeout(window.typographySyncTimer);
                window.typographySyncTimer = setTimeout(() => {
                    authService.updateProfile({ typography_settings: newTypography });
                }, 1000);
            }
        },
        resetTypography
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
