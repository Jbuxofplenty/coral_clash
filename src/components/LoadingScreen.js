import { Block, Text } from 'galio-framework';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useTheme } from '../contexts';
import Icon from './Icon';

/**
 * Reusable loading screen component that can be customized per screen
 *
 * USAGE EXAMPLES:
 *
 * // Basic loading screen
 * <LoadingScreen />
 *
 * // With custom message
 * <LoadingScreen message="Loading friends..." />
 *
 * // With icon and message (Friends screen)
 * <LoadingScreen iconName='users' message='Loading friends...' />
 *
 * // With different icon (Settings screen)
 * <LoadingScreen iconName='cog' message='Loading settings...' />
 *
 * // Custom colors and sizes
 * <LoadingScreen
 *   iconName='gamepad'
 *   iconSize={60}
 *   iconColor='#ff6b6b'
 *   spinnerSize='small'
 *   spinnerColor='#4ecdc4'
 *   message='Loading game...'
 * />
 *
 * // Without background circle (simpler look)
 * <LoadingScreen showSpinnerBackground={false} message='Please wait...' />
 *
 * @param {Object} props
 * @param {string} props.message - Optional loading message to display
 * @param {string} props.iconName - Optional icon to show above spinner (font-awesome)
 * @param {string} props.iconFamily - Icon family (default: 'font-awesome')
 * @param {number} props.iconSize - Icon size (default: 48)
 * @param {string} props.iconColor - Icon color (defaults to theme PRIMARY)
 * @param {string} props.spinnerSize - ActivityIndicator size: 'small' or 'large' (default: 'large')
 * @param {string} props.spinnerColor - Spinner color (defaults to theme PRIMARY)
 * @param {Object} props.style - Additional container styles
 * @param {boolean} props.transparent - Use transparent background (default: false)
 * @param {boolean} props.showSpinnerBackground - Show background circle behind spinner for better contrast (default: true)
 */
export default function LoadingScreen({
    message,
    iconName,
    iconFamily = 'font-awesome',
    iconSize = 48,
    iconColor,
    spinnerSize = 'large',
    spinnerColor,
    style,
    transparent = false,
    showSpinnerBackground = true,
}) {
    const { colors, isDarkMode: _isDarkMode } = useTheme();

    const finalSpinnerColor = spinnerColor || colors.PRIMARY;
    const finalIconColor = iconColor || colors.PRIMARY;
    const backgroundColor = transparent ? 'transparent' : colors.BACKGROUND;

    return (
        <View style={[styles.container, { backgroundColor }, style]}>
            <Block center middle>
                {iconName && (
                    <Block style={styles.iconContainer}>
                        <Icon
                            name={iconName}
                            family={iconFamily}
                            size={iconSize}
                            color={finalIconColor}
                        />
                    </Block>
                )}

                {showSpinnerBackground ? (
                    <View
                        style={[
                            styles.spinnerBackground,
                            {
                                backgroundColor: colors.CARD_BACKGROUND,
                                shadowColor: colors.SHADOW,
                            },
                        ]}
                    >
                        <ActivityIndicator size={spinnerSize} color={finalSpinnerColor} />
                    </View>
                ) : (
                    <ActivityIndicator
                        size={spinnerSize}
                        color={finalSpinnerColor}
                        style={styles.spinner}
                    />
                )}

                {message && (
                    <Text size={14} color={colors.TEXT_SECONDARY} style={styles.message}>
                        {message}
                    </Text>
                )}
            </Block>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconContainer: {
        marginBottom: 20,
    },
    spinner: {
        marginVertical: 10,
    },
    spinnerBackground: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginVertical: 10,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    message: {
        marginTop: 16,
        textAlign: 'center',
        paddingHorizontal: 40,
    },
});
