import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Avatar from './Avatar';
import { useTheme } from '../contexts';

/**
 * PlayerStatusBar component displays player info, avatar, and optional timer
 * @param {Object} props
 * @param {string} props.playerName - Player's display name
 * @param {string} props.avatarKey - Player's avatar key
 * @param {boolean} props.isComputer - Whether this is a computer player
 * @param {number} props.timeRemaining - Time remaining in seconds (optional)
 * @param {boolean} props.isActive - Whether it's this player's turn
 * @param {string} props.color - Player's color ('w' or 'b')
 * @param {number} props.coralRemaining - Number of coral pieces remaining for this player
 */
export default function PlayerStatusBar({
    playerName = 'Player',
    avatarKey,
    isComputer = false,
    timeRemaining,
    isActive = false,
    color = 'w',
    coralRemaining,
}) {
    const { colors } = useTheme();

    const formatTime = (seconds) => {
        if (!seconds && seconds !== 0) return null;
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <View
            style={[
                styles.container,
                {
                    backgroundColor: 'transparent',
                    borderColor: isActive ? colors.PRIMARY : 'transparent',
                },
            ]}
        >
            <Avatar avatarKey={avatarKey} computer={isComputer} size='medium' showBorder={true} />

            <View style={styles.info}>
                <Text style={[styles.playerName, { color: 'white' }]} numberOfLines={1}>
                    {isComputer ? 'Computer' : playerName}
                </Text>
                <View style={styles.statsRow}>
                    {timeRemaining !== undefined && timeRemaining !== null && (
                        <Text style={[styles.timer, { color: 'white' }]}>
                            {formatTime(timeRemaining)}
                        </Text>
                    )}
                    {coralRemaining !== undefined && coralRemaining !== null && (
                        <Text style={[styles.coralCounter, { color: 'white' }]}>
                            🪸 {coralRemaining}
                        </Text>
                    )}
                </View>
            </View>

            {/* Color indicator */}
            <View
                style={[
                    styles.colorIndicator,
                    {
                        backgroundColor: color === 'w' ? '#FFFFFF' : '#000000',
                        borderColor: color === 'w' ? '#666666' : '#CCCCCC',
                    },
                ]}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderWidth: 2,
        borderRadius: 0,
    },
    info: {
        flex: 1,
        marginLeft: 12,
        justifyContent: 'center',
    },
    playerName: {
        fontSize: 16,
        fontWeight: '600',
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
        gap: 12,
    },
    timer: {
        fontSize: 14,
    },
    coralCounter: {
        fontSize: 14,
    },
    colorIndicator: {
        width: 32,
        height: 32,
        borderRadius: 4,
        borderWidth: 1,
        marginLeft: 12,
    },
});
