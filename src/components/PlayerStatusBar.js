import { ActivityIndicator, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useTheme } from '../contexts';
import i18n from '../i18n';
import Avatar from './Avatar';

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
 * @param {number} props.coralUnderControl - Number of coral pieces under control (not occupied by opponent)
 * @param {boolean} props.isThinking - Whether the computer is currently thinking (calculating move)
 */
export default function PlayerStatusBar({
    playerName,
    avatarKey,
    isComputer = false,
    timeRemaining,
    isActive = false,
    color = 'w',
    coralRemaining,
    coralUnderControl,
    isThinking = false,
}) {
    const { colors } = useTheme();
    const { height } = useWindowDimensions();

    // Use compact mode on smaller screens (iPhone SE, etc.)
    const isCompact = height < 700;

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
                    borderWidth: isActive ? 2 : 0,
                    borderColor: isActive ? colors.PRIMARY : 'transparent',
                },
                isCompact && styles.containerCompact,
            ]}
        >
            <Avatar
                avatarKey={avatarKey}
                computer={isComputer}
                size={isCompact ? 'small' : 'medium'}
                showBorder={true}
            />

            <View style={styles.info}>
                <View style={styles.nameRow}>
                    <Text
                        style={[
                            styles.playerName,
                            { color: 'white' },
                            isCompact && styles.playerNameCompact,
                        ]}
                        numberOfLines={1}
                    >
                        {isComputer
                            ? i18n.t('comp.statusBar.computer')
                            : playerName || i18n.t('comp.statusBar.player')}
                    </Text>
                    {isThinking && isComputer && (
                        <View style={styles.thinkingIndicator}>
                            <ActivityIndicator size="small" color="#4ADE80" />
                            <Text
                                style={[
                                    styles.thinkingText,
                                    { color: '#4ADE80' },
                                    isCompact && styles.thinkingTextCompact,
                                ]}
                            >
                                {i18n.t('comp.statusBar.thinking')}
                            </Text>
                        </View>
                    )}
                </View>
                <View style={styles.statsRow}>
                    {timeRemaining !== undefined && timeRemaining !== null && (
                        <Text
                            style={[
                                styles.timer,
                                { color: 'white' },
                                isCompact && styles.timerCompact,
                            ]}
                        >
                            {formatTime(timeRemaining)}
                        </Text>
                    )}
                    {(coralRemaining !== undefined && coralRemaining !== null) ||
                    (coralUnderControl !== undefined && coralUnderControl !== null) ? (
                        <View style={styles.coralStats}>
                            {coralRemaining !== undefined && coralRemaining !== null && (
                                <View style={styles.coralItem}>
                                    <Text
                                        style={[
                                            styles.coralLabel,
                                            { color: 'rgba(255, 255, 255, 0.7)' },
                                            isCompact && styles.coralLabelCompact,
                                        ]}
                                    >
                                        {i18n.t('comp.statusBar.remaining')}
                                    </Text>
                                    <Text
                                        style={[
                                            styles.coralValue,
                                            { color: 'white' },
                                            isCompact && styles.coralValueCompact,
                                        ]}
                                    >
                                        🪸 {coralRemaining}
                                    </Text>
                                </View>
                            )}
                            {coralUnderControl !== undefined && coralUnderControl !== null && (
                                <View style={styles.coralItem}>
                                    <Text
                                        style={[
                                            styles.coralLabel,
                                            { color: 'rgba(255, 255, 255, 0.7)' },
                                            isCompact && styles.coralLabelCompact,
                                        ]}
                                    >
                                        {i18n.t('comp.statusBar.control')}
                                    </Text>
                                    <Text
                                        style={[
                                            styles.coralValue,
                                            { color: '#4ADE80' }, // Green color for control
                                            isCompact && styles.coralValueCompact,
                                        ]}
                                    >
                                        🔱 {coralUnderControl}
                                    </Text>
                                </View>
                            )}
                        </View>
                    ) : null}
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
                    isCompact && styles.colorIndicatorCompact,
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
        borderRadius: 0,
    },
    containerCompact: {
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    info: {
        flex: 1,
        marginLeft: 12,
        justifyContent: 'center',
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    playerName: {
        fontSize: 16,
        fontWeight: '600',
    },
    playerNameCompact: {
        fontSize: 13,
    },
    thinkingIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    thinkingText: {
        fontSize: 12,
        fontWeight: '500',
        fontStyle: 'italic',
    },
    thinkingTextCompact: {
        fontSize: 10,
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
    timerCompact: {
        fontSize: 11,
    },
    coralStats: {
        flexDirection: 'row',
        gap: 16,
    },
    coralItem: {
        flexDirection: 'column',
        alignItems: 'flex-start',
    },
    coralLabel: {
        fontSize: 9,
        fontWeight: '500',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    coralLabelCompact: {
        fontSize: 8,
        marginBottom: 1,
    },
    coralValue: {
        fontSize: 14,
        fontWeight: '700',
    },
    coralValueCompact: {
        fontSize: 11,
    },
    colorIndicator: {
        width: 32,
        height: 32,
        borderRadius: 4,
        borderWidth: 1,
        marginLeft: 12,
    },
    colorIndicatorCompact: {
        width: 24,
        height: 24,
        marginLeft: 8,
    },
});
