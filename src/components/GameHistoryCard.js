import React, { useEffect } from 'react';
import { Block, Text, theme } from 'galio-framework';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useFirebaseFunctions } from '../hooks/useFirebaseFunctions';
import { useAuth } from '../contexts/AuthContext';
import Icon from './Icon';
import Avatar from './Avatar';

const { width } = Dimensions.get('screen');

/**
 * Card component that displays recent game history on the home screen
 * Shows the 5 most recent completed or cancelled games
 */
export default function GameHistoryCard({ navigation }) {
    const { colors } = useTheme();
    const { user } = useAuth();
    const { getGameHistory } = useFirebaseFunctions();
    const [gameHistory, setGameHistory] = React.useState([]);
    const [loading, setLoading] = React.useState(true);

    // Load game history when screen comes into focus
    useFocusEffect(
        React.useCallback(() => {
            if (user) {
                loadGameHistory();
            } else {
                // Not logged in - stop loading
                setLoading(false);
            }
        }, [user]),
    );

    const loadGameHistory = async () => {
        try {
            setLoading(true);
            const result = await getGameHistory();
            setGameHistory(result.games || []);
        } catch (error) {
            console.error('Error loading game history:', error);
            setGameHistory([]);
        } finally {
            setLoading(false);
        }
    };

    const handleGamePress = (game) => {
        navigation.navigate('Game', {
            gameId: game.id,
            isPvP: true,
        });
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
        if (!user) return { id: null, avatarKey: 'dolphin', displayName: 'Opponent' };

        const opponentId = game.creatorId === user.uid ? game.opponentId : game.creatorId;
        return {
            id: opponentId,
            avatarKey: game.opponentAvatarKey || 'dolphin',
            displayName: game.opponentDisplayName || 'Opponent',
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

                        return (
                            <TouchableOpacity
                                key={game.id || index}
                                onPress={() => handleGamePress(game)}
                                style={[
                                    styles.gameItem,
                                    {
                                        backgroundColor: colors.INPUT,
                                        borderColor: colors.BORDER_COLOR,
                                    },
                                    index === Math.min(gameHistory.length - 1, 4) &&
                                        styles.lastGameItem,
                                ]}
                                activeOpacity={0.7}
                            >
                                <Block row middle space='between' flex>
                                    <Block row middle flex>
                                        <Avatar
                                            avatarKey={opponent.avatarKey}
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
                                            <Block row middle>
                                                <Icon
                                                    name={result.icon}
                                                    family='font-awesome'
                                                    size={12}
                                                    color={result.color}
                                                />
                                                <Text
                                                    size={13}
                                                    style={[
                                                        styles.resultText,
                                                        { color: result.color },
                                                    ]}
                                                >
                                                    {result.text}
                                                </Text>
                                            </Block>
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
    resultText: {
        marginLeft: 6,
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
