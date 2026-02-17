import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    Alert,
} from 'react-native';
import { FileCheck, Clock, CheckCircle, XCircle, ChevronRight } from 'lucide-react-native';
import { permitService } from '../services/api';
import EmptyState from '../components/EmptyState';
import Skeleton from '../components/Skeleton';
import StatusBadge from '../components/StatusBadge';

const PermitsScreen = ({ navigation }) => {
    const [permits, setPermits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState('ALL');

    useEffect(() => {
        loadPermits();
    }, []);

    const loadPermits = async () => {
        try {
            const data = await permitService.getPermits();
            setPermits(data);
        } catch (error) {
            console.error('Error loading permits:', error);
            Alert.alert('Error', 'Failed to load permits');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        loadPermits();
    };

    const getFilteredPermits = () => {
        if (filter === 'ALL') return permits;
        return permits.filter((p) => p.status === filter);
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'APPROVED':
                return <CheckCircle color="#10b981" size={24} />;
            case 'REJECTED':
                return <XCircle color="#ef4444" size={24} />;
            case 'IN_PROGRESS':
                return <Clock color="#6366f1" size={24} />;
            default:
                return <FileCheck color="#9ca3af" size={24} />;
        }
    };

    const getProgressStats = () => {
        const total = permits.length;
        const approved = permits.filter((p) => p.status === 'APPROVED').length;
        const pending = permits.filter((p) => p.status === 'PENDING').length;
        const inProgress = permits.filter((p) => p.status === 'IN_PROGRESS').length;
        const rejected = permits.filter((p) => p.status === 'REJECTED').length;

        return { total, approved, pending, inProgress, rejected };
    };

    const renderFilterButton = (label, value) => {
        const isActive = filter === value;
        return (
            <TouchableOpacity
                style={[styles.filterButton, isActive && styles.filterButtonActive]}
                onPress={() => setFilter(value)}
            >
                <Text style={[styles.filterButtonText, isActive && styles.filterButtonTextActive]}>{label}</Text>
            </TouchableOpacity>
        );
    };

    const renderPermitCard = ({ item }) => (
        <TouchableOpacity style={styles.card} activeOpacity={0.7}>
            <View style={styles.cardHeader}>
                <View style={styles.iconContainer}>{getStatusIcon(item.status)}</View>
                <View style={styles.cardHeaderText}>
                    <Text style={styles.permitTitle}>{item.title}</Text>
                    {item.date_issued && (
                        <Text style={styles.issueDate}>
                            Issued: {new Date(item.date_issued).toLocaleDateString('en-NP')}
                        </Text>
                    )}
                </View>
                <StatusBadge status={item.status} type="permit" />
            </View>

            {item.description && (
                <Text style={styles.description} numberOfLines={2}>
                    {item.description}
                </Text>
            )}

            {item.notes && (
                <View style={styles.notesContainer}>
                    <Text style={styles.notesLabel}>Notes:</Text>
                    <Text style={styles.notes} numberOfLines={2}>
                        {item.notes}
                    </Text>
                </View>
            )}

            <View style={styles.cardFooter}>
                <Text style={styles.stepNumber}>Step {item.order}</Text>
                <ChevronRight color="#9ca3af" size={20} />
            </View>
        </TouchableOpacity>
    );

    const stats = getProgressStats();
    const filteredPermits = getFilteredPermits();

    if (loading) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Permits</Text>
                </View>
                <Skeleton count={4} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Municipal Permits</Text>
            </View>

            {/* Progress Summary */}
            <View style={styles.statsContainer}>
                <View style={styles.statCard}>
                    <Text style={styles.statValue}>{stats.approved}</Text>
                    <Text style={styles.statLabel}>Approved</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={[styles.statValue, { color: '#6366f1' }]}>{stats.inProgress}</Text>
                    <Text style={styles.statLabel}>In Progress</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={[styles.statValue, { color: '#f59e0b' }]}>{stats.pending}</Text>
                    <Text style={styles.statLabel}>Pending</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={[styles.statValue, { color: '#ef4444' }]}>{stats.rejected}</Text>
                    <Text style={styles.statLabel}>Rejected</Text>
                </View>
            </View>

            {/* Filters */}
            <View style={styles.filterContainer}>
                {renderFilterButton('All', 'ALL')}
                {renderFilterButton('Approved', 'APPROVED')}
                {renderFilterButton('In Progress', 'IN_PROGRESS')}
                {renderFilterButton('Pending', 'PENDING')}
            </View>

            {/* Permit List */}
            {filteredPermits.length === 0 ? (
                <EmptyState
                    icon="📋"
                    title="No Permits Found"
                    message={filter === 'ALL' ? 'No permit steps available' : `No ${filter.toLowerCase()} permits`}
                />
            ) : (
                <FlatList
                    data={filteredPermits}
                    renderItem={renderPermitCard}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    header: {
        padding: 16,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1f2937',
    },
    statsContainer: {
        flexDirection: 'row',
        padding: 16,
        backgroundColor: 'white',
        gap: 12,
    },
    statCard: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 12,
        backgroundColor: '#f9fafb',
        borderRadius: 12,
    },
    statValue: {
        fontSize: 24,
        fontWeight: '700',
        color: '#10b981',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 11,
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
        alignItems: 'center',
        marginBottom: 12,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#f9fafb',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    cardHeaderText: {
        flex: 1,
    },
    permitTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 2,
    },
    issueDate: {
        fontSize: 12,
        color: '#6b7280',
    },
    description: {
        fontSize: 14,
        color: '#6b7280',
        lineHeight: 20,
        marginBottom: 12,
    },
    notesContainer: {
        backgroundColor: '#fef3c7',
        padding: 10,
        borderRadius: 8,
        marginBottom: 12,
    },
    notesLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#92400e',
        marginBottom: 4,
    },
    notes: {
        fontSize: 13,
        color: '#78350f',
        lineHeight: 18,
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
    },
    stepNumber: {
        fontSize: 13,
        fontWeight: '500',
        color: '#6b7280',
    },
});

export default PermitsScreen;
