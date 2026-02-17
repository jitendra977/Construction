import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const StatusBadge = ({ status, type = 'phase' }) => {
    const getStatusConfig = () => {
        if (type === 'phase') {
            switch (status) {
                case 'COMPLETED':
                    return { bg: '#d1fae5', text: '#065f46', label: 'Completed' };
                case 'IN_PROGRESS':
                    return { bg: '#dbeafe', text: '#1e40af', label: 'In Progress' };
                case 'PENDING':
                    return { bg: '#fef3c7', text: '#92400e', label: 'Pending' };
                case 'HALTED':
                    return { bg: '#fee2e2', text: '#991b1b', label: 'Halted' };
                default:
                    return { bg: '#f3f4f6', text: '#6b7280', label: status };
            }
        } else if (type === 'permit') {
            switch (status) {
                case 'APPROVED':
                    return { bg: '#d1fae5', text: '#065f46', label: 'Approved' };
                case 'IN_PROGRESS':
                    return { bg: '#dbeafe', text: '#1e40af', label: 'In Progress' };
                case 'PENDING':
                    return { bg: '#fef3c7', text: '#92400e', label: 'Pending' };
                case 'REJECTED':
                    return { bg: '#fee2e2', text: '#991b1b', label: 'Rejected' };
                default:
                    return { bg: '#f3f4f6', text: '#6b7280', label: status };
            }
        } else if (type === 'payment') {
            switch (status) {
                case 'PAID':
                    return { bg: '#d1fae5', text: '#065f46', label: 'Paid' };
                case 'PARTIAL':
                    return { bg: '#fef3c7', text: '#92400e', label: 'Partial' };
                case 'UNPAID':
                    return { bg: '#fee2e2', text: '#991b1b', label: 'Unpaid' };
                default:
                    return { bg: '#f3f4f6', text: '#6b7280', label: status };
            }
        } else if (type === 'transaction') {
            switch (status) {
                case 'RECEIVED':
                    return { bg: '#d1fae5', text: '#065f46', label: 'Received' };
                case 'PENDING':
                    return { bg: '#fef3c7', text: '#92400e', label: 'Pending' };
                case 'CANCELLED':
                    return { bg: '#fee2e2', text: '#991b1b', label: 'Cancelled' };
                default:
                    return { bg: '#f3f4f6', text: '#6b7280', label: status };
            }
        }
        return { bg: '#f3f4f6', text: '#6b7280', label: status };
    };

    const config = getStatusConfig();

    return (
        <View style={[styles.container, { backgroundColor: config.bg }]}>
            <Text style={[styles.text, { color: config.text }]}>{config.label}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        alignSelf: 'flex-start',
    },
    text: {
        fontSize: 12,
        fontWeight: '600',
    },
});

export default StatusBadge;
