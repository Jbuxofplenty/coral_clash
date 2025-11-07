import { Block, Text, theme } from 'galio-framework';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    StyleSheet,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import { moderateScale } from 'react-native-size-matters';
import { useAlert, useTheme } from '../contexts';
import Icon from './Icon';

const { width } = Dimensions.get('screen');
const isTablet = width >= 768;

/**
 * MatchmakingCard - A card component for random matchmaking
 * @param {Object} props
 * @param {boolean} props.searching - Whether user is currently searching
 * @param {number} props.queueCount - Number of players in queue
 * @param {boolean} props.loading - Loading state
 * @param {Function} props.onStartSearch - Handler to start searching
 * @param {Function} props.onStopSearch - Handler to stop searching
 * @param {Object} props.style - Additional styles
 */
function MatchmakingCard({ searching, queueCount, loading, onStartSearch, onStopSearch, style }) {
    const { colors } = useTheme();
    const { showAlert } = useAlert();
    const [isProcessing, setIsProcessing] = useState(false);

    const handlePress = async () => {
        if (isProcessing) return;

        setIsProcessing(true);
        try {
            if (searching) {
                await onStopSearch();
            } else {
                const result = await onStartSearch();
                if (result && !result.success && result.error) {
                    showAlert('Cannot Join Matchmaking', result.error);
                }
            }
        } catch (error) {
            console.error('Error in matchmaking action:', error);
            showAlert('Error', 'Something went wrong. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    // Determine card appearance based on state
    const isActive = searching || loading || isProcessing;
    const backgroundColor = isActive ? '#606060' : colors.CARD_BACKGROUND;
    const textColor = isActive ? '#FFFFFF' : colors.TEXT;
    const iconColor = isActive ? '#64b5f6' : colors.PRIMARY;
    const spinnerColor = isActive ? '#64b5f6' : colors.PRIMARY;

    return (
        <TouchableWithoutFeedback onPress={handlePress} disabled={loading || isProcessing}>
            <Block card style={[styles.card, styles.shadow, { backgroundColor }, style]}>
                <Block center middle style={styles.iconContainer}>
                    {loading || isProcessing || searching ? (
                        <ActivityIndicator size='large' color={spinnerColor} />
                    ) : (
                        <View style={styles.iconWrapper}>
                            <Icon
                                name='users'
                                family='font-awesome'
                                size={isTablet ? moderateScale(40) : moderateScale(80)}
                                color={iconColor}
                            />
                        </View>
                    )}
                </Block>
                <Block style={styles.contentContainer}>
                    <Text
                        size={isTablet ? moderateScale(10) : moderateScale(20)}
                        bold
                        style={[styles.title, { color: textColor }]}
                        center
                    >
                        {searching ? 'Searching for Opponent...' : 'Find Random Match'}
                    </Text>
                    <Text
                        size={isTablet ? moderateScale(10) : moderateScale(14)}
                        style={[
                            styles.description,
                            { color: isActive ? 'rgba(255,255,255,0.8)' : colors.TEXT_SECONDARY },
                        ]}
                        center
                    >
                        {searching
                            ? `${queueCount} player${queueCount !== 1 ? 's' : ''} online · Tap to cancel`
                            : `${queueCount} player${queueCount !== 1 ? 's' : ''} online · Tap to join queue`}
                    </Text>
                </Block>
            </Block>
        </TouchableWithoutFeedback>
    );
}

export default MatchmakingCard;

const styles = StyleSheet.create({
    card: {
        marginVertical: theme.SIZES.BASE * 1.5,
        marginHorizontal: isTablet ? 'auto' : 0,
        borderWidth: 0,
        minHeight: isTablet ? 350 : width / 2,
        width: isTablet ? 650 : width - theme.SIZES.BASE * 2,
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
