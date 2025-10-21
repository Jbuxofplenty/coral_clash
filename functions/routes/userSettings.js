const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
const { getDefaultSettings } = require('../utils/helpers');

const db = admin.firestore();

/**
 * Get user settings
 * GET /api/settings
 */
exports.getUserSettings = functions.https.onCall(async (data, context) => {
    try {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }

        const userId = context.auth.uid;
        const settingsDoc = await db
            .collection('users')
            .doc(userId)
            .collection('settings')
            .doc('preferences')
            .get();

        if (!settingsDoc.exists) {
            // Return default settings if none exist
            return {
                success: true,
                settings: getDefaultSettings(),
            };
        }

        return {
            success: true,
            settings: settingsDoc.data(),
        };
    } catch (error) {
        console.error('Error getting user settings:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Update user settings
 * POST /api/settings/update
 */
exports.updateUserSettings = functions.https.onCall(async (data, context) => {
    try {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }

        const userId = context.auth.uid;
        const { settings } = data;

        if (!settings) {
            throw new functions.https.HttpsError('invalid-argument', 'Settings data is required');
        }

        // Validate and sanitize settings
        const validatedSettings = {
            ...settings,
            updatedAt: new Date().toISOString(),
        };

        // Update settings subcollection
        await db
            .collection('users')
            .doc(userId)
            .collection('settings')
            .doc('preferences')
            .set(validatedSettings, { merge: true });

        // If avatarKey is being updated, also update the main user document
        if (settings.avatarKey) {
            await db.collection('users').doc(userId).update({
                avatarKey: settings.avatarKey,
            });
        }

        return {
            success: true,
            message: 'Settings updated successfully',
            settings: validatedSettings,
        };
    } catch (error) {
        console.error('Error updating user settings:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Reset user settings to defaults
 * POST /api/settings/reset
 */
exports.resetUserSettings = functions.https.onCall(async (data, context) => {
    try {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }

        const userId = context.auth.uid;
        const defaultSettings = getDefaultSettings();

        await db
            .collection('users')
            .doc(userId)
            .collection('settings')
            .doc('preferences')
            .set({
                ...defaultSettings,
                updatedAt: new Date().toISOString(),
            });

        // Also update the main user document's avatarKey to match
        if (defaultSettings.avatarKey) {
            await db.collection('users').doc(userId).update({
                avatarKey: defaultSettings.avatarKey,
            });
        }

        return {
            success: true,
            message: 'Settings reset to defaults',
            settings: defaultSettings,
        };
    } catch (error) {
        console.error('Error resetting user settings:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});
