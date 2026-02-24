import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Image, TouchableOpacity, Dimensions, Modal, RefreshControl, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Camera, Layers, FileText, Image as ImageIcon, X, Download } from 'lucide-react-native';
import { dashboardService, getMediaUrl } from '../services/api';
import storage from '../utils/storage';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { Alert } from 'react-native';

const { width } = Dimensions.get('window');

const TABS = [
    { id: 'timeline', label: 'Timeline', icon: Camera },
    { id: 'phases', label: 'Phases', icon: Layers },
    { id: 'blueprints', label: 'Blueprints', icon: FileText },
    { id: 'permits', label: 'Permits', icon: FileText }, // Recurring icon for now
];

import Skeleton from '../components/Skeleton';

// Skeleton Loading Component
const GallerySkeleton = () => (
    <View style={{ flex: 1, backgroundColor: '#f3f4f6' }}>
        <StatusBar barStyle="light-content" backgroundColor="#059669" />
        {/* Header Skeleton */}
        <View style={[styles.header, { height: 160 }]}>
            <View style={{ marginBottom: 20 }}>
                <Skeleton width={150} height={30} style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                {[1, 2, 3, 4].map(i => (
                    <Skeleton key={i} width={100} height={35} borderRadius={20} style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
                ))}
            </ScrollView>
        </View>

        {/* Content Skeleton */}
        <View style={{ padding: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }}>
                <Skeleton width={120} height={20} />
                <Skeleton width={30} height={20} borderRadius={10} />
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {[1, 2, 3, 4, 5, 6].map(i => (
                    <Skeleton key={i} width={(width - 48) / 3} height={(width - 48) / 3} borderRadius={8} />
                ))}
            </View>
        </View>
    </View>
);

export default function GalleryScreen() {
    // 1. Hook
    const [activeTab, setActiveTab] = useState('timeline');
    // 2. Hook
    const [galleryData, setGalleryData] = useState([]);
    // 3. Hook
    const [loading, setLoading] = useState(true);
    // 4. Hook
    const [lightboxItem, setLightboxItem] = useState(null);
    // 5. Hook
    const [error, setError] = useState(null);

    const fetchGallery = async () => {
        setLoading(true);
        setError(null);
        try {
            // Check if user is authenticated before fetching
            const token = await storage.getItem('access_token');
            if (!token) {
                // User not authenticated, skip fetching
                setLoading(false);
                return;
            }

            console.log("Fetching gallery...");
            // Create a timeout promise
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Request timed out')), 10000)
            );

            // Race the fetch against the timeout
            const data = await Promise.race([
                dashboardService.getGallery(activeTab),
                timeoutPromise
            ]);

            console.log("Gallery fetched:", data ? data.length : 0);
            setGalleryData(data || []);
        } catch (err) {
            // Only log if it's not an authentication error
            if (err.response?.status !== 401) {
                console.error('Failed to load gallery:', err);
                setError('Failed to load gallery. Please check your connection.');
            }
        } finally {
            setLoading(false);
        }
    };

    // 6. Hook
    useEffect(() => {
        fetchGallery();
    }, [activeTab]);

    // Conditional Return AFTER all hooks
    if (loading && galleryData.length === 0 && !error) return <GallerySkeleton />;

    const renderTimelineItem = (item) => (
        <TouchableOpacity key={item.id} onPress={() => setLightboxItem(item)} style={styles.timelineItem}>
            <Image source={{ uri: getMediaUrl(item.url) }} style={styles.timelineImage} />
        </TouchableOpacity>
    );

    const renderGridItem = (item) => (
        <TouchableOpacity key={item.id} onPress={() => setLightboxItem(item)} style={styles.gridItem}>
            <View style={styles.gridImageContainer}>
                {item.type === 'PDF' ? (
                    <View style={[styles.gridImage, styles.pdfPlaceholder]}>
                        <FileText size={32} color="#ef4444" />
                        <Text style={styles.pdfText}>PDF</Text>
                    </View>
                ) : (
                    <Image source={{ uri: getMediaUrl(item.url) }} style={styles.gridImage} resizeMode="cover" />
                )}
            </View>
            <View style={styles.gridMeta}>
                <Text style={styles.gridTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.gridSubtitle} numberOfLines={1}>{item.subtitle}</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={{ flexGrow: 1 }}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchGallery} tintColor="#059669" />}
        >
            <StatusBar barStyle="light-content" backgroundColor="#059669" />
            <LinearGradient
                colors={['#059669', '#047857']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                {/* Background Icon */}
                <View style={styles.headerBgIcon}>
                    <Layers color="rgba(255,255,255,0.1)" size={120} />
                </View>

                {/* Header Title Removed as per request */}

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContainer}>
                    {TABS.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <TouchableOpacity
                                key={tab.id}
                                onPress={() => setActiveTab(tab.id)}
                                style={[styles.tab, isActive && styles.tabActive]}
                            >
                                <Icon size={16} color={isActive ? '#059669' : 'rgba(255,255,255,0.7)'} />
                                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab.label}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </LinearGradient>

            <View style={styles.content}>
                {error ? (
                    <View style={styles.centerContainer}>
                        <Text style={styles.errorText}>{error}</Text>
                        <TouchableOpacity style={styles.retryButton} onPress={fetchGallery}>
                            <Text style={styles.retryText}>Retry</Text>
                        </TouchableOpacity>
                    </View>
                ) : galleryData.length === 0 ? (
                    <View style={styles.centerContainer}>
                        <ImageIcon color="#d1d5db" size={48} />
                        <Text style={styles.emptyText}>No images found in this section.</Text>
                    </View>
                ) : (
                    galleryData.map((group, index) => (
                        <View key={index} style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>
                                    {group.groupName === 'undefined' ? 'Uncategorized' : group.groupName}
                                </Text>
                                <View style={styles.countBadge}>
                                    <Text style={styles.countText}>{group.items.length}</Text>
                                </View>
                            </View>

                            <View style={styles.itemsContainer}>
                                {activeTab === 'timeline' ? (
                                    <View style={styles.masonryGrid}>
                                        {group.items.map(renderTimelineItem)}
                                    </View>
                                ) : (
                                    <View style={styles.cardGrid}>
                                        {group.items.map(renderGridItem)}
                                    </View>
                                )}
                            </View>
                        </View>
                    ))
                )}
                <View style={{ height: 100 }} />
            </View>

            {/* Lightbox Modal */}
            <Modal visible={!!lightboxItem} transparent={true} animationType="fade">
                <View style={styles.lightboxContainer}>
                    <TouchableOpacity style={styles.closeButton} onPress={() => setLightboxItem(null)}>
                        <X color="white" size={28} />
                    </TouchableOpacity>

                    {lightboxItem && (
                        <TouchableOpacity
                            style={[styles.closeButton, { right: 70 }]}
                            onPress={() => saveImage(lightboxItem.url)}
                        >
                            <Download color="white" size={28} />
                        </TouchableOpacity>
                    )}

                    {lightboxItem && (
                        <View style={styles.lightboxContent}>
                            <Image
                                source={{ uri: getMediaUrl(lightboxItem.url) }}
                                style={styles.lightboxImage}
                                resizeMode="contain"
                            />
                            <View style={styles.lightboxMeta}>
                                <Text style={styles.lightboxTitle}>{lightboxItem.title}</Text>
                                <Text style={styles.lightboxSubtitle}>{lightboxItem.subtitle}</Text>
                            </View>
                        </View>
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

            const downloadUrl = getMediaUrl(url);
            const filename = downloadUrl.split('/').pop();
            const fileUri = FileSystem.documentDirectory + filename;

            const { uri } = await FileSystem.downloadAsync(downloadUrl, fileUri);
            await MediaLibrary.saveToLibraryAsync(uri);
            Alert.alert('Success', 'Image saved to gallery!');
        } catch (e) {
            console.error(e);
            Alert.alert('Error', 'Failed to save image.');
        }
    }
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f3f4f6' },
    header: {
        paddingTop: 60,
        paddingBottom: 20,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        overflow: 'hidden',
    },
    headerBgIcon: { position: 'absolute', bottom: -20, right: -20, opacity: 0.5 },
    headerTitle: { fontSize: 28, fontWeight: '800', color: 'white' },
    headerSubtitle: { fontSize: 14, color: '#e0e7ff', marginBottom: 20 },
    tabsContainer: { flexDirection: 'row', gap: 10, paddingRight: 20 },
    tab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        gap: 6,
    },
    tabActive: { backgroundColor: 'white' },
    tabText: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
    tabTextActive: { color: '#059669' },

    content: { flex: 1, paddingTop: 20 },
    section: { marginBottom: 24 },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 12,
        gap: 10
    },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' },
    countBadge: { backgroundColor: '#e5e7eb', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
    countText: { fontSize: 12, fontWeight: 'bold', color: '#4b5563' },

    itemsContainer: { paddingHorizontal: 20 },
    masonryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    timelineItem: { width: (width - 48) / 3, aspectRatio: 1, borderRadius: 8, overflow: 'hidden' },
    timelineImage: { width: '100%', height: '100%' },

    cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    gridItem: { width: (width - 52) / 2, backgroundColor: 'white', borderRadius: 12, overflow: 'hidden', paddingBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
    gridImageContainer: { height: 120, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
    gridImage: { width: '100%', height: '100%' },
    pdfPlaceholder: { backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center' },
    pdfText: { color: '#ef4444', fontWeight: 'bold', marginTop: 4, fontSize: 10 },
    gridMeta: { paddingHorizontal: 10, paddingTop: 8 },
    gridTitle: { fontSize: 13, fontWeight: 'bold', color: '#1f2937' },
    gridSubtitle: { fontSize: 11, color: '#6b7280' },

    lightboxContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center' },
    closeButton: { position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 10 },
    lightboxContent: { width: '100%', height: '80%', justifyContent: 'center' },
    lightboxImage: { width: '100%', height: '100%' },
    lightboxMeta: { position: 'absolute', bottom: -60, left: 0, right: 0, padding: 20, alignItems: 'center' },
    lightboxTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    lightboxSubtitle: { color: 'gray', fontSize: 14 },

    centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
    errorText: { color: '#ef4444', marginBottom: 16 },
    retryButton: { backgroundColor: '#059669', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
    retryText: { color: 'white', fontWeight: 'bold' },
    emptyText: { color: '#9ca3af', marginTop: 12, fontSize: 16 }
});
