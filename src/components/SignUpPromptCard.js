import { Block, Button, Text, theme } from 'galio-framework';
import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { moderateScale, verticalScale } from 'react-native-size-matters';
import { useTheme } from '../contexts';
import Icon from './Icon';

const { width } = Dimensions.get('screen');
const isTablet = width >= 768;

/**
 * SignUpPromptCard - A card component prompting users to sign up or log in
 * @param {Object} props
 * @param {Function} props.onPress - Handler for when card is pressed
 * @param {Object} props.style - Additional styles
 */
function SignUpPromptCard({ onPress, style }) {
    const { colors } = useTheme();

    return (
        <Block
            card
            style={[
                styles.card,
                styles.shadow,
                {
                    backgroundColor: colors.CARD_BACKGROUND,
                    borderColor: colors.PRIMARY,
                    borderWidth: 2,
                },
                style,
            ]}
        >
            <Block center middle style={styles.iconContainer}>
                <View style={styles.iconWrapper}>
                    <Icon
                        name='star'
                        family='font-awesome'
                        size={moderateScale(80)}
                        color={colors.PRIMARY}
                    />
                </View>
            </Block>
            <Block style={styles.contentContainer}>
                <Text
                    size={moderateScale(22)}
                    bold
                    style={[styles.title, { color: colors.TEXT }]}
                    center
                >
                    Unlock Full Features
                </Text>
                <Text
                    size={moderateScale(15)}
                    style={[styles.description, { color: colors.TEXT_SECONDARY }]}
                    center
                >
                    Sign up for a free account to access:
                </Text>
                <Block style={styles.featureList}>
                    <Text
                        size={isTablet ? moderateScale(10) : moderateScale(14)}
                        style={[styles.feature, { color: colors.TEXT_SECONDARY }]}
                    >
                        {'\u2022'} Play with friends online
                    </Text>
                    <Text
                        size={isTablet ? moderateScale(10) : moderateScale(14)}
                        style={[styles.feature, { color: colors.TEXT_SECONDARY }]}
                    >
                        {'\u2022'} Find random opponents via matchmaking
                    </Text>
                    <Text
                        size={isTablet ? moderateScale(10) : moderateScale(14)}
                        style={[styles.feature, { color: colors.TEXT_SECONDARY }]}
                    >
                        {'\u2022'} Track your game stats & history
                    </Text>
                    <Text
                        size={isTablet ? moderateScale(10) : moderateScale(14)}
                        style={[styles.feature, { color: colors.TEXT_SECONDARY }]}
                    >
                        {'\u2022'} Build your friend network
                    </Text>
                </Block>
                <Block center style={styles.buttonContainer}>
                    <Button round color={colors.PRIMARY} style={styles.button} onPress={onPress}>
                        <Text
                            size={isTablet ? moderateScale(10) : moderateScale(16)}
                            bold
                            color='white'
                        >
                            Sign Up / Log In
                        </Text>
                    </Button>
                </Block>
            </Block>
        </Block>
    );
}

export default SignUpPromptCard;

const styles = StyleSheet.create({
    card: {
        marginVertical: theme.SIZES.BASE * 1.5,
        marginHorizontal: isTablet ? 'auto' : 0,
        borderWidth: 0,
        minHeight: width > 600 ? verticalScale(300) : width / 1.5,
        maxWidth: width > 600 ? Math.min(800, width * 0.8) : width - theme.SIZES.BASE * 2,
        width: width > 600 ? '100%' : 'auto',
        alignSelf: isTablet ? 'center' : 'auto',
        borderRadius: 12,
        overflow: 'hidden',
    },
    title: {
        flexWrap: 'wrap',
        paddingBottom: 8,
    },
    description: {
        paddingTop: 8,
        paddingBottom: 12,
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
        paddingTop: theme.SIZES.BASE * 2,
    },
    iconWrapper: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    featureList: {
        paddingVertical: theme.SIZES.BASE,
        paddingHorizontal: theme.SIZES.BASE,
        alignItems: 'flex-start',
        alignSelf: 'center',
        width: '90%',
    },
    feature: {
        paddingVertical: 4,
    },
    buttonContainer: {
        paddingTop: theme.SIZES.BASE * 1.5,
        paddingBottom: theme.SIZES.BASE,
    },
    button: {
        width: isTablet ? width * 0.5 : width * 0.7,
        height: verticalScale(48),
    },
    shadow: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 8,
        shadowOpacity: 0.2,
        elevation: 4,
    },
});
