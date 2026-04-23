import React from 'react';
import { BarChart3 } from 'lucide-react';
import ForecastWidget from '../components/analytics/ForecastWidget';
import RateTrendTable from '../components/analytics/RateTrendTable';
import AlertsFeed from '../components/analytics/AlertsFeed';

/**
 * Predictive Budget Engine dashboard.
 * Combines per-category forecasts, supplier rate trends and alert feed.
 */
const AnalyticsPage = () => (
    <div className="max-w-7xl mx-auto p-4">
        <header className="mb-4">
            <h1 className="text-2xl font-semibold inline-flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-blue-600" />
                Predictive Analytics
            </h1>
            <p className="text-sm text-gray-500 mt-1">
                बजेट पूर्वानुमान, आपूर्तिकर्ता दर प्रवृत्ति र स्वचालित अलर्टहरू।
            </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
                <ForecastWidget />
                <RateTrendTable />
            </div>
            <aside className="space-y-4">
                <AlertsFeed />
            </aside>
        </div>
    </div>
);

export default AnalyticsPage;
