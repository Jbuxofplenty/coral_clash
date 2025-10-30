import AsyncStorage from '@react-native-async-storage/async-storage';

const PASS_AND_PLAY_GAMES_KEY = '@pass_and_play_games';

/**
 * Get all pass-and-play games from local storage
 * @returns {Promise<Array>} Array of pass-and-play games
 */
export const getPassAndPlayGames = async () => {
    try {
        const gamesJson = await AsyncStorage.getItem(PASS_AND_PLAY_GAMES_KEY);
        return gamesJson ? JSON.parse(gamesJson) : [];
    } catch (error) {
        console.error('Error loading pass-and-play games:', error);
        return [];
    }
};

/**
 * Save a new pass-and-play game
 * @param {Object} game - Game data
 * @returns {Promise<string>} Game ID
 */
export const savePassAndPlayGame = async (game) => {
    try {
        const games = await getPassAndPlayGames();
        const gameId = `local_${Date.now()}`;
        const newGame = {
            id: gameId,
            ...game,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        games.push(newGame);
        await AsyncStorage.setItem(PASS_AND_PLAY_GAMES_KEY, JSON.stringify(games));
        return gameId;
    } catch (error) {
        console.error('Error saving pass-and-play game:', error);
        throw error;
    }
};

/**
 * Update an existing pass-and-play game
 * @param {string} gameId - Game ID
 * @param {Object} updates - Updates to apply
 */
export const updatePassAndPlayGame = async (gameId, updates) => {
    try {
        const games = await getPassAndPlayGames();
        const index = games.findIndex((g) => g.id === gameId);
        if (index !== -1) {
            games[index] = {
                ...games[index],
                ...updates,
                updatedAt: new Date().toISOString(),
            };
            await AsyncStorage.setItem(PASS_AND_PLAY_GAMES_KEY, JSON.stringify(games));
        }
    } catch (error) {
        console.error('Error updating pass-and-play game:', error);
        throw error;
    }
};

/**
 * Delete a pass-and-play game
 * @param {string} gameId - Game ID
 */
export const deletePassAndPlayGame = async (gameId) => {
    try {
        const games = await getPassAndPlayGames();
        const filteredGames = games.filter((g) => g.id !== gameId);
        await AsyncStorage.setItem(PASS_AND_PLAY_GAMES_KEY, JSON.stringify(filteredGames));
    } catch (error) {
        console.error('Error deleting pass-and-play game:', error);
        throw error;
    }
};

/**
 * Get a single pass-and-play game by ID
 * @param {string} gameId - Game ID
 * @returns {Promise<Object|null>} Game data or null
 */
export const getPassAndPlayGame = async (gameId) => {
    try {
        const games = await getPassAndPlayGames();
        return games.find((g) => g.id === gameId) || null;
    } catch (error) {
        console.error('Error getting pass-and-play game:', error);
        return null;
    }
};
