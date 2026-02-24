import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Image,
    RefreshControl,
    Alert,
    Dimensions,
    Platform,
    ActionSheetIOS,
} from 'react-native';
import {
    CheckCircle2,
    Clock,
    Calendar,
    User,
    AlertCircle,
    Image as ImageIcon,
    FileText,
    ArrowLeft,
    Camera,
    Upload,
    X,
    Download,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { taskService, getMediaUrl } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import { Modal } from 'react-native';
import Skeleton from '../components/Skeleton';

const { width } = Dimensions.get('window');

const PRIORITY_COLORS = {
    LOW: { bg: '#dbeafe', text: '#1e40af' },
    MEDIUM: { bg: '#fef3c7', text: '#92400e' },
    HIGH: { bg: '#fed7aa', text: '#9a3412' },
    CRITICAL: { bg: '#fee2e2', text: '#991b1b' },
};

const STATUS_CONFIG = {
    PENDING: { icon: Clock, color: '#f59e0b' },
    IN_PROGRESS: { icon: Clock, color: '#6366f1' },
    COMPLETED: { icon: CheckCircle2, color: '#10b981' },
    BLOCKED: { icon: AlertCircle, color: '#ef4444' },
};

export default function TaskDetailScreen({ route, navigation }) {
    const { task: initialTask } = route?.params || {};

    // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
    const [task, setTask] = useState(initialTask);
    const [media, setMedia] = useState([]);
    const [updates, setUpdates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);

    const loadTaskDetails = async () => {
        try {
            // Load full task details
            const taskData = await taskService.getTask(initialTask.id);
            setTask(taskData);

            // Load media and updates in parallel, but don't fail if they error
            try {
                const [mediaData, updatesData] = await Promise.all([
                    taskService.getTaskMedia(initialTask.id).catch(() => []),
                    taskService.getTaskUpdates(initialTask.id).catch(() => []),
                ]);
                setMedia(Array.isArray(mediaData) ? mediaData : []);
                setUpdates(Array.isArray(updatesData) ? updatesData : []);
            } catch (error) {
                console.error('Error loading task media/updates:', error);
                // Continue even if media/updates fail
            }
        } catch (error) {
            console.error('Error loading task details:', error);
            // If task details fail, still show what we have from route params
            setTask(initialTask);
            Alert.alert('Error', 'Failed to load full task details. Showing cached data.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        loadTaskDetails();
    };

    const handleUploadPhoto = async () => {
        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Camera permission is required to take photos.');
                return;
            }

            if (Platform.OS === 'ios') {
                ActionSheetIOS.showActionSheetWithOptions(
                    {
                        options: ['Cancel', 'Take Photo', 'Choose from Gallery'],
                        cancelButtonIndex: 0,
                    },
                    (buttonIndex) => {
                        if (buttonIndex === 1) {
                            takePhoto();
                        } else if (buttonIndex === 2) {
                            pickImage();
                        }
                    }
                );
            } else {
                Alert.alert(
                    'Upload Photo',
                    'Choose an option',
                    [
                        { text: 'Take Photo', onPress: () => takePhoto() },
                        { text: 'Choose from Gallery', onPress: () => pickImage() },
                        { text: 'Cancel', style: 'cancel' },
                    ]
                );
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to request permissions');
        }
    };

    const takePhoto = async () => {
        try {
            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                await uploadImage(result.assets[0]);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to take photo');
        }
    };

    const pickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                await uploadImage(result.assets[0]);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to pick image');
        }
    };

    const uploadImage = async (imageAsset) => {
        if (!task?.id) return;

        setUploading(true);
        try {
            const filename = imageAsset.uri.split('/').pop();
            const match = /\.(\w+)$/.exec(filename);
            const type = match ? `image/${match[1]}` : 'image/jpeg';

            const file = {
                uri: imageAsset.uri,
                name: filename,
                type,
            };

            const response = await taskService.uploadTaskMedia(task.id, file);
            setMedia([response, ...media]);
            Alert.alert('Success', 'Photo uploaded successfully!');
        } catch (error) {
            console.error('Error uploading image:', error);
            Alert.alert('Error', 'Failed to upload photo.');
        } finally {
            setUploading(false);
        }
    };

    useEffect(() => {
        if (initialTask?.id) {
            loadTaskDetails();
        } else {
            setLoading(false);
        }
    }, []);

    const handleStatusUpdate = (newStatus) => {
        if (!task || !task.id) {
            Alert.alert('Error', 'Task data not available');
            return;
        }

        Alert.alert(
            'Update Status',
            `Change status to ${newStatus}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Update',
                    onPress: async () => {
                        try {
                            await taskService.updateTask(task.id, { status: newStatus });
                            setTask({ ...task, status: newStatus });
                            Alert.alert('Success', 'Task status updated');
                        } catch (error) {
                            Alert.alert('Error', 'Failed to update status');
                        }
                    },
                },
            ]
        );
    };

    const StatusIcon = STATUS_CONFIG[task?.status]?.icon || Clock;
    const statusColor = STATUS_CONFIG[task?.status]?.color || '#6b7280';
    const priorityStyle = PRIORITY_COLORS[task?.priority] || PRIORITY_COLORS.MEDIUM;

    // Ensure we have valid values before rendering
    const safeStatusColor = statusColor || '#6b7280';
    const safePriorityBg = priorityStyle?.bg || '#fef3c7';
    const safePriorityText = priorityStyle?.text || '#92400e';
    const safeStatus = task?.status || 'PENDING';
    const safePriority = task?.priority || 'MEDIUM';
    const safeTitle = task?.title || 'Task Details';

    // If task doesn't have basic required fields, show loading
    // This prevents NSNull crashes from incomplete data
    if (loading || !task?.id || !task?.status || !task?.priority) {
        return (
            <View style={styles.container}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                    {loading ? (
                        <>
                            <Skeleton width={200} height={30} style={{ marginBottom: 20 }} />
                            <Skeleton width={300} height={100} style={{ marginBottom: 20 }} />
                            <Skeleton width={300} height={100} />
                        </>
                    ) : (
                        <>
                            <AlertCircle color="#ef4444" size={48} />
                            <Text style={{ fontSize: 18, fontWeight: '600', color: '#1f2937', marginTop: 16 }}>
                                Incomplete Task Data
                            </Text>
                            <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 8, textAlign: 'center' }}>
                                This task is missing required information.
                            </Text>
                            <TouchableOpacity
                                style={[styles.actionButton, { backgroundColor: '#6366f1', marginTop: 24 }]}
                                onPress={() => navigation?.goBack?.()}
                            >
                                <ArrowLeft color="white" size={20} />
                                <Text style={styles.actionButtonText}>Go Back</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.container}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        >
            {/* Header with Gradient */}
            <LinearGradient
                colors={[safeStatusColor, safeStatusColor + 'dd']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <View style={styles.headerIconContainer}>
                    <StatusIcon color="white" size={32} />
                </View>
                <Text style={styles.taskTitle}>{safeTitle}</Text>
                <View style={styles.badgesRow}>
                    <View style={[styles.priorityBadge, { backgroundColor: safePriorityBg }]}>
                        <Text style={[styles.priorityText, { color: safePriorityText }]}>
                            {safePriority}
                        </Text>
                    </View>
                    <View style={styles.statusBadgeContainer}>
                        <StatusBadge status={safeStatus} type="phase" />
                    </View>
                </View>
            </LinearGradient>

            {/* Task Info */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Task Information</Text>
                <View style={styles.infoCard}>
                    {task?.assigned_to && (
                        <View style={styles.infoRow}>
                            <User color="#6b7280" size={20} />
                            <Text style={styles.infoLabel}>Assigned To:</Text>
                            <Text style={styles.infoValue}>{task?.assigned_to_name || 'N/A'}</Text>
                        </View>
                    )}
                    {task?.phase && (
                        <View style={styles.infoRow}>
                            <FileText color="#6b7280" size={20} />
                            <Text style={styles.infoLabel}>Phase:</Text>
                            <Text style={styles.infoValue}>{task?.phase_name || `Phase ${task?.phase}`}</Text>
                        </View>
                    )}
                    {task?.room && (
                        <View style={styles.infoRow}>
                            <Calendar color="#6b7280" size={20} />
                            <Text style={styles.infoLabel}>Room:</Text>
                            <Text style={styles.infoValue}>{task?.room_name || 'N/A'}</Text>
                        </View>
                    )}
                    {task?.start_date && (
                        <View style={styles.infoRow}>
                            <Calendar color="#6b7280" size={20} />
                            <Text style={styles.infoLabel}>Start Date:</Text>
                            <Text style={styles.infoValue}>
                                {new Date(task.start_date).toLocaleDateString('en-NP')}
                            </Text>
                        </View>
                    )}
                    {task?.due_date && (
                        <View style={styles.infoRow}>
                            <Calendar color="#6b7280" size={20} />
                            <Text style={styles.infoLabel}>Due Date:</Text>
                            <Text style={styles.infoValue}>
                                {new Date(task.due_date).toLocaleDateString('en-NP')}
                            </Text>
                        </View>
                    )}
                    {task?.completed_date && (
                        <View style={styles.infoRow}>
                            <CheckCircle2 color="#10b981" size={20} />
                            <Text style={styles.infoLabel}>Completed:</Text>
                            <Text style={[styles.infoValue, { color: '#10b981' }]}>
                                {new Date(task.completed_date).toLocaleDateString('en-NP')}
                            </Text>
                        </View>
                    )}
                </View>
            </View>

            {/* Description */}
            {task?.description && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Description</Text>
                    <View style={styles.descriptionCard}>
                        <Text style={styles.descriptionText}>{task.description}</Text>
                    </View>
                </View>
            )}

            {/* Media Gallery */}
            <View style={styles.section}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <Text style={styles.sectionTitle}>Photos & Media ({media.length})</Text>
                    <TouchableOpacity onPress={handleUploadPhoto} disabled={uploading}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Camera size={20} color="#6366f1" />
                            <Text style={{ color: '#6366f1', fontWeight: '600' }}>
                                {uploading ? 'Uploading...' : 'Add Photo'}
                            </Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {media.length > 0 ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaGallery}>
                        {media.map((item) => (
                            <View key={item.id} style={styles.mediaItem}>
                                <TouchableOpacity onPress={() => setSelectedImage(getMediaUrl(item.file))}>
                                    <Image
                                        source={{ uri: getMediaUrl(item.file) }}
                                        style={styles.mediaImage}
                                        resizeMode="cover"
                                    />
                                </TouchableOpacity>
                                {item.description && (
                                    <Text style={styles.mediaCaption} numberOfLines={2}>
                                        {item.description}
                                    </Text>
                                )}
                            </View>
                        ))}
                    </ScrollView>
                ) : (
                    <EmptyState
                        icon="📷"
                        title="No Photos Yet"
                        message="Take a photo to document progress"
                        actionLabel="Take Photo"
                        onAction={handleUploadPhoto}
                    />
                )}
            </View>

            {/* Updates Timeline */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Updates & Progress</Text>
                {updates.length === 0 ? (
                    <EmptyState icon="📝" title="No Updates" message="No progress updates yet" />
                ) : (
                    <View style={styles.timeline}>
                        {updates.map((update, index) => (
                            <View key={update.id} style={styles.timelineItem}>
                                <View style={styles.timelineDot} />
                                {index !== updates.length - 1 && <View style={styles.timelineLine} />}
                                <View style={styles.updateCard}>
                                    <View style={styles.updateHeader}>
                                        <Text style={styles.updateDate}>
                                            {new Date(update.date).toLocaleDateString('en-NP')}
                                        </Text>
                                        {update.progress_percentage !== undefined && (
                                            <View style={styles.progressBadge}>
                                                <Text style={styles.progressText}>{update.progress_percentage}%</Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={styles.updateNote}>{update.note}</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                )}
            </View>

            {/* Status Update Actions */}
            {safeStatus !== 'COMPLETED' && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Quick Actions</Text>
                    <View style={styles.actionsGrid}>
                        {safeStatus === 'PENDING' && (
                            <TouchableOpacity
                                style={[styles.actionButton, { backgroundColor: '#6366f1' }]}
                                onPress={() => handleStatusUpdate('IN_PROGRESS')}
                            >
                                <Clock color="white" size={20} />
                                <Text style={styles.actionButtonText}>Start Task</Text>
                            </TouchableOpacity>
                        )}
                        {safeStatus === 'IN_PROGRESS' && (
                            <>
                                <TouchableOpacity
                                    style={[styles.actionButton, { backgroundColor: '#10b981' }]}
                                    onPress={() => handleStatusUpdate('COMPLETED')}
                                >
                                    <CheckCircle2 color="white" size={20} />
                                    <Text style={styles.actionButtonText}>Mark Complete</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.actionButton, { backgroundColor: '#ef4444' }]}
                                    onPress={() => handleStatusUpdate('BLOCKED')}
                                >
                                    <AlertCircle color="white" size={20} />
                                    <Text style={styles.actionButtonText}>Block Task</Text>
                                </TouchableOpacity>
                            </>
                        )}
                        {safeStatus === 'BLOCKED' && (
                            <TouchableOpacity
                                style={[styles.actionButton, { backgroundColor: '#6366f1' }]}
                                onPress={() => handleStatusUpdate('IN_PROGRESS')}
                            >
                                <Clock color="white" size={20} />
                                <Text style={styles.actionButtonText}>Unblock</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            )}

            <View style={{ height: 40 }} />
            {/* Full Screen Image Modal */}
            <Modal visible={!!selectedImage} transparent={true} animationType="fade" onRequestClose={() => setSelectedImage(null)}>
                <View style={{ flex: 1, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' }}>
                    <TouchableOpacity
                        style={{ position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 10 }}
                        onPress={() => setSelectedImage(null)}
                    >
                        <X color="white" size={30} />
                    </TouchableOpacity>

                    {selectedImage && (
                        <TouchableOpacity
                            style={{ position: 'absolute', top: 50, right: 70, zIndex: 10, padding: 10 }}
                            onPress={() => saveImage(selectedImage)}
                        >
                            <Download color="white" size={30} />
                        </TouchableOpacity>
                    )}
                    {selectedImage && (
                        <Image
                            source={{ uri: selectedImage }}
                            style={{ width: '100%', height: '80%' }}
                            resizeMode="contain"
                        />
                    )}
                </View>
            </Modal>
        </ScrollView>
    );

    async function saveImage(url) {
        try {
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission needed', 'Please allow access to your photo library to save images.');
                return;
            }

            const filename = url.split('/').pop();
            const fileUri = FileSystem.documentDirectory + filename;

            const { uri } = await FileSystem.downloadAsync(url, fileUri);
            await MediaLibrary.saveToLibraryAsync(uri);
            Alert.alert('Success', 'Image saved to gallery!');
        } catch (e) {
            console.error(e);
            Alert.alert('Error', 'Failed to save image.');
        }
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    header: {
        padding: 24,
        paddingTop: 40,
        paddingBottom: 32,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    headerIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    taskTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: 'white',
        marginBottom: 16,
        lineHeight: 32,
    },
    badgesRow: {
        flexDirection: 'row',
        gap: 12,
    },
    priorityBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    priorityText: {
        fontSize: 12,
        fontWeight: '600',
    },
    statusBadgeContainer: {
        // StatusBadge component will handle its own styling
    },
    section: {
        padding: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1f2937',
        marginBottom: 12,
    },
    infoCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    infoLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6b7280',
        marginLeft: 12,
        minWidth: 100,
    },
    infoValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1f2937',
        flex: 1,
    },
    descriptionCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    descriptionText: {
        fontSize: 14,
        color: '#4b5563',
        lineHeight: 22,
    },
    mediaGallery: {
        marginLeft: -20,
        paddingLeft: 20,
    },
    mediaItem: {
        marginRight: 12,
    },
    mediaImage: {
        width: 200,
        height: 150,
        borderRadius: 12,
    },
    mediaCaption: {
        marginTop: 8,
        fontSize: 12,
        color: '#6b7280',
        width: 200,
    },
    timeline: {
        paddingLeft: 12,
    },
    timelineItem: {
        flexDirection: 'row',
        marginBottom: 20,
        position: 'relative',
    },
    timelineDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#6366f1',
        marginTop: 4,
        marginRight: 16,
        zIndex: 2,
    },
    timelineLine: {
        position: 'absolute',
        left: 5.5,
        top: 16,
        bottom: -20,
        width: 1,
        backgroundColor: '#e5e7eb',
    },
    updateCard: {
        flex: 1,
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    updateHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    updateDate: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6366f1',
    },
    progressBadge: {
        backgroundColor: '#eef2ff',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    progressText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#6366f1',
    },
    updateNote: {
        fontSize: 14,
        color: '#4b5563',
        lineHeight: 20,
    },
    actionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    actionButton: {
        flex: 1,
        minWidth: '45%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    actionButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
});
