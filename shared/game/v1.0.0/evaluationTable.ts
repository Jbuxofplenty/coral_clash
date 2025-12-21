/**
 * Evaluation Table for Pre-computed Best Moves
 *
 * Stores top 3 moves for each position keyed by Zobrist hash for fast lookup.
 * Difficulty levels are determined by which moves are selected:
 * - Hard: Always best move
 * - Medium: Randomly choose between best and second best
 * - Easy: Randomly choose from all 3 stored moves
 *
 * Supports binary serialization/deserialization for efficient file storage.
 *
 * Note: File I/O operations require Node.js fs module and are only available
 * in Node.js environments (server-side). In browser/React Native environments,
 * the table can still be used in-memory or loaded from pre-bundled data.
 */

// Lazy-load Node.js modules only when needed (not at module load time)
// This prevents React Native bundler from trying to import fs/path
let fs: typeof import('fs') | null = null;
let path: typeof import('path') | null = null;

/**
 * Lazy-load fs module (only when actually needed, not at module load time)
 * This prevents React Native bundler errors
 */
function getFs(): typeof import('fs') | null {
    if (fs !== null && fs !== undefined) {
        return fs;
    }

    // Only try to load fs if we're in a Node.js environment
    // Check for Node.js-specific globals to avoid React Native bundler issues
    if (typeof process === 'undefined' || !process.versions || !process.versions.node) {
        return null;
    }

    try {
        if (typeof require !== 'undefined') {
            // Use eval to prevent Metro bundler from statically analyzing this
            // Metro can't analyze eval() calls, so it won't try to bundle 'fs'

            fs = eval('require')('fs');
        }
    } catch {
        fs = null;
    }
    return fs;
}

/**
 * Lazy-load path module (only when actually needed, not at module load time)
 * This prevents React Native bundler errors
 */
function getPath(): typeof import('path') | null {
    if (path !== null && path !== undefined) {
        return path;
    }

    // Only try to load path if we're in a Node.js environment
    if (typeof process === 'undefined' || !process.versions || !process.versions.node) {
        return null;
    }

    try {
        if (typeof require !== 'undefined') {
            // Use eval to prevent Metro bundler from statically analyzing this
            // Metro can't analyze eval() calls, so it won't try to bundle 'path'

            path = eval('require')('path');
        }
    } catch {
        path = null;
    }
    return path;
}

/**
 * Binary file format (v2):
 * - Magic number: 0x434F5241 ("CORA" in ASCII) - 4 bytes
 * - File format version: uint8 (2) - 1 byte
 * - Evaluation version: uint8 (incremented when evaluation logic changes) - 1 byte
 * - Entry count: uint32 - 4 bytes
 * - Timestamp: uint64 (Unix timestamp in milliseconds) - 8 bytes
 * - Entries: Array of {
 *     hash: uint64 (8 bytes),
 *     moveCount: uint8 (1-3, number of moves stored),
 *     moves: Array of move data (variable length)
 *   }
 *
 * Move format (compact):
 * - from: 2 bytes (char codes for square like "a1")
 * - to: 2 bytes (char codes for square)
 * - flags: uint8 (bit 0: coralPlaced, bit 1: coralRemoved, bits 2-7: promotion piece type 0-6)
 * - coralRemovedSquaresCount: uint8 (0-8, number of squares)
 * - coralRemovedSquares: Array of 2-byte squares (if coralRemovedSquaresCount > 0)
 *
 * Total per move: 6 + (coralRemovedSquaresCount * 2) bytes
 *
 * EVALUATION VERSION:
 * Increment this when you change the evaluation logic (evaluatePosition function or alphaBeta move scoring).
 * This ensures old evaluation tables are not used with new evaluation logic.
 *
 * To update the version:
 * 1. Change EVALUATION_VERSION below (e.g., from 2 to 3)
 * 2. Rebuild the shared package: `cd shared && yarn build`
 * 3. Regenerate evaluation tables: `yarn generate:eval-tables`
 *
 * Old tables will be automatically ignored (version mismatch error on load).
 * New tables will be saved with the new version in the filename (e.g., moves.v3.bin).
 *
 * Version history:
 * - v1: Initial evaluation logic
 * - v2: Enhanced piece safety and threat detection
 * - v3: Added defensive move bonuses for protecting valuable pieces
 */

const MAGIC_NUMBER = 0x434f5241; // "CORA"
const FILE_FORMAT_VERSION = 2; // File format version (structure of binary file) - bumped to 2 for move storage
export const EVALUATION_VERSION = 3; // Evaluation logic version (increment when evaluatePosition changes)
// Version 3: Added defensive move bonuses for protecting valuable pieces

export type DifficultyLevel = 'easy' | 'medium' | 'hard';

/**
 * Compact move representation for storage
 */
export interface StoredMove {
    from: string;
    to: string;
    promotion?: string;
    coralPlaced?: boolean;
    coralRemoved?: boolean;
    coralRemovedSquares?: string[];
}

/**
 * Statistics for cache performance tracking
 */
export interface EvaluationTableStats {
    hits: number;
    misses: number;
    totalLookups: number;
    hitRate: number; // Percentage (0-100)
}

/**
 * Evaluation table for storing top moves per position
 * Uses Zobrist hash as key for fast lookups
 */
export class EvaluationTable {
    // Map<hash, [bestMove, secondBestMove, thirdBestMove]>
    private table: Map<number, StoredMove[]> = new Map();
    // Set of position hashes that came from an older evaluation version (need re-evaluation)
    private outdatedPositions: Set<number> = new Set();
    private stats = {
        hits: 0,
        misses: 0,
    };

    /**
     * Get top moves for a position hash
     * @param hash - Zobrist hash of the position
     * @param difficulty - Difficulty level to determine which moves to return
     * @returns Array of available moves (1-3 moves) or null if not found
     */
    getMoves(hash: number, difficulty: DifficultyLevel): StoredMove[] | null {
        // Don't return cached moves if position is outdated (needs re-evaluation with new scoring)
        if (this.isOutdated(hash)) {
            this.stats.misses++;
            return null;
        }

        const moves = this.table.get(hash);
        if (moves !== undefined && moves.length > 0) {
            this.stats.hits++;

            // Filter moves based on difficulty
            if (difficulty === 'hard') {
                // Hard: only best move
                return [moves[0]];
            } else if (difficulty === 'medium') {
                // Medium: best and second best (if available)
                return moves.slice(0, Math.min(2, moves.length));
            } else {
                // Easy: all available moves
                return moves;
            }
        } else {
            this.stats.misses++;
            return null;
        }
    }

    /**
     * Check if a position is marked as outdated (needs re-evaluation)
     * @param hash - Zobrist hash of the position
     * @returns true if position needs re-evaluation
     */
    isOutdated(hash: number): boolean {
        return this.outdatedPositions.has(hash);
    }

    /**
     * Mark a position as outdated (needs re-evaluation)
     * @param hash - Zobrist hash of the position
     */
    markOutdated(hash: number): void {
        this.outdatedPositions.add(hash);
    }

    /**
     * Mark a position as up-to-date (no longer needs re-evaluation)
     * Called when position is re-evaluated with current evaluation version
     * @param hash - Zobrist hash of the position
     */
    markUpToDate(hash: number): void {
        this.outdatedPositions.delete(hash);
    }

    /**
     * Mark all positions in the table as outdated
     * Useful when migrating from an old evaluation version
     */
    markAllOutdated(): void {
        for (const hash of this.table.keys()) {
            this.outdatedPositions.add(hash);
        }
    }

    /**
     * Get count of outdated positions
     * @returns Number of positions marked as outdated
     */
    getOutdatedCount(): number {
        return this.outdatedPositions.size;
    }

    /**
     * Get all outdated position hashes
     * @returns Set of position hashes that need re-evaluation
     */
    getOutdatedPositions(): Set<number> {
        return new Set(this.outdatedPositions);
    }

    /**
     * Store top moves for a position hash
     * @param hash - Zobrist hash of the position
     * @param moves - Array of moves (up to 3, sorted by quality: best first)
     */
    setMoves(hash: number, moves: StoredMove[]): void {
        // Store up to 3 moves
        this.table.set(hash, moves.slice(0, 3));
        // When storing new moves, mark position as up-to-date (re-evaluated with current version)
        this.markUpToDate(hash);
    }

    /**
     * Get the number of entries in the table
     */
    size(): number {
        return this.table.size;
    }

    /**
     * Clear all entries from the table
     */
    clear(): void {
        this.table.clear();
    }

    /**
     * Check if table has an entry for the given hash
     */
    has(hash: number): boolean {
        return this.table.has(hash);
    }

    /**
     * Serialize a move to compact binary format
     */
    private serializeMove(move: StoredMove): Buffer {
        // Flags byte: bit 0 = coralPlaced, bit 1 = coralRemoved, bits 2-7 = promotion (0-6)
        let flags = 0;
        if (move.coralPlaced) flags |= 0x01;
        if (move.coralRemoved) flags |= 0x02;
        const promotionValue = move.promotion
            ? ['p', 'n', 'b', 'r', 'q', 'k'].indexOf(move.promotion.toLowerCase()) + 1
            : 0;
        flags |= (promotionValue << 2) & 0xfc;

        const coralSquares = move.coralRemovedSquares || [];
        const coralSquaresCount = Math.min(coralSquares.length, 8); // Max 8 squares

        // Buffer: from(2) + to(2) + flags(1) + count(1) + squares(2*count) = 6 + 2*count bytes
        const buffer = Buffer.allocUnsafe(6 + coralSquaresCount * 2);
        let offset = 0;

        buffer.write(move.from, offset, 2, 'ascii');
        offset += 2;
        buffer.write(move.to, offset, 2, 'ascii');
        offset += 2;
        buffer.writeUInt8(flags, offset);
        offset += 1;
        buffer.writeUInt8(coralSquaresCount, offset);
        offset += 1;

        for (let i = 0; i < coralSquaresCount; i++) {
            buffer.write(coralSquares[i], offset, 2, 'ascii');
            offset += 2;
        }

        return buffer;
    }

    /**
     * Deserialize a move from compact binary format
     */
    private deserializeMove(
        buffer: Buffer,
        offset: number,
    ): { move: StoredMove; bytesRead: number } {
        const from = buffer.toString('ascii', offset, offset + 2);
        offset += 2;
        const to = buffer.toString('ascii', offset, offset + 2);
        offset += 2;
        const flags = buffer.readUInt8(offset);
        offset += 1;
        const coralSquaresCount = buffer.readUInt8(offset);
        offset += 1;

        const coralPlaced = (flags & 0x01) !== 0;
        const coralRemoved = (flags & 0x02) !== 0;
        const promotionValue = (flags >> 2) & 0x3f;
        const promotion =
            promotionValue > 0 ? ['p', 'n', 'b', 'r', 'q', 'k'][promotionValue - 1] : undefined;

        const coralRemovedSquares: string[] = [];
        for (let i = 0; i < coralSquaresCount; i++) {
            const square = buffer.toString('ascii', offset, offset + 2);
            offset += 2;
            coralRemovedSquares.push(square);
        }

        const move: StoredMove = {
            from,
            to,
            ...(promotion && { promotion }),
            ...(coralPlaced && { coralPlaced: true }),
            ...(coralRemoved && { coralRemoved: true }),
            ...(coralRemovedSquares.length > 0 && { coralRemovedSquares }),
        };

        return { move, bytesRead: 6 + coralSquaresCount * 2 };
    }

    /**
     * Save evaluation table to a binary file
     * @param filePath - Path to save the file
     * @returns Promise that resolves when file is written
     * @throws Error if fs module is not available (not in Node.js environment)
     */
    async save(filePath: string): Promise<void> {
        // Check if we're in Node.js environment first (prevents Metro bundler from trying to bundle 'fs')
        if (typeof process === 'undefined' || !process.versions || !process.versions.node) {
            throw new Error(
                'File I/O is only available in Node.js environments. Use toBuffer() to get binary data instead.',
            );
        }

        const fsModule = getFs();
        if (!fsModule) {
            throw new Error(
                'File I/O is only available in Node.js environments. Use toBuffer() to get binary data instead.',
            );
        }

        const entries = Array.from(this.table.entries());
        const entryCount = entries.length;
        const timestamp = Date.now();

        // Calculate buffer size
        let bufferSize = 18; // Header: magic(4) + fileFormatVersion(1) + evaluationVersion(1) + entryCount(4) + timestamp(8)

        for (const [_hash, moves] of entries) {
            bufferSize += 8; // hash (64-bit)
            bufferSize += 1; // moveCount
            for (const move of moves) {
                const coralSquares = move.coralRemovedSquares || [];
                bufferSize += 6 + coralSquares.length * 2; // move data
            }
        }

        const buffer = Buffer.allocUnsafe(bufferSize);
        let offset = 0;

        // Write magic number (4 bytes, big-endian)
        buffer.writeUInt32BE(MAGIC_NUMBER, offset);
        offset += 4;

        // Write file format version (1 byte)
        buffer.writeUInt8(FILE_FORMAT_VERSION, offset);
        offset += 1;

        // Write evaluation version (1 byte)
        buffer.writeUInt8(EVALUATION_VERSION, offset);
        offset += 1;

        // Write entry count (4 bytes, big-endian)
        buffer.writeUInt32BE(entryCount, offset);
        offset += 4;

        // Write timestamp (8 bytes, big-endian)
        const timestampHigh = Math.floor(timestamp / 0x100000000);
        const timestampLow = timestamp & 0xffffffff;
        buffer.writeUInt32BE(timestampHigh, offset);
        offset += 4;
        buffer.writeUInt32BE(timestampLow, offset);
        offset += 4;

        // Write entries
        for (const [hash, moves] of entries) {
            // Write hash (64-bit)
            const hashBigInt = BigInt(hash);
            const hashUnsigned = hashBigInt & 0xffffffffffffffffn;
            const hashHigh = Number((hashUnsigned >> 32n) & 0xffffffffn);
            const hashLow = Number(hashUnsigned & 0xffffffffn);
            buffer.writeUInt32BE(hashHigh >>> 0, offset);
            offset += 4;
            buffer.writeUInt32BE(hashLow >>> 0, offset);
            offset += 4;

            // Write move count (1-3)
            const moveCount = Math.min(moves.length, 3);
            buffer.writeUInt8(moveCount, offset);
            offset += 1;

            // Write moves
            for (let i = 0; i < moveCount; i++) {
                const moveBuf = this.serializeMove(moves[i]);
                moveBuf.copy(buffer, offset);
                offset += moveBuf.length;
            }
        }

        // Ensure directory exists
        const pathModule = getPath();
        if (!pathModule) {
            throw new Error('Path utilities are only available in Node.js environments.');
        }
        const dir = pathModule.dirname(filePath);
        if (!fsModule.existsSync(dir)) {
            fsModule.mkdirSync(dir, { recursive: true });
        }

        // Write file
        await fsModule.promises.writeFile(filePath, buffer);
    }

    /**
     * Convert evaluation table to binary buffer
     * Useful for environments without file system access
     * @returns Buffer containing serialized table
     */
    toBuffer(): Buffer {
        const entries = Array.from(this.table.entries());
        const entryCount = entries.length;
        const timestamp = Date.now();

        // Calculate buffer size
        let bufferSize = 18; // Header
        for (const [_hash, moves] of entries) {
            bufferSize += 8; // hash
            bufferSize += 1; // moveCount
            for (const move of moves) {
                const coralSquares = move.coralRemovedSquares || [];
                bufferSize += 6 + coralSquares.length * 2;
            }
        }

        const buffer = Buffer.allocUnsafe(bufferSize);
        let offset = 0;

        // Write header (same as save method)
        buffer.writeUInt32BE(MAGIC_NUMBER, offset);
        offset += 4;
        buffer.writeUInt8(FILE_FORMAT_VERSION, offset);
        offset += 1;
        buffer.writeUInt8(EVALUATION_VERSION, offset);
        offset += 1;
        buffer.writeUInt32BE(entryCount, offset);
        offset += 4;
        const timestampHigh = Math.floor(timestamp / 0x100000000);
        const timestampLow = timestamp & 0xffffffff;
        buffer.writeUInt32BE(timestampHigh, offset);
        offset += 4;
        buffer.writeUInt32BE(timestampLow, offset);
        offset += 4;

        // Write entries (same as save method)
        for (const [hash, moves] of entries) {
            const hashBigInt = BigInt(hash);
            const hashUnsigned = hashBigInt & 0xffffffffffffffffn;
            const hashHigh = Number((hashUnsigned >> 32n) & 0xffffffffn);
            const hashLow = Number(hashUnsigned & 0xffffffffn);
            buffer.writeUInt32BE(hashHigh >>> 0, offset);
            offset += 4;
            buffer.writeUInt32BE(hashLow >>> 0, offset);
            offset += 4;
            const moveCount = Math.min(moves.length, 3);
            buffer.writeUInt8(moveCount, offset);
            offset += 1;
            for (let i = 0; i < moveCount; i++) {
                const moveBuf = this.serializeMove(moves[i]);
                moveBuf.copy(buffer, offset);
                offset += moveBuf.length;
            }
        }

        return buffer;
    }

    /**
     * Load evaluation table from a binary file
     * @param filePath - Path to the binary file
     * @param ignoreVersionMismatch - If true, load table even if evaluation version doesn't match (for migration)
     * @returns Promise that resolves to EvaluationTable instance
     * @throws Error if fs module is not available (not in Node.js environment)
     */
    static async load(
        filePath: string,
        ignoreVersionMismatch: boolean = false,
    ): Promise<EvaluationTable> {
        // Check if we're in Node.js environment first (prevents Metro bundler from trying to bundle 'fs')
        if (typeof process === 'undefined' || !process.versions || !process.versions.node) {
            throw new Error(
                'File I/O is only available in Node.js environments. Use fromBuffer() with pre-loaded data instead.',
            );
        }

        // Dynamically import fs module (works in both CommonJS and ESM)
        let fsModule: typeof import('fs');
        try {
            if (typeof require !== 'undefined') {
                // CommonJS context - use eval to prevent Metro from bundling
                // Metro can't analyze eval() calls, so it won't try to bundle 'fs'

                fsModule = eval('require')('fs');
            } else {
                // ESM context - use Function constructor to prevent Metro from analyzing
                // Metro can't analyze Function() calls, so it won't try to bundle 'fs'
                // Use string concatenation to prevent static analysis of module name

                const importFunc = new Function('specifier', 'return import(specifier)');
                const moduleName = 'f' + 's'; // Metro can't statically analyze this
                const fsImport = await importFunc(moduleName);
                fsModule = fsImport.default || fsImport;
            }
        } catch (_err) {
            throw new Error(
                'File I/O is only available in Node.js environments. Use fromBuffer() with pre-loaded data instead.',
            );
        }
        const buffer = await fsModule.promises.readFile(filePath);
        return EvaluationTable.fromBuffer(buffer, ignoreVersionMismatch);
    }

    /**
     * Load evaluation table from a binary buffer
     * Useful for environments without file system access
     * @param buffer - Buffer containing serialized table
     * @param ignoreVersionMismatch - If true, load table even if evaluation version doesn't match (for migration)
     * @returns EvaluationTable instance
     */
    static fromBuffer(buffer: Buffer, ignoreVersionMismatch: boolean = false): EvaluationTable {
        const table = new EvaluationTable();
        let offset = 0;

        // Read magic number
        const magic = buffer.readUInt32BE(offset);
        offset += 4;
        if (magic !== MAGIC_NUMBER) {
            throw new Error(
                `Invalid file format: expected magic number ${MAGIC_NUMBER.toString(16)}, got ${magic.toString(16)}`,
            );
        }

        // Read file format version
        const fileFormatVersion = buffer.readUInt8(offset);
        offset += 1;
        if (fileFormatVersion !== FILE_FORMAT_VERSION) {
            throw new Error(
                `Unsupported file format version: expected ${FILE_FORMAT_VERSION}, got ${fileFormatVersion}. Please regenerate the table.`,
            );
        }

        // Read evaluation version
        const evaluationVersion = buffer.readUInt8(offset);
        offset += 1;
        if (!ignoreVersionMismatch && evaluationVersion !== EVALUATION_VERSION) {
            throw new Error(
                `Evaluation version mismatch: file has version ${evaluationVersion}, but code expects ${EVALUATION_VERSION}. ` +
                    `Please regenerate the evaluation table or update EVALUATION_VERSION in evaluationTable.ts`,
            );
        }

        // Read entry count
        const entryCount = buffer.readUInt32BE(offset);
        offset += 4;

        // Read timestamp
        const timestampHigh = buffer.readUInt32BE(offset);
        offset += 4;
        const timestampLow = buffer.readUInt32BE(offset);
        offset += 4;
        const _timestamp = timestampHigh * 0x100000000 + timestampLow;

        // Read entries
        for (let i = 0; i < entryCount; i++) {
            // Read hash (64-bit)
            const hashHigh = buffer.readUInt32BE(offset);
            offset += 4;
            const hashLow = buffer.readUInt32BE(offset);
            offset += 4;
            const hashBigInt = (BigInt(hashHigh) << 32n) | BigInt(hashLow);
            let hash = Number(hashBigInt);
            if (hashHigh >= 0x80000000) {
                hash = Number(hashBigInt - (1n << 64n));
            }

            // Read move count
            const moveCount = buffer.readUInt8(offset);
            offset += 1;

            // Read moves
            const moves: StoredMove[] = [];
            for (let j = 0; j < moveCount; j++) {
                const { move, bytesRead } = table.deserializeMove(buffer, offset);
                moves.push(move);
                offset += bytesRead;
            }

            table.setMoves(hash, moves);
        }

        return table;
    }

    /**
     * Get metadata about the table (for debugging/info)
     */
    getMetadata(): {
        size: number;
        timestamp?: number;
    } {
        return {
            size: this.size(),
        };
    }

    /**
     * Get cache statistics
     */
    getStats(): EvaluationTableStats {
        const totalLookups = this.stats.hits + this.stats.misses;
        const hitRate = totalLookups > 0 ? (this.stats.hits / totalLookups) * 100 : 0;
        return {
            hits: this.stats.hits,
            misses: this.stats.misses,
            totalLookups,
            hitRate,
        };
    }

    /**
     * Reset cache statistics
     */
    resetStats(): void {
        this.stats.hits = 0;
        this.stats.misses = 0;
    }

    /**
     * Merge another evaluation table into this one
     * If a position exists in both tables, keeps the moves from this table (current table takes precedence)
     * @param otherTable - Table to merge from
     */
    merge(otherTable: EvaluationTable): void {
        for (const [hash, moves] of otherTable.table.entries()) {
            // Only add if not already present (current table takes precedence)
            if (!this.table.has(hash)) {
                this.table.set(hash, moves);
            }
        }
    }

    /**
     * Get all entries (for iteration/merging)
     */
    entries(): IterableIterator<[number, StoredMove[]]> {
        return this.table.entries();
    }
}

/**
 * Get the path for an evaluation table file with a specific version
 * @param version - Evaluation version number (defaults to current EVALUATION_VERSION)
 * @param baseDir - Base directory (defaults to evaluationData in same directory as this file)
 * @returns File path
 * @throws Error if path module is not available (not in Node.js environment)
 */
export async function getEvaluationTablePathForVersion(
    version: number,
    baseDir?: string,
): Promise<string> {
    // Check if we're in Node.js environment first (prevents Metro bundler from trying to bundle 'path')
    if (typeof process === 'undefined' || !process.versions || !process.versions.node) {
        throw new Error('Path utilities are only available in Node.js environments.');
    }

    // Dynamically import path module (works in both CommonJS and ESM)
    let pathModule: typeof import('path');
    try {
        if (typeof require !== 'undefined') {
            // CommonJS context - use eval to prevent Metro from bundling
            // Metro can't analyze eval() calls, so it won't try to bundle 'path'

            pathModule = eval('require')('path');
        } else {
            // ESM context - use Function constructor to prevent Metro from analyzing
            // Metro can't analyze Function() calls, so it won't try to bundle 'path'
            // Use string concatenation to prevent static analysis of module name

            const importFunc = new Function('specifier', 'return import(specifier)');
            const moduleName = 'p' + 'a' + 't' + 'h'; // Metro can't statically analyze this
            const pathImport = await importFunc(moduleName);
            pathModule = pathImport.default || pathImport;
        }
    } catch (_err) {
        throw new Error('Path utilities are only available in Node.js environments.');
    }

    // Get __dirname equivalent for ESM
    let dirname: string;
    if (typeof __dirname !== 'undefined') {
        // CommonJS context (Jest, Node.js CommonJS)
        dirname = __dirname;
    } else {
        // ESM context - use import.meta.url
        // Use try-catch to handle cases where import.meta is not available (e.g., Jest)
        try {
            const urlModule = await import('url');
            const { fileURLToPath } = urlModule.default || urlModule;
            // Access import.meta through Function constructor to avoid Jest parsing it at module load time
            const importMeta = new Function('return import.meta')();
            if (importMeta && importMeta.url) {
                dirname = pathModule.dirname(fileURLToPath(importMeta.url));
            } else {
                throw new Error('import.meta.url not available');
            }
        } catch {
            // Fallback: use process.cwd() if import.meta is not available
            // This happens in Jest/CommonJS contexts
            dirname = pathModule.join(process.cwd(), 'shared', 'game', 'v1.0.0');
        }
    }

    const defaultBaseDir = pathModule.join(dirname, 'evaluationData');
    const dir = baseDir || defaultBaseDir;
    // Single table file: moves.v{version}.bin
    return pathModule.join(dir, `moves.v${version}.bin`);
}

/**
 * Get the default path for an evaluation table file (current version)
 * Single table for all difficulties
 * @param baseDir - Base directory (defaults to evaluationData in same directory as this file)
 * @returns File path
 * @throws Error if path module is not available (not in Node.js environment)
 */
export async function getEvaluationTablePath(baseDir?: string): Promise<string> {
    return getEvaluationTablePathForVersion(EVALUATION_VERSION, baseDir);
}
