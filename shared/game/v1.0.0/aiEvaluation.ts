/**
 * AI Evaluation and Search Functions for Coral Clash
 *
 * Implements evaluation function and alpha-beta pruning for computer opponent
 * This module is part of the shared game engine package and can be used
 * both client-side (for offline AI) and server-side (for online games)
 */

import {
    CORAL_EVALUATION,
    GAME_ENDING,
    MOVE_PENALTIES,
    PIECE_SAFETY,
    POSITIONAL_BONUSES,
    SOFTMAX_SELECTION,
    TIME_CONTROL,
    getPieceValue
} from './aiConfig.js';
import type { Color, PieceRole, PieceSymbol, Square } from './coralClash.js';
import { CoralClash, Ox88, SQUARES, algebraic } from './coralClash.js';
import { restoreGameFromSnapshot } from './gameState.js';

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
     * Generate a random 32-bit integer (using 31 bits for safety in JavaScript)
     */
    private randomKey(): number {
        // Use 31 bits to stay within JavaScript's safe integer range
        return Math.floor(Math.random() * 0x7fffffff);
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
function _squareToIndex(square: Square): number {
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
function computeZobristHash(game: CoralClash): number {
    let hash = 0;
    const board = game.getBoardOx88();

    // Hash all pieces on the board using 0x88 board directly
    for (let i = 0; i < 120; i++) {
        if (i & 0x88) {
            i += 7;
            continue;
        }

        const piece = board[i];
        if (piece) {
            const squareIdx = (i >> 4) * 8 + (i & 7); // Convert 0x88 index to 0-63
            hash ^= zobristKeys.getPieceKey(piece.type, squareIdx, piece.color, piece.role || null);
        }
    }

    // Hash coral state using 0x88 coral directly
    const coral = game.getCoralOx88();
    for (let i = 0; i < 120; i++) {
        if (i & 0x88) {
            i += 7;
            continue;
        }
        const c = coral[i];
        const squareIdx = (i >> 4) * 8 + (i & 7);
        hash ^= zobristKeys.getCoralKey(squareIdx, c);
    }

    // Hash turn to move
    hash ^= zobristKeys.getTurnKey(game.turn());

    return hash;
}

/**
 * Fallback: Generate position key as string (for error cases)
 * @param gameState - Current game state snapshot
 * @returns Position key string
 */
function _generatePositionKeyString(gameState: GameStateSnapshot): string {
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
function _hashString(str: string): number {
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
function generatePositionKey(game: CoralClash): number {
    return computeZobristHash(game);
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
        restoreGameFromSnapshot(game, gameState, { skipFenValidation: true });
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
function _isCenterSquare(square: Square): boolean {
    return (POSITIONAL_BONUSES.centerSquares.squares as readonly Square[]).includes(square);
}

/**
 * Check if square is in extended center
 * @param square - Square notation
 * @returns boolean
 */
function _isExtendedCenter(square: Square): boolean {
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
function _isInOpponentHalf(square: Square, color: Color): boolean {
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
function _isNearOpponentWhale(square: Square, opponentWhaleSquares: string[] | null): boolean {
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

    const moveFrom = typeof move.from === 'number' ? move.from : Ox88[move.from as Square];
    const moveTo = typeof move.to === 'number' ? move.to : Ox88[move.to as Square];
    const lastMoveFrom = Ox88[lastMove.from as Square];
    const lastMoveTo = Ox88[lastMove.to as Square];

    const squaresMatch = moveFrom === lastMoveTo && moveTo === lastMoveFrom;

    const pieceTypesMatch = move.piece?.toLowerCase() === lastMove.piece?.toLowerCase();

    // If color is provided in both, verify they match (same player's piece)
    const colorsMatch = !move.color || !lastMove.color || move.color === lastMove.color;

    return squaresMatch && pieceTypesMatch && colorsMatch;
}

/**
 * Get all pieces on the board with their positions
 * @param game - CoralClash instance
 * @param color - Color to evaluate ('w' or 'b')
 * @returns Array of { square: string, piece: string, role: string|null }
 */
function _getPieces(game: CoralClash, color: Color): PieceInfo[] {
    const pieces: PieceInfo[] = [];

    for (const sq of SQUARES) {
        const piece = game.get(sq);
        if (piece && piece.color === color) {
            pieces.push({
                square: sq,
                piece: piece.type,
                role: piece.role || null,
            });
        }
    }

    return pieces;
}

/**
 * Evaluate a position from a player's perspective
 * Positive score is good for the player, negative is bad
 * @param gameState - Full game state snapshot
 * @param playerColor - Color to evaluate for ('w' or 'b')
 * @returns Evaluation score
 */
export function evaluatePosition(
    gameOrSnapshot: CoralClash | GameStateSnapshot,
    playerColor: Color,
): number {
    let game: CoralClash;

    // Handle GameStateSnapshot for backwards compatibility
    if (!(gameOrSnapshot instanceof CoralClash)) {
        const restored = safeRestoreGame(gameOrSnapshot as GameStateSnapshot);
        if (!restored) return 0;
        game = restored;
    } else {
        game = gameOrSnapshot;
    }

    const opponentColor: Color = playerColor === 'w' ? 'b' : 'w';

    // Check game-ending conditions first
    if (game.isCheckmate()) {
        const winner = game.turn() === 'w' ? 'b' : 'w';
        return winner === playerColor ? GAME_ENDING.checkmate.win : GAME_ENDING.checkmate.loss;
    }

    if (game.isStalemate()) return GAME_ENDING.stalemate.points;

    const coralWinner = game.isCoralVictory();
    if (coralWinner) {
        return coralWinner === playerColor
            ? GAME_ENDING.coralVictory.win
            : GAME_ENDING.coralVictory.loss;
    }

    let score = 0;
    const board = game.getBoardOx88();
    const kings = game.getWhalePositionsOx88();

    // High performance 0x88 board scan
    for (let i = 0; i < 120; i++) {
        if (i & 0x88) {
            i += 7;
            continue;
        }

        const piece = board[i];
        if (!piece) continue;

        const color = piece.color;
        const isPlayer = color === playerColor;
        const role = piece.role || null;
        const materialValue = getPieceValue(piece.type, role);
        let pieceScore = materialValue;

        // Positional bonuses
        // Center squares in 0x88 are 0x33, 0x34, 0x43, 0x44 (algebraic d5, e5, d4, e4)
        const isCenter = i === 0x33 || i === 0x34 || i === 0x43 || i === 0x44;
        if (isCenter) {
            pieceScore += POSITIONAL_BONUSES.centerSquares.points;
        }

        // isInOpponentHalf check using 0x88 rank
        const rank = 8 - (i >> 4);
        const inOpponentHalf = color === 'w' ? rank > 4 : rank < 5;
        if (inOpponentHalf) {
            pieceScore += POSITIONAL_BONUSES.opponentHalf.points;
            if (role === 'gatherer')
                score += isPlayer
                    ? POSITIONAL_BONUSES.gathererNearEmptySquare.points
                    : -POSITIONAL_BONUSES.gathererNearEmptySquare.points;
        }

        // Piece safety evaluation - critical for preventing blunders
        const them = color === 'w' ? 'b' : 'w';

        // Quick near whale check
        const enemyWhalePositions = kings[them];
        if (enemyWhalePositions) {
            const dist1 =
                Math.abs((i >> 4) - (enemyWhalePositions[0] >> 4)) +
                Math.abs((i & 7) - (enemyWhalePositions[1] >> 4)) +
                Math.abs((i & 7) - (enemyWhalePositions[0] & 7));
            const dist2 =
                Math.abs((i >> 4) - (enemyWhalePositions[1] >> 4)) +
                Math.abs((i & 7) - (enemyWhalePositions[1] & 7));
            if (dist1 <= 2 || dist2 <= 2) {
                pieceScore += POSITIONAL_BONUSES.nearOpponentWhale.points;
            }
        }

        const sqAlgebraic = algebraic(i);
        const isAttacked = game.isAttacked(sqAlgebraic, them);
        const isDefended = game.isAttacked(sqAlgebraic, color);

        if (isAttacked) {
            if (!isDefended) {
                // Hanging piece penalty
                const multiplier =
                    materialValue >= PIECE_SAFETY.criticalPieceThreshold
                        ? PIECE_SAFETY.criticalHangingMultiplier
                        : PIECE_SAFETY.hangingMultiplier;
                pieceScore -= materialValue * multiplier;
            } else {
                // Attacked but defended
                pieceScore -= materialValue * PIECE_SAFETY.attackedMultiplier;
            }
        }

        if (isDefended) {
            // WHALE pieces don't get defended bonus to keep evaluation stable (otherwise opening scores are too high)
            if (piece.type !== 'h') {
                pieceScore += materialValue * PIECE_SAFETY.defendedBonus;
            }
        }

        score += isPlayer ? pieceScore : -pieceScore;
    }

    // Simple coral count
    const coralCounts = game.getCoralRemainingCounts();
    score += (17 - coralCounts[playerColor]) * CORAL_EVALUATION.placed.points;
    score -= (17 - coralCounts[opponentColor]) * CORAL_EVALUATION.placed.points;

    return score;
}

/**
 * Quiescence search to avoid horizon effect
 * Only searches capture moves and promotions to find quiet positions
 * @param game - Current game instance
 * @param alpha - Best value for maximizing player
 * @param beta - Best value for minimizing player
 * @param playerColor - Color we're playing for
 * @param maxDepth - Maximum quiescence depth to prevent infinite loops
 * @returns Score and nodes evaluated
 */
function quiescenceSearch(
    game: CoralClash,
    alpha: number,
    beta: number,
    playerColor: Color,
    maxDepth: number = 10,
    timeControl: TimeControl | null = null,
): { score: number; nodesEvaluated: number; timedOut: boolean } {
    let nodesEvaluated = 1;

    // Check time control
    if (timeControl) {
        const elapsed = Date.now() - timeControl.startTime;
        if (elapsed >= timeControl.maxTimeMs) {
            return {
                score: 0, // Neutral score when timed out
                nodesEvaluated: 1,
                timedOut: true,
            };
        }
    }

    // Standing Pat: Evaluate current position
    // This is the score if we make no more captures
    const standPat = evaluatePosition(game, playerColor);

    // Beta cutoff - current position is already too good for opponent
    // Opponent won't allow this line, so we can prune
    if (standPat >= beta) {
        return { score: beta, nodesEvaluated, timedOut: false };
    }

    // Update alpha if standing pat is better than current best
    if (standPat > alpha) {
        alpha = standPat;
    }

    // Depth limit to prevent excessive quiescence search
    if (maxDepth <= 0) {
        return { score: standPat, nodesEvaluated, timedOut: false };
    }

    // Get only capture moves (ignore quiet moves in quiescence)
    const allMoves = game.internalMoves();
    const captureMoves = allMoves.filter((m) => m.captured);

    // No captures available - return standing pat evaluation
    if (captureMoves.length === 0) {
        return { score: standPat, nodesEvaluated, timedOut: false };
    }

    // MVV-LVA (Most Valuable Victim - Least Valuable Aggressor) ordering
    // Prioritize high-value captures by low-value pieces
    const sortedCaptures = captureMoves.sort((a, b) => {
        const aVictimValue = getPieceValue(a.captured!, a.capturedRole || null);
        const bVictimValue = getPieceValue(b.captured!, b.capturedRole || null);
        const aAttackerValue = getPieceValue(a.piece, a.role || null);
        const bAttackerValue = getPieceValue(b.piece, b.role || null);

        // MVV-LVA: multiply victim by 100 to heavily prioritize victim value
        // Then subtract attacker value to prefer low-value attackers
        const aMvvLva = aVictimValue * 100 - aAttackerValue;
        const bMvvLva = bVictimValue * 100 - bAttackerValue;
        return bMvvLva - aMvvLva;
    });

    let bestScore = standPat;

    for (const move of sortedCaptures) {
        // Check time limit before processing each move
        if (timeControl) {
            const elapsed = Date.now() - timeControl.startTime;
            if (elapsed >= timeControl.maxTimeMs) {
                return { score: bestScore, nodesEvaluated, timedOut: true };
            }
        }

        game.makeMove(move);

        // Recursive quiescence search with negated alpha-beta window
        // CRITICAL: Swap player perspective (negamax) by evaluating from opponent's view
        const opponentColor = playerColor === 'w' ? 'b' : 'w';
        const result = quiescenceSearch(
            game,
            -beta,
            -alpha,
            opponentColor,
            maxDepth - 1,
            timeControl,
        );
        const score = -result.score; // Negate for opponent's perspective

        game.undoInternal();

        nodesEvaluated += result.nodesEvaluated;

        if (result.timedOut) {
            return { score: bestScore, nodesEvaluated, timedOut: true };
        }

        // Beta cutoff
        if (score >= beta) {
            return { score: beta, nodesEvaluated, timedOut: false };
        }

        if (score > bestScore) {
            bestScore = score;
            if (score > alpha) {
                alpha = score;
            }
        }
    }

    return { score: bestScore, nodesEvaluated, timedOut: false };
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
 * @returns { score: number, move: Object|null, nodesEvaluated: number, timedOut: boolean }
 */
export function alphaBeta(
    game: CoralClash,
    depth: number,
    alpha: number,
    beta: number,
    maximizingPlayer: boolean,
    playerColor: Color,
    timeControl: TimeControl | null = null,
    lastMove: LastMoveInfo | null = null,
    transpositionTable: TranspositionTable | null = null,
    isRootLevel: boolean = false, // Track if we're at root level
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

    const originalAlpha = alpha;
    const originalBeta = beta;

    // Generate position key for transposition table lookup (only for deeper searches)
    // Allow disabling TT via environment variable for debugging
    let positionKey = 0;
    const useTT = transpositionTable && !process.env.DISABLE_TT;
    if (depth > 1 && useTT) {
        positionKey = generatePositionKey(game);
        const entry = transpositionTable.get(positionKey);
        if (entry && entry.depth >= depth) {
            if (entry.bound === BoundType.EXACT) {
                return {
                    score: entry.score,
                    move: entry.bestMove,
                    nodesEvaluated: 1,
                    timedOut: false,
                };
            } else if (entry.bound === BoundType.LOWER_BOUND) {
                if (entry.score >= beta)
                    return {
                        score: entry.score,
                        move: entry.bestMove,
                        nodesEvaluated: 1,
                        timedOut: false,
                    };
                alpha = Math.max(alpha, entry.score);
            } else if (entry.bound === BoundType.UPPER_BOUND) {
                if (entry.score <= alpha)
                    return {
                        score: entry.score,
                        move: entry.bestMove,
                        nodesEvaluated: 1,
                        timedOut: false,
                    };
                beta = Math.min(beta, entry.score);
            }
        }
    }

    // Terminal node: check game-ending conditions or depth limit
    if (game.isGameOver()) {
        // Game over - immediate evaluation
        return {
            score: evaluatePosition(game, playerColor),
            move: null,
            nodesEvaluated: 1,
            timedOut: false,
        };
    }

    if (depth === 0) {
        // Quiescence search at leaf nodes to avoid horizon effect
        // Q-Search uses Negamax (always maximizing for the passed color)
        // If it's the opponent's turn (minimizing), we must evaluate from opponent's perspective
        // and negate the result to get the score relative to playerColor
        let qResult;
        if (maximizingPlayer) {
            qResult = quiescenceSearch(game, alpha, beta, playerColor, 10, timeControl);
        } else {
            const opponentColor = playerColor === 'w' ? 'b' : 'w';
            // Negamax: Pass swapped color and negated bounds (-beta as alpha, -alpha as beta)
            const result = quiescenceSearch(game, -beta, -alpha, opponentColor, 10, timeControl);
            qResult = {
                ...result,
                score: -result.score // Negate score to convert back to playerColor perspective
            };
        }
        
        return {
            score: qResult.score,
            move: null,
            nodesEvaluated: qResult.nodesEvaluated,
            timedOut: qResult.timedOut,
        };
    }

    const moves = game.internalMoves();
    if (moves.length === 0) {
        const score = evaluatePosition(game, playerColor);
        return {
            score: score,
            move: null,
            nodesEvaluated: 1,
            timedOut: false,
        };
    }

    let bestMove: any = null;
    let bestScore = maximizingPlayer ? -Infinity : Infinity;

    // MVV-LVA move ordering: prioritize high-value captures by low-value pieces
    let sortedMoves = [...moves].sort((a, b) => {
        // Captures vs non-captures
        if (a.captured && !b.captured) return -1;
        if (!a.captured && b.captured) return 1;

        // Both captures - use MVV-LVA
        if (a.captured && b.captured) {
            const aVictimValue = getPieceValue(a.captured, a.capturedRole || null);
            const bVictimValue = getPieceValue(b.captured, b.capturedRole || null);
            const aAttackerValue = getPieceValue(a.piece, a.role || null);
            const bAttackerValue = getPieceValue(b.piece, b.role || null);

            // MVV-LVA: prioritize high-value victims captured by low-value attackers
            const aMvvLva = aVictimValue * 100 - aAttackerValue;
            const bMvvLva = bVictimValue * 100 - bAttackerValue;
            return bMvvLva - aMvvLva;
        }

        // Both quiet moves - no specific ordering
        return 0;
    });
    // NOTE: Aggressive pruning removed - search all legal moves to prevent blunders
    // Previously limited to top 10-15 moves, which was cutting defensive moves

    for (const move of sortedMoves) {
        // Check time limit before processing each move
        if (timeControl) {
            const elapsed = Date.now() - timeControl.startTime;
            if (elapsed >= timeControl.maxTimeMs) {
                return {
                    score: bestScore,
                    move: bestMove,
                    nodesEvaluated,
                    timedOut: true,
                };
            }
        }

        try {
            game.makeMove(move);

            const result = alphaBeta(
                game,
                depth - 1,
                alpha,
                beta,
                !maximizingPlayer,
                playerColor,
                timeControl,
                null,
                transpositionTable,
                false,
            );

            game.undoInternal();
            nodesEvaluated += result.nodesEvaluated;

            if (result.timedOut) {
                return {
                    score: bestScore,
                    move: bestMove,
                    nodesEvaluated,
                    timedOut: true,
                };
            }

            let moveScore = result.score;
            // Apply reversing move penalty at root level
            if (isRootLevel && lastMove !== null && isReversingMove(move, lastMove)) {
                moveScore += MOVE_PENALTIES.reversingMove;
            }

            if (maximizingPlayer) {
                if (moveScore > bestScore) {
                    bestScore = moveScore;
                    bestMove = move;
                }
                alpha = Math.max(alpha, bestScore);
            } else {
                if (moveScore < bestScore) {
                    bestScore = moveScore;
                    bestMove = move;
                }
                beta = Math.min(beta, bestScore);
            }


            if (beta <= alpha) {
                break;
            }
        } catch {
            continue;
        }
    }

    // Store result in transposition table (if enabled)
    if (depth > 1 && useTT) {
        let bound = BoundType.EXACT;
        if (bestScore <= originalAlpha) bound = BoundType.UPPER_BOUND;
        else if (bestScore >= originalBeta) bound = BoundType.LOWER_BOUND;
        transpositionTable!.put(positionKey, depth, bestScore, bound, bestMove);
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
 * @param aspirationAlpha - Optional alpha for aspiration window (narrower search window)
 * @param aspirationBeta - Optional beta for aspiration window (narrower search window)
 * @returns { move: Object, score: number, nodesEvaluated: number, timedOut: boolean, aspirationFailed: boolean }
 */
export function findBestMove(
    gameOrSnapshot: CoralClash | GameStateSnapshot,
    depth: number,
    playerColor: Color,
    timeControl: TimeControl | null = null,
    lastMove: LastMoveInfo | null = null,
    transpositionTable: TranspositionTable | null = null,
    aspirationAlpha: number | null = null,
    aspirationBeta: number | null = null,
): AlphaBetaResult & { aspirationFailed?: boolean } {
    let game: CoralClash;

    // Handle GameStateSnapshot for backwards compatibility
    if (!(gameOrSnapshot instanceof CoralClash)) {
        const restored = safeRestoreGame(gameOrSnapshot as GameStateSnapshot);
        if (!restored) {
            return {
                score: 0,
                move: null,
                nodesEvaluated: 0,
                timedOut: false,
                aspirationFailed: false,
            };
        }
        game = restored;
    } else {
        game = gameOrSnapshot;
    }

    // Determine if we're maximizing (our turn) or minimizing (opponent's turn)
    const currentTurn = game.turn();
    const maximizingPlayer = currentTurn === playerColor;

    // Use aspiration window if provided, otherwise use full window
    const alpha = aspirationAlpha !== null ? aspirationAlpha : -Infinity;
    const beta = aspirationBeta !== null ? aspirationBeta : Infinity;

    const result = alphaBeta(
        game,
        depth,
        alpha,
        beta,
        maximizingPlayer,
        playerColor,
        timeControl,
        lastMove,
        transpositionTable,
        true, // This is the root level
    );

    // Convert InternalMove to pretty move format if called with a snapshot for backwards compatibility
    if (!(gameOrSnapshot instanceof CoralClash) && result.move) {
        result.move = {
            from: algebraic(result.move.from),
            to: algebraic(result.move.to),
            promotion: result.move.promotion,
            whaleSecondSquare:
                result.move.whaleOtherSquare !== undefined
                    ? algebraic(result.move.whaleOtherSquare)
                    : undefined,
            coralPlaced: result.move.coralPlaced,
            coralRemoved: result.move.coralRemoved,
            coralRemovedSquares: result.move.coralRemovedSquares
                ? result.move.coralRemovedSquares.map((sq: number) => algebraic(sq))
                : undefined,
        };
    }

    // Check if aspiration window failed (score outside window)
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
/**
 * Sort moves based on scores from previous iteration
 * @param moves - List of moves to sort
 * @param scores - List of scores from previous iteration
 * @returns Sorted moves
 */
function sortMovesByScores(moves: any[], scores: { move: any; score: number }[]) {
    if (!scores || scores.length === 0) return moves;
    
    // Create a map for fast lookup
    // Keying by 'from-to' to identify moves
    const scoreMap = new Map<string, number>();
    for (const s of scores) {
        // Simple key: from-to
        const key = `${s.move.from}-${s.move.to}`;
        scoreMap.set(key, s.score);
    }

    return [...moves].sort((a, b) => {
        const keyA = `${a.from}-${a.to}`;
        const keyB = `${b.from}-${b.to}`;
        const scoreA = scoreMap.get(keyA) ?? -Infinity;
        const scoreB = scoreMap.get(keyB) ?? -Infinity;
        return scoreB - scoreA; // Descending order
    });
}

/**
 * Find best move using iterative deepening with time control
 * @param gameState - Current game state
 * @param maxDepth - Maximum depth to search to
 * @param playerColor - Color we're playing for ('w' or 'b')
 * @param maxTimeMs - Maximum time to spend in milliseconds
 * @param progressCallback - Optional callback for progress updates (depth, nodesEvaluated, elapsedMs)
 * @param lastMove - Last move made (for detecting reversing moves)
 * @param difficulty - Difficulty level for time management and Softmax behavior
 * @param randomSeed - Optional random seed for deterministic Softmax selection (for testing)
 * @returns { move: Object, score: number, nodesEvaluated: number, depth: number, elapsedMs: number }
 */
export function findBestMoveIterativeDeepening(
    gameState: GameStateSnapshot,
    maxDepth: number,
    playerColor: Color,
    maxTimeMs: number = TIME_CONTROL.easy.maxTimeMs,
    progressCallback: ProgressCallback | null = null,
    lastMove: LastMoveInfo | null = null,
    difficulty: 'easy' | 'medium' | 'hard' = 'medium',
    randomSeed?: number, // Optional seed for deterministic testing
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
    let bestDepth = 0;
    
    // Store scores for all root moves from the last fully completed depth
    // This allows us to apply Softmax selection on the final candidates
    let rootMoveScores: { move: any, score: number }[] = [];

    // Get initial legal moves as fallback
    const initialMoves = game.internalMoves();
    if (initialMoves.length === 0) {
        return {
            move: null,
            score: 0,
            nodesEvaluated: 0,
            depth: 0,
            elapsedMs: Date.now() - startTime,
        };
    }
    let fallbackMove = initialMoves[Math.floor(Math.random() * initialMoves.length)];

    // Defensive check: Ensure maxTimeMs is a valid positive number
    // If NaN, infinite, or non-positive, fallback to the default max time for the difficulty
    let safeMaxTimeMs = maxTimeMs;
    if (!Number.isFinite(safeMaxTimeMs) || safeMaxTimeMs <= 0) {
        safeMaxTimeMs = TIME_CONTROL[difficulty]?.maxTimeMs || TIME_CONTROL.easy.maxTimeMs;
        // console.warn(`[AI] Invalid maxTimeMs (${maxTimeMs}) detected, using default: ${safeMaxTimeMs}ms`);
    }

    const timeControl: TimeControl = {
        startTime,
        maxTimeMs: safeMaxTimeMs,
    };

    // Iterative deepening

    for (let depth = 1; depth <= maxDepth; depth++) {
        // Check timeout
        const elapsed = Date.now() - startTime;
        if (elapsed >= maxTimeMs) {
            if (!bestMove) bestMove = fallbackMove;
            break;
        }

        // For Softmax Selection, we need scores for ALL root moves (or at least top candidates)
        // Standard alpha-beta only gives us the best score (and bounds for others)
        // So we run a specialized root search that collects exact scores
        let iterScores: { move: any, score: number }[] = [];
        let iterBestScore = -Infinity;
        let iterBestMove: any = null;
        let iterNodes = 0;
        let iterTimedOut = false;

        // Sort moves based on previous iteration to improve pruning efficiency
        const movesToSearch = depth === 1 
            ? initialMoves 
            : sortMovesByScores(initialMoves, rootMoveScores);

        // ROOT SEARCH LOOP
        // When Softmax is enabled: Use narrower window for performance
        // When Softmax is disabled: Use full window for deterministic best move (original behavior)
        
        // Determine if we're using Softmax pruning
        const useSoftmaxPruning = SOFTMAX_SELECTION.enabled && (randomSeed === undefined || randomSeed >= 0);
        
        for (const move of movesToSearch) {
            // Check timeout between root moves
            if (Date.now() - startTime >= maxTimeMs) {
                iterTimedOut = true;
                break;
            }

            game.makeMove(move);

            let searchAlpha = -Infinity;
            let searchBeta = Infinity;

            if (useSoftmaxPruning) {
                const windowSize = SOFTMAX_SELECTION.scoreWindow + 500;
                if (playerColor === 'w') {
                    // White (Maximizer): We only care about scores > (best - window)
                    // If best is +500, we prune anything below +400.
                    // This is a Lower Bound (Alpha).
                    searchAlpha = bestScore - windowSize;
                } else {
                    // Black (Minimizer): We only care about scores < (best + window)
                    // If best is -500, we prune anything above -400.
                    // This is an Upper Bound (Beta).
                    searchBeta = bestScore + windowSize;
                }
            }

            const result = alphaBeta(
                game,
                depth - 1,
                searchAlpha,  // Pass the correct lower bound
                searchBeta,   // Pass the correct upper bound
                playerColor === game.turn(),
                playerColor,
                timeControl,
                null,
                transpositionTable,
                false
            );

            game.undoInternal();
            iterNodes += result.nodesEvaluated;

            if (result.timedOut) {
                iterTimedOut = true;
                break;
            }

            let moveScore = result.score;
            
            // Apply reversing move penalty at root level
            if (lastMove !== null && isReversingMove(move, lastMove)) {
                moveScore += MOVE_PENALTIES.reversingMove;
            }

            iterScores.push({ move, score: moveScore });

            if (moveScore > iterBestScore) {
                iterBestScore = moveScore;
                iterBestMove = move;
            }
        }

        if (iterTimedOut) {
            // If timed out during root iteration, we might have partial results
            // If we found a new best move in this partial search, maybe use it?
            // Safer to stick with previous completed depth's best move
            if (!bestMove) {
                bestMove = iterBestMove || fallbackMove;
                bestScore = iterBestScore;
            }
            break;
        }

        // Depth completed successfully
        rootMoveScores = iterScores;
        bestMove = iterBestMove;
        bestScore = iterBestScore;
        bestDepth = depth;
        totalNodesEvaluated += iterNodes;

        if (progressCallback) {
            progressCallback(depth, totalNodesEvaluated, Date.now() - startTime, bestMove !== null);
        }

        if (Math.abs(bestScore) > 90000) break; // Checkmate found
    }

    const totalElapsed = Date.now() - startTime;

    // Softmax Selection Logic
    // If enabled, pick a move probabilistically based on scores
    // Disable if randomSeed is negative (for deterministic testing)
    const softmaxEnabled = SOFTMAX_SELECTION.enabled && (randomSeed === undefined || randomSeed >= 0);
    if (softmaxEnabled && rootMoveScores.length > 0) {
        // Use difficulty-specific temperature
        const temp = SOFTMAX_SELECTION.temperature[difficulty];
        
        // Filter moves that are close enough to the best score
        const threshold = bestScore - SOFTMAX_SELECTION.scoreWindow;
        const candidates = rootMoveScores.filter(s => s.score >= threshold);
        
        if (candidates.length > 1) {
            // Calculate exponentials
            // Shift scores by max score to avoid overflow (e^x / sum e^x == e^(x-c) / sum e^(x-c))
            const maxScore = Math.max(...candidates.map(c => c.score));
            const weights = candidates.map(c => Math.exp((c.score - maxScore) / temp));
            const totalWeight = weights.reduce((a, b) => a + b, 0);
            
            // Random sampling (use seed if provided for deterministic testing)
            let randomValue: number;
            if (randomSeed !== undefined) {
                // Simple seeded random: mulberry32 algorithm
                let seed = randomSeed;
                seed = (seed + 0x6D2B79F5) | 0;
                let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
                t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
                randomValue = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
            } else {
                randomValue = Math.random();
            }
            
            let random = randomValue * totalWeight;
            for (let i = 0; i < candidates.length; i++) {
                random -= weights[i];
                if (random <= 0) {
                    bestMove = candidates[i].move;
                    bestScore = candidates[i].score;
                    break;
                }
            }
        }
    }

    if (!bestMove) bestMove = fallbackMove;

    // Convert InternalMove to pretty move format that game.move() expects
    const prettyMove: any = {
        from: algebraic(bestMove.from),
        to: algebraic(bestMove.to),
    };

    if (bestMove.promotion) {
        prettyMove.promotion = bestMove.promotion;
    }
    if (bestMove.whaleOtherSquare !== undefined) {
        prettyMove.whaleSecondSquare = algebraic(bestMove.whaleOtherSquare);
    }
    if (bestMove.coralPlaced !== undefined) {
        prettyMove.coralPlaced = bestMove.coralPlaced;
    }
    if (bestMove.coralRemoved !== undefined) {
        prettyMove.coralRemoved = bestMove.coralRemoved;
    }
    if (bestMove.coralRemovedSquares) {
        prettyMove.coralRemovedSquares = bestMove.coralRemovedSquares.map((sq: number) =>
            algebraic(sq),
        );
    }

    // CRITICAL: Validate that the move is actually valid in the current game state
    // The game state might have changed during search, or the move might have been from a different position
    // We must ensure we only return moves that are currently legal
    // Restore game state from snapshot to ensure we're validating against the correct state
    const validationGame = safeRestoreGame(gameState);
    if (!validationGame) {
        // If we can't restore, fall back to first legal move from original game
        const fallbackMoves = game.moves({ verbose: true });
        if (fallbackMoves.length > 0) {
            const fallback = fallbackMoves[Math.floor(Math.random() * fallbackMoves.length)];
            return {
                move: {
                    from: fallback.from,
                    to: fallback.to,
                    promotion: fallback.promotion,
                    whaleSecondSquare: fallback.whaleSecondSquare,
                    coralPlaced: fallback.coralPlaced,
                    coralRemoved: fallback.coralRemoved,
                    coralRemovedSquares: fallback.coralRemovedSquares,
                },
                score: bestScore === -Infinity ? 0 : bestScore,
                nodesEvaluated: totalNodesEvaluated,
                depth: bestDepth,
                elapsedMs: totalElapsed,
            };
        }
    }
    const currentLegalMoves = validationGame!.moves({ verbose: true });
    const isValidMove = currentLegalMoves.some((m: any) => {
        if (m.from !== prettyMove.from || m.to !== prettyMove.to) return false;
        if (m.promotion !== prettyMove.promotion) return false;
        if (m.whaleSecondSquare !== prettyMove.whaleSecondSquare) return false;

        // Check coral flags match exactly (only if explicitly set in prettyMove)
        // Note: prettyMove always has these properties, so we check if they're not undefined
        if (prettyMove.coralPlaced !== undefined && m.coralPlaced !== prettyMove.coralPlaced)
            return false;
        if (prettyMove.coralRemoved !== undefined && m.coralRemoved !== prettyMove.coralRemoved)
            return false;
        if (prettyMove.coralRemovedSquares && prettyMove.coralRemovedSquares.length > 0) {
            const moveSquares = (m.coralRemovedSquares || []).sort().join(',');
            const prettySquares = prettyMove.coralRemovedSquares.sort().join(',');
            if (moveSquares !== prettySquares) return false;
        }

        return true;
    });

    // If move is invalid, find a valid alternative
    if (!isValidMove) {
        // Try to find a move with the same from/to but different coral flags
        const alternativeMove = currentLegalMoves.find(
            (m: any) => m.from === prettyMove.from && m.to === prettyMove.to,
        );

        if (alternativeMove) {
            // Use the alternative move (with correct coral flags)
            return {
                move: {
                    from: alternativeMove.from,
                    to: alternativeMove.to,
                    promotion: alternativeMove.promotion,
                    whaleSecondSquare: alternativeMove.whaleSecondSquare,
                    coralPlaced: alternativeMove.coralPlaced,
                    coralRemoved: alternativeMove.coralRemoved,
                    coralRemovedSquares: alternativeMove.coralRemovedSquares,
                },
                score: bestScore === -Infinity ? 0 : bestScore,
                nodesEvaluated: totalNodesEvaluated,
                depth: bestDepth,
                elapsedMs: totalElapsed,
            };
        }

        // If no alternative found with same from/to, fall back to first legal move
        // This should never happen, but provides a safety net
        if (currentLegalMoves.length > 0) {
            const fallback = currentLegalMoves[Math.floor(Math.random() * currentLegalMoves.length)];
            return {
                move: {
                    from: fallback.from,
                    to: fallback.to,
                    promotion: fallback.promotion,
                    whaleSecondSquare: fallback.whaleSecondSquare,
                    coralPlaced: fallback.coralPlaced,
                    coralRemoved: fallback.coralRemoved,
                    coralRemovedSquares: fallback.coralRemovedSquares,
                },
                score: bestScore === -Infinity ? 0 : bestScore,
                nodesEvaluated: totalNodesEvaluated,
                depth: bestDepth,
                elapsedMs: totalElapsed,
            };
        } else {
            // No legal moves available - this shouldn't happen, but return null move
            return {
                move: null,
                score: bestScore === -Infinity ? 0 : bestScore,
                nodesEvaluated: totalNodesEvaluated,
                depth: bestDepth,
                elapsedMs: totalElapsed,
            };
        }
    }

    return {
        move: prettyMove,
        score: bestScore === -Infinity ? 0 : bestScore,
        nodesEvaluated: totalNodesEvaluated,
        depth: bestDepth,
        elapsedMs: totalElapsed,
    };
}
