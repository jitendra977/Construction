import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { CheckCircle2, Clock, Calendar, FileText, User } from 'lucide-react-native';

export default function TaskDetailScreen({ route }) {
    const { task } = route.params;

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <View style={styles.titleRow}>
                    <Text style={styles.taskName}>{task.name}</Text>
                    {task.status === 'COMPLETED' && <CheckCircle2 color="#10b981" size={24} />}
                </View>
                <View style={[styles.statusBadge, { backgroundColor: task.status === 'COMPLETED' ? '#d1fae5' : '#fef3c7' }]}>
                    <Text style={[styles.statusText, { color: task.status === 'COMPLETED' ? '#059669' : '#d97706' }]}>
                        {task.status}
                    </Text>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Details</Text>
                <View style={styles.infoCard}>
                    <View style={styles.infoRow}>
                        <Clock color="#6b7280" size={18} />
                        <Text style={styles.infoLabel}>Assigned to</Text>
                        <Text style={styles.infoValue}>{task.assigned_worker_name || 'Unassigned'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Calendar color="#6b7280" size={18} />
                        <Text style={styles.infoLabel}>Deadline</Text>
                        <Text style={styles.infoValue}>{new Date(task.due_date).toLocaleDateString()}</Text>
                    </View>
                </View>
            </View>

            {task.description && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Instruction</Text>
                    <View style={styles.descriptionCard}>
                        <Text style={styles.descriptionText}>{task.description}</Text>
                    </View>
                </View>
            )}

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Working Notes</Text>
                <TouchableOpacity style={styles.actionButton}>
                    <FileText color="white" size={20} />
                    <Text style={styles.actionButtonText}>Add Working Note</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    header: { padding: 25, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
    titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    taskName: { fontSize: 24, fontWeight: 'bold', color: '#111827', flex: 1, marginRight: 10 },
    statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, marginTop: 15 },
    statusText: { fontSize: 13, fontWeight: 'bold' },
    section: { padding: 20 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 15 },
    infoCard: { backgroundColor: 'white', borderRadius: 15, padding: 20, borderWidth: 1, borderColor: '#e5e7eb' },
    infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    infoLabel: { fontSize: 14, color: '#6b7280', width: 100, marginLeft: 10 },
    infoValue: { fontSize: 14, fontWeight: '600', color: '#111827', flex: 1 },
    descriptionCard: { backgroundColor: 'white', borderRadius: 15, padding: 20, borderWidth: 1, borderColor: '#e5e7eb' },
    descriptionText: { fontSize: 14, color: '#4b5563', lineHeight: 22 },
    actionButton: {
        backgroundColor: '#4338ca',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 15,
        borderRadius: 12,
        shadowColor: '#4338ca',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 5,
    },
    actionButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
});
