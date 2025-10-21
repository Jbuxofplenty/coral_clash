import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useFirebaseFunctions } from './useFirebaseFunctions';

/**
 * Custom hook for managing PvP game operations
 * Provides high-level game management with state and error handling
 */
export const usePvPGame = () => {
    const { createPvPGame, respondToGameInvite, getActiveGames } = useFirebaseFunctions();
    const [loading, setLoading] = useState(false);
    const [activeGames, setActiveGames] = useState([]);

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

                const result = await createPvPGame(opponentId, timeControl);

                // Show success message
                Alert.alert(
                    'Game Request Sent',
                    `Your game request has been sent to ${opponentName}. They will be notified.`,
                    [{ text: 'OK' }]
                );

                return result;
            } catch (error) {
                console.error('Error sending game request:', error);
                Alert.alert('Error', error.message || 'Failed to send game request');
                throw error;
            } finally {
                setLoading(false);
            }
        },
        [createPvPGame]
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
        [respondToGameInvite]
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
        [respondToGameInvite]
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
            console.error('Error loading active games:', error);
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

export default usePvPGame;

