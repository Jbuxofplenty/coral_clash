import { GAME_VERSION } from '@jbuxofplenty/coral-clash';
import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '../config/firebase';

/**
 * Custom hook for calling Firebase Cloud Functions
 */
export const useFirebaseFunctions = () => {
    // ==================== User Profile Functions ====================

    const getPublicUserInfo = async (userId) => {
        try {
            const callable = httpsCallable(functions, 'getPublicUserInfo');
            const result = await callable({ userId });
            return result.data;
        } catch (error) {
            console.error('Error getting public user info:', error);
            throw error;
        }
    };

    const getUserProfile = async (userId) => {
        try {
            const callable = httpsCallable(functions, 'getUserProfile');
            const result = await callable({ userId });
            return result.data;
        } catch (error) {
            console.error('Error getting user profile:', error);
            throw error;
        }
    };

    const updateUserProfile = async (profileData) => {
        try {
            const callable = httpsCallable(functions, 'updateUserProfile');
            const result = await callable(profileData);
            return result.data;
        } catch (error) {
            console.error('Error updating user profile:', error);
            throw error;
        }
    };

    const deleteAccount = async () => {
        try {
            const callable = httpsCallable(functions, 'deleteAccount');
            const result = await callable({});
            return result.data;
        } catch (error) {
            console.error('Error deleting account:', error);
            throw error;
        }
    };

    // ==================== User Settings Functions ====================

    const getUserSettings = async () => {
        try {
            // Ensure auth token is ready
            const currentUser = auth.currentUser;
            if (currentUser) {
                await currentUser.getIdToken(true); // Force refresh token
            }

            const callable = httpsCallable(functions, 'getUserSettings');
            const result = await callable();
            return result.data;
        } catch (error) {
            console.error('Error getting user settings:', error);
            throw error;
        }
    };

    const updateUserSettings = async (settings) => {
        try {
            // Ensure auth token is ready
            const currentUser = auth.currentUser;
            if (currentUser) {
                await currentUser.getIdToken(true);
            }

            const callable = httpsCallable(functions, 'updateUserSettings');
            const result = await callable({ settings });
            return result.data;
        } catch (error) {
            console.error('Error updating user settings:', error);
            throw error;
        }
    };

    const resetUserSettings = async () => {
        try {
            // Ensure auth token is ready
            const currentUser = auth.currentUser;
            if (currentUser) {
                await currentUser.getIdToken(true);
            }

            const callable = httpsCallable(functions, 'resetUserSettings');
            const result = await callable();
            return result.data;
        } catch (error) {
            console.error('Error resetting user settings:', error);
            throw error;
        }
    };

    // ==================== Game Functions ====================

    const createGame = async (opponentId, timeControl = null) => {
        try {
            const callable = httpsCallable(functions, 'createGame');
            const result = await callable({ opponentId, timeControl, clientVersion: GAME_VERSION });
            return result.data;
        } catch (error) {
            console.error('Error creating game:', error);
            throw error;
        }
    };

    const createComputerGame = async (timeControl = null, difficulty = 'random') => {
        try {
            const callable = httpsCallable(functions, 'createComputerGame');
            const result = await callable({ timeControl, difficulty, clientVersion: GAME_VERSION });
            return result.data;
        } catch (error) {
            console.error('Error creating computer game:', error);
            throw error;
        }
    };

    const respondToGameInvite = async (gameId, accept) => {
        try {
            const callable = httpsCallable(functions, 'respondToGameInvite');
            const result = await callable({ gameId, accept });
            return result.data;
        } catch (error) {
            console.error('Error responding to game invite:', error);
            throw error;
        }
    };

    const makeMove = async ({ gameId, move }) => {
        try {
            const callable = httpsCallable(functions, 'makeMove');
            const result = await callable({ gameId, move, version: GAME_VERSION });
            return result.data;
        } catch (error) {
            console.error('Error making move:', error);
            throw error;
        }
    };

    const resignGame = async ({ gameId }) => {
        try {
            const callable = httpsCallable(functions, 'resignGame');
            const result = await callable({ gameId });
            return result.data;
        } catch (error) {
            console.error('Error resigning game:', error);
            throw error;
        }
    };

    const checkGameTime = async ({ gameId }) => {
        try {
            const callable = httpsCallable(functions, 'checkGameTime');
            const result = await callable({ gameId });
            return result.data;
        } catch (error) {
            console.error('[useFirebaseFunctions] Error checking game time:', error);
            throw error;
        }
    };

    const requestGameReset = async ({ gameId }) => {
        try {
            const callable = httpsCallable(functions, 'requestGameReset');
            const result = await callable({ gameId });
            return result.data;
        } catch (error) {
            console.error('Error requesting game reset:', error);
            throw error;
        }
    };

    const respondToResetRequest = async ({ gameId, approve }) => {
        try {
            const callable = httpsCallable(functions, 'respondToResetRequest');
            const result = await callable({ gameId, approve });
            return result.data;
        } catch (error) {
            console.error('Error responding to reset request:', error);
            throw error;
        }
    };

    const requestUndo = async ({ gameId, moveCount = 2 }) => {
        try {
            const callable = httpsCallable(functions, 'requestUndo');
            const result = await callable({ gameId, moveCount });
            return result.data;
        } catch (error) {
            console.error('Error requesting undo:', error);
            throw error;
        }
    };

    const respondToUndoRequest = async ({ gameId, approve }) => {
        try {
            const callable = httpsCallable(functions, 'respondToUndoRequest');
            const result = await callable({ gameId, approve });
            return result.data;
        } catch (error) {
            console.error('Error responding to undo request:', error);
            throw error;
        }
    };

    const makeComputerMove = async ({ gameId }) => {
        try {
            const callable = httpsCallable(functions, 'makeComputerMove');
            const result = await callable({ gameId, version: GAME_VERSION });
            return result.data;
        } catch (error) {
            console.error('Error making computer move:', error);
            throw error;
        }
    };

    const getActiveGames = async () => {
        try {
            const callable = httpsCallable(functions, 'getActiveGames');
            const result = await callable();
            return result.data;
        } catch (error) {
            console.error('Error getting active games:', error);
            throw error;
        }
    };

    const getGameHistory = async () => {
        try {
            const callable = httpsCallable(functions, 'getGameHistory');
            const result = await callable();
            return result.data;
        } catch (error) {
            console.error('Error getting game history:', error);
            throw error;
        }
    };

    // ==================== Friends Functions ====================

    /**
     * Send a friend request by either friendId (UID) or email
     * @param {string} friendIdOrEmail - Either the user's UID or email address
     * @returns {Promise<Object>} Result with success status and friendId
     */
    const sendFriendRequest = async (friendIdOrEmail) => {
        try {
            const callable = httpsCallable(functions, 'sendFriendRequest');

            // Determine if input is an email or ID
            const isEmail = friendIdOrEmail.includes('@');
            const payload = isEmail ? { email: friendIdOrEmail } : { friendId: friendIdOrEmail };

            const result = await callable(payload);
            return result.data;
        } catch (error) {
            console.error('Error sending friend request:', error);
            throw error;
        }
    };

    const respondToFriendRequest = async (requestId, accept) => {
        try {
            const callable = httpsCallable(functions, 'respondToFriendRequest');
            const result = await callable({ requestId, accept });
            return result.data;
        } catch (error) {
            console.error('Error responding to friend request:', error);
            throw error;
        }
    };

    const getFriends = async () => {
        try {
            const callable = httpsCallable(functions, 'getFriends');
            const result = await callable();
            return result.data;
        } catch (error) {
            console.error('Error getting friends:', error);
            throw error;
        }
    };

    const removeFriend = async (friendId) => {
        try {
            const callable = httpsCallable(functions, 'removeFriend');
            const result = await callable({ friendId });
            return result.data;
        } catch (error) {
            console.error('Error removing friend:', error);
            throw error;
        }
    };

    const searchUsers = async (query) => {
        try {
            const callable = httpsCallable(functions, 'searchUsers');
            const result = await callable({ query });
            return result.data;
        } catch (error) {
            console.error('Error searching users:', error);
            throw error;
        }
    };

    // ==================== Matchmaking Functions ====================

    const joinMatchmaking = async (timeControl = null) => {
        try {
            const callable = httpsCallable(functions, 'joinMatchmaking');
            const result = await callable({ timeControl, clientVersion: GAME_VERSION });
            return result.data;
        } catch (error) {
            console.error('Error joining matchmaking:', error);
            throw error;
        }
    };

    const leaveMatchmaking = async () => {
        try {
            const callable = httpsCallable(functions, 'leaveMatchmaking');
            const result = await callable();
            return result.data;
        } catch (error) {
            console.error('Error leaving matchmaking:', error);
            throw error;
        }
    };

    const updateMatchmakingHeartbeat = async () => {
        try {
            const callable = httpsCallable(functions, 'updateMatchmakingHeartbeat');
            const result = await callable();
            return result.data;
        } catch (_error) {
            // Don't log or throw - heartbeat failures are expected to be silent
            return { success: false };
        }
    };

    const getMatchmakingStatus = async () => {
        try {
            const callable = httpsCallable(functions, 'getMatchmakingStatus');
            const result = await callable();
            return result.data;
        } catch (error) {
            console.error('Error getting matchmaking status:', error);
            throw error;
        }
    };

    // ==================== Issues Functions ====================

    const submitIssue = async ({ subject, description, gameSnapshot }) => {
        try {
            const callable = httpsCallable(functions, 'submitIssue');
            const result = await callable({ subject, description, gameSnapshot });
            return result.data;
        } catch (error) {
            console.error('Error submitting issue:', error);
            throw error;
        }
    };

    // ==================== Admin/Setup Functions ====================

    const initializeComputerUsers = async () => {
        try {
            const callable = httpsCallable(functions, 'initializeComputerUsers');
            const result = await callable({});
            return result.data;
        } catch (error) {
            console.error('Error initializing computer users:', error);
            throw error;
        }
    };

    return {
        // User Profile
        getPublicUserInfo,
        getUserProfile,
        updateUserProfile,
        deleteAccount,
        // User Settings
        getUserSettings,
        updateUserSettings,
        resetUserSettings,
        // Games
        createGame,
        createComputerGame,
        respondToGameInvite,
        makeMove,
        makeComputerMove,
        resignGame,
        checkGameTime,
        requestGameReset,
        respondToResetRequest,
        requestUndo,
        respondToUndoRequest,
        getActiveGames,
        getGameHistory,
        // Friends
        sendFriendRequest,
        respondToFriendRequest,
        getFriends,
        removeFriend,
        searchUsers,
        // Matchmaking
        joinMatchmaking,
        leaveMatchmaking,
        updateMatchmakingHeartbeat,
        getMatchmakingStatus,
        // Issues
        submitIssue,
        // Admin/Setup
        initializeComputerUsers,
    };
};

export default useFirebaseFunctions;
