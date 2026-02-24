import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, ScrollView, RefreshControl, TouchableOpacity, StatusBar, Modal, SafeAreaView, Dimensions, Animated, Image } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, ChevronRight, CheckCircle2, Circle, LayoutDashboard, Menu as MenuIcon, X, User, Settings, HelpCircle, LogOut, ChevronDown, ChevronUp } from 'lucide-react-native';
import { getMediaUrl } from '../services/api';
import Skeleton from '../components/Skeleton';

const { width } = Dimensions.get('window');

// Skeleton Loading Component for Dashboard
const DashboardSkeleton = () => (
    <View style={{ flex: 1, backgroundColor: '#f3f4f6' }}>
        <StatusBar barStyle="light-content" backgroundColor="#059669" />
        {/* Header Skeleton */}
        <View style={[styles.header, { height: 280 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
                <Skeleton width={30} height={30} borderRadius={15} style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
                <Skeleton width={100} height={30} borderRadius={15} style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
            </View>
            <Skeleton width={200} height={20} style={{ marginBottom: 20, backgroundColor: 'rgba(255,255,255,0.2)' }} />

            <View style={{ flexDirection: 'row', gap: 10 }}>
                <Skeleton width={160} height={100} borderRadius={12} style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
                <Skeleton width={160} height={100} borderRadius={12} style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
            </View>
        </View>

        {/* Content Skeleton */}
        <View style={{ padding: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
                <Skeleton width={150} height={24} />
                <Skeleton width={90} height={30} borderRadius={20} />
            </View>

            {[1, 2, 3].map(i => (
                <View key={i} style={{ backgroundColor: 'white', padding: 18, borderRadius: 15, marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View>
                            <Skeleton width={120} height={20} style={{ marginBottom: 8 }} />
                            <Skeleton width={180} height={14} />
                        </View>
                        <Skeleton width={20} height={20} borderRadius={10} />
                    </View>
                </View>
            ))}
        </View>
    </View>
);

export default function DashboardScreen({ navigation }) {
    const { dashboardData, loading, refreshData, logout, user } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isPermitsExpanded, setIsPermitsExpanded] = useState(false);
    const slideAnim = useRef(new Animated.Value(-width * 0.6)).current;

    useEffect(() => {
        if (isMenuOpen) {
            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
                tension: 65,
                friction: 9
            }).start();
        } else {
            Animated.timing(slideAnim, {
                toValue: -width * 0.6,
                duration: 200,
                useNativeDriver: true,
            }).start();
        }
    }, [isMenuOpen]);

    if (loading && !dashboardData) return <DashboardSkeleton />;
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

    const formatCurrency = (val) => {
        if (val >= 10000000) return `Rs. ${(val / 10000000).toFixed(2)} Cr`;
        if (val >= 100000) return `Rs. ${(val / 100000).toFixed(2)} Lakh`;
        return `Rs. ${val.toLocaleString()}`;
    };

    const handleLogout = async () => {
        setIsMenuOpen(false);
        await logout();
    };

    const MenuLink = ({ icon: Icon, label, onPress, danger }) => (
        <TouchableOpacity style={styles.menuItem} onPress={onPress}>
            <View style={[styles.menuIconContainer, danger && { backgroundColor: '#fee2e2' }]}>
                <Icon size={20} color={danger ? '#dc2626' : '#4b5563'} />
            </View>
            <Text style={[styles.menuItemText, danger && { color: '#dc2626' }]}>{label}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={{ flex: 1 }}>
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

                    {/* Header Top Row */}
                    <View style={styles.headerTop}>
                        <TouchableOpacity onPress={() => setIsMenuOpen(true)} style={styles.menuButton}>
                            <MenuIcon color="white" size={28} />
                        </TouchableOpacity>
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
                        <Text style={styles.sectionHeader}>Construction Phases</Text>
                        <TouchableOpacity
                            style={styles.addPhaseButton}
                            onPress={() => navigation.navigate('PhaseForm', { projectId: dashboardData.project?.id })}
                        >
                            <Text style={styles.addPhaseText}>+ Add Phase</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Phase 0: Municipal Permits */}
                    <TouchableOpacity
                        style={[styles.phaseCard, styles.phase0Card]}
                        onPress={() => setIsPermitsExpanded(!isPermitsExpanded)}
                    >
                        <View style={styles.phaseHeader}>
                            <View style={styles.phaseInfo}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                    <Text style={styles.phaseName}>Municipal Permits</Text>
                                    <View style={styles.phaseZeroBadge}>
                                        <Text style={styles.phaseZeroText}>Phase 0</Text>
                                    </View>
                                </View>
                                <View style={styles.dateRow}>
                                    <Text style={styles.dateText}>
                                        {dashboardData.permits?.filter(p => p.status === 'APPROVED').length || 0} of {dashboardData.permits?.length || 0} Approved
                                    </Text>
                                </View>
                            </View>
                            <View style={[styles.statusBadge, { backgroundColor: '#eef2ff' }]}>
                                <Text style={[styles.statusText, { color: '#4338ca' }]}>
                                    PRE-CONSTRUCTION
                                </Text>
                            </View>
                        </View>
                        {isPermitsExpanded ? (
                            <ChevronUp color="#d1d5db" size={20} />
                        ) : (
                            <ChevronRight color="#d1d5db" size={20} />
                        )}
                    </TouchableOpacity>

                    {/* Permit Details (Collapsible) */}
                    {isPermitsExpanded && (
                        <View style={styles.permitDetailsCard}>
                            {dashboardData.permits?.map((step) => (
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
                    )}

                    {/* Regular Construction Phases */}
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

                {/* More Menu Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>More Features</Text>
                    <View style={styles.moreGrid}>
                        <TouchableOpacity
                            style={styles.moreCard}
                            onPress={() => navigation.navigate('Suppliers')}
                        >
                            <View style={[styles.moreIcon, { backgroundColor: '#eef2ff' }]}>
                                <Text style={{ fontSize: 24 }}>🏪</Text>
                            </View>
                            <Text style={styles.moreLabel}>Suppliers</Text>
                            <Text style={styles.moreCount}>{dashboardData.suppliers?.length || 0}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.moreCard}
                            onPress={() => navigation.navigate('Contractors')}
                        >
                            <View style={[styles.moreIcon, { backgroundColor: '#fef3c7' }]}>
                                <Text style={{ fontSize: 24 }}>👷</Text>
                            </View>
                            <Text style={styles.moreLabel}>Contractors</Text>
                            <Text style={styles.moreCount}>{dashboardData.contractors?.length || 0}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.moreCard}
                            onPress={() => navigation.navigate('Permits')}
                        >
                            <View style={[styles.moreIcon, { backgroundColor: '#d1fae5' }]}>
                                <Text style={{ fontSize: 24 }}>📋</Text>
                            </View>
                            <Text style={styles.moreLabel}>Permits</Text>
                            <Text style={styles.moreCount}>{dashboardData.permits?.length || 0}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.moreCard}
                            onPress={() => navigation.navigate('Estimator')}
                        >
                            <View style={[styles.moreIcon, { backgroundColor: '#e0f2fe' }]}>
                                <Text style={{ fontSize: 24 }}>📊</Text>
                            </View>
                            <Text style={styles.moreLabel}>Estimator</Text>
                            <Text style={styles.moreCount}>Rates</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>

            {/* Side Menu Modal */}
            <Modal
                visible={isMenuOpen}
                transparent={true}
                animationType="none"
                onRequestClose={() => setIsMenuOpen(false)}
            >
                <View style={styles.menuOverlay}>
                    <Animated.View style={[styles.sideMenuContainer, { transform: [{ translateX: slideAnim }] }]}>
                        <LinearGradient
                            colors={['#059669', '#047857']}
                            style={styles.menuHeader}
                        >
                            <View style={styles.menuHeaderTop}>
                                <View style={styles.avatarCircle}>
                                    {user?.profile?.avatar ? (
                                        <Image
                                            source={{ uri: getMediaUrl(user.profile.avatar) }}
                                            style={styles.avatarImage}
                                        />
                                    ) : (
                                        <Text style={styles.avatarText}>{user?.username?.charAt(0).toUpperCase()}</Text>
                                    )}
                                </View>
                                <TouchableOpacity onPress={() => setIsMenuOpen(false)}>
                                    <X color="white" size={24} />
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.menuUsername}>{user?.username || 'User'}</Text>
                            <Text style={styles.menuEmail}>{user?.email || 'user@example.com'}</Text>
                        </LinearGradient>

                        <View style={styles.menuItems}>
                            <MenuLink
                                icon={User}
                                label="Profile Details"
                                onPress={() => {
                                    setIsMenuOpen(false);
                                    navigation.navigate('Profile');
                                }}
                            />
                            <MenuLink
                                icon={HelpCircle}
                                label="Help & Support"
                                onPress={() => setIsMenuOpen(false)}
                            />
                            <MenuLink
                                icon={Settings}
                                label="Settings"
                                onPress={() => setIsMenuOpen(false)}
                            />
                            <View style={styles.divider} />
                            <MenuLink
                                icon={LogOut}
                                label="Log Out"
                                danger
                                onPress={handleLogout}
                            />
                        </View>
                        <View style={styles.menuFooter}>
                            <Text style={styles.versionText}>Mero Ghar v1.0.0</Text>
                        </View>
                    </Animated.View>
                    <TouchableOpacity style={styles.menuBackdrop} onPress={() => setIsMenuOpen(false)} />
                </View>
            </Modal>
        </View>
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
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
        zIndex: 10,
        width: '100%',
    },
    menuButton: {
        padding: 4,
        marginLeft: -4,
    },
    headerBgIcon: { position: 'absolute', bottom: -20, right: -20, opacity: 0.5 },
    headerContent: { zIndex: 1 },
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
    sectionHeader: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
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
    phase0Card: {
        borderColor: '#4338ca',
        borderWidth: 2,
        backgroundColor: '#fafafa',
    },
    permitDetailsCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        marginLeft: 8,
        marginRight: 8,
        borderLeftWidth: 3,
        borderLeftColor: '#4338ca',
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

    // Menu Styles
    menuOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    menuBackdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    sideMenuContainer: {
        width: width * 0.6, // 60% width
        backgroundColor: 'white',
        height: '100%',
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
    },
    menuHeader: {
        padding: 24,
        paddingTop: 60,
    },
    menuHeaderTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    avatarCircle: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'white',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    avatarText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#059669',
    },
    menuUsername: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'white',
        alignItems: 'center',
        justifyContent: 'center',
    },
    menuEmail: {
        fontSize: 14,
        color: '#a7f3d0',
    },
    menuItems: {
        padding: 20,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
    },
    menuIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 8,
        backgroundColor: '#f3f4f6',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    menuItemText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#374151',
    },
    divider: {
        height: 1,
        backgroundColor: '#f3f4f6',
        marginVertical: 10,
    },
    menuFooter: {
        position: 'absolute',
        bottom: 30,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    versionText: {
        fontSize: 12,
        color: '#9ca3af',
    },

    // More Menu Styles
    moreGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    moreCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        width: '48%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    moreIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    moreLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 4,
    },
    moreCount: {
        fontSize: 12,
        color: '#6b7280',
    },
});
