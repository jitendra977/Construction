import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    TextInput,
    Alert,
    Linking,
} from 'react-native';
import { Phone, Mail, MapPin, Package, Plus, Search } from 'lucide-react-native';
import { supplierService } from '../services/api';
import EmptyState from '../components/EmptyState';
import Skeleton from '../components/Skeleton';
import ActionSheet from '../components/ActionSheet';

const SuppliersScreen = ({ navigation }) => {
    const [suppliers, setSuppliers] = useState([]);
    const [filteredSuppliers, setFilteredSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSupplier, setSelectedSupplier] = useState(null);
    const [showDetails, setShowDetails] = useState(false);

    useEffect(() => {
        loadSuppliers();
    }, []);

    useEffect(() => {
        filterSuppliers();
    }, [searchQuery, suppliers]);

    const loadSuppliers = async () => {
        try {
            const data = await supplierService.getSuppliers();
            setSuppliers(data);
            setFilteredSuppliers(data);
        } catch (error) {
            console.error('Error loading suppliers:', error);
            Alert.alert('Error', 'Failed to load suppliers');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const filterSuppliers = () => {
        if (!searchQuery.trim()) {
            setFilteredSuppliers(suppliers);
            return;
        }

        const query = searchQuery.toLowerCase();
        const filtered = suppliers.filter(
            (s) =>
                s.name.toLowerCase().includes(query) ||
                s.category.toLowerCase().includes(query) ||
                (s.contact_person && s.contact_person.toLowerCase().includes(query))
        );
        setFilteredSuppliers(filtered);
    };

    const handleRefresh = () => {
        setRefreshing(true);
        loadSuppliers();
    };

    const handleCall = (phone) => {
        if (phone) {
            Linking.openURL(`tel:${phone}`);
        }
    };

    const handleEmail = (email) => {
        if (email) {
            Linking.openURL(`mailto:${email}`);
        }
    };

    const renderSupplierCard = ({ item }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => {
                setSelectedSupplier(item);
                setShowDetails(true);
            }}
            activeOpacity={0.7}
        >
            <View style={styles.cardHeader}>
                <View style={styles.iconContainer}>
                    <Package color="#6366f1" size={24} />
                </View>
                <View style={styles.cardHeaderText}>
                    <Text style={styles.supplierName}>{item.name}</Text>
                    <Text style={styles.category}>{item.category}</Text>
                </View>
                {!item.is_active && (
                    <View style={styles.inactiveBadge}>
                        <Text style={styles.inactiveText}>Inactive</Text>
                    </View>
                )}
            </View>

            {item.contact_person && (
                <View style={styles.infoRow}>
                    <Text style={styles.label}>Contact:</Text>
                    <Text style={styles.value}>{item.contact_person}</Text>
                </View>
            )}

            {item.phone && (
                <View style={styles.infoRow}>
                    <Phone color="#6b7280" size={16} />
                    <Text style={styles.contactText}>{item.phone}</Text>
                </View>
            )}

            {item.address && (
                <View style={styles.infoRow}>
                    <MapPin color="#6b7280" size={16} />
                    <Text style={styles.contactText} numberOfLines={1}>
                        {item.address}
                    </Text>
                </View>
            )}
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Suppliers</Text>
                </View>
                <Skeleton count={5} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Suppliers</Text>
                <TouchableOpacity style={styles.addButton} onPress={() => Alert.alert('Coming Soon', 'Add Supplier feature')}>
                    <Plus color="white" size={24} />
                </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
                <Search color="#9ca3af" size={20} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search suppliers..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholderTextColor="#9ca3af"
                />
            </View>

            {filteredSuppliers.length === 0 ? (
                <EmptyState
                    icon="🏪"
                    title="No Suppliers Found"
                    message={searchQuery ? 'Try adjusting your search' : 'Add suppliers to get started'}
                />
            ) : (
                <FlatList
                    data={filteredSuppliers}
                    renderItem={renderSupplierCard}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
                />
            )}

            <ActionSheet visible={showDetails} onClose={() => setShowDetails(false)} title="Supplier Details">
                {selectedSupplier && (
                    <View style={styles.detailsContainer}>
                        <Text style={styles.detailName}>{selectedSupplier.name}</Text>
                        <Text style={styles.detailCategory}>{selectedSupplier.category}</Text>

                        {selectedSupplier.contact_person && (
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Contact Person:</Text>
                                <Text style={styles.detailValue}>{selectedSupplier.contact_person}</Text>
                            </View>
                        )}

                        {selectedSupplier.phone && (
                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => handleCall(selectedSupplier.phone)}
                            >
                                <Phone color="#6366f1" size={20} />
                                <Text style={styles.actionButtonText}>{selectedSupplier.phone}</Text>
                            </TouchableOpacity>
                        )}

                        {selectedSupplier.email && (
                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => handleEmail(selectedSupplier.email)}
                            >
                                <Mail color="#6366f1" size={20} />
                                <Text style={styles.actionButtonText}>{selectedSupplier.email}</Text>
                            </TouchableOpacity>
                        )}

                        {selectedSupplier.address && (
                            <View style={styles.detailRow}>
                                <MapPin color="#6b7280" size={18} />
                                <Text style={[styles.detailValue, { flex: 1, marginLeft: 8 }]}>
                                    {selectedSupplier.address}
                                </Text>
                            </View>
                        )}

                        {selectedSupplier.pan_number && (
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>PAN:</Text>
                                <Text style={styles.detailValue}>{selectedSupplier.pan_number}</Text>
                            </View>
                        )}

                        {selectedSupplier.bank_name && (
                            <View style={styles.bankDetails}>
                                <Text style={styles.detailLabel}>Bank Details:</Text>
                                <Text style={styles.detailValue}>{selectedSupplier.bank_name}</Text>
                                {selectedSupplier.account_number && (
                                    <Text style={styles.detailValue}>A/C: {selectedSupplier.account_number}</Text>
                                )}
                                {selectedSupplier.branch && (
                                    <Text style={styles.detailValue}>Branch: {selectedSupplier.branch}</Text>
                                )}
                            </View>
                        )}
                    </View>
                )}
            </ActionSheet>
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
        justifyContent: 'space-between',
        alignItems: 'center',
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
    addButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#6366f1',
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        marginHorizontal: 16,
        marginTop: 16,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    searchInput: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 12,
        fontSize: 16,
        color: '#1f2937',
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
        backgroundColor: '#eef2ff',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    cardHeaderText: {
        flex: 1,
    },
    supplierName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 2,
    },
    category: {
        fontSize: 13,
        color: '#6b7280',
    },
    inactiveBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        backgroundColor: '#fee2e2',
        borderRadius: 8,
    },
    inactiveText: {
        fontSize: 11,
        color: '#991b1b',
        fontWeight: '600',
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    label: {
        fontSize: 13,
        fontWeight: '500',
        color: '#6b7280',
        marginRight: 6,
    },
    value: {
        fontSize: 13,
        color: '#1f2937',
    },
    contactText: {
        fontSize: 13,
        color: '#6b7280',
        marginLeft: 8,
        flex: 1,
    },
    detailsContainer: {
        flex: 1,
    },
    detailName: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1f2937',
        marginBottom: 4,
    },
    detailCategory: {
        fontSize: 15,
        color: '#6366f1',
        marginBottom: 20,
        fontWeight: '500',
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    detailLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6b7280',
        marginRight: 8,
    },
    detailValue: {
        fontSize: 14,
        color: '#1f2937',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: '#eef2ff',
        borderRadius: 12,
        marginBottom: 12,
    },
    actionButtonText: {
        fontSize: 15,
        color: '#6366f1',
        fontWeight: '500',
        marginLeft: 12,
    },
    bankDetails: {
        backgroundColor: '#f9fafb',
        padding: 12,
        borderRadius: 8,
        marginTop: 8,
    },
});

export default SuppliersScreen;
