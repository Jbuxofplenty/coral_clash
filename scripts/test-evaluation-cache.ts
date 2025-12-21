#!/usr/bin/env node
/**
 * Test script to measure evaluation table cache hit rates
 *
 * This script runs AI moves using different difficulty levels and reports
 * cache hit rates for the evaluation tables.
 *
 * Usage:
 *   yarn test:eval-cache [difficulty]
 *   or
 *   tsx scripts/test-evaluation-cache.ts [difficulty]
 */

import {
    CoralClash,
    createGameSnapshot,
    findBestMoveIterativeDeepening,
    EvaluationTable,
    getEvaluationTablePath,
    type DifficultyLevel,
} from '../shared/game/v1.0.0/index.js';

/**
 * Run a test game and measure cache performance
 */
async function testCachePerformance(difficulty: DifficultyLevel, numMoves: number = 10): Promise<void> {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Testing cache performance for: ${difficulty.toUpperCase()}`);
    console.log('='.repeat(60));

    // Load evaluation table (single table for all difficulties)
    let evaluationTable: EvaluationTable | null = null;
    try {
        const filePath = await getEvaluationTablePath(); // No difficulty parameter - single table
        evaluationTable = await EvaluationTable.load(filePath);
        console.log(`✅ Loaded evaluation table: ${evaluationTable.size()} positions`);
    } catch (error: any) {
        console.error(`❌ Failed to load evaluation table: ${error.message}`);
        console.error(`   Make sure you've generated the table first: yarn generate:eval-tables`);
        return;
    }

    // Reset stats before test
    evaluationTable.resetStats();

    // Create a game and play some moves
    const game = new CoralClash();
    let movesPlayed = 0;

    // Check if starting position is in table
    const { generatePositionKey } = await import('../shared/game/v1.0.0/aiEvaluation.js');
    const startingState = createGameSnapshot(game);
    const startingKey = generatePositionKey(startingState);
    const startingInTable = evaluationTable.has(startingKey);
    console.log(`\nStarting position in table: ${startingInTable} (hash: ${startingKey})`);
    console.log(`Playing ${numMoves} moves...\n`);

    const startTime = Date.now();

    while (movesPlayed < numMoves && !game.isGameOver()) {
        const currentTurn = game.turn();
        const gameState = createGameSnapshot(game);

        // Get AI move
        const result = findBestMoveIterativeDeepening(
            gameState,
            6, // maxDepth
            currentTurn,
            2000, // maxTimeMs
            null, // progressCallback
            null, // lastMove
            evaluationTable, // evaluationTable
            difficulty, // difficulty level for move selection
        );

        if (!result.move) {
            console.log(`  No move found (game might be over)`);
            break;
        }

        // Make the move
        const moveResult = game.move({
            from: result.move.from,
            to: result.move.to,
            promotion: result.move.promotion,
            coralPlaced: result.move.coralPlaced,
            coralRemoved: result.move.coralRemoved,
            coralRemovedSquares: result.move.coralRemovedSquares,
        });

        if (!moveResult) {
            console.log(`  Invalid move`);
            break;
        }

        movesPlayed++;

        // Show progress every few moves
        if (movesPlayed % 5 === 0) {
            const stats = evaluationTable.getStats();
            console.log(
                `  Move ${movesPlayed}: Cache hit rate: ${stats.hitRate.toFixed(1)}% ` +
                    `(${stats.hits} hits, ${stats.misses} misses)`,
            );
        }
    }

    const elapsedMs = Date.now() - startTime;

    // Final statistics
    const stats = evaluationTable.getStats();
    console.log(`\n${'='.repeat(60)}`);
    console.log('Cache Performance Results:');
    console.log('='.repeat(60));
    console.log(`  Difficulty: ${difficulty}`);
    console.log(`  Moves played: ${movesPlayed}`);
    console.log(`  Time elapsed: ${(elapsedMs / 1000).toFixed(2)}s`);
    console.log(`  Total lookups: ${stats.totalLookups}`);
    console.log(`  Cache hits: ${stats.hits}`);
    console.log(`  Cache misses: ${stats.misses}`);
    console.log(`  Hit rate: ${stats.hitRate.toFixed(2)}%`);
    console.log(`  Table size: ${evaluationTable.size()} positions`);
    console.log('='.repeat(60));
}

/**
 * Main function
 */
async function main() {
    const args = process.argv.slice(2);
    const difficultyArg = args[0]?.toLowerCase();
    const numMovesArg = args[1] ? parseInt(args[1], 10) : 10;

    const difficulties: DifficultyLevel[] = ['easy', 'medium', 'hard'];

    let difficultiesToTest: DifficultyLevel[];

    if (difficultyArg && difficulties.includes(difficultyArg as DifficultyLevel)) {
        difficultiesToTest = [difficultyArg as DifficultyLevel];
    } else if (difficultyArg) {
        console.error(`❌ Invalid difficulty: ${difficultyArg}`);
        console.error(`   Valid options: ${difficulties.join(', ')}`);
        process.exit(1);
    } else {
        difficultiesToTest = difficulties;
    }

    console.log('Coral Clash Evaluation Cache Performance Test');
    console.log('==============================================\n');

    for (const difficulty of difficultiesToTest) {
        try {
            await testCachePerformance(difficulty, numMovesArg);
        } catch (error) {
            console.error(`\n❌ Error testing ${difficulty}:`, error);
        }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log('All tests complete!');
    console.log('='.repeat(60));
}

// Run if executed directly
main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});

export { testCachePerformance };

