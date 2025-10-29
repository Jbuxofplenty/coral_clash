import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { admin } from '../init.js';
import { getDefaultSettings } from '../utils/helpers.js';

/**
 * Automatically assign a unique discriminator to new users
 * Trigger on user document creation
 */
export const onUserCreate = onDocumentCreated('users/{userId}', async (event) => {
    try {
        const db = admin.firestore();
        const snap = event.data;
        if (!snap) return;

        const userData = snap.data();

        // Check if discriminator already exists
        if (userData.discriminator) {
            return null;
        }

        const displayName = userData.displayName || 'User';
        const userId = event.params.userId;
        let discriminator = null;
        let attempts = 0;
        const maxAttempts = 100; // Prevent infinite loops

        // Keep trying until we find a unique discriminator
        while (!discriminator && attempts < maxAttempts) {
            attempts++;

            // Generate random 4-digit discriminator
            const candidate = Math.floor(1000 + Math.random() * 9000).toString();

            // Check if this username + discriminator combo already exists
            const existingUsers = await db
                .collection('users')
                .where('displayName', '==', displayName)
                .where('discriminator', '==', candidate)
                .limit(1)
                .get();

            // If no match found, this discriminator is unique for this username
            if (existingUsers.empty) {
                discriminator = candidate;
            }
        }

        if (!discriminator) {
            console.error(
                `Failed to generate unique discriminator for user ${userId} after ${maxAttempts} attempts`,
            );
            // Fall back to a random one anyway
            discriminator = Math.floor(1000 + Math.random() * 9000).toString();
        }

        // Update the user document with the discriminator
        await snap.ref.update({
            discriminator: discriminator,
        });

        // Initialize default settings in subcollection if not already set
        if (!userData.settings) {
            const defaultSettings = getDefaultSettings();
            await db
                .collection('users')
                .doc(userId)
                .collection('settings')
                .doc('preferences')
                .set({
                    ...defaultSettings,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                });
        }

        console.log(
            `Assigned unique discriminator ${discriminator} and default settings to user ${userId} (${displayName})`,
        );
        return null;
    } catch (error) {
        console.error('Error assigning discriminator:', error);
        return null;
    }
});
