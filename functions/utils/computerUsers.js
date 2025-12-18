/**
 * Computer Users Management
 * Defines and manages the ~10 computer users used in matchmaking
 */

const COMPUTER_USERS = [
    { id: 'computer_user_1', displayName: 'Alex', discriminator: '2847', difficulty: 'easy', avatarKey: 'dolphin' },
    { id: 'computer_user_2', displayName: 'Jordan', discriminator: '5192', difficulty: 'easy', avatarKey: 'whale' },
    { id: 'computer_user_3', displayName: 'Sam', discriminator: '7364', difficulty: 'easy', avatarKey: 'shark' },
    { id: 'computer_user_4', displayName: 'Casey', discriminator: '1829', difficulty: 'medium', avatarKey: 'dolphin' },
    { id: 'computer_user_5', displayName: 'Riley', discriminator: '4057', difficulty: 'medium', avatarKey: 'whale' },
    { id: 'computer_user_6', displayName: 'Morgan', discriminator: '6293', difficulty: 'medium', avatarKey: 'shark' },
    { id: 'computer_user_7', displayName: 'Taylor', discriminator: '8471', difficulty: 'medium', avatarKey: 'dolphin' },
    { id: 'computer_user_8', displayName: 'Quinn', discriminator: '3156', difficulty: 'hard', avatarKey: 'whale' },
    { id: 'computer_user_9', displayName: 'Avery', discriminator: '5928', difficulty: 'hard', avatarKey: 'shark' },
    { id: 'computer_user_10', displayName: 'Blake', discriminator: '7642', difficulty: 'hard', avatarKey: 'dolphin' },
];

/**
 * Get all computer user IDs
 * @returns {string[]} Array of computer user IDs
 */
export function getComputerUsers() {
    return COMPUTER_USERS.map((user) => user.id);
}

/**
 * Check if a user ID is a computer user
 * @param {string} userId - User ID to check
 * @returns {boolean} True if the user is a computer user
 */
export function isComputerUser(userId) {
    if (!userId) return false;
    return COMPUTER_USERS.some((user) => user.id === userId);
}

/**
 * Get difficulty level for a computer user
 * @param {string} userId - Computer user ID
 * @returns {string|null} Difficulty level ('easy', 'medium', 'hard') or null if not found
 */
export function getComputerUserDifficulty(userId) {
    const user = COMPUTER_USERS.find((u) => u.id === userId);
    return user ? user.difficulty : null;
}

/**
 * Get computer user data by ID
 * @param {string} userId - Computer user ID
 * @returns {Object|null} Computer user data or null if not found
 */
export function getComputerUserData(userId) {
    return COMPUTER_USERS.find((u) => u.id === userId) || null;
}

/**
 * Get a random available computer user
 * @param {Object} _timeControl - Time control preference (optional)
 * @returns {Object|null} Random computer user data or null if none available
 */
export function getRandomComputerUser(_timeControl = null) {
    // For now, return a random computer user
    // In the future, could filter by time control preference
    const randomIndex = Math.floor(Math.random() * COMPUTER_USERS.length);
    return COMPUTER_USERS[randomIndex];
}

/**
 * Get all computer user data
 * @returns {Object[]} Array of all computer user data
 */
export function getAllComputerUsers() {
    return COMPUTER_USERS;
}

