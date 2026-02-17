import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const PriceCard = ({ title, amount, subtitle, icon: Icon, gradient = ['#6366f1', '#8b5cf6'], trend }) => {
    const formatCurrency = (val) => {
        if (!val && val !== 0) return 'N/A';
        return `Rs. ${parseFloat(val).toLocaleString('en-NP', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    return (
        <LinearGradient colors={gradient} style={styles.container} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View style={styles.header}>
                {Icon && (
                    <View style={styles.iconContainer}>
                        <Icon color="white" size={24} />
                    </View>
                )}
                <Text style={styles.title}>{title}</Text>
            </View>
            <Text style={styles.amount}>{formatCurrency(amount)}</Text>
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            {trend && (
                <View style={styles.trendContainer}>
                    <Text style={styles.trend}>{trend}</Text>
                </View>
            )}
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    title: {
        fontSize: 14,
        fontWeight: '500',
        color: 'rgba(255, 255, 255, 0.9)',
        flex: 1,
    },
    amount: {
        fontSize: 28,
        fontWeight: '700',
        color: 'white',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.8)',
    },
    trendContainer: {
        marginTop: 8,
        alignSelf: 'flex-start',
    },
    trend: {
        fontSize: 12,
        fontWeight: '600',
        color: 'rgba(255, 255, 255, 0.9)',
    },
});

export default PriceCard;
