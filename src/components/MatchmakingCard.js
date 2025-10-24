import { Block, Text, theme } from 'galio-framework';
import React, { useState } from 'react';
import {
    Dimensions,
    StyleSheet,
    TouchableWithoutFeedback,
    View,
    ActivityIndicator,
    Alert,
} from 'react-native';
import Icon from './Icon';
import { useTheme, useAlert } from '../contexts';

const { width } = Dimensions.get('screen');

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
                    {loading || isProcessing ? (
                        <ActivityIndicator size='large' color={spinnerColor} />
                    ) : (
                        <View style={styles.iconWrapper}>
                            <Icon
                                name={searching ? 'refresh' : 'users'}
                                family='font-awesome'
                                size={100}
                                color={iconColor}
                            />
                        </View>
                    )}
                </Block>
                <Block style={styles.contentContainer}>
                    <Text size={20} bold style={[styles.title, { color: textColor }]} center>
                        {searching ? 'Searching for Opponent...' : 'Find Random Match'}
                    </Text>
                    <Text
                        size={14}
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
