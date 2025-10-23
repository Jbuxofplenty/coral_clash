import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { useAuth, useTheme } from '../contexts';
import { DEFAULT_AVATARS, DEFAULT_AVATAR_NAME } from '../constants/avatars';
import Icon from './Icon';

/**
 * Avatar component with consistent styling across the app
 * @param {Object} props
 * @param {string} props.avatarKey - The avatar key to display (optional, defaults to user's avatar)
 * @param {boolean} props.computer - Whether to display a computer icon instead of avatar
 * @param {number} props.size - Size preset: 'small' (36), 'medium' (44), 'large' (60), 'xlarge' (80)
 * @param {Object} props.style - Additional container styles
 * @param {Object} props.imageStyle - Additional image styles
 * @param {boolean} props.showBorder - Whether to show border (default: true)
 */
export default function Avatar({
    avatarKey,
    computer = false,
    size = 'medium',
    style,
    imageStyle,
    showBorder = true,
}) {
    const { user } = useAuth();
    const { colors } = useTheme();

    // Get avatar key from props or user data (only if not computer)
    const finalAvatarKey =
        avatarKey || user?.avatarKey || user?.settings?.avatarKey || DEFAULT_AVATAR_NAME;
    const avatarSource = DEFAULT_AVATARS[finalAvatarKey] || DEFAULT_AVATARS[DEFAULT_AVATAR_NAME];

    // Size configurations
    const sizeConfig = {
        small: { container: 36, image: 28, border: 2 },
        medium: { container: 44, image: 36, border: 2 },
        large: { container: 60, image: 48, border: 2 },
        xlarge: { container: 80, image: 64, border: 3 },
    };

    const config = sizeConfig[size] || sizeConfig.medium;

    const containerStyle = {
        width: config.container,
        height: config.container,
        borderRadius: 0,
        borderWidth: showBorder ? config.border : 0,
        borderColor: showBorder ? colors.BORDER_COLOR : 'transparent',
        backgroundColor: colors.CARD_BACKGROUND,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    };

    const avatarImageStyle = {
        width: config.image,
        height: config.image,
    };

    return (
        <View style={[containerStyle, style]}>
            {computer ? (
                <Icon
                    name='desktop'
                    family='font-awesome'
                    size={config.image * 0.7}
                    color={colors.PRIMARY}
                />
            ) : (
                <Image
                    source={avatarSource}
                    style={[avatarImageStyle, imageStyle]}
                    resizeMode='contain'
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    // No styles needed as everything is dynamic
});
