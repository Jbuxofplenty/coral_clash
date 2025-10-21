import { httpsCallable } from 'firebase/functions';
import { functions, auth } from '../config/firebase';

/**
 * Custom hook for calling Firebase Cloud Functions
 */
export const useFirebaseFunctions = () => {
    // ==================== User Profile Functions ====================

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
            // Silently fail - caller will handle with default settings
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

    // ==================== PvP Game Functions ====================

    const createPvPGame = async (opponentId, timeControl = null) => {
        try {
            const callable = httpsCallable(functions, 'createPvPGame');
            const result = await callable({ opponentId, timeControl });
            return result.data;
        } catch (error) {
            console.error('Error creating PvP game:', error);
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

    const makeMove = async (gameId, move) => {
        try {
            const callable = httpsCallable(functions, 'makeMove');
            const result = await callable({ gameId, move });
            return result.data;
        } catch (error) {
            console.error('Error making move:', error);
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

    return {
        // User Profile
        getUserProfile,
        updateUserProfile,
        // User Settings
        getUserSettings,
        updateUserSettings,
        resetUserSettings,
        // PvP Games
        createPvPGame,
        respondToGameInvite,
        makeMove,
        getActiveGames,
        // Friends
        sendFriendRequest,
        respondToFriendRequest,
        getFriends,
        removeFriend,
    };
};

export default useFirebaseFunctions;
