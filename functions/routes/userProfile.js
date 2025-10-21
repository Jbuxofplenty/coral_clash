const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
const { serverTimestamp } = require('../utils/helpers');

const db = admin.firestore();

/**
 * Get user profile
 * GET /api/profile/:userId
 */
exports.getUserProfile = functions.https.onCall(async (data, context) => {
    try {
        // Verify authentication
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }

        const { userId } = data;

        // Users can only get their own profile or profiles of their friends
        if (userId !== context.auth.uid) {
            // Check if they're friends
            const friendDoc = await db
                .collection('users')
                .doc(context.auth.uid)
                .collection('friends')
                .doc(userId)
                .get();

            if (!friendDoc.exists) {
                throw new functions.https.HttpsError(
                    'permission-denied',
                    'Can only view friends profiles',
                );
            }
        }

        const userDoc = await db.collection('users').doc(userId).get();

        if (!userDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'User not found');
        }

        return {
            success: true,
            profile: userDoc.data(),
        };
    } catch (error) {
        console.error('Error getting user profile:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Update user profile
 * POST /api/profile/update
 */
exports.updateUserProfile = functions.https.onCall(async (data, context) => {
    try {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }

        const { displayName, photoURL, preferences } = data;
        const userId = context.auth.uid;

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
    } catch (error) {
        console.error('Error updating user profile:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});
