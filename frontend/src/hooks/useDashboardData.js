import { useState, useEffect, useMemo } from 'react';
import { dashboardService } from '../services/api';
import { authService } from '../services/auth';

export const useDashboardData = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
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
        floors: []
    });

    const fetchData = async () => {
        try {
            const data = await dashboardService.getDashboardData();
            setDashboardData(data);
        } catch (error) {
            console.error("Failed to load dashboard data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const currentUser = authService.getCurrentUser();
        setUser(currentUser);
        fetchData();
    }, []);

    const formatCurrency = (amount) => {
        if (!amount) return 'Rs. 0';
        const val = Number(amount);
        if (val >= 10000000) return `Rs. ${(val / 10000000).toFixed(2)} Cr`;
        if (val >= 100000) return `Rs. ${(val / 100000).toFixed(2)} Lakh`;
        return `Rs. ${val.toLocaleString('en-IN')}`;
    };

    const stats = useMemo(() => {
        const { project, expenses, phases } = dashboardData;
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
    }, [dashboardData]);

    const budgetStats = useMemo(() => {
        const totalBudget = dashboardData.project ? Number(dashboardData.project.total_budget) : 0;
        const totalSpent = dashboardData.expenses.reduce((acc, exp) => acc + Number(exp.amount), 0);
        const remainingBudget = totalBudget - totalSpent;
        const budgetPercent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

        return {
            totalBudget,
            totalSpent,
            remainingBudget,
            budgetPercent
        };
    }, [dashboardData]);

    const recentActivities = useMemo(() => {
        const activities = [
            ...dashboardData.tasks.slice(0, 3).map(t => ({
                id: `task-${t.id}`,
                title: t.title,
                message: `Task "${t.title}" is ${t.status.toLowerCase()}`,
                time: new Date(t.updated_at).toLocaleDateString(),
                icon: '🔧'
            })),
            ...dashboardData.expenses.slice(0, 3).map(e => ({
                id: `exp-${e.id}`,
                title: e.title,
                message: `Paid ${formatCurrency(e.amount)} for ${e.title}`,
                time: new Date(e.date).toLocaleDateString(),
                icon: '💵'
            }))
        ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 5);
        return activities;
    }, [dashboardData]);

    return {
        user,
        loading,
        dashboardData,
        stats,
        budgetStats,
        recentActivities,
        formatCurrency,
        refreshData: fetchData
    };
};
