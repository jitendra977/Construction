import React from 'react';
import { StyleSheet, View, Text, ScrollView, RefreshControl, TouchableOpacity, StatusBar } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, ChevronRight, CheckCircle2, Circle, LayoutDashboard } from 'lucide-react-native';

export default function DashboardScreen({ navigation }) {
    const { dashboardData, loading, refreshData } = useAuth();

    if (!dashboardData) return null;

    // --- Financial Stats Calculation ---
    // Ensure safe access
    const expenses = Array.isArray(dashboardData?.expenses) ? dashboardData.expenses : [];
    const funding = Array.isArray(dashboardData?.funding) ? dashboardData.funding : [];
    const materials = Array.isArray(dashboardData?.materials) ? dashboardData.materials : [];

    const totalFunding = funding.reduce((sum, f) => sum + Number(f.amount || 0), 0);
    const totalSpent = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const availableCash = totalFunding - totalSpent;

    // Stock Value
    const stockValue = materials.reduce((sum, m) => sum + (Number(m.current_stock || 0) * Number(m.unit_price || 0)), 0);

    // Budget Utilization (Assuming Funding is Budget for now)
    const totalBudget = totalFunding > 0 ? totalFunding : 1;
    const budgetPercent = (totalSpent / totalBudget) * 100;

    // Funding Coverage (Arbitrary metric context or calculation?)
    // User requested "47% Securing total project". Let's assume Total Project Cost is higher, 
    // or maybe Funding / Total Budget if Total Budget known. 
    // For now, let's keep it dynamic based on data if possible, or static structure if specific.
    // Let's assume a "Target Budget" of 3 Cr for the example "1.50 Cr" context, 
    // but better to just show "Funding vs Spent" or similar. 
    // To match user's "47%", let's calculate Funding / Estimated Project Cost.
    // If no estimated cost, we can't calc coverage. 
    // Let's use a dummy huge number for "Total Project Value" or just show Funding % of something.
    // Actually, "Funding Coverage" might mean (Funding / Budget) * 100.

    const formatCurrency = (val) => {
        if (val >= 10000000) return `Rs. ${(val / 10000000).toFixed(2)} Cr`;
        if (val >= 100000) return `Rs. ${(val / 100000).toFixed(2)} Lakh`;
        return `Rs. ${val.toLocaleString()}`;
    };

    return (
        <ScrollView
            style={styles.container}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={refreshData} />}
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
                    <LayoutDashboard color="rgba(255,255,255,0.1)" size={140} />
                </View>

                <View style={styles.headerContent}>
                    {/* Project Title Removed as per request */}
                    <Text style={styles.projectMeta}>{dashboardData.phases?.filter(p => p.status === 'COMPLETED').length} of {dashboardData.phases?.length} Phases Completed</Text>
                </View>

                {/* Mini Stats Carousel */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsContainer}>
                    {/* Budget Util */}
                    <View style={styles.miniStatCard}>
                        <View style={styles.miniStatHeader}>
                            <Text style={styles.miniStatLabel}>Budget Utilization</Text>
                            <Text style={styles.miniStatValue}>{budgetPercent.toFixed(1)}%</Text>
                        </View>
                        <Text style={styles.miniStatSub}>{formatCurrency(totalSpent)} of {formatCurrency(totalFunding)}</Text>
                        <View style={styles.miniProgressBg}>
                            <View style={[styles.miniProgressFill, { width: `${Math.min(100, budgetPercent)}%`, backgroundColor: '#f59e0b' }]} />
                        </View>
                    </View>

                    {/* Available Cash */}
                    <View style={styles.miniStatCard}>
                        <View style={styles.miniStatHeader}>
                            <Text style={styles.miniStatLabel}>Available Cash</Text>
                            <Circle size={12} color="#10b981" fill="#10b981" />
                        </View>
                        <Text style={[styles.miniStatValue, { color: '#10b981', marginTop: 4 }]}>{formatCurrency(availableCash)}</Text>
                        <Text style={styles.miniStatSub}>Liquid Assets</Text>
                    </View>

                    {/* Stock Value */}
                    <View style={styles.miniStatCard}>
                        <View style={styles.miniStatHeader}>
                            <Text style={styles.miniStatLabel}>Stock Value</Text>
                            <LayoutDashboard size={12} color="#3b82f6" />
                        </View>
                        <Text style={[styles.miniStatValue, { color: '#3b82f6', marginTop: 4 }]}>{formatCurrency(stockValue)}</Text>
                        <Text style={styles.miniStatSub}>{materials.length} Resource types</Text>
                    </View>
                </ScrollView>
            </LinearGradient>

            <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionHeader}>Municipal Permits</Text>
                    <View style={styles.phaseZeroBadge}>
                        <Text style={styles.phaseZeroText}>Phase 0</Text>
                    </View>
                </View>
                <View style={styles.permitCard}>
                    {dashboardData.permitSteps?.map((step) => (
                        <View key={step.id} style={styles.permitItem}>
                            {step.status === 'APPROVED' ? (
                                <CheckCircle2 color="#10b981" size={18} />
                            ) : (
                                <View style={styles.pendingDot} />
                            )}
                            <Text style={[styles.permitTitle, step.status === 'APPROVED' && styles.completedText]}>
                                {step.title}
                            </Text>
                        </View>
                    ))}
                </View>
            </View>

            <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionHeader}>Construction Phases</Text>
                    <TouchableOpacity
                        style={styles.addPhaseButton}
                        onPress={() => navigation.navigate('PhaseForm', { projectId: dashboardData.project?.id })}
                    >
                        <Text style={styles.addPhaseText}>+ Add Phase</Text>
                    </TouchableOpacity>
                </View>
                {dashboardData.phases?.map((phase) => (
                    <TouchableOpacity
                        key={phase.id}
                        style={styles.phaseCard}
                        onPress={() => navigation.navigate('PhaseDetail', { phase })}
                    >
                        <View style={styles.phaseHeader}>
                            <View style={styles.phaseInfo}>
                                <Text style={styles.phaseName}>{phase.name}</Text>
                                <View style={styles.dateRow}>
                                    <Calendar color="#6b7280" size={14} />
                                    <Text style={styles.dateText}>{new Date(phase.start_date).toLocaleDateString()} - {new Date(phase.end_date).toLocaleDateString()}</Text>
                                </View>
                            </View>
                            <View style={[styles.statusBadge, { backgroundColor: phase.status === 'COMPLETED' ? '#d1fae5' : '#fef3c7' }]}>
                                <Text style={[styles.statusText, { color: phase.status === 'COMPLETED' ? '#059669' : '#d97706' }]}>
                                    {phase.status}
                                </Text>
                            </View>
                        </View>
                        <ChevronRight color="#d1d5db" size={20} />
                    </TouchableOpacity>
                ))}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f3f4f6' },
    header: {
        paddingTop: 80,
        paddingBottom: 30,
        paddingHorizontal: 25,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        shadowColor: '#059669',
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 5,
        overflow: 'hidden',
    },
    headerBgIcon: { position: 'absolute', bottom: -20, right: -20, opacity: 0.5 },
    headerContent: { zIndex: 1 },
    projectTitle: { fontSize: 24, fontWeight: '800', color: 'white', marginBottom: 4 },
    projectMeta: { fontSize: 13, color: '#a7f3d0', fontWeight: '600', marginBottom: 20 },

    statsContainer: { gap: 10, paddingRight: 20 },
    miniStatCard: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 12,
        padding: 12,
        width: 160,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    miniStatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    miniStatLabel: { color: '#e0e7ff', fontSize: 11, fontWeight: '600' },
    miniStatValue: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    miniStatSub: { color: '#a7f3d0', fontSize: 10, marginBottom: 8 },
    miniProgressBg: { height: 4, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 2 },
    miniProgressFill: { height: '100%', borderRadius: 2 },
    section: { padding: 20 },
    sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    phaseZeroBadge: { backgroundColor: '#4338ca', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    phaseZeroText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
    permitCard: { backgroundColor: 'white', borderRadius: 15, padding: 15, borderWidth: 1, borderColor: '#e5e7eb' },
    permitItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    pendingDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#fcd34d', marginHorizontal: 4 },
    permitTitle: { fontSize: 13, color: '#374151', marginLeft: 10 },
    completedText: { textDecorationLine: 'line-through', color: '#9ca3af' },
    phaseCard: {
        backgroundColor: 'white',
        borderRadius: 15,
        padding: 18,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    phaseHeader: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    phaseInfo: { flex: 1 },
    phaseName: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
    addPhaseButton: { backgroundColor: '#e0e7ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
    addPhaseText: { color: '#4338ca', fontSize: 12, fontWeight: 'bold' },
    dateRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
    dateText: { fontSize: 12, color: '#6b7280', marginLeft: 6 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginLeft: 10 },
    statusText: { fontSize: 10, fontWeight: 'bold' },
});
