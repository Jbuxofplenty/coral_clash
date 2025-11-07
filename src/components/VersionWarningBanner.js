import React, { useCallback, useEffect, useRef } from 'react';
import {
    Animated,
    Dimensions,
    Linking,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { moderateScale, verticalScale } from 'react-native-size-matters';

const { width } = Dimensions.get('screen');
const isTablet = width >= 768;

/**
 * Animated dropdown toast to display version mismatch warnings
 * Shows when client version is outdated compared to server
 * Auto-dismisses after 10 seconds
 */
export const VersionWarningBanner = ({ visible, onDismiss }) => {
    const slideAnim = useRef(new Animated.Value(-200)).current;
    const dismissTimerRef = useRef(null);

    const handleDismiss = useCallback(() => {
        // Slide up first, then call onDismiss
        Animated.timing(slideAnim, {
            toValue: -200,
            duration: 300,
            useNativeDriver: true,
        }).start(() => {
            if (dismissTimerRef.current) {
                clearTimeout(dismissTimerRef.current);
            }
            onDismiss();
        });
    }, [slideAnim, onDismiss]);

    useEffect(() => {
        if (visible) {
            // Clear any existing timer
            if (dismissTimerRef.current) {
                clearTimeout(dismissTimerRef.current);
            }

            // Slide down animation
            Animated.spring(slideAnim, {
                toValue: 0,
                tension: 50,
                friction: 8,
                useNativeDriver: true,
            }).start();

            // Auto-dismiss after 10 seconds
            dismissTimerRef.current = setTimeout(() => {
                handleDismiss();
            }, 10000);
        } else {
            // Slide up animation
            Animated.timing(slideAnim, {
                toValue: -200,
                duration: 300,
                useNativeDriver: true,
            }).start();
        }

        // Cleanup timer on unmount
        return () => {
            if (dismissTimerRef.current) {
                clearTimeout(dismissTimerRef.current);
            }
        };
    }, [visible, slideAnim, handleDismiss]);

    const openAppStore = () => {
        const storeUrl =
            Platform.OS === 'ios'
                ? 'https://apps.apple.com/app/coral-clash/YOUR_APP_ID' // Replace with actual App Store ID
                : 'https://play.google.com/store/apps/details?id=com.coralclash';
        Linking.openURL(storeUrl);
    };

    if (!visible) return null;

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    transform: [{ translateY: slideAnim }],
                },
            ]}
        >
            <View style={styles.banner}>
                <View style={styles.iconContainer}>
                    <Text style={styles.icon}>⚠️</Text>
                </View>
                <View style={styles.content}>
                    <Text style={styles.title}>Update Available</Text>
                    <Text style={styles.message}>
                        Please update to the latest version for the best experience.
                    </Text>
                </View>
                <View style={styles.buttonContainer}>
                    <TouchableOpacity style={styles.updateButton} onPress={openAppStore}>
                        <Text style={styles.updateButtonText}>Update</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.dismissButton} onPress={handleDismiss}>
                        <Text style={styles.dismissButtonText}>✕</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        paddingTop: Platform.OS === 'ios' ? verticalScale(50) : verticalScale(10), // Account for status bar
    },
    banner: {
        backgroundColor: '#FFF3CD',
        borderLeftWidth: isTablet ? moderateScale(3) : moderateScale(4),
        borderLeftColor: '#FFC107',
        padding: isTablet ? moderateScale(20) : moderateScale(16),
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        elevation: 8,
        marginHorizontal: isTablet ? moderateScale(32) : moderateScale(16),
        borderRadius: isTablet ? moderateScale(12) : moderateScale(8),
    },
    iconContainer: {
        marginRight: isTablet ? moderateScale(16) : moderateScale(12),
    },
    icon: {
        fontSize: isTablet ? moderateScale(32) : moderateScale(24),
    },
    content: {
        flex: 1,
        marginRight: isTablet ? moderateScale(16) : moderateScale(12),
    },
    title: {
        fontSize: isTablet ? moderateScale(20) : moderateScale(16),
        fontWeight: 'bold',
        color: '#856404',
        marginBottom: moderateScale(4),
    },
    message: {
        fontSize: isTablet ? moderateScale(16) : moderateScale(13),
        color: '#856404',
        lineHeight: isTablet ? moderateScale(22) : moderateScale(18),
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: isTablet ? moderateScale(12) : moderateScale(8),
        alignItems: 'center',
    },
    updateButton: {
        backgroundColor: '#FFC107',
        paddingHorizontal: isTablet ? moderateScale(24) : moderateScale(16),
        paddingVertical: isTablet ? moderateScale(12) : moderateScale(8),
        borderRadius: isTablet ? moderateScale(8) : moderateScale(6),
        alignItems: 'center',
    },
    updateButtonText: {
        color: '#000',
        fontWeight: 'bold',
        fontSize: isTablet ? moderateScale(18) : moderateScale(14),
    },
    dismissButton: {
        paddingHorizontal: isTablet ? moderateScale(12) : moderateScale(8),
        paddingVertical: isTablet ? moderateScale(12) : moderateScale(8),
        borderRadius: isTablet ? moderateScale(6) : moderateScale(4),
        alignItems: 'center',
        justifyContent: 'center',
    },
    dismissButtonText: {
        color: '#856404',
        fontSize: isTablet ? moderateScale(24) : moderateScale(20),
        fontWeight: 'bold',
    },
});

export default VersionWarningBanner;
