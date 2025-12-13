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
 */
export interface LastMoveInfo {
    from: string;
    to: string;
    piece: string;
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
function generatePositionKey(gameState: GameStateSnapshot): number {
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
 * Check if a move reverses the previous move (moving a piece back to where it just came from)
 * @param move - Current move candidate
 * @param lastMove - Last move made (null if no previous move)
 * @returns boolean indicating if this is a reversing move
 */
function isReversingMove(move: any, lastMove: LastMoveInfo | null): boolean {
    if (!lastMove) {
        return false;
    }

    // Check if this move moves the same piece from the last move's destination back to its origin
    // This happens when: currentMove.from === lastMove.to && currentMove.to === lastMove.from && currentMove.piece === lastMove.piece
    return (
        move.from === lastMove.to &&
        move.to === lastMove.from &&
        move.piece?.toLowerCase() === lastMove.piece?.toLowerCase()
    );
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
 * @returns Evaluation score
 */
export function evaluatePosition(gameState: GameStateSnapshot, playerColor: Color): number {
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
            const captures = allMoves.filter((m) => m.captured);

            // If there are captures, do quiescence search (only on captures)
            if (captures.length > 0) {
                // Quiescence search: only search captures, limited depth to avoid infinite loops
                const quiescenceDepth = 2; // Maximum quiescence depth
                let bestScore = evaluatePosition(gameState, playerColor);
                const standPat = maximizingPlayer ? bestScore : -bestScore;

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
                    const moveResult = game.move({
                        from: capture.from,
                        to: capture.to,
                        promotion: capture.promotion,
                        coralPlaced: capture.coralPlaced,
                        coralRemoved: capture.coralRemoved,
                        coralRemovedSquares: capture.coralRemovedSquares,
                    });

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
                    );

                    game.undo();

                    if (result.timedOut) {
                        return { score: standPat, move: null, nodesEvaluated: 1, timedOut: true };
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
                    nodesEvaluated: 1,
                    timedOut: false,
                };
            }
        }

        // No captures or game over - evaluate position normally
        const score = evaluatePosition(gameState, playerColor);
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

    const moves = game.moves({ verbose: true });

    if (moves.length === 0) {
        // No legal moves - terminal state
        const score = evaluatePosition(gameState, playerColor);
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

    // Sort moves for better pruning - prioritize captures and moves that protect valuable pieces
    // This helps alpha-beta pruning work more effectively
    const sortedMoves = [...moves].sort((a, b) => {
        // Prioritize captures (especially of valuable pieces)
        if (a.captured && !b.captured) return -1;
        if (!a.captured && b.captured) return 1;
        if (a.captured && b.captured) {
            // Both are captures - prioritize capturing more valuable pieces
            // Note: capturedRole might not be available in Move type, use null as fallback
            const aValue = getPieceValue(a.captured, (a as any).capturedRole || null);
            const bValue = getPieceValue(b.captured, (b as any).capturedRole || null);
            return bValue - aValue; // Higher value first
        }
        // For non-captures, prioritize moves that protect valuable pieces
        // (This is a heuristic - we can't easily check this without making the move)
        // For now, just prioritize captures
        return 0;
    });

    for (const move of sortedMoves) {
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

        let moveScore = result.score;

        // Apply reversing move penalty only at root level (when lastMove is provided and we're at maximum depth)
        // We detect root level by checking if lastMove is provided - it's only passed at the root
        if (lastMove !== null && isReversingMove(move, lastMove)) {
            moveScore += MOVE_PENALTIES.reversingMove;
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
 * @returns { move: Object, score: number, nodesEvaluated: number, depth: number, elapsedMs: number }
 */
export function findBestMoveIterativeDeepening(
    gameState: GameStateSnapshot,
    maxDepth: number,
    playerColor: Color,
    maxTimeMs: number = TIME_CONTROL.maxTimeMs,
    progressCallback: ProgressCallback | null = null,
    lastMove: LastMoveInfo | null = null,
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
    for (let depth = 1; depth <= maxDepth; depth++) {
        // Check timeout before starting this depth
        const elapsed = Date.now() - startTime;
        if (elapsed >= maxTimeMs) {
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
            // If depth 1 timed out and we have no previous result, use fallback
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
