import { useFocusEffect } from '@react-navigation/native';
import { Block, Text, theme } from 'galio-framework';
import { useCallback, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, View } from 'react-native';
import { moderateScale, scale } from 'react-native-size-matters';

import { Avatar, Icon, LoadingScreen } from '../components';
import { useAuth, useTheme } from '../contexts';
import { useFirebaseFunctions } from '../hooks';
import i18n from '../i18n';

const { width } = Dimensions.get('screen');

export default function Stats({ navigation: _navigation }) {
    const { user } = useAuth();
    const { colors, isDarkMode: _isDarkMode } = useTheme();
    const { getGameHistory, getPublicUserInfo } = useFirebaseFunctions();

    const [loading, setLoading] = useState(true);
    const [_gameHistory, setGameHistory] = useState([]);
    const [opponentStats, setOpponentStats] = useState({});
    const [overallStats, setOverallStats] = useState({
        gamesPlayed: 0,
        gamesWon: 0,
        gamesLost: 0,
        gamesDraw: 0,
    });

    const loadStats = useCallback(async () => {
        if (!user || !user.uid) return;

        try {
            setLoading(true);
            const historyResult = await getGameHistory();
            const games = historyResult.games || [];
            setGameHistory(games);

            // Calculate stats per opponent and overall stats
            const stats = {};
            const overall = {
                gamesPlayed: 0,
                gamesWon: 0,
                gamesLost: 0,
                gamesDraw: 0,
            };

            games.forEach((game) => {
                if (game.status !== 'completed') {
                    return;
                }

                // Determine opponent based on game type
                let opponentId,
                    opponentName,
                    opponentAvatar,
                    isComputer = false;

                // First determine opponentId
                const potentialOpponentId =
                    game.creatorId === user.uid ? game.opponentId : game.creatorId;

                if (
                    game.gameType === 'computer' ||
                    game.isComputer ||
                    game.opponentType === 'computer' ||
                    potentialOpponentId === 'computer'
                ) {
                    // Computer opponent
                    // Check if it's old 'computer' ID or new computer user ID
                    if (potentialOpponentId === 'computer') {
                        // Old computer games
                        opponentId = 'computer';
                        opponentId = 'computer';
                        opponentName = i18n.t('common.computer');
                        opponentAvatar = 'computer';
                    } else {
                        // New computer users with actual IDs - use their display name from game data
                        // Determine which display name to use based on whether user is creator or opponent
                        opponentId = potentialOpponentId;
                        // If user is creator, opponent is opponentId, so use opponentDisplayName
                        // If user is opponent, opponent is creatorId, so use creatorDisplayName
                        opponentName =
                            game.opponentDisplayName || game.creatorDisplayName || i18n.t('common.computer');
                        opponentAvatar =
                            game.opponentAvatarKey || game.creatorAvatarKey || 'dolphin';
                    }
                    isComputer = true;
                } else {
                    // PvP opponent
                    opponentId = potentialOpponentId;
                    opponentId = potentialOpponentId;
                    opponentName =
                        game.opponentDisplayName || game.opponentName || i18n.t('common.unknown');
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

                if (
                    game.gameType === 'computer' ||
                    game.isComputer ||
                    game.opponentType === 'computer'
                ) {
                    // For computer games, user is always white ('w')
                    // Winner is stored as 'w' or 'b' (the color that won)
                    const winner = game.winner || game.result?.winner;
                    if (winner) {
                        userWon = winner === 'w'; // User always plays white against computer
                        userLost = winner === 'b' || winner === 'computer';
                    }
                } else {
                    // For PvP games - check both winner field and result.winner for compatibility
                    const userColor = game.creatorId === user.uid ? 'w' : 'b';
                    const winner = game.winner || game.result?.winner;

                    if (winner) {
                        userWon = winner === userColor || winner === user.uid;
                        userLost = winner !== userColor && winner !== user.uid;
                    }
                    // If no winner, it's a draw (handled by else clause below)
                }

                if (userWon) {
                    stats[opponentId].wins++;
                    overall.gamesWon++;
                } else if (userLost) {
                    stats[opponentId].losses++;
                    overall.gamesLost++;
                } else {
                    stats[opponentId].draws++;
                    overall.gamesDraw++;
                }
                stats[opponentId].total++;
                overall.gamesPlayed++;
            });

            // Fetch current user data for each opponent to get latest avatars and names
            // Skip deleted users (those already showing as "Anonymous") and old 'computer' ID
            // But include computer user IDs so we can fetch their display names
            const opponentIds = Object.keys(stats).filter(
                (id) => id !== 'computer' && stats[id].name !== 'Anonymous',
            );
            for (const opponentId of opponentIds) {
                try {
                    const result = await getPublicUserInfo(opponentId);
                    if (result.success && result.user) {
                        const { displayName, discriminator, avatarKey } = result.user;
                        // Update with current display name
                        stats[opponentId].name = discriminator
                            ? `${displayName} #${discriminator}`
                            : displayName;
                        // Update with current avatar
                        stats[opponentId].avatarKey = avatarKey;
                    }
                } catch (error) {
                    console.error(`Error fetching current data for opponent ${opponentId}:`, error);
                    // Keep historical data if fetch fails
                }
            }

            setOpponentStats(stats);
            setOverallStats(overall);
        } catch (error) {
            console.error('Error loading stats:', error);
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    // Load stats when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            if (user && user.uid) {
                loadStats();
            }
        }, [loadStats, user]),
    );

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
                    width: scale(50),
                    height: scale(50),
                    borderRadius: scale(25),
                    backgroundColor: iconColor + '15',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginBottom: 12,
                }}
            >
                <Icon
                    name={icon}
                    family='font-awesome'
                    size={moderateScale(24)}
                    color={iconColor}
                />
            </Block>
            <Text
                size={moderateScale(32)}
                bold
                color={colors.TEXT}
                style={{ marginBottom: 4 }}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.6}
            >
                {value}
            </Text>
            <Text
                size={moderateScale(14)}
                color={colors.TEXT_SECONDARY}
                style={{ marginBottom: 2 }}
            >
                {label}
            </Text>
            {subtext && (
                <Text size={moderateScale(12)} color={colors.TEXT_SECONDARY}>
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
                    <Avatar
                        avatarKey={stats.avatarKey}
                        computer={stats.isComputer}
                        size='medium'
                        style={styles.avatarContainer}
                    />
                    <Block flex style={{ marginRight: 8 }}>
                        <Text
                            size={moderateScale(16)}
                            bold
                            color={colors.TEXT}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            minimumFontScale={0.7}
                            style={{ marginBottom: 4 }}
                        >
                            {stats.name}
                        </Text>
                        <Block row>
                            <Text
                                size={moderateScale(13)}
                                color={colors.SUCCESS}
                                style={{ marginRight: 12 }}
                                numberOfLines={1}
                                adjustsFontSizeToFit
                                minimumFontScale={0.7}
                            >
                                {stats.wins}W
                            </Text>
                            <Text
                                size={moderateScale(13)}
                                color={colors.ERROR}
                                style={{ marginRight: 12 }}
                                numberOfLines={1}
                                adjustsFontSizeToFit
                                minimumFontScale={0.7}
                            >
                                {stats.losses}L
                            </Text>
                            <Text
                                size={moderateScale(13)}
                                color={colors.TEXT_SECONDARY}
                                numberOfLines={1}
                                adjustsFontSizeToFit
                                minimumFontScale={0.7}
                            >
                                {stats.draws}D
                            </Text>
                        </Block>
                    </Block>
                    <Block center style={{ minWidth: 60 }}>
                        <Text
                            size={moderateScale(20)}
                            bold
                            color={colors.PRIMARY}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            minimumFontScale={0.7}
                        >
                            {winRate}%
                        </Text>
                        <Text size={moderateScale(11)} color={colors.TEXT_SECONDARY}>
                            {i18n.t('stats.winRate')}
                        </Text>
                    </Block>
                </Block>
            </Block>
        );
    };

    if (loading) {
        return <LoadingScreen />;
    }

    const overallWinRate = calculateWinRate(overallStats.gamesWon, overallStats.gamesPlayed);
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
                        size={moderateScale(22)}
                        bold
                        color={colors.TEXT}
                        style={{ marginBottom: 16, paddingHorizontal: 4 }}
                    >
                        {i18n.t('stats.overall')}
                    </Text>

                    {/* Large Games Played Card */}
                    <Block
                        style={[
                            styles.largeStatCard,
                            {
                                backgroundColor: colors.CARD_BACKGROUND,
                                borderColor: colors.BORDER_COLOR,
                                shadowColor: colors.SHADOW,
                            },
                        ]}
                    >
                        <Block center>
                            <Block
                                center
                                style={{
                                    width: scale(80),
                                    height: scale(80),
                                    borderRadius: scale(40),
                                    backgroundColor: colors.PRIMARY + '15',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    marginBottom: 16,
                                }}
                            >
                                <Icon
                                    name='gamepad'
                                    family='font-awesome'
                                    size={moderateScale(40)}
                                    color={colors.PRIMARY}
                                />
                            </Block>
                            <Text
                                size={moderateScale(48)}
                                bold
                                color={colors.TEXT}
                                style={{ marginBottom: 8 }}
                                numberOfLines={1}
                                adjustsFontSizeToFit
                                minimumFontScale={0.6}
                            >
                                {overallStats.gamesPlayed}
                            </Text>
                            <Text size={moderateScale(18)} color={colors.TEXT_SECONDARY}>
                                {i18n.t('stats.gamesPlayed')}
                            </Text>
                        </Block>
                    </Block>

                    {/* Stats Grid */}
                    <Block row style={styles.statsGrid}>
                        {renderStatCard(
                            i18n.t('stats.wins'),
                            overallStats.gamesWon,
                            'check-circle',
                            colors.SUCCESS,
                        )}
                        {renderStatCard(
                            i18n.t('stats.losses'),
                            overallStats.gamesLost,
                            'times-circle',
                            colors.ERROR,
                        )}
                    </Block>

                    <Block row style={[styles.statsGrid, { marginBottom: theme.SIZES.BASE * 2 }]}>
                        {renderStatCard(
                            i18n.t('stats.draws'),
                            overallStats.gamesDraw,
                            'minus-circle',
                            colors.INFO,
                        )}
                        {renderStatCard(i18n.t('stats.winRate'), `${overallWinRate}%`, 'trophy', colors.WARNING)}
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
                            <Text size={moderateScale(22)} bold color={colors.TEXT}>
                                {i18n.t('stats.matchups')}
                            </Text>
                        </Block>
                        <Text
                            size={moderateScale(14)}
                            color={colors.TEXT_SECONDARY}
                            style={{ marginBottom: 12, paddingHorizontal: 4 }}
                        >
                            {i18n.t('stats.matchupsDesc')}
                        </Text>
                        <Block>
                            {sortedOpponents
                                .slice(0, 5)
                                .map(([opponentId, opponentData]) =>
                                    renderOpponentRow(opponentId, opponentData),
                                )}
                        </Block>
                    </Block>
                )}

                {/* Empty State */}
                {overallStats.gamesPlayed === 0 && (
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
                                width: scale(80),
                                height: scale(80),
                                borderRadius: scale(40),
                                backgroundColor: colors.PRIMARY + '15',
                                justifyContent: 'center',
                                alignItems: 'center',
                                marginBottom: 16,
                            }}
                        >
                            <Icon
                                name='line-chart'
                                family='font-awesome'
                                size={moderateScale(36)}
                                color={colors.PRIMARY}
                            />
                        </Block>
                        <Text
                            size={moderateScale(16)}
                            bold
                            color={colors.TEXT}
                            style={{ marginBottom: 8 }}
                        >
                            {i18n.t('stats.noGames')}
                        </Text>
                        <Text
                            size={moderateScale(14)}
                            color={colors.TEXT_SECONDARY}
                            center
                            style={{ maxWidth: 240 }}
                        >
                            {i18n.t('stats.startPlaying')}
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
    largeStatCard: {
        width: '100%',
        borderRadius: 20,
        padding: theme.SIZES.BASE * 3,
        marginBottom: theme.SIZES.BASE * 1.5,
        borderWidth: 1,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
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
