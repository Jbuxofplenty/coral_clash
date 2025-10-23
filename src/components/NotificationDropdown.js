import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts';
import Icon from './Icon';
import Avatar from './Avatar';

const { width } = Dimensions.get('window');

/**
 * Get notification display configuration based on type
 */
const getNotificationConfig = (type) => {
    const configs = {
        friend_request: {
            title: 'Friend Request',
            getMessage: (displayName) => `${displayName || 'Someone'} wants to be your friend`,
            icon: { name: 'user-plus', family: 'font-awesome' },
            showAvatar: true,
            showActions: true,
        },
        game_request: {
            title: 'Game Request',
            getMessage: (displayName) =>
                `${displayName || 'Someone'} wants to play Coral Clash with you`,
            icon: { name: 'gamepad', family: 'font-awesome' },
            showAvatar: true,
            showActions: true,
        },
        game_accepted: {
            title: 'Game Started',
            getMessage: (displayName) => `${displayName || 'Someone'} accepted your game request`,
            icon: { name: 'check-circle', family: 'font-awesome' },
            showAvatar: true,
            showActions: false,
        },
        move_made: {
            title: 'Your Turn',
            getMessage: (displayName, result, data) => {
                // Check if it's a computer move
                if (data?.isComputer || displayName === 'Computer') {
                    return 'The computer made a move';
                }
                return `${displayName || 'Someone'} made a move`;
            },
            icon: { name: 'play-circle', family: 'font-awesome' },
            showAvatar: true,
            showActions: false,
        },
        undo_requested: {
            title: 'Undo Request',
            getMessage: (displayName, result, data) => {
                const moveCount = data?.moveCount || 1;
                return `${displayName || 'Someone'} wants to undo ${moveCount} move(s)`;
            },
            icon: { name: 'undo', family: 'MaterialIcons' },
            showAvatar: true,
            showActions: false,
        },
        undo_approved: {
            title: 'Undo Approved',
            getMessage: (displayName) => `${displayName || 'Someone'} approved your undo request`,
            icon: { name: 'check-circle', family: 'font-awesome' },
            showAvatar: true,
            showActions: false,
        },
        undo_rejected: {
            title: 'Undo Rejected',
            getMessage: (displayName) => `${displayName || 'Someone'} declined your undo request`,
            icon: { name: 'times-circle', family: 'font-awesome' },
            showAvatar: true,
            showActions: false,
        },
        undo_cancelled: {
            title: 'Request Cancelled',
            getMessage: (displayName) => `${displayName || 'Someone'} cancelled their undo request`,
            icon: { name: 'ban', family: 'font-awesome' },
            showAvatar: true,
            showActions: false,
        },
        reset_requested: {
            title: 'Reset Request',
            getMessage: (displayName) => `${displayName || 'Someone'} wants to reset the game`,
            icon: { name: 'refresh', family: 'MaterialIcons' },
            showAvatar: true,
            showActions: false,
        },
        reset_approved: {
            title: 'Reset Approved',
            getMessage: (displayName) => `${displayName || 'Someone'} approved your reset request`,
            icon: { name: 'check-circle', family: 'font-awesome' },
            showAvatar: true,
            showActions: false,
        },
        reset_rejected: {
            title: 'Reset Rejected',
            getMessage: (displayName) => `${displayName || 'Someone'} declined your reset request`,
            icon: { name: 'times-circle', family: 'font-awesome' },
            showAvatar: true,
            showActions: false,
        },
        reset_cancelled: {
            title: 'Request Cancelled',
            getMessage: (displayName) =>
                `${displayName || 'Someone'} cancelled their reset request`,
            icon: { name: 'ban', family: 'font-awesome' },
            showAvatar: true,
            showActions: false,
        },
        game_over: {
            title: 'Game Over',
            getMessage: (displayName, result) => {
                if (result?.winner) {
                    return result.winner === 'you'
                        ? 'You won!'
                        : `${displayName || 'Opponent'} won`;
                }
                return 'Game ended in a draw';
            },
            icon: { name: 'trophy', family: 'font-awesome' },
            showAvatar: true,
            showActions: false,
        },
        game_result: {
            title: 'Game Over',
            getMessage: (displayName, result, data) => {
                const opponentName = data?.opponentName || displayName || 'Your opponent';
                const reason = data?.reason || 'unknown';

                if (data?.result === 'win') {
                    if (reason === 'resignation') {
                        return `You won! ${opponentName} resigned`;
                    }
                    return `You won!`;
                } else if (data?.result === 'loss') {
                    if (reason === 'resignation') {
                        return `You lost. You resigned`;
                    }
                    return `You lost`;
                }
                return 'Game ended';
            },
            icon: { name: 'trophy', family: 'font-awesome' },
            showAvatar: true,
            showActions: false,
        },
        friend_accepted: {
            title: 'Friend Request Accepted',
            getMessage: (displayName) => `${displayName || 'Someone'} accepted your friend request`,
            icon: { name: 'check-circle', family: 'font-awesome' },
            showAvatar: true,
            showActions: false,
        },
        reset_requested: {
            title: 'Reset Game Request',
            getMessage: (displayName) => `${displayName || 'Someone'} wants to reset the game`,
            icon: { name: 'refresh', family: 'font-awesome' },
            showAvatar: true,
            showActions: true,
        },
        reset_approved: {
            title: 'Reset Approved',
            getMessage: (displayName) => `${displayName || 'Someone'} approved the game reset`,
            icon: { name: 'check-circle', family: 'font-awesome' },
            showAvatar: true,
            showActions: false,
        },
        reset_rejected: {
            title: 'Reset Rejected',
            getMessage: (displayName) => `${displayName || 'Someone'} rejected the game reset`,
            icon: { name: 'times-circle', family: 'font-awesome' },
            showAvatar: true,
            showActions: false,
        },
        undo_requested: {
            title: 'Undo Request',
            getMessage: (displayName, result, data) => {
                const moveCount = data?.moveCount || 1;
                const moveText = moveCount === 1 ? 'move' : 'moves';
                return `${displayName || 'Someone'} wants to undo ${moveCount} ${moveText}`;
            },
            icon: { name: 'undo', family: 'font-awesome' },
            showAvatar: true,
            showActions: true,
        },
        undo_approved: {
            title: 'Undo Approved',
            getMessage: (displayName, result, data) => {
                const moveCount = data?.moveCount || 1;
                const moveText = moveCount === 1 ? 'move' : 'moves';
                return `${displayName || 'Someone'} approved undoing ${moveCount} ${moveText}`;
            },
            icon: { name: 'check-circle', family: 'font-awesome' },
            showAvatar: true,
            showActions: false,
        },
        undo_rejected: {
            title: 'Undo Rejected',
            getMessage: (displayName, result, data) => {
                const moveCount = data?.moveCount || 1;
                const moveText = moveCount === 1 ? 'move' : 'moves';
                return `${displayName || 'Someone'} rejected undoing ${moveCount} ${moveText}`;
            },
            icon: { name: 'times-circle', family: 'font-awesome' },
            showAvatar: true,
            showActions: false,
        },
    };

    return (
        configs[type] || {
            title: 'Notification',
            getMessage: () => 'You have a new notification',
            icon: { name: 'bell', family: 'font-awesome' },
            showAvatar: false,
            showActions: false,
        }
    );
};

/**
 * Generic notification dropdown that appears at the top of the screen
 * Automatically dismisses after a timeout
 * Supports multiple notification types with custom actions
 *
 * @param {Object} notification - Notification data object
 * @param {string} notification.displayName - Display name to show
 * @param {string} notification.avatarKey - Avatar key for display
 * @param {Object} notification.data - Additional notification data
 * @param {string} notification.data.type - Type of notification (friend_request, game_request, move_made, etc.)
 * @param {Function} onAccept - Optional callback for accept action
 * @param {Function} onDecline - Optional callback for decline action
 * @param {Function} onDismiss - Callback when notification is dismissed
 * @param {Function} onTap - Optional callback when notification body is tapped
 */
export default function NotificationDropdown({
    notification,
    onAccept,
    onDecline,
    onDismiss,
    onTap,
}) {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const slideAnim = React.useRef(new Animated.Value(-200)).current;

    const notificationType = notification?.data?.type || 'friend_request';
    const config = getNotificationConfig(notificationType);

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

    const handleTap = () => {
        if (onTap) {
            handleDismiss();
            setTimeout(() => onTap(notification), 300);
        }
    };

    if (!notification) return null;

    const message = config.getMessage(
        notification.displayName,
        notification.data?.result,
        notification.data,
    );

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
                <TouchableOpacity
                    activeOpacity={onTap ? 0.7 : 1}
                    onPress={onTap ? handleTap : undefined}
                    style={styles.mainContent}
                >
                    {config.showAvatar && notification.avatarKey && (
                        <Avatar
                            avatarKey={notification.avatarKey}
                            size='medium'
                            style={styles.avatar}
                        />
                    )}

                    {!config.showAvatar && config.icon && (
                        <View
                            style={[
                                styles.iconContainer,
                                { backgroundColor: colors.PRIMARY + '15' },
                            ]}
                        >
                            <Icon
                                name={config.icon.name}
                                family={config.icon.family}
                                size={24}
                                color={colors.PRIMARY}
                            />
                        </View>
                    )}

                    <View style={styles.textContent}>
                        <Text style={[styles.title, { color: colors.TEXT }]} numberOfLines={1}>
                            {config.title}
                        </Text>
                        <Text
                            style={[styles.message, { color: colors.TEXT_SECONDARY }]}
                            numberOfLines={2}
                        >
                            {message}
                        </Text>
                    </View>
                </TouchableOpacity>

                {/* Action buttons - only show if needed */}
                {config.showActions && onAccept && onDecline && (
                    <View style={styles.actions}>
                        <TouchableOpacity
                            onPress={handleDecline}
                            style={[styles.button, { backgroundColor: colors.ERROR + '15' }]}
                        >
                            <Icon
                                name='times'
                                family='font-awesome'
                                size={16}
                                color={colors.ERROR}
                            />
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={handleAccept}
                            style={[
                                styles.button,
                                { backgroundColor: colors.SUCCESS + '15', marginLeft: 8 },
                            ]}
                        >
                            <Icon
                                name='check'
                                family='font-awesome'
                                size={16}
                                color={colors.SUCCESS}
                            />
                        </TouchableOpacity>
                    </View>
                )}
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
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
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
