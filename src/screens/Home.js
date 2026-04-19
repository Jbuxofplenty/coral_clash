import { LinearGradient } from 'expo-linear-gradient';
import { theme } from 'galio-framework';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, InteractionManager } from 'react-native';
import { END_GAME_TUTORIAL_FIXTURE } from '../constants/endGameTutorial';
import { RULES_VIDEO_URL } from '../constants';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
    ActiveGamesCard,
    BannerAd,
    ComputerUsersManagement,
    GameHistoryCard,
    GameModeCard,
    MatchmakingCard,
    MatchmakingModeSelectionModal,
    PlayWithFriendCard,
    SignUpPromptCard,
    TimeControlModal,
} from '../components/';
import DifficultySelectionModal from '../components/DifficultySelectionModal';
import FixtureLoaderModal from '../components/FixtureLoaderModal';
import { collection, db, onSnapshot, query, where } from '../config/firebase';
import { useAlert, useAuth, useTheme } from '../contexts';
import { useDevFeatures, useFirebaseFunctions, useGame, useMatchmaking } from '../hooks';
import { useFriends } from '../hooks/useFriends';
import { logAnalyticsEvent, logTutorialStep } from '../utils/analyticsEvents';
import { savePassAndPlayGame } from '../utils/passAndPlayStorage';

const { width, height } = Dimensions.get('screen');

export default function Home({ navigation }) {
    const { t } = useTranslation();
    const { colors } = useTheme();
    const { user } = useAuth();
    const { showAlert } = useAlert();
    const enableDevFeatures = useDevFeatures();
    const [fixtureModalVisible, setFixtureModalVisible] = useState(false);
    const [gameHistory, setGameHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [timeControlModalVisible, setTimeControlModalVisible] = useState(false);
    const [matchmakingModeModalVisible, setMatchmakingModeModalVisible] = useState(false);
    const [difficultyModalVisible, setDifficultyModalVisible] = useState(false);
    const [pendingGameAction, setPendingGameAction] = useState(null); // 'computer', 'matchmaking', or 'friend'
    const [creatingGame, setCreatingGame] = useState(false); // Track when a game is being created
    const [selectedFriend, setSelectedFriend] = useState(null); // Store selected friend for game invite
    const [pendingTimeControl, setPendingTimeControl] = useState(null); // Store time control while showing difficulty modal or mode selection

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
        sendGameRequest,
        sendingGameRequest,
        activeGames,
        loading: activeGamesLoading,
        acceptGameInvite,
        declineGameInvite,
    } = useGame({
        onGameAccepted: handleGameAccepted,
    });

    // useFriends hook to get friends list
    const { friends, loading: friendsLoading } = useFriends();

    // useMatchmaking hook for random matchmaking
    const {
        searching,
        loading: matchmakingLoading,
        startSearching,
        stopSearching,
    } = useMatchmaking({
        onMatchFound: handleMatchFound,
    });

    const { getGameHistory, resignGame, getPublicUserInfo, findCorrespondenceMatch } =
        useFirebaseFunctions();

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

    // Check for first launch
    useEffect(() => {
        const checkFirstLaunch = async () => {
            try {
                const hasLaunched = await AsyncStorage.getItem('has_seen_welcome_notification');
                if (hasLaunched === null) {
                    await AsyncStorage.setItem('has_seen_welcome_notification', 'true');
                    
                    // If user is not logged in, drop them in an endgame tutorial
                    if (!user) {
                        // Track tutorial start for anonymous users
                        logAnalyticsEvent('tutorial_begin', { tutorial_type: 'end_game' });
                        logTutorialStep(1, 'end_game_begin', 'end_game');

                        navigation.navigate('Game', {
                            gameId: null, // offline mode
                            opponentType: 'computer',
                            difficulty: 'random',
                            fixture: END_GAME_TUTORIAL_FIXTURE,
                            isEndGameTutorial: true,
                        });
                        return;
                    }

                    // Otherwise show standard popup
                    showAlert(
                        t('home.welcome.title'),
                        t('home.welcome.message'),
                        [
                            {
                                text: t('home.welcome.watchVideo'),
                                onPress: () => Linking.openURL(RULES_VIDEO_URL),
                            },
                            {
                                text: t('home.welcome.howToPlay'),
                                onPress: () => {
                                    logAnalyticsEvent('tutorial_begin', { tutorial_type: 'how_to_play' });
                                    logTutorialStep(1, 'how_to_play_begin', 'how_to_play');
                                    navigation.navigate('How-To Play');
                                },
                            },
                            { text: t('home.welcome.ok') },
                        ],
                        true, // Vertical buttons
                    );
                }
            } catch (error) {
                console.error('Error checking first launch:', error);
            }
        };

        checkFirstLaunch();
        // Run only once on mount
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, navigation]);

    // Helper function to extract opponent data from game data
    // Uses snapshot data if available, otherwise fetches current data
    const fetchOpponentData = async (gameData, userId) => {
        // Determine opponent ID based on user's role in the game
        const opponentId = gameData.creatorId === userId ? gameData.opponentId : gameData.creatorId;

        // Handle computer opponent
        if (opponentId === 'computer' || gameData.opponentType === 'computer') {
            return {
                opponentDisplayName: t('home.opponent.computer'),
                opponentAvatarKey: 'computer',
            };
        }

        // Use snapshot data from game document (for new games)
        // If user is creator, opponent data is in opponentDisplayName/opponentAvatarKey
        // If user is opponent, opponent data is in creatorDisplayName/creatorAvatarKey
        const isCreator = gameData.creatorId === userId;
        const snapshotDisplayName = isCreator
            ? gameData.opponentDisplayName
            : gameData.creatorDisplayName;
        const snapshotAvatarKey = isCreator
            ? gameData.opponentAvatarKey
            : gameData.creatorAvatarKey;

        // If snapshot data exists, use it
        if (snapshotDisplayName && snapshotAvatarKey) {
            return {
                opponentDisplayName: snapshotDisplayName,
                opponentAvatarKey: snapshotAvatarKey,
            };
        }

        // Fallback: fetch current data for old games without snapshots
        try {
            const result = await getPublicUserInfo(opponentId);
            if (result.success && result.user) {
                const { displayName, discriminator, avatarKey } = result.user;
                return {
                    opponentDisplayName: discriminator
                        ? `${displayName} #${discriminator}`
                        : displayName,
                    opponentAvatarKey: avatarKey,
                };
            }
        } catch (error) {
            console.error('Error fetching opponent data:', error);
        }

        // Final fallback
        return {
            opponentDisplayName: t('home.opponent.opponent'),
            opponentAvatarKey: 'dolphin',
        };
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
        let historyCreatorUnsubscribe = () => {};
        let historyOpponentUnsubscribe = () => {};
        let isCancelled = false;

        const task = InteractionManager.runAfterInteractions(() => {
            if (isCancelled) return;

            // Initial load - only call Firebase Function once on mount
            const initialLoad = async () => {
                try {
                    const result = await getGameHistory();
                    if (isCancelled) return;
                    historyGames = result.games || [];
                    setGameHistory(historyGames);
                } catch (error) {
                    console.error('[Home] Error loading game history:', error);
                } finally {
                    if (!isCancelled) setHistoryLoading(false);
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

            historyCreatorUnsubscribe = onSnapshot(historyCreatorQuery, async (snapshot) => {
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

        historyOpponentUnsubscribe = onSnapshot(historyOpponentQuery, async (snapshot) => {
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
        });

        // Cleanup on unmount
        return () => {
            isCancelled = true;
            if (task) task.cancel();
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
        setPendingGameAction('matchmaking');
        setTimeControlModalVisible(true);
    };

    const handleSelectFriend = (friendId, friendName) => {
        setSelectedFriend({ id: friendId, name: friendName });
        setPendingGameAction('friend');
        setTimeControlModalVisible(true);
    };

    const handlePassAndPlay = async () => {
        setCreatingGame(true);
        try {
            // Always use unlimited time control for pass-and-play games
            const timeControl = { type: 'unlimited', totalSeconds: null };

            // Create and save pass-and-play game with initial state
            const gameId = await savePassAndPlayGame({
                opponentType: 'passandplay',
                timeControl: timeControl,
                // Pass empty object for gameState - will be initialized as default position
                gameState: {},
            });

            // Navigate to pass and play game
            navigation.navigate('Game', {
                gameId: gameId,
                opponentType: 'passandplay',
                timeControl: timeControl,
                opponentData: {
                    displayName: t('home.opponent.guest'),
                    avatarKey: 'crab', // Different avatar for guest player
                },
                // Don't pass gameState on navigation - let CoralClash initialize fresh
            });
        } catch (error) {
            console.error('Failed to start pass-and-play:', error);
            showAlert(t('home.errors.errorTitle'), t('home.errors.failedPassAndPlay'));
        } finally {
            setCreatingGame(false);
        }
    };

    const handleResumePassAndPlay = (game) => {
        // Navigate to existing pass-and-play game
        // Only pass gameState if it has actual data (not empty object)
        const hasGameState = game.gameState && Object.keys(game.gameState).length > 0;

        navigation.navigate('Game', {
            gameId: game.id,
            opponentType: 'passandplay',
            ...(hasGameState && { gameState: game.gameState }),
            timeControl: game.timeControl,
            opponentData: {
                displayName: t('home.opponent.guest'),
                avatarKey: 'crab',
            },
        });
    };

    const handleTimeControlSelect = async (timeControl) => {
        setTimeControlModalVisible(false);

        // For computer games, show difficulty selection after time control
        if (pendingGameAction === 'computer') {
            setPendingTimeControl(timeControl);
            setDifficultyModalVisible(true);
            return;
        }

        // For matchmaking, show mode selection modal
        if (pendingGameAction === 'matchmaking') {
            setPendingTimeControl(timeControl);
            setMatchmakingModeModalVisible(true);
            return;
        }

        // For other game types (friend invites), proceed with game creation
        setCreatingGame(true);

        try {
            if (pendingGameAction === 'friend' && selectedFriend) {
                // Log event when user initiates a match with a friend
                logAnalyticsEvent('initiate_match_friend', {
                    time_control: timeControl.type,
                });

                await sendGameRequest(selectedFriend.id, selectedFriend.name, timeControl);
                // Game request sent successfully via useGame hook
                setSelectedFriend(null);
            } else if (pendingGameAction === 'passandplay') {
                logAnalyticsEvent('initiate_match_passandplay', {
                    time_control: timeControl.type,
                });

                // Create and save pass-and-play game with initial state
                const gameId = await savePassAndPlayGame({
                    opponentType: 'passandplay',
                    timeControl: timeControl,
                    // Pass empty object for gameState - will be initialized as default position
                    gameState: {},
                });

                // Navigate to pass and play game
                navigation.navigate('Game', {
                    gameId: gameId,
                    opponentType: 'passandplay',
                    timeControl: timeControl,
                    opponentData: {
                        displayName: t('home.opponent.guest'),
                        avatarKey: 'crab', // Different avatar for guest player
                    },
                    // Don't pass gameState on navigation - let CoralClash initialize fresh
                });
            }
        } catch (error) {
            console.error(`Failed to start ${pendingGameAction}:`, error);

            // For computer games, fall back to offline mode on any error
            if (pendingGameAction === 'computer') {
                console.log('Error starting online computer game, falling back to offline mode');
                showAlert(
                    t('home.errors.offlineModeTitle'),
                    t('home.errors.offlineModeMessage'),
                );
                navigation.navigate('Game', {
                    gameId: null, // null gameId = offline mode
                    opponentType: 'computer',
                });
            } else {
                showAlert(t('home.errors.errorTitle'), t('home.errors.failedToStart', { action: pendingGameAction }));
            }
        } finally {
            setCreatingGame(false);
            setPendingGameAction(null);
        }
    };

    const handleTimeControlCancel = () => {
        setTimeControlModalVisible(false);
        setPendingGameAction(null);
        setSelectedFriend(null);
        setPendingTimeControl(null);
    };

    const handleMatchmakingModeSelect = async (mode) => {
        setMatchmakingModeModalVisible(false);
        setCreatingGame(true);

        try {
            if (mode === 'instant') {
                // Log event for instant match
                logAnalyticsEvent('initiate_match_instant', {
                    time_control: pendingTimeControl?.type,
                });

                const result = await startSearching(pendingTimeControl);
                if (result && !result.success && result.error) {
                    showAlert(t('home.matchmaking.cannotJoin'), result.error);
                }
            } else if (mode === 'correspondence') {
                // Log event for correspondence match
                logAnalyticsEvent('initiate_match_correspondence', {
                    time_control: pendingTimeControl?.type,
                });

                // Try to find an existing correspondence invitation to match with
                const matchResult = await findCorrespondenceMatch(pendingTimeControl);

                if (matchResult.success) {
                    // Successfully matched to an existing invitation
                    showAlert(
                        t('home.matchmaking.instantMatchFound'),
                        t('home.matchmaking.instantMatchMessage', { creatorName: matchResult.creatorName }),
                    );
                } else if (matchResult.noMatches) {
                    // No available invitations - create one!
                    // This happens automatically as a fallback in the Cloud Function
                    showAlert(
                        t('home.matchmaking.correspondenceCreated'),
                        t('home.matchmaking.correspondenceMessage'),
                    );
                }
            }
        } catch (error) {
            console.error(`Failed to start ${mode} matchmaking:`, error);
            console.error('Error details:', {
                message: error.message,
                code: error.code,
                stack: error.stack,
            });
            showAlert(
                t('home.errors.errorTitle'),
                t('home.errors.failedMatchmaking', { mode: mode, message: error.message || t('home.errors.failedToStart', { action: mode }) }),
            );
        } finally {
            setCreatingGame(false);
            setPendingGameAction(null);
            setPendingTimeControl(null);
        }
    };

    const handleMatchmakingModeCancel = () => {
        setMatchmakingModeModalVisible(false);
        setPendingTimeControl(null);
        // Optionally go back to time control selection
        // setTimeControlModalVisible(true);
    };

    const handleDifficultySelect = async (difficulty) => {
        setDifficultyModalVisible(false);
        setCreatingGame(true);

        try {
            // Log event when user initiates a match against a computer
            logAnalyticsEvent('initiate_match_computer', {
                difficulty: difficulty,
                time_control: pendingTimeControl?.type,
            });

            // Start computer game with both timeControl and difficulty
            const result = await startComputerGame(pendingTimeControl, difficulty);
            if (result.success) {
                navigation.navigate('Game', {
                    gameId: result.gameId || null,
                    opponentType: 'computer',
                    difficulty: difficulty,
                });
            } else {
                // Fallback to offline mode if online game creation fails
                console.log('Online computer game failed, starting offline mode');
                showAlert(
                    t('home.errors.offlineModeTitle'),
                    t('home.errors.offlineModeMessage'),
                );
                navigation.navigate('Game', {
                    gameId: null, // null gameId = offline mode
                    opponentType: 'computer',
                    difficulty: difficulty,
                });
            }
        } catch (error) {
            console.error('Error starting computer game:', error);
            showAlert(t('home.errors.errorTitle'), error.message || t('home.errors.failedComputerGame'));
            // Fallback to offline mode on error
            navigation.navigate('Game', {
                gameId: null,
                opponentType: 'computer',
                difficulty: difficulty,
            });
        } finally {
            setCreatingGame(false);
            setPendingTimeControl(null);
            setPendingGameAction(null);
        }
    };

    const handleDifficultyCancel = () => {
        setDifficultyModalVisible(false);
        setPendingTimeControl(null);
        // Optionally go back to time control selection
        // setTimeControlModalVisible(true);
    };

    const handleOpenFixtureLoader = () => {
        setFixtureModalVisible(true);
    };

    const handleSelectFixture = (fixture, fixtureName, gameMode) => {
        // Navigate to game with the fixture and selected game mode
        navigation.navigate('Game', {
            fixture: fixture,
            fixtureName: fixtureName,
            opponentType: gameMode, // Pass the selected mode ('computer' or 'passandplay')
        });
    };

    const handleResignGame = async (gameId) => {
        try {
            await resignGame({ gameId });

            // Track resign from active games card
            logAnalyticsEvent('game_resign', {
                game_id: gameId,
                source: 'active_games_card',
            });

            // The game will be automatically moved to history via Firestore listeners
        } catch (error) {
            console.error('Failed to resign game:', error);
            showAlert(t('home.errors.errorTitle'), t('home.errors.failedToResign'));
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
                {/* Banner Ad - displayed below header */}
                <BannerAd />

                {!user && (
                    <>
                        <GameModeCard
                            title={t('home.gameModes.playComputerTitle')}
                            description={t('home.gameModes.playComputerDescription')}
                            icon='desktop'
                            iconFamily='font-awesome'
                            onPress={handleStartComputerGame}
                            disabled={creatingGame || searching}
                            loading={creatingGame && pendingGameAction === 'computer'}
                            horizontal={false}
                        />
                        <GameModeCard
                            title={t('home.gameModes.howToPlayTitle')}
                            description={t('home.gameModes.howToPlayDescription')}
                            icon='question-circle'
                            iconFamily='font-awesome'
                            onPress={() => navigation.navigate('How-To Play')}
                            disabled={creatingGame || searching}
                        />
                    </>
                )}

                {/* Sign Up Prompt Card - show after game modes when user is not logged in */}
                {!user && <SignUpPromptCard onPress={() => navigation.navigate('Log In')} />}

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
                    <>
                        <MatchmakingCard
                            searching={searching}
                            loading={matchmakingLoading}
                            onStartSearch={handleStartMatchmaking}
                            onStopSearch={stopSearching}
                        />

                        <PlayWithFriendCard
                            friends={friends}
                            loading={friendsLoading}
                            disabled={creatingGame || searching || sendingGameRequest}
                            onSelectFriend={handleSelectFriend}
                            onPassAndPlay={handlePassAndPlay}
                            onResumePassAndPlay={handleResumePassAndPlay}
                        />
                    </>
                )}

                {user && (
                    <GameModeCard
                        title={t('home.gameModes.playComputerTitle')}
                        description={t('home.gameModes.playComputerDescription')}
                        icon='desktop'
                        iconFamily='font-awesome'
                        onPress={handleStartComputerGame}
                        disabled={creatingGame || searching}
                        loading={creatingGame && pendingGameAction === 'computer'}
                        horizontal={true}
                    />
                )}

                {enableDevFeatures && (
                    <GameModeCard
                        title={t('home.gameModes.loadGameStateTitle')}
                        description={t('home.gameModes.loadGameStateDescription')}
                        icon='folder-open'
                        iconFamily='font-awesome'
                        onPress={handleOpenFixtureLoader}
                        disabled={creatingGame || searching}
                    />
                )}

                {/* Computer Users Management - only visible to internal users */}
                <ComputerUsersManagement />

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

            <MatchmakingModeSelectionModal
                visible={matchmakingModeModalVisible}
                onSelectMode={handleMatchmakingModeSelect}
                onCancel={handleMatchmakingModeCancel}
                timeControl={pendingTimeControl}
            />

            <DifficultySelectionModal
                visible={difficultyModalVisible}
                onSelect={handleDifficultySelect}
                onCancel={handleDifficultyCancel}
                user={user}
                allowAll={enableDevFeatures}
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
