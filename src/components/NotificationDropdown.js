import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import Icon from './Icon';
import Avatar from './Avatar';

const { width } = Dimensions.get('window');

/**
 * Notification dropdown that appears at the top of the screen
 * Automatically dismisses after a timeout
 */
export default function NotificationDropdown({ notification, onAccept, onDecline, onDismiss }) {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const slideAnim = React.useRef(new Animated.Value(-200)).current;

    useEffect(() => {
        if (notification) {
            // Slide in
            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
                tension: 65,
                friction: 8,
            }).start();

            // Auto dismiss after 5 seconds
            const timer = setTimeout(() => {
                handleDismiss();
            }, 5000);

            return () => clearTimeout(timer);
        }
    }, [notification]);

    const handleDismiss = () => {
        Animated.timing(slideAnim, {
            toValue: -200,
            duration: 300,
            useNativeDriver: true,
        }).start(() => {
            onDismiss?.();
        });
    };

    const handleAccept = () => {
        handleDismiss();
        setTimeout(() => onAccept?.(notification), 300);
    };

    const handleDecline = () => {
        handleDismiss();
        setTimeout(() => onDecline?.(notification), 300);
    };

    if (!notification) return null;

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    paddingTop: insets.top + 10,
                    backgroundColor: colors.CARD_BACKGROUND,
                    shadowColor: colors.SHADOW,
                    transform: [{ translateY: slideAnim }],
                },
            ]}
        >
            <View style={styles.content}>
                {/* Close button */}
                <TouchableOpacity
                    onPress={handleDismiss}
                    style={styles.closeButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Icon
                        name='times'
                        family='font-awesome'
                        size={16}
                        color={colors.TEXT_SECONDARY}
                    />
                </TouchableOpacity>

                {/* Notification content */}
                <View style={styles.mainContent}>
                    <Avatar
                        avatarKey={notification.avatarKey}
                        size='medium'
                        style={styles.avatar}
                    />

                    <View style={styles.textContent}>
                        <Text style={[styles.title, { color: colors.TEXT }]} numberOfLines={1}>
                            Friend Request
                        </Text>
                        <Text
                            style={[styles.message, { color: colors.TEXT_SECONDARY }]}
                            numberOfLines={2}
                        >
                            {notification.displayName || 'Someone'} wants to be your friend
                        </Text>
                    </View>
                </View>

                {/* Action buttons */}
                <View style={styles.actions}>
                    <TouchableOpacity
                        onPress={handleDecline}
                        style={[styles.button, { backgroundColor: colors.ERROR + '15' }]}
                    >
                        <Icon name='times' family='font-awesome' size={16} color={colors.ERROR} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={handleAccept}
                        style={[
                            styles.button,
                            { backgroundColor: colors.SUCCESS + '15', marginLeft: 8 },
                        ]}
                    >
                        <Icon name='check' family='font-awesome' size={16} color={colors.SUCCESS} />
                    </TouchableOpacity>
                </View>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        paddingHorizontal: 16,
        paddingBottom: 12,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 10,
    },
    content: {
        position: 'relative',
    },
    closeButton: {
        position: 'absolute',
        top: 0,
        right: 0,
        zIndex: 1,
        padding: 8,
    },
    mainContent: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        paddingRight: 32,
    },
    avatar: {
        marginRight: 12,
    },
    textContent: {
        flex: 1,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    message: {
        fontSize: 14,
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    button: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
