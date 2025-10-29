import { Block, Text, theme } from 'galio-framework';
import React from 'react';
import {
    Dimensions,
    StyleSheet,
    TouchableWithoutFeedback,
    View,
    ActivityIndicator,
} from 'react-native';
import Icon from './Icon';
import { useTheme } from '../contexts';

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
 * @param {Object} props.style - Additional styles
 */
function GameModeCard({ title, description, icon, iconFamily, onPress, disabled, loading, style }) {
    const { colors } = useTheme();

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
                                size={100}
                                color={colors.PRIMARY}
                            />
                        )}
                    </View>
                </Block>
                <Block style={styles.contentContainer}>
                    <Text size={20} bold style={[styles.title, { color: colors.TEXT }]} center>
                        {title}
                    </Text>
                    {description && (
                        <Text
                            size={14}
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
        borderWidth: 0,
        minHeight: width / 2,
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
});
