/**
 * Utility for loading game state fixtures in tests
 */

export interface GameStateFixture {
    schemaVersion: string;
    exportedAt: string;
    state: {
        fen: string;
        board: any[][];
        history: any[];
        turn: 'w' | 'b';
        whalePositions?: { w: [string, string] | null; b: [string, string] | null }; // v1.1.0+
        coral?: { square: string; color: 'w' | 'b' }[]; // v1.2.0+ coral placement
        coralRemaining?: { w: number; b: number }; // v1.2.0+ coral counts
        isGameOver: boolean;
        inCheck: boolean;
        isCheckmate: boolean;
        isStalemate: boolean;
        isDraw: boolean;
        isCoralVictory: false | 'w' | 'b';
    };
}

/**
 * NOTE: The loadFixture() function has been removed because dynamic require()
 * doesn't work with React Native's Metro bundler.
 *
 * For Jest tests: Import fixtures directly using require()
 * For React Native: Import fixtures statically at the top of your file
 *
 * Example:
 *   const fixture = require('./__fixtures__/whale-move-diagonally.json');
 *   applyFixture(game, fixture);
 */

/**
 * Apply a game state fixture to a CoralClash instance
 * @param coralClash - The CoralClash instance
 * @param fixture - The game state fixture
 */
export function applyFixture(coralClash: any, fixture: GameStateFixture): void {
    // Load the game state using the FEN
    coralClash.load(fixture.state.fen);

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

    // v1.2.0+: Restore coral state if present
    if (fixture.state.coral) {
        fixture.state.coral.forEach(({ square, color }) => {
            coralClash.placeCoral(square, color);
        });
    }

    // v1.2.0+: Restore coral remaining counts if present
    if (fixture.state.coralRemaining) {
        coralClash._coralRemaining = { ...fixture.state.coralRemaining };
    }
}

/**
 * Validate that a game state fixture has the expected schema version
 * @param fixture - The game state fixture
 * @param expectedVersion - The expected schema version (defaults to latest)
 */
export function validateFixtureVersion(
    fixture: GameStateFixture,
    expectedVersion: string = '1.1.0',
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
        schemaVersion: '1.1.0',
        exportedAt: new Date().toISOString(),
        state: {
            fen,
            board: [],
            history: [],
            turn: 'w',
            whalePositions: undefined, // Will be populated if needed
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
