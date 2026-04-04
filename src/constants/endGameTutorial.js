/**
 * End-Game Tutorial Scenario
 * Provides a pre-determined board state where the user is close to winning
 */

export const END_GAME_TUTORIAL_FIXTURE = {
    schemaVersion: '1.1.0',
    exportedAt: new Date().toISOString(),
    state: {
        fen: 'h6c/5H2/3D4/4C3/8/8/8/8 w - - 0 1', // Approximate FEN
        board: [
            // Row 8
            [
                { square: 'a8', type: 'h', color: 'b' },
                { square: 'b8', type: 'h', color: 'b' },
                null, null, null, null, null,
                { square: 'h8', type: 'c', color: 'b', role: 'hunter' }
            ],
            // Row 7
            [
                null, null, null, null, null,
                { square: 'f7', type: 'h', color: 'w' },
                { square: 'g7', type: 'h', color: 'w' },
                null
            ],
            // Row 6
            [
                null, null, null,
                { square: 'd6', type: 'd', color: 'w', role: 'hunter' },
                null, null, null, null
            ],
            // Row 5
            [
                null, null, null, null,
                { square: 'e5', type: 'c', color: 'w', role: 'hunter' },
                null, null, null
            ],
            // Row 4
            [
                null, null, null, null, null, null, null, null
            ],
            // Row 3
            [
                null, null, null, null, null, null, null, null
            ],
            // Row 2
            [
                null, null, null, null, null, null, null, null
            ],
            // Row 1
            [
                null, null, null, null, null, null, null, null
            ]
        ],
        history: [],
        turn: 'w',
        whalePositions: {
            w: ['f7', 'g7'],
            b: ['a8', 'b8']
        },
        coral: [
            { square: 'h7', color: 'w' },
            { square: 'g6', color: 'w' },
            { square: 'h6', color: 'w' },
            { square: 'a2', color: 'w' },
            { square: 'b2', color: 'w' },
            { square: 'c2', color: 'w' },
            { square: 'a3', color: 'w' },
            { square: 'b3', color: 'w' },
            { square: 'c3', color: 'w' },
            { square: 'a4', color: 'w' },
            { square: 'b4', color: 'w' },
            { square: 'c4', color: 'w' },
        ],
        coralRemaining: { w: 5, b: 17 },
        isGameOver: false,
        inCheck: false,
        isCheckmate: false,
        isStalemate: false,
        isDraw: false,
        isCoralVictory: null,
    }
};
