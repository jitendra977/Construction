import React, { useState, useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, RefreshControl, TouchableOpacity, TextInput, Dimensions, StatusBar, Linking, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { Package, Truck, User, Search, Phone, Mail, Wrench, Briefcase, AlertTriangle } from 'lucide-react-native';

const TABS = [
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'suppliers', label: 'Suppliers', icon: Truck },
    { id: 'contractors', label: 'Contractors', icon: Briefcase },
];

const CATEGORIES = ['All', 'Construction', 'Plumbing', 'Electrical', 'Timber', 'Paint', 'Finishing'];

import Skeleton from '../components/Skeleton';

// Skeleton Loading Component
const ResourcesSkeleton = () => (
    <View style={{ flex: 1, backgroundColor: '#f3f4f6' }}>
        <StatusBar barStyle="light-content" backgroundColor="#059669" />
        {/* Header Skeleton */}
        <View style={[styles.header, { height: 200 }]}>
            <View style={{ marginBottom: 20 }}>
                <Skeleton width={150} height={30} style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
            </View>
            {/* Search Skeleton */}
            <Skeleton width="100%" height={45} borderRadius={12} style={{ marginBottom: 16, backgroundColor: 'white' }} />
            {/* Tabs Skeleton */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
                <Skeleton width={100} height={35} borderRadius={10} style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
                <Skeleton width={100} height={35} borderRadius={10} style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
                <Skeleton width={100} height={35} borderRadius={10} style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
            </View>
        </View>

        {/* Content Skeleton */}
        <View style={{ padding: 20 }}>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                <Skeleton width={80} height={30} borderRadius={20} />
                <Skeleton width={80} height={30} borderRadius={20} />
                <Skeleton width={80} height={30} borderRadius={20} />
            </View>

            {[1, 2, 3, 4].map(i => (
                <View key={i} style={{ backgroundColor: 'white', padding: 16, borderRadius: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Skeleton width={44} height={44} borderRadius={12} />
                    <View style={{ flex: 1 }}>
                        <Skeleton width={120} height={16} style={{ marginBottom: 6 }} />
                        <Skeleton width={80} height={12} />
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Skeleton width={60} height={16} style={{ marginBottom: 6 }} />
                        <Skeleton width={40} height={12} />
                    </View>
                </View>
            ))}
        </View>
    </View>
);

export default function ResourcesScreen() {
    const { dashboardData, loading, refreshData } = useAuth();
    const [activeTab, setActiveTab] = useState('inventory');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');

    // --- Filter Logic (Moved to top level to satisfy Rules of Hooks) ---
    const filteredInventory = useMemo(() => {
        if (!dashboardData?.materials) return [];
        return (dashboardData.materials || []).filter(m => {
            const matchesSearch = (m.name || '').toLowerCase().includes((searchQuery || '').toLowerCase());
            const matchesCategory = selectedCategory === 'All' || m.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [dashboardData, searchQuery, selectedCategory]);

    // Conditional returns MUST be after all hooks
    if (loading && !dashboardData) return <ResourcesSkeleton />;
    if (!dashboardData) return null;

    // --- Helpers ---
    const handleCall = (phone) => {
        if (!phone) return Alert.alert('Error', 'No phone number available');
        Linking.openURL(`tel:${phone}`);
    };

    const handleEmail = (email) => {
        if (!email) return Alert.alert('Error', 'No email address available');
        Linking.openURL(`mailto:${email}`);
    };

    // Helper function moved to component level
    const getResourceRoleColor = (role) => {
        switch (role) {
            case 'THEKEDAAR': return { bg: '#f3e8ff', text: '#7e22ce' }; // Purple
            case 'ENGINEER': return { bg: '#dbeafe', text: '#1d4ed8' }; // Blue
            case 'MISTRI': return { bg: '#ffedd5', text: '#c2410c' }; // Orange
            case 'LABOUR': return { bg: '#f3f4f6', text: '#374151' }; // Gray
            case 'PLUMBER': return { bg: '#cffafe', text: '#0e7490' }; // Cyan
            case 'ELECTRICIAN': return { bg: '#fef9c3', text: '#a16207' }; // Yellow
            default: return { bg: '#f3f4f6', text: '#374151' };
        }
    };

    const renderInventory = () => {
        const filtered = filteredInventory;

        const lowStock = dashboardData?.materials?.filter(m => Number(m.current_stock) <= Number(m.min_stock_level)) || [];

        return (
            <View>
                {/* Categories */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
                    {CATEGORIES.map(cat => (
                        <TouchableOpacity
                            key={cat}
                            style={[styles.categoryChip, selectedCategory === cat && styles.categoryChipSelected]}
                            onPress={() => setSelectedCategory(cat)}
                        >
                            <Text style={[styles.categoryChipText, selectedCategory === cat && styles.categoryChipTextSelected]}>{cat}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Low Stock Alerts */}
                {lowStock.length > 0 && selectedCategory === 'All' && !searchQuery && (
                    <View style={styles.alertSection}>
                        <Text style={styles.sectionTitle}>⚠️ Low Stock Alerts</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 20 }}>
                            {lowStock.map(m => (
                                <View key={m.id} style={styles.alertCard}>
                                    <View style={styles.alertHeader}>
                                        <AlertTriangle color="#ef4444" size={16} />
                                        <Text style={styles.alertStock}>{m.current_stock} {m.unit}</Text>
                                    </View>
                                    <Text style={styles.alertName} numberOfLines={1}>{m.name}</Text>
                                    <TouchableOpacity style={styles.alertBtn} onPress={() => Alert.alert('Order', `Order ${m.name}`)}>
                                        <Text style={styles.alertBtnText}>Restock</Text>
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* List */}
                <View style={styles.listSection}>
                    <Text style={styles.sectionTitle}>Inventory Items ({filtered.length})</Text>
                    {filtered.map(item => (
                        <View key={item.id} style={styles.card}>
                            <View style={styles.cardRow}>
                                <View style={[styles.iconBox, { backgroundColor: '#eef2ff' }]}>
                                    <Text style={styles.iconText}>{item.name.charAt(0)}</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.cardTitle}>{item.name}</Text>
                                    <Text style={styles.cardSubtitle}>{item.category || 'General'}</Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={[styles.stockValue, Number(item.current_stock) <= Number(item.min_stock_level) && { color: '#ef4444' }]}>
                                        {item.current_stock} {item.unit}
                                    </Text>
                                    <Text style={styles.unitPrice}>Rs. {item.unit_price || '-'}</Text>
                                </View>
                            </View>
                        </View>
                    ))}
                </View>
            </View>
        );
    };

    const renderSuppliers = () => {
        const filtered = (dashboardData.suppliers || []).filter(s =>
            s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.contact_person?.toLowerCase().includes(searchQuery.toLowerCase())
        );

        return (
            <View style={styles.listSection}>
                {filtered.map(s => (
                    <View key={s.id} style={styles.card}>
                        <View style={styles.cardRow}>
                            <View style={[styles.iconBox, { backgroundColor: '#f0fdf4' }]}>
                                <Truck size={20} color="#16a34a" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.cardTitle}>{s.name}</Text>
                                <Text style={styles.cardSubtitle}>{s.contact_person || 'No Contact Person'}</Text>
                                <Text style={styles.cardMeta}>{s.category || 'General Supplier'}</Text>
                            </View>
                        </View>

                        <View style={styles.actionRow}>
                            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#eef2ff' }]} onPress={() => handleCall(s.phone)}>
                                <Phone size={14} color="#4f46e5" />
                                <Text style={[styles.actionBtnText, { color: '#4f46e5' }]}>Call</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#f0fdf4' }]} onPress={() => handleEmail(s.email)}>
                                <Mail size={14} color="#16a34a" />
                                <Text style={[styles.actionBtnText, { color: '#16a34a' }]}>Email</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ))}
            </View>
        );
    };

    const renderContractors = () => {
        const filtered = (dashboardData.contractors || []).filter(c =>
            c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (c.role || '').toLowerCase().includes(searchQuery.toLowerCase())
        );

        return (
            <View style={styles.listSection}>
                {filtered.map(c => {
                    const roleStyle = getResourceRoleColor(c.role || 'LABOUR');
                    return (
                        <View key={c.id} style={styles.card}>
                            <View style={styles.cardRow}>
                                <View style={[styles.iconBox, { backgroundColor: roleStyle.bg }]}>
                                    <Text style={[styles.iconText, { color: roleStyle.text, fontSize: 16 }]}>
                                        {c.name.charAt(0)}
                                    </Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <Text style={styles.cardTitle}>{c.name}</Text>
                                        {c.is_active && <View style={styles.activeDot} />}
                                    </View>
                                    <View style={[styles.roleBadge, { backgroundColor: roleStyle.bg, alignSelf: 'flex-start', marginTop: 4, borderWidth: 1, borderColor: roleStyle.text }]}>
                                        <Text style={[styles.roleText, { color: roleStyle.text }]}>{c.role || 'Contractor'}</Text>
                                    </View>
                                </View>
                                <TouchableOpacity style={[styles.callBtn, { backgroundColor: '#eef2ff' }]} onPress={() => handleCall(c.phone)}>
                                    <Phone size={18} color="#4f46e5" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    );
                })}
            </View>
        );
    };


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
                    <Package color="rgba(255,255,255,0.1)" size={120} />
                </View>

                {/* Header Title Removed as per request */}

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <Search color="#9ca3af" size={20} />
                    <TextInput
                        placeholder="Search resources..."
                        placeholderTextColor="#9ca3af"
                        style={styles.searchInput}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>

                {/* Tabs */}
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
                                <Icon size={16} color={isActive ? '#059669' : 'rgba(255,255,255,0.7)'} />
                                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab.label}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </LinearGradient>

            <View style={styles.content}>
                {activeTab === 'inventory' && renderInventory()}
                {activeTab === 'suppliers' && renderSuppliers()}
                {activeTab === 'contractors' && renderContractors()}
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
        overflow: 'hidden', // Clip background icon
    },
    headerBgIcon: { position: 'absolute', bottom: -20, right: -20, opacity: 0.5 },
    headerTitle: { fontSize: 28, fontWeight: '800', color: 'white' },
    headerSubtitle: { fontSize: 13, color: '#e0e7ff', marginBottom: 16, marginTop: 2 },

    searchContainer: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: 'white',
        borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 16
    },
    searchInput: { flex: 1, marginLeft: 10, fontSize: 14, color: '#1f2937' },

    tabsContainer: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.2)', padding: 4, borderRadius: 12 },
    tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 10, gap: 6 },
    tabActive: { backgroundColor: 'white', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4 },
    tabText: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600' },
    tabTextActive: { color: '#059669' },

    content: { flex: 1, paddingTop: 20 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#374151', marginHorizontal: 20, marginBottom: 12 },

    // Inventory Styles
    categoryScroll: { paddingHorizontal: 20, paddingBottom: 16, gap: 8 },
    categoryChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: 'white', borderWidth: 1, borderColor: '#e5e7eb' },
    categoryChipSelected: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
    categoryChipText: { fontSize: 13, color: '#4b5563', fontWeight: '600' },
    categoryChipTextSelected: { color: 'white' },

    alertSection: { marginBottom: 20 },
    alertCard: { backgroundColor: 'white', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#fee2e2', width: 140 },
    alertHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
    alertStock: { fontSize: 12, fontWeight: 'bold', color: '#ef4444' },
    alertName: { fontSize: 13, fontWeight: 'bold', color: '#1f2937', marginBottom: 8 },
    alertBtn: { backgroundColor: '#ef4444', paddingVertical: 4, borderRadius: 6, alignItems: 'center' },
    alertBtnText: { color: 'white', fontSize: 10, fontWeight: 'bold' },

    listSection: { paddingHorizontal: 20, paddingBottom: 20 },
    card: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 5 },
    cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    iconText: { fontSize: 18, fontWeight: 'bold', color: '#4f46e5' },

    cardTitle: { fontSize: 15, fontWeight: 'bold', color: '#1f2937' },
    cardSubtitle: { fontSize: 12, color: '#6b7280' },
    cardMeta: { fontSize: 11, color: '#9ca3af', marginTop: 2 },

    stockValue: { fontSize: 14, fontWeight: 'bold', color: '#10b981' },
    unitPrice: { fontSize: 11, color: '#9ca3af' },

    actionRow: { flexDirection: 'row', gap: 12, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
    actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 8, gap: 6 },
    actionBtnText: { fontSize: 12, fontWeight: 'bold' },

    activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e' },
    roleBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    roleText: { fontSize: 10, fontWeight: 'bold' },
    callBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
