import React from 'react';
import { Block, Text, theme } from 'galio-framework';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { useTheme, useAuth } from '../contexts';
import Icon from './Icon';
import Avatar from './Avatar';

const { width } = Dimensions.get('screen');

/**
 * Card component that displays recent game history on the home screen
 * Shows the 5 most recent completed or cancelled games
 * Note: Data loading and real-time updates are handled by the parent screen
 */
export default function GameHistoryCard({ navigation, gameHistory = [], loading = false }) {
    const { colors } = useTheme();
    const { user } = useAuth();

    const formatGameDate = (timestamp) => {
        if (!timestamp) return '';

        try {
            let date;
            // Handle Firestore timestamp (has _seconds property or toDate method)
            if (timestamp.toDate && typeof timestamp.toDate === 'function') {
                date = timestamp.toDate();
            } else if (timestamp._seconds) {
                date = new Date(timestamp._seconds * 1000);
            } else if (timestamp.seconds) {
                date = new Date(timestamp.seconds * 1000);
            } else {
                date = new Date(timestamp);
            }

            // Check if date is valid
            if (isNaN(date.getTime())) {
                return '';
            }

            const now = new Date();
            const diffMs = now - date;
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);

            if (diffMins < 1) {
                return 'Just now';
            } else if (diffMins < 60) {
                return `${diffMins}m ago`;
            } else if (diffHours < 24) {
                return `${diffHours}h ago`;
            } else if (diffDays < 7) {
                return `${diffDays}d ago`;
            } else {
                // Format as date
                return date.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
                });
            }
        } catch (error) {
            console.error('Error formatting date:', error, timestamp);
            return '';
        }
    };

    const getGameResult = (game) => {
        if (!user) return { text: '', icon: 'question-circle', color: colors.TEXT_SECONDARY };

        const status = game.status;

        if (status === 'cancelled') {
            return {
                text: 'Game cancelled',
                icon: 'ban',
                color: colors.ERROR,
            };
        }

        if (status === 'completed') {
            const didWin = game.winner === user.uid;
            const isDraw = !game.winner;

            if (isDraw) {
                return {
                    text: 'Draw',
                    icon: 'minus-circle',
                    color: colors.WARNING,
                };
            }

            if (didWin) {
                return {
                    text: 'You won',
                    icon: 'trophy',
                    color: colors.SUCCESS,
                };
            } else {
                return {
                    text: 'You lost',
                    icon: 'times-circle',
                    color: colors.ERROR,
                };
            }
        }

        return {
            text: 'Unknown',
            icon: 'question-circle',
            color: colors.TEXT_SECONDARY,
        };
    };

    const getOpponentData = (game) => {
        if (!user)
            return { id: null, avatarKey: 'dolphin', displayName: 'Opponent', isComputer: false };

        const opponentId = game.creatorId === user.uid ? game.opponentId : game.creatorId;

        // Check if this is a computer game
        const isComputer = opponentId === 'computer' || game.opponentType === 'computer';

        return {
            id: opponentId,
            avatarKey: game.opponentAvatarKey || 'dolphin',
            displayName: isComputer ? 'Computer' : game.opponentDisplayName || 'Opponent',
            isComputer: isComputer,
        };
    };

    // Don't show card if user is not authenticated
    if (!user) {
        return null;
    }

    return (
        <Block
            card
            style={[styles.card, styles.shadow, { backgroundColor: colors.CARD_BACKGROUND }]}
        >
            <Block style={styles.header}>
                <Block row middle>
                    <View style={[styles.iconCircle, { backgroundColor: colors.PRIMARY + '15' }]}>
                        <Icon
                            name='history'
                            family='font-awesome'
                            size={18}
                            color={colors.PRIMARY}
                        />
                    </View>
                    <Block flex>
                        <Text size={18} bold style={[styles.title, { color: colors.TEXT }]}>
                            Game History
                        </Text>
                        <Text size={12} style={[styles.subtitle, { color: colors.TEXT_SECONDARY }]}>
                            Recent games
                        </Text>
                    </Block>
                </Block>
            </Block>

            <Block style={styles.gamesList}>
                {loading ? (
                    <Block center middle style={styles.loadingContainer}>
                        <ActivityIndicator size='large' color={colors.PRIMARY} />
                        <Text
                            size={14}
                            style={[styles.loadingText, { color: colors.TEXT_SECONDARY }]}
                        >
                            Loading history...
                        </Text>
                    </Block>
                ) : gameHistory.length === 0 ? (
                    <Block center middle style={styles.emptyContainer}>
                        <Icon
                            name='clock-o'
                            family='font-awesome'
                            size={40}
                            color={colors.TEXT_SECONDARY}
                            style={styles.emptyIcon}
                        />
                        <Text
                            size={14}
                            style={[styles.emptyText, { color: colors.TEXT_SECONDARY }]}
                        >
                            No game history
                        </Text>
                        <Text
                            size={12}
                            style={[styles.emptySubtext, { color: colors.TEXT_SECONDARY }]}
                        >
                            Your completed games will appear here
                        </Text>
                    </Block>
                ) : (
                    gameHistory.slice(0, 5).map((game, index) => {
                        const opponent = getOpponentData(game);
                        const result = getGameResult(game);
                        const completedDate = formatGameDate(game.updatedAt);

                        return (
                            <View
                                key={game.id || index}
                                style={[
                                    styles.gameItem,
                                    {
                                        backgroundColor: colors.INPUT,
                                        borderColor: colors.BORDER_COLOR,
                                    },
                                    index === Math.min(gameHistory.length - 1, 4) &&
                                        styles.lastGameItem,
                                ]}
                            >
                                <Block row middle space='between' flex>
                                    <Block row middle flex>
                                        <Avatar
                                            avatarKey={opponent.avatarKey}
                                            computer={opponent.isComputer}
                                            size='small'
                                            style={styles.avatar}
                                        />
                                        <Block flex style={styles.gameInfo}>
                                            <Text
                                                size={16}
                                                bold
                                                style={[
                                                    styles.opponentName,
                                                    { color: colors.TEXT },
                                                ]}
                                                numberOfLines={1}
                                            >
                                                vs {opponent.displayName}
                                            </Text>
                                            {completedDate && (
                                                <Text
                                                    size={11}
                                                    style={[
                                                        styles.dateText,
                                                        { color: colors.TEXT_SECONDARY },
                                                    ]}
                                                >
                                                    {completedDate}
                                                </Text>
                                            )}
                                        </Block>
                                    </Block>

                                    <Block row middle style={styles.resultContainer}>
                                        <Icon
                                            name={result.icon}
                                            family='font-awesome'
                                            size={12}
                                            color={result.color}
                                        />
                                        <Text
                                            size={13}
                                            style={[styles.resultText, { color: result.color }]}
                                        >
                                            {result.text}
                                        </Text>
                                    </Block>
                                </Block>
                            </View>
                        );
                    })
                )}
            </Block>
        </Block>
    );
}

const styles = StyleSheet.create({
    card: {
        marginVertical: theme.SIZES.BASE,
        borderWidth: 0,
        borderRadius: 12,
        overflow: 'hidden',
        paddingTop: theme.SIZES.BASE * 1.25,
        paddingBottom: theme.SIZES.BASE * 0.75,
        minHeight: width / 2,
    },
    shadow: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 8,
        shadowOpacity: 0.2,
        elevation: 4,
    },
    header: {
        paddingHorizontal: theme.SIZES.BASE * 1.5,
        paddingBottom: theme.SIZES.BASE * 0.75,
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.SIZES.BASE * 0.75,
    },
    title: {
        marginBottom: 2,
    },
    subtitle: {
        marginTop: 2,
    },
    gamesList: {
        paddingTop: theme.SIZES.BASE * 0.25,
    },
    gameItem: {
        paddingHorizontal: theme.SIZES.BASE * 1.5,
        paddingVertical: theme.SIZES.BASE,
        borderTopWidth: 1,
    },
    lastGameItem: {
        borderBottomWidth: 0,
    },
    avatar: {
        marginRight: theme.SIZES.BASE * 0.75,
    },
    gameInfo: {
        marginRight: theme.SIZES.BASE * 0.75,
    },
    opponentName: {
        marginBottom: 3,
    },
    resultContainer: {
        flexShrink: 0,
        marginLeft: theme.SIZES.BASE,
    },
    resultText: {
        marginLeft: 6,
    },
    dateText: {
        marginTop: 4,
        opacity: 0.8,
    },
    loadingContainer: {
        paddingVertical: theme.SIZES.BASE * 1.5,
    },
    loadingText: {
        marginTop: theme.SIZES.BASE * 0.75,
    },
    emptyContainer: {
        paddingVertical: theme.SIZES.BASE * 2,
        paddingHorizontal: theme.SIZES.BASE * 2,
    },
    emptyIcon: {
        marginBottom: theme.SIZES.BASE,
        opacity: 0.5,
    },
    emptyText: {
        marginBottom: theme.SIZES.BASE * 0.5,
        textAlign: 'center',
    },
    emptySubtext: {
        textAlign: 'center',
        opacity: 0.7,
    },
});
