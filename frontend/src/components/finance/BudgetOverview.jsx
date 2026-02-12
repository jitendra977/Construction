import React, { useState, useEffect } from 'react';
import { dashboardService } from '../../services/api';

const StatCard = ({ title, value, subtext, color = "blue", icon }) => (
    <div className={`bg-white p-6 rounded-xl shadow-sm border border-${color}-100`}>
        <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wider">{title}</h3>
            <span className={`p-2 bg-${color}-50 text-${color}-600 rounded-lg text-xl`}>{icon}</span>
        </div>
        <div className="flex flex-col">
            <span className="text-3xl font-bold text-gray-900">Rs. {value.toLocaleString()}</span>
            {subtext && <span className="text-sm text-gray-500 mt-1">{subtext}</span>}
        </div>
    </div>
);

const ProgressBar = ({ label, current, total, color = "indigo" }) => {
    const percentage = total > 0 ? Math.min(100, (current / total) * 100) : 0;

    return (
        <div className="mb-4">
            <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-gray-700">{label}</span>
                <span className="text-sm font-medium text-gray-900">{percentage.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                    className={`bg-${color}-600 h-2.5 rounded-full transition-all duration-500 ease-out`}
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>Rs. {current.toLocaleString()}</span>
                <span>Rs. {total.toLocaleString()}</span>
            </div>
        </div>
    );
};

const BudgetOverview = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const response = await dashboardService.getBudgetOverview();
            setStats(response.data);
        } catch (error) {
            console.error("Failed to fetch budget stats:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading budget data...</div>;
    if (!stats) return null;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Financial Overview</h2>
                <div className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm font-medium">
                    {stats.budget_health?.status === 'HEALTHY' ? 'Budget Healthy' : 'Over Allocated'}
                </div>
            </div>

            {/* Core Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    title="Total Project Budget"
                    value={stats.project_budget}
                    subtext={"Estimated Category Total: Rs. " + stats.estimated_by_category.toLocaleString()}
                    icon="💰"
                    color="indigo"
                />
                <StatCard
                    title="Total Funding Received"
                    value={stats.total_funding}
                    subtext={`Available Balance: Rs. ${stats.funding_balance.toLocaleString()}`}
                    icon="🏦"
                    color="green"
                />
                <StatCard
                    title="Total Expenses"
                    value={stats.total_spent}
                    subtext="Actual Spent"
                    icon="💸"
                    color="red"
                />
            </div>

            {/* Progress Bars */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-6">Budget Utilization</h3>
                <div className="space-y-6">
                    <ProgressBar
                        label="Project Budget Used"
                        current={stats.total_spent}
                        total={stats.project_budget}
                        color="indigo"
                    />
                    <ProgressBar
                        label="Available Funding Used"
                        current={stats.total_spent}
                        total={stats.total_funding}
                        color="red" // Red because higher usage of funding means depleting cash
                    />
                    {/* Category Allocation vs Project Budget just for context */}
                    <ProgressBar
                        label="Budget Allocation Status"
                        current={stats.estimated_by_category}
                        total={stats.project_budget}
                        color="blue"
                    />
                </div>
            </div>
        </div>
    );
};

export default BudgetOverview;
