import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Avatar from './Avatar';
import { useTheme } from '../contexts/ThemeContext';

/**
 * PlayerStatusBar component displays player info, avatar, and optional timer
 * @param {Object} props
 * @param {string} props.playerName - Player's display name
 * @param {string} props.avatarKey - Player's avatar key
 * @param {boolean} props.isComputer - Whether this is a computer player
 * @param {number} props.timeRemaining - Time remaining in seconds (optional)
 * @param {boolean} props.isActive - Whether it's this player's turn
 */
export default function PlayerStatusBar({
    playerName = 'Player',
    avatarKey,
    isComputer = false,
    timeRemaining,
    isActive = false,
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
                {timeRemaining !== undefined && timeRemaining !== null && (
                    <Text style={[styles.timer, { color: colors.TEXT_SECONDARY }]}>
                        {formatTime(timeRemaining)}
                    </Text>
                )}
            </View>
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
    timer: {
        fontSize: 14,
        marginTop: 2,
    },
});
