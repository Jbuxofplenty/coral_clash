import { Block, Text, theme } from 'galio-framework';
import React, { useState } from 'react';
import { ActivityIndicator, Dimensions, StyleSheet, TouchableOpacity, View } from 'react-native';
import { moderateScale, verticalScale } from 'react-native-size-matters';
import { useAlert, useAuth, useTheme } from '../contexts';
import Avatar from './Avatar';
import Icon from './Icon';

const { width } = Dimensions.get('screen');
const isTablet = width >= 768;

/**
 * Card component that displays active games (PvP and Computer) on the home screen
 * Shows game status, opponent avatar, and whose turn it is
 * Note: Data is passed down as props from the parent screen to avoid duplicate useGame() calls
 */
export default function ActiveGamesCard({
    navigation,
    activeGames,
    loading,
    acceptGameInvite,
    declineGameInvite,
    resignGame,
}) {
    const { colors } = useTheme();
    const { user } = useAuth();
    const { showAlert } = useAlert();
    const [acceptingGameId, setAcceptingGameId] = useState(null);
    const [decliningGameId, setDecliningGameId] = useState(null);
    const [resigningGameId, setResigningGameId] = useState(null);

    const handleGamePress = (game) => {
        // Don't navigate if game is pending
        if (game.status === 'pending') {
            return;
        }

        // Determine opponentId for proper board selection
        const opponentId = game.creatorId === user.uid ? game.opponentId : game.creatorId;
        
        navigation.navigate('Game', {
            gameId: game.id,
            gameState: game.gameState,
            opponentType: game.opponentType, // 'computer' or undefined for PvP
            opponentData: {
                id: opponentId, // Include id to distinguish legacy computer ('computer') from pseudo-computer users
                displayName: game.opponentDisplayName,
                avatarKey: game.opponentAvatarKey,
            },
        });
    };

    const handleAcceptGame = async (gameId) => {
        try {
            setAcceptingGameId(gameId);
            await acceptGameInvite(gameId);
            // Don't navigate immediately - the onGameAccepted callback in useGame
            // will handle navigation once Firestore updates the game status to 'active'
        } catch (error) {
            console.error('Error accepting game:', error);
        } finally {
            setAcceptingGameId(null);
        }
    };

    const handleDeclineGame = async (gameId) => {
        try {
            setDecliningGameId(gameId);
            await declineGameInvite(gameId);
        } catch (error) {
            console.error('Error declining game:', error);
        } finally {
            setDecliningGameId(null);
        }
    };

    const handleResignGame = async (gameId) => {
        // Show confirmation dialog before resigning
        showAlert('Resign Game', 'Are you sure you want to resign? You will lose this game.', [
            {
                text: 'Cancel',
                style: 'cancel',
            },
            {
                text: 'Resign',
                style: 'destructive',
                onPress: async () => {
                    try {
                        setResigningGameId(gameId);
                        await resignGame(gameId);
                    } catch (error) {
                        console.error('[ActiveGamesCard] Error resigning game:', error);
                        showAlert('Error', 'Failed to resign game. Please try again.');
                    } finally {
                        setResigningGameId(null);
                    }
                },
            },
        ]);
    };

    const getGameStatus = (game) => {
        if (!user) return { text: '', icon: 'question-circle', color: colors.TEXT_SECONDARY };

        const isMyTurn = game.currentTurn === user.uid;
        const isPending = game.status === 'pending';

        if (isPending) {
            // No status text for pending games, just show action buttons
            return {
                text: '',
                icon: '',
                color: colors.TEXT_SECONDARY,
            };
        }

        if (isMyTurn) {
            return {
                text: 'Your turn',
                icon: 'play-circle',
                color: colors.SUCCESS,
            };
        } else {
            return {
                text: "Opponent's turn",
                icon: 'hourglass',
                color: colors.TEXT_SECONDARY,
            };
        }
    };

    const getOpponentData = (game) => {
        if (!user)
            return { id: null, avatarKey: 'dolphin', displayName: 'Opponent', isComputer: false };

        const opponentId = game.creatorId === user.uid ? game.opponentId : game.creatorId;

        // Check if this is a computer game
        const isLegacyComputer = opponentId === 'computer';
        const isComputerGame = isLegacyComputer || game.opponentType === 'computer';

        if (isComputerGame) {
            // For computer games, use display name from game data if available
            // This allows computer users to show their display names (e.g., "Alex", "Jordan")
            // Fall back to 'Computer' only if no display name is available (old games)
            const displayName =
                game.opponentDisplayName || game.creatorDisplayName || 'Computer';
            const avatarKey =
                game.opponentAvatarKey || game.creatorAvatarKey || (isLegacyComputer ? null : 'dolphin');

            // For legacy computer games, show computer icon
            // For computer users with actual IDs, show their avatar
            return {
                id: isLegacyComputer ? 'computer' : opponentId,
                avatarKey: avatarKey,
                displayName: displayName,
                isComputer: isLegacyComputer, // Only true for old 'computer' ID, false for computer users
            };
        }

        return {
            id: opponentId,
            avatarKey: game.opponentAvatarKey || 'dolphin',
            displayName: game.opponentDisplayName || 'Opponent',
            isComputer: false,
        };
    };

    const getTimeControlInfo = (game) => {
        const timeControl = game.timeControl || { type: 'unlimited' };

        switch (timeControl.type) {
            case 'blitz':
                return {
                    icon: 'bolt',
                    iconFamily: 'font-awesome',
                    label: 'Blitz',
                };
            case 'normal':
                return {
                    icon: 'clock-o',
                    iconFamily: 'font-awesome',
                    label: 'Normal',
                };
            case 'unlimited':
                return {
                    icon: 'infinite',
                    iconFamily: 'ionicon',
                    label: 'Unlimited',
                };
            default:
                return {
                    icon: 'clock-o',
                    iconFamily: 'font-awesome',
                    label: 'Timed',
                };
        }
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
                    <View style={[styles.iconCircle, { backgroundColor: colors.SUCCESS + '15' }]}>
                        <Icon
                            name='gamepad'
                            family='font-awesome'
                            size={isTablet ? moderateScale(50) : moderateScale(20)}
                            color={colors.SUCCESS}
                        />
                    </View>
                    <Block flex>
                        <Text
                            size={isTablet ? moderateScale(10) : moderateScale(18)}
                            bold
                            style={[styles.title, { color: colors.TEXT }]}
                        >
                            Active Games
                        </Text>
                        <Text
                            size={isTablet ? moderateScale(10) : moderateScale(12)}
                            style={[styles.subtitle, { color: colors.TEXT_SECONDARY }]}
                        >
                            {activeGames.length} {activeGames.length === 1 ? 'game' : 'games'} in
                            progress
                        </Text>
                    </Block>
                </Block>
            </Block>

            <Block style={styles.gamesList}>
                {loading ? (
                    <Block center middle style={styles.loadingContainer}>
                        <ActivityIndicator size='large' color={colors.PRIMARY} />
                        <Text
                            size={isTablet ? moderateScale(10) : moderateScale(14)}
                            style={[styles.loadingText, { color: colors.TEXT_SECONDARY }]}
                        >
                            Loading games...
                        </Text>
                    </Block>
                ) : activeGames.length === 0 ? (
                    <Block center middle style={styles.emptyContainer}>
                        <Icon
                            name='inbox'
                            family='font-awesome'
                            size={isTablet ? moderateScale(20) : moderateScale(40)}
                            color={colors.TEXT_SECONDARY}
                            style={styles.emptyIcon}
                        />
                        <Text
                            size={isTablet ? moderateScale(10) : moderateScale(14)}
                            style={[styles.emptyText, { color: colors.TEXT_SECONDARY }]}
                        >
                            No active games
                        </Text>
                        <Text
                            size={isTablet ? moderateScale(10) : moderateScale(12)}
                            style={[styles.emptySubtext, { color: colors.TEXT_SECONDARY }]}
                        >
                            Start a game with a friend!
                        </Text>
                    </Block>
                ) : (
                    activeGames.map((game, index) => {
                        const opponent = getOpponentData(game);
                        const status = getGameStatus(game);
                        const isPending = game.status === 'pending';
                        const isRecipient = game.opponentId === user?.uid;
                        const isProcessing =
                            acceptingGameId === game.id ||
                            decliningGameId === game.id ||
                            resigningGameId === game.id;

                        const timeControlInfo = getTimeControlInfo(game);

                        return (
                            <TouchableOpacity
                                key={game.id || index}
                                onPress={() => handleGamePress(game)}
                                style={[
                                    styles.gameItem,
                                    {
                                        backgroundColor: colors.INPUT,
                                        borderColor: colors.BORDER_COLOR,
                                        opacity: isProcessing ? 0.6 : 1,
                                    },
                                    index === activeGames.length - 1 && styles.lastGameItem,
                                ]}
                                activeOpacity={isPending ? 1 : 0.7}
                                disabled={isPending}
                            >
                                <Block row middle space='between' flex>
                                    <Block row middle flex style={{ minWidth: 0 }}>
                                        <Avatar
                                            avatarKey={opponent.avatarKey}
                                            computer={opponent.isComputer}
                                            size='small'
                                            style={styles.avatar}
                                        />
                                        <Block
                                            flex
                                            style={[
                                                styles.gameInfo,
                                                { minWidth: 0, overflow: 'hidden' },
                                            ]}
                                        >
                                            <Block
                                                row
                                                middle
                                                style={{ marginBottom: 3, flexShrink: 1 }}
                                            >
                                                <Text
                                                    size={
                                                        isTablet
                                                            ? moderateScale(10)
                                                            : moderateScale(16)
                                                    }
                                                    bold
                                                    style={{ color: colors.TEXT, flexShrink: 1 }}
                                                    numberOfLines={1}
                                                    ellipsizeMode='tail'
                                                >
                                                    vs {opponent.displayName}
                                                </Text>
                                            </Block>
                                            <Block
                                                row
                                                middle
                                                style={{
                                                    flexShrink: 1,
                                                    flexWrap: 'nowrap',
                                                    overflow: 'hidden',
                                                }}
                                            >
                                                {status.icon ? (
                                                    <>
                                                        <Icon
                                                            name={status.icon}
                                                            family='font-awesome'
                                                            size={
                                                                isTablet
                                                                    ? moderateScale(10)
                                                                    : moderateScale(12)
                                                            }
                                                            color={status.color}
                                                            style={{ flexShrink: 0 }}
                                                        />
                                                        <Text
                                                            size={
                                                                isTablet
                                                                    ? moderateScale(10)
                                                                    : moderateScale(13)
                                                            }
                                                            style={[
                                                                styles.statusText,
                                                                {
                                                                    color: status.color,
                                                                    flexShrink: 1,
                                                                },
                                                            ]}
                                                            numberOfLines={1}
                                                            ellipsizeMode='tail'
                                                        >
                                                            {status.text}
                                                        </Text>
                                                        <Text
                                                            size={
                                                                isTablet
                                                                    ? moderateScale(10)
                                                                    : moderateScale(13)
                                                            }
                                                            style={{
                                                                color: colors.TEXT_SECONDARY,
                                                                marginHorizontal: 4,
                                                                flexShrink: 0,
                                                            }}
                                                        >
                                                            •
                                                        </Text>
                                                    </>
                                                ) : null}
                                                <Icon
                                                    name={timeControlInfo.icon}
                                                    family={timeControlInfo.iconFamily}
                                                    size={
                                                        isTablet
                                                            ? moderateScale(11)
                                                            : moderateScale(11)
                                                    }
                                                    color={colors.TEXT}
                                                    style={{ flexShrink: 0 }}
                                                />
                                                <Text
                                                    size={
                                                        isTablet
                                                            ? moderateScale(10)
                                                            : moderateScale(12)
                                                    }
                                                    style={{
                                                        color: colors.TEXT,
                                                        marginLeft: 5,
                                                        flexShrink: 1,
                                                    }}
                                                    numberOfLines={1}
                                                    ellipsizeMode='tail'
                                                >
                                                    {timeControlInfo.label}
                                                </Text>
                                            </Block>
                                        </Block>
                                    </Block>

                                    {isPending ? (
                                        <Block row>
                                            {isRecipient && (
                                                <>
                                                    {acceptingGameId === game.id ? (
                                                        <View
                                                            style={[
                                                                styles.actionButton,
                                                                {
                                                                    backgroundColor:
                                                                        colors.SUCCESS + '10',
                                                                },
                                                            ]}
                                                        >
                                                            <ActivityIndicator
                                                                size='small'
                                                                color={colors.SUCCESS}
                                                            />
                                                        </View>
                                                    ) : (
                                                        <TouchableOpacity
                                                            onPress={() =>
                                                                handleAcceptGame(game.id)
                                                            }
                                                            disabled={decliningGameId === game.id}
                                                            style={[
                                                                styles.actionButton,
                                                                {
                                                                    backgroundColor:
                                                                        colors.SUCCESS + '10',
                                                                },
                                                            ]}
                                                        >
                                                            <Icon
                                                                name='check'
                                                                family='font-awesome'
                                                                size={18}
                                                                color={colors.SUCCESS}
                                                            />
                                                        </TouchableOpacity>
                                                    )}
                                                </>
                                            )}
                                            {decliningGameId === game.id ? (
                                                <View
                                                    style={[
                                                        styles.actionButton,
                                                        {
                                                            backgroundColor: colors.ERROR + '10',
                                                            marginLeft: isRecipient ? 8 : 0,
                                                        },
                                                    ]}
                                                >
                                                    <ActivityIndicator
                                                        size='small'
                                                        color={colors.ERROR}
                                                    />
                                                </View>
                                            ) : (
                                                <TouchableOpacity
                                                    onPress={() => handleDeclineGame(game.id)}
                                                    disabled={acceptingGameId === game.id}
                                                    style={[
                                                        styles.actionButton,
                                                        {
                                                            backgroundColor: colors.ERROR + '10',
                                                            marginLeft: isRecipient ? 8 : 0,
                                                        },
                                                    ]}
                                                >
                                                    <Icon
                                                        name='times'
                                                        family='font-awesome'
                                                        size={18}
                                                        color={colors.ERROR}
                                                    />
                                                </TouchableOpacity>
                                            )}
                                        </Block>
                                    ) : (
                                        <Block row middle>
                                            {resigningGameId === game.id ? (
                                                <View
                                                    style={[
                                                        styles.actionButton,
                                                        {
                                                            backgroundColor: colors.ERROR + '10',
                                                            marginRight: 8,
                                                        },
                                                    ]}
                                                >
                                                    <ActivityIndicator
                                                        size='small'
                                                        color={colors.ERROR}
                                                    />
                                                </View>
                                            ) : (
                                                <TouchableOpacity
                                                    onPress={() => handleResignGame(game.id)}
                                                    style={[
                                                        styles.actionButton,
                                                        {
                                                            backgroundColor: colors.ERROR + '10',
                                                            marginRight: 8,
                                                        },
                                                    ]}
                                                >
                                                    <Icon
                                                        name='times'
                                                        family='font-awesome'
                                                        size={18}
                                                        color={colors.ERROR}
                                                    />
                                                </TouchableOpacity>
                                            )}
                                            <Icon
                                                name='chevron-right'
                                                family='font-awesome'
                                                size={16}
                                                color={colors.TEXT_SECONDARY}
                                            />
                                        </Block>
                                    )}
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
        marginHorizontal: width > 600 ? 'auto' : 0,
        borderWidth: 0,
        borderRadius: 12,
        overflow: 'hidden',
        paddingTop: theme.SIZES.BASE * 1.25,
        paddingBottom: theme.SIZES.BASE * 0.75,
        minHeight: width > 600 ? verticalScale(200) : width / 2,
        maxWidth: width > 600 ? Math.min(800, width * 0.8) : undefined,
        width: width > 600 ? '100%' : 'auto',
        alignSelf: width > 600 ? 'center' : 'auto',
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
        width: isTablet ? moderateScale(60) : moderateScale(40),
        height: isTablet ? moderateScale(60) : moderateScale(40),
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
    statusText: {
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
    actionButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
