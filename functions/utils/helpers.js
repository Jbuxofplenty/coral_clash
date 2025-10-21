// Import from shared library (source of truth)
const { CoralClash, DEFAULT_POSITION } = require('../../shared/game/coralClash');
const { createGameSnapshot } = require('../../shared/game/gameState');

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
        // Avatar preference (ocean-themed pieces) - random selection
        avatarKey: getRandomAvatarKey(),
    };
}

module.exports = {
    initializeGameState,
    getDefaultSettings,
};
