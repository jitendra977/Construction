import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Image, TouchableOpacity, Dimensions, Modal, RefreshControl, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Camera, Layers, FileText, Image as ImageIcon, X, Download } from 'lucide-react-native';
import { dashboardService, getMediaUrl } from '../services/api';

const { width } = Dimensions.get('window');

const TABS = [
    { id: 'timeline', label: 'Timeline', icon: Camera },
    { id: 'phases', label: 'Phases', icon: Layers },
    { id: 'blueprints', label: 'Blueprints', icon: FileText },
    { id: 'permits', label: 'Permits', icon: FileText }, // Recurring icon for now
];

export default function GalleryScreen() {
    const [activeTab, setActiveTab] = useState('timeline');
    const [galleryData, setGalleryData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lightboxItem, setLightboxItem] = useState(null);

    const fetchGallery = async () => {
        setLoading(true);
        try {
            const data = await dashboardService.getGallery(activeTab);
            // Transform data structure to match what UI expects if needed, 
            // but mobile api likely returns same structure as web
            setGalleryData(data);
        } catch (error) {
            console.error('Failed to load gallery:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGallery();
    }, [activeTab]);

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
                {galleryData.map((group, index) => (
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
                ))}
                <View style={{ height: 100 }} />
            </View>

            {/* Lightbox Modal */}
            <Modal visible={!!lightboxItem} transparent={true} animationType="fade">
                <View style={styles.lightboxContainer}>
                    <TouchableOpacity style={styles.closeButton} onPress={() => setLightboxItem(null)}>
                        <X color="white" size={28} />
                    </TouchableOpacity>

                    {lightboxItem && (
                        <View style={styles.lightboxContent}>
                            <Image
                                source={{ uri: lightboxItem.url }}
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
    lightboxSubtitle: { color: 'gray', fontSize: 14 }
});
