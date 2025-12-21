#!/usr/bin/env node
/**
 * Migrate evaluation table from one version to another
 *
 * This script migrates positions from an older evaluation table version to the current version.
 * All migrated positions are marked as outdated and will be re-evaluated with new scoring logic.
 *
 * Usage:
 *   yarn migrate:eval-table [fromVersion] [toVersion]
 *   or
 *   tsx scripts/migrate-evaluation-table.ts [fromVersion] [toVersion]
 *
 * Examples:
 *   yarn migrate:eval-table 2 3    # Migrate from v2 to v3
 *   yarn migrate:eval-table        # Auto-detect: migrate from latest older version to current
 */

import {
    EVALUATION_VERSION,
    EvaluationTable,
    getEvaluationTablePathForVersion,
} from '../shared/game/v1.0.0/evaluationTable.js';

/**
 * Migrate evaluation table from one version to another
 * @param fromVersion - Source version (if null, auto-detect latest older version)
 * @param toVersion - Target version (defaults to current EVALUATION_VERSION)
 * @returns Promise that resolves when migration is complete
 */
async function migrateTable(
    fromVersion: number | null = null,
    toVersion: number = EVALUATION_VERSION,
): Promise<void> {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Migrating Evaluation Table`);
    console.log('='.repeat(60));

    // Determine source version
    let sourceVersion = fromVersion;
    if (sourceVersion === null) {
        // Auto-detect: find the most recent older version
        console.log(`   Auto-detecting source version...`);
        for (let checkVersion = toVersion - 1; checkVersion >= 1; checkVersion--) {
            try {
                const checkPath = await getEvaluationTablePathForVersion(checkVersion);
                await EvaluationTable.load(checkPath, true); // Try to load (ignore version mismatch)
                sourceVersion = checkVersion;
                console.log(`   ✅ Found v${checkVersion} table`);
                break;
            } catch {
                continue;
            }
        }

        if (sourceVersion === null) {
            console.log(`   ❌ No older version tables found to migrate from`);
            return;
        }
    }

    if (sourceVersion >= toVersion) {
        console.log(`   ❌ Source version (v${sourceVersion}) must be less than target version (v${toVersion})`);
        return;
    }

    console.log(`   Source version: v${sourceVersion}`);
    console.log(`   Target version: v${toVersion}`);

    // Load source table
    let sourceTable: EvaluationTable;
    try {
        const sourcePath = await getEvaluationTablePathForVersion(sourceVersion);
        console.log(`   📦 Loading source table from: ${sourcePath}`);
        sourceTable = await EvaluationTable.load(sourcePath, true); // Ignore version mismatch
        console.log(`   ✅ Loaded ${sourceTable.size()} positions from v${sourceVersion}`);
    } catch (err: any) {
        console.log(`   ❌ Failed to load source table: ${err.message}`);
        return;
    }

    // Load or create target table
    let targetTable: EvaluationTable;
    const targetPath = await getEvaluationTablePathForVersion(toVersion);
    try {
        console.log(`   📦 Loading target table from: ${targetPath}`);
        targetTable = await EvaluationTable.load(targetPath);
        console.log(`   ✅ Target table exists with ${targetTable.size()} positions`);
    } catch {
        console.log(`   📦 Creating new target table`);
        targetTable = new EvaluationTable();
    }

    // Migrate positions
    console.log(`   🔄 Migrating positions...`);
    let migratedCount = 0;
    let skippedCount = 0;

    for (const [hash, moves] of sourceTable.entries()) {
        // Check if position already exists in target
        if (targetTable.getMoves(hash, 'easy')) {
            skippedCount++;
            continue;
        }

        // Add position to target and mark as outdated
        targetTable.setMoves(hash, moves);
        targetTable.markOutdated(hash);
        migratedCount++;
    }

    console.log(`   ✅ Migration complete:`);
    console.log(`      - Migrated: ${migratedCount} positions`);
    console.log(`      - Skipped: ${skippedCount} positions (already in target)`);
    console.log(`      - Total in target: ${targetTable.size()} positions`);
    console.log(`      - Outdated positions: ${migratedCount} (will be re-evaluated)`);

    // Save target table
    try {
        console.log(`   💾 Saving target table to: ${targetPath}`);
        await targetTable.save(targetPath);
        console.log(`   ✅ Saved successfully!`);
    } catch (err: any) {
        console.log(`   ❌ Failed to save target table: ${err.message}`);
        return;
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log('Migration complete!');
    console.log('='.repeat(60));
    console.log(`\nNext steps:`);
    console.log(`   Run: yarn generate:eval-tables`);
    console.log(`   This will re-evaluate outdated positions with new scoring logic`);
}

/**
 * Main function
 */
async function main() {
    console.log('Coral Clash Evaluation Table Migrator');
    console.log('=====================================\n');

    const args = process.argv.slice(2);
    const fromVersion = args[0] ? parseInt(args[0], 10) : null;
    const toVersion = args[1] ? parseInt(args[1], 10) : EVALUATION_VERSION;

    if (fromVersion !== null && (isNaN(fromVersion) || fromVersion < 1)) {
        console.error('Error: fromVersion must be a positive integer');
        process.exit(1);
    }

    if (isNaN(toVersion) || toVersion < 1) {
        console.error('Error: toVersion must be a positive integer');
        process.exit(1);
    }

    try {
        await migrateTable(fromVersion, toVersion);
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

export { migrateTable };

