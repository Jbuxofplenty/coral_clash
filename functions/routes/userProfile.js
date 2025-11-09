import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { admin } from '../init.js';
import { getAppCheckConfig } from '../utils/appCheckConfig.js';
import { serverTimestamp } from '../utils/helpers.js';

const db = admin.firestore();

/**
 * Handler for getting public user info
 * Separated for testing purposes
 */
async function getPublicUserInfoHandler(request) {
    const { data, auth } = request;
    // Verify authentication
    if (!auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { userId } = data;

    if (!userId) {
        throw new HttpsError('invalid-argument', 'userId is required');
    }

    // Get user document
    const userDoc = await db.collection('users').doc(userId).get();

    // If user not found (deleted account), return anonymous data
    if (!userDoc.exists) {
        return {
            success: true,
            user: {
                displayName: 'Anonymous',
                discriminator: '',
                avatarKey: 'dolphin',
            },
        };
    }

    const userData = userDoc.data();

    // Get user settings for avatar
    const settingsDoc = await db
        .collection('users')
        .doc(userId)
        .collection('settings')
        .doc('preferences')
        .get();

    const settings = settingsDoc.exists ? settingsDoc.data() : {};

    // Return only public information
    return {
        success: true,
        user: {
            displayName: userData.displayName || 'User',
            discriminator: userData.discriminator || '',
            avatarKey: settings.avatarKey || 'dolphin',
        },
    };
}

/**
 * Get public user info (displayName, discriminator, avatarKey)
 * This is safe to call for any user and returns only public information
 * GET /api/profile/public
 */
export const getPublicUserInfo = onCall(getAppCheckConfig(), getPublicUserInfoHandler);
export { getPublicUserInfoHandler };

/**
 * Handler for getting user profile
 * Separated for testing purposes
 */
async function getUserProfileHandler(request) {
    const { data, auth } = request;
    // Verify authentication
    if (!auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { userId } = data;

    // Users can only get their own profile or profiles of their friends
    if (userId !== auth.uid) {
        // Check if they're friends
        const friendDoc = await db
            .collection('users')
            .doc(auth.uid)
            .collection('friends')
            .doc(userId)
            .get();

        if (!friendDoc.exists) {
            throw new HttpsError('permission-denied', 'Can only view friends profiles');
        }
    }

    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
        throw new HttpsError('not-found', 'User not found');
    }

    return {
        success: true,
        profile: userDoc.data(),
    };
}

/**
 * Get user profile
 * GET /api/profile/:userId
 */
export const getUserProfile = onCall(getAppCheckConfig(), getUserProfileHandler);
export { getUserProfileHandler };

/**
 * Handler for updating user profile
 * Separated for testing purposes
 */
async function updateUserProfileHandler(request) {
    const { data, auth } = request;
    if (!auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { displayName, photoURL, preferences } = data;
    const userId = auth.uid;

    const updateData = {
        updatedAt: serverTimestamp(),
    };

    if (displayName) updateData.displayName = displayName;
    if (photoURL) updateData.photoURL = photoURL;
    if (preferences) updateData.preferences = preferences;

    await db.collection('users').doc(userId).update(updateData);

    return {
        success: true,
        message: 'Profile updated successfully',
    };
}

/**
 * Update user profile
 * POST /api/profile/update
 */
export const updateUserProfile = onCall(getAppCheckConfig(), updateUserProfileHandler);
export { updateUserProfileHandler };

/**
 * Handler for deleting user account
 * Separated for testing purposes
 */
async function deleteAccountHandler(request) {
    const { auth } = request;
    if (!auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = auth.uid;

    try {
        console.log(`Starting account deletion for user: ${userId}`);

        // Use batched writes for efficiency (max 500 operations per batch)
        // We'll use multiple batches if needed
        const batches = [];
        let currentBatch = db.batch();
        let operationCount = 0;

        // Helper to add operation to batch and create new batch if needed
        const addToBatch = (operation) => {
            operation(currentBatch);
            operationCount++;
            if (operationCount >= 500) {
                batches.push(currentBatch);
                currentBatch = db.batch();
                operationCount = 0;
            }
        };

        // 1. ANONYMIZE GAMES - Query all games where user participated
        console.log('Step 1: Anonymizing games...');
        const creatorGamesSnapshot = await db
            .collection('games')
            .where('creatorId', '==', userId)
            .get();

        const opponentGamesSnapshot = await db
            .collection('games')
            .where('opponentId', '==', userId)
            .get();

        // Process games where user is creator
        for (const doc of creatorGamesSnapshot.docs) {
            const gameData = doc.data();
            const updateData = {
                creatorDisplayName: 'Anonymous',
                creatorAvatarKey: 'dolphin',
                updatedAt: serverTimestamp(),
            };

            // Cancel pending games
            if (gameData.status === 'pending') {
                updateData.status = 'cancelled';
                updateData.cancelReason = 'account_deleted';
            }

            // Forfeit active games
            if (gameData.status === 'active') {
                updateData.status = 'completed';
                updateData.result = 'forfeit';
                updateData.winner = gameData.opponentId;
                updateData.completedAt = serverTimestamp();

                // Update opponent's stats
                const opponentRef = db.collection('users').doc(gameData.opponentId);
                const opponentDoc = await opponentRef.get();
                if (opponentDoc.exists) {
                    const opponentData = opponentDoc.data();
                    const stats = opponentData.stats || {
                        gamesPlayed: 0,
                        gamesWon: 0,
                        gamesLost: 0,
                        gamesDraw: 0,
                    };
                    addToBatch((batch) =>
                        batch.update(opponentRef, {
                            'stats.gamesWon': (stats.gamesWon || 0) + 1,
                            'stats.gamesPlayed': (stats.gamesPlayed || 0) + 1,
                            updatedAt: serverTimestamp(),
                        }),
                    );
                }
            }

            addToBatch((batch) => batch.update(doc.ref, updateData));
        }

        // Process games where user is opponent
        for (const doc of opponentGamesSnapshot.docs) {
            const gameData = doc.data();
            const updateData = {
                opponentDisplayName: 'Anonymous',
                opponentAvatarKey: 'dolphin',
                updatedAt: serverTimestamp(),
            };

            // Cancel pending games
            if (gameData.status === 'pending') {
                updateData.status = 'cancelled';
                updateData.cancelReason = 'account_deleted';
            }

            // Forfeit active games
            if (gameData.status === 'active') {
                updateData.status = 'completed';
                updateData.result = 'forfeit';
                updateData.winner = gameData.creatorId;
                updateData.completedAt = serverTimestamp();

                // Update creator's stats
                const creatorRef = db.collection('users').doc(gameData.creatorId);
                const creatorDoc = await creatorRef.get();
                if (creatorDoc.exists) {
                    const creatorData = creatorDoc.data();
                    const stats = creatorData.stats || {
                        gamesPlayed: 0,
                        gamesWon: 0,
                        gamesLost: 0,
                        gamesDraw: 0,
                    };
                    addToBatch((batch) =>
                        batch.update(creatorRef, {
                            'stats.gamesWon': (stats.gamesWon || 0) + 1,
                            'stats.gamesPlayed': (stats.gamesPlayed || 0) + 1,
                            updatedAt: serverTimestamp(),
                        }),
                    );
                }
            }

            addToBatch((batch) => batch.update(doc.ref, updateData));
        }

        // 2. DELETE FRIENDS - Remove user from all friends' friend lists
        console.log('Step 2: Removing friends...');
        const friendsSnapshot = await db
            .collection('users')
            .doc(userId)
            .collection('friends')
            .get();

        for (const friendDoc of friendsSnapshot.docs) {
            const friendId = friendDoc.id;
            // Remove this user from friend's friend list
            const friendFriendRef = db
                .collection('users')
                .doc(friendId)
                .collection('friends')
                .doc(userId);
            addToBatch((batch) => batch.delete(friendFriendRef));

            // Delete from user's friend list
            addToBatch((batch) => batch.delete(friendDoc.ref));
        }

        // 3. DELETE FRIEND REQUESTS - Sent and received
        console.log('Step 3: Deleting friend requests...');
        const sentRequestsSnapshot = await db
            .collection('friendRequests')
            .where('from', '==', userId)
            .get();

        const receivedRequestsSnapshot = await db
            .collection('friendRequests')
            .where('to', '==', userId)
            .get();

        for (const doc of [...sentRequestsSnapshot.docs, ...receivedRequestsSnapshot.docs]) {
            addToBatch((batch) => batch.delete(doc.ref));
        }

        // 4. DELETE NOTIFICATIONS - Sent and received
        console.log('Step 4: Deleting notifications...');
        const userNotificationsSnapshot = await db
            .collection('notifications')
            .where('userId', '==', userId)
            .get();

        const sentNotificationsSnapshot = await db
            .collection('notifications')
            .where('from', '==', userId)
            .get();

        for (const doc of [...userNotificationsSnapshot.docs, ...sentNotificationsSnapshot.docs]) {
            addToBatch((batch) => batch.delete(doc.ref));
        }

        // 5. REMOVE FROM MATCHMAKING QUEUE
        console.log('Step 5: Removing from matchmaking queue...');
        const queueRef = db.collection('matchmakingQueue').doc(userId);
        addToBatch((batch) => batch.delete(queueRef));

        // 6. DELETE USER SETTINGS
        console.log('Step 6: Deleting user settings...');
        const settingsSnapshot = await db
            .collection('users')
            .doc(userId)
            .collection('settings')
            .get();

        for (const doc of settingsSnapshot.docs) {
            addToBatch((batch) => batch.delete(doc.ref));
        }

        // 7. DELETE USER PROFILE
        console.log('Step 7: Deleting user profile...');
        const userRef = db.collection('users').doc(userId);
        addToBatch((batch) => batch.delete(userRef));

        // Commit all batches
        if (operationCount > 0) {
            batches.push(currentBatch);
        }

        console.log(`Committing ${batches.length} batch(es) with total operations...`);
        await Promise.all(batches.map((batch) => batch.commit()));

        // 8. DELETE FIREBASE AUTH ACCOUNT
        console.log('Step 8: Deleting Firebase Auth account...');
        await admin.auth().deleteUser(userId);

        console.log(`Account deletion completed successfully for user: ${userId}`);

        return {
            success: true,
            message: 'Account deleted successfully',
        };
    } catch (error) {
        console.error('Error deleting account:', error);
        throw new HttpsError('internal', `Failed to delete account: ${error.message}`);
    }
}

/**
 * Delete user account
 * Permanently deletes user account and all associated data
 * Games are anonymized to preserve history for opponents
 * POST /api/account/delete
 */
export const deleteAccount = onCall(getAppCheckConfig(), deleteAccountHandler);
export { deleteAccountHandler };
