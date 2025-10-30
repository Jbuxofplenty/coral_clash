import React, { useState } from 'react';
import { ActivityIndicator, Image, View } from 'react-native';
import { moderateScale, scale } from 'react-native-size-matters';
import { DEFAULT_AVATARS, DEFAULT_AVATAR_NAME } from '../constants/avatars';
import { useAuth, useTheme } from '../contexts';
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
    const [imageLoaded, setImageLoaded] = useState(false);

    // Get avatar key from props or user data (only if not computer)
    // If avatarKey is explicitly undefined (not passed), use current user's avatar
    // If avatarKey is explicitly passed (even if null/empty), use it or default
    const finalAvatarKey =
        avatarKey !== undefined
            ? avatarKey || DEFAULT_AVATAR_NAME
            : user?.settings?.avatarKey || DEFAULT_AVATAR_NAME;
    const avatarSource = DEFAULT_AVATARS[finalAvatarKey] || DEFAULT_AVATARS[DEFAULT_AVATAR_NAME];

    // Size configurations
    const sizeConfig = {
        small: { container: moderateScale(36), image: moderateScale(28), border: scale(2) },
        medium: { container: moderateScale(44), image: moderateScale(36), border: scale(2) },
        large: { container: moderateScale(60), image: moderateScale(48), border: scale(2) },
        xlarge: { container: moderateScale(80), image: moderateScale(64), border: scale(3) },
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
                <>
                    {!imageLoaded && (
                        <ActivityIndicator
                            size='small'
                            color={colors.PRIMARY}
                            style={{ position: 'absolute' }}
                        />
                    )}
                    <Image
                        source={avatarSource}
                        style={[avatarImageStyle, imageStyle, { opacity: imageLoaded ? 1 : 0 }]}
                        resizeMode='contain'
                        fadeDuration={0}
                        onLoadEnd={() => setImageLoaded(true)}
                    />
                </>
            )}
        </View>
    );
}
