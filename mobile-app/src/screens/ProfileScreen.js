import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { LogOut, User, Mail, Shield, Calendar, Edit, Settings, Bell, HelpCircle, ChevronRight, Briefcase } from 'lucide-react-native';

export default function ProfileScreen() {
    const { user, logout, dashboardData } = useAuth();

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
                        <Text style={styles.avatarText}>{user?.username?.charAt(0).toUpperCase() || 'U'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.name}>{user?.username || 'User'}</Text>
                        <Text style={styles.email}>{user?.email || 'No email provided'}</Text>
                        <View style={styles.roleBadge}>
                            <Shield size={12} color="white" />
                            <Text style={styles.roleText}>{user?.role || 'Admin'}</Text>
                        </View>
                    </View>
                    <TouchableOpacity style={styles.editButton}>
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
                    label="Username"
                    value={user?.username || 'N/A'}
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
                    icon={Briefcase}
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
});
