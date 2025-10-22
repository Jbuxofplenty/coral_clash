// Import from shared library (source of truth)
const {
    CoralClash,
    createGameSnapshot,
    restoreGameFromSnapshot,
} = require('../../shared/dist/game');

/**
 * Validate a move on the server side to prevent cheating
 * @param {Object} gameState - Current game state (includes FEN, coral, etc)
 * @param {Object} move - Move object {from, to, promotion?, coralPlaced?, coralRemoved?}
 * @returns {Object} { valid: boolean, result?: Move, error?: string }
 */
function validateMove(gameState, move) {
    try {
        // Create game instance and restore full state (including coral)
        const game = new CoralClash();

        // If we have a full game state, restore it (includes coral)
        if (gameState && typeof gameState === 'object' && gameState.fen) {
            restoreGameFromSnapshot(game, gameState);
        } else {
            // Fallback: if just a FEN string was passed (backward compatibility)
            game.load(gameState);
        }

        // Try to make the move
        const result = game.move(move);

        if (!result) {
            return {
                valid: false,
                error: 'Invalid move',
            };
        }

        return {
            valid: true,
            result: result,
            newFen: game.fen(),
            gameState: createGameSnapshot(game),
        };
    } catch (error) {
        return {
            valid: false,
            error: error.message || 'Move validation failed',
        };
    }
}

/**
 * Get all legal moves for a position
 * @param {string} fen - Current game FEN
 * @param {string} square - Optional square to get moves for
 * @returns {Array} Array of legal moves
 */
function getLegalMoves(fen, square = undefined) {
    try {
        const game = new CoralClash(fen);
        return game.moves({ verbose: true, square });
    } catch (error) {
        console.error('Error getting legal moves:', error);
        return [];
    }
}

/**
 * Check if a game is over and get the result
 * @param {Object} gameState - Full game state object (with coral, piece roles, etc.)
 * @returns {Object} { isOver: boolean, result?: string, reason?: string }
 */
function getGameResult(gameState) {
    try {
        const game = new CoralClash();
        // Restore full game state including coral, piece roles, resignation, etc.
        restoreGameFromSnapshot(game, gameState);

        if (!game.isGameOver()) {
            return { isOver: false };
        }

        // Determine the result
        if (game.isCheckmate()) {
            const winner = game.turn() === 'w' ? 'b' : 'w';
            return {
                isOver: true,
                result: winner === 'w' ? '1-0' : '0-1',
                reason: 'checkmate',
                winner,
            };
        }

        if (game.isDraw()) {
            return {
                isOver: true,
                result: '1/2-1/2',
                reason: game.isStalemate()
                    ? 'stalemate'
                    : game.isThreefoldRepetition()
                      ? 'repetition'
                      : game.isInsufficientMaterial()
                        ? 'insufficient-material'
                        : 'fifty-move-rule',
            };
        }

        const coralWinner = game.isCoralVictory();
        if (coralWinner) {
            return {
                isOver: true,
                result: coralWinner === 'w' ? '1-0' : '0-1',
                reason: 'coral-victory',
                winner: coralWinner,
            };
        }

        const resigned = game.isResigned();
        if (resigned) {
            const winner = resigned === 'w' ? 'b' : 'w';
            return {
                isOver: true,
                result: winner === 'w' ? '1-0' : '0-1',
                reason: 'resignation',
                winner,
            };
        }

        return { isOver: true, result: '1/2-1/2', reason: 'unknown' };
    } catch (error) {
        console.error('Error getting game result:', error);
        return { isOver: false, error: error.message };
    }
}

module.exports = {
    validateMove,
    getLegalMoves,
    getGameResult,
};
