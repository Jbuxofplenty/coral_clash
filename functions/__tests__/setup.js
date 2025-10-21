// Test setup for Firebase Functions
// This file runs before all tests

// Mock the shared game library
jest.mock('../../shared/game', () => ({
    CoralClash: jest.fn().mockImplementation(() => ({
        fen: jest.fn().mockReturnValue('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'),
        turn: jest.fn().mockReturnValue('w'),
        whalePositions: jest.fn().mockReturnValue({ w: ['d1', 'e1'], b: ['d8', 'e8'] }),
        getAllCoral: jest.fn().mockReturnValue([]),
        getCoralRemainingCounts: jest.fn().mockReturnValue({ w: 5, b: 5 }),
        inCheck: jest.fn().mockReturnValue(false),
        isCheckmate: jest.fn().mockReturnValue(false),
        isGameOver: jest.fn().mockReturnValue(false),
        isCoralVictory: jest.fn().mockReturnValue(null),
        isDraw: jest.fn().mockReturnValue(false),
    })),
    DEFAULT_POSITION: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    createGameSnapshot: jest.fn().mockReturnValue({
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        turn: 'w',
        whalePositions: { w: ['d1', 'e1'], b: ['d8', 'e8'] },
        coral: [],
        coralRemaining: { w: 5, b: 5 },
        isCheck: false,
        isCheckmate: false,
        isGameOver: false,
        isCoralVictory: null,
        isDraw: false,
    }),
}));
