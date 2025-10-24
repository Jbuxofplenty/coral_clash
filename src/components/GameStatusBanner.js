import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts';
import Icon from './Icon';

/**
 * GameStatusBanner - Unified banner component for displaying game status messages
 * Now uses consistent styling with undo/reset banners
 * @param {Object} props
 * @param {string} props.message - The message to display
 * @param {string} props.type - Type of status: 'win', 'lose', 'draw', 'resign', 'check', 'info'
 * @param {boolean} props.visible - Whether the banner should be visible (default: true)
 */
const GameStatusBanner = ({ message, type = 'info', visible = true }) => {
    const { colors } = useTheme();

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
        <View style={[styles.statusBanner, { backgroundColor: colors.INPUT }]}>
            <View style={[styles.iconContainer, { backgroundColor: config.iconBg }]}>
                <Icon name={config.icon} family='font-awesome' size={20} color={config.iconColor} />
            </View>
            <Text style={[styles.statusText, { color: colors.TEXT }]}>{message}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    statusBanner: {
        marginTop: 8,
        paddingVertical: 14,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    statusText: {
        fontSize: 15,
        fontWeight: '600',
        flex: 1,
    },
});

export default GameStatusBanner;
