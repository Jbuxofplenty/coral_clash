/**
 * AI Evaluation and Search Functions for Coral Clash
 *
 * Implements evaluation function and alpha-beta pruning for computer opponent
 * This module is part of the shared game engine package and can be used
 * both client-side (for offline AI) and server-side (for online games)
 */

import {
    ASPIRATION_WINDOW,
    CORAL_EVALUATION,
    GAME_ENDING,
    MOBILITY,
    MOVE_PENALTIES,
    PIECE_SAFETY,
    POSITIONAL_BONUSES,
    TIME_CONTROL,
    WHALE_SAFETY,
    getPieceValue,
} from './aiConfig.js';
import type { Color, PieceRole, PieceSymbol, Square } from './coralClash.js';
import { CoralClash, SQUARES } from './coralClash.js';
import type { EvaluationTable } from './evaluationTable.js';
import { createGameSnapshot, restoreGameFromSnapshot } from './gameState.js';

/**
 * Zobrist hash keys for position hashing
 * Pre-generated random numbers for each piece/square/color/role combination
 */
class ZobristKeys {
    // Piece keys: [pieceType][square][color][role]
    // pieceType: 'h' (whale), 'd' (dolphin), 't' (turtle), 'f' (pufferfish), 'o' (octopus), 'c' (crab)
    // square: 0-63 (64 squares)
    // color: 0=white, 1=black
    // role: 0=none (whale), 1=hunter, 2=gatherer
    private pieceKeys: Record<string, number[][][]> = {};

    // Coral keys: [square][color]
    // square: 0-63
    // color: 0=white, 1=black, 2=no coral
    private coralKeys: number[][] = [];

    // Turn key: 0=white, 1=black
    private turnKey: number[] = [];

    constructor() {
        this.initializeKeys();
    }

    /**
     * Generate a deterministic pseudo-random 32-bit integer using a seeded RNG
     * This ensures consistent hashing across different runs
     */
    private seed = 123456789; // Fixed seed for deterministic keys

    private randomKey(): number {
        // Simple LCG (Linear Congruential Generator) for deterministic randomness
        // Formula: (a * seed + c) mod m
        // Using constants from Numerical Recipes
        this.seed = (this.seed * 1664525 + 1013904223) >>> 0; // >>> 0 ensures unsigned 32-bit
        // Use 31 bits to stay within JavaScript's safe integer range
        return this.seed & 0x7fffffff;
    }

    /**
     * Initialize all Zobrist keys
     */
    private initializeKeys(): void {
        const pieceTypes: PieceSymbol[] = ['h', 'd', 't', 'f', 'o', 'c'];
        const colors: Color[] = ['w', 'b'];
        const roles: (PieceRole | null)[] = [null, 'hunter', 'gatherer'];

        // Initialize piece keys
        for (const piece of pieceTypes) {
            this.pieceKeys[piece] = [];
            for (let square = 0; square < 64; square++) {
                this.pieceKeys[piece][square] = [];
                for (let colorIdx = 0; colorIdx < colors.length; colorIdx++) {
                    this.pieceKeys[piece][square][colorIdx] = [];
                    for (let roleIdx = 0; roleIdx < roles.length; roleIdx++) {
                        const key = this.randomKey();
                        this.pieceKeys[piece][square][colorIdx][roleIdx] = key;
                    }
                }
            }
        }

        // Initialize coral keys (64 squares, 3 states: white, black, none)
        for (let square = 0; square < 64; square++) {
            this.coralKeys[square] = [];
            for (let coralState = 0; coralState < 3; coralState++) {
                this.coralKeys[square][coralState] = this.randomKey();
            }
        }

        // Initialize turn key
        this.turnKey[0] = this.randomKey(); // White to move
        this.turnKey[1] = this.randomKey(); // Black to move
    }

    /**
     * Get piece key for a piece at a square
     */
    getPieceKey(piece: PieceSymbol, square: number, color: Color, role: PieceRole | null): number {
        const colorIdx = color === 'w' ? 0 : 1;
        const roleIdx = role === null ? 0 : role === 'hunter' ? 1 : 2;
        const pieceKeyArray = this.pieceKeys[piece];
        if (!pieceKeyArray || !pieceKeyArray[square] || !pieceKeyArray[square][colorIdx]) {
            return 0; // Fallback if key not found
        }
        return pieceKeyArray[square][colorIdx][roleIdx] || 0;
    }

    /**
     * Get coral key for a square
     */
    getCoralKey(square: number, coralColor: Color | null): number {
        const coralState = coralColor === 'w' ? 0 : coralColor === 'b' ? 1 : 2;
        if (!this.coralKeys[square]) {
            return 0; // Fallback if key not found
        }
        return this.coralKeys[square][coralState] || 0;
    }

    /**
     * Get turn key
     */
    getTurnKey(color: Color): number {
        return this.turnKey[color === 'w' ? 0 : 1];
    }
}

// Singleton instance of Zobrist keys (generated once)
const zobristKeys = new ZobristKeys();

/**
 * Convert square notation (e.g., 'e4') to index (0-63)
 */
function squareToIndex(square: Square): number {
    return SQUARES.indexOf(square);
}

/**
 * Game state snapshot type (matches what createGameSnapshot returns)
 */
export interface GameStateSnapshot {
    fen: string;
    turn: Color;
    whalePositions: { w: string[] | null; b: string[] | null };
    coral?: { square: string; color: string }[];
    coralRemaining?: { w: number; b: number };
    pieceRoles?: { [square: string]: 'hunter' | 'gatherer' };
    pgn?: string;
    isCheck: boolean;
    isCheckmate: boolean;
    isGameOver: boolean;
    isCoralVictory: false | Color | null;
    isDraw: boolean;
    resigned?: Color | null;
}

/**
 * Time control object for limiting search time
 */
export interface TimeControl {
    startTime: number;
    maxTimeMs: number;
}

/**
 * Result from alpha-beta search
 */
export interface AlphaBetaResult {
    score: number;
    move: any | null;
    nodesEvaluated: number;
    timedOut: boolean;
}

/**
 * Last move information for detecting reversing moves
 * Represents the player's own previous move (same color as the player making the move)
 */
export interface LastMoveInfo {
    from: string;
    to: string;
    piece: string;
    color?: Color; // Optional: color of the piece that moved (for verification)
}

/**
 * Bound type for transposition table entries
 * EXACT: exact score (within alpha-beta window)
 * LOWER_BOUND: score is at least this value (beta cutoff)
 * UPPER_BOUND: score is at most this value (alpha cutoff)
 */
export enum BoundType {
    EXACT = 0,
    LOWER_BOUND = 1,
    UPPER_BOUND = 2,
}

/**
 * Transposition table entry
 */
export interface TranspositionEntry {
    key: number;
    depth: number;
    score: number;
    bound: BoundType;
    bestMove: any | null;
}

/**
 * Transposition table for caching position evaluations
 * Uses Zobrist hash keys (numbers) for fast lookups
 */
export class TranspositionTable {
    private table: Map<number, TranspositionEntry> = new Map();
    private maxSize: number;

    constructor(maxSize: number = 100000) {
        this.maxSize = maxSize;
    }

    /**
     * Get entry from transposition table
     */
    get(key: number): TranspositionEntry | null {
        return this.table.get(key) || null;
    }

    /**
     * Store entry in transposition table
     */
    put(key: number, depth: number, score: number, bound: BoundType, bestMove: any | null): void {
        // If table is full, remove oldest entries (simple strategy: clear if over limit)
        if (this.table.size >= this.maxSize) {
            // Remove 25% of entries to make room (simple clearing strategy)
            const entriesToRemove = Math.floor(this.maxSize * 0.25);
            let removed = 0;
            for (const k of this.table.keys()) {
                if (removed >= entriesToRemove) break;
                this.table.delete(k);
                removed++;
            }
        }

        // Store or update entry (always replace if depth is greater or equal)
        const existing = this.table.get(key);
        if (!existing || depth >= existing.depth) {
            this.table.set(key, { key, depth, score, bound, bestMove });
        }
    }

    /**
     * Clear the transposition table
     */
    clear(): void {
        this.table.clear();
    }

    /**
     * Get current size of table
     */
    size(): number {
        return this.table.size;
    }
}

/**
 * Compute Zobrist hash for a game position
 * Uses XOR of all piece keys, coral keys, and turn key
 * @param gameState - Current game state snapshot
 * @returns Zobrist hash (number)
 */
function computeZobristHash(gameState: GameStateSnapshot): number {
    // Restore game to get board state
    const game = safeRestoreGame(gameState);
    if (!game) {
        // Fallback to string hash if game restore fails
        return hashString(generatePositionKeyString(gameState));
    }

    let hash = 0;

    // Hash all pieces on the board
    const board = game.board();
    for (let rankIdx = 0; rankIdx < board.length; rankIdx++) {
        const row = board[rankIdx];
        if (!row) continue;

        for (let fileIdx = 0; fileIdx < row.length; fileIdx++) {
            const cell = row[fileIdx];
            if (!cell || !cell.square) continue;

            const squareIdx = squareToIndex(cell.square as Square);
            if (squareIdx === -1) continue;

            const piece = cell.type as PieceSymbol;
            const color = cell.color as Color;
            const role = (cell.role as PieceRole | null) || null;

            // XOR in piece key
            hash ^= zobristKeys.getPieceKey(piece, squareIdx, color, role);
        }
    }

    // Hash coral state
    if (gameState.coral && Array.isArray(gameState.coral)) {
        // Initialize all squares to "no coral"
        const coralMap = new Map<number, Color | null>();
        for (let i = 0; i < 64; i++) {
            coralMap.set(i, null);
        }

        // Set coral from gameState
        for (const coral of gameState.coral) {
            const squareIdx = squareToIndex(coral.square as Square);
            if (squareIdx !== -1) {
                coralMap.set(squareIdx, coral.color as Color);
            }
        }

        // Hash coral for all squares
        for (let i = 0; i < 64; i++) {
            const coralColor = coralMap.get(i) || null;
            hash ^= zobristKeys.getCoralKey(i, coralColor);
        }
    } else {
        // No coral data - hash all squares as "no coral"
        for (let i = 0; i < 64; i++) {
            hash ^= zobristKeys.getCoralKey(i, null);
        }
    }

    // Hash turn to move
    const turn = gameState.turn || 'w';
    hash ^= zobristKeys.getTurnKey(turn as Color);

    return hash;
}

/**
 * Fallback: Generate position key as string (for error cases)
 * @param gameState - Current game state snapshot
 * @returns Position key string
 */
function generatePositionKeyString(gameState: GameStateSnapshot): string {
    // Use FEN as base (includes board position and turn)
    let key = gameState.fen || '';

    // Add coral state if available (important for Coral Clash)
    if (gameState.coral && Array.isArray(gameState.coral)) {
        // Sort coral by square for consistent ordering
        const sortedCoral = [...gameState.coral].sort((a, b) => {
            if (a.square < b.square) return -1;
            if (a.square > b.square) return 1;
            return 0;
        });
        const coralStr = sortedCoral.map((c) => `${c.square}:${c.color}`).join(',');
        key += `|coral:${coralStr}`;
    }

    // Add piece roles if available (affects move generation)
    if (gameState.pieceRoles && typeof gameState.pieceRoles === 'object') {
        const roleEntries = Object.entries(gameState.pieceRoles).sort(([a], [b]) => {
            if (a < b) return -1;
            if (a > b) return 1;
            return 0;
        });
        const rolesStr = roleEntries.map(([sq, role]) => `${sq}:${role}`).join(',');
        key += `|roles:${rolesStr}`;
    }

    return key;
}

/**
 * Simple string hash function (fallback)
 */
function hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
}

/**
 * Generate a position key for transposition table lookup
 * Uses Zobrist hashing for fast computation
 * @param gameState - Current game state snapshot
 * @returns Position key (number)
 */
export function generatePositionKey(gameState: GameStateSnapshot): number {
    return computeZobristHash(gameState);
}

/**
 * Safely restore game from snapshot with backwards compatibility
 * Returns null if restore fails (e.g., old format), ensuring fallback to random moves
 */
function safeRestoreGame(gameState: GameStateSnapshot): CoralClash | null {
    if (!gameState || !gameState.fen || typeof gameState.fen !== 'string') {
        return null;
    }

    try {
        const game = new CoralClash();
        restoreGameFromSnapshot(game, gameState);
        return game;
    } catch {
        // Old format or invalid state - return null for fallback to random
        return null;
    }
}

/**
 * Result from iterative deepening search
 */
export interface IterativeDeepeningResult {
    move: any;
    score: number;
    nodesEvaluated: number;
    depth: number;
    elapsedMs: number;
}

/**
 * Piece information for evaluation
 */
interface PieceInfo {
    square: Square;
    piece: PieceSymbol;
    role: PieceRole | null;
}

/**
 * Convert square to rank/file for evaluation
 * @param square - Square notation (e.g., 'e4')
 * @returns { rank: number, file: string }
 */
function squareToRankFile(square: Square): { rank: number; file: string } {
    const file = square[0];
    const rank = parseInt(square[1], 10);
    return { rank, file };
}

/**
 * Check if square is in center (d4, d5, e4, e5)
 * @param square - Square notation
 * @returns boolean
 */
function isCenterSquare(square: Square): boolean {
    return (POSITIONAL_BONUSES.centerSquares.squares as readonly Square[]).includes(square);
}

/**
 * Check if square is in extended center
 * @param square - Square notation
 * @returns boolean
 */
function isExtendedCenter(square: Square): boolean {
    const { rank, file } = squareToRankFile(square);
    return (
        (POSITIONAL_BONUSES.extendedCenter.ranks as readonly number[]).includes(rank) &&
        (POSITIONAL_BONUSES.extendedCenter.files as readonly string[]).includes(file)
    );
}

/**
 * Check if piece is in opponent's half
 * @param square - Square notation
 * @param color - Piece color ('w' or 'b')
 * @returns boolean
 */
function isInOpponentHalf(square: Square, color: Color): boolean {
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
 * @param square1 - First square
 * @param square2 - Second square
 * @returns Distance
 */
function manhattanDistance(square1: Square, square2: Square): number {
    const { rank: r1, file: f1 } = squareToRankFile(square1);
    const { rank: r2, file: f2 } = squareToRankFile(square2);
    const file1 = f1.charCodeAt(0) - 'a'.charCodeAt(0) + 1;
    const file2 = f2.charCodeAt(0) - 'a'.charCodeAt(0) + 1;
    return Math.abs(r1 - r2) + Math.abs(file1 - file2);
}

/**
 * Check if piece is near opponent whale
 * @param square - Piece square
 * @param opponentWhaleSquares - Opponent whale positions (2 squares)
 * @returns boolean
 */
function isNearOpponentWhale(square: Square, opponentWhaleSquares: string[] | null): boolean {
    if (!opponentWhaleSquares || opponentWhaleSquares.length === 0) return false;
    return opponentWhaleSquares.some((whaleSquare) => {
        const distance = manhattanDistance(square, whaleSquare as Square);
        return distance <= 2; // Within 2 squares
    });
}

/**
 * Check if a move reverses the player's own previous move (moving a piece back to where it just came from)
 * This prevents the AI from oscillating pieces back and forth between two squares
 * @param move - Current move candidate (must be from the same player as lastMove)
 * @param lastMove - Player's own previous move (null if no previous move)
 * @returns boolean indicating if this is a reversing move
 */
export function isReversingMove(move: any, lastMove: LastMoveInfo | null): boolean {
    if (!lastMove) {
        return false;
    }

    // Check if this move moves the same piece from the last move's destination back to its origin
    // This happens when: currentMove.from === lastMove.to && currentMove.to === lastMove.from && currentMove.piece === lastMove.piece
    const squaresMatch = move.from === lastMove.to && move.to === lastMove.from;

    const pieceTypesMatch = move.piece?.toLowerCase() === lastMove.piece?.toLowerCase();

    // If color is provided in both, verify they match (same player's piece)
    const colorsMatch = !move.color || !lastMove.color || move.color === lastMove.color;

    return squaresMatch && pieceTypesMatch && colorsMatch;
}

/**
 * Calculate defensive bonus for a move that protects threatened pieces
 * This is calculated BEFORE making the move by simulating it on a copy of the game
 * @param gameState - Current game state (before the move)
 * @param move - Move to evaluate
 * @param playerColor - Color of the player making the move
 * @param threatenedPieces - Array of pieces that are currently threatened
 * @returns Defensive bonus score (positive value)
 */
function calculateDefensiveBonus(
    gameState: GameStateSnapshot,
    move: any,
    playerColor: Color,
    threatenedPieces: Array<{
        square: Square;
        piece: PieceSymbol;
        role: PieceRole | null;
        value: number;
    }>,
): number {
    if (threatenedPieces.length === 0) {
        return 0;
    }

    // Simulate the move on a copy of the game to check if it protects threatened pieces
    const testGame = safeRestoreGame(gameState);
    if (!testGame) {
        return 0;
    }

    // Make the move on the test game
    let moveResult;
    try {
        moveResult = testGame.move({
            from: move.from,
            to: move.to,
            promotion: move.promotion,
            coralPlaced: move.coralPlaced,
            coralRemoved: move.coralRemoved,
            coralRemovedSquares: move.coralRemovedSquares,
        });
    } catch {
        return 0; // Invalid move - no defensive bonus
    }

    if (!moveResult) {
        return 0; // Move failed - no defensive bonus
    }

    const opponentColor: Color = playerColor === 'w' ? 'b' : 'w';
    let totalDefenseBonus = 0;

    // Check each threatened piece to see if this move protects it
    for (const { square, piece, role, value } of threatenedPieces) {
        let protectsPiece = false;

        // Case 1: Move moves the threatened piece away
        if (move.from === square) {
            // Check if destination is safe (not threatened)
            const destinationThreatened = testGame.isAttacked(move.to, opponentColor);

            if (!destinationThreatened) {
                // Destination is safe - this is protective
                // But check if it's a bad trade (capturing less valuable piece)
                if (move.captured) {
                    const capturedValue = getPieceValue(
                        move.captured,
                        (move as any).capturedRole || null,
                    );

                    // Check if it's an equal trade (same piece type and role)
                    const isEqualTrade =
                        move.captured.toLowerCase() === piece.toLowerCase() &&
                        ((move as any).capturedRole || null) === role;

                    if (isEqualTrade) {
                        // Equal trade is fine - consider it protective
                        // Equal trades are acceptable and may even be good if we have material/coral advantage
                        protectsPiece = true;
                    } else if (value > capturedValue * 2) {
                        // Bad trade (trading valuable piece for much less valuable piece)
                        // This prevents moves like dolphin->crab from getting defensive bonus
                        protectsPiece = false;
                    } else {
                        // Acceptable trade (similar value or slightly worse)
                        protectsPiece = true;
                    }
                } else {
                    // Not a capture and destination is safe - definitely protective
                    protectsPiece = true;
                }
            }
            // If destination is threatened, don't consider it protective (even for critical pieces)
            // Moving to a threatened square doesn't protect the piece
        }

        // Case 2: Move defends the threatened piece (adds a defender)
        // Only check if we're not moving the piece itself (already handled in Case 1)
        if (!protectsPiece && move.from !== square) {
            // Check if the piece is still at the same square (not moved)
            const pieceAtSquare = testGame.get(square);
            if (pieceAtSquare !== false) {
                // Verify it's the same piece (same color, type, role)
                const isSamePiece =
                    pieceAtSquare.color === playerColor &&
                    pieceAtSquare.type === piece &&
                    (pieceAtSquare.role || null) === role;

                if (isSamePiece) {
                    // Get original game state to compare defense status
                    const originalGame = safeRestoreGame(gameState);
                    if (originalGame) {
                        const wasDefended = originalGame.isAttacked(square, playerColor);
                        const isNowDefended = testGame.isAttacked(square, playerColor);
                        const stillThreatened = testGame.isAttacked(square, opponentColor);

                        // If piece is now defended and wasn't before, or if it's no longer threatened
                        // For critical pieces, also consider it protective if it's defended after the move
                        // (even if it was already defended before - adding more defense is still good)
                        if ((isNowDefended && !wasDefended) || !stillThreatened) {
                            protectsPiece = true;
                        } else if (value >= PIECE_SAFETY.criticalPieceThreshold && isNowDefended) {
                            // For critical pieces, if the piece is defended after the move, consider it protective
                            // This ensures moves that add defense are prioritized
                            protectsPiece = true;
                        }
                    }
                }
            }
        }

        if (protectsPiece) {
            // Calculate bonus based on how the piece is protected
            let defenseBonus = 0;

            // Case 1: Moving threatened piece to safety (highest priority)
            if (move.from === square) {
                // Moving a threatened piece to a safe square is CRITICAL
                // Give massive bonus to ensure these moves are always selected
                // This is especially important when a valuable piece is threatened by a less valuable piece
                defenseBonus = value * 5.0; // 500% of piece value for moving to safety

                // Extra massive bonus for critical pieces
                if (value >= PIECE_SAFETY.criticalPieceThreshold) {
                    defenseBonus = value * 10.0; // 1000% of piece value (18000 for dolphin gatherer)
                }

                // Check if it's an equal trade (same piece type and role)
                if (move.captured) {
                    const capturedValue = getPieceValue(
                        move.captured,
                        (move as any).capturedRole || null,
                    );
                    const isEqualTrade =
                        move.captured.toLowerCase() === piece.toLowerCase() &&
                        ((move as any).capturedRole || null) === role;

                    if (isEqualTrade) {
                        // Equal trade is acceptable - give full defensive bonus
                        // Check if we have material/coral advantage to potentially prioritize
                        const originalGame = safeRestoreGame(gameState);
                        if (originalGame) {
                            // Count pieces for both sides
                            const playerPieces = getPieces(originalGame, playerColor);
                            const opponentPieces = getPieces(originalGame, opponentColor);

                            // Count coral
                            const playerCoral = originalGame.getCoralAreaControl(playerColor);
                            const opponentCoral = originalGame.getCoralAreaControl(opponentColor);

                            // If we have more pieces AND/OR more coral, equal trades are good
                            if (
                                playerPieces.length > opponentPieces.length ||
                                playerCoral > opponentCoral
                            ) {
                                // We have advantage - equal trades are beneficial (simplifies position)
                                defenseBonus *= 1.2; // 20% extra bonus for equal trades when ahead
                            }
                            // Otherwise, equal trade is still fine (neutral)
                        }
                    } else if (value > capturedValue * 2) {
                        // Bad trade - reduce bonus significantly
                        defenseBonus *= 0.1; // Only 10% of normal bonus for bad trades
                    }
                } else {
                    // If it's a non-capture move to safety, give even more bonus
                    // (this is the ideal case - move to safety without trading)
                    defenseBonus *= 1.5; // 50% extra for non-capture moves to safety
                }
            } else {
                // Case 2: Adding a defender (lower priority than moving to safety)
                defenseBonus = value * 0.5; // 50% of piece value

                // Extra bonus for critical pieces
                if (value >= PIECE_SAFETY.criticalPieceThreshold) {
                    defenseBonus = value * 2.0; // 200% of piece value for critical pieces
                }
            }

            // Extra bonus if the piece was hanging (not defended) before the move
            const originalGame = safeRestoreGame(gameState);
            if (originalGame) {
                const wasDefended = originalGame.isAttacked(square, playerColor);
                if (!wasDefended) {
                    defenseBonus *= 1.5; // 50% extra bonus for saving hanging pieces
                }
            }

            // For critical pieces moving to safety, ensure minimum bonus to ALWAYS outweigh other considerations
            if (value >= PIECE_SAFETY.criticalPieceThreshold && move.from === square) {
                // Ensure minimum bonus of 50000 points for moving critical pieces to safety
                // This should ALWAYS be selected over any other move
                defenseBonus = Math.max(defenseBonus, 50000);
            } else if (value >= PIECE_SAFETY.criticalPieceThreshold) {
                // For defending critical pieces, ensure minimum bonus
                defenseBonus = Math.max(defenseBonus, 10000);
            }

            totalDefenseBonus += defenseBonus;

            // Only count the first protected piece to avoid double-counting
            break;
        }
    }

    return totalDefenseBonus;
}

/**
 * Get all pieces on the board with their positions
 * @param game - CoralClash instance
 * @param color - Color to evaluate ('w' or 'b')
 * @returns Array of { square: string, piece: string, role: string|null }
 */
function getPieces(game: CoralClash, color: Color): PieceInfo[] {
    const pieces: PieceInfo[] = [];
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
                    square: cell.square as Square,
                    piece: cell.type as PieceSymbol,
                    role: (cell.role as PieceRole | null) || null,
                });
            }
        }
    }

    return pieces;
}

/**
 * Evaluate a position from a player's perspective
 * Positive score is good for the player, negative is bad
 * @param gameState - Full game state snapshot
 * @param playerColor - Color to evaluate for ('w' or 'b')
 * @param evaluationTable - Optional pre-computed evaluation table for fast lookup
 * @returns Evaluation score
 */
export function evaluatePosition(
    gameState: GameStateSnapshot,
    playerColor: Color,
    _evaluationTable?: EvaluationTable | null, // Not used for scores anymore, kept for compatibility
): number {
    // Note: evaluationTable is no longer used for score caching
    // It's now used for move storage in findBestMoveIterativeDeepening

    const game = safeRestoreGame(gameState);
    if (!game) {
        return 0; // Neutral score for backwards compatibility
    }

    const opponentColor: Color = playerColor === 'w' ? 'b' : 'w';

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
    let playerWhaleAttacked = false;
    let playerWhaleDefended = false;
    if (playerWhaleSquares.length > 0) {
        // Check if any whale square is attacked by opponent
        for (const whaleSquare of playerWhaleSquares) {
            if (whaleSquare) {
                if (game.isAttacked(whaleSquare as Square, opponentColor)) {
                    // Check if it's actually check (not just attack) - need to see if it's legal
                    // For simplicity, if whale square is attacked and it's player's turn, consider it check
                    // This is an approximation - full check requires checking if escape is possible
                    if (currentTurn === playerColor) {
                        playerWhaleInCheck = true;
                    } else {
                        playerWhaleAttacked = true;
                    }
                }
                // Check if whale is defended
                if (game.isAttacked(whaleSquare as Square, playerColor)) {
                    playerWhaleDefended = true;
                }
            }
        }
    }

    if (playerWhaleInCheck) {
        score += WHALE_SAFETY.inCheck.penalty;
    } else if (playerWhaleAttacked) {
        score += WHALE_SAFETY.attacked.penalty;
    }

    // Whale defenders bonus (if not in check)
    if (!playerWhaleInCheck && playerWhaleDefended) {
        score += WHALE_SAFETY.defenders.points;
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
            if (whaleSquare && game.isAttacked(whaleSquare as Square, playerColor)) {
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

    // Piece safety evaluation - check if valuable pieces are under attack and defended
    // Skip whale (already handled above) and evaluate other pieces
    for (const { square, piece, role } of playerPieces) {
        // Skip whale - already evaluated
        if (piece.toLowerCase() === 'h') continue;

        const pieceValue = getPieceValue(piece, role);
        const isAttacked = game.isAttacked(square, opponentColor);
        const isDefended = game.isAttacked(square, playerColor); // Check if friendly pieces can defend

        if (isAttacked) {
            // Piece is under attack - penalize based on value
            // More valuable pieces get larger penalties
            if (isDefended) {
                // Piece is attacked but defended - moderate penalty
                // Defenders can recapture, so not as dangerous
                const penalty = pieceValue * PIECE_SAFETY.attackedMultiplier;
                score -= penalty;
                // Small bonus for having defenders (reduces net penalty)
                const defenseValue = pieceValue * PIECE_SAFETY.defendedBonus;
                score += defenseValue;
            } else {
                // Piece is hanging (attacked but NOT defended) - MUCH larger penalty
                // This is very dangerous - opponent can capture for free
                let penalty = pieceValue * PIECE_SAFETY.hangingMultiplier;

                // Extra severe penalty for critical pieces (like dolphin gatherer)
                // These are so valuable that hanging them should be essentially game-losing
                if (pieceValue >= PIECE_SAFETY.criticalPieceThreshold) {
                    penalty = pieceValue * PIECE_SAFETY.criticalHangingMultiplier;
                }

                // Add fixed penalty on top to ensure hanging pieces are NEVER selected
                // This compensates for search depth limitations and ensures safety
                const fixedPenalty = 500; // Fixed penalty to make hanging pieces always bad
                penalty += fixedPenalty;

                score -= penalty;
            }
        } else if (isDefended) {
            // Piece is not under attack but is defended - small bonus for safety
            // This encourages keeping pieces defended as a preventive measure
            const defenseValue = pieceValue * PIECE_SAFETY.defendedBonus * 0.5; // Smaller bonus when not attacked
            score += defenseValue;
        }
    }

    // Opponent piece safety (reverse) - reward when opponent's valuable pieces are under attack
    for (const { square, piece, role } of opponentPieces) {
        // Skip whale - already evaluated
        if (piece.toLowerCase() === 'h') continue;

        const pieceValue = getPieceValue(piece, role);
        const isAttacked = game.isAttacked(square, playerColor);

        if (isAttacked) {
            // Opponent's piece is under attack - bonus for us
            const bonus = pieceValue * PIECE_SAFETY.attackedMultiplier;
            score += bonus;
        }
    }

    // Coral area control evaluation
    const playerCoralControl = game.getCoralAreaControl(playerColor);
    const opponentCoralControl = game.getCoralAreaControl(opponentColor);

    score += playerCoralControl * CORAL_EVALUATION.areaControl.points;
    score -= opponentCoralControl * CORAL_EVALUATION.areaControl.points;

    // Positional evaluation
    const opponentWhalePositions = game.whalePositions()[opponentColor] || [];

    for (const { square, role } of playerPieces) {
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
 * Alpha-beta pruning search algorithm with time control and transposition tables
 * @param gameState - Current game state
 * @param depth - Search depth (plies)
 * @param alpha - Best value for maximizing player
 * @param beta - Best value for minimizing player
 * @param maximizingPlayer - True if maximizing player's turn
 * @param playerColor - Color we're playing for ('w' or 'b')
 * @param timeControl - Time control object with startTime and maxTimeMs
 * @param lastMove - Last move made (for detecting reversing moves, only applies at root level)
 * @param transpositionTable - Optional transposition table for caching position evaluations
 * @param evaluationTable - Optional pre-computed evaluation table for fast position lookup
 * @param isRootLevel - Track if we're at root level
 * @returns { score: number, move: Object|null, nodesEvaluated: number, timedOut: boolean }
 */
export function alphaBeta(
    gameState: GameStateSnapshot,
    depth: number,
    alpha: number,
    beta: number,
    maximizingPlayer: boolean,
    playerColor: Color,
    timeControl: TimeControl | null = null,
    lastMove: LastMoveInfo | null = null,
    transpositionTable: TranspositionTable | null = null,
    evaluationTable: EvaluationTable | null = null,
    isRootLevel: boolean = false, // Track if we're at root level
    rootGameState: GameStateSnapshot | null = null, // Original root game state for defensive bonus checks
): AlphaBetaResult {
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

    // Generate position key for transposition table lookup
    const positionKey = generatePositionKey(gameState);
    let originalAlpha = alpha;
    let originalBeta = beta;

    // Check transposition table if available
    if (transpositionTable) {
        const entry = transpositionTable.get(positionKey);
        if (entry && entry.depth >= depth) {
            // We have a cached result at sufficient depth
            let score = entry.score;

            // Adjust score based on bound type and current alpha-beta window
            if (entry.bound === BoundType.EXACT) {
                // Exact score - can use directly
                return {
                    score,
                    move: entry.bestMove,
                    nodesEvaluated: 1, // Cached, so minimal node evaluation
                    timedOut: false,
                };
            } else if (entry.bound === BoundType.LOWER_BOUND) {
                // Lower bound (beta cutoff occurred) - actual score is >= this value
                // If lower bound >= beta, we can beta-cutoff
                if (score >= beta) {
                    return {
                        score: score, // Return lower bound (beta cutoff)
                        move: entry.bestMove,
                        nodesEvaluated: 1,
                        timedOut: false,
                    };
                }
                // If lower bound > alpha, we can raise alpha
                if (score > alpha) {
                    alpha = score;
                }
            } else if (entry.bound === BoundType.UPPER_BOUND) {
                // Upper bound (alpha cutoff occurred) - actual score is <= this value
                // If upper bound <= alpha, we can alpha-cutoff
                if (score <= alpha) {
                    return {
                        score: score, // Return upper bound (alpha cutoff)
                        move: entry.bestMove,
                        nodesEvaluated: 1,
                        timedOut: false,
                    };
                }
                // If upper bound < beta, we can lower beta
                if (score < beta) {
                    beta = score;
                }
            }
        }
    }

    const game = safeRestoreGame(gameState);
    if (!game) {
        return {
            score: 0,
            move: null,
            nodesEvaluated: 1,
            timedOut: false,
        };
    }

    // Terminal node: check game-ending conditions or depth limit
    if (depth === 0 || game.isGameOver()) {
        // Quiescence search: if depth is 0 and there are captures, continue searching
        // This extends the search on tactical sequences (captures) to avoid horizon effect
        if (depth === 0 && !game.isGameOver()) {
            const allMoves = game.moves({ verbose: true });
            const allCaptures = allMoves.filter((m) => m.captured);

            // Validate captures - only keep moves that can actually be executed
            const captures: any[] = [];
            for (const capture of allCaptures) {
                const validationGame = safeRestoreGame(gameState);
                if (validationGame) {
                    try {
                        const moveResult = validationGame.move({
                            from: capture.from,
                            to: capture.to,
                            promotion: capture.promotion,
                            coralPlaced: capture.coralPlaced,
                            coralRemoved: capture.coralRemoved,
                            coralRemovedSquares: capture.coralRemovedSquares,
                        });
                        if (moveResult) {
                            captures.push(capture);
                        }
                    } catch {
                        // Invalid move - skip it
                    }
                }
            }

            // Also check for hanging pieces - if opponent has a hanging piece, extend search to see capture
            const currentTurn = game.turn();
            const opponentColor: Color = currentTurn === 'w' ? 'b' : 'w';
            let hasHangingPiece = false;

            // Check if opponent has any hanging pieces (attacked but not defended)
            const opponentPieces = getPieces(game, opponentColor);
            for (const { square, piece } of opponentPieces) {
                if (piece.toLowerCase() === 'h') continue; // Skip whale
                const isAttacked = game.isAttacked(square, currentTurn);
                const isDefended = game.isAttacked(square, opponentColor);
                if (isAttacked && !isDefended) {
                    hasHangingPiece = true;
                    break;
                }
            }

            // If there are captures OR hanging pieces, do quiescence search
            if (captures.length > 0 || hasHangingPiece) {
                // Quiescence search: only search captures, limited depth to avoid infinite loops
                const quiescenceDepth = 3; // Increased depth to see captures of hanging pieces
                let bestScore = evaluatePosition(gameState, playerColor, evaluationTable);
                const standPat = maximizingPlayer ? bestScore : -bestScore;
                let nodesEvaluated = 1; // Start with 1 for the evaluation

                // Update alpha/beta with stand-pat score
                if (maximizingPlayer) {
                    if (standPat >= beta)
                        return { score: standPat, move: null, nodesEvaluated: 1, timedOut: false };
                    alpha = Math.max(alpha, standPat);
                } else {
                    if (standPat <= alpha)
                        return { score: standPat, move: null, nodesEvaluated: 1, timedOut: false };
                    beta = Math.min(beta, standPat);
                }

                // Search only captures in quiescence
                for (const capture of captures) {
                    let moveResult;
                    try {
                        moveResult = game.move({
                            from: capture.from,
                            to: capture.to,
                            promotion: capture.promotion,
                            coralPlaced: capture.coralPlaced,
                            coralRemoved: capture.coralRemoved,
                            coralRemovedSquares: capture.coralRemovedSquares,
                        });
                    } catch {
                        // Invalid move - skip it (shouldn't happen since we validated moves, but handle gracefully)
                        continue;
                    }

                    if (!moveResult) continue;

                    const newGameState = createGameSnapshot(game);
                    const result = alphaBeta(
                        newGameState,
                        quiescenceDepth - 1,
                        alpha,
                        beta,
                        !maximizingPlayer,
                        playerColor,
                        timeControl,
                        null,
                        transpositionTable,
                        evaluationTable,
                        false, // Not root level in quiescence
                    );

                    game.undo();

                    nodesEvaluated += result.nodesEvaluated;

                    if (result.timedOut) {
                        return { score: standPat, move: null, nodesEvaluated, timedOut: true };
                    }

                    const captureScore = result.score;

                    if (maximizingPlayer) {
                        if (captureScore > bestScore) bestScore = captureScore;
                        alpha = Math.max(alpha, bestScore);
                        if (beta <= alpha) break;
                    } else {
                        if (captureScore < bestScore) bestScore = captureScore;
                        beta = Math.min(beta, bestScore);
                        if (beta <= alpha) break;
                    }
                }

                const finalScore = maximizingPlayer ? bestScore : -bestScore;
                if (transpositionTable) {
                    transpositionTable.put(positionKey, depth, finalScore, BoundType.EXACT, null);
                }
                return {
                    score: finalScore,
                    move: null,
                    nodesEvaluated,
                    timedOut: false,
                };
            }
        }

        // No captures or game over - evaluate position normally
        const score = evaluatePosition(gameState, playerColor, evaluationTable);
        // Flip score if we're evaluating from opponent's perspective
        const finalScore = maximizingPlayer ? score : -score;

        // Store terminal node in transposition table (always EXACT score)
        if (transpositionTable) {
            transpositionTable.put(positionKey, depth, finalScore, BoundType.EXACT, null);
        }

        return {
            score: finalScore,
            move: null,
            nodesEvaluated: 1,
            timedOut: false,
        };
    }

    const allMoves = game.moves({ verbose: true });

    // Filter out invalid moves - only keep moves that can actually be executed
    // This prevents errors during search when game.moves() returns moves that can't be executed
    const moves: any[] = [];
    for (const move of allMoves) {
        // Validate move by trying to execute it on a fresh game instance
        const validationGame = safeRestoreGame(gameState);
        if (validationGame) {
            try {
                const moveResult = validationGame.move({
                    from: move.from,
                    to: move.to,
                    promotion: move.promotion,
                    coralPlaced: move.coralPlaced,
                    coralRemoved: move.coralRemoved,
                    coralRemovedSquares: move.coralRemovedSquares,
                });
                if (moveResult) {
                    moves.push(move);
                }
            } catch {
                // Invalid move - skip it
                // Don't log here to avoid spam, as this should be rare
            }
        }
    }

    if (moves.length === 0) {
        // No legal moves - terminal state
        const score = evaluatePosition(gameState, playerColor, evaluationTable);
        const finalScore = maximizingPlayer ? score : -score;

        // Store terminal node in transposition table (always EXACT score)
        if (transpositionTable) {
            transpositionTable.put(positionKey, depth, finalScore, BoundType.EXACT, null);
        }

        return {
            score: finalScore,
            move: null,
            nodesEvaluated: 1,
            timedOut: false,
        };
    }

    let bestMove: any = null;
    let bestScore = maximizingPlayer ? -Infinity : Infinity;

    // Pre-compute threatened pieces for defensive bonus calculation
    // This is done once before the move loop to avoid repeated calculations
    const threatenedPieces: Array<{
        square: Square;
        piece: PieceSymbol;
        role: PieceRole | null;
        value: number;
    }> = [];

    // Compute threatened pieces whenever we're evaluating moves for the player
    // (when maximizingPlayer is true, it's the player's turn)
    // We compute this at all depths to ensure defensive moves are evaluated correctly
    if (maximizingPlayer) {
        const playerPieces = getPieces(game, playerColor);
        const opponentColor: Color = playerColor === 'w' ? 'b' : 'w';

        for (const { square, piece, role } of playerPieces) {
            if (piece.toLowerCase() === 'h') continue; // Skip whale (handled separately)

            const pieceValue = getPieceValue(piece, role);
            const isAttacked = game.isAttacked(square, opponentColor);
            const isDefended = game.isAttacked(square, playerColor);

            // Only consider pieces that are threatened but not defended (hanging or vulnerable)
            // Critical pieces (dolphin gatherer = 1800) should be protected even if defended
            if (isAttacked) {
                if (!isDefended || pieceValue >= PIECE_SAFETY.criticalPieceThreshold) {
                    threatenedPieces.push({ square, piece, role, value: pieceValue });
                }
            }
        }
    }

    // Sort moves for better pruning - prioritize captures and threatening moves
    // This helps alpha-beta pruning work more effectively
    // We check threats for first 20 non-capture moves to avoid O(n²) cost
    // This ensures threatening moves are prioritized even if they're not at the very beginning
    const MAX_THREAT_CHECK = 20;
    const threatScores = new Map<string, number>();
    if (isRootLevel && moves.length > 0) {
        // Check threats for first 20 non-capture moves
        const nonCaptureMoves = moves.filter((m) => !m.captured);
        const movesToCheck = nonCaptureMoves.slice(
            0,
            Math.min(MAX_THREAT_CHECK, nonCaptureMoves.length),
        );
        for (const move of movesToCheck) {
            const tempGame = safeRestoreGame(gameState);
            if (tempGame) {
                const moveResult = tempGame.move({
                    from: move.from,
                    to: move.to,
                    promotion: move.promotion,
                    coralPlaced: move.coralPlaced,
                    coralRemoved: move.coralRemoved,
                    coralRemovedSquares: move.coralRemovedSquares,
                });
                if (moveResult) {
                    const opponentColor = playerColor === 'w' ? 'b' : 'w';
                    const opponentPieces = getPieces(tempGame, opponentColor);
                    let maxThreatValue = 0;
                    for (const { square, piece, role } of opponentPieces) {
                        if (
                            piece.toLowerCase() !== 'h' &&
                            tempGame.isAttacked(square, playerColor)
                        ) {
                            const threatValue = getPieceValue(piece, role);
                            maxThreatValue = Math.max(maxThreatValue, threatValue);
                        }
                    }
                    threatScores.set(`${move.from}->${move.to}`, maxThreatValue);
                }
            }
        }
    }
    // Create a set of threatened squares for quick lookup
    const threatenedSquares = new Set(threatenedPieces.map((p) => p.square));

    const sortedMoves = [...moves].sort((a, b) => {
        // HIGHEST PRIORITY: Moves FROM threatened squares (must move valuable pieces to safety)
        const aFromThreatened = threatenedSquares.has(a.from);
        const bFromThreatened = threatenedSquares.has(b.from);
        if (aFromThreatened && !bFromThreatened) return -1;
        if (!aFromThreatened && bFromThreatened) return 1;

        // If both are from threatened squares, prioritize moves to safe squares
        if (aFromThreatened && bFromThreatened) {
            // Check if destinations are safe (not threatened by opponent)
            const opponentColor: Color = playerColor === 'w' ? 'b' : 'w';
            const aDestSafe = !game.isAttacked(a.to, opponentColor);
            const bDestSafe = !game.isAttacked(b.to, opponentColor);
            if (aDestSafe && !bDestSafe) return -1;
            if (!aDestSafe && bDestSafe) return 1;
        }

        // SECOND PRIORITY: Prioritize captures (especially of valuable pieces)
        if (a.captured && !b.captured) return -1;
        if (!a.captured && b.captured) return 1;
        if (a.captured && b.captured) {
            // Both are captures - prioritize capturing more valuable pieces
            // Note: capturedRole might not be available in Move type, use null as fallback
            const aValue = getPieceValue(a.captured, (a as any).capturedRole || null);
            const bValue = getPieceValue(b.captured, (b as any).capturedRole || null);
            return bValue - aValue; // Higher value first
        }
        // For non-captures, prioritize moves that threaten opponent pieces
        // Moves that threaten valuable pieces should be evaluated first
        const aThreat = threatScores.get(`${a.from}->${a.to}`) || 0;
        const bThreat = threatScores.get(`${b.from}->${b.to}`) || 0;
        if (aThreat > bThreat) return -1;
        if (aThreat < bThreat) return 1;

        // If both threaten equally, prioritize moves from pieces that are less valuable
        // (e.g., crab threatening dolphin is better than dolphin threatening dolphin)
        // This rewards good trade opportunities
        if (aThreat > 0 && bThreat > 0) {
            const aPiece = game.get(a.from);
            const bPiece = game.get(b.from);
            if (aPiece !== false && bPiece !== false) {
                const aValue = getPieceValue(aPiece.type, aPiece.role);
                const bValue = getPieceValue(bPiece.type, bPiece.role);
                // Lower value piece threatening is better (good trade opportunity)
                if (aValue < bValue) return -1;
                if (aValue > bValue) return 1;
            }
        }

        return 0;
    });
    for (const move of sortedMoves) {
        // Get capturing piece info BEFORE making the move (for bad trade detection)
        const capturingPiece = game.get(move.from);
        let capturingValue = 0;
        if (capturingPiece !== false) {
            capturingValue = getPieceValue(capturingPiece.type, capturingPiece.role);
        }

        // Calculate defensive bonus BEFORE making the move
        // This ensures we evaluate defensive moves correctly using the current game state
        let defensiveBonus = 0;
        if (threatenedPieces.length > 0 && maximizingPlayer) {
            defensiveBonus = calculateDefensiveBonus(
                gameState,
                move,
                playerColor,
                threatenedPieces,
            );
            if (isRootLevel && defensiveBonus > 0) {
                console.log(
                    `[DEBUG] Defensive bonus calculated for move ${move.from}->${move.to}: ${defensiveBonus.toFixed(0)} points`,
                );
            }
        } else if (isRootLevel && threatenedPieces.length > 0) {
            console.log(
                `[DEBUG] Skipping defensive bonus: maximizingPlayer=${maximizingPlayer}, threatenedPieces=${threatenedPieces.length}`,
            );
        } else if (isRootLevel && maximizingPlayer && threatenedPieces.length === 0) {
            // Check if there should be threatened pieces but they weren't found
            const playerPieces = getPieces(game, playerColor);
            const opponentColor: Color = playerColor === 'w' ? 'b' : 'w';
            const threatenedCount = playerPieces.filter((p) => {
                if (p.piece.toLowerCase() === 'h') return false;
                return game.isAttacked(p.square, opponentColor);
            }).length;
            if (threatenedCount > 0) {
                console.log(
                    `[DEBUG] WARNING: Found ${threatenedCount} threatened pieces but threatenedPieces array is empty!`,
                );
            }
        }

        // CRITICAL: Check if destination is threatened BEFORE making the move
        // This prevents moving valuable pieces to threatened squares
        const opponentColor = playerColor === 'w' ? 'b' : 'w';
        const destinationThreatenedBeforeMove = game.isAttacked(move.to, opponentColor);
        let movingToThreatenedSquare = false;
        if (destinationThreatenedBeforeMove && capturingValue > 0) {
            movingToThreatenedSquare = true;
        }

        // Make the move
        let moveResult;
        try {
            moveResult = game.move({
                from: move.from,
                to: move.to,
                promotion: move.promotion,
                coralPlaced: move.coralPlaced,
                coralRemoved: move.coralRemoved,
                coralRemovedSquares: move.coralRemovedSquares,
            });
        } catch {
            // Invalid move - skip it (shouldn't happen since we validated moves, but handle gracefully)
            continue;
        }

        if (!moveResult) {
            // Invalid move, skip
            continue;
        }

        // Create new game state after move
        const newGameState = createGameSnapshot(game);

        // Check if moving piece is now hanging to a less valuable attacker
        // This prevents AI from moving valuable pieces to squares where less valuable pieces can capture them
        let hangingToLessValuablePiece = false;
        let attackerValue = 0;

        // If destination was threatened before move, check what can attack it
        if (movingToThreatenedSquare && capturingPiece !== false) {
            // Check what opponent pieces can attack the destination square (before the move)
            // We need to check the original game state, not the state after the move
            const originalGame = safeRestoreGame(gameState);
            if (originalGame) {
                const opponentPieces = getPieces(originalGame, opponentColor);
                for (const { piece, role } of opponentPieces) {
                    if (piece.toLowerCase() === 'h') continue; // Skip whale
                    // Check if this piece can attack the destination square
                    // We check if the square is attacked by opponent color (which includes this piece)
                    // and if this piece is less valuable than our moving piece
                    const pieceValue = getPieceValue(piece, role);
                    if (pieceValue < capturingValue) {
                        // This less valuable piece can potentially capture our piece
                        // Check if it actually attacks the destination
                        // We'll use a simple heuristic: if destination is attacked and this piece is nearby, assume it can attack
                        // More precise: check if this piece's attack pattern includes the destination
                        // For now, if destination is attacked and we have a less valuable attacker, penalize
                        hangingToLessValuablePiece = true;
                        attackerValue = Math.max(attackerValue, pieceValue);
                    }
                }
            }
        }

        // Recursively search (don't pass lastMove to recursive calls - only apply penalty at root)
        const result = alphaBeta(
            newGameState,
            depth - 1,
            alpha,
            beta,
            !maximizingPlayer,
            playerColor,
            timeControl,
            null, // lastMove only matters at root level
            transpositionTable, // Pass transposition table to recursive calls
            evaluationTable, // Pass evaluation table to recursive calls
            false, // Not root level in recursive calls
            rootGameState || (isRootLevel ? gameState : null), // Pass original root state for defensive bonus checks
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

        // CRITICAL FIX: At root level, if we're maximizing and the recursive call was minimizing,
        // the returned score is from the minimizing player's perspective (negative = good for them).
        // We need to flip it back to our perspective (positive = good for us).
        // The recursive call evaluates from playerColor perspective and flips for minimizing,
        // so result.score = -evaluatePosition(playerColor) when minimizing.
        // At root maximizing, we want: evaluatePosition(playerColor), so we flip: -result.score
        let moveScore: number;
        if (isRootLevel && maximizingPlayer) {
            // Recursive call was minimizing, returned score is from their perspective (negative = good for them)
            // Flip to our perspective: -result.score
            moveScore = -result.score;
        } else {
            moveScore = result.score;
        }

        // Log defensive bonus status after recursive call to verify it's preserved
        // CRITICAL: defensiveBonus was calculated BEFORE the recursive call, so it should still be set
        if (isRootLevel && move.from === 'a4' && move.to === 'a6') {
            console.log(
                `[DEBUG] After recursive call for ${move.from}->${move.to}: ` +
                    `moveScore=${moveScore.toFixed(2)}, defensiveBonus=${defensiveBonus.toFixed(0)} (should be 50000)`,
            );
        }

        // Apply reversing move penalty only at root level (when lastMove is provided and we're at maximum depth)
        // We detect root level by checking if lastMove is provided - it's only passed at the root
        if (lastMove !== null && isReversingMove(move, lastMove)) {
            moveScore += MOVE_PENALTIES.reversingMove;
        }

        // Apply capture bonus at root level to prioritize captures even at shallow depths
        // This ensures captures are selected even when search depth is limited
        if (isRootLevel && move.captured) {
            const capturedValue = getPieceValue(move.captured, (move as any).capturedRole || null);

            // Check if this is a bad trade (capturing piece is more valuable than captured piece)
            // capturingPiece and capturingValue were already determined before making the move

            // Penalize bad trades: if capturing piece is worth more than captured piece, apply penalty
            // This prevents AI from trading valuable pieces for less valuable ones
            if (capturingValue > capturedValue) {
                const tradeLoss = capturingValue - capturedValue;
                // Apply penalty equal to the trade loss (how much value we're losing)
                moveScore -= tradeLoss;
            } else {
                // Good trade or equal trade - add bonus to prioritize captures
                // Add a significant bonus for captures at root level to ensure they're prioritized
                // This compensates for search depth limitations where captures might not be fully evaluated
                // Use a larger bonus (50% of captured value) to ensure captures are always selected
                const captureBonus = capturedValue * 0.5; // 50% bonus for captures at root level
                moveScore += captureBonus;
            }
        }

        // Apply penalty for moving valuable pieces to squares where less valuable pieces can capture them
        // This prevents bad trades like turtle (500-1000) being captured by octopus (100-125)
        if (isRootLevel && hangingToLessValuablePiece && capturingValue > 0) {
            const tradeLoss = capturingValue - attackerValue;
            // Apply severe penalty for bad trades - 5x the trade loss plus a fixed penalty
            // This ensures bad trades are NEVER selected, even with threat bonuses
            // For example: turtle (500) hanging to pufferfish (300) = 200 trade loss
            // Penalty = 200 * 5 + 500 = 1500 points (more than the piece is worth!)
            const hangingPenalty = tradeLoss * 5 + capturingValue; // 5x trade loss + full piece value
            moveScore -= hangingPenalty;
        }

        // Apply threat bonus at root level to prioritize moves that threaten opponent pieces
        // This ensures threatening moves are selected even when search depth is limited
        // BUT: Don't apply threat bonus if the move leaves our piece hanging (bad trade)
        if (
            isRootLevel &&
            !move.captured &&
            capturingPiece !== false &&
            !hangingToLessValuablePiece
        ) {
            // Check if this move threatens opponent pieces
            const gameAfterMove = safeRestoreGame(newGameState);
            if (gameAfterMove) {
                const opponentColor = playerColor === 'w' ? 'b' : 'w';
                const opponentPieces = getPieces(gameAfterMove, opponentColor);
                for (const { square, piece, role } of opponentPieces) {
                    if (
                        piece.toLowerCase() !== 'h' &&
                        gameAfterMove.isAttacked(square, playerColor)
                    ) {
                        const threatenedValue = getPieceValue(piece, role);
                        const threateningValue = capturingValue;

                        // Base threat bonus: 20% of threatened piece value
                        let threatBonus = threatenedValue * 0.2;

                        // Extra bonus when threatening valuable pieces with less valuable pieces
                        // This rewards good trade opportunities (e.g., crab threatening dolphin)
                        if (threateningValue < threatenedValue) {
                            const valueDifference = threatenedValue - threateningValue;
                            // Add bonus proportional to the value difference
                            // For example: crab (100) threatening dolphin (1800) = 1700 difference
                            // This makes threatening valuable pieces with cheap pieces highly attractive
                            const tradeOpportunityBonus = valueDifference * 0.3; // 30% of value difference
                            threatBonus += tradeOpportunityBonus;
                        }

                        // Extra bonus when the threatened piece is protected (defended)
                        // This makes the threat even more valuable because opponent can't easily escape
                        const isDefended = gameAfterMove.isAttacked(square, opponentColor);
                        if (isDefended) {
                            // Protected pieces are harder to move away, making the threat more valuable
                            threatBonus += threatenedValue * 0.1; // Additional 10% bonus for protected pieces
                        }

                        moveScore += threatBonus;
                        break; // Only count the first threatened piece to avoid double-counting
                    }
                }
            }
        }

        // Apply defensive move bonus to moveScore
        // This bonus was calculated BEFORE making the move, so it correctly evaluates
        // whether this move protects threatened pieces
        // IMPORTANT: Apply this bonus at ALL levels, not just root level
        // The defensive value of a move should be considered throughout the search tree

        // DEBUG: Check if defensive bonus should be applied
        // Log for ALL moves from a4, especially a4->a6
        if (move.from === 'a4') {
            console.log(
                `[DEBUG] Checking defensive bonus for ${move.from}->${move.to}: ` +
                    `defensiveBonus=${defensiveBonus}, moveScore=${moveScore.toFixed(2)}, isRootLevel=${isRootLevel}`,
            );
        }

        if (defensiveBonus > 0) {
            const scoreBeforeBonus = moveScore;
            moveScore += defensiveBonus;
            // Log for moves from threatened pieces (especially a4->a6)
            if (move.from === 'a4' || (isRootLevel && defensiveBonus >= 50000)) {
                console.log(
                    `[DEBUG] ✅ Applying defensive bonus to move ${move.from}->${move.to}: ` +
                        `score before=${scoreBeforeBonus.toFixed(2)}, bonus=+${defensiveBonus.toFixed(0)}, ` +
                        `score after=${moveScore.toFixed(2)} (isRootLevel=${isRootLevel})`,
                );
            }
        } else if (move.from === 'a4') {
            console.log(
                `[DEBUG] ❌ Defensive bonus NOT applied to ${move.from}->${move.to}: defensiveBonus=${defensiveBonus}`,
            );
        }

        // CRITICAL: Apply severe penalty for moving valuable pieces to threatened squares
        // This prevents moves like dolphin->threatened square (even if piece wasn't threatened before)
        if (movingToThreatenedSquare && capturingValue > 0) {
            // Calculate penalty based on piece value
            // More valuable pieces get larger penalties
            let threatenedSquarePenalty = capturingValue * 5.0; // 500% of piece value (increased from 300%)

            // Extra severe penalty for critical pieces (dolphin gatherer = 1800)
            if (capturingValue >= PIECE_SAFETY.criticalPieceThreshold) {
                // For critical pieces, use a massive penalty to ensure these moves are NEVER selected
                threatenedSquarePenalty = capturingValue * 10.0; // 1000% of piece value (18000 for dolphin gatherer)
                // Ensure minimum penalty of 50000 points for critical pieces
                threatenedSquarePenalty = Math.max(threatenedSquarePenalty, 50000);
            } else if (capturingValue >= 500) {
                // For valuable pieces (dolphin hunter = 900, turtle = 500-1000), use larger penalty
                // Ensure minimum penalty of 10000 points for valuable pieces moving to threatened squares
                threatenedSquarePenalty = Math.max(threatenedSquarePenalty, 10000);
            }

            // If it's a bad trade (hanging to less valuable piece), add extra penalty
            if (hangingToLessValuablePiece && attackerValue > 0) {
                const tradeLoss = capturingValue - attackerValue;
                threatenedSquarePenalty += tradeLoss * 5; // Additional penalty for bad trades
            }

            // IMPORTANT: If we're moving away from a threat (defensive bonus > 0), reduce the penalty significantly
            // This allows moving from one threatened square to another if it's still better than staying
            // For example: dolphin at a4 (threatened) -> a6 (also threatened) is better than staying at a4
            // The defensive bonus (50,000) should overcome the reduced penalty
            if (defensiveBonus > 0) {
                // Reduce penalty by 95% - still penalize but not as harshly
                // This ensures defensive bonus (50,000) can still overcome the reduced penalty
                threatenedSquarePenalty = threatenedSquarePenalty * 0.05; // Only 5% of original penalty
                if (isRootLevel) {
                    console.log(
                        `[DEBUG] Reducing threatened square penalty for ${move.from}->${move.to} ` +
                            `because moving away from threat (defensive bonus: ${defensiveBonus.toFixed(0)}, ` +
                            `penalty reduced from ${(threatenedSquarePenalty / 0.05).toFixed(0)} to ${threatenedSquarePenalty.toFixed(0)})`,
                    );
                }
            }

            moveScore -= threatenedSquarePenalty;

            if (isRootLevel) {
                console.log(
                    `[DEBUG] Applying threatened square penalty to move ${move.from}->${move.to}: -${threatenedSquarePenalty.toFixed(0)} points (piece value: ${capturingValue})`,
                );
            }
        }

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

    // Store result in transposition table
    if (transpositionTable) {
        let bound: BoundType;
        if (bestScore <= originalAlpha) {
            // Score failed low - this is an upper bound
            bound = BoundType.UPPER_BOUND;
        } else if (bestScore >= originalBeta) {
            // Score failed high - this is a lower bound (beta cutoff occurred)
            bound = BoundType.LOWER_BOUND;
        } else {
            // Score is within window - this is an exact score
            bound = BoundType.EXACT;
        }

        transpositionTable.put(positionKey, depth, bestScore, bound, bestMove);
    }

    return {
        score: bestScore,
        move: bestMove,
        nodesEvaluated,
        timedOut: false,
    };
}

/**
 * Find best move using alpha-beta pruning with optional aspiration window
 * @param gameState - Current game state
 * @param depth - Search depth (plies)
 * @param playerColor - Color we're playing for ('w' or 'b')
 * @param timeControl - Optional time control object with startTime and maxTimeMs
 * @param lastMove - Last move made (for detecting reversing moves)
 * @param transpositionTable - Optional transposition table for caching position evaluations
 * @param evaluationTable - Optional pre-computed evaluation table for fast position lookup
 * @param aspirationAlpha - Optional alpha for aspiration window (narrower search window)
 * @param aspirationBeta - Optional beta for aspiration window (narrower search window)
 * @returns { move: Object, score: number, nodesEvaluated: number, timedOut: boolean, aspirationFailed: boolean }
 */
export function findBestMove(
    gameState: GameStateSnapshot,
    depth: number,
    playerColor: Color,
    timeControl: TimeControl | null = null,
    lastMove: LastMoveInfo | null = null,
    transpositionTable: TranspositionTable | null = null,
    evaluationTable: EvaluationTable | null = null,
    aspirationAlpha: number | null = null,
    aspirationBeta: number | null = null,
): AlphaBetaResult & { aspirationFailed?: boolean } {
    const game = safeRestoreGame(gameState);
    if (!game) {
        return {
            score: 0,
            move: null,
            nodesEvaluated: 1,
            timedOut: false,
            aspirationFailed: false,
        };
    }

    // Determine if we're maximizing (our turn) or minimizing (opponent's turn)
    // Since we're always evaluating for playerColor, we check whose turn it is
    const currentTurn = game.turn();
    const maximizingPlayer = currentTurn === playerColor;

    // Use aspiration window if provided, otherwise use full window
    const alpha = aspirationAlpha !== null ? aspirationAlpha : -Infinity;
    const beta = aspirationBeta !== null ? aspirationBeta : Infinity;

    const result = alphaBeta(
        gameState,
        depth,
        alpha,
        beta,
        maximizingPlayer,
        playerColor,
        timeControl,
        lastMove,
        transpositionTable,
        evaluationTable,
        true, // This is the root level
        gameState, // Pass original root state for defensive bonus checks
    );

    // Check if aspiration window failed (score outside window)
    // This happens when score <= aspirationAlpha (failed low) or >= aspirationBeta (failed high)
    const aspirationFailed =
        aspirationAlpha !== null &&
        aspirationBeta !== null &&
        (result.score <= aspirationAlpha || result.score >= aspirationBeta);

    return {
        ...result,
        aspirationFailed: aspirationFailed || false,
    };
}

/**
 * Progress callback type for iterative deepening
 */
export type ProgressCallback = (
    depth: number,
    nodesEvaluated: number,
    elapsedMs: number,
    hasMove: boolean,
) => void;

/**
 * Find best move using iterative deepening with time control
 * @param gameState - Current game state
 * @param maxDepth - Maximum depth to search to
 * @param playerColor - Color we're playing for ('w' or 'b')
 * @param maxTimeMs - Maximum time to spend in milliseconds
 * @param progressCallback - Optional callback for progress updates (depth, nodesEvaluated, elapsedMs)
 * @param lastMove - Last move made (for detecting reversing moves)
 * @param evaluationTable - Optional pre-computed evaluation table for fast position lookup
 * @param difficulty - Difficulty level ('easy', 'medium', 'hard') - determines which stored moves to use
 * @returns { move: Object, score: number, nodesEvaluated: number, depth: number, elapsedMs: number }
 */
export function findBestMoveIterativeDeepening(
    gameState: GameStateSnapshot,
    maxDepth: number,
    playerColor: Color,
    maxTimeMs: number = TIME_CONTROL.maxTimeMs,
    progressCallback: ProgressCallback | null = null,
    lastMove: LastMoveInfo | null = null,
    evaluationTable: EvaluationTable | null = null,
    difficulty: 'easy' | 'medium' | 'hard' = 'hard',
): IterativeDeepeningResult {
    // Create transposition table for this search (shared across all depths)
    const transpositionTable = new TranspositionTable(100000);
    const game = safeRestoreGame(gameState);
    if (!game) {
        return {
            move: null,
            score: 0,
            nodesEvaluated: 0,
            depth: 0,
            elapsedMs: 0,
        };
    }

    const startTime = Date.now();
    let bestMove: any = null;
    let bestScore = -Infinity;
    let totalNodesEvaluated = 0;
    let bestDepth = 1;

    // Check evaluation table first for stored moves
    if (evaluationTable) {
        const positionKey = generatePositionKey(gameState);
        const storedMoves = evaluationTable.getMoves(positionKey, difficulty);
        if (storedMoves && storedMoves.length > 0) {
            // Randomly select from available moves based on difficulty
            const selectedMove = storedMoves[Math.floor(Math.random() * storedMoves.length)];

            // Convert StoredMove to full Move object
            // Verify the stored move is still legal in the current position
            const legalMoves = game.moves({ verbose: true });
            const matchingMove = legalMoves.find(
                (m) =>
                    m.from === selectedMove.from &&
                    m.to === selectedMove.to &&
                    m.promotion === selectedMove.promotion &&
                    m.coralPlaced === selectedMove.coralPlaced &&
                    m.coralRemoved === selectedMove.coralRemoved,
            );

            if (matchingMove) {
                // Double-check the move is actually valid by trying to execute it
                // (game.moves() can return pseudo-legal moves)
                const validationGame = safeRestoreGame(gameState);
                if (validationGame) {
                    try {
                        const testResult = validationGame.move({
                            from: matchingMove.from,
                            to: matchingMove.to,
                            promotion: matchingMove.promotion,
                            coralPlaced: matchingMove.coralPlaced,
                            coralRemoved: matchingMove.coralRemoved,
                            coralRemovedSquares: matchingMove.coralRemovedSquares,
                        });
                        if (testResult) {
                            // Move is valid - return it
                            return {
                                move: matchingMove,
                                score: 0, // Score not stored, use 0
                                nodesEvaluated: 1, // Minimal evaluation
                                depth: 0, // No search depth needed
                                elapsedMs: Date.now() - startTime,
                            };
                        }
                    } catch {
                        // Move is invalid - fall through to normal search
                    }
                }
            }
        }
    }

    // Get initial legal moves as fallback - ensures we always have a move to return
    const initialMoves = game.moves({ verbose: true });
    if (initialMoves.length === 0) {
        return {
            move: null,
            score: 0,
            nodesEvaluated: 0,
            depth: 0,
            elapsedMs: Date.now() - startTime,
        };
    }
    // Set first move as initial fallback
    let fallbackMove = initialMoves[0];

    const timeControl: TimeControl = {
        startTime,
        maxTimeMs,
    };

    // Iterative deepening: start with depth 1 and increase until time runs out or max depth reached
    // Minimum depth 2 to ensure we see at least one full move pair (our move + opponent response)
    const minDepth = Math.min(2, maxDepth);
    for (let depth = 1; depth <= maxDepth; depth++) {
        // Check timeout before starting this depth
        const elapsed = Date.now() - startTime;
        // Don't stop early if we haven't reached minimum depth yet (unless we're out of time)
        if (elapsed >= maxTimeMs && depth >= minDepth) {
            // Time's up - use best move found so far, or fallback
            if (!bestMove) {
                bestMove = fallbackMove;
            }
            break;
        }

        // Use aspiration window if we have a previous score (depth > 1)
        let result: AlphaBetaResult & { aspirationFailed?: boolean };

        if (depth > 1 && bestScore !== -Infinity && bestScore !== Infinity && isFinite(bestScore)) {
            // Try aspiration window: narrow window around previous score
            const aspirationAlpha = bestScore - ASPIRATION_WINDOW.initial;
            const aspirationBeta = bestScore + ASPIRATION_WINDOW.initial;

            result = findBestMove(
                gameState,
                depth,
                playerColor,
                timeControl,
                lastMove,
                transpositionTable,
                evaluationTable,
                aspirationAlpha,
                aspirationBeta,
            );

            // Check if aspiration window failed (score outside window)
            if (result.aspirationFailed && !result.timedOut) {
                // Aspiration window failed - re-search with full window
                result = findBestMove(
                    gameState,
                    depth,
                    playerColor,
                    timeControl,
                    lastMove,
                    transpositionTable,
                    evaluationTable,
                );
            }
        } else {
            // No previous score or first depth - use full window
            result = findBestMove(
                gameState,
                depth,
                playerColor,
                timeControl,
                lastMove,
                transpositionTable,
                evaluationTable,
            );
        }

        const elapsedAfter = Date.now() - startTime;
        totalNodesEvaluated += result.nodesEvaluated;

        // If timed out, use the best result from previous depth (if any)
        if (result.timedOut) {
            // If we have a best move from previous depth, use it
            if (bestMove) {
                break;
            }
            // If the current search found a move before timing out, use it
            // This ensures we use the best move found even if search timed out
            if (result.move) {
                bestMove = result.move;
                bestScore = result.score;
                bestDepth = depth;
                break;
            }
            // If depth 1 timed out and we have no result, use fallback
            bestMove = fallbackMove;
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
            progressCallback(depth, result.nodesEvaluated, elapsedAfter, bestMove !== null);
        }

        // Check if we've exceeded time limit (double-check after search)
        if (elapsedAfter >= maxTimeMs) {
            // Ensure we have a move before breaking
            if (!bestMove) {
                bestMove = fallbackMove;
            }
            break;
        }

        // If we reached a terminal position (checkmate, etc.), no need to go deeper
        if (Math.abs(result.score) > 90000) {
            // Found a winning/losing position
            break;
        }
    }

    const totalElapsed = Date.now() - startTime;

    // Final fallback: ensure we always return a move if legal moves exist
    if (!bestMove) {
        bestMove = fallbackMove;
    }

    return {
        move: bestMove, // Should never be null if legal moves exist
        score: bestScore === -Infinity ? 0 : bestScore,
        nodesEvaluated: totalNodesEvaluated,
        depth: bestDepth,
        elapsedMs: totalElapsed,
    };
}
