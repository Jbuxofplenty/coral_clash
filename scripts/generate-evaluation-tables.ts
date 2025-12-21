#!/usr/bin/env node
/**
 * Generate evaluation table with top moves for all positions
 *
 * This script runs self-play simulations to generate pre-computed top 3 moves
 * for each position. Difficulty levels are determined by which moves are selected:
 * - Hard: Always best move
 * - Medium: Randomly choose between best and second best
 * - Easy: Randomly choose from all 3 stored moves
 *
 * Usage:
 *   yarn generate:eval-tables
 *   yarn generate:eval-tables --force-regenerate
 *   or
 *   tsx scripts/generate-evaluation-tables.ts [--force-regenerate]
 *
 * Options:
 *   --force-regenerate: Force regeneration even if evaluation version matches
 *                      (useful when you want to refresh moves with same evaluation logic)
 *
 * Note: If you need to migrate from an older evaluation version, run:
 *   yarn migrate:eval-table [fromVersion] [toVersion]
 *   Example: yarn migrate:eval-table 2 3
 */

import {
    EVALUATION_VERSION,
    EvaluationTable,
    getEvaluationTablePath,
} from '../shared/game/v1.0.0/evaluationTable.js';
import { runSelfPlaySimulation } from '../shared/game/v1.0.0/selfPlay.js';

/**
 * Format time in milliseconds to human-readable string
 */
function formatTime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
        return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
    } else {
        return `${seconds}s`;
    }
}

/**
 * Generate evaluation table with top moves
 * Saves incrementally after each game so progress is preserved if interrupted
 * @param forceRegenerate - If true, force regeneration even if evaluation version matches
 */
async function generateTable(forceRegenerate: boolean = false): Promise<void> {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Generating evaluation table with top moves`);
    console.log(`Evaluation version: ${EVALUATION_VERSION}`);
    console.log('='.repeat(60));

    const startTime = Date.now();
    const filePath = await getEvaluationTablePath();

    // Try to load existing table if it exists (for resuming)
    let existingTable: EvaluationTable | null = null;

    if (!forceRegenerate) {
        try {
            existingTable = await EvaluationTable.load(filePath);
            const outdatedCount = existingTable.getOutdatedCount();
            console.log(
                `   ✅ Resuming: Loaded existing table with ${existingTable.size()} positions`,
            );
            console.log(`   Evaluation version matches (v${EVALUATION_VERSION})`);
            if (outdatedCount > 0) {
                console.log(
                    `   🔄 ${outdatedCount} positions marked as outdated - will be prioritized for re-evaluation`,
                );
            }
        } catch (loadErr: any) {
            // Check if it's a version mismatch
            const isVersionMismatch = loadErr.message?.includes('Evaluation version mismatch');
            const isFileNotFound = loadErr.message?.includes('ENOENT') || loadErr.code === 'ENOENT';

            if (isVersionMismatch) {
                console.log(`   ⚠️  Evaluation version mismatch detected!`);
                console.log(`   Run 'yarn migrate:eval-table' first to migrate from older version`);
                console.log(
                    `   Starting fresh table (migrate first to preserve existing positions)`,
                );
            } else if (isFileNotFound) {
                console.log(`   Starting fresh table (no existing table found)`);
            } else {
                console.log(`   Starting fresh table (error: ${loadErr.message})`);
            }
        }
    } else {
        console.log(`   🔄 Force regeneration enabled - starting fresh table`);
        console.log(`   (Existing table will be ignored)`);
    }

    let lastSaveTime = Date.now();
    const SAVE_INTERVAL_MS = 30 * 1000; // Save every 30 seconds

    // Progress callback
    const progressCallback = (progress: any) => {
        const elapsed = formatTime(progress.elapsedMs);
        const rate = progress.positionsEvaluated / (progress.elapsedMs / 1000);
        const cacheStats = existingTable?.getStats() || {
            hitRate: 0,
            hits: 0,
            misses: 0,
            totalLookups: 0,
        };
        const outdatedCount = existingTable?.getOutdatedCount() || 0;
        const outdatedInfo = outdatedCount > 0 ? ` [${outdatedCount} outdated remaining]` : '';
        console.log(
            `  Depth ${progress.currentGame - 1}: ${progress.uniquePositions} unique positions, ` +
                `${progress.positionsEvaluated} total evaluations, ${elapsed} elapsed ` +
                `(${rate.toFixed(1)} pos/sec)` +
                (cacheStats.totalLookups > 0 ? ` [cache: ${cacheStats.hitRate.toFixed(1)}%]` : '') +
                outdatedInfo,
        );
    };

    // Save callback for incremental saving
    const saveCallback = async (table: EvaluationTable) => {
        const now = Date.now();
        if (now - lastSaveTime >= SAVE_INTERVAL_MS) {
            try {
                await table.save(filePath);
                lastSaveTime = now;
                console.log(`   💾 Auto-saved (${table.size()} positions)`);
            } catch (saveErr) {
                console.warn(`   ⚠️  Failed to auto-save: ${saveErr}`);
            }
        }
    };

    try {
        // Run simulation with parameters for generating comprehensive move table
        // Skip BFS if table already has good coverage (>= 15k positions)
        // Otherwise do BFS first, then continue with self-play indefinitely
        const tableSize = existingTable?.size() || 0;

        let result;
        if (tableSize < 15000) {
            // Table is small - do BFS first to cover early positions
            console.log('  Phase 1: Breadth-first search (early positions)...');
            const bfsResult = await runSelfPlaySimulation({
                maxGames: 1, // Not used in BFS mode
                maxTimeMs: 5 * 60 * 1000, // 5 minute timeout for BFS (should complete quickly)
                maxDepth: 6,
                collectAllPositions: false,
                useRandomOpponent: true,
                aiPlayer: 'w',
                progressCallback,
                saveCallback: saveCallback as any,
                initialTable: existingTable || undefined,
                useBreadthFirst: true,
                maxBreadthFirstDepth: 4, // Complete BFS to depth 4 first
                forceReevaluate: false, // Re-evaluation handled by outdated position tracking
            });

            console.log(`\n  Phase 1 complete: ${bfsResult.stats.uniquePositions} positions`);
            console.log(
                '  Phase 2: Self-play games (deeper exploration - running indefinitely)...\n',
            );

            // Continue with self-play games indefinitely
            result = await runSelfPlaySimulation({
                maxGames: Infinity, // No limit - keep generating
                maxTimeMs: Infinity, // No time limit - run indefinitely
                maxDepth: 6,
                collectAllPositions: false,
                useRandomOpponent: true, // AI vs random for better exploration
                aiPlayer: 'w',
                progressCallback,
                saveCallback: saveCallback as any,
                initialTable: bfsResult.table, // Continue from BFS table
                useBreadthFirst: false, // Switch to self-play mode
                forceReevaluate: false, // Re-evaluation handled by outdated position tracking
            });
        } else {
            // Table already has good coverage - skip BFS and go straight to self-play
            console.log(`  Table already has ${tableSize} positions (good early coverage)`);
            console.log('  Starting self-play games (running indefinitely)...\n');
            result = await runSelfPlaySimulation({
                maxGames: Infinity, // No limit - keep generating
                maxTimeMs: Infinity, // No time limit - run indefinitely
                maxDepth: 6,
                collectAllPositions: false,
                useRandomOpponent: true, // AI vs random for better exploration
                aiPlayer: 'w',
                progressCallback,
                saveCallback: saveCallback as any,
                initialTable: existingTable || undefined,
                useBreadthFirst: false, // Use self-play mode
                forceReevaluate: false, // Re-evaluation handled by outdated position tracking
            });
        }

        const elapsed = Date.now() - startTime;
        const elapsedFormatted = formatTime(elapsed);

        // Get final cache stats
        const finalCacheStats = result.table.getStats();

        console.log(`\n✅ Generation complete!`);
        console.log(`   Games played: ${result.stats.gamesPlayed}`);
        console.log(`   Unique positions: ${result.stats.uniquePositions}`);
        console.log(`   Total positions evaluated: ${result.stats.totalPositions}`);
        console.log(`   Average game length: ${result.stats.averageGameLength.toFixed(1)} moves`);
        console.log(`   Time elapsed: ${elapsedFormatted}`);
        if (finalCacheStats.totalLookups > 0) {
            console.log(`   Cache performance: ${finalCacheStats.hitRate.toFixed(1)}% hit rate`);
            console.log(`     - ${finalCacheStats.hits} cache hits (positions already evaluated)`);
            console.log(`     - ${finalCacheStats.misses} cache misses (new positions evaluated)`);
        }

        // Final save
        await result.table.save(filePath);

        // Estimate file size (variable per entry due to move data)
        console.log(`   Saved to: ${filePath}`);
        console.log(`   Table contains ${result.table.size()} positions with top moves`);

        return;
    } catch (err) {
        console.error(`\n❌ Error generating table:`, err);
        throw err;
    }
}

/**
 * Main function
 */
async function main() {
    console.log('Coral Clash Evaluation Table Generator');
    console.log('=====================================\n');
    console.log('Generating single table with top 3 moves per position');
    console.log('Difficulty levels:');
    console.log('  - Hard: Always best move');
    console.log('  - Medium: Randomly choose between best and second best');
    console.log('  - Easy: Randomly choose from all 3 stored moves');
    console.log('\nNote: If evaluation logic changes, the table will automatically regenerate');
    console.log('      with the new evaluation version. Old tables are ignored.\n');

    // Check for command-line arguments
    const args = process.argv.slice(2);
    const forceRegenerate = args.includes('--force-regenerate');

    if (forceRegenerate) {
        console.log('⚠️  Force regeneration enabled - will start fresh even if version matches\n');
    }

    try {
        await generateTable(forceRegenerate);
        console.log(`\n${'='.repeat(60)}`);
        console.log('Table generated successfully!');
        console.log('='.repeat(60));
    } catch (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    }
}

// Run if executed directly
main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});

export { generateTable };
