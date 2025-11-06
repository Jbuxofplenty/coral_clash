// Import from shared library (source of truth)
import { CoralClash, DEFAULT_POSITION, createGameSnapshot } from '@jbuxofplenty/coral-clash';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Initialize game state for a new Coral Clash game
 * Uses the actual game engine to ensure consistency
 * @returns {Object} Initial game state including FEN
 */
function initializeGameState() {
    // Create a new game instance at starting position
    const game = new CoralClash(DEFAULT_POSITION);

    // Return game state in format suitable for Firestore
    return createGameSnapshot(game);
}

/**
 * Get default user settings
 * @returns {Object} Default settings object
 */
function getDefaultSettings() {
    return {
        // Theme preference
        theme: 'auto', // 'light', 'dark', 'auto'
        // Avatar preference (ocean-themed pieces) - dolphin is default
        avatarKey: 'dolphin',
    };
}

/**
 * Get server timestamp for Firestore
 * @returns {FieldValue} Server timestamp
 */
function serverTimestamp() {
    return FieldValue.serverTimestamp();
}

/**
 * Get Firestore increment value
 * @param {number} amount - Amount to increment by
 * @returns {FieldValue} Increment value
 */
function increment(amount) {
    return FieldValue.increment(amount);
}

/**
 * Format display name with discriminator
 * @param {string} displayName - The user's display name
 * @param {string} discriminator - The 4-digit discriminator
 * @returns {string} Formatted name like "Username #1234"
 */
function formatDisplayName(displayName, discriminator) {
    if (!displayName) {
        return 'User';
    }
    if (!discriminator) {
        return displayName;
    }
    return `${displayName} #${discriminator}`;
}

export { formatDisplayName, getDefaultSettings, increment, initializeGameState, serverTimestamp };
