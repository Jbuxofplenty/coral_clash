import { Block, Text, theme } from 'galio-framework';
import React from 'react';
import {
    ActivityIndicator,
    Dimensions,
    StyleSheet,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import { moderateScale, verticalScale } from 'react-native-size-matters';
import { useTheme } from '../contexts';
import Icon from './Icon';

const { width } = Dimensions.get('screen');

/**
 * GameModeCard - A card component for displaying game mode options
 * @param {Object} props
 * @param {string} props.title - The title of the game mode
 * @param {string} props.description - Description text
 * @param {string} props.icon - Icon name
 * @param {string} props.iconFamily - Icon family (font-awesome, etc)
 * @param {Function} props.onPress - Handler for when card is pressed
 * @param {boolean} props.disabled - Whether the card is disabled
 * @param {boolean} props.loading - Whether the card is in loading state
 * @param {boolean} props.horizontal - Whether to use horizontal layout (like PlayWithFriendCard)
 * @param {Object} props.style - Additional styles
 */
function GameModeCard({
    title,
    description,
    icon,
    iconFamily,
    onPress,
    disabled,
    loading,
    horizontal,
    style,
}) {
    const { colors } = useTheme();

    // Horizontal layout (similar to PlayWithFriendCard)
    if (horizontal) {
        return (
            <TouchableOpacity
                onPress={onPress}
                disabled={disabled || loading}
                activeOpacity={0.8}
                style={[
                    styles.horizontalCard,
                    {
                        backgroundColor: colors.CARD_BACKGROUND,
                        shadowColor: colors.SHADOW,
                        opacity: disabled ? 0.6 : 1,
                    },
                    style,
                ]}
            >
                <Block row middle space='between' style={styles.horizontalCardContent}>
                    <Block row middle flex>
                        <Block
                            style={[
                                styles.horizontalIconContainer,
                                {
                                    backgroundColor: colors.PRIMARY + '15',
                                },
                            ]}
                        >
                            {loading ? (
                                <ActivityIndicator size='small' color={colors.PRIMARY} />
                            ) : (
                                <Icon
                                    name={icon}
                                    family={iconFamily}
                                    size={moderateScale(28)}
                                    color={colors.PRIMARY}
                                />
                            )}
                        </Block>
                        <Block flex style={{ marginLeft: theme.SIZES.BASE }}>
                            <Text
                                style={[
                                    styles.horizontalTitle,
                                    {
                                        color: colors.TEXT,
                                    },
                                ]}
                            >
                                {title}
                            </Text>
                            {description && (
                                <Text
                                    style={[
                                        styles.horizontalDescription,
                                        {
                                            color: colors.TEXT_SECONDARY,
                                        },
                                    ]}
                                >
                                    {description}
                                </Text>
                            )}
                        </Block>
                    </Block>
                    <Icon
                        name='chevron-right'
                        family='font-awesome'
                        size={16}
                        color={colors.TEXT_SECONDARY}
                    />
                </Block>
            </TouchableOpacity>
        );
    }

    // Original vertical layout
    return (
        <TouchableWithoutFeedback onPress={disabled ? null : onPress}>
            <Block
                card
                style={[
                    styles.card,
                    styles.shadow,
                    { backgroundColor: colors.CARD_BACKGROUND },
                    disabled && { opacity: 0.5 },
                    style,
                ]}
            >
                <Block center middle style={styles.iconContainer}>
                    <View style={styles.iconWrapper}>
                        {loading ? (
                            <ActivityIndicator size='large' color={colors.PRIMARY} />
                        ) : (
                            <Icon
                                name={icon}
                                family={iconFamily}
                                size={moderateScale(80)}
                                color={colors.PRIMARY}
                            />
                        )}
                    </View>
                </Block>
                <Block style={styles.contentContainer}>
                    <Text
                        size={moderateScale(20)}
                        bold
                        style={[styles.title, { color: colors.TEXT }]}
                        center
                    >
                        {title}
                    </Text>
                    {description && (
                        <Text
                            size={moderateScale(14)}
                            style={[styles.description, { color: colors.TEXT_SECONDARY }]}
                            center
                        >
                            {description}
                        </Text>
                    )}
                </Block>
            </Block>
        </TouchableWithoutFeedback>
    );
}

export default GameModeCard;

const styles = StyleSheet.create({
    card: {
        marginVertical: theme.SIZES.BASE * 1.5,
        marginHorizontal: width > 600 ? 'auto' : 0,
        borderWidth: 0,
        minHeight: width > 600 ? verticalScale(200) : width / 2,
        maxWidth: width > 600 ? Math.min(800, width * 0.8) : width - theme.SIZES.BASE * 2,
        width: width > 600 ? '100%' : 'auto',
        alignSelf: width > 600 ? 'center' : 'auto',
        borderRadius: 12,
        overflow: 'hidden',
    },
    title: {
        flexWrap: 'wrap',
        paddingBottom: 8,
    },
    description: {
        paddingTop: 8,
    },
    contentContainer: {
        paddingVertical: theme.SIZES.BASE * 2,
        paddingHorizontal: theme.SIZES.BASE * 2,
        justifyContent: 'center',
    },
    iconContainer: {
        elevation: 1,
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: theme.SIZES.BASE * 3,
    },
    iconWrapper: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    shadow: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 8,
        shadowOpacity: 0.2,
        elevation: 4,
    },
    // Horizontal layout styles
    horizontalCard: {
        marginVertical: theme.SIZES.BASE,
        marginHorizontal: width > 600 ? 'auto' : 0,
        maxWidth: width > 600 ? 600 : '100%',
        borderRadius: 12,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    horizontalCardContent: {
        padding: theme.SIZES.BASE * 1.5,
    },
    horizontalIconContainer: {
        width: moderateScale(60),
        height: moderateScale(60),
        borderRadius: moderateScale(30),
        justifyContent: 'center',
        alignItems: 'center',
    },
    horizontalTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 4,
    },
    horizontalDescription: {
        fontSize: moderateScale(11),
    },
});
