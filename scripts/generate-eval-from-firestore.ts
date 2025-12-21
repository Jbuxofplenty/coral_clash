#!/usr/bin/env node
/**
 * Generate evaluation table from Firestore games
 *
 * This script retrieves games from Firestore, walks backwards through each game
 * undoing moves, and generates best moves for each position encountered.
 *
 * Usage:
 *   yarn generate:eval-from-firestore
 *   yarn generate:eval-from-firestore --clear-cache  # Clear processed games cache
 *   or
 *   tsx scripts/generate-eval-from-firestore.ts
 *   tsx scripts/generate-eval-from-firestore.ts --clear-cache
 */

import admin from 'firebase-admin';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import {
    CoralClash,
    createGameSnapshot,
    restoreGameFromSnapshot,
    generatePositionKey,
    evaluatePosition,
} from '@jbuxofplenty/coral-clash';
import { EvaluationTable, getEvaluationTablePath } from '../shared/game/v1.0.0/evaluationTable.js';
import type { StoredMove } from '../shared/game/v1.0.0/evaluationTable.js';
import type { Color } from '../shared/game/v1.0.0/coralClash.js';

// Initialize Firebase Admin
if (!admin.apps.length) {
    // Try to use service account from environment or default credentials
    // For local development, you can use:
    //   export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
    // Or use Firebase emulator by setting FIRESTORE_EMULATOR_HOST
    try {
        // Check if we're using emulator
        const useEmulator = process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_EMULATOR_HUB;
        
        if (useEmulator) {
            // Use emulator settings
            process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8080';
            // Use project ID from .firebaserc or default
            if (!admin.apps.length) {
                admin.initializeApp({
                    projectId: process.env.GCLOUD_PROJECT || 'coral-clash',
                });
            }
            console.log(`   🔥 Using Firebase Emulator (host: ${process.env.FIRESTORE_EMULATOR_HOST})`);
        } else {
            // Use production credentials
            // Try to use GOOGLE_APPLICATION_CREDENTIALS env var, credentials.json, or application default
            let credential;
            const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || join(process.cwd(), 'credentials.json');
            
            if (existsSync(credentialsPath)) {
                try {
                    const serviceAccount = JSON.parse(readFileSync(credentialsPath, 'utf-8'));
                    // Check if it's a valid service account JSON
                    if (serviceAccount.project_id || serviceAccount.type === 'service_account') {
                        credential = admin.credential.cert(serviceAccount);
                        console.log(`   🔥 Using Firebase Production (${credentialsPath})`);
                    } else {
                        throw new Error('Invalid service account format');
                    }
                } catch (_error) {
                    console.warn(`   ⚠️  Could not use ${credentialsPath}, trying application default`);
                    credential = admin.credential.applicationDefault();
                    console.log('   🔥 Using Firebase Production (application default)');
                }
            } else {
                credential = admin.credential.applicationDefault();
                console.log('   🔥 Using Firebase Production (application default)');
            }
            
            admin.initializeApp({
                credential,
            });
        }
    } catch (error) {
        console.error('Failed to initialize Firebase Admin:', error);
        console.error('\nTo use Firebase Emulator:');
        console.error('  export FIRESTORE_EMULATOR_HOST=localhost:8080');
        console.error('\nTo use Production:');
        console.error('  export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"');
        process.exit(1);
    }
}

const db = admin.firestore();

/**
 * Path to store processed game IDs cache
 */
const PROCESSED_GAMES_CACHE_PATH = join(process.cwd(), '.processed-games-cache.json');

/**
 * Load processed game IDs from cache file
 */
function loadProcessedGames(): Set<string> {
    if (existsSync(PROCESSED_GAMES_CACHE_PATH)) {
        try {
            const data = readFileSync(PROCESSED_GAMES_CACHE_PATH, 'utf-8');
            const parsed = JSON.parse(data);
            return new Set(parsed.gameIds || []);
        } catch (error) {
            console.warn('Failed to load processed games cache, starting fresh:', error);
            return new Set();
        }
    }
    return new Set();
}

/**
 * Save processed game IDs to cache file
 */
function saveProcessedGames(processedGames: Set<string>): void {
    try {
        const data = {
            gameIds: Array.from(processedGames),
            lastUpdated: new Date().toISOString(),
        };
        writeFileSync(PROCESSED_GAMES_CACHE_PATH, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
        console.warn('Failed to save processed games cache:', error);
    }
}

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
 * Evaluate moves for a position and return top 3 moves
 */
function evaluateMovesForPosition(
    game: CoralClash,
    gameState: ReturnType<typeof createGameSnapshot>,
    playerColor: Color,
): StoredMove[] {
    const legalMoves = game.moves({ verbose: true });
    if (legalMoves.length === 0) {
        return [];
    }

    // Evaluate each move with shallow search to get scores
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
                const opponentColor: Color = playerColor === 'w' ? 'b' : 'w';
                const score = evaluatePosition(newGameState, opponentColor, null);
                // Negate score because we're evaluating from opponent's perspective
                moveScores.push({ move, score: -score });
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
    return moveScores.slice(0, 3).map(({ move }) => ({
        from: move.from,
        to: move.to,
        ...(move.promotion && { promotion: move.promotion }),
        ...(move.coralPlaced !== undefined && { coralPlaced: move.coralPlaced }),
        ...(move.coralRemoved !== undefined && { coralRemoved: move.coralRemoved }),
        ...(move.coralRemovedSquares && { coralRemovedSquares: move.coralRemovedSquares }),
    }));
}

/**
 * Process a single game: walk backwards undoing moves and generating evaluation data
 */
function processGame(
    gameData: FirebaseFirestore.DocumentData,
    gameId: string,
    table: EvaluationTable,
): { positionsAdded: number; positionsSkipped: number; positionsReevaluated: number } {
    let positionsAdded = 0;
    let positionsSkipped = 0;
    let positionsReevaluated = 0;

    try {
        // Restore game from current state
        const game = new CoralClash();
        const gameState = gameData.gameState || { fen: gameData.fen };
        
        if (!gameState.fen && !gameState.pgn) {
            // Skip games without valid state
            return { positionsAdded: 0, positionsSkipped: 0 };
        }

        restoreGameFromSnapshot(game, gameState);

        // Get move history from Firestore
        const historyLength = game.historyLength();

        // Walk backwards through the game, undoing moves
        // We'll undo all moves to get back to the starting position
        const positionsProcessed = new Set<number>();

        // Process current position first (before any undos)
        let currentState = createGameSnapshot(game);
        let currentPositionKey = generatePositionKey(currentState);
        const currentTurn = game.turn();

        // Check if position needs evaluation (new or outdated)
        const isOutdated = table.isOutdated(currentPositionKey);
        if (!table.has(currentPositionKey) || isOutdated) {
            const topMoves = evaluateMovesForPosition(game, currentState, currentTurn);
            if (topMoves.length > 0) {
                table.setMoves(currentPositionKey, topMoves);
                if (isOutdated) {
                    positionsReevaluated++;
                } else {
                    positionsAdded++;
                }
            }
        } else {
            positionsSkipped++;
        }
        positionsProcessed.add(currentPositionKey);

        // Now undo moves one by one
        // Note: We undo ALL moves in history, regardless of whether they were user or computer moves
        // The moves array in Firestore contains all moves with playerId, so we process them all
        for (let i = 0; i < historyLength; i++) {
            const undoResult = game.undo();
            if (!undoResult) {
                break; // Can't undo further
            }

            currentState = createGameSnapshot(game);
            currentPositionKey = generatePositionKey(currentState);
            const newTurn = game.turn();

            // Skip if we've already processed this position (can happen with transpositions)
            if (positionsProcessed.has(currentPositionKey)) {
                continue;
            }

            // Check if position needs evaluation (new or outdated)
            const isOutdated = table.isOutdated(currentPositionKey);
            if (!table.has(currentPositionKey) || isOutdated) {
                const topMoves = evaluateMovesForPosition(game, currentState, newTurn);
                if (topMoves.length > 0) {
                    table.setMoves(currentPositionKey, topMoves);
                    if (isOutdated) {
                        positionsReevaluated++;
                    } else {
                        positionsAdded++;
                    }
                }
            } else {
                positionsSkipped++;
            }

            positionsProcessed.add(currentPositionKey);
        }
    } catch (error) {
        console.warn(`  ⚠️  Error processing game ${gameId}:`, error);
        // Continue processing other games even if one fails
    }

    return { positionsAdded, positionsSkipped, positionsReevaluated };
}

/**
 * Save progress (table and cache) - can be called on interrupt
 */
let currentTable: EvaluationTable | null = null;
let currentProcessedGames: Set<string> | null = null;
let currentFilePath: string | null = null;

async function saveProgress(): Promise<void> {
    if (currentTable && currentProcessedGames && currentFilePath) {
        try {
            await currentTable.save(currentFilePath);
            saveProcessedGames(currentProcessedGames);
            console.log(`\n   💾 Progress saved before exit`);
        } catch (error) {
            console.error(`\n   ⚠️  Failed to save progress:`, error);
        }
    }
}

/**
 * Main function to generate evaluation table from Firestore games
 */
async function generateFromFirestore(): Promise<void> {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Generating evaluation table from Firestore games`);
    console.log('='.repeat(60));

    const startTime = Date.now();

    // Load evaluation table
    const filePath = await getEvaluationTablePath();
    currentFilePath = filePath;
    let table: EvaluationTable;
    let hasOutdatedPositions = false;
    try {
        table = await EvaluationTable.load(filePath);
        const outdatedCount = table.getOutdatedCount();
        hasOutdatedPositions = outdatedCount > 0;
        console.log(`   ✅ Loaded existing table with ${table.size()} positions`);
        if (hasOutdatedPositions) {
            console.log(`   🔄 ${outdatedCount} positions marked as outdated - will re-process games to re-evaluate them`);
        }
    } catch (loadErr: any) {
        if (loadErr.message?.includes('Evaluation version mismatch')) {
            console.log(`   ⚠️  Existing table has different evaluation version`);
            console.log(`   💡 Run 'yarn migrate:eval-table' to migrate existing positions`);
            console.log(`   Starting fresh table`);
            table = new EvaluationTable();
        } else {
            console.log(`   Starting fresh table`);
            table = new EvaluationTable();
        }
    }

    // Check for --clear-cache flag
    const shouldClearCache = process.argv.includes('--clear-cache');
    if (shouldClearCache) {
        console.log(`   🗑️  Clearing processed games cache (--clear-cache flag)`);
        if (existsSync(PROCESSED_GAMES_CACHE_PATH)) {
            try {
                writeFileSync(PROCESSED_GAMES_CACHE_PATH, JSON.stringify({ gameIds: [], lastUpdated: new Date().toISOString() }, null, 2), 'utf-8');
                console.log(`   ✅ Cache file cleared`);
            } catch (error) {
                console.warn(`   ⚠️  Failed to clear cache file:`, error);
            }
        }
    }

    // Load processed games cache
    const processedGames = loadProcessedGames();
    currentProcessedGames = processedGames;
    currentTable = table;
    console.log(`   📋 Loaded ${processedGames.size} processed games from cache`);
    
    // If there are outdated positions, we need to re-process games to find and re-evaluate them
    // Clear the cache so we re-process games (we'll still skip non-outdated positions)
    if (hasOutdatedPositions && processedGames.size > 0) {
        console.log(`   🔄 Clearing processed games cache to re-process games for outdated positions`);
        processedGames.clear();
        // Clear the cache file too
        try {
            writeFileSync(PROCESSED_GAMES_CACHE_PATH, JSON.stringify({ gameIds: [], lastUpdated: new Date().toISOString() }, null, 2), 'utf-8');
        } catch (error) {
            console.warn(`   ⚠️  Failed to clear cache file:`, error);
        }
    }

    // Set up signal handlers to save on interrupt
    const cleanup = async () => {
        console.log(`\n\n⚠️  Interrupted - saving progress...`);
        await saveProgress();
        process.exit(0);
    };
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);

    // Fetch games from Firestore in batches
    const BATCH_SIZE = 50;
    let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;
    let totalGamesProcessed = 0;
    let totalPositionsAdded = 0;
    let totalPositionsSkipped = 0;
    let totalPositionsReevaluated = 0;
    let lastSaveTime = Date.now();
    const SAVE_INTERVAL_MS = 30 * 1000; // Save every 30 seconds
    const processedInThisRun = new Set<string>(); // Track games processed in this run to detect loops

    console.log(`\n  Fetching games from Firestore...\n`);

    // First, check total games count and see what statuses exist
    console.log(`  Checking for games in Firestore...`);
    let allGamesSnapshot;
    try {
        allGamesSnapshot = await db.collection('games').limit(10).get();
    } catch (error: any) {
        console.error(`  ❌ Error querying Firestore:`, error.message);
        console.error(`  Make sure FIRESTORE_EMULATOR_HOST is set correctly`);
        return;
    }

    if (allGamesSnapshot.empty) {
        console.log(`\n  ⚠️  No games found in Firestore collection`);
        console.log(`  Make sure you have games in your Firestore database`);
        console.log(`  Emulator host: ${process.env.FIRESTORE_EMULATOR_HOST || 'not set'}`);
        return;
    }

    // Check what statuses exist in the games
    const statuses = allGamesSnapshot.docs
        .map(doc => doc.data().status)
        .filter(Boolean);
    const uniqueStatuses = [...new Set(statuses)];
    console.log(`  ✅ Found ${allGamesSnapshot.size} sample games`);
    console.log(`  ℹ️  Statuses found: ${uniqueStatuses.length > 0 ? uniqueStatuses.join(', ') : 'none'}`);
    console.log(`  📊 Starting with ${table.size()} positions in evaluation table`);
    console.log(`\n`);

    let useDocumentIdPagination = false;
    let lastDocId: string | null = null;

    while (true) {
        let query: FirebaseFirestore.Query = db.collection('games');
        let snapshot;

        if (!useDocumentIdPagination) {
            // Try to use composite index with status filter and createdAt ordering
            const hasStatusFilter = uniqueStatuses.some(s => ['active', 'completed'].includes(s));
            if (hasStatusFilter) {
                query = query.where('status', 'in', ['active', 'completed']);
            }
            query = query.orderBy('createdAt', 'desc').limit(BATCH_SIZE);
            if (lastDoc) {
                query = query.startAfter(lastDoc);
            }

            try {
                snapshot = await query.get();
            } catch (error: any) {
                // If index is still building, fall back to document ID pagination
                if (error.code === 9 || error.message?.includes('index')) {
                    console.log(`  ⚠️  Index is still building, using document ID pagination...`);
                    useDocumentIdPagination = true;
                    // Execute document ID pagination query
                    query = db.collection('games').orderBy(admin.firestore.FieldPath.documentId()).limit(BATCH_SIZE);
                    if (lastDocId) {
                        const lastDocRef = db.collection('games').doc(lastDocId);
                        query = query.startAfter(lastDocRef);
                    }
                    snapshot = await query.get();
                } else {
                    throw error;
                }
            }
        } else {
            // Already using document ID pagination
            query = db.collection('games').orderBy(admin.firestore.FieldPath.documentId()).limit(BATCH_SIZE);
            if (lastDocId) {
                const lastDocRef = db.collection('games').doc(lastDocId);
                query = query.startAfter(lastDocRef);
            }
            snapshot = await query.get();
        }

        if (snapshot.empty) {
            if (totalGamesProcessed === 0) {
                // Check if there are games but with different statuses
                const anyGameSnapshot = await db.collection('games').limit(5).get();
                if (!anyGameSnapshot.empty) {
                    const sampleStatuses = anyGameSnapshot.docs.map(doc => doc.data().status).filter(Boolean);
                    console.log(`\n  ⚠️  Found games but none with status 'active' or 'completed'`);
                    console.log(`  Sample statuses found: ${[...new Set(sampleStatuses)].join(', ')}`);
                    console.log(`  Consider updating the query to include other statuses if needed`);
                }
            }
            console.log(`\n  ✅ No more games to process`);
            break;
        }

        const batch = snapshot.docs;
        console.log(`  Processing batch of ${batch.length} games...`);

        for (const doc of batch) {
            const gameId = doc.id;
            const gameData = doc.data();

            // Filter by status in memory if using document ID pagination
            if (useDocumentIdPagination) {
                const hasStatusFilter = uniqueStatuses.some(s => ['active', 'completed'].includes(s));
                if (hasStatusFilter) {
                    const status = gameData.status;
                    if (status !== 'active' && status !== 'completed') {
                        continue;
                    }
                }
            }

            // Skip if already processed (unless we're re-processing for outdated positions)
            // When re-processing for outdated positions, we still check processedInThisRun to avoid duplicates in same run
            if (!hasOutdatedPositions && (processedGames.has(gameId) || processedInThisRun.has(gameId))) {
                if (!processedInThisRun.has(gameId)) {
                    console.log(`   ⏭️  Skipping game ${gameId} (already processed)`);
                }
                processedInThisRun.add(gameId);
                continue;
            }
            
            // If we're re-processing for outdated positions, still skip if already processed in this run
            if (hasOutdatedPositions && processedInThisRun.has(gameId)) {
                continue;
            }
            
            processedInThisRun.add(gameId);

            // Skip games without moves
            const moves = gameData.moves || [];
            if (moves.length === 0) {
                processedGames.add(gameId);
                console.log(`   ⏭️  Skipping game ${gameId} (no moves)`);
                continue;
            }

            const tableSizeBefore = table.size();
            const startGameTime = Date.now();

            // Process the game
            console.log(`   🎮 Processing game ${gameId} (${moves.length} moves)...`);
            const { positionsAdded, positionsSkipped, positionsReevaluated } = processGame(gameData, gameId, table);
            
            const tableSizeAfter = table.size();
            const gameProcessTime = Date.now() - startGameTime;
            
            totalPositionsAdded += positionsAdded;
            totalPositionsSkipped += positionsSkipped;
            totalPositionsReevaluated += positionsReevaluated;
            totalGamesProcessed++;

            // Mark as processed
            processedGames.add(gameId);

            // Log after each game
            const reevalInfo = positionsReevaluated > 0 ? `, ${positionsReevaluated} re-evaluated` : '';
            console.log(
                `   ✅ Game ${gameId}: +${positionsAdded} positions, ${positionsSkipped} skipped${reevalInfo} ` +
                `(table: ${tableSizeBefore} → ${tableSizeAfter}, ${gameProcessTime}ms)`,
            );

            // Save cache periodically
            if (totalGamesProcessed % 10 === 0) {
                saveProcessedGames(processedGames);
                console.log(`   💾 Saved processed games cache (${processedGames.size} games)`);
            }

            // Auto-save table periodically
            const now = Date.now();
            if (now - lastSaveTime >= SAVE_INTERVAL_MS) {
                try {
                    await table.save(filePath);
                    lastSaveTime = now;
                    console.log(
                        `   💾 Auto-saved table: ${table.size()} unique positions, ${totalGamesProcessed} games processed`,
                    );
                } catch (saveErr) {
                    console.warn(`   ⚠️  Failed to auto-save: ${saveErr}`);
                }
            }

            // Summary every 5 games
            if (totalGamesProcessed % 5 === 0) {
                const outdatedCount = table.getOutdatedCount();
                const outdatedInfo = outdatedCount > 0 ? ` | ${outdatedCount} outdated remaining` : '';
                const reevalInfo = totalPositionsReevaluated > 0 ? ` | ${totalPositionsReevaluated} re-evaluated` : '';
                console.log(
                    `   📊 Summary: ${totalGamesProcessed} games | ` +
                    `+${totalPositionsAdded} new positions | ` +
                    `${totalPositionsSkipped} skipped${reevalInfo} | ` +
                    `${table.size()} total unique positions${outdatedInfo}`,
                );
            }
        }

        // Update pagination cursor
        if (batch.length > 0) {
            if (useDocumentIdPagination) {
                lastDocId = batch[batch.length - 1].id;
            } else {
                lastDoc = batch[batch.length - 1];
            }
        }

        // If we got fewer than BATCH_SIZE, we've reached the end
        if (batch.length < BATCH_SIZE) {
            break;
        }
    }

    // Final save
    await table.save(filePath);
    saveProcessedGames(processedGames);
    
    // Clear signal handlers since we're done
    process.removeAllListeners('SIGINT');
    process.removeAllListeners('SIGTERM');

    const elapsed = Date.now() - startTime;
    const elapsedFormatted = formatTime(elapsed);

    const finalOutdatedCount = table.getOutdatedCount();
    console.log(`\n✅ Generation complete!`);
    console.log(`   Games processed: ${totalGamesProcessed}`);
    console.log(`   Positions added: ${totalPositionsAdded}`);
    if (totalPositionsReevaluated > 0) {
        console.log(`   Positions re-evaluated: ${totalPositionsReevaluated}`);
    }
    console.log(`   Positions skipped (already in table): ${totalPositionsSkipped}`);
    console.log(`   Total positions in table: ${table.size()}`);
    if (finalOutdatedCount > 0) {
        console.log(`   ⚠️  ${finalOutdatedCount} outdated positions remaining (run again to re-evaluate)`);
    }
    console.log(`   Time elapsed: ${elapsedFormatted}`);
    console.log(`   Saved to: ${filePath}`);
}

/**
 * Main function
 */
async function main() {
    console.log('Coral Clash Evaluation Table Generator (Firestore)');
    console.log('==================================================\n');
    console.log('This script will:');
    console.log('  1. Fetch games from Firestore');
    console.log('  2. Walk backwards through each game undoing moves');
    console.log('  3. Generate best moves for each position encountered');
    console.log('  4. Store positions in evaluation table');
    console.log('\nThis may take a while. Progress will be shown below.\n');

    try {
        await generateFromFirestore();
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

export { generateFromFirestore };

