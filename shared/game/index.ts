/**
 * Coral Clash Game Logic Library - Source of Truth
 * Shared between React Native app and Firebase Functions
 *
 * This is the authoritative source for all game logic.
 * Both the mobile app and cloud functions import from here.
 *
 * VERSIONING:
 * - Version is managed by semantic-release
 * - Game logic is versioned to maintain backward compatibility
 * - Frontend and backend must use matching versions
 */

// Current game engine version (automatically updated by semantic-release during build)
export const GAME_VERSION = '2.3.0';

// Export current version (v1.0.0) as default for easy imports
// All game logic imports should come from versioned folders
export * from './v1.0.0/index.js';

/**
 * Get game engine for a specific version
 * Useful for supporting multiple versions or testing
 * @param version - Semantic version string (e.g., '1.0.0')
 * @returns Game engine modules for the specified version
 */
export async function getGameEngine(version: string = GAME_VERSION) {
    switch (version) {
        case '1.0.0':
            return await import('./v1.0.0/index.js');
        default:
            throw new Error(
                `Unsupported game version: ${version}. Current version: ${GAME_VERSION}`,
            );
    }
}
