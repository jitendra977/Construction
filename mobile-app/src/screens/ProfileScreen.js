import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { LogOut, User } from 'lucide-react-native';

export default function ProfileScreen() {
    const { user, logout } = useAuth();

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
                    <View>
                        <Text style={styles.name}>{user?.username || 'User'}</Text>
                        <Text style={styles.email}>{user?.email || 'No email provided'}</Text>
                        <View style={styles.roleBadge}>
                            <Text style={styles.roleText}>{user?.role || 'Admin'}</Text>
                        </View>
                    </View>
                </View>
            </LinearGradient>

            <View style={styles.section}>
                <TouchableOpacity style={styles.logoutButton} onPress={logout}>
                    <LogOut color="#ef4444" size={20} />
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f3f4f6',
    },
    header: {
        paddingTop: 60,
        paddingBottom: 40,
        paddingHorizontal: 30,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        shadowColor: '#059669',
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 5,
        overflow: 'hidden',
    },
    headerBgIcon: { position: 'absolute', bottom: -30, right: -30, opacity: 0.5 },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20,
    },
    avatar: {
        width: 70, height: 70,
        borderRadius: 35,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    avatarText: {
        fontSize: 28,
        fontWeight: 'bold',
        color: 'white',
    },
    name: {
        fontSize: 24,
        fontWeight: '800',
        color: 'white',
    },
    email: {
        fontSize: 14,
        color: '#e0e7ff',
        marginTop: 2,
    },
    roleBadge: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        alignSelf: 'flex-start',
        marginTop: 8,
    },
    roleText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    section: {
        padding: 20,
        marginTop: 10,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    logoutText: {
        marginLeft: 15,
        fontSize: 16,
        color: '#ef4444',
        fontWeight: 'bold',
    },
});
