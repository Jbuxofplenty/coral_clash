const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { getDefaultSettings } = require('../utils/helpers');
const { getAppCheckConfig } = require('../utils/appCheckConfig');

const db = admin.firestore();

/**
 * Handler for getting user settings
 * Separated for testing purposes
 */
async function getUserSettingsHandler(request) {
    const { data, auth } = request;
    if (!auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = auth.uid;
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
}

/**
 * Get user settings
 * GET /api/settings
 */
exports.getUserSettings = onCall(getAppCheckConfig(), getUserSettingsHandler);
exports.getUserSettingsHandler = getUserSettingsHandler;

/**
 * Handler for updating user settings
 * Separated for testing purposes
 */
async function updateUserSettingsHandler(request) {
    const { data, auth } = request;
    if (!auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = auth.uid;
    const { settings } = data;

    if (!settings) {
        throw new HttpsError('invalid-argument', 'Settings data is required');
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

    return {
        success: true,
        message: 'Settings updated successfully',
        settings: validatedSettings,
    };
}

/**
 * Update user settings
 * POST /api/settings/update
 */
exports.updateUserSettings = onCall(getAppCheckConfig(), updateUserSettingsHandler);
exports.updateUserSettingsHandler = updateUserSettingsHandler;

/**
 * Handler for resetting user settings
 * Separated for testing purposes
 */
async function resetUserSettingsHandler(request) {
    const { data, auth } = request;
    if (!auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = auth.uid;
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

    return {
        success: true,
        message: 'Settings reset to defaults',
        settings: defaultSettings,
    };
}

/**
 * Reset user settings to defaults
 * POST /api/settings/reset
 */
exports.resetUserSettings = onCall(getAppCheckConfig(), resetUserSettingsHandler);
exports.resetUserSettingsHandler = resetUserSettingsHandler;
