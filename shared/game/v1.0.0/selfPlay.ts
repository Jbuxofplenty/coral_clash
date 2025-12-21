/**
 * Self-Play Simulation for Generating Evaluation Tables
 *
 * Runs computer vs computer games to generate position evaluations
 * that can be stored in evaluation tables for faster AI evaluation.
 */

import { CoralClash, type Color } from './coralClash.js';
import { createGameSnapshot, restoreGameFromSnapshot } from './gameState.js';
import type { GameStateSnapshot } from './aiEvaluation.js';
import { evaluatePosition, findBestMoveIterativeDeepening, generatePositionKey } from './aiEvaluation.js';
import { EvaluationTable, type DifficultyLevel, type StoredMove } from './evaluationTable.js';

/**
 * Configuration for self-play simulation
 */
export interface SelfPlayConfig {
    /** Maximum number of games to play */
    maxGames?: number;
    /** Maximum time to spend in milliseconds */
    maxTimeMs?: number;
    /** Maximum search depth for move selection */
    maxDepth?: number;
    /** Whether to collect evaluations from all positions or just unique ones */
    collectAllPositions?: boolean;
    /** Whether to use random moves for one player (true) or AI vs AI (false) */
    useRandomOpponent?: boolean;
    /** Which player uses AI (if useRandomOpponent is true): 'w' for white, 'b' for black, 'alternating' for alternating */
    aiPlayer?: 'w' | 'b' | 'alternating';
    /** Callback for progress updates */
    progressCallback?: (progress: SelfPlayProgress) => Promise<void> | void;
    /** Optional callback to save table incrementally (called after each game) */
    saveCallback?: (table: EvaluationTable) => Promise<void>;
    /** Optional existing table to resume from (if not provided, creates a new one) */
    initialTable?: EvaluationTable;
    /** Use breadth-first search instead of self-play games (for maximizing early-move cache hits) */
    useBreadthFirst?: boolean;
    /** Maximum depth for BFS exploration */
    maxBreadthFirstDepth?: number;
    /** Force re-evaluation of all positions even if cached (useful when migrating from old evaluation version) */
    forceReevaluate?: boolean;
}

/**
 * Progress information for self-play simulation
 */
export interface SelfPlayProgress {
    /** Number of games completed */
    gamesCompleted: number;
    /** Number of positions evaluated */
    positionsEvaluated: number;
    /** Number of unique positions in table */
    uniquePositions: number;
    /** Elapsed time in milliseconds */
    elapsedMs: number;
    /** Current game number */
    currentGame: number;
    /** Whether simulation is complete */
    isComplete: boolean;
}

/**
 * Result from self-play simulation
 */
export interface SelfPlayResult {
    /** Evaluation table populated with position evaluations */
    table: EvaluationTable;
    /** Statistics about the simulation */
    stats: {
        gamesPlayed: number;
        totalPositions: number;
        uniquePositions: number;
        averageGameLength: number;
        elapsedMs: number;
    };
}

/**
 * Run breadth-first search to generate evaluation table
 * Explores positions level by level, maximizing coverage of early positions
 * @param config - Configuration for the simulation
 * @returns Evaluation table populated with position evaluations
 */
export async function runBreadthFirstGeneration(config: SelfPlayConfig = {}): Promise<SelfPlayResult> {
    const {
        maxTimeMs = 2 * 60 * 60 * 1000, // 2 hours default
        maxBreadthFirstDepth = 4, // Default to 4 plies (2 moves per player)
        progressCallback,
        initialTable,
        saveCallback,
        forceReevaluate = false,
    } = config;

    const table = initialTable || new EvaluationTable();
    const startTime = Date.now();
    let totalPositions = 0;
    const visitedPositions = new Set<number>(); // Track positions we've already processed

    // Queue for BFS: [gameState, depth]
    type QueueItem = { gameState: GameStateSnapshot; depth: number };
    const queue: QueueItem[] = [];

    // Start with initial position
    const initialGame = new CoralClash();
    const initialGameState = createGameSnapshot(initialGame);
    const initialKey = generatePositionKey(initialGameState);
    queue.push({ gameState: initialGameState, depth: 0 });
    visitedPositions.add(initialKey);

    let currentDepth = 0;
    let positionsProcessedAtCurrentDepth = 0;

    const hasTimeLimit = maxTimeMs !== Infinity && maxTimeMs !== undefined;
    while (queue.length > 0 && (!hasTimeLimit || Date.now() - startTime < maxTimeMs)) {
        const item = queue.shift();
        if (!item) break;

        const { gameState, depth } = item;

        // Check if we've exceeded max depth
        if (depth >= maxBreadthFirstDepth) {
            continue;
        }

        // Track depth changes for progress reporting
        if (depth > currentDepth) {
            currentDepth = depth;
            positionsProcessedAtCurrentDepth = 0;
        }

        const positionKey = generatePositionKey(gameState);
        
        // Check if we already have this position cached
        // Re-evaluate if: forceReevaluate is true OR position is marked as outdated
        const cachedMoves = forceReevaluate || table.isOutdated(positionKey) ? null : table.getMoves(positionKey, 'easy');
        if (cachedMoves === null) {
            // Not cached - evaluate moves and store top 3
            const game = new CoralClash();
            restoreGameFromSnapshot(game, gameState);

            const currentTurn = game.turn();
            const legalMoves = game.moves({ verbose: true });
            
            if (legalMoves.length > 0) {
                const moveScores: Array<{ move: any; score: number }> = [];
                
                for (const move of legalMoves) {
                    try {
                        const moveResult = game.move({
                            from: move.from,
                            to: move.to,
                            promotion: move.promotion,
                            coralPlaced: move.coralPlaced,
                            coralRemoved: move.coralRemoved,
                            coralRemovedSquares: move.coralRemovedSquares,
                        });
                        
                        if (moveResult) {
                            const newGameState = createGameSnapshot(game);
                            // Evaluate position after move (from opponent's perspective, then negate)
                            const opponentColor: Color = currentTurn === 'w' ? 'b' : 'w';
                            const score = evaluatePosition(newGameState, opponentColor, null);
                            // Negate score because we're evaluating from opponent's perspective
                            moveScores.push({ move, score: -score });
                            
                            // Add to queue for next depth level (if not already visited)
                            if (depth < maxBreadthFirstDepth - 1) {
                                const newPositionKey = generatePositionKey(newGameState);
                                if (!visitedPositions.has(newPositionKey)) {
                                    visitedPositions.add(newPositionKey);
                                    queue.push({ gameState: newGameState, depth: depth + 1 });
                                }
                            }
                            
                            game.undo();
                        }
                    } catch (_error) {
                        // Invalid move - skip it
                        continue;
                    }
                }
                
                // Sort by score (descending - best first)
                moveScores.sort((a, b) => b.score - a.score);
                
                // Store top 3 moves
                const topMoves: StoredMove[] = moveScores.slice(0, 3).map(({ move }) => ({
                    from: move.from,
                    to: move.to,
                    ...(move.promotion && { promotion: move.promotion }),
                    ...(move.coralPlaced !== undefined && { coralPlaced: move.coralPlaced }),
                    ...(move.coralRemoved !== undefined && { coralRemoved: move.coralRemoved }),
                    ...(move.coralRemovedSquares && { coralRemovedSquares: move.coralRemovedSquares }),
                }));
                
                table.setMoves(positionKey, topMoves);
                totalPositions++;
            }
        } else {
            // Already cached - still need to explore children if not at max depth
            if (depth < maxBreadthFirstDepth - 1) {
                const game = new CoralClash();
                restoreGameFromSnapshot(game, gameState);
                const legalMoves = game.moves({ verbose: true });
                for (const move of legalMoves) {
                    try {
                        const moveResult = game.move({
                            from: move.from,
                            to: move.to,
                            promotion: move.promotion,
                            coralPlaced: move.coralPlaced,
                            coralRemoved: move.coralRemoved,
                            coralRemovedSquares: move.coralRemovedSquares,
                        });
                        
                        if (moveResult) {
                            const newGameState = createGameSnapshot(game);
                            const newPositionKey = generatePositionKey(newGameState);
                            if (!visitedPositions.has(newPositionKey)) {
                                visitedPositions.add(newPositionKey);
                                queue.push({ gameState: newGameState, depth: depth + 1 });
                            }
                            game.undo();
                        }
                    } catch {
                        continue;
                    }
                }
            }
        }

        positionsProcessedAtCurrentDepth++;

        // Report progress periodically
        if (progressCallback && (positionsProcessedAtCurrentDepth % 10 === 0 || queue.length === 0)) {
            const elapsedMs = Date.now() - startTime;
            await progressCallback({
                gamesCompleted: currentDepth + 1, // Use depth as "game" counter
                positionsEvaluated: totalPositions,
                uniquePositions: table.size(),
                elapsedMs,
                currentGame: currentDepth + 1,
                isComplete: queue.length === 0 || elapsedMs >= maxTimeMs,
            });
        }

        // Incremental save callback
        if (saveCallback && totalPositions % 50 === 0) {
            try {
                await saveCallback(table);
            } catch (_saveErr) {
                // Ignore save errors during generation
            }
        }

        // Small delay to allow other operations
        if (totalPositions % 100 === 0) {
            await new Promise((resolve) => setTimeout(resolve, 0));
        }
    }

    const elapsedMs = Date.now() - startTime;

    return {
        table,
        stats: {
            gamesPlayed: currentDepth + 1,
            totalPositions,
            uniquePositions: table.size(),
            averageGameLength: 0, // Not applicable for BFS
            elapsedMs,
        },
    };
}

/**
 * Run self-play simulation to generate evaluation table
 * @param config - Configuration for the simulation
 * @returns Evaluation table populated with position evaluations
 */
export async function runSelfPlaySimulation(config: SelfPlayConfig = {}): Promise<SelfPlayResult> {
    // If BFS mode is requested, use that instead
    if (config.useBreadthFirst) {
        return runBreadthFirstGeneration(config);
    }
    const {
        maxGames = 10,
        maxTimeMs = 5 * 60 * 1000, // 5 minutes default
        maxDepth = 6,
        collectAllPositions = false,
        useRandomOpponent = true, // Default to AI vs random for better exploration
        aiPlayer = 'w', // Default: white uses AI, black is random
        progressCallback,
        initialTable,
        forceReevaluate = false,
    } = config;

    // Use existing table if provided, otherwise create a new one
    const table = initialTable || new EvaluationTable();
    const startTime = Date.now();
    let gamesPlayed = 0;
    let totalPositions = 0;
    let totalMoves = 0;

    // Play games until we hit maxGames or maxTimeMs (Infinity means no limit)
    const hasGameLimit = maxGames !== Infinity && maxGames !== undefined;
    const hasTimeLimit = maxTimeMs !== Infinity && maxTimeMs !== undefined;
    while (
        (!hasGameLimit || gamesPlayed < maxGames) &&
        (!hasTimeLimit || Date.now() - startTime < maxTimeMs)
    ) {
        const game = new CoralClash();
        let movesInGame = 0;
        const positionsInGame = new Set<number>(); // Track unique positions per game
        const tableSizeBeforeGame = table.size(); // Track table size before this game
        
        // Determine which player uses AI for this game
        let currentAiPlayer: 'w' | 'b';
        if (useRandomOpponent) {
            if (aiPlayer === 'alternating') {
                // Alternate AI player each game
                currentAiPlayer = gamesPlayed % 2 === 0 ? 'w' : 'b';
            } else {
                currentAiPlayer = aiPlayer;
            }
        } else {
            // Both players use AI
            currentAiPlayer = 'w'; // Not used when both are AI
        }

        // Play one game
        while (!game.isGameOver() && Date.now() - startTime < maxTimeMs) {
            const currentTurn = game.turn();
            const gameState = createGameSnapshot(game);

            // Generate position hash
            const positionKey = generatePositionKey(gameState);

            // Collect top moves for this position
            // Only store if we haven't seen this position in this game (if collectAllPositions is false)
            const wasNewPosition = collectAllPositions || !positionsInGame.has(positionKey);
            if (wasNewPosition) {
                // Check if we already have this position cached
                // Re-evaluate if: forceReevaluate is true OR position is marked as outdated
                const isOutdated = table.isOutdated(positionKey);
                const cachedMoves = forceReevaluate || isOutdated ? null : table.getMoves(positionKey, 'easy'); // Get all moves to check if cached
                if (cachedMoves === null) {
                    // Not cached or outdated - evaluate moves and store top 3
                    const evalColor = useRandomOpponent ? currentAiPlayer : currentTurn;
                    
                    // Get all legal moves
                    const legalMoves = game.moves({ verbose: true });
                    if (legalMoves.length > 0) {
                        // Evaluate each move with shallow search to get scores
                        // Prioritize moves that lead to outdated positions
                        const moveScores: Array<{ move: any; score: number; leadsToOutdated?: boolean }> = [];
                        
                        for (const move of legalMoves) {
                            // Try to make the move - wrap in try-catch since game.moves() can return pseudo-legal moves
                            try {
                                const moveResult = game.move({
                                    from: move.from,
                                    to: move.to,
                                    promotion: move.promotion,
                                    coralPlaced: move.coralPlaced,
                                    coralRemoved: move.coralRemoved,
                                    coralRemovedSquares: move.coralRemovedSquares,
                                });
                                
                                if (moveResult) {
                                    const newGameState = createGameSnapshot(game);
                                    const newPositionKey = generatePositionKey(newGameState);
                                    // Check if this move leads to an outdated position
                                    const leadsToOutdated = table.isOutdated(newPositionKey);
                                    
                                    // Evaluate position after move (from opponent's perspective, then negate)
                                    const opponentColor: Color = evalColor === 'w' ? 'b' : 'w';
                                    const score = evaluatePosition(newGameState, opponentColor, null);
                                    // Negate score because we're evaluating from opponent's perspective
                                    moveScores.push({ move, score: -score, leadsToOutdated });
                                    game.undo();
                                }
                            } catch (_error) {
                                // Invalid move - skip it (game.moves() can return pseudo-legal moves)
                                // Don't log to avoid spam
                                continue;
                            }
                        }
                        
                        // Sort moves: prioritize moves that lead to outdated positions, then by score
                        moveScores.sort((a, b) => {
                            // First priority: moves leading to outdated positions
                            if (a.leadsToOutdated && !b.leadsToOutdated) return -1;
                            if (!a.leadsToOutdated && b.leadsToOutdated) return 1;
                            // Second priority: score (descending - best first)
                            return b.score - a.score;
                        });
                        
                        // Store top 3 moves
                        const topMoves: StoredMove[] = moveScores.slice(0, 3).map(({ move }) => ({
                            from: move.from,
                            to: move.to,
                            ...(move.promotion && { promotion: move.promotion }),
                            ...(move.coralPlaced !== undefined && { coralPlaced: move.coralPlaced }),
                            ...(move.coralRemoved !== undefined && { coralRemoved: move.coralRemoved }),
                            ...(move.coralRemovedSquares && { coralRemovedSquares: move.coralRemovedSquares }),
                        }));
                        
                        table.setMoves(positionKey, topMoves);
                        totalPositions++;
                    }
                } else {
                    // Already cached - just count it
                    totalPositions++;
                }
                positionsInGame.add(positionKey);
            }

            let moveResult;
            
            // Determine move: AI or random
            if (!useRandomOpponent || currentTurn === currentAiPlayer) {
                // Use AI to find best move
                const result = findBestMoveIterativeDeepening(
                    gameState,
                    maxDepth,
                    currentTurn,
                    Math.min(2000, maxTimeMs / 10), // Use 10% of total time per move, max 2 seconds
                    null, // progressCallback
                    null, // lastMove
                    table, // Pass evaluation table for caching
                );

                if (!result.move) {
                    // No move found - game might be over or error occurred
                    break;
                }

                // Make the AI move - validate it's still legal
                try {
                    // Verify move is still legal before attempting
                    const currentLegalMoves = game.moves({ verbose: true });
                    const isValidMove = currentLegalMoves.some(
                        (m) =>
                            m.from === result.move.from &&
                            m.to === result.move.to &&
                            m.promotion === result.move.promotion &&
                            m.coralPlaced === result.move.coralPlaced &&
                            m.coralRemoved === result.move.coralRemoved,
                    );
                    
                    if (isValidMove) {
                        moveResult = game.move({
                            from: result.move.from,
                            to: result.move.to,
                            promotion: result.move.promotion,
                            coralPlaced: result.move.coralPlaced,
                            coralRemoved: result.move.coralRemoved,
                            coralRemovedSquares: result.move.coralRemovedSquares,
                        });
                    } else {
                        // Stored move is no longer valid - fall back to random
                        console.warn('Stored move is no longer valid, using random move');
                        const fallbackMoves = game.moves({ verbose: true });
                        if (fallbackMoves.length > 0) {
                            const randomMove = fallbackMoves[Math.floor(Math.random() * fallbackMoves.length)];
                            moveResult = game.move({
                                from: randomMove.from,
                                to: randomMove.to,
                                promotion: randomMove.promotion,
                                coralPlaced: randomMove.coralPlaced,
                                coralRemoved: randomMove.coralRemoved,
                                coralRemovedSquares: randomMove.coralRemovedSquares,
                            });
                        }
                    }
                } catch (error: any) {
                    // Move failed - fall back to random
                    console.warn(`AI move failed: ${error?.message || String(error)}, using random move`);
                    const fallbackMoves = game.moves({ verbose: true });
                    if (fallbackMoves.length > 0) {
                        const randomMove = fallbackMoves[Math.floor(Math.random() * fallbackMoves.length)];
                        moveResult = game.move({
                            from: randomMove.from,
                            to: randomMove.to,
                            promotion: randomMove.promotion,
                            coralPlaced: randomMove.coralPlaced,
                            coralRemoved: randomMove.coralRemoved,
                            coralRemovedSquares: randomMove.coralRemovedSquares,
                        });
                    }
                }
            } else {
                // Random move for the non-AI player
                const moves = game.moves({ verbose: true });
                if (moves.length === 0) {
                    break;
                }
                
                const randomMove = moves[Math.floor(Math.random() * moves.length)];
                moveResult = game.move({
                    from: randomMove.from,
                    to: randomMove.to,
                    promotion: randomMove.promotion,
                    coralPlaced: randomMove.coralPlaced,
                    coralRemoved: randomMove.coralRemoved,
                    coralRemovedSquares: randomMove.coralRemovedSquares,
                });
            }

            if (!moveResult) {
                // Invalid move - break out of game
                break;
            }

            movesInGame++;

            // Check if we've exceeded time limit
            if (Date.now() - startTime >= maxTimeMs) {
                break;
            }
        }

        gamesPlayed++;
        totalMoves += movesInGame;
        
        // Track positions added in this game
        const positionsAddedThisGame = table.size() - tableSizeBeforeGame;

        // Report progress
        if (progressCallback) {
            const elapsedMs = Date.now() - startTime;
            progressCallback({
                gamesCompleted: gamesPlayed,
                positionsEvaluated: totalPositions,
                uniquePositions: table.size(),
                elapsedMs,
                currentGame: gamesPlayed,
                isComplete: gamesPlayed >= maxGames || elapsedMs >= maxTimeMs,
            });
        }
        
        // Get cache stats for this game
        const cacheStats = table.getStats();
        
        // Log game summary
        console.log(
            `  Game ${gamesPlayed} complete: ${movesInGame} moves, ` +
            `${positionsAddedThisGame} new positions, ${table.size()} total unique positions` +
            (cacheStats.totalLookups > 0 ? 
                ` (cache: ${cacheStats.hitRate.toFixed(1)}% hit rate, ${cacheStats.hits} hits, ${cacheStats.misses} misses)` : 
                ''),
        );

        // Incremental save callback (if provided)
        if (config.saveCallback) {
            try {
                await config.saveCallback(table);
            } catch (saveErr) {
                console.warn(`  ⚠️  Failed to save incrementally: ${saveErr}`);
            }
        }

        // Small delay to allow other operations (if needed)
        await new Promise((resolve) => setTimeout(resolve, 0));
    }

    const elapsedMs = Date.now() - startTime;
    const averageGameLength = gamesPlayed > 0 ? totalMoves / gamesPlayed : 0;

    return {
        table,
        stats: {
            gamesPlayed,
            totalPositions,
            uniquePositions: table.size(),
            averageGameLength,
            elapsedMs,
        },
    };
}

/**
 * Generate evaluation table for a specific difficulty level
 * Uses pre-configured parameters based on difficulty
 * @param difficulty - Difficulty level ('easy', 'medium', 'hard')
 * @param config - Optional override configuration
 * @returns Evaluation table populated with position evaluations
 */
export async function generateEvaluationTableForDifficulty(
    difficulty: 'easy' | 'medium' | 'hard',
    config: Partial<SelfPlayConfig> = {},
): Promise<SelfPlayResult> {
    // Default parameters based on difficulty
    const difficultyConfigs: Record<'easy' | 'medium' | 'hard', Partial<SelfPlayConfig>> = {
        easy: {
            maxGames: 5,
            maxTimeMs: 5 * 60 * 1000, // 5 minutes
            maxDepth: 4,
            collectAllPositions: false,
            useRandomOpponent: true, // AI vs random for better exploration
            aiPlayer: 'w', // White uses AI, black is random
        },
        medium: {
            maxGames: 20,
            maxTimeMs: 30 * 60 * 1000, // 30 minutes
            maxDepth: 6,
            collectAllPositions: false,
            useRandomOpponent: true, // AI vs random for better exploration
            aiPlayer: 'w', // White uses AI, black is random
        },
        hard: {
            maxGames: 50,
            maxTimeMs: 2 * 60 * 60 * 1000, // 2 hours
            maxDepth: 8,
            collectAllPositions: false,
            useRandomOpponent: true, // AI vs random for better exploration
            aiPlayer: 'w', // White uses AI, black is random
        },
    };

    const baseConfig = difficultyConfigs[difficulty];
    const finalConfig: SelfPlayConfig & { difficulty?: DifficultyLevel } = {
        ...baseConfig,
        ...config,
        difficulty, // Pass difficulty for save callback
    };

    return runSelfPlaySimulation(finalConfig);
}

