import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { X, Truck, Mail } from 'lucide-react-native';

export default function OrderModal({ visible, onClose, material, suppliers, onSend }) {
    const [quantity, setQuantity] = useState('');
    const [selectedSupplierId, setSelectedSupplierId] = useState(null);
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (material) {
            setQuantity(material.min_stock_level ? String(material.min_stock_level) : '10');
            setSubject(`Purchase Order: ${material.name} - Dream Home Construction`);
            setBody(`Please confirm availability and provide a quote for ${material.name}. We need this for our ongoing construction project.`);
            if (material.supplier) {
                setSelectedSupplierId(material.supplier);
            } else {
                setSelectedSupplierId(null);
            }
        }
    }, [material]);

    const handleSend = async () => {
        if (!selectedSupplierId) {
            Alert.alert('Error', 'Please select a supplier.');
            return;
        }
        if (!quantity) {
            Alert.alert('Error', 'Please enter a quantity.');
            return;
        }

        setLoading(true);
        try {
            await onSend(material.id, quantity, selectedSupplierId, subject, body);
            onClose();
        } catch (error) {
            // Error handling is done in parent
        } finally {
            setLoading(false);
        }
    };

    const validSuppliers = suppliers?.filter(s => s.email) || [];

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.modalOverlay}
            >
                <View style={styles.modalContent}>
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.title}>Order Material</Text>
                            <Text style={styles.subtitle}>{material?.name}</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <X color="#6b7280" size={24} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.body}>
                        {/* Supplier Selection */}
                        <Text style={styles.label}>Select Supplier</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.supplierScroll}>
                            {validSuppliers.map(supplier => (
                                <TouchableOpacity
                                    key={supplier.id}
                                    style={[
                                        styles.supplierChip,
                                        selectedSupplierId === supplier.id && styles.supplierChipSelected
                                    ]}
                                    onPress={() => setSelectedSupplierId(supplier.id)}
                                >
                                    <Text style={[
                                        styles.supplierText,
                                        selectedSupplierId === supplier.id && styles.supplierTextSelected
                                    ]}>{supplier.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        {validSuppliers.length === 0 && (
                            <Text style={styles.errorText}>No suppliers with email addresses found.</Text>
                        )}

                        {/* Quantity */}
                        <Text style={styles.label}>Quantity to Order ({material?.unit})</Text>
                        <TextInput
                            style={styles.input}
                            value={quantity}
                            onChangeText={setQuantity}
                            keyboardType="numeric"
                            placeholder="Enter quantity"
                        />

                        {/* Email Details */}
                        <Text style={styles.sectionHeader}>Email Composition</Text>

                        <Text style={styles.label}>Subject</Text>
                        <TextInput
                            style={styles.input}
                            value={subject}
                            onChangeText={setSubject}
                            placeholder="Email subject"
                        />

                        <Text style={styles.label}>Message Body</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={body}
                            onChangeText={setBody}
                            placeholder="Message to supplier..."
                            multiline={true}
                            numberOfLines={4}
                            textAlignVertical="top"
                        />
                    </ScrollView>

                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={[styles.sendButton, loading && styles.disabledButton]}
                            onPress={handleSend}
                            disabled={loading}
                        >
                            <Mail color="white" size={20} style={{ marginRight: 8 }} />
                            <Text style={styles.sendButtonText}>{loading ? 'Sending...' : 'Send Order'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        height: '85%',
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
    },
    subtitle: {
        fontSize: 14,
        color: '#6b7280',
        marginTop: 2,
    },
    closeButton: {
        padding: 5,
    },
    body: {
        flex: 1,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
        marginTop: 10,
    },
    input: {
        backgroundColor: '#f9fafb',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 10,
        padding: 12,
        fontSize: 15,
        color: '#111827',
    },
    textArea: {
        height: 100,
        marginBottom: 20,
    },
    sectionHeader: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#9ca3af',
        textTransform: 'uppercase',
        marginTop: 20,
        marginBottom: 5,
        letterSpacing: 1,
    },
    supplierScroll: {
        flexDirection: 'row',
        marginBottom: 10,
    },
    supplierChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#f3f4f6',
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    supplierChipSelected: {
        backgroundColor: '#e0e7ff',
        borderColor: '#6366f1',
    },
    supplierText: {
        fontSize: 14,
        color: '#4b5563',
    },
    supplierTextSelected: {
        color: '#4338ca',
        fontWeight: '600',
    },
    footer: {
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
    },
    sendButton: {
        backgroundColor: '#10b981',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
    },
    disabledButton: {
        opacity: 0.7,
    },
    sendButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    errorText: {
        color: '#ef4444',
        fontSize: 12,
        fontStyle: 'italic',
    }
});
