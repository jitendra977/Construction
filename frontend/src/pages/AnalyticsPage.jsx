import React from 'react';
import { BarChart3 } from 'lucide-react';
import ForecastWidget from '../components/analytics/ForecastWidget';
import RateTrendTable from '../components/analytics/RateTrendTable';
import AlertsFeed from '../components/analytics/AlertsFeed';
import ManagementTabs from '../components/desktop/manage/ManagementTabs';

/**
 * Predictive Budget Engine dashboard.
 * Combines per-category forecasts, supplier rate trends and alert feed.
 */
const AnalyticsPage = () => (
    <div className="min-h-screen bg-[var(--t-bg)] font-sans flex flex-col">
        <ManagementTabs />
        
        <div className="bg-[var(--t-surface)] border-b border-[var(--t-border)] shadow-xl pb-12 pt-8 px-6 shrink-0 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <BarChart3 className="w-64 h-64" />
            </div>

            <div className="max-w-7xl mx-auto relative z-10">
                <h1 className="text-3xl font-black text-[var(--t-text)] tracking-tight flex items-center gap-3">
                    📊 Predictive Analytics
                </h1>
                <p className="text-[var(--t-text2)] mt-2 text-sm md:text-base font-medium opacity-90 max-w-2xl">
                    Real-time budget forecasting, market rate trends, and automated financial risk alerts powered by the site intelligence engine.
                </p>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto -mt-6 pb-20 relative z-20">
            <div className="max-w-7xl mx-auto px-6 md:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <ForecastWidget />
                        <RateTrendTable />
                    </div>
                    <aside className="space-y-6">
                        <div className="bg-[var(--t-surface)] rounded-2xl border border-[var(--t-border)] shadow-sm h-full flex flex-col overflow-hidden">
                            <div className="px-6 py-5 border-b border-[var(--t-border)]">
                                <h3 className="text-sm font-black text-[var(--t-text)] uppercase tracking-tight flex items-center gap-2">
                                    🚨 Live Risk Alerts
                                </h3>
                                <p className="text-[10px] text-[var(--t-text3)] font-bold mt-1">Financial and operational anomalies</p>
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                <AlertsFeed />
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    </div>
);

export default AnalyticsPage;
