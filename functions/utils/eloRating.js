const DEFAULT_ELO = 1200;
const PROVISIONAL_K = 40;   // K-factor for first 30 rated games
const STANDARD_K = 20;      // K-factor after 30 rated games
const PROVISIONAL_THRESHOLD = 30; // Number of games before switching K-factor

/**
 * Get the appropriate K-factor based on number of rated games played
 * @param {number} ratedGamesPlayed - Number of rated games the player has completed
 * @returns {number} K-factor to use
 */
export function getKFactor(ratedGamesPlayed) {
    if (typeof ratedGamesPlayed !== 'number' || ratedGamesPlayed < 0) {
        return PROVISIONAL_K;
    }
    return ratedGamesPlayed < PROVISIONAL_THRESHOLD ? PROVISIONAL_K : STANDARD_K;
}

/**
 * Calculate new Elo ratings for both players after a game
 * @param {number} player1Elo - Current Elo of player 1
 * @param {number} player2Elo - Current Elo of player 2
 * @param {number} player1Score - 1 for win, 0.5 for draw, 0 for loss
 * @param {number} player1RatedGames - Player 1's rated games count (for K-factor)
 * @param {number} player2RatedGames - Player 2's rated games count (for K-factor)
 * @returns {{ player1NewElo, player2NewElo, player1Delta, player2Delta }}
 */
export function calculateElo(player1Elo, player2Elo, player1Score, player1RatedGames = 0, player2RatedGames = 0) {
    const p1Elo = typeof player1Elo === 'number' ? player1Elo : DEFAULT_ELO;
    const p2Elo = typeof player2Elo === 'number' ? player2Elo : DEFAULT_ELO;
    
    // Expected scores
    const expected1 = 1 / (1 + Math.pow(10, (p2Elo - p1Elo) / 400));
    const expected2 = 1 / (1 + Math.pow(10, (p1Elo - p2Elo) / 400));
    
    // Actual scores
    const actual1 = player1Score;
    const actual2 = 1 - player1Score;
    
    // K-factors
    const k1 = getKFactor(player1RatedGames);
    const k2 = getKFactor(player2RatedGames);
    
    // Calculate new ratings
    let p1NewElo = Math.round(p1Elo + k1 * (actual1 - expected1));
    let p2NewElo = Math.round(p2Elo + k2 * (actual2 - expected2));
    
    // Floor Elo at 100
    p1NewElo = Math.max(100, p1NewElo);
    p2NewElo = Math.max(100, p2NewElo);
    
    return {
        player1NewElo: p1NewElo,
        player2NewElo: p2NewElo,
        player1Delta: p1NewElo - p1Elo,
        player2Delta: p2NewElo - p2Elo
    };
}

export { DEFAULT_ELO, PROVISIONAL_K, STANDARD_K, PROVISIONAL_THRESHOLD };
