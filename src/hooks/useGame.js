import { useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { useFirebaseFunctions } from './useFirebaseFunctions';
import { useAuth } from '../contexts/AuthContext';
import { db, collection, query, where, onSnapshot } from '../config/firebase';

/**
 * Custom hook for managing game operations (PvP and Computer)
 * Provides high-level game management with state and error handling
 * Automatically listens to Firestore for real-time updates
 */
export const useGame = () => {
    const { user } = useAuth();
    const { createGame, createComputerGame, respondToGameInvite, getActiveGames } =
        useFirebaseFunctions();
    const [loading, setLoading] = useState(true);
    const [activeGames, setActiveGames] = useState([]);

    // Set up real-time Firestore listeners for active games
    useEffect(() => {
        if (!user || !user.uid) {
            setActiveGames([]);
            setLoading(false);
            return;
        }

        // Track initial snapshots to skip them (they fire immediately)
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
            async () => {
                if (creatorInitialSnapshot) {
                    creatorInitialSnapshot = false;
                    try {
                        const result = await getActiveGames();
                        setActiveGames(result.games || []);
                        setLoading(false);
                    } catch (error) {
                        console.error('[useGame] Error in initial load:', error);
                        setLoading(false);
                    }
                    return;
                }
                try {
                    const result = await getActiveGames();
                    setActiveGames(result.games || []);
                } catch (error) {
                    console.error('[useGame] Error fetching active games:', error);
                }
            },
            (error) => {
                console.error('[useGame] Error in creator games listener:', error);
                setLoading(false);
            },
        );

        const activeOpponentUnsubscribe = onSnapshot(
            activeOpponentQuery,
            async () => {
                if (opponentInitialSnapshot) {
                    opponentInitialSnapshot = false;
                    return;
                }
                try {
                    const result = await getActiveGames();
                    setActiveGames(result.games || []);
                } catch (error) {
                    console.error('[useGame] Error fetching active games:', error);
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
    }, [user]); // Only depend on user, not getActiveGames (it changes every render)

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
