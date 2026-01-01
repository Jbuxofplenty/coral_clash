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
 * @param options.skipValidation - Skip whale move validation (useful for tutorial scenarios without whales)
 * @param options.skipFenValidation - Skip FEN format validation (useful for fixtures with intentionally invalid FEN)
 */
export function applyFixture(
    coralClash: any,
    fixture: GameStateFixture,
    options: { skipValidation?: boolean; skipFenValidation?: boolean } = {},
): void {
    // Load the game state using the FEN
    coralClash.load(fixture.state.fen, {
        skipValidation: options.skipValidation ?? false,
        skipFenValidation: options.skipFenValidation ?? false,
    });

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
    // Extended FEN now contains all game state (roles, coral, coral counts)
    // The following fields are kept for backward compatibility with old snapshots
    // but are redundant with the extended FEN format.

    // Get piece roles from the board (hunter/gatherer status)
    const board = coralClash.board();
    const pieceRoles: { [square: string]: 'hunter' | 'gatherer' } = {};

    // Extract role information for each piece
    if (board && Array.isArray(board)) {
        board.flat().forEach((cell: any) => {
            if (cell && cell.role) {
                pieceRoles[cell.square] = cell.role;
            }
        });
    }

    // Get PGN for move history (includes initial FEN and all moves)
    // This is essential for undo functionality
    const pgn = coralClash.pgn();

    const coral = coralClash.getAllCoral();

    const snapshot = {
        fen: coralClash.fen(), // Extended FEN with roles, coral, and counts (fields 7-9)
        turn: coralClash.turn(),
        whalePositions: coralClash.whalePositions(),
        coral: coral, // Backward compatibility - redundant with FEN field 8
        coralRemaining: coralClash.getCoralRemainingCounts(), // Backward compat - redundant with FEN field 9
        pieceRoles: pieceRoles, // Backward compatibility - redundant with FEN field 7
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
export function restoreGameFromSnapshot(
    coralClash: any,
    snapshot: any,
    options: { skipValidation?: boolean; skipFenValidation?: boolean } = {},
): void {
    // Strategy:
    // 1. If PGN available: Load PGN for move history, then fix any state from extended FEN
    // 2. If no PGN: Load extended FEN directly
    //
    // Extended FEN contains: roles, coral, coral counts, whale positions
    // PGN contains: move history for undo functionality

    if (snapshot.pgn) {
        // Load PGN to get move history
        coralClash.loadPgn(snapshot.pgn, options);

        // PGN replay might not have correct whale positions, roles, or coral
        // Override with data from extended FEN
        const fenTokens = snapshot.fen.split(/\s+/);

        // Field 10 (index 9): Whale positions (most important - fixes orientation bug)
        if (fenTokens.length > 9 && fenTokens[9] !== '-') {
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

            const whaleEntries = fenTokens[9].split(',');
            whaleEntries.forEach((entry: string, index: number) => {
                if (entry.length === 4) {
                    const sq1 = entry.slice(0, 2);
                    const sq2 = entry.slice(2, 4);
                    const sq1_0x88 = (Ox88 as any)[sq1];
                    const sq2_0x88 = (Ox88 as any)[sq2];

                    if (sq1_0x88 !== undefined && sq2_0x88 !== undefined) {
                        if (index === 0) {
                            coralClash._kings.w = [sq1_0x88, sq2_0x88];
                        } else if (index === 1) {
                            coralClash._kings.b = [sq1_0x88, sq2_0x88];
                        }
                    }
                }
            });
        }

        // Field 7 (index 6): Piece roles - restore if not at starting position
        const isStartingPosition = snapshot.fen.startsWith(
            'ftth1ttf/cocddcoc/3oo3/8/8/3OO3/COCDDCOC/FTTH1TTF w - - 0 1',
        );
        if (fenTokens.length > 6 && fenTokens[6] !== '-' && !isStartingPosition) {
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

            const roleEntries = fenTokens[6].split(',');
            roleEntries.forEach((entry: string) => {
                if (entry.length >= 3) {
                    const sq = entry.slice(0, 2);
                    const roleChar = entry.charAt(2);
                    const role = roleChar === 'g' ? 'gatherer' : 'hunter';
                    const square0x88 = (Ox88 as any)[sq];
                    if (square0x88 !== undefined && coralClash._board[square0x88]) {
                        coralClash._board[square0x88].role = role;
                    }
                }
            });
        }

        // Field 8 (index 7): Coral positions
        if (fenTokens.length > 7 && fenTokens[7] !== '-') {
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

            // Clear existing coral first
            coralClash._coral = new Array(128).fill(null);

            const coralEntries = fenTokens[7].split(',');
            coralEntries.forEach((entry: string) => {
                if (entry.length >= 3) {
                    const sq = entry.slice(0, 2);
                    const colorChar = entry.charAt(2);
                    const square0x88 = (Ox88 as any)[sq];
                    if (square0x88 !== undefined) {
                        coralClash._coral[square0x88] = colorChar;
                    }
                }
            });
        }

        // Field 9 (index 8): Coral remaining counts
        if (fenTokens.length > 8 && fenTokens[8] !== '-') {
            const counts = fenTokens[8].split(',');
            if (counts.length === 2) {
                coralClash._coralRemaining.w = parseInt(counts[0], 10);
                coralClash._coralRemaining.b = parseInt(counts[1], 10);
            }
        }
    } else {
        // No PGN - just load extended FEN (loses move history but gets current state)
        coralClash.load(snapshot.fen, options);
    }

    // Restore resignation status (not encoded in FEN or PGN)
    if (snapshot.resigned !== undefined && snapshot.resigned !== null) {
        coralClash._resigned = snapshot.resigned;
    }
}
