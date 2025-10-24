import { theme } from 'galio-framework';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Dimensions, ScrollView, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import {
    GameModeCard,
    ActiveGamesCard,
    GameHistoryCard,
    MatchmakingCard,
    TimeControlModal,
} from '../components/';
import FixtureLoaderModal from '../components/FixtureLoaderModal';
import { useTheme, useAuth, useAlert } from '../contexts';
import { useGame, useFirebaseFunctions, useMatchmaking } from '../hooks';
import { db, collection, query, where, onSnapshot, doc, getDoc } from '../config/firebase';

const { width, height } = Dimensions.get('screen');

// Check if dev features are enabled
const enableDevFeatures = process.env.EXPO_PUBLIC_ENABLE_DEV_FEATURES === 'true';

export default function Home({ navigation }) {
    const { colors } = useTheme();
    const { user } = useAuth();
    const { showAlert } = useAlert();
    const [fixtureModalVisible, setFixtureModalVisible] = useState(false);
    const [gameHistory, setGameHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [timeControlModalVisible, setTimeControlModalVisible] = useState(false);
    const [pendingGameAction, setPendingGameAction] = useState(null); // 'computer' or 'matchmaking'

    // Wrap callbacks in useCallback to prevent infinite re-renders
    const handleGameAccepted = useCallback(
        (gameId, gameData) => {
            navigation.navigate('Game', {
                gameId: gameId,
                gameState: gameData.gameState,
                opponentType: gameData.opponentType || 'pvp',
                opponentData: {
                    id: gameData.opponentId,
                    displayName: gameData.opponentDisplayName,
                    avatarKey: gameData.opponentAvatarKey,
                },
            });
        },
        [navigation],
    );

    // Handle matchmaking match found
    const handleMatchFound = useCallback(
        async (matchData) => {
            // Navigate to the game immediately
            navigation.navigate('Game', {
                gameId: matchData.gameId,
                opponentType: 'pvp',
                opponentData: {
                    id: matchData.opponentId,
                    displayName: matchData.opponentName,
                    avatarKey: matchData.opponentAvatarKey,
                },
            });
        },
        [navigation],
    );

    // useGame hook with navigation callbacks for real-time game events
    const {
        startComputerGame,
        activeGames,
        loading: activeGamesLoading,
        acceptGameInvite,
        declineGameInvite,
    } = useGame({
        onGameAccepted: handleGameAccepted,
    });

    // useMatchmaking hook for random matchmaking
    const {
        searching,
        queueCount,
        loading: matchmakingLoading,
        startSearching,
        stopSearching,
    } = useMatchmaking({
        onMatchFound: handleMatchFound,
    });

    const { getGameHistory, resignGame } = useFirebaseFunctions();

    // Use ref to track searching state for cleanup without triggering re-renders
    const searchingRef = useRef(searching);
    useEffect(() => {
        searchingRef.current = searching;
    }, [searching]);

    // Clean up matchmaking queue when component unmounts
    useEffect(() => {
        return () => {
            // If user is searching when unmounting, leave the queue
            if (searchingRef.current) {
                stopSearching().catch((error) => {
                    console.error('[Home] Error leaving matchmaking on unmount:', error);
                });
            }
        };
        // Empty dependency array - only run cleanup on unmount
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Helper function to fetch opponent data from Firestore
    const fetchOpponentData = async (gameData, userId) => {
        try {
            // Determine opponent ID based on user's role in the game
            const opponentId =
                gameData.creatorId === userId ? gameData.opponentId : gameData.creatorId;

            // Handle computer opponent
            if (opponentId === 'computer' || gameData.opponentType === 'computer') {
                return {
                    opponentDisplayName: 'Computer',
                    opponentAvatarKey: 'computer',
                };
            }

            // Fetch opponent user data
            const opponentDoc = await getDoc(doc(db, 'users', opponentId));
            if (opponentDoc.exists()) {
                const opponentData = opponentDoc.data();
                const displayName = opponentData.displayName || 'Player';
                const discriminator = opponentData.discriminator;
                const avatarKey = opponentData.settings?.avatarKey || 'dolphin';

                return {
                    opponentDisplayName: discriminator
                        ? `${displayName} #${discriminator}`
                        : displayName,
                    opponentAvatarKey: avatarKey,
                };
            }

            // Fallback if opponent not found
            return {
                opponentDisplayName: 'Opponent',
                opponentAvatarKey: 'dolphin',
            };
        } catch (error) {
            console.error('Error fetching opponent data:', error);
            return {
                opponentDisplayName: 'Opponent',
                opponentAvatarKey: 'dolphin',
            };
        }
    };

    // Initial load and set up game history listeners on mount
    useEffect(() => {
        if (!user || !user.uid) {
            setHistoryLoading(false);
            return;
        }

        let historyGames = [];
        let creatorInitialSnapshot = true;
        let opponentInitialSnapshot = true;

        // Initial load - only call Firebase Function once on mount
        const initialLoad = async () => {
            try {
                const result = await getGameHistory();
                historyGames = result.games || [];
                setGameHistory(historyGames);
            } catch (error) {
                console.error('[Home] Error loading game history:', error);
            } finally {
                setHistoryLoading(false);
            }
        };

        initialLoad();

        // Listen to completed/cancelled games where user is creator
        const historyCreatorQuery = query(
            collection(db, 'games'),
            where('creatorId', '==', user.uid),
            where('status', 'in', ['completed', 'cancelled']),
        );

        // Listen to completed/cancelled games where user is opponent
        const historyOpponentQuery = query(
            collection(db, 'games'),
            where('opponentId', '==', user.uid),
            where('status', 'in', ['completed', 'cancelled']),
        );

        const historyCreatorUnsubscribe = onSnapshot(historyCreatorQuery, async (snapshot) => {
            if (creatorInitialSnapshot) {
                creatorInitialSnapshot = false;
                return; // Skip initial snapshot (already loaded via initialLoad)
            }

            // Process snapshot changes locally without calling Firebase Function
            const updatedHistory = [...historyGames];
            let hasChanges = false;

            // Process changes sequentially to fetch opponent data
            for (const change of snapshot.docChanges()) {
                const gameData = { id: change.doc.id, ...change.doc.data() };
                const existingIndex = updatedHistory.findIndex((g) => g.id === gameData.id);

                if (change.type === 'added') {
                    // New completed/cancelled game (likely just finished)
                    if (existingIndex === -1) {
                        // Fetch opponent data if not already present
                        const opponentData = gameData.opponentDisplayName
                            ? {
                                  opponentDisplayName: gameData.opponentDisplayName,
                                  opponentAvatarKey: gameData.opponentAvatarKey || 'dolphin',
                              }
                            : await fetchOpponentData(gameData, user.uid);

                        updatedHistory.unshift({
                            // Add to start for most recent
                            ...gameData,
                            ...opponentData,
                        });
                        hasChanges = true;
                    }
                } else if (change.type === 'modified') {
                    // Game data updated (rare for completed games)
                    if (existingIndex !== -1) {
                        const previousGame = updatedHistory[existingIndex];
                        updatedHistory[existingIndex] = {
                            ...gameData,
                            opponentDisplayName: previousGame.opponentDisplayName || 'Opponent',
                            opponentAvatarKey: previousGame.opponentAvatarKey || 'dolphin',
                            opponentType: previousGame.opponentType,
                        };
                        hasChanges = true;
                    }
                } else if (change.type === 'removed') {
                    // Game removed (very rare)
                    if (existingIndex !== -1) {
                        updatedHistory.splice(existingIndex, 1);
                        hasChanges = true;
                    }
                }
            }

            if (hasChanges) {
                historyGames = updatedHistory;
                setGameHistory(updatedHistory);
            }
        });

        const historyOpponentUnsubscribe = onSnapshot(historyOpponentQuery, async (snapshot) => {
            if (opponentInitialSnapshot) {
                opponentInitialSnapshot = false;
                return; // Skip initial snapshot (already loaded via initialLoad)
            }

            // Process snapshot changes locally without calling Firebase Function
            const updatedHistory = [...historyGames];
            let hasChanges = false;

            // Process changes sequentially to fetch opponent data
            for (const change of snapshot.docChanges()) {
                const gameData = { id: change.doc.id, ...change.doc.data() };
                const existingIndex = updatedHistory.findIndex((g) => g.id === gameData.id);

                if (change.type === 'added') {
                    // New completed/cancelled game where user is opponent
                    if (existingIndex === -1) {
                        // Fetch opponent data if not already present
                        const opponentData = gameData.opponentDisplayName
                            ? {
                                  opponentDisplayName: gameData.opponentDisplayName,
                                  opponentAvatarKey: gameData.opponentAvatarKey || 'dolphin',
                              }
                            : await fetchOpponentData(gameData, user.uid);

                        updatedHistory.unshift({
                            // Add to start for most recent
                            ...gameData,
                            ...opponentData,
                        });
                        hasChanges = true;
                    }
                } else if (change.type === 'modified') {
                    if (existingIndex !== -1) {
                        const previousGame = updatedHistory[existingIndex];
                        updatedHistory[existingIndex] = {
                            ...gameData,
                            opponentDisplayName: previousGame.opponentDisplayName || 'Opponent',
                            opponentAvatarKey: previousGame.opponentAvatarKey || 'dolphin',
                            opponentType: previousGame.opponentType,
                        };
                        hasChanges = true;
                    }
                } else if (change.type === 'removed') {
                    if (existingIndex !== -1) {
                        updatedHistory.splice(existingIndex, 1);
                        hasChanges = true;
                    }
                }
            }

            if (hasChanges) {
                historyGames = updatedHistory;
                setGameHistory(updatedHistory);
            }
        });

        // Cleanup on unmount
        return () => {
            historyCreatorUnsubscribe();
            historyOpponentUnsubscribe();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    const handleStartComputerGame = () => {
        setPendingGameAction('computer');
        setTimeControlModalVisible(true);
    };

    const handleStartMatchmaking = () => {
        // Check if user has any active games
        const hasActiveGames = activeGames.some((game) => game.status === 'active');

        if (hasActiveGames) {
            showAlert(
                'Cannot Join Matchmaking',
                'You already have an active game. Finish it before joining matchmaking.',
            );
            return { success: false, error: 'Active game exists' };
        }

        setPendingGameAction('matchmaking');
        setTimeControlModalVisible(true);
        return { success: true };
    };

    const handleTimeControlSelect = async (timeControl) => {
        setTimeControlModalVisible(false);

        try {
            if (pendingGameAction === 'computer') {
                const result = await startComputerGame(timeControl);
                if (result.success) {
                    navigation.navigate('Game', {
                        gameId: result.gameId || null,
                        opponentType: 'computer',
                    });
                }
            } else if (pendingGameAction === 'matchmaking') {
                const result = await startSearching(timeControl);
                if (result && !result.success && result.error) {
                    showAlert('Cannot Join Matchmaking', result.error);
                }
            }
        } catch (error) {
            console.error(`Failed to start ${pendingGameAction}:`, error);
            showAlert('Error', `Failed to start ${pendingGameAction}. Please try again.`);
        } finally {
            setPendingGameAction(null);
        }
    };

    const handleTimeControlCancel = () => {
        setTimeControlModalVisible(false);
        setPendingGameAction(null);
    };

    const handleOpenFixtureLoader = () => {
        setFixtureModalVisible(true);
    };

    const handleSelectFixture = (fixture, fixtureName) => {
        // Navigate to game with the fixture
        navigation.navigate('Game', {
            fixture: fixture,
            fixtureName: fixtureName,
        });
    };

    const handleResignGame = async (gameId) => {
        try {
            await resignGame({ gameId });
            // The game will be automatically moved to history via Firestore listeners
        } catch (error) {
            console.error('Failed to resign game:', error);
            showAlert('Error', 'Failed to resign game. Please try again.');
        }
    };

    return (
        <LinearGradient
            colors={[colors.GRADIENT_START, colors.GRADIENT_MID, colors.GRADIENT_END]}
            style={styles.gradient}
        >
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                style={styles.scrollView}
            >
                {/* Active Games Card - show at top if there are games */}
                {activeGames.length > 0 && (
                    <ActiveGamesCard
                        navigation={navigation}
                        activeGames={activeGames}
                        loading={activeGamesLoading}
                        acceptGameInvite={acceptGameInvite}
                        declineGameInvite={declineGameInvite}
                        resignGame={handleResignGame}
                    />
                )}

                {/* Game Mode Cards */}
                {user && (
                    <MatchmakingCard
                        searching={searching}
                        queueCount={queueCount}
                        loading={matchmakingLoading}
                        onStartSearch={handleStartMatchmaking}
                        onStopSearch={stopSearching}
                    />
                )}

                <GameModeCard
                    title='Play vs Computer'
                    description='Start a new game against the AI'
                    icon='desktop'
                    iconFamily='font-awesome'
                    onPress={handleStartComputerGame}
                />

                {enableDevFeatures && (
                    <GameModeCard
                        title='Load Game State (Dev)'
                        description='Load a saved game state from fixtures'
                        icon='folder-open'
                        iconFamily='font-awesome'
                        onPress={handleOpenFixtureLoader}
                    />
                )}

                {/* Active Games Card - show at bottom if there are no games */}
                {activeGames.length === 0 && (
                    <ActiveGamesCard
                        navigation={navigation}
                        activeGames={activeGames}
                        loading={activeGamesLoading}
                        acceptGameInvite={acceptGameInvite}
                        declineGameInvite={declineGameInvite}
                        resignGame={handleResignGame}
                    />
                )}

                {/* Game History Card */}
                <GameHistoryCard
                    navigation={navigation}
                    gameHistory={gameHistory}
                    loading={historyLoading}
                />
            </ScrollView>

            <FixtureLoaderModal
                visible={fixtureModalVisible}
                onClose={() => setFixtureModalVisible(false)}
                onSelectFixture={handleSelectFixture}
            />

            <TimeControlModal
                visible={timeControlModalVisible}
                onSelect={handleTimeControlSelect}
                onCancel={handleTimeControlCancel}
            />
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    gradient: {
        flex: 1,
        width: width,
        height: height,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingVertical: theme.SIZES.BASE * 2,
        paddingHorizontal: theme.SIZES.BASE,
        paddingBottom: theme.SIZES.BASE * 3,
    },
});
