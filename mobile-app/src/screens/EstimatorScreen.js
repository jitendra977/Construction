import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    Alert,
    ScrollView,
} from 'react-native';
import { Calculator, TrendingUp, Edit2 } from 'lucide-react-native';
import { estimatorService } from '../services/api';
import EmptyState from '../components/EmptyState';
import Skeleton from '../components/Skeleton';

const EstimatorScreen = ({ navigation }) => {
    const [rates, setRates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [categoryFilter, setCategoryFilter] = useState('ALL');

    useEffect(() => {
        loadRates();
    }, []);

    const loadRates = async () => {
        try {
            const data = await estimatorService.getConstructionRates();
            setRates(data);
        } catch (error) {
            console.error('Error loading rates:', error);
            Alert.alert('Error', 'Failed to load construction rates');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        loadRates();
    };

    const getFilteredRates = () => {
        if (categoryFilter === 'ALL') return rates;
        return rates.filter((r) => r.category === categoryFilter);
    };

    const formatCurrency = (val) => {
        if (!val && val !== 0) return 'N/A';
        return `Rs. ${parseFloat(val).toLocaleString('en-NP', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const renderFilterButton = (label, value) => {
        const isActive = categoryFilter === value;
        return (
            <TouchableOpacity
                style={[styles.filterButton, isActive && styles.filterButtonActive]}
                onPress={() => setCategoryFilter(value)}
            >
                <Text style={[styles.filterButtonText, isActive && styles.filterButtonTextActive]}>{label}</Text>
            </TouchableOpacity>
        );
    };

    const renderRateCard = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                    <Text style={styles.rateLabel}>{item.label}</Text>
                    <Text style={styles.rateCategory}>{item.category}</Text>
                </View>
                <TouchableOpacity style={styles.editButton} onPress={() => Alert.alert('Coming Soon', 'Edit rate feature')}>
                    <Edit2 color="#6366f1" size={18} />
                </TouchableOpacity>
            </View>
            <View style={styles.priceRow}>
                <Text style={styles.priceValue}>{formatCurrency(item.value)}</Text>
                <Text style={styles.priceUnit}>per {item.unit}</Text>
            </View>
            {item.updated_at && (
                <Text style={styles.updatedText}>
                    Updated: {new Date(item.updated_at).toLocaleDateString('en-NP')}
                </Text>
            )}
        </View>
    );

    const getCategoryCounts = () => {
        const material = rates.filter((r) => r.category === 'MATERIAL').length;
        const labor = rates.filter((r) => r.category === 'LABOR').length;
        const other = rates.filter((r) => r.category === 'OTHER').length;
        return { material, labor, other };
    };

    const filteredRates = getFilteredRates();
    const counts = getCategoryCounts();

    if (loading) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Estimator</Text>
                </View>
                <Skeleton count={5} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Calculator color="#6366f1" size={28} />
                <Text style={styles.headerTitle}>Construction Rates</Text>
            </View>

            {/* Stats Summary */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll}>
                <View style={styles.statsContainer}>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{rates.length}</Text>
                        <Text style={styles.statLabel}>Total Rates</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: '#dbeafe' }]}>
                        <Text style={[styles.statValue, { color: '#1e40af' }]}>{counts.material}</Text>
                        <Text style={styles.statLabel}>Materials</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: '#fef3c7' }]}>
                        <Text style={[styles.statValue, { color: '#92400e' }]}>{counts.labor}</Text>
                        <Text style={styles.statLabel}>Labor</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: '#f3e8ff' }]}>
                        <Text style={[styles.statValue, { color: '#6b21a8' }]}>{counts.other}</Text>
                        <Text style={styles.statLabel}>Other</Text>
                    </View>
                </View>
            </ScrollView>

            {/* Filters */}
            <View style={styles.filterContainer}>
                {renderFilterButton('All', 'ALL')}
                {renderFilterButton('Materials', 'MATERIAL')}
                {renderFilterButton('Labor', 'LABOR')}
                {renderFilterButton('Other', 'OTHER')}
            </View>

            {/* Rates List */}
            {filteredRates.length === 0 ? (
                <EmptyState
                    icon="📊"
                    title="No Rates Found"
                    message={categoryFilter === 'ALL' ? 'No construction rates available' : `No ${categoryFilter.toLowerCase()} rates`}
                />
            ) : (
                <FlatList
                    data={filteredRates}
                    renderItem={renderRateCard}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
                />
            )}

            {/* Quick Calculator Note */}
            <View style={styles.calculatorNote}>
                <TrendingUp color="#6366f1" size={20} />
                <Text style={styles.calculatorNoteText}>Use these rates to estimate project costs</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        gap: 12,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1f2937',
    },
    statsScroll: {
        backgroundColor: 'white',
    },
    statsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 12,
    },
    statCard: {
        minWidth: 120,
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
        backgroundColor: '#f0fdf4',
        borderRadius: 12,
    },
    statValue: {
        fontSize: 28,
        fontWeight: '700',
        color: '#10b981',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: '#6b7280',
        fontWeight: '500',
    },
    filterContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 8,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    filterButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#f3f4f6',
    },
    filterButtonActive: {
        backgroundColor: '#6366f1',
    },
    filterButtonText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#6b7280',
    },
    filterButtonTextActive: {
        color: 'white',
    },
    listContent: {
        padding: 16,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    cardHeaderLeft: {
        flex: 1,
    },
    rateLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 4,
    },
    rateCategory: {
        fontSize: 12,
        color: '#6b7280',
        textTransform: 'capitalize',
    },
    editButton: {
        padding: 4,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: 8,
    },
    priceValue: {
        fontSize: 24,
        fontWeight: '700',
        color: '#6366f1',
        marginRight: 8,
    },
    priceUnit: {
        fontSize: 14,
        color: '#6b7280',
    },
    updatedText: {
        fontSize: 11,
        color: '#9ca3af',
    },
    calculatorNote: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        backgroundColor: '#eef2ff',
        gap: 8,
    },
    calculatorNoteText: {
        fontSize: 13,
        color: '#6366f1',
        fontWeight: '500',
    },
});

export default EstimatorScreen;
