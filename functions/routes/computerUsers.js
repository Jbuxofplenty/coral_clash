import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { admin } from '../init.js';
import { getAppCheckConfig } from '../utils/appCheckConfig.js';
import { getAllComputerUsers } from '../utils/computerUsers.js';
import { getDefaultSettings, serverTimestamp } from '../utils/helpers.js';

const db = admin.firestore();

/**
 * Handler for initializing computer users
 * Separated for testing purposes
 */
async function initializeComputerUsersHandler(request) {
    const { data: _data, auth } = request;
    // Verify user is authenticated and is an internal user
    if (!auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const requestingUserId = auth.uid;
    const requestingUserDoc = await db.collection('users').doc(requestingUserId).get();

    if (!requestingUserDoc.exists || !requestingUserDoc.data().internalUser) {
        throw new HttpsError(
            'permission-denied',
            'Only internal users can initialize computer users',
        );
    }

    console.log('[InitializeComputerUsers] Starting computer user initialization');
    const computerUsers = getAllComputerUsers();

    for (const userData of computerUsers) {
        const userId = userData.id;
        const userRef = db.collection('users').doc(userId);

        // Check if user already exists
        const userDoc = await userRef.get();

        const userDocumentData = {
            displayName: userData.displayName,
            discriminator: userData.discriminator,
            email: `${userId}@coralclash.ai`, // Fake email
            isComputerUser: true,
            difficulty: userData.difficulty,
            stats: {
                gamesPlayed: userDoc.exists ? userDoc.data().stats?.gamesPlayed || 0 : 0,
                gamesWon: userDoc.exists ? userDoc.data().stats?.gamesWon || 0 : 0,
                gamesLost: userDoc.exists ? userDoc.data().stats?.gamesLost || 0 : 0,
                gamesDraw: userDoc.exists ? userDoc.data().stats?.gamesDraw || 0 : 0,
            },
            createdAt: userDoc.exists ? userDoc.data().createdAt : serverTimestamp(),
            updatedAt: serverTimestamp(),
        };

        // Create or update user document
        if (userDoc.exists) {
            await userRef.update(userDocumentData);
            console.log(`[InitializeComputerUsers] Updated computer user: ${userData.displayName}`);
        } else {
            await userRef.set(userDocumentData);
            console.log(`[InitializeComputerUsers] Created computer user: ${userData.displayName}`);
        }

        // Ensure settings subcollection exists
        const settingsRef = userRef.collection('settings').doc('preferences');
        const settingsDoc = await settingsRef.get();
        const defaultSettings = getDefaultSettings();

        if (!settingsDoc.exists) {
            await settingsRef.set({
                ...defaultSettings,
                avatarKey: userData.avatarKey, // Use computer user's specific avatar
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
        } else {
            // Update avatar if needed
            await settingsRef.update({
                avatarKey: userData.avatarKey,
                updatedAt: serverTimestamp(),
            });
        }

        // Ensure computer user is in matchmaking queue
        const queueRef = db.collection('matchmakingQueue').doc(userId);
        const queueDoc = await queueRef.get();

        const queueData = {
            userId: userId,
            displayName: userData.displayName,
            discriminator: userData.discriminator,
            avatarKey: userData.avatarKey,
            timeControl: { type: 'unlimited' },
            clientVersion: '1.0.0',
            joinedAt: queueDoc.exists ? queueDoc.data().joinedAt : serverTimestamp(),
            lastHeartbeat: serverTimestamp(),
            status: 'searching',
            isComputerUser: true,
        };

        if (queueDoc.exists) {
            // Update heartbeat and ensure status is searching
            await queueRef.update({
                lastHeartbeat: serverTimestamp(),
                status: 'searching',
                displayName: userData.displayName,
                discriminator: userData.discriminator,
                avatarKey: userData.avatarKey,
            });
            console.log(
                `[InitializeComputerUsers] Updated queue entry for: ${userData.displayName}`,
            );
        } else {
            await queueRef.set(queueData);
            console.log(
                `[InitializeComputerUsers] Created queue entry for: ${userData.displayName}`,
            );
        }
    }

    console.log(
        `[InitializeComputerUsers] Successfully initialized ${computerUsers.length} computer users`,
    );
    return {
        success: true,
        message: `Successfully initialized ${computerUsers.length} computer users`,
        count: computerUsers.length,
    };
}

/**
 * Initialize computer users in Firestore
 * Creates/updates computer user documents and adds them to matchmaking queue
 * Only accessible to internal users
 */
export const initializeComputerUsers = onCall(getAppCheckConfig(), initializeComputerUsersHandler);
export { initializeComputerUsersHandler };

/**
 * Handler for deleting all computer users
 * Separated for testing purposes
 */
async function deleteComputerUsersHandler(request) {
    const { data: _data, auth } = request;
    // Verify user is authenticated and is an internal user
    if (!auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const requestingUserId = auth.uid;
    const requestingUserDoc = await db.collection('users').doc(requestingUserId).get();

    if (!requestingUserDoc.exists || !requestingUserDoc.data().internalUser) {
        throw new HttpsError('permission-denied', 'Only internal users can delete computer users');
    }

    console.log('[DeleteComputerUsers] Starting computer user deletion');
    const computerUsers = getAllComputerUsers();

    let deletedCount = 0;
    const batch = db.batch();

    for (const userData of computerUsers) {
        const computerUserId = userData.id;

        // Delete from matchmaking queue
        const queueRef = db.collection('matchmakingQueue').doc(computerUserId);
        const queueDoc = await queueRef.get();
        if (queueDoc.exists) {
            batch.delete(queueRef);
            deletedCount++;
        }

        // Delete user document (this will cascade delete subcollections in production)
        // But we'll also explicitly delete subcollections to be safe
        const userRef = db.collection('users').doc(computerUserId);
        const computerUserDoc = await userRef.get();

        if (computerUserDoc.exists) {
            // Delete settings subcollection
            const settingsRef = userRef.collection('settings');
            const settingsSnapshot = await settingsRef.get();
            settingsSnapshot.docs.forEach((doc) => {
                batch.delete(doc.ref);
            });

            // Delete friends subcollection
            const friendsRef = userRef.collection('friends');
            const friendsSnapshot = await friendsRef.get();
            friendsSnapshot.docs.forEach((doc) => {
                batch.delete(doc.ref);
            });

            // Delete user document
            batch.delete(userRef);
            deletedCount++;
        }

        // Delete friend requests where this user is involved
        const friendRequestsTo = await db
            .collection('friendRequests')
            .where('to', '==', computerUserId)
            .get();
        friendRequestsTo.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });

        const friendRequestsFrom = await db
            .collection('friendRequests')
            .where('from', '==', computerUserId)
            .get();
        friendRequestsFrom.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });

        console.log(`[DeleteComputerUsers] Queued deletion for: ${userData.displayName}`);
    }

    // Commit all deletions
    await batch.commit();

    console.log(`[DeleteComputerUsers] Successfully deleted ${deletedCount} computer user entries`);
    return {
        success: true,
        message: `Successfully deleted ${computerUsers.length} computer users`,
        deletedCount,
    };
}

/**
 * Delete all computer users from Firestore
 * Removes computer users from users collection, matchmaking queue, and related data
 * Only accessible to internal users
 */
export const deleteComputerUsers = onCall(getAppCheckConfig(), deleteComputerUsersHandler);
export { deleteComputerUsersHandler };

