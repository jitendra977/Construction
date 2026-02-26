import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, StatusBar, Image, Modal, TextInput, ActivityIndicator, Alert, Switch } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { LogOut, User, Mail, Shield, Calendar, Edit, Settings, Bell, HelpCircle, ChevronRight, Briefcase, Camera, Save, X } from 'lucide-react-native';
import { getMediaUrl } from '../services/api';
import * as ImagePicker from 'expo-image-picker';

export default function ProfileScreen() {
    const { user, updateProfile, logout, dashboardData } = useAuth();
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [saving, setSaving] = useState(false);
    const [refreshTimestamp, setRefreshTimestamp] = useState(Date.now());
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        profile: {
            bio: '',
            phone_number: '',
            address: '',
            preferred_language: 'en',
            notifications_enabled: true,
            avatar: null
        }
    });

    // Sync form data with user when user loads or modal opens
    useEffect(() => {
        if (user) {
            setFormData({
                first_name: user.first_name || '',
                last_name: user.last_name || '',
                profile: {
                    bio: user.profile?.bio || '',
                    phone_number: user.profile?.phone_number || '',
                    address: user.profile?.address || '',
                    preferred_language: user.profile?.preferred_language || 'en',
                    notifications_enabled: user.profile?.notifications_enabled !== false,
                    avatar: null // Reset avatar selection
                }
            });
        }
    }, [user, isModalVisible]);

    const handlePickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
        });

        if (!result.canceled) {
            setFormData({
                ...formData,
                profile: { ...formData.profile, avatar: result.assets[0] }
            });
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Filter out null avatar if it hasn't changed to avoid clearing it
            const submissionData = { ...formData };
            if (submissionData.profile && submissionData.profile.avatar === null) {
                const { avatar, ...profileRest } = submissionData.profile;
                submissionData.profile = profileRest;
            }

            const result = await updateProfile(submissionData);
            if (result.success) {
                setIsModalVisible(false);
                setRefreshTimestamp(Date.now()); // Trigger image refresh
                Alert.alert("Success", "Profile updated successfully!");
            } else {
                // Handle nested error objects from DRF
                let errorMessage = "Failed to update profile";
                if (typeof result.error === 'object') {
                    const firstError = Object.values(result.error)[0];
                    errorMessage = Array.isArray(firstError) ? firstError[0] : JSON.stringify(result.error);
                } else if (typeof result.error === 'string') {
                    errorMessage = result.error;
                }
                Alert.alert("Error", errorMessage);
            }
        } catch (error) {
            Alert.alert("Error", "An unexpected error occurred");
        } finally {
            setSaving(false);
        }
    };

    // Calculate some user stats
    const totalPhases = dashboardData?.phases?.length || 0;
    const completedPhases = dashboardData?.phases?.filter(p => p.status === 'COMPLETED').length || 0;
    const memberSince = user?.date_joined ? new Date(user.date_joined).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }) : 'Unknown';

    const InfoCard = ({ icon: Icon, label, value, iconColor = '#4b5563', iconBg = '#f3f4f6' }) => (
        <View style={styles.infoCard}>
            <View style={[styles.infoIcon, { backgroundColor: iconBg }]}>
                <Icon size={20} color={iconColor} />
            </View>
            <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>{label}</Text>
                <Text style={styles.infoValue}>{value}</Text>
            </View>
        </View>
    );

    const MenuItem = ({ icon: Icon, label, onPress, danger }) => (
        <TouchableOpacity style={styles.menuItem} onPress={onPress}>
            <View style={[styles.menuIconContainer, danger && { backgroundColor: '#fee2e2' }]}>
                <Icon size={20} color={danger ? '#dc2626' : '#4b5563'} />
            </View>
            <Text style={[styles.menuItemText, danger && { color: '#dc2626' }]}>{label}</Text>
            <ChevronRight size={18} color="#9ca3af" />
        </TouchableOpacity>
    );

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={{ flexGrow: 1 }}
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
                    <User color="rgba(255,255,255,0.1)" size={140} />
                </View>

                <View style={styles.headerContent}>
                    <View style={styles.avatar}>
                        {user?.profile?.avatar ? (
                            <Image
                                key={`avatar-${refreshTimestamp}`}
                                source={{ uri: getMediaUrl(user.profile.avatar, true) }}
                                style={styles.avatarImage}
                            />
                        ) : (
                            <Text style={styles.avatarText}>{user?.username?.charAt(0).toUpperCase() || 'U'}</Text>
                        )}
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.name}>{user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` : user?.username || 'User'}</Text>
                        <Text style={styles.email}>{user?.email || 'No email provided'}</Text>
                        <View style={styles.roleBadge}>
                            <Shield size={12} color="white" />
                            <Text style={styles.roleText}>{user?.role || 'Admin'}</Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => setIsModalVisible(true)}
                    >
                        <Edit size={18} color="white" />
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            {/* Quick Stats */}
            <View style={styles.statsSection}>
                <View style={styles.statCard}>
                    <Text style={styles.statValue}>{completedPhases}/{totalPhases}</Text>
                    <Text style={styles.statLabel}>Phases</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statValue}>{dashboardData?.tasks?.length || 0}</Text>
                    <Text style={styles.statLabel}>Tasks</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statValue}>{memberSince}</Text>
                    <Text style={styles.statLabel}>Member Since</Text>
                </View>
            </View>

            {/* Account Information */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Account Information</Text>
                <InfoCard
                    icon={User}
                    label="Full Name"
                    value={user?.first_name || user?.last_name ? `${user.first_name} ${user.last_name}`.trim() : 'Not provided'}
                    iconColor="#4f46e5"
                    iconBg="#eef2ff"
                />
                <InfoCard
                    icon={Mail}
                    label="Email Address"
                    value={user?.email || 'N/A'}
                    iconColor="#059669"
                    iconBg="#d1fae5"
                />
                <InfoCard
                    icon={Shield}
                    label="Role"
                    value={user?.role || 'Admin'}
                    iconColor="#d97706"
                    iconBg="#fef3c7"
                />
                <InfoCard
                    icon={Calendar}
                    label="Member Since"
                    value={memberSince}
                    iconColor="#2563eb"
                    iconBg="#dbeafe"
                />
                <InfoCard
                    icon={Settings}
                    label="Preferred Language"
                    value={user?.profile?.preferred_language === 'ne' ? 'Nepali' : 'English'}
                    iconColor="#7c3aed"
                    iconBg="#f5f3ff"
                />
                <InfoCard
                    icon={Bell}
                    label="Notifications"
                    value={user?.profile?.notifications_enabled ? 'Enabled' : 'Disabled'}
                    iconColor={user?.profile?.notifications_enabled ? '#059669' : '#dc2626'}
                    iconBg={user?.profile?.notifications_enabled ? '#d1fae5' : '#fee2e2'}
                />
                <InfoCard
                    icon={Briefcase}
                    label="Bio"
                    value={user?.profile?.bio || 'No bio provided'}
                    iconColor="#4f46e5"
                    iconBg="#eef2ff"
                />
                <InfoCard
                    icon={Settings}
                    label="Phone Number"
                    value={user?.profile?.phone_number || 'Not provided'}
                    iconColor="#059669"
                    iconBg="#d1fae5"
                />
                <InfoCard
                    icon={Settings}
                    label="Address"
                    value={user?.profile?.address || 'Not provided'}
                    iconColor="#7c3aed"
                    iconBg="#f5f3ff"
                />
            </View>

            {/* Settings Menu */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Settings & Support</Text>
                <View style={styles.menuContainer}>
                    <MenuItem icon={Settings} label="Account Settings" onPress={() => { }} />
                    <MenuItem icon={Bell} label="Notifications" onPress={() => { }} />
                    <MenuItem icon={HelpCircle} label="Help & Support" onPress={() => { }} />
                    <MenuItem icon={LogOut} label="Log Out" danger onPress={logout} />
                </View>
            </View>

            <View style={{ height: 40 }} />

            {/* Edit Profile Modal */}
            <Modal
                visible={isModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setIsModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Edit Profile</Text>
                            <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                                <X size={24} color="#111827" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody}>
                            {/* Avatar section */}
                            <View style={styles.editAvatarSection}>
                                <View style={styles.editableAvatar}>
                                    {formData.profile.avatar ? (
                                        <Image source={{ uri: formData.profile.avatar.uri }} style={styles.fullImage} />
                                    ) : user?.profile?.avatar ? (
                                        <Image source={{ uri: getMediaUrl(user.profile.avatar) }} style={styles.fullImage} />
                                    ) : (
                                        <Text style={styles.avatarText}>{user?.username?.charAt(0).toUpperCase() || 'U'}</Text>
                                    )}
                                    <TouchableOpacity style={styles.cameraIcon} onPress={handlePickImage}>
                                        <Camera size={20} color="white" />
                                    </TouchableOpacity>
                                </View>
                                <Text style={styles.changePhotoText}>Change Profile Photo</Text>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>First Name</Text>
                                <TextInput
                                    style={styles.input}
                                    value={formData.first_name}
                                    onChangeText={(text) => setFormData({ ...formData, first_name: text })}
                                    placeholder="First Name"
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Last Name</Text>
                                <TextInput
                                    style={styles.input}
                                    value={formData.last_name}
                                    onChangeText={(text) => setFormData({ ...formData, last_name: text })}
                                    placeholder="Last Name"
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Phone Number</Text>
                                <TextInput
                                    style={styles.input}
                                    value={formData.profile.phone_number}
                                    onChangeText={(text) => setFormData({
                                        ...formData,
                                        profile: { ...formData.profile, phone_number: text }
                                    })}
                                    placeholder="Phone Number"
                                    keyboardType="phone-pad"
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Address</Text>
                                <TextInput
                                    style={styles.input}
                                    value={formData.profile.address}
                                    onChangeText={(text) => setFormData({
                                        ...formData,
                                        profile: { ...formData.profile, address: text }
                                    })}
                                    placeholder="Address"
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Bio</Text>
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    value={formData.profile.bio}
                                    onChangeText={(text) => setFormData({
                                        ...formData,
                                        profile: { ...formData.profile, bio: text }
                                    })}
                                    placeholder="Bio"
                                    multiline={true}
                                    numberOfLines={4}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Preferred Language</Text>
                                <View style={styles.languageToggle}>
                                    <TouchableOpacity
                                        style={[styles.langChip, formData.profile.preferred_language === 'en' && styles.langChipActive]}
                                        onPress={() => setFormData({ ...formData, profile: { ...formData.profile, preferred_language: 'en' } })}
                                    >
                                        <Text style={[styles.langText, formData.profile.preferred_language === 'en' && styles.langTextActive]}>English</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.langChip, formData.profile.preferred_language === 'ne' && styles.langChipActive]}
                                        onPress={() => setFormData({ ...formData, profile: { ...formData.profile, preferred_language: 'ne' } })}
                                    >
                                        <Text style={[styles.langText, formData.profile.preferred_language === 'ne' && styles.langTextActive]}>Nepali</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={[styles.inputGroup, styles.switchGroup]}>
                                <View>
                                    <Text style={styles.inputLabel}>Push Notifications</Text>
                                    <Text style={styles.inputSubLabel}>Receive updates on project progress</Text>
                                </View>
                                <Switch
                                    value={formData.profile.notifications_enabled}
                                    onValueChange={(val) => setFormData({ ...formData, profile: { ...formData.profile, notifications_enabled: val } })}
                                    trackColor={{ false: "#d1d5db", true: "#d1fae5" }}
                                    thumbColor={formData.profile.notifications_enabled ? "#059669" : "#f1f1f1"}
                                />
                            </View>

                            <View style={{ height: 30 }} />
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={() => setIsModalVisible(false)}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.saveButton}
                                onPress={handleSave}
                                disabled={saving}
                            >
                                {saving ? (
                                    <ActivityIndicator size="small" color="white" />
                                ) : (
                                    <>
                                        <Save size={18} color="white" style={{ marginRight: 8 }} />
                                        <Text style={styles.saveButtonText}>Save Changes</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    header: {
        paddingTop: 80,
        paddingBottom: 32,
        paddingHorizontal: 24,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        shadowColor: '#059669',
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 5,
        overflow: 'hidden',
    },
    headerBgIcon: {
        position: 'absolute',
        bottom: -30,
        right: -30,
        opacity: 0.5
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.25)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: 'rgba(255,255,255,0.4)',
    },
    avatarText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: 'white',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: 37, // Slightly less than avatar container to accommodate border if needed, but the container has border
    },
    name: {
        fontSize: 22,
        fontWeight: '800',
        color: 'white',
        marginBottom: 2,
    },
    email: {
        fontSize: 13,
        color: '#d1fae5',
        marginBottom: 8,
    },
    roleBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        alignSelf: 'flex-start',
        gap: 4,
    },
    roleText: {
        color: 'white',
        fontSize: 11,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    editButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    statsSection: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginTop: -24,
        gap: 12,
    },
    statCard: {
        flex: 1,
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    statValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 11,
        color: '#6b7280',
        fontWeight: '600',
    },
    section: {
        padding: 20,
        paddingTop: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 16,
    },
    infoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 12,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOpacity: 0.03,
        shadowRadius: 5,
    },
    infoIcon: {
        width: 40,
        height: 40,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    infoContent: {
        flex: 1,
    },
    infoLabel: {
        fontSize: 12,
        color: '#6b7280',
        marginBottom: 2,
    },
    infoValue: {
        fontSize: 15,
        fontWeight: '600',
        color: '#111827',
    },
    menuContainer: {
        backgroundColor: 'white',
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOpacity: 0.03,
        shadowRadius: 5,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    menuIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 8,
        backgroundColor: '#f3f4f6',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    menuItemText: {
        flex: 1,
        fontSize: 15,
        fontWeight: '500',
        color: '#374151',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        backgroundColor: 'white',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        height: '85%',
        paddingVertical: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
    },
    modalBody: {
        padding: 24,
    },
    editAvatarSection: {
        alignItems: 'center',
        marginBottom: 24,
    },
    editableAvatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#e5e7eb',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
    },
    fullImage: {
        width: '100%',
        height: '100%',
    },
    cameraIcon: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#059669',
        padding: 8,
        borderRadius: 20,
    },
    changePhotoText: {
        marginTop: 10,
        fontSize: 12,
        fontWeight: '600',
        color: '#6b7280',
    },
    inputGroup: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#374151',
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    input: {
        backgroundColor: '#f9fafb',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 12,
        padding: 12,
        fontSize: 15,
        color: '#111827',
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    languageToggle: {
        flexDirection: 'row',
        gap: 10,
    },
    langChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#f3f4f6',
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    langChipActive: {
        backgroundColor: '#d1fae5',
        borderColor: '#059669',
    },
    langText: {
        fontSize: 14,
        color: '#4b5563',
        fontWeight: '600',
    },
    langTextActive: {
        color: '#059669',
    },
    switchGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 8,
    },
    inputSubLabel: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 2,
    },
    modalFooter: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 10,
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
        gap: 12,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        backgroundColor: '#f3f4f6',
    },
    cancelButtonText: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#4b5563',
    },
    saveButton: {
        flex: 2,
        flexDirection: 'row',
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        backgroundColor: '#059669',
    },
    saveButtonText: {
        fontSize: 15,
        fontWeight: 'bold',
        color: 'white',
    },
});
