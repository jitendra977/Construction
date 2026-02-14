import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { ChevronRight, FileText, CheckSquare, Square, Clock, Edit, Trash2 } from 'lucide-react-native';
import { dashboardService } from '../services/api';

export default function PhaseDetailScreen({ route, navigation }) {
    const { phase } = route.params;

    React.useEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <View style={{ flexDirection: 'row' }}>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('PhaseForm', { phase })}
                        style={{ marginRight: 15 }}
                    >
                        <Edit color="#4338ca" size={20} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleDelete}>
                        <Trash2 color="#ef4444" size={20} />
                    </TouchableOpacity>
                </View>
            ),
        });
    }, [phase]);

    const handleDelete = () => {
        Alert.alert(
            'Delete Phase',
            `Are you sure you want to delete "${phase.name}"? This action cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await dashboardService.deletePhase(phase.id);
                            Alert.alert('Success', 'Phase deleted successfully');
                            navigation.goBack();
                        } catch (error) {
                            console.error('Failed to delete phase', error);
                            Alert.alert('Error', 'Failed to delete phase');
                        }
                    }
                },
            ]
        );
    };

    const renderTask = ({ item }) => (
        <TouchableOpacity
            style={styles.taskCard}
            onPress={() => navigation.navigate('TaskDetail', { task: item })}
        >
            <View style={styles.taskHeader}>
                {item.status === 'COMPLETED' ? (
                    <CheckSquare color="#10b981" size={20} />
                ) : (
                    <Square color="#d1d5db" size={20} />
                )}
                <View style={styles.taskInfo}>
                    <Text style={styles.taskName}>{item.name}</Text>
                    <Text style={styles.taskStatus}>{item.status}</Text>
                </View>
                <ChevronRight color="#d1d5db" size={16} />
            </View>
        </TouchableOpacity>
    );

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.phaseName}>{phase.name}</Text>
                <View style={[styles.statusBadge, { backgroundColor: phase.status === 'COMPLETED' ? '#d1fae5' : '#fef3c7' }]}>
                    <Text style={styles.statusText}>{phase.status}</Text>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Documents & Blueprints</Text>
                <View style={styles.documentRow}>
                    <TouchableOpacity style={styles.docCard}>
                        <FileText color="#4338ca" size={24} />
                        <Text style={styles.docLabel}>Naksa</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.docCard}>
                        <FileText color="#4338ca" size={24} />
                        <Text style={styles.docLabel}>Structure</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Phase Tasks</Text>
                {phase.tasks?.length > 0 ? (
                    phase.tasks.map(task => (
                        <View key={task.id}>
                            {renderTask({ item: task })}
                        </View>
                    ))
                ) : (
                    <View style={styles.emptyTasks}>
                        <Clock color="#9ca3af" size={32} />
                        <Text style={styles.emptyText}>No tasks assigned to this phase.</Text>
                    </View>
                )}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    header: { padding: 25, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
    phaseName: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
    statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginTop: 10 },
    statusText: { fontSize: 12, fontWeight: 'bold' },
    section: { padding: 20 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 15 },
    documentRow: { flexDirection: 'row', justifyContent: 'space-between' },
    docCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 15,
        width: '48%',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    docLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginTop: 8 },
    taskCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 15,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    taskHeader: { flexDirection: 'row', alignItems: 'center' },
    taskInfo: { flex: 1, marginLeft: 12 },
    taskName: { fontSize: 15, fontWeight: '600', color: '#111827' },
    taskStatus: { fontSize: 12, color: '#6b7280', marginTop: 2 },
    emptyTasks: { alignItems: 'center', padding: 40 },
    emptyText: { color: '#9ca3af', marginTop: 10, fontSize: 14 },
});
