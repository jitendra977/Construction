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
import { User, Phone, Briefcase, Plus, Search } from 'lucide-react-native';
import { contractorService } from '../services/api';
import EmptyState from '../components/EmptyState';
import Skeleton from '../components/Skeleton';
import ActionSheet from '../components/ActionSheet';

const ROLE_LABELS = {
    THEKEDAAR: 'Thekedaar',
    ENGINEER: 'Civil Engineer',
    MISTRI: 'Mistri',
    LABOUR: 'Labour',
    ELECTRICIAN: 'Electrician',
    PLUMBER: 'Plumber',
    CARPENTER: 'Carpenter',
    PAINTER: 'Painter',
    TILE_MISTRI: 'Tile Mistri',
    WELDER: 'Welder',
    OTHER: 'Other',
};

const ContractorsScreen = ({ navigation }) => {
    const [contractors, setContractors] = useState([]);
    const [filteredContractors, setFilteredContractors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedContractor, setSelectedContractor] = useState(null);
    const [showDetails, setShowDetails] = useState(false);

    useEffect(() => {
        loadContractors();
    }, []);

    useEffect(() => {
        filterContractors();
    }, [searchQuery, contractors]);

    const loadContractors = async () => {
        try {
            const data = await contractorService.getContractors();
            setContractors(data);
            setFilteredContractors(data);
        } catch (error) {
            console.error('Error loading contractors:', error);
            Alert.alert('Error', 'Failed to load contractors');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const filterContractors = () => {
        if (!searchQuery.trim()) {
            setFilteredContractors(contractors);
            return;
        }

        const query = searchQuery.toLowerCase();
        const filtered = contractors.filter(
            (c) =>
                c.name.toLowerCase().includes(query) ||
                (ROLE_LABELS[c.role] && ROLE_LABELS[c.role].toLowerCase().includes(query)) ||
                (c.skills && c.skills.toLowerCase().includes(query))
        );
        setFilteredContractors(filtered);
    };

    const handleRefresh = () => {
        setRefreshing(true);
        loadContractors();
    };

    const handleCall = (phone) => {
        if (phone) {
            Linking.openURL(`tel:${phone}`);
        }
    };

    const formatCurrency = (val) => {
        if (!val && val !== 0) return 'N/A';
        return `Rs. ${parseFloat(val).toLocaleString('en-NP')}`;
    };

    const renderContractorCard = ({ item }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => {
                setSelectedContractor(item);
                setShowDetails(true);
            }}
            activeOpacity={0.7}
        >
            <View style={styles.cardHeader}>
                <View style={styles.iconContainer}>
                    <User color="#6366f1" size={24} />
                </View>
                <View style={styles.cardHeaderText}>
                    <Text style={styles.contractorName}>{item.name}</Text>
                    <Text style={styles.role}>{ROLE_LABELS[item.role] || item.role}</Text>
                </View>
                {!item.is_active && (
                    <View style={styles.inactiveBadge}>
                        <Text style={styles.inactiveText}>Inactive</Text>
                    </View>
                )}
            </View>

            {item.phone && (
                <View style={styles.infoRow}>
                    <Phone color="#6b7280" size={16} />
                    <Text style={styles.contactText}>{item.phone}</Text>
                </View>
            )}

            {item.rate && (
                <View style={styles.infoRow}>
                    <Briefcase color="#6b7280" size={16} />
                    <Text style={styles.contactText}>Daily Rate: {formatCurrency(item.rate)}</Text>
                </View>
            )}

            {item.skills && (
                <View style={styles.skillsContainer}>
                    {item.skills.split(',').slice(0, 3).map((skill, index) => (
                        <View key={index} style={styles.skillBadge}>
                            <Text style={styles.skillText}>{skill.trim()}</Text>
                        </View>
                    ))}
                </View>
            )}
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Contractors</Text>
                </View>
                <Skeleton count={5} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Contractors</Text>
                <TouchableOpacity style={styles.addButton} onPress={() => Alert.alert('Coming Soon', 'Add Contractor feature')}>
                    <Plus color="white" size={24} />
                </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
                <Search color="#9ca3af" size={20} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search contractors..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholderTextColor="#9ca3af"
                />
            </View>

            {filteredContractors.length === 0 ? (
                <EmptyState
                    icon="👷"
                    title="No Contractors Found"
                    message={searchQuery ? 'Try adjusting your search' : 'Add contractors to get started'}
                />
            ) : (
                <FlatList
                    data={filteredContractors}
                    renderItem={renderContractorCard}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
                />
            )}

            <ActionSheet visible={showDetails} onClose={() => setShowDetails(false)} title="Contractor Details">
                {selectedContractor && (
                    <View style={styles.detailsContainer}>
                        <Text style={styles.detailName}>{selectedContractor.name}</Text>
                        <Text style={styles.detailRole}>{ROLE_LABELS[selectedContractor.role] || selectedContractor.role}</Text>

                        {selectedContractor.phone && (
                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => handleCall(selectedContractor.phone)}
                            >
                                <Phone color="#6366f1" size={20} />
                                <Text style={styles.actionButtonText}>{selectedContractor.phone}</Text>
                            </TouchableOpacity>
                        )}

                        {selectedContractor.rate && (
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Daily Rate:</Text>
                                <Text style={styles.detailValue}>{formatCurrency(selectedContractor.rate)}</Text>
                            </View>
                        )}

                        {selectedContractor.citizenship_number && (
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Citizenship:</Text>
                                <Text style={styles.detailValue}>{selectedContractor.citizenship_number}</Text>
                            </View>
                        )}

                        {selectedContractor.address && (
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Address:</Text>
                                <Text style={styles.detailValue}>{selectedContractor.address}</Text>
                            </View>
                        )}

                        {selectedContractor.skills && (
                            <View style={styles.skillsSection}>
                                <Text style={styles.detailLabel}>Skills:</Text>
                                <View style={styles.skillsList}>
                                    {selectedContractor.skills.split(',').map((skill, index) => (
                                        <View key={index} style={styles.skillBadgeLarge}>
                                            <Text style={styles.skillTextLarge}>{skill.trim()}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}

                        {selectedContractor.bank_details && (
                            <View style={styles.bankDetails}>
                                <Text style={styles.detailLabel}>Bank Details:</Text>
                                <Text style={styles.detailValue}>{selectedContractor.bank_details}</Text>
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
    contractorName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 2,
    },
    role: {
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
    contactText: {
        fontSize: 13,
        color: '#6b7280',
        marginLeft: 8,
    },
    skillsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 8,
        gap: 6,
    },
    skillBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        backgroundColor: '#fef3c7',
        borderRadius: 12,
    },
    skillText: {
        fontSize: 11,
        color: '#92400e',
        fontWeight: '500',
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
    detailRole: {
        fontSize: 15,
        color: '#6366f1',
        marginBottom: 20,
        fontWeight: '500',
    },
    detailRow: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    detailLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6b7280',
        marginRight: 8,
        minWidth: 100,
    },
    detailValue: {
        fontSize: 14,
        color: '#1f2937',
        flex: 1,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: '#eef2ff',
        borderRadius: 12,
        marginBottom: 16,
    },
    actionButtonText: {
        fontSize: 15,
        color: '#6366f1',
        fontWeight: '500',
        marginLeft: 12,
    },
    skillsSection: {
        marginTop: 8,
        marginBottom: 16,
    },
    skillsList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 8,
        gap: 8,
    },
    skillBadgeLarge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#fef3c7',
        borderRadius: 12,
    },
    skillTextLarge: {
        fontSize: 13,
        color: '#92400e',
        fontWeight: '500',
    },
    bankDetails: {
        backgroundColor: '#f9fafb',
        padding: 12,
        borderRadius: 8,
        marginTop: 8,
    },
});

export default ContractorsScreen;
