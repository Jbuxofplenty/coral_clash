/**
 * Utility for loading game state fixtures in tests and serializing game state
 * Shared between mobile app and Firebase Functions
 */

export interface GameStateFixture {
    schemaVersion: string;
    exportedAt: string;
    state: {
        fen: string;
        board: any[][];
        history: any[];
        turn: string; // 'w' | 'b' at runtime, but JSON import loses literal types
        whalePositions?: { w: string[] | null; b: string[] | null }; // v1.1.0+, accepts array or tuple
        coral?: { square: string; color: string }[]; // v1.2.0+ coral placement
        coralRemaining?: { w: number; b: number }; // v1.2.0+ coral counts
        isGameOver: boolean;
        inCheck: boolean;
        isCheckmate: boolean;
        isStalemate: boolean;
        isDraw: boolean;
        isCoralVictory: false | string | null; // 'w' | 'b' at runtime
    };
}

/**
 * NOTE: The loadFixture() function has been removed because dynamic imports
 * don't work reliably with React Native's Metro bundler.
 *
 * For Jest tests: Import fixtures directly using ES module imports
 * For React Native: Import fixtures statically at the top of your file
 *
 * Example:
 *   import fixture from './__fixtures__/whale-move-diagonally.json';
 *   applyFixture(game, fixture);
 */

/**
 * Apply a game state fixture to a CoralClash instance
 * @param coralClash - The CoralClash instance
 * @param fixture - The game state fixture
 * @param options - Optional configuration
 * @param options.skipValidation - Skip FEN validation (useful for tutorial/demo scenarios)
 */
export function applyFixture(
    coralClash: any,
    fixture: GameStateFixture,
    options: { skipValidation?: boolean } = {},
): void {
    // Load the game state using the FEN
    coralClash.load(fixture.state.fen, { skipValidation: options.skipValidation ?? false });

    // v1.1.0+: Restore whale positions if present
    // This is necessary because FEN doesn't encode whale orientation
    if (fixture.state.whalePositions) {
        const Ox88 = coralClash._Ox88 || {
            a8: 0x00,
            b8: 0x01,
            c8: 0x02,
            d8: 0x03,
            e8: 0x04,
            f8: 0x05,
            g8: 0x06,
            h8: 0x07,
            a7: 0x10,
            b7: 0x11,
            c7: 0x12,
            d7: 0x13,
            e7: 0x14,
            f7: 0x15,
            g7: 0x16,
            h7: 0x17,
            a6: 0x20,
            b6: 0x21,
            c6: 0x22,
            d6: 0x23,
            e6: 0x24,
            f6: 0x25,
            g6: 0x26,
            h6: 0x27,
            a5: 0x30,
            b5: 0x31,
            c5: 0x32,
            d5: 0x33,
            e5: 0x34,
            f5: 0x35,
            g5: 0x36,
            h5: 0x37,
            a4: 0x40,
            b4: 0x41,
            c4: 0x42,
            d4: 0x43,
            e4: 0x44,
            f4: 0x45,
            g4: 0x46,
            h4: 0x47,
            a3: 0x50,
            b3: 0x51,
            c3: 0x52,
            d3: 0x53,
            e3: 0x54,
            f3: 0x55,
            g3: 0x56,
            h3: 0x57,
            a2: 0x60,
            b2: 0x61,
            c2: 0x62,
            d2: 0x63,
            e2: 0x64,
            f2: 0x65,
            g2: 0x66,
            h2: 0x67,
            a1: 0x70,
            b1: 0x71,
            c1: 0x72,
            d1: 0x73,
            e1: 0x74,
            f1: 0x75,
            g1: 0x76,
            h1: 0x77,
        };

        // Restore white whale position if present
        if (fixture.state.whalePositions.w) {
            const [first, second] = fixture.state.whalePositions.w;
            coralClash._kings.w = [Ox88[first], Ox88[second]];
        }

        // Restore black whale position if present
        if (fixture.state.whalePositions.b) {
            const [first, second] = fixture.state.whalePositions.b;
            coralClash._kings.b = [Ox88[first], Ox88[second]];
        }
    }

    // v1.2.0+: Restore coral remaining counts FIRST (before placing coral)
    // This ensures we have the correct counts when placing coral
    if (fixture.state.coralRemaining) {
        coralClash._coralRemaining = { ...fixture.state.coralRemaining };
    }

    // v1.2.0+: Restore coral state if present
    // Note: We bypass placeCoral() and directly set coral to avoid decrementing coralRemaining
    if (fixture.state.coral && coralClash._coral) {
        const Ox88 = coralClash._Ox88 || {
            a8: 0x00,
            b8: 0x01,
            c8: 0x02,
            d8: 0x03,
            e8: 0x04,
            f8: 0x05,
            g8: 0x06,
            h8: 0x07,
            a7: 0x10,
            b7: 0x11,
            c7: 0x12,
            d7: 0x13,
            e7: 0x14,
            f7: 0x15,
            g7: 0x16,
            h7: 0x17,
            a6: 0x20,
            b6: 0x21,
            c6: 0x22,
            d6: 0x23,
            e6: 0x24,
            f6: 0x25,
            g6: 0x26,
            h6: 0x27,
            a5: 0x30,
            b5: 0x31,
            c5: 0x32,
            d5: 0x33,
            e5: 0x34,
            f5: 0x35,
            g5: 0x36,
            h5: 0x37,
            a4: 0x40,
            b4: 0x41,
            c4: 0x42,
            d4: 0x43,
            e4: 0x44,
            f4: 0x45,
            g4: 0x46,
            h4: 0x47,
            a3: 0x50,
            b3: 0x51,
            c3: 0x52,
            d3: 0x53,
            e3: 0x54,
            f3: 0x55,
            g3: 0x56,
            h3: 0x57,
            a2: 0x60,
            b2: 0x61,
            c2: 0x62,
            d2: 0x63,
            e2: 0x64,
            f2: 0x65,
            g2: 0x66,
            h2: 0x67,
            a1: 0x70,
            b1: 0x71,
            c1: 0x72,
            d1: 0x73,
            e1: 0x74,
            f1: 0x75,
            g1: 0x76,
            h1: 0x77,
        };

        fixture.state.coral.forEach(({ square, color }) => {
            const sq = Ox88[square];
            if (sq !== undefined) {
                coralClash._coral[sq] = color;
            }
        });
    }

    // Restore piece roles from board array (for tutorial scenarios)
    // FEN doesn't encode role information, so we need to restore it manually
    if (fixture.state.board) {
        const Ox88 = coralClash._Ox88 || {
            a8: 0x00,
            b8: 0x01,
            c8: 0x02,
            d8: 0x03,
            e8: 0x04,
            f8: 0x05,
            g8: 0x06,
            h8: 0x07,
            a7: 0x10,
            b7: 0x11,
            c7: 0x12,
            d7: 0x13,
            e7: 0x14,
            f7: 0x15,
            g7: 0x16,
            h7: 0x17,
            a6: 0x20,
            b6: 0x21,
            c6: 0x22,
            d6: 0x23,
            e6: 0x24,
            f6: 0x25,
            g6: 0x26,
            h6: 0x27,
            a5: 0x30,
            b5: 0x31,
            c5: 0x32,
            d5: 0x33,
            e5: 0x34,
            f5: 0x35,
            g5: 0x36,
            h5: 0x37,
            a4: 0x40,
            b4: 0x41,
            c4: 0x42,
            d4: 0x43,
            e4: 0x44,
            f4: 0x45,
            g4: 0x46,
            h4: 0x47,
            a3: 0x50,
            b3: 0x51,
            c3: 0x52,
            d3: 0x53,
            e3: 0x54,
            f3: 0x55,
            g3: 0x56,
            h3: 0x57,
            a2: 0x60,
            b2: 0x61,
            c2: 0x62,
            d2: 0x63,
            e2: 0x64,
            f2: 0x65,
            g2: 0x66,
            h2: 0x67,
            a1: 0x70,
            b1: 0x71,
            c1: 0x72,
            d1: 0x73,
            e1: 0x74,
            f1: 0x75,
            g1: 0x76,
            h1: 0x77,
        };

        fixture.state.board.flat().forEach((piece) => {
            if (piece && piece.role) {
                const square0x88 = Ox88[piece.square];
                if (coralClash._board[square0x88]) {
                    coralClash._board[square0x88].role = piece.role;
                }
            }
        });
    }
}

/**
 * Validate that a game state fixture has the expected schema version
 * @param fixture - The game state fixture
 * @param expectedVersion - The expected schema version (defaults to latest)
 */
export function validateFixtureVersion(
    fixture: GameStateFixture,
    expectedVersion: string = '1.3.0',
): void {
    if (fixture.schemaVersion !== expectedVersion) {
        console.warn(
            `Fixture schema version mismatch: expected ${expectedVersion}, got ${fixture.schemaVersion}`,
        );
    }
}

/**
 * Create a minimal fixture for testing (helper for creating test data)
 * @param fen - The FEN string representing the board state
 * @param metadata - Additional metadata to include
 */
export function createTestFixture(
    fen: string,
    metadata: Partial<GameStateFixture['state']> = {},
): GameStateFixture {
    return {
        schemaVersion: '1.3.0',
        exportedAt: new Date().toISOString(),
        state: {
            fen,
            board: [],
            history: [],
            turn: 'w',
            whalePositions: undefined, // Will be populated if needed
            coral: undefined, // Will be populated if needed
            coralRemaining: undefined, // Will be populated if needed
            isGameOver: false,
            inCheck: false,
            isCheckmate: false,
            isStalemate: false,
            isDraw: false,
            isCoralVictory: false,
            ...metadata,
        },
    };
}

/**
 * Export current game state to a fixture
 * Useful for saving game state to database or creating test fixtures
 * @param coralClash - The CoralClash instance
 * @returns GameStateFixture object
 *
 * Note: v1.3.0+ supports capturing opponentType ('computer', 'passandplay', 'pvp')
 * but we intentionally don't include it in exports. The UI allows choosing the mode
 * when loading a fixture, making fixtures reusable across different game types.
 */
export function exportGameState(coralClash: any): GameStateFixture {
    return {
        schemaVersion: '1.3.0',
        exportedAt: new Date().toISOString(),
        state: {
            fen: coralClash.fen(),
            board: coralClash.board(),
            history: coralClash.history({ verbose: true }),
            turn: coralClash.turn(),
            whalePositions: coralClash.whalePositions(),
            coral: coralClash.getAllCoral(),
            coralRemaining: coralClash.getCoralRemainingCounts(),
            isGameOver: coralClash.isGameOver(),
            inCheck: coralClash.inCheck(),
            isCheckmate: coralClash.isCheckmate(),
            isStalemate: coralClash.isStalemate(),
            isDraw: coralClash.isDraw(),
            isCoralVictory: coralClash.isCoralVictory(),
        },
    };
}

/**
 * Import game state from a fixture
 * Alias for applyFixture for consistency with exportGameState
 * @param coralClash - The CoralClash instance
 * @param fixture - The game state fixture
 * @param options - Optional configuration
 * @param options.skipValidation - Skip FEN validation (useful for tutorial/demo scenarios)
 */
export function importGameState(
    coralClash: any,
    fixture: GameStateFixture,
    options: { skipValidation?: boolean } = {},
): void {
    applyFixture(coralClash, fixture, options);
}

/**
 * Create a lightweight game snapshot for Firestore storage
 * Omits verbose data like full board state and history
 * @param coralClash - The CoralClash instance
 * @returns Minimal game state object suitable for Firestore
 */
export function createGameSnapshot(coralClash: any) {
    // Get piece roles from the board (hunter/gatherer status)
    const board = coralClash.board();
    const pieceRoles: { [square: string]: 'hunter' | 'gatherer' } = {};

    // Extract role information for each piece
    board.flat().forEach((cell: any) => {
        if (cell && cell.role) {
            pieceRoles[cell.square] = cell.role;
        }
    });

    // Get PGN for move history (includes initial FEN and all moves)
    // This is essential for undo functionality
    const pgn = coralClash.pgn();

    const coral = coralClash.getAllCoral();

    const snapshot = {
        fen: coralClash.fen(),
        turn: coralClash.turn(),
        whalePositions: coralClash.whalePositions(),
        coral: coral,
        coralRemaining: coralClash.getCoralRemainingCounts(),
        pieceRoles: pieceRoles, // Save hunter/gatherer status for each piece
        pgn: pgn, // Save PGN for move history and undo functionality
        isCheck: coralClash.inCheck(),
        isCheckmate: coralClash.isCheckmate(),
        isGameOver: coralClash.isGameOver(),
        isCoralVictory: coralClash.isCoralVictory(),
        isDraw: coralClash.isDraw(),
        resigned: coralClash.isResigned(), // Include resignation status (Color | null)
    };

    return snapshot;
}

/**
 * Restore game from a lightweight snapshot
 * @param coralClash - The CoralClash instance
 * @param snapshot - The game snapshot from Firestore
 */
export function restoreGameFromSnapshot(coralClash: any, snapshot: any): void {
    // If PGN is available, load from it (includes move history for undo)
    // Otherwise fall back to FEN for backward compatibility
    if (snapshot.pgn) {
        coralClash.loadPgn(snapshot.pgn);
    } else {
        coralClash.load(snapshot.fen);
    }

    // Restore whale positions if present
    if (snapshot.whalePositions) {
        const Ox88 = {
            a8: 0x00,
            b8: 0x01,
            c8: 0x02,
            d8: 0x03,
            e8: 0x04,
            f8: 0x05,
            g8: 0x06,
            h8: 0x07,
            a7: 0x10,
            b7: 0x11,
            c7: 0x12,
            d7: 0x13,
            e7: 0x14,
            f7: 0x15,
            g7: 0x16,
            h7: 0x17,
            a6: 0x20,
            b6: 0x21,
            c6: 0x22,
            d6: 0x23,
            e6: 0x24,
            f6: 0x25,
            g6: 0x26,
            h6: 0x27,
            a5: 0x30,
            b5: 0x31,
            c5: 0x32,
            d5: 0x33,
            e5: 0x34,
            f5: 0x35,
            g5: 0x36,
            h5: 0x37,
            a4: 0x40,
            b4: 0x41,
            c4: 0x42,
            d4: 0x43,
            e4: 0x44,
            f4: 0x45,
            g4: 0x46,
            h4: 0x47,
            a3: 0x50,
            b3: 0x51,
            c3: 0x52,
            d3: 0x53,
            e3: 0x54,
            f3: 0x55,
            g3: 0x56,
            h3: 0x57,
            a2: 0x60,
            b2: 0x61,
            c2: 0x62,
            d2: 0x63,
            e2: 0x64,
            f2: 0x65,
            g2: 0x66,
            h2: 0x67,
            a1: 0x70,
            b1: 0x71,
            c1: 0x72,
            d1: 0x73,
            e1: 0x74,
            f1: 0x75,
            g1: 0x76,
            h1: 0x77,
        };

        if (snapshot.whalePositions.w) {
            const [first, second] = snapshot.whalePositions.w;
            coralClash._kings.w = [(Ox88 as any)[first], (Ox88 as any)[second]];
        }

        if (snapshot.whalePositions.b) {
            const [first, second] = snapshot.whalePositions.b;
            coralClash._kings.b = [(Ox88 as any)[first], (Ox88 as any)[second]];
        }
    }

    // Restore coral state
    // IMPORTANT: PGN doesn't encode coral choices (e.g., whether a gatherer placed coral)
    // So we ALWAYS need to restore coral from the snapshot to get the exact coral state
    if (snapshot.coral) {
        console.log(
            '[restoreGameFromSnapshot] Restoring coral - before clear, coral count:',
            coralClash.getAllCoral().length,
        );
        console.log(
            '[restoreGameFromSnapshot] Snapshot has coral placements:',
            snapshot.coral.length,
        );

        // Clear existing coral (PGN replay might have placed coral incorrectly)
        coralClash._coral = new Array(128).fill(null);

        // Restore coral placements from snapshot (source of truth)
        snapshot.coral.forEach(({ square, color }: { square: any; color: any }) => {
            coralClash.placeCoral(square, color);
        });

        console.log(
            '[restoreGameFromSnapshot] After restore, coral count:',
            coralClash.getAllCoral().length,
        );
        console.log(
            '[restoreGameFromSnapshot] Coral squares:',
            coralClash.getAllCoral().map((c: any) => c.square),
        );
    }

    // Restore coral remaining counts
    if (snapshot.coralRemaining) {
        coralClash._coralRemaining = { ...snapshot.coralRemaining };
    }

    // Restore piece roles (hunter/gatherer status)
    // Strategy:
    // - For games at starting position (no moves): Use getStartingRole() which was already called
    //   during load()/loadPgn(). This ensures old saved games get migrated to new role logic.
    // - For games in progress: Restore roles from snapshot to preserve them correctly.
    // This handles both fresh games and migrations when getStartingRole() logic changes.
    const historyLength = coralClash.history().length;
    const isStartingPosition = historyLength === 0;

    if (snapshot.pieceRoles && !isStartingPosition) {
        const Ox88 = {
            a8: 0x00,
            b8: 0x01,
            c8: 0x02,
            d8: 0x03,
            e8: 0x04,
            f8: 0x05,
            g8: 0x06,
            h8: 0x07,
            a7: 0x10,
            b7: 0x11,
            c7: 0x12,
            d7: 0x13,
            e7: 0x14,
            f7: 0x15,
            g7: 0x16,
            h7: 0x17,
            a6: 0x20,
            b6: 0x21,
            c6: 0x22,
            d6: 0x23,
            e6: 0x24,
            f6: 0x25,
            g6: 0x26,
            h6: 0x27,
            a5: 0x30,
            b5: 0x31,
            c5: 0x32,
            d5: 0x33,
            e5: 0x34,
            f5: 0x35,
            g5: 0x36,
            h5: 0x37,
            a4: 0x40,
            b4: 0x41,
            c4: 0x42,
            d4: 0x43,
            e4: 0x44,
            f4: 0x45,
            g4: 0x46,
            h4: 0x47,
            a3: 0x50,
            b3: 0x51,
            c3: 0x52,
            d3: 0x53,
            e3: 0x54,
            f3: 0x55,
            g3: 0x56,
            h3: 0x57,
            a2: 0x60,
            b2: 0x61,
            c2: 0x62,
            d2: 0x63,
            e2: 0x64,
            f2: 0x65,
            g2: 0x66,
            h2: 0x67,
            a1: 0x70,
            b1: 0x71,
            c1: 0x72,
            d1: 0x73,
            e1: 0x74,
            f1: 0x75,
            g1: 0x76,
            h1: 0x77,
        };

        // Restore role for each piece
        Object.entries(snapshot.pieceRoles).forEach(([square, role]: [string, any]) => {
            const sq = (Ox88 as any)[square];
            if (sq !== undefined && coralClash._board[sq]) {
                coralClash._board[sq].role = role;
            }
        });
    }

    // Restore resignation status
    if (snapshot.resigned !== undefined && snapshot.resigned !== null) {
        coralClash._resigned = snapshot.resigned;
    }
}
