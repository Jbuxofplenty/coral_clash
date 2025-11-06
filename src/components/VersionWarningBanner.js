import React from 'react';
import { View, Text, StyleSheet, Linking, Platform, TouchableOpacity } from 'react-native';

/**
 * Banner component to display version mismatch warnings
 * Shows when client version is outdated compared to server
 */
export const VersionWarningBanner = ({ visible, onDismiss }) => {
    if (!visible) return null;

    const openAppStore = () => {
        const storeUrl =
            Platform.OS === 'ios'
                ? 'https://apps.apple.com/app/coral-clash/YOUR_APP_ID' // Replace with actual App Store ID
                : 'https://play.google.com/store/apps/details?id=com.coralclash';
        Linking.openURL(storeUrl);
    };

    return (
        <View style={styles.banner}>
            <View style={styles.iconContainer}>
                <Text style={styles.icon}>⚠️</Text>
            </View>
            <View style={styles.content}>
                <Text style={styles.title}>Update Available</Text>
                <Text style={styles.message}>
                    Please update to the latest version for the best experience and to avoid gameplay
                    issues.
                </Text>
            </View>
            <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.updateButton} onPress={openAppStore}>
                    <Text style={styles.updateButtonText}>Update</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
                    <Text style={styles.dismissButtonText}>Dismiss</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    banner: {
        backgroundColor: '#FFF3CD',
        borderLeftWidth: 4,
        borderLeftColor: '#FFC107',
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
        marginHorizontal: 16,
        marginVertical: 8,
        borderRadius: 8,
    },
    iconContainer: {
        marginRight: 12,
    },
    icon: {
        fontSize: 24,
    },
    content: {
        flex: 1,
        marginRight: 12,
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#856404',
        marginBottom: 4,
    },
    message: {
        fontSize: 14,
        color: '#856404',
        lineHeight: 20,
    },
    buttonContainer: {
        flexDirection: 'column',
        gap: 8,
    },
    updateButton: {
        backgroundColor: '#FFC107',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 4,
        minWidth: 80,
        alignItems: 'center',
    },
    updateButtonText: {
        color: '#000',
        fontWeight: 'bold',
        fontSize: 14,
    },
    dismissButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 4,
        minWidth: 80,
        alignItems: 'center',
    },
    dismissButtonText: {
        color: '#856404',
        fontSize: 14,
    },
});

export default VersionWarningBanner;

