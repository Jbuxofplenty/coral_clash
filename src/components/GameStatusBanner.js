import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { moderateScale, scale } from 'react-native-size-matters';
import { useTheme } from '../contexts';
import Icon from './Icon';

/**
 * GameStatusBanner - Unified banner component for displaying game status messages
 * @param {Object} props
 * @param {string} props.message - The message to display
 * @param {string} props.type - Type of status: 'win', 'lose', 'draw', 'resign', 'check', 'info', 'success', 'error'
 * @param {boolean} props.visible - Whether the banner should be visible (default: true)
 * @param {number} props.timeout - Auto-dismiss after this many ms (0 = no auto-dismiss)
 * @param {function} props.onDismiss - Callback when banner is dismissed
 */
const GameStatusBanner = ({ message, type = 'info', visible = true, timeout = 0, onDismiss }) => {
    const { colors } = useTheme();

    // Auto-dismiss after timeout
    useEffect(() => {
        if (visible && timeout > 0 && onDismiss) {
            const timer = setTimeout(() => {
                onDismiss();
            }, timeout);

            return () => clearTimeout(timer);
        }
    }, [visible, timeout, onDismiss]);

    if (!visible || !message) {
        return null;
    }

    // Map status types to icon and color
    const getStatusConfig = () => {
        switch (type) {
            case 'win':
                return {
                    icon: 'trophy',
                    iconColor: colors.SUCCESS,
                    iconBg: colors.SUCCESS + '15',
                };
            case 'lose':
                return {
                    icon: 'times-circle',
                    iconColor: colors.ERROR,
                    iconBg: colors.ERROR + '15',
                };
            case 'timeout_win':
                return {
                    icon: 'clock-o',
                    iconColor: colors.SUCCESS,
                    iconBg: colors.SUCCESS + '15',
                };
            case 'timeout_lose':
                return {
                    icon: 'clock-o',
                    iconColor: colors.ERROR,
                    iconBg: colors.ERROR + '15',
                };
            case 'resign':
                return {
                    icon: 'flag',
                    iconColor: colors.ERROR,
                    iconBg: colors.ERROR + '15',
                };
            case 'draw':
                return {
                    icon: 'handshake-o',
                    iconColor: colors.TEXT_SECONDARY,
                    iconBg: colors.TEXT_SECONDARY + '15',
                };
            case 'check':
                return {
                    icon: 'exclamation-triangle',
                    iconColor: colors.WARNING,
                    iconBg: colors.WARNING + '15',
                };
            case 'success':
                return {
                    icon: 'check-circle',
                    iconColor: colors.SUCCESS,
                    iconBg: colors.SUCCESS + '15',
                };
            case 'error':
                return {
                    icon: 'times-circle',
                    iconColor: colors.ERROR,
                    iconBg: colors.ERROR + '15',
                };
            default:
                return {
                    icon: 'info-circle',
                    iconColor: colors.INFO,
                    iconBg: colors.INFO + '15',
                };
        }
    };

    const config = getStatusConfig();

    return (
        <View
            style={[
                styles.statusBanner,
                {
                    backgroundColor: colors.INPUT,
                    marginVertical: scale(5),
                    paddingVertical: scale(10),
                    paddingHorizontal: scale(16),
                },
            ]}
        >
            <View
                style={[
                    styles.iconContainer,
                    {
                        backgroundColor: config.iconBg,
                        width: scale(40),
                        height: scale(40),
                        borderRadius: scale(20),
                        marginRight: scale(12),
                    },
                ]}
            >
                <Icon
                    name={config.icon}
                    family='font-awesome'
                    size={moderateScale(18)}
                    color={config.iconColor}
                />
            </View>
            <Text
                style={[
                    styles.statusText,
                    {
                        color: colors.TEXT,
                        fontSize: moderateScale(13),
                    },
                ]}
            >
                {message}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    statusBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
    },
    iconContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    statusText: {
        fontWeight: '600',
        flex: 1,
    },
});

export default GameStatusBanner;
