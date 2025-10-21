import { Block, Text, theme } from 'galio-framework';
import React, { useEffect, useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    View,
    Dimensions,
    ActivityIndicator,
    TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

import { Icon, Avatar, LoadingScreen } from '../components';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useFirebaseFunctions } from '../hooks/useFirebaseFunctions';

const { width } = Dimensions.get('screen');

export default function Stats({ navigation }) {
    const { user } = useAuth();
    const { colors, isDarkMode } = useTheme();
    const { getGameHistory } = useFirebaseFunctions();

    const [loading, setLoading] = useState(true);
    const [gameHistory, setGameHistory] = useState([]);
    const [opponentStats, setOpponentStats] = useState({});

    // Load stats when screen comes into focus
    useFocusEffect(
        React.useCallback(() => {
            if (user && user.uid) {
                loadStats();
            }
        }, [user]),
    );

    const loadStats = async () => {
        if (!user || !user.uid) return;

        try {
            setLoading(true);
            // Get game history to calculate opponent-specific stats
            const historyResult = await getGameHistory();
            const games = historyResult.games || [];
            setGameHistory(games);

            // Calculate stats per opponent
            const stats = {};
            games.forEach((game) => {
                if (game.status !== 'completed') return;

                // Determine opponent based on game type
                let opponentId,
                    opponentName,
                    opponentAvatar,
                    isComputer = false;

                if (game.gameType === 'computer' || game.isComputer) {
                    // Computer opponent
                    opponentId = `computer_${game.difficulty || 'easy'}`;
                    opponentName = `Computer (${game.difficulty || 'Easy'})`;
                    opponentAvatar = 'computer';
                    isComputer = true;
                } else {
                    // PvP opponent
                    opponentId = game.creatorId === user.uid ? game.opponentId : game.creatorId;
                    opponentName =
                        game.opponentDisplayName || game.opponentName || 'Unknown Player';
                    opponentAvatar = game.opponentAvatarKey || 'dolphin';
                }

                if (!stats[opponentId]) {
                    stats[opponentId] = {
                        name: opponentName,
                        avatarKey: opponentAvatar,
                        wins: 0,
                        losses: 0,
                        draws: 0,
                        total: 0,
                        isComputer,
                    };
                }

                // Determine if user won, lost, or drew
                let userWon = false;
                let userLost = false;

                if (game.gameType === 'computer' || game.isComputer) {
                    // For computer games, check if user won directly
                    userWon = game.result?.winner === 'player' || game.winner === user.uid;
                    userLost =
                        game.result?.winner === 'computer' ||
                        (game.winner && game.winner !== user.uid);
                } else {
                    // For PvP games
                    const userColor = game.creatorId === user.uid ? 'w' : 'b';
                    userWon = game.result?.winner === userColor;
                    userLost = game.result?.winner && game.result?.winner !== userColor;
                }

                if (userWon) {
                    stats[opponentId].wins++;
                } else if (userLost) {
                    stats[opponentId].losses++;
                } else {
                    stats[opponentId].draws++;
                }
                stats[opponentId].total++;
            });

            setOpponentStats(stats);
        } catch (error) {
            console.error('Error loading stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateWinRate = (wins, total) => {
        if (total === 0) return 0;
        return ((wins / total) * 100).toFixed(1);
    };

    const renderStatCard = (label, value, icon, iconColor, subtext = null) => (
        <Block
            style={[
                styles.statCard,
                {
                    backgroundColor: colors.CARD_BACKGROUND,
                    borderColor: colors.BORDER_COLOR,
                    shadowColor: colors.SHADOW,
                },
            ]}
        >
            <Block
                center
                style={{
                    width: 50,
                    height: 50,
                    borderRadius: 25,
                    backgroundColor: iconColor + '15',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginBottom: 12,
                }}
            >
                <Icon name={icon} family='font-awesome' size={24} color={iconColor} />
            </Block>
            <Text size={32} bold color={colors.TEXT} style={{ marginBottom: 4 }}>
                {value}
            </Text>
            <Text size={14} color={colors.TEXT_SECONDARY} style={{ marginBottom: 2 }}>
                {label}
            </Text>
            {subtext && (
                <Text size={12} color={colors.TEXT_SECONDARY}>
                    {subtext}
                </Text>
            )}
        </Block>
    );

    const renderOpponentRow = (opponentId, stats) => {
        const winRate = calculateWinRate(stats.wins, stats.total);
        return (
            <Block
                key={opponentId}
                style={[
                    styles.opponentRow,
                    {
                        backgroundColor: colors.CARD_BACKGROUND,
                        borderColor: colors.BORDER_COLOR,
                        shadowColor: colors.SHADOW,
                    },
                ]}
            >
                <Block row middle flex>
                    {stats.isComputer ? (
                        <Block
                            center
                            style={{
                                width: 48,
                                height: 48,
                                borderRadius: 24,
                                backgroundColor: colors.INFO + '20',
                                marginRight: theme.SIZES.BASE * 1.25,
                            }}
                        >
                            <Icon
                                name='desktop'
                                family='font-awesome'
                                size={24}
                                color={colors.INFO}
                            />
                        </Block>
                    ) : (
                        <Avatar
                            avatarKey={stats.avatarKey}
                            size='medium'
                            style={styles.avatarContainer}
                        />
                    )}
                    <Block flex style={{ marginRight: 8 }}>
                        <Text
                            size={16}
                            bold
                            color={colors.TEXT}
                            numberOfLines={1}
                            style={{ marginBottom: 4 }}
                        >
                            {stats.name}
                        </Text>
                        <Block row>
                            <Text size={13} color={colors.SUCCESS} style={{ marginRight: 12 }}>
                                {stats.wins}W
                            </Text>
                            <Text size={13} color={colors.ERROR} style={{ marginRight: 12 }}>
                                {stats.losses}L
                            </Text>
                            <Text size={13} color={colors.TEXT_SECONDARY}>
                                {stats.draws}D
                            </Text>
                        </Block>
                    </Block>
                    <Block center>
                        <Text size={20} bold color={colors.PRIMARY}>
                            {winRate}%
                        </Text>
                        <Text size={11} color={colors.TEXT_SECONDARY}>
                            Win Rate
                        </Text>
                    </Block>
                </Block>
            </Block>
        );
    };

    if (loading) {
        return <LoadingScreen />;
    }

    const stats = user?.stats || {
        gamesPlayed: 0,
        gamesWon: 0,
        gamesLost: 0,
        gamesDraw: 0,
    };

    const overallWinRate = calculateWinRate(stats.gamesWon, stats.gamesPlayed);
    const sortedOpponents = Object.entries(opponentStats).sort((a, b) => b[1].total - a[1].total);

    return (
        <View style={[styles.container, { backgroundColor: colors.BACKGROUND }]}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContainer}
            >
                {/* Overall Stats Section */}
                <Block>
                    <Text
                        size={22}
                        bold
                        color={colors.TEXT}
                        style={{ marginBottom: 16, paddingHorizontal: 4 }}
                    >
                        Overall Statistics
                    </Text>

                    {/* Stats Grid */}
                    <Block row style={styles.statsGrid}>
                        {renderStatCard(
                            'Games Played',
                            stats.gamesPlayed,
                            'gamepad',
                            colors.PRIMARY,
                        )}
                        {renderStatCard(
                            'Win Rate',
                            `${overallWinRate}%`,
                            'trophy',
                            colors.WARNING,
                            `${stats.gamesWon} wins`,
                        )}
                    </Block>

                    <Block row style={styles.statsGrid}>
                        {renderStatCard('Wins', stats.gamesWon, 'check-circle', colors.SUCCESS)}
                        {renderStatCard('Losses', stats.gamesLost, 'times-circle', colors.ERROR)}
                    </Block>

                    <Block row style={[styles.statsGrid, { marginBottom: theme.SIZES.BASE * 2 }]}>
                        {renderStatCard('Draws', stats.gamesDraw, 'minus-circle', colors.INFO)}
                        {renderStatCard(
                            'Completed',
                            gameHistory.length,
                            'history',
                            colors.TEXT_SECONDARY,
                            'Recent games',
                        )}
                    </Block>
                </Block>

                {/* Opponent Stats Section */}
                {sortedOpponents.length > 0 && (
                    <Block style={styles.section}>
                        <Block
                            row
                            middle
                            space='between'
                            style={{ marginBottom: 16, paddingHorizontal: 4 }}
                        >
                            <Text size={22} bold color={colors.TEXT}>
                                Matchup Statistics
                            </Text>
                        </Block>
                        <Text
                            size={14}
                            color={colors.TEXT_SECONDARY}
                            style={{ marginBottom: 12, paddingHorizontal: 4 }}
                        >
                            Win rates against each opponent (PvP & Computer)
                        </Text>
                        <Block>
                            {sortedOpponents.map(([opponentId, opponentData]) =>
                                renderOpponentRow(opponentId, opponentData),
                            )}
                        </Block>
                    </Block>
                )}

                {/* Empty State */}
                {stats.gamesPlayed === 0 && (
                    <Block
                        center
                        style={[
                            styles.emptyContainer,
                            {
                                backgroundColor: colors.CARD_BACKGROUND,
                                borderColor: colors.BORDER_COLOR,
                                shadowColor: colors.SHADOW,
                            },
                        ]}
                    >
                        <Block
                            style={{
                                width: 80,
                                height: 80,
                                borderRadius: 40,
                                backgroundColor: colors.PRIMARY + '15',
                                justifyContent: 'center',
                                alignItems: 'center',
                                marginBottom: 16,
                            }}
                        >
                            <Icon
                                name='line-chart'
                                family='font-awesome'
                                size={36}
                                color={colors.PRIMARY}
                            />
                        </Block>
                        <Text size={16} bold color={colors.TEXT} style={{ marginBottom: 8 }}>
                            No Games Yet
                        </Text>
                        <Text
                            size={14}
                            color={colors.TEXT_SECONDARY}
                            center
                            style={{ maxWidth: 240 }}
                        >
                            Start playing games to see your statistics here!
                        </Text>
                    </Block>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContainer: {
        paddingBottom: 30,
        padding: theme.SIZES.BASE * 1.5,
    },
    section: {
        marginBottom: theme.SIZES.BASE * 2,
    },
    statsGrid: {
        justifyContent: 'space-between',
        marginBottom: theme.SIZES.BASE * 1.5,
    },
    statCard: {
        width: (width - theme.SIZES.BASE * 4) / 2,
        borderRadius: 16,
        padding: theme.SIZES.BASE * 1.5,
        alignItems: 'center',
        borderWidth: 1,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    opponentRow: {
        borderRadius: 12,
        padding: theme.SIZES.BASE * 1.5,
        marginBottom: theme.SIZES.BASE,
        borderWidth: 1,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
        elevation: 2,
    },
    avatarContainer: {
        marginRight: theme.SIZES.BASE * 1.25,
    },
    emptyContainer: {
        paddingVertical: theme.SIZES.BASE * 4,
        paddingHorizontal: theme.SIZES.BASE * 2,
        borderRadius: 12,
        borderWidth: 1,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
        elevation: 2,
    },
});
