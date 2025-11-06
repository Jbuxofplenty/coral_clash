import { GAME_VERSION } from '@jbuxofplenty/coral-clash';

/**
 * Parse a semantic version string into its components
 * @param {string} version - Version string (e.g., "1.2.3")
 * @returns {{major: number, minor: number, patch: number}}
 */
function parseVersion(version) {
    if (!version || typeof version !== 'string') {
        return { major: 0, minor: 0, patch: 0 };
    }

    const parts = version.split('.').map(Number);
    return {
        major: parts[0] || 0,
        minor: parts[1] || 0,
        patch: parts[2] || 0,
    };
}

/**
 * Validate client version against server version
 * Compatibility rules:
 * - Major versions must match (breaking changes)
 * - Minor versions must match (feature additions)
 * - Patch versions can differ (bug fixes are compatible)
 *
 * @param {string} clientVersion - Version string from client
 * @returns {{isCompatible: boolean, requiresUpdate: boolean, serverVersion: string, clientVersion: string}}
 */
export function validateClientVersion(clientVersion) {
    const serverVersion = GAME_VERSION;

    if (!clientVersion) {
        return {
            isCompatible: false,
            requiresUpdate: true,
            serverVersion,
            clientVersion: 'unknown',
        };
    }

    const client = parseVersion(clientVersion);
    const server = parseVersion(serverVersion);

    // Check compatibility (major and minor must match)
    const isCompatible = client.major === server.major && client.minor === server.minor;

    // Determine if client needs update (older major or minor version)
    const requiresUpdate =
        client.major < server.major ||
        (client.major === server.major && client.minor < server.minor);

    return {
        isCompatible,
        requiresUpdate,
        serverVersion,
        clientVersion,
    };
}
