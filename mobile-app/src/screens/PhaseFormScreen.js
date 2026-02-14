import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { dashboardService } from '../services/api';
import { Save, X } from 'lucide-react-native';

export default function PhaseFormScreen({ route, navigation }) {
    const { phase, projectId } = route.params || {};
    const isEditing = !!phase;

    const [name, setName] = useState(phase?.name || '');
    const [startDate, setStartDate] = useState(phase?.start_date || '');
    const [endDate, setEndDate] = useState(phase?.end_date || '');
    const [status, setStatus] = useState(phase?.status || 'PLANNED');
    const [description, setDescription] = useState(phase?.description || '');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        navigation.setOptions({
            title: isEditing ? 'Edit Phase' : 'Add Phase',
        });
    }, [isEditing]);

    const handleSave = async () => {
        if (!name || !startDate || !endDate) {
            Alert.alert('Error', 'Please fill in all required fields (Name, Start & End Date)');
            return;
        }

        const data = {
            project: projectId || phase?.project,
            name,
            start_date: startDate,
            end_date: endDate,
            status,
            description,
        };

        try {
            setLoading(true);
            if (isEditing) {
                await dashboardService.updatePhase(phase.id, data);
            } else {
                await dashboardService.createPhase(data);
            }
            Alert.alert('Success', `Phase ${isEditing ? 'updated' : 'created'} successfully!`);
            navigation.goBack();
        } catch (error) {
            console.error('Failed to save phase', error);
            Alert.alert('Error', 'Failed to save phase. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.formCard}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Phase Name *</Text>
                        <TextInput
                            style={styles.input}
                            value={name}
                            onChangeText={setName}
                            placeholder="e.g., Foundations"
                        />
                    </View>

                    <View style={styles.row}>
                        <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                            <Text style={styles.label}>Start Date *</Text>
                            <TextInput
                                style={styles.input}
                                value={startDate}
                                onChangeText={setStartDate}
                                placeholder="YYYY-MM-DD"
                            />
                        </View>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={styles.label}>End Date *</Text>
                            <TextInput
                                style={styles.input}
                                value={endDate}
                                onChangeText={setEndDate}
                                placeholder="YYYY-MM-DD"
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Status</Text>
                        <View style={styles.statusRow}>
                            {['PLANNED', 'IN_PROGRESS', 'COMPLETED'].map((s) => (
                                <TouchableOpacity
                                    key={s}
                                    style={[styles.statusToggle, status === s && styles.statusActive]}
                                    onPress={() => setStatus(s)}
                                >
                                    <Text style={[styles.statusText, status === s && styles.statusTextActive]}>
                                        {s.replace('_', ' ')}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Description</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={description}
                            onChangeText={setDescription}
                            placeholder="Optional phase details..."
                            multiline
                            numberOfLines={4}
                        />
                    </View>

                    <TouchableOpacity
                        style={styles.saveButton}
                        onPress={handleSave}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <>
                                <Save color="white" size={20} />
                                <Text style={styles.saveButtonText}>Save Phase</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => navigation.goBack()}
                        disabled={loading}
                    >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    scrollContent: { padding: 20 },
    formCard: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 15,
        elevation: 5,
    },
    inputGroup: { marginBottom: 20 },
    row: { flexDirection: 'row' },
    label: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 8 },
    input: {
        backgroundColor: '#f3f4f6',
        borderRadius: 12,
        padding: 15,
        fontSize: 15,
        color: '#111827',
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    textArea: { height: 100, textAlignVertical: 'top' },
    statusRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 5 },
    statusToggle: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#f3f4f6',
        marginRight: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    statusActive: { backgroundColor: '#4338ca', borderColor: '#4338ca' },
    statusText: { fontSize: 12, color: '#6b7280', fontWeight: '600' },
    statusTextActive: { color: 'white' },
    saveButton: {
        backgroundColor: '#4338ca',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        marginTop: 10,
    },
    saveButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
    cancelButton: {
        padding: 15,
        alignItems: 'center',
        marginTop: 10,
    },
    cancelButtonText: { color: '#6b7280', fontSize: 15, fontWeight: '600' },
});
