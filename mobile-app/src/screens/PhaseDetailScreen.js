import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert, StatusBar } from 'react-native';
import { ChevronRight, FileText, CheckSquare, Square, Clock, Edit, Trash2, Calendar, Package, TrendingUp, Image as ImageIcon } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { dashboardService } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function PhaseDetailScreen({ route, navigation }) {
    const { phase } = route.params;
    const { dashboardData } = useAuth();

    // Get all tasks from dashboardData and filter by this phase
    const phaseTasks = React.useMemo(() => {
        if (!dashboardData?.tasks) return [];
        return dashboardData.tasks.filter(task => task.phase === phase.id);
    }, [dashboardData?.tasks, phase.id]);

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

    // Calculate progress using filtered tasks
    const totalTasks = phaseTasks.length;
    const completedTasks = phaseTasks.filter(t => t.status === 'COMPLETED').length;
    const progressPercent = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    const InfoCard = ({ icon: Icon, label, value, iconColor = '#4b5563', iconBg = '#f3f4f6' }) => (
        <View style={styles.infoCard}>
            <View style={[styles.infoIcon, { backgroundColor: iconBg }]}>
                <Icon size={18} color={iconColor} />
            </View>
            <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>{label}</Text>
                <Text style={styles.infoValue}>{value}</Text>
            </View>
        </View>
    );

    const renderTask = (task) => (
        <TouchableOpacity
            key={task.id}
            style={styles.taskCard}
            onPress={() => navigation.navigate('TaskDetail', { task })}
        >
            <View style={styles.taskHeader}>
                {task.status === 'COMPLETED' ? (
                    <CheckSquare color="#10b981" size={22} />
                ) : task.status === 'IN_PROGRESS' ? (
                    <Clock color="#f59e0b" size={22} />
                ) : (
                    <Square color="#d1d5db" size={22} />
                )}
                <View style={styles.taskInfo}>
                    <Text style={[styles.taskName, task.status === 'COMPLETED' && styles.completedTask]}>{task.name}</Text>

                    {/* Task Description */}
                    {task.description && (
                        <Text style={styles.taskDescription} numberOfLines={2}>
                            {task.description}
                        </Text>
                    )}

                    {/* Task Meta Row */}
                    <View style={styles.taskMeta}>
                        {task.assigned_to && (
                            <View style={styles.metaItem}>
                                <Text style={styles.metaLabel}>Assigned to:</Text>
                                <Text style={styles.metaValue}>{task.assigned_to_name || task.assigned_to}</Text>
                            </View>
                        )}
                        {task.due_date && (
                            <View style={styles.metaItem}>
                                <Calendar color="#6b7280" size={12} />
                                <Text style={styles.metaValue}>{new Date(task.due_date).toLocaleDateString()}</Text>
                            </View>
                        )}
                    </View>

                    {/* Status Badge */}
                    <View style={[styles.taskStatusBadge, {
                        backgroundColor: task.status === 'COMPLETED' ? '#d1fae5' :
                            task.status === 'IN_PROGRESS' ? '#fef3c7' : '#f3f4f6'
                    }]}>
                        <Text style={[styles.taskStatusText, {
                            color: task.status === 'COMPLETED' ? '#059669' :
                                task.status === 'IN_PROGRESS' ? '#d97706' : '#6b7280'
                        }]}>
                            {task.status.replace('_', ' ')}
                        </Text>
                    </View>
                </View>
                <ChevronRight color="#d1d5db" size={18} />
            </View>
        </TouchableOpacity>
    );

    return (
        <ScrollView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#059669" />

            {/* Header Section */}
            <LinearGradient
                colors={['#059669', '#047857']}
                style={styles.header}
            >
                <Text style={styles.phaseName}>{phase.name}</Text>
                <View style={[styles.statusBadge, {
                    backgroundColor: phase.status === 'COMPLETED' ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.2)'
                }]}>
                    <Text style={styles.statusText}>{phase.status}</Text>
                </View>

                {/* Progress Bar */}
                <View style={styles.progressSection}>
                    <View style={styles.progressHeader}>
                        <Text style={styles.progressLabel}>Overall Progress</Text>
                        <Text style={styles.progressPercent}>{progressPercent.toFixed(0)}%</Text>
                    </View>
                    <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
                    </View>
                    <Text style={styles.progressText}>{completedTasks} of {totalTasks} tasks completed</Text>
                </View>
            </LinearGradient>

            {/* Phase Info Cards */}
            <View style={styles.infoSection}>
                <InfoCard
                    icon={Calendar}
                    label="Start Date"
                    value={new Date(phase.start_date).toLocaleDateString()}
                    iconColor="#4f46e5"
                    iconBg="#eef2ff"
                />
                <InfoCard
                    icon={Calendar}
                    label="End Date"
                    value={new Date(phase.end_date).toLocaleDateString()}
                    iconColor="#dc2626"
                    iconBg="#fee2e2"
                />
            </View>

            {/* Documents & Blueprints */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Documents & Blueprints</Text>
                <View style={styles.documentRow}>
                    <TouchableOpacity style={styles.docCard}>
                        <View style={styles.docIconContainer}>
                            <FileText color="#4338ca" size={28} />
                        </View>
                        <Text style={styles.docLabel}>Naksa</Text>
                        <Text style={styles.docSubtext}>Blueprint</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.docCard}>
                        <View style={styles.docIconContainer}>
                            <FileText color="#059669" size={28} />
                        </View>
                        <Text style={styles.docLabel}>Structure</Text>
                        <Text style={styles.docSubtext}>Design Plan</Text>
                    </TouchableOpacity>
                </View>

                {/* Completion Photo */}
                {phase.completion_photo && (
                    <TouchableOpacity style={styles.completionPhotoCard}>
                        <View style={styles.docIconContainer}>
                            <ImageIcon color="#10b981" size={28} />
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={styles.docLabel}>Completion Photo</Text>
                            <Text style={styles.docSubtext}>Phase completed on {new Date(phase.end_date).toLocaleDateString()}</Text>
                        </View>
                        <ChevronRight color="#d1d5db" size={20} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Required Materials */}
            {phase.materials && phase.materials.length > 0 && (
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Package color="#6b7280" size={20} />
                        <Text style={[styles.sectionTitle, { marginBottom: 0, marginLeft: 8 }]}>Required Materials</Text>
                    </View>
                    <View style={styles.materialsContainer}>
                        {phase.materials.map((material, index) => (
                            <View key={index} style={styles.materialItem}>
                                <View style={styles.materialDot} />
                                <Text style={styles.materialText}>{material.name}</Text>
                                <Text style={styles.materialQuantity}>{material.quantity} {material.unit}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            )}

            {/* Phase Tasks */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <TrendingUp color="#6b7280" size={20} />
                    <Text style={[styles.sectionTitle, { marginBottom: 0, marginLeft: 8 }]}>Phase Tasks</Text>
                </View>
                {totalTasks > 0 ? (
                    <View style={styles.tasksContainer}>
                        {phaseTasks.map(task => renderTask(task))}
                    </View>
                ) : (
                    <View style={styles.emptyTasks}>
                        <Clock color="#9ca3af" size={40} />
                        <Text style={styles.emptyText}>No tasks assigned to this phase.</Text>
                        <Text style={styles.emptySubtext}>Add tasks to track progress</Text>
                    </View>
                )}
            </View>

            <View style={{ height: 40 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb'
    },
    header: {
        padding: 25,
        paddingTop: 30,
        paddingBottom: 30,
    },
    phaseName: {
        fontSize: 26,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 8,
    },
    statusBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        marginBottom: 20,
    },
    statusText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: 'white',
    },
    progressSection: {
        marginTop: 10,
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    progressLabel: {
        fontSize: 13,
        color: '#d1fae5',
        fontWeight: '600',
    },
    progressPercent: {
        fontSize: 16,
        color: 'white',
        fontWeight: 'bold',
    },
    progressBar: {
        height: 8,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: 'white',
        borderRadius: 4,
    },
    progressText: {
        fontSize: 11,
        color: '#a7f3d0',
        marginTop: 6,
    },
    infoSection: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginTop: -20,
        gap: 12,
        marginBottom: 10,
    },
    infoCard: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        padding: 14,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    infoIcon: {
        width: 36,
        height: 36,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    infoContent: {
        flex: 1,
    },
    infoLabel: {
        fontSize: 10,
        color: '#6b7280',
        marginBottom: 2,
    },
    infoValue: {
        fontSize: 13,
        fontWeight: '700',
        color: '#111827',
    },
    section: {
        padding: 20,
        paddingTop: 16,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 16,
    },
    documentRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
    },
    docCard: {
        flex: 1,
        backgroundColor: 'white',
        borderRadius: 14,
        padding: 18,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        shadowColor: '#000',
        shadowOpacity: 0.03,
        shadowRadius: 5,
    },
    docIconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#f9fafb',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    docLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: '#111827',
    },
    docSubtext: {
        fontSize: 11,
        color: '#6b7280',
        marginTop: 2,
    },
    completionPhotoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 14,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        shadowColor: '#000',
        shadowOpacity: 0.03,
        shadowRadius: 5,
    },
    materialsContainer: {
        backgroundColor: 'white',
        borderRadius: 14,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    materialItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    materialDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#059669',
        marginRight: 12,
    },
    materialText: {
        flex: 1,
        fontSize: 14,
        color: '#374151',
        fontWeight: '500',
    },
    materialQuantity: {
        fontSize: 13,
        color: '#6b7280',
        fontWeight: '600',
    },
    tasksContainer: {
        gap: 8,
    },
    taskCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        shadowColor: '#000',
        shadowOpacity: 0.02,
        shadowRadius: 4,
    },
    taskHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    taskInfo: {
        flex: 1,
    },
    taskName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 6,
    },
    completedTask: {
        textDecorationLine: 'line-through',
        color: '#9ca3af',
    },
    taskDescription: {
        fontSize: 13,
        color: '#6b7280',
        lineHeight: 18,
        marginBottom: 10,
    },
    taskMeta: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 8,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaLabel: {
        fontSize: 11,
        color: '#9ca3af',
        fontWeight: '500',
    },
    metaValue: {
        fontSize: 12,
        color: '#4b5563',
        fontWeight: '600',
    },
    taskStatusBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    taskStatusText: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    emptyTasks: {
        alignItems: 'center',
        padding: 50,
        backgroundColor: 'white',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    emptyText: {
        color: '#6b7280',
        marginTop: 12,
        fontSize: 15,
        fontWeight: '600',
    },
    emptySubtext: {
        color: '#9ca3af',
        fontSize: 13,
        marginTop: 4,
    },
});
