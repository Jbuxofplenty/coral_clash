/**
 * AI Evaluation and Search Functions for Coral Clash
 * 
 * Implements evaluation function and alpha-beta pruning for computer opponent
 */

import { CoralClash, restoreGameFromSnapshot, createGameSnapshot } from '@jbuxofplenty/coral-clash';
import {
    POSITIONAL_BONUSES,
    WHALE_SAFETY,
    CORAL_EVALUATION,
    MOBILITY,
    GAME_ENDING,
    getPieceValue,
    TIME_CONTROL,
} from './aiConfig.js';

/**
 * Convert square to rank/file for evaluation
 * @param {string} square - Square notation (e.g., 'e4')
 * @returns {Object} { rank: number, file: string }
 */
function squareToRankFile(square) {
    const file = square[0];
    const rank = parseInt(square[1], 10);
    return { rank, file };
}

/**
 * Check if square is in center (d4, d5, e4, e5)
 * @param {string} square - Square notation
 * @returns {boolean}
 */
function isCenterSquare(square) {
    return POSITIONAL_BONUSES.centerSquares.squares.includes(square);
}

/**
 * Check if square is in extended center
 * @param {string} square - Square notation
 * @returns {boolean}
 */
function isExtendedCenter(square) {
    const { rank, file } = squareToRankFile(square);
    return (
        POSITIONAL_BONUSES.extendedCenter.ranks.includes(rank) &&
        POSITIONAL_BONUSES.extendedCenter.files.includes(file)
    );
}

/**
 * Check if piece is in opponent's half
 * @param {string} square - Square notation
 * @param {string} color - Piece color ('w' or 'b')
 * @returns {boolean}
 */
function isInOpponentHalf(square, color) {
    const { rank } = squareToRankFile(square);
    if (color === 'w') {
        // White pieces in opponent's half are ranks 5-8
        return rank >= 5;
    } else {
        // Black pieces in opponent's half are ranks 1-4
        return rank <= 4;
    }
}

/**
 * Calculate Manhattan distance between two squares
 * @param {string} square1 - First square
 * @param {string} square2 - Second square
 * @returns {number} Distance
 */
function manhattanDistance(square1, square2) {
    const { rank: r1, file: f1 } = squareToRankFile(square1);
    const { rank: r2, file: f2 } = squareToRankFile(square2);
    const file1 = f1.charCodeAt(0) - 'a'.charCodeAt(0) + 1;
    const file2 = f2.charCodeAt(0) - 'a'.charCodeAt(0) + 1;
    return Math.abs(r1 - r2) + Math.abs(file1 - file2);
}

/**
 * Check if piece is near opponent whale
 * @param {string} square - Piece square
 * @param {Array<string>} opponentWhaleSquares - Opponent whale positions (2 squares)
 * @returns {boolean}
 */
function isNearOpponentWhale(square, opponentWhaleSquares) {
    if (!opponentWhaleSquares || opponentWhaleSquares.length === 0) return false;
    return opponentWhaleSquares.some((whaleSquare) => {
        const distance = manhattanDistance(square, whaleSquare);
        return distance <= 2; // Within 2 squares
    });
}

/**
 * Get all pieces on the board with their positions
 * @param {Object} game - CoralClash instance
 * @param {string} color - Color to evaluate ('w' or 'b')
 * @returns {Array} Array of { square: string, piece: string, role: string|null }
 */
function getPieces(game, color) {
    const pieces = [];
    const board = game.board();
    
    // board() returns a 2D array: board[rank][file]
    // rank 0 is rank 8, rank 7 is rank 1
    for (let rankIdx = 0; rankIdx < board.length; rankIdx++) {
        const row = board[rankIdx];
        
        if (!row) continue;
        
        for (let fileIdx = 0; fileIdx < row.length; fileIdx++) {
            const cell = row[fileIdx];
            
            if (cell && cell.color === color) {
                pieces.push({
                    square: cell.square, // Board cells have square property
                    piece: cell.type,
                    role: cell.role || null,
                });
            }
        }
    }
    
    return pieces;
}

/**
 * Evaluate a position from a player's perspective
 * Positive score is good for the player, negative is bad
 * @param {Object} gameState - Full game state snapshot
 * @param {string} playerColor - Color to evaluate for ('w' or 'b')
 * @returns {number} Evaluation score
 */
function evaluatePosition(gameState, playerColor) {
    const game = new CoralClash();
    restoreGameFromSnapshot(game, gameState);
    
    const opponentColor = playerColor === 'w' ? 'b' : 'w';
    
    // Check game-ending conditions first
    if (game.isCheckmate()) {
        const winner = game.turn() === 'w' ? 'b' : 'w';
        if (winner === playerColor) {
            return GAME_ENDING.checkmate.win;
        } else {
            return GAME_ENDING.checkmate.loss;
        }
    }
    
    if (game.isStalemate()) {
        return GAME_ENDING.stalemate.points;
    }
    
    const coralWinner = game.isCoralVictory();
    if (coralWinner) {
        if (coralWinner === playerColor) {
            return GAME_ENDING.coralVictory.win;
        } else {
            return GAME_ENDING.coralVictory.loss;
        }
    }
    
    let score = 0;
    
    // Material evaluation
    const playerPieces = getPieces(game, playerColor);
    const opponentPieces = getPieces(game, opponentColor);
    
    // Add player piece values
    for (const { piece, role } of playerPieces) {
        score += getPieceValue(piece, role);
    }
    
    // Subtract opponent piece values
    for (const { piece, role } of opponentPieces) {
        score -= getPieceValue(piece, role);
    }
    
    // Whale safety evaluation
    // Check if player's whale is in check by temporarily switching turns
    const currentTurn = game.turn();
    const whalePositions = game.whalePositions();
    const playerWhaleSquares = whalePositions[playerColor] || [];
    
    // Check if player's whale is attacked (in check)
    let playerWhaleInCheck = false;
    if (playerWhaleSquares.length > 0) {
        // Check if any whale square is attacked by opponent
        for (const whaleSquare of playerWhaleSquares) {
            if (whaleSquare && game.isAttacked(whaleSquare, opponentColor)) {
                // Check if it's actually check (not just attack) - need to see if it's legal
                // For simplicity, if whale square is attacked and it's player's turn, consider it check
                // This is an approximation - full check requires checking if escape is possible
                if (currentTurn === playerColor) {
                    playerWhaleInCheck = true;
                    break;
                }
            }
        }
    }
    
    if (playerWhaleInCheck) {
        score += WHALE_SAFETY.inCheck.penalty;
    } else {
        // Check if whale is attacked (not in check)
        if (playerWhaleSquares.length > 0) {
            for (const whaleSquare of playerWhaleSquares) {
                if (whaleSquare && game.isAttacked(whaleSquare, opponentColor)) {
                    score += WHALE_SAFETY.attacked.penalty;
                    break; // Only count once
                }
            }
        }
    }
    
    // Whale mobility - evaluate from player's perspective
    // For whale mobility, we need to evaluate from the player's perspective
    // If it's the player's turn, count their whale moves directly
    if (currentTurn === playerColor && playerWhaleSquares.length > 0) {
        const whaleMoves = game.moves({ piece: 'h', verbose: true });
        score += whaleMoves.length * WHALE_SAFETY.mobility.points;
    }
    // Note: If it's not the player's turn, we can't directly evaluate their whale mobility
    // This is an acceptable approximation for MVP - could be improved later
    
    // Opponent whale safety (reverse)
    const opponentWhaleSquares = whalePositions[opponentColor] || [];
    let opponentWhaleInCheck = false;
    if (opponentWhaleSquares.length > 0) {
        for (const whaleSquare of opponentWhaleSquares) {
            if (whaleSquare && game.isAttacked(whaleSquare, playerColor)) {
                if (currentTurn === opponentColor) {
                    opponentWhaleInCheck = true;
                    break;
                }
            }
        }
    }
    
    if (opponentWhaleInCheck) {
        score -= WHALE_SAFETY.inCheck.penalty; // Good for us
    }
    
    // Opponent whale mobility
    if (currentTurn === opponentColor && opponentWhaleSquares.length > 0) {
        const opponentWhaleMoves = game.moves({ piece: 'h', verbose: true }).length;
        score -= opponentWhaleMoves * WHALE_SAFETY.mobility.points; // Less mobility is good for us
    }
    
    // Coral area control evaluation
    const playerCoralControl = game.getCoralAreaControl(playerColor);
    const opponentCoralControl = game.getCoralAreaControl(opponentColor);
    
    score += playerCoralControl * CORAL_EVALUATION.areaControl.points;
    score -= opponentCoralControl * CORAL_EVALUATION.areaControl.points;
    
    // Positional evaluation
    const opponentWhalePositions = game.whalePositions()[opponentColor] || [];
    
    for (const { square, piece: _piece, role } of playerPieces) {
        // Center control
        if (isCenterSquare(square)) {
            score += POSITIONAL_BONUSES.centerSquares.points;
        } else if (isExtendedCenter(square)) {
            score += POSITIONAL_BONUSES.extendedCenter.points;
        }
        
        // Opponent's half
        if (isInOpponentHalf(square, playerColor)) {
            score += POSITIONAL_BONUSES.opponentHalf.points;
        }
        
        // Near opponent whale
        if (isNearOpponentWhale(square, opponentWhalePositions)) {
            score += POSITIONAL_BONUSES.nearOpponentWhale.points;
        }
        
        // Gatherer/hunter specific bonuses
        if (role === 'gatherer') {
            // Check if near empty square (potential coral placement)
            // Simplified: just give bonus for being in opponent's half
            if (isInOpponentHalf(square, playerColor)) {
                score += POSITIONAL_BONUSES.gathererNearEmptySquare.points;
            }
        } else if (role === 'hunter') {
            // Check if near opponent coral
            // This is expensive to compute exactly, so we approximate
            // by giving bonus for being in opponent's half
            if (isInOpponentHalf(square, playerColor)) {
                score += POSITIONAL_BONUSES.hunterNearOpponentCoral.points;
            }
        }
    }
    
    // Mobility evaluation (total legal moves)
    const playerMoves = game.moves({ verbose: true });
    score += playerMoves.length * MOBILITY.pointsPerMove;
    
    // Tactical: check detection
    // If it's the player's turn and they're in check, that's already handled
    // If we can put opponent in check, that's evaluated in move generation
    
    return score;
}

/**
 * Alpha-beta pruning search algorithm with time control
 * @param {Object} gameState - Current game state
 * @param {number} depth - Search depth (plies)
 * @param {number} alpha - Best value for maximizing player
 * @param {number} beta - Best value for minimizing player
 * @param {boolean} maximizingPlayer - True if maximizing player's turn
 * @param {string} playerColor - Color we're playing for ('w' or 'b')
 * @param {Object} timeControl - Time control object with startTime and maxTimeMs
 * @returns {Object} { score: number, move: Object|null, nodesEvaluated: number, timedOut: boolean }
 */
function alphaBeta(gameState, depth, alpha, beta, maximizingPlayer, playerColor, timeControl = null) {
    let nodesEvaluated = 1;
    
    // Check time control
    if (timeControl) {
        const elapsed = Date.now() - timeControl.startTime;
        if (elapsed >= timeControl.maxTimeMs) {
            return {
                score: 0, // Neutral score when timed out
                move: null,
                nodesEvaluated: 1,
                timedOut: true,
            };
        }
    }
    
    const game = new CoralClash();
    restoreGameFromSnapshot(game, gameState);
    
    // Terminal node: check game-ending conditions or depth limit
    if (depth === 0 || game.isGameOver()) {
        const score = evaluatePosition(gameState, playerColor);
        // Flip score if we're evaluating from opponent's perspective
        return {
            score: maximizingPlayer ? score : -score,
            move: null,
            nodesEvaluated: 1,
        };
    }
    
    const _currentColor = game.turn();
    const moves = game.moves({ verbose: true });
    
    if (moves.length === 0) {
        // No legal moves - terminal state
        const score = evaluatePosition(gameState, playerColor);
        return {
            score: maximizingPlayer ? score : -score,
            move: null,
            nodesEvaluated: 1,
        };
    }
    
    let bestMove = null;
    let bestScore = maximizingPlayer ? -Infinity : Infinity;
    
    // Sort moves for better pruning (optional optimization)
    // For now, just evaluate in order
    
    for (const move of moves) {
        // Make the move
        const moveResult = game.move({
            from: move.from,
            to: move.to,
            promotion: move.promotion,
            coralPlaced: move.coralPlaced,
            coralRemoved: move.coralRemoved,
            coralRemovedSquares: move.coralRemovedSquares,
        });
        
        if (!moveResult) {
            // Invalid move, skip
            continue;
        }
        
        // Create new game state after move
        const newGameState = createGameSnapshot(game);
        
        // Recursively search
        const result = alphaBeta(
            newGameState,
            depth - 1,
            alpha,
            beta,
            !maximizingPlayer,
            playerColor,
            timeControl,
        );
        
        nodesEvaluated += result.nodesEvaluated;
        
        // If timed out, propagate timeout
        if (result.timedOut) {
            return {
                score: bestScore,
                move: bestMove,
                nodesEvaluated,
                timedOut: true,
            };
        }
        
        const moveScore = result.score;
        
        // Undo move
        game.undo();
        
        if (maximizingPlayer) {
            if (moveScore > bestScore) {
                bestScore = moveScore;
                bestMove = move;
            }
            alpha = Math.max(alpha, bestScore);
            if (beta <= alpha) {
                // Beta cutoff
                break;
            }
        } else {
            if (moveScore < bestScore) {
                bestScore = moveScore;
                bestMove = move;
            }
            beta = Math.min(beta, bestScore);
            if (beta <= alpha) {
                // Alpha cutoff
                break;
            }
        }
    }
    
    return {
        score: bestScore,
        move: bestMove,
        nodesEvaluated,
        timedOut: false,
    };
}

/**
 * Find best move using alpha-beta pruning
 * @param {Object} gameState - Current game state
 * @param {number} depth - Search depth (plies)
 * @param {string} playerColor - Color we're playing for ('w' or 'b')
 * @param {Object} timeControl - Optional time control object with startTime and maxTimeMs
 * @returns {Object} { move: Object, score: number, nodesEvaluated: number, timedOut: boolean }
 */
function findBestMove(gameState, depth, playerColor, timeControl = null) {
    const game = new CoralClash();
    restoreGameFromSnapshot(game, gameState);
    
    // Determine if we're maximizing (our turn) or minimizing (opponent's turn)
    // Since we're always evaluating for playerColor, we check whose turn it is
    const currentTurn = game.turn();
    const maximizingPlayer = currentTurn === playerColor;
    
    return alphaBeta(gameState, depth, -Infinity, Infinity, maximizingPlayer, playerColor, timeControl);
}

/**
 * Find best move using iterative deepening with time control
 * @param {Object} gameState - Current game state
 * @param {number} maxDepth - Maximum depth to search to
 * @param {string} playerColor - Color we're playing for ('w' or 'b')
 * @param {number} maxTimeMs - Maximum time to spend in milliseconds
 * @param {Function} progressCallback - Optional callback for progress updates (depth, nodesEvaluated, elapsedMs)
 * @returns {Object} { move: Object, score: number, nodesEvaluated: number, depth: number, elapsedMs: number }
 */
function findBestMoveIterativeDeepening(gameState, maxDepth, playerColor, maxTimeMs = TIME_CONTROL.maxTimeMs, progressCallback = null) {
    const startTime = Date.now();
    let bestMove = null;
    let bestScore = -Infinity;
    let totalNodesEvaluated = 0;
    let bestDepth = 1;
    
    const timeControl = {
        startTime,
        maxTimeMs,
    };
    
    // Iterative deepening: start with depth 1 and increase until time runs out or max depth reached
    for (let depth = 1; depth <= maxDepth; depth++) {
        const result = findBestMove(gameState, depth, playerColor, timeControl);
        
        const elapsed = Date.now() - startTime;
        
        totalNodesEvaluated += result.nodesEvaluated;
        
        // If timed out, use the best result from previous depth (if any)
        if (result.timedOut) {
            // If we have a best move from previous depth, use it
            if (bestMove) {
                break;
            }
            // If depth 1 timed out and we have no previous result, fall through to fallback
            break;
        }
        
        // Update best move if we found one
        if (result.move) {
            bestMove = result.move;
            bestScore = result.score;
            bestDepth = depth;
        }
        
        // Report progress
        if (progressCallback) {
            progressCallback(depth, result.nodesEvaluated, elapsed, bestMove !== null);
        }
        
        // Check if we've exceeded time limit
        if (elapsed >= maxTimeMs) {
            break;
        }
        
        // If we reached a terminal position (checkmate, etc.), no need to go deeper
        if (Math.abs(result.score) > 90000) {
            // Found a winning/losing position
            break;
        }
    }
    
    const totalElapsed = Date.now() - startTime;
    
    // If no move found (shouldn't happen), return first legal move as fallback
    if (!bestMove) {
        const game = new CoralClash();
        restoreGameFromSnapshot(game, gameState);
        const moves = game.moves({ verbose: true });
        if (moves.length > 0) {
            bestMove = moves[0];
        }
    }
    
    return {
        move: bestMove,
        score: bestScore,
        nodesEvaluated: totalNodesEvaluated,
        depth: bestDepth,
        elapsedMs: totalElapsed,
    };
}

export { evaluatePosition, alphaBeta, findBestMove, findBestMoveIterativeDeepening };

