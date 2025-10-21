// Register ts-node to handle TypeScript imports
require('./register');

const admin = require('firebase-admin');
const functions = require('firebase-functions/v1');

// Initialize Firebase Admin
admin.initializeApp();

const db = admin.firestore();

// Import route modules
const userProfile = require('./routes/userProfile');
const userSettings = require('./routes/userSettings');
const game = require('./routes/game');
const friends = require('./routes/friends');
const { getDefaultSettings } = require('./utils/helpers');

// ==================== User Profile APIs ====================
exports.getUserProfile = userProfile.getUserProfile;
exports.updateUserProfile = userProfile.updateUserProfile;

// ==================== User Settings APIs ====================
exports.getUserSettings = userSettings.getUserSettings;
exports.updateUserSettings = userSettings.updateUserSettings;
exports.resetUserSettings = userSettings.resetUserSettings;

// ==================== Game APIs ====================
exports.createGame = game.createGame;
exports.createComputerGame = game.createComputerGame;
exports.respondToGameInvite = game.respondToGameInvite;
exports.makeMove = game.makeMove;
exports.getActiveGames = game.getActiveGames;
exports.getGameHistory = game.getGameHistory;

// ==================== Friends APIs ====================
exports.sendFriendRequest = friends.sendFriendRequest;
exports.respondToFriendRequest = friends.respondToFriendRequest;
exports.getFriends = friends.getFriends;
exports.removeFriend = friends.removeFriend;
exports.searchUsers = friends.searchUsers;

// ==================== Firestore Triggers ====================

/**
 * Automatically assign a unique discriminator to new users
 * Trigger on user document creation
 */
exports.onUserCreate = functions.firestore
    .document('users/{userId}')
    .onCreate(async (snap, context) => {
        try {
            const userData = snap.data();

            // Check if discriminator already exists
            if (userData.discriminator) {
                return null;
            }

            const displayName = userData.displayName || 'User';
            const userId = context.params.userId;
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

            // Get default settings if not already set
            const updates = {
                discriminator: discriminator,
            };

            // Only set default settings if settings don't exist
            if (!userData.settings) {
                updates.settings = getDefaultSettings();
            }

            // Update the user document with the discriminator and default settings
            await snap.ref.update(updates);

            console.log(
                `Assigned unique discriminator ${discriminator} and default settings to user ${userId} (${displayName})`,
            );
            return null;
        } catch (error) {
            console.error('Error assigning discriminator:', error);
            return null;
        }
    });
