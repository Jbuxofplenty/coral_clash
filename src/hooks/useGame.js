import { useState, useCallback, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { useFirebaseFunctions } from './useFirebaseFunctions';
import { useAuth } from '../contexts/AuthContext';
import { db, collection, query, where, onSnapshot, doc, getDoc } from '../config/firebase';

/**
 * Custom hook for managing game operations (PvP and Computer)
 * Provides high-level game management with state and error handling
 * Automatically listens to Firestore for real-time updates
 *
 * @param {Object} options - Configuration options
 * @param {Function} options.onGameAccepted - Callback when a game request is accepted (receives gameId, gameData)
 * @param {Function} options.onGameInvite - Callback when a new game invite is received (receives gameId, gameData)
 */
export const useGame = (options = {}) => {
    const { onGameAccepted, onGameInvite } = options;
    const { user } = useAuth();
    const { createGame, createComputerGame, respondToGameInvite, getActiveGames } =
        useFirebaseFunctions();
    const [loading, setLoading] = useState(true);
    const [activeGames, setActiveGames] = useState([]);
    const previousGamesRef = useRef([]); // Use ref to avoid triggering re-renders

    // Set up real-time Firestore listeners for active games
    useEffect(() => {
        if (!user || !user.uid) {
            setActiveGames([]);
            setLoading(false);
            return;
        }

        // Track initial snapshots to only call Firebase Function on mount
        let creatorInitialSnapshot = true;
        let opponentInitialSnapshot = true;

        // Listen to active games where user is creator
        const activeCreatorQuery = query(
            collection(db, 'games'),
            where('creatorId', '==', user.uid),
            where('status', 'in', ['active', 'pending']),
        );

        // Listen to active games where user is opponent
        const activeOpponentQuery = query(
            collection(db, 'games'),
            where('opponentId', '==', user.uid),
            where('status', 'in', ['active', 'pending']),
        );

        const activeCreatorUnsubscribe = onSnapshot(
            activeCreatorQuery,
            async (snapshot) => {
                if (creatorInitialSnapshot) {
                    creatorInitialSnapshot = false;
                    // Only call Firebase Function on initial mount
                    try {
                        const result = await getActiveGames();
                        const games = result.games || [];
                        setActiveGames(games);
                        previousGamesRef.current = games;
                        setLoading(false);
                    } catch (error) {
                        console.error('[useGame] Error in initial load:', error);
                        setLoading(false);
                    }
                    return;
                }

                // Process snapshot changes locally without calling Firebase Function
                const updatedGames = [...previousGamesRef.current];
                let hasChanges = false;

                // Use for...of to handle async operations
                for (const change of snapshot.docChanges()) {
                    const gameData = { id: change.doc.id, ...change.doc.data() };
                    const existingIndex = updatedGames.findIndex((g) => g.id === gameData.id);

                    if (change.type === 'added') {
                        // New game added (shouldn't happen often for creator query after initial load)
                        if (existingIndex === -1) {
                            // Fetch opponent data if it's a PvP game
                            if (gameData.opponentId && gameData.opponentId !== 'computer') {
                                const opponentDoc = await getDoc(
                                    doc(db, 'users', gameData.opponentId),
                                );
                                const opponentUserData = opponentDoc.exists()
                                    ? opponentDoc.data()
                                    : {};

                                const opponentDisplayName = opponentUserData.displayName
                                    ? `${opponentUserData.displayName}${opponentUserData.discriminator ? ` #${opponentUserData.discriminator}` : ''}`
                                    : 'Opponent';

                                updatedGames.push({
                                    ...gameData,
                                    opponentDisplayName,
                                    opponentAvatarKey:
                                        opponentUserData.settings?.avatarKey || 'dolphin',
                                    opponentType: 'pvp',
                                });
                            } else {
                                // Computer game or missing opponent
                                updatedGames.push({
                                    ...gameData,
                                    opponentDisplayName:
                                        gameData.opponentId === 'computer'
                                            ? 'Computer'
                                            : 'Opponent',
                                    opponentAvatarKey:
                                        gameData.opponentId === 'computer' ? 'computer' : 'dolphin',
                                    opponentType:
                                        gameData.opponentId === 'computer' ? 'computer' : 'pvp',
                                });
                            }
                            hasChanges = true;
                        }
                    } else if (change.type === 'modified') {
                        if (existingIndex !== -1) {
                            const previousGame = updatedGames[existingIndex];

                            // Update game data while preserving opponent info from initial load
                            updatedGames[existingIndex] = {
                                ...gameData,
                                opponentDisplayName: previousGame.opponentDisplayName || 'Opponent',
                                opponentAvatarKey: previousGame.opponentAvatarKey || 'dolphin',
                                opponentType: previousGame.opponentType,
                            };
                            hasChanges = true;

                            // Check if a pending game was accepted (pending -> active)
                            if (previousGame.status === 'pending' && gameData.status === 'active') {
                                // Your game request was accepted!
                                if (onGameAccepted) {
                                    onGameAccepted(gameData.id, updatedGames[existingIndex]);
                                }
                            }
                        }
                    } else if (change.type === 'removed') {
                        // Game removed (status changed from active/pending)
                        if (existingIndex !== -1) {
                            updatedGames.splice(existingIndex, 1);
                            hasChanges = true;
                        }
                    }
                }

                if (hasChanges) {
                    setActiveGames(updatedGames);
                    previousGamesRef.current = updatedGames;
                }
            },
            (error) => {
                console.error('[useGame] Error in creator games listener:', error);
                setLoading(false);
            },
        );

        const activeOpponentUnsubscribe = onSnapshot(
            activeOpponentQuery,
            async (snapshot) => {
                if (opponentInitialSnapshot) {
                    opponentInitialSnapshot = false;
                    return; // Skip initial snapshot for opponent query (already loaded from creator query)
                }

                // Process snapshot changes locally without calling Firebase Function
                const updatedGames = [...previousGamesRef.current];
                let hasChanges = false;
                const changesWithAcceptedGame = [];

                // Use for...of to handle async operations
                for (const change of snapshot.docChanges()) {
                    const gameData = { id: change.doc.id, ...change.doc.data() };
                    const existingIndex = updatedGames.findIndex((g) => g.id === gameData.id);

                    if (change.type === 'added') {
                        // New game invite received!
                        if (gameData.opponentId === user.uid) {
                            // For new invites, we need opponent data (the creator in this case)
                            // Fetch opponent (creator) data from Firestore
                            const opponentUserId = gameData.creatorId;
                            const opponentDoc = await getDoc(doc(db, 'users', opponentUserId));
                            const opponentUserData = opponentDoc.exists() ? opponentDoc.data() : {};

                            const opponentDisplayName = opponentUserData.displayName
                                ? `${opponentUserData.displayName}${opponentUserData.discriminator ? ` #${opponentUserData.discriminator}` : ''}`
                                : 'Opponent';

                            const newGame = {
                                ...gameData,
                                opponentDisplayName,
                                opponentAvatarKey:
                                    opponentUserData.settings?.avatarKey || 'dolphin',
                                opponentType: 'pvp',
                            };

                            updatedGames.push(newGame);
                            hasChanges = true;

                            if (gameData.status === 'pending' && onGameInvite) {
                                onGameInvite(gameData.id, newGame);
                            }
                        }
                    } else if (change.type === 'modified') {
                        if (existingIndex !== -1) {
                            const previousGame = updatedGames[existingIndex];

                            // Update game data while preserving opponent info
                            updatedGames[existingIndex] = {
                                ...gameData,
                                opponentDisplayName: previousGame.opponentDisplayName || 'Opponent',
                                opponentAvatarKey: previousGame.opponentAvatarKey || 'dolphin',
                                opponentType: previousGame.opponentType,
                            };
                            hasChanges = true;

                            // Check if you accepted a game (pending -> active)
                            if (previousGame.status === 'pending' && gameData.status === 'active') {
                                changesWithAcceptedGame.push({
                                    gameId: gameData.id,
                                    gameData: updatedGames[existingIndex],
                                });
                            }
                        }
                    } else if (change.type === 'removed') {
                        // Game removed (status changed from active/pending)
                        if (existingIndex !== -1) {
                            updatedGames.splice(existingIndex, 1);
                            hasChanges = true;
                        }
                    }
                }

                if (hasChanges) {
                    setActiveGames(updatedGames);
                    previousGamesRef.current = updatedGames;

                    // Call onGameAccepted for games that were just accepted
                    if (onGameAccepted && changesWithAcceptedGame.length > 0) {
                        changesWithAcceptedGame.forEach(({ gameId, gameData }) => {
                            onGameAccepted(gameId, gameData);
                        });
                    }
                }
            },
            (error) => {
                console.error('[useGame] Error in opponent games listener:', error);
                setLoading(false);
            },
        );

        // Cleanup on unmount
        return () => {
            activeCreatorUnsubscribe();
            activeOpponentUnsubscribe();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, onGameAccepted, onGameInvite]); // Include callbacks to ensure latest are used

    /**
     * Send a game request to a friend
     * @param {string} opponentId - The opponent's user ID
     * @param {string} opponentName - The opponent's display name
     * @param {Object} timeControl - Optional time control settings
     * @returns {Promise<Object>} Result with success status and gameId
     */
    const sendGameRequest = useCallback(
        async (opponentId, opponentName, timeControl = null) => {
            try {
                setLoading(true);

                const result = await createGame(opponentId, timeControl);

                // Show success message
                Alert.alert(
                    'Game Request Sent',
                    `Your game request has been sent to ${opponentName}. They will be notified.`,
                    [{ text: 'OK' }],
                );

                return result;
            } catch (error) {
                console.error('Error sending game request:', error);

                // Handle specific error cases
                if (error.code === 'already-exists') {
                    // Don't show error for duplicate game requests - just silently ignore
                    // The pending game already exists, so no action needed
                    return { success: false, reason: 'duplicate' };
                } else if (error.code === 'not-found') {
                    Alert.alert(
                        'User Not Found',
                        'The user you are trying to invite could not be found.',
                        [{ text: 'OK' }],
                    );
                    throw error;
                } else {
                    Alert.alert('Error', error.message || 'Failed to send game request');
                    throw error;
                }
            } finally {
                setLoading(false);
            }
        },
        [createGame],
    );

    /**
     * Start a game against the computer
     * @param {Object} timeControl - Optional time control settings
     * @param {string} difficulty - Difficulty level (random, easy, medium, hard)
     * @returns {Promise<Object>} Result with success status and gameId
     */
    const startComputerGame = useCallback(
        async (timeControl = null, difficulty = 'random') => {
            try {
                setLoading(true);

                // If user is not authenticated, start an offline game
                if (!user) {
                    return {
                        success: true,
                        gameId: null, // null gameId indicates offline game
                        offline: true,
                    };
                }

                // User is authenticated, create online game via Firebase
                return await createComputerGame(timeControl, difficulty);
            } catch (error) {
                console.error('Error starting computer game:', error);
                Alert.alert('Error', error.message || 'Failed to start computer game');
                throw error;
            } finally {
                setLoading(false);
            }
        },
        [createComputerGame, user],
    );

    /**
     * Accept a game invitation
     * @param {string} gameId - The game ID
     * @param {Function} onSuccess - Optional callback on success
     * @returns {Promise<Object>} Result with success status
     */
    const acceptGameInvite = useCallback(
        async (gameId, onSuccess) => {
            try {
                setLoading(true);

                const result = await respondToGameInvite(gameId, true);

                // Call success callback if provided
                if (onSuccess) {
                    onSuccess(gameId);
                }

                return result;
            } catch (error) {
                console.error('Error accepting game invite:', error);
                Alert.alert('Error', 'Failed to accept game invitation');
                throw error;
            } finally {
                setLoading(false);
            }
        },
        [respondToGameInvite],
    );

    /**
     * Decline a game invitation
     * @param {string} gameId - The game ID
     * @returns {Promise<Object>} Result with success status
     */
    const declineGameInvite = useCallback(
        async (gameId) => {
            try {
                setLoading(true);

                const result = await respondToGameInvite(gameId, false);

                return result;
            } catch (error) {
                console.error('Error declining game invite:', error);
                Alert.alert('Error', 'Failed to decline game invitation');
                throw error;
            } finally {
                setLoading(false);
            }
        },
        [respondToGameInvite],
    );

    /**
     * Load active games for the current user
     * @returns {Promise<Array>} Array of active games
     */
    const loadActiveGames = useCallback(async () => {
        try {
            setLoading(true);

            const result = await getActiveGames();
            const games = result.games || [];

            setActiveGames(games);

            return games;
        } catch (error) {
            console.error('[useGame] Error loading active games:', error);
            setActiveGames([]);
            return [];
        } finally {
            setLoading(false);
        }
    }, [getActiveGames]);

    /**
     * Check if user has any pending game invites
     * @returns {Array} Pending game invites
     */
    const getPendingInvites = useCallback(() => {
        return activeGames.filter((game) => game.status === 'pending');
    }, [activeGames]);

    /**
     * Check if user has any active games
     * @returns {Array} Active games
     */
    const getActiveGamesList = useCallback(() => {
        return activeGames.filter((game) => game.status === 'active');
    }, [activeGames]);

    return {
        // State
        loading,
        activeGames,

        // Actions
        sendGameRequest,
        startComputerGame,
        acceptGameInvite,
        declineGameInvite,
        loadActiveGames,

        // Computed values
        getPendingInvites,
        getActiveGamesList,
        hasPendingInvites: getPendingInvites().length > 0,
        hasActiveGames: getActiveGamesList().length > 0,
    };
};

export default useGame;
