/**
 * AI Configuration for Coral Clash Computer Opponent
 *
 * This file contains all evaluation parameters for the AI difficulty system.
 * Tune these values to adjust AI behavior and create new difficulty modes.
 */

import type { PieceRole, PieceSymbol } from './coralClash.js';

/**
 * Piece values for material evaluation
 * Higher values indicate more valuable pieces
 */
const PIECE_VALUES = {
    whale: {
        // Whale is the king - win condition piece
        value: 20000,
    },
    dolphin: {
        gatherer: 1800, // Higher: Max mobility + Coral placement is premium utility
        hunter: 900, // High mobility + Coral removal utility
    },
    turtle: {
        gatherer: 1000, // Higher: Excellent straight-line mobility + Coral placement
        hunter: 500, // Good mobility + Coral removal utility
    },
    pufferfish: {
        gatherer: 600, // Higher: Diagonal mobility + Coral placement utility
        hunter: 300, // Diagonal movement + Coral removal utility
    },
    octopus: {
        gatherer: 125, // Higher: Basic mobility, but Coral placement on front lines is critical
        hunter: 100, // Lowest mobility, focused on localized Coral denial
    },
    crab: {
        gatherer: 125, // Higher: Basic mobility, focused on localized Coral placement
        hunter: 100, // Lowest mobility, focused on localized Coral denial
    },
};

/**
 * Positional bonuses
 * Rewards for good piece placement
 */
const POSITIONAL_BONUSES = {
    centerSquares: {
        squares: ['d4', 'd5', 'e4', 'e5'] as const,
        points: 5, // Points per piece on center squares
    },
    extendedCenter: {
        // c3-c6, d3-d6, e3-e6, f3-f6
        ranks: [3, 4, 5, 6] as const,
        files: ['c', 'd', 'e', 'f'] as const,
        points: 2, // Points per piece in extended center
    },
    opponentHalf: {
        points: 10, // Points per piece in opponent's half (ranks 1-4 for white, ranks 5-8 for black)
    },
    nearOpponentWhale: {
        points: 15, // Points per piece near opponent's whale (within 2 squares)
    },
    gathererNearEmptySquare: {
        points: 3, // Points for gatherer pieces near empty squares (potential coral placement)
    },
    hunterNearOpponentCoral: {
        points: 5, // Points for hunter pieces near opponent's coral (potential removal)
    },
};

/**
 * Whale (king) safety evaluation
 * Penalizes exposed whale and rewards protection
 */
const WHALE_SAFETY = {
    inCheck: {
        penalty: -500, // Penalty when whale is in check
    },
    attacked: {
        penalty: -100, // Penalty when whale is attacked (not in check)
    },
    defenders: {
        points: 5, // Points per piece defending the whale
    },
    mobility: {
        points: 2, // Points per available whale move
    },
};

/**
 * Piece safety evaluation
 * Penalizes leaving valuable pieces under attack
 */
const PIECE_SAFETY = {
    // Penalty multipliers based on piece value (applied to attacked pieces)
    // More valuable pieces get larger penalties when under attack
    attackedMultiplier: 0.25, // 25% of piece value penalty when under attack
    // Extra penalty for hanging pieces (attacked but NOT defended)
    // We strictly use < 1.0 to avoid negative piece values which discourage capturing!
    hangingMultiplier: 0.7, // 70% of piece value penalty when hanging (piece retains 30% value)
    // Critical piece threshold - pieces above this value get even more severe penalties
    criticalPieceThreshold: 1500, // Dolphin gatherer (1800) is above this
    // Extra penalty multiplier for critical pieces that are hanging
    criticalHangingMultiplier: 0.8, // 80% penalty (piece retains 20% value) - strongly discouraged but not "poisoned"
    // Bonus for defended pieces (defenders present)
    defendedBonus: 0.05, // 5% of piece value bonus when defended
    // Points per defender of a valuable piece
    defendersPerPiece: 2, // Points per piece defending a valuable piece
};

/**
 * Coral control and placement evaluation
 * Rewards coral control which is a win condition
 */
const CORAL_EVALUATION = {
    areaControl: {
        points: 100, // Points per coral controlled (coral of your color not occupied by opponent)
    },
    placed: {
        points: 15, // Points per coral placed by gatherer effect
    },
    removed: {
        points: 25, // Points per coral removed from opponent (hunter effect)
    },
    blockingOpponent: {
        points: 5, // Points per coral blocking opponent piece movement
    },
};

/**
 * Tactical bonuses
 * Rewards for tactical moves
 */
const TACTICAL_BONUSES = {
    check: {
        points: 50, // Points for putting opponent in check
    },
    checkmate: {
        points: 100000, // Massive bonus for checkmate (should be very high)
    },
    coralVictory: {
        points: 100000, // Bonus for coral area control victory
    },
    // Piece capture value is determined by PIECE_VALUES above
};

/**
 * Piece mobility evaluation
 * Rewards having more legal moves available
 */
const MOBILITY = {
    pointsPerMove: 1, // Points per legal move available (for all pieces)
};

/**
 * Game-ending conditions
 * Evaluation for terminal game states
 */
const GAME_ENDING = {
    checkmate: {
        win: 100000, // Very high positive for winning by checkmate
        loss: -100000, // Very high negative for losing by checkmate
    },
    coralVictory: {
        win: 100000, // Positive for winning by coral area control
        loss: -100000, // Negative for losing by coral area control
    },
    stalemate: {
        points: 0, // Usually 0 or small negative
    },
};

/**
 * Alpha-beta search parameters for different difficulty levels
 * Higher depth = stronger play but slower computation
 */
const SEARCH_DEPTH = {
    random: 0, // No search, just random moves
    easy: 4, // Allow up to 4 plies (will typically reach 2-3 in 5s) - reduced for faster moves
    medium: 6, // Allow up to 6 plies (will typically reach 3-4 in 10s) - reduced for faster moves
    hard: 8, // Allow up to 8 plies (will typically reach 4-5 in 15s) - reduced for faster moves
};

/**
 * Aspiration window settings for alpha-beta search
 * Uses a narrower search window around the expected score for better pruning
 * If search fails (score outside window), re-searches with full window
 */
const ASPIRATION_WINDOW = {
    initial: 50, // Initial window size (centered around expected score)
    // Window is expanded if search fails (score <= alpha or >= beta)
};

/**
 * Time control settings for AI moves
 * Maximum time (in milliseconds) the AI can spend thinking before making a move
 * Different difficulties get different time limits - easier modes think faster
 */
const TIME_CONTROL = {
    easy: {
        maxTimeMs: 5000, // 5 seconds - fast enough for good moves, keeps UX responsive
        minTimeMs: 100,
        progressIntervalMs: 200,
    },
    medium: {
        maxTimeMs: 10000, // 10 seconds - balanced between strength and speed
        minTimeMs: 100,
        progressIntervalMs: 200,
    },
    hard: {
        maxTimeMs: 15000, // 15 seconds - stronger play while still being responsive
        minTimeMs: 100,
        progressIntervalMs: 200,
    },
    // Legacy default for backwards compatibility
    maxTimeMs: 5000,
    minTimeMs: 100,
    progressIntervalMs: 200,
};

/**
 * Penalties for undesirable moves
 * These help prevent repetitive or poor play patterns
 */
const MOVE_PENALTIES = {
    reversingMove: -200, // Strong penalty for moving a piece back to where it just came from
};

/**
 * Softmax selection parameters
 * Controls how the AI selects between top moves
 */
const SOFTMAX_SELECTION = {
    enabled: false,
    temperature: {
        easy: 40,    // Higher temperature = more randomness
        medium: 25,  // Moderate temperature
        hard: 10,    // Low temperature = mostly best move
    },
    // Only consider moves within this score difference of the best move
    scoreWindow: 200, // 2 pawns/crabs worth
};

/**
 * Get time control settings for a specific difficulty level
 * @param difficulty - Difficulty level ('easy', 'medium', 'hard')
 * @returns Time control object with maxTimeMs, minTimeMs, and progressIntervalMs
 */
export function getTimeControlForDifficulty(difficulty: 'easy' | 'medium' | 'hard'): {
    maxTimeMs: number;
    minTimeMs: number;
    progressIntervalMs: number;
} {
    // Different time controls per difficulty
    // Easier difficulties can use less time, harder difficulties use more time
    return TIME_CONTROL[difficulty];
}

/**
 * Calculate optimal move time based on difficulty and remaining game clock
 * @param difficulty - Difficulty level
 * @param timeRemainingMs - Remaining game time in milliseconds (optional)
 * @returns Max time to spend on this move in milliseconds
 */
export function calculateOptimalMoveTime(
    difficulty: 'easy' | 'medium' | 'hard',
    timeRemainingMs?: number,
): number {
    const baseControl = getTimeControlForDifficulty(difficulty);

    // If no time remaining specified (unlimited time game), use default max time
    if (timeRemainingMs === undefined || timeRemainingMs === null || !Number.isFinite(timeRemainingMs)) {
        return baseControl.maxTimeMs;
    }

    // In time controlled games, manage time carefully
    // Target spending about 1/20th of remaining time, but cap at the difficulty's max time
    // This allows faster play in blitz while still thinking deep when time permits
    const timeSlice = Math.floor(timeRemainingMs / 20);

    // Ensure we don't return less than minTimeMs (unless we really have no time left)
    const minTime = Math.min(baseControl.minTimeMs, timeRemainingMs);

    // Dynamic max time: lesser of (1/20th of remaining) and (difficulty max limit)
    // But at least minTime
    let dynamicMaxTime = Math.min(timeSlice, baseControl.maxTimeMs);
    dynamicMaxTime = Math.max(dynamicMaxTime, minTime);

    // Hard safety cap: never try to use more time than we actually have
    // Leave a small buffer (50ms) to account for network/processing overhead
    return Math.min(dynamicMaxTime, Math.max(0, timeRemainingMs - 50));
}

/**
 * Helper function to get piece value
 * @param pieceSymbol - Piece symbol (h, d, t, f, o, c)
 * @param role - Piece role ('hunter', 'gatherer', or null for whale)
 * @returns Piece value
 */
export function getPieceValue(
    pieceSymbol: PieceSymbol,
    role: PieceRole | null | undefined,
): number {
    const pieceKey = pieceSymbol.toLowerCase() as PieceSymbol;

    if (pieceKey === 'h') {
        return PIECE_VALUES.whale.value;
    }

    const pieceMap: Record<string, 'dolphin' | 'turtle' | 'pufferfish' | 'octopus' | 'crab'> = {
        d: 'dolphin',
        t: 'turtle',
        f: 'pufferfish',
        o: 'octopus',
        c: 'crab',
    };

    const pieceName = pieceMap[pieceKey];
    if (!pieceName) {
        return 0;
    }

    // TypeScript knows pieceName is not 'whale' at this point, so we can safely access gatherer/hunter
    const pieceValue = PIECE_VALUES[pieceName] as { gatherer: number; hunter: number };

    if (role === 'gatherer') {
        return pieceValue.gatherer;
    } else if (role === 'hunter') {
        return pieceValue.hunter;
    }

    // Default to hunter if role not specified
    return pieceValue.hunter;
}

export {
    ASPIRATION_WINDOW,
    CORAL_EVALUATION,
    GAME_ENDING,
    MOBILITY,
    MOVE_PENALTIES,
    PIECE_SAFETY,
    PIECE_VALUES,
    POSITIONAL_BONUSES,
    SEARCH_DEPTH,
    SOFTMAX_SELECTION,
    TACTICAL_BONUSES,
    TIME_CONTROL,
    WHALE_SAFETY
};

