import React, { useState, useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, RefreshControl, TouchableOpacity, Dimensions, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { TrendingUp, Wallet, Package, ArrowDownRight, PieChart, List, FileText, Plus } from 'lucide-react-native';

const { width } = Dimensions.get('window');

const TABS = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'categories', label: 'Categories', icon: PieChart },
    { id: 'expenses', label: 'History', icon: List },
];

export default function FinanceScreen() {
    const { dashboardData, loading, refreshData } = useAuth();
    const [activeTab, setActiveTab] = useState('overview');

    // if (!dashboardData) return null; // Removed early return to fix Hook rule violation

    // --- Financial Calculations (Mirroring Desktop) ---
    // Ensure safe access to arrays
    const expenses = Array.isArray(dashboardData?.expenses) ? dashboardData.expenses : [];
    const funding = Array.isArray(dashboardData?.funding) ? dashboardData.funding : [];
    const materials = Array.isArray(dashboardData?.materials) ? dashboardData.materials : [];


    const totalFunding = funding.reduce((sum, f) => sum + Number(f.amount || 0), 0);
    const totalSpent = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const availableCash = totalFunding - totalSpent;

    // Estimate total project budget by summing all categories expected budget (if available) or manual constant
    // For now, let's use totalFunding as "Budget" if no specific budget object exists, 
    // or if we want to track against specific targets from desktop, we'd need that data.
    // Desktop uses `budgetStats.totalBudget`. We can try to approximate or use funding as baseline.
    // Let's assume Total Funding is the Working Budget for now to keep it simple on mobile.
    const totalBudget = totalFunding > 0 ? totalFunding : 10000000; // Fallback or accurate?

    // Category Breakdown
    const categoryBreakdown = useMemo(() => {
        return expenses.reduce((acc, exp) => {
            const cat = exp.category_name || 'General';
            const existing = acc.find(a => a.name === cat);
            const amount = Number(exp.amount);
            if (existing) {
                existing.spent += amount;
                existing.count += 1;
            } else {
                acc.push({ name: cat, spent: amount, count: 1 });
            }
            return acc;
        }, []).sort((a, b) => b.spent - a.spent);
    }, [expenses]);

    const budgetPercent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

    const formatCurrency = (amount) => {
        return 'Rs. ' + Number(amount).toLocaleString();
    };


    // --- Render Components ---

    const renderProgressBar = (label, current, total, color = '#4f46e5') => {
        const percent = total > 0 ? Math.min(100, (current / total) * 100) : 0;
        return (
            <View style={styles.progressContainer}>
                <View style={styles.progressHeader}>
                    <Text style={styles.progressLabel}>{label}</Text>
                    <Text style={styles.progressPercent}>{percent.toFixed(1)}%</Text>
                </View>
                <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${percent}%`, backgroundColor: color }]} />
                </View>
                <View style={styles.progressFooter}>
                    <Text style={styles.progressMeta}>{formatCurrency(current)}</Text>
                    <Text style={styles.progressMeta}>{formatCurrency(total)}</Text>
                </View>
            </View>
        );
    };

    const renderOverview = () => (
        <View style={styles.tabContent}>
            {/* Stats Grid */}
            <View style={styles.statsGrid}>
                <View style={[styles.statCard, { backgroundColor: '#e0e7ff' }]}>
                    <Text style={[styles.statLabel, { color: '#4338ca' }]}>TOTAL BUDGET</Text>
                    <Text style={[styles.statValue, { color: '#312e81' }]}>{formatCurrency(totalBudget)}</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: '#fee2e2' }]}>
                    <Text style={[styles.statLabel, { color: '#b91c1c' }]}>TOTAL SPENT</Text>
                    <Text style={[styles.statValue, { color: '#7f1d1d' }]}>{formatCurrency(totalSpent)}</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: '#dcfce7' }]}>
                    <Text style={[styles.statLabel, { color: '#15803d' }]}>REMAINING</Text>
                    <Text style={[styles.statValue, { color: '#14532d' }]}>{formatCurrency(totalBudget - totalSpent)}</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: '#f3f4f6' }]}>
                    <Text style={[styles.statLabel, { color: '#4b5563' }]}>CATEGORIES</Text>
                    <Text style={[styles.statValue, { color: '#1f2937' }]}>{categoryBreakdown.length}</Text>
                </View>
            </View>

            {/* Main Progress */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Budget Utilization</Text>
                {renderProgressBar('Project Budget Used', totalSpent, totalBudget, budgetPercent > 90 ? '#ef4444' : '#10b981')}
            </View>

            {/* Key Metrics Carousel */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.metricsScroll} contentContainerStyle={{ paddingRight: 20 }}>
                <View style={[styles.metricBox, { backgroundColor: '#ecfdf5', borderColor: '#d1fae5' }]}>
                    <View style={[styles.metricIcon, { backgroundColor: '#10b981' }]}>
                        <Wallet color="white" size={16} />
                    </View>
                    <Text style={styles.metricTitle}>Cash on Hand</Text>
                    <Text style={styles.metricData}>{formatCurrency(availableCash)}</Text>
                </View>

                <View style={[styles.metricBox, { backgroundColor: '#eff6ff', borderColor: '#dbeafe' }]}>
                    <View style={[styles.metricIcon, { backgroundColor: '#3b82f6' }]}>
                        <TrendingUp color="white" size={16} />
                    </View>
                    <Text style={styles.metricTitle}>Avg. Expense</Text>
                    <Text style={styles.metricData}>
                        {expenses.length > 0 ? formatCurrency(totalSpent / expenses.length) : 'Rs. 0'}
                    </Text>
                </View>

                <View style={[styles.metricBox, { backgroundColor: '#fef2f2', borderColor: '#fee2e2' }]}>
                    <View style={[styles.metricIcon, { backgroundColor: '#ef4444' }]}>
                        <ArrowDownRight color="white" size={16} />
                    </View>
                    <Text style={styles.metricTitle}>Top Category</Text>
                    <Text style={styles.metricData} numberOfLines={1}>
                        {categoryBreakdown[0]?.name || 'N/A'}
                    </Text>
                </View>
            </ScrollView>
        </View>
    );

    const renderCategories = () => (
        <View style={styles.tabContent}>
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Spending by Category</Text>
                <Text style={styles.cardSubtitle}>Breakdown of expenses across all categories</Text>

                {categoryBreakdown.map((cat, index) => (
                    <View key={index} style={styles.categoryRow}>
                        <View style={styles.categoryHeader}>
                            <View>
                                <Text style={styles.categoryName}>{cat.name}</Text>
                                <Text style={styles.categoryCount}>{cat.count} expense{cat.count !== 1 ? 's' : ''}</Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={styles.categoryAmount}>{formatCurrency(cat.spent)}</Text>
                                <Text style={styles.categoryPercent}>{((cat.spent / totalSpent) * 100).toFixed(1)}%</Text>
                            </View>
                        </View>
                        <View style={styles.catProgressBarBg}>
                            <View style={[
                                styles.catProgressBarFill,
                                { width: `${(cat.spent / totalSpent) * 100}%` }
                            ]} />
                        </View>
                    </View>
                ))}
            </View>
        </View>
    );

    const renderHistory = () => (
        <View style={styles.tabContent}>
            <View style={styles.historyHeader}>
                <Text style={styles.historyTitle}>Recent Transactions</Text>
                <TouchableOpacity style={styles.addBtn}>
                    <Plus color="white" size={16} />
                    <Text style={styles.addBtnText}>Add</Text>
                </TouchableOpacity>
            </View>

            {expenses.slice(0, 20).map((expense) => ( // Limit to 20 for performance
                <View key={expense.id} style={styles.historyItem}>
                    <View style={styles.historyIcon}>
                        <ArrowDownRight color="#ef4444" size={20} />
                    </View>
                    <View style={styles.historyInfo}>
                        <Text style={styles.historyDesc}>{expense.description || expense.title}</Text>
                        <Text style={styles.historyMeta}>
                            {expense.category_name} • {new Date(expense.date).toLocaleDateString()}
                        </Text>
                    </View>
                    <Text style={styles.historyAmount}>-{formatCurrency(expense.amount)}</Text>
                </View>
            ))}
        </View>
    );


    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={{ flexGrow: 1 }}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={refreshData} tintColor="#059669" />}
        >
            <StatusBar barStyle="light-content" backgroundColor="#059669" />
            <LinearGradient
                colors={['#059669', '#047857']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                {/* Background Icon */}
                <View style={styles.headerBgIcon}>
                    <TrendingUp color="rgba(255,255,255,0.1)" size={120} />
                </View>

                {/* Header Title Removed as per request */}
                <View style={styles.badgeContainer}>
                    <View style={[styles.badgeDot, { backgroundColor: '#4ade80' }]} />
                    <Text style={styles.badgeText}>Budget Tracking Active</Text>
                </View>

                <View style={styles.tabsContainer}>
                    {TABS.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <TouchableOpacity
                                key={tab.id}
                                onPress={() => setActiveTab(tab.id)}
                                style={[styles.tab, isActive && styles.tabActive]}
                            >
                                <Icon size={16} color={isActive ? '#059669' : 'rgba(255,255,255,0.8)'} />
                                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab.label}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </LinearGradient>

            <View style={styles.content}>
                {activeTab === 'overview' && renderOverview()}
                {activeTab === 'categories' && renderCategories()}
                {activeTab === 'expenses' && renderHistory()}
                <View style={{ height: 100 }} />
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f3f4f6' },
    header: {
        paddingTop: 60,
        paddingBottom: 20,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        shadowColor: '#059669',
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 5,
        overflow: 'hidden',
    },
    headerBgIcon: { position: 'absolute', bottom: -20, right: -20, opacity: 0.5 },
    headerTitle: { fontSize: 22, fontWeight: '800', color: 'white' },
    badgeContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginTop: 8, marginBottom: 20 },
    badgeDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
    badgeText: { color: 'white', fontSize: 12, fontWeight: '600' },

    tabsContainer: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.1)', padding: 4, borderRadius: 12 },
    tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, gap: 6 },
    tabActive: { backgroundColor: 'white', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
    tabText: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600' },
    tabTextActive: { color: '#059669' },

    content: { flex: 1 },
    tabContent: { padding: 20 },

    // Overview Styles
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
    statCard: { width: (width - 52) / 2, padding: 16, borderRadius: 16, justifyContent: 'center' },
    statLabel: { fontSize: 10, fontWeight: 'bold', marginBottom: 4 },
    statValue: { fontSize: 16, fontWeight: 'bold' },

    card: { backgroundColor: 'white', borderRadius: 16, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
    cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937', marginBottom: 16 },
    cardSubtitle: { fontSize: 13, color: '#6b7280', marginBottom: 20, marginTop: -12 },

    progressContainer: { marginBottom: 12 },
    progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    progressLabel: { fontSize: 13, fontWeight: '600', color: '#374151' },
    progressPercent: { fontSize: 13, fontWeight: 'bold', color: '#111827' },
    progressBarBg: { height: 10, backgroundColor: '#f3f4f6', borderRadius: 5, overflow: 'hidden' },
    progressBarFill: { height: '100%', borderRadius: 5 },
    progressFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
    progressMeta: { fontSize: 11, color: '#9ca3af' },

    metricsScroll: { marginHorizontal: -20, paddingHorizontal: 20 },
    metricBox: { width: 140, padding: 16, borderRadius: 16, borderWidth: 1, marginRight: 12 },
    metricIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    metricTitle: { fontSize: 12, color: '#6b7280', fontWeight: '600' },
    metricData: { fontSize: 16, color: '#1f2937', fontWeight: 'bold', marginTop: 4 },

    // Category Styles
    categoryRow: { marginBottom: 20 },
    categoryHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    categoryName: { fontSize: 14, fontWeight: '700', color: '#374151' },
    categoryCount: { fontSize: 11, color: '#9ca3af' },
    categoryAmount: { fontSize: 14, fontWeight: 'bold', color: '#059669' },
    categoryPercent: { fontSize: 11, color: '#6b7280', textAlign: 'right' },
    catProgressBarBg: { height: 8, backgroundColor: '#f3f4f6', borderRadius: 4 },
    catProgressBarFill: { height: '100%', backgroundColor: '#059669', borderRadius: 4 },

    // History Styles
    historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    historyTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' },
    addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#059669', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, gap: 4 },
    addBtnText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
    historyItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 5 },
    historyIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    historyInfo: { flex: 1 },
    historyDesc: { fontSize: 14, fontWeight: '600', color: '#1f2937' },
    historyMeta: { fontSize: 12, color: '#6b7280', marginTop: 2 },
    historyAmount: { fontSize: 14, fontWeight: 'bold', color: '#ef4444' },

});
