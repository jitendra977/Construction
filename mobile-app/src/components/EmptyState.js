import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

const EmptyState = ({ icon, title, message, action }) => {
    return (
        <View style={styles.container}>
            <View style={styles.iconContainer}>
                <Text style={styles.iconText}>{icon || '📭'}</Text>
            </View>
            <Text style={styles.title}>{title || 'No Data'}</Text>
            {message && <Text style={styles.message}>{message}</Text>}
            {action && <View style={styles.actionContainer}>{action}</View>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        paddingVertical: 60,
    },
    iconContainer: {
        marginBottom: 16,
    },
    iconText: {
        fontSize: 64,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 8,
        textAlign: 'center',
    },
    message: {
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    actionContainer: {
        marginTop: 8,
    },
});

export default EmptyState;
