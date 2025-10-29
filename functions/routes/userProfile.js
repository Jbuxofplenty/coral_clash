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

    if (!userDoc.exists) {
        throw new HttpsError('not-found', 'User not found');
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
