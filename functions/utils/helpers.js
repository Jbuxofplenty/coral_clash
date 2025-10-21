// Import from shared library (source of truth)
const { CoralClash, DEFAULT_POSITION, createGameSnapshot } = require('../../shared/game');
const { FieldValue } = require('firebase-admin/firestore');

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
 * Get a random avatar key from available options
 * @returns {string} Random avatar key
 */
function getRandomAvatarKey() {
    const avatarKeys = ['dolphin', 'octopus', 'whale', 'turtle', 'crab', 'puffer'];
    const randomIndex = Math.floor(Math.random() * avatarKeys.length);
    return avatarKeys[randomIndex];
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

module.exports = {
    initializeGameState,
    getDefaultSettings,
    serverTimestamp,
    increment,
};
