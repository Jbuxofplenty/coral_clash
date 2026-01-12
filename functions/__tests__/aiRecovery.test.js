
import { jest } from '@jest/globals';
import { cleanup, setupStandardMocks } from './testHelpers.js';

const mocks = setupStandardMocks();

// Mock game engine
jest.doMock('../shared/dist/game/index.js', () => ({}));

// Mock firebase-admin (standard mock)
jest.doMock('firebase-admin', () => {
    const mockAdmin = {
        initializeApp: jest.fn(),
        firestore: jest.fn(() => ({
            collection: (...args) => mocks.mockCollection(...args),
            batch: (...args) => mocks.mockBatch(...args),
            FieldValue: {
                serverTimestamp: (...args) => mocks.mockServerTimestamp(...args),
                increment: (...args) => mocks.mockIncrement(...args),
                arrayUnion: (...args) => mocks.mockArrayUnion(...args),
                arrayRemove: (...args) => mocks.mockArrayRemove(...args),
            },
        })),
    };
    return {
        default: mockAdmin,
        ...mockAdmin,
    };
});

// Mock notifications (standard mock)
jest.doMock('../utils/notifications.js', () => ({
    sendFriendAcceptedNotification: jest.fn(() => Promise.resolve()),
    sendFriendRequestNotification: jest.fn(() => Promise.resolve()),
    sendGameAcceptedNotification: jest.fn(() => Promise.resolve()),
    sendGameRequestNotification: jest.fn(() => Promise.resolve()),
    sendMatchFoundNotification: jest.fn(() => Promise.resolve()),
    sendOpponentMoveNotification: jest.fn(() => Promise.resolve()),
    sendPushNotification: jest.fn(() => Promise.resolve()),
    sendResetApprovedNotification: jest.fn(() => Promise.resolve()),
    sendResetCancelledNotification: jest.fn(() => Promise.resolve()),
    sendResetRejectedNotification: jest.fn(() => Promise.resolve()),
    sendUndoApprovedNotification: jest.fn(() => Promise.resolve()),
    sendUndoCancelledNotification: jest.fn(() => Promise.resolve()),
    sendUndoRejectedNotification: jest.fn(() => Promise.resolve()),
    sendUndoRequestNotification: jest.fn(() => Promise.resolve()),
}));

// Mock google cloud tasks (standard mock)
jest.doMock('@google-cloud/tasks', () => ({
    CloudTasksClient: jest.fn().mockImplementation(() => ({
        createTask: jest.fn().mockResolvedValue([{ name: 'mock-task' }]),
    })),
}));

// Mock Worker threads for AI worker
jest.doMock('worker_threads', () => ({
    Worker: jest.fn().mockImplementation(() => ({
        on: jest.fn((event, callback) => {
            if (event === 'message') {
                setTimeout(() => {
                    callback({
                        move: { from: 'e7', to: 'e6' },
                        score: 100,
                        elapsedMs: 100
                    });
                }, 10);
            }
        }),
        once: jest.fn(),
        removeListener: jest.fn(),
        removeAllListeners: jest.fn(),
        emit: jest.fn(),
        terminate: jest.fn(),
        postMessage: jest.fn(),
    })),
    parentPort: {
        postMessage: jest.fn()
    }
}));


// Mock shared package
// We need to keep a reference to the game mock to manipulate its behavior in tests
const mockGameInstance = {
    moves: jest.fn(() => [
        { from: 'e7', to: 'e6', verbose: true }, // Invalid move candidate
        { from: 'd7', to: 'd6', verbose: true }, // Valid fallback candidate
    ]),
    move: jest.fn(),
    fen: jest.fn(() => 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'),
    isGameOver: jest.fn(() => false),
    turn: jest.fn(() => 'b'),
    undo: jest.fn(),
    get: jest.fn(), // Needed for validateMove
};

// Also mock validateMove since we use it directly in the loop
const mockValidateMove = jest.fn();

jest.doMock('@jbuxofplenty/coral-clash', () => ({
    CoralClash: jest.fn(() => mockGameInstance),
    GAME_VERSION: '1.0.0',
    createGameSnapshot: jest.fn(),
    restoreGameFromSnapshot: jest.fn(),
    calculateUndoMoveCount: jest.fn(),
    findBestMove: jest.fn(),
    findBestMoveIterativeDeepening: jest.fn(),
    calculateOptimalMoveTime: jest.fn(() => 3000),
    getTimeControlForDifficulty: jest.fn(() => ({ maxTimeMs: 5000 })),
    validateMove: mockValidateMove,
    SEARCH_DEPTH: { random: 0, easy: 3, medium: 5, hard: 7 },
    TIME_CONTROL: { maxTimeMs: 5000 },
}));

// Mock helpers
jest.doMock('../utils/helpers.js', () => ({
    formatDisplayName: jest.fn((name, discriminator) => `${name}#${discriminator}`),
    increment: jest.fn((value) => `increment(${value})`),
    initializeGameState: jest.fn(() => ({})),
    serverTimestamp: jest.fn(() => 'MOCK_TIMESTAMP'),
}));

// Mock gameValidator
// Must return an object with isOver property, not null
const mockGetGameResult = jest.fn(() => ({ isOver: false, winner: null, reason: null }));

jest.doMock('../utils/gameValidator.js', () => ({
    validateMove: mockValidateMove,
    getGameResult: mockGetGameResult
}));


let gameRoutes;

describe('AI Move Recovery', () => {
    beforeAll(async () => {
        gameRoutes = await import('../routes/game.js');
    });

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Default mocks
        mocks.mockWhere.mockReturnValue({
            where: mocks.mockWhere,
            limit: mocks.mockLimit,
            get: mocks.mockGet,
        });

        mocks.mockLimit.mockReturnValue({
            get: mocks.mockGet,
        });

        mocks.mockDoc.mockReturnValue({
            update: jest.fn(() => Promise.resolve()),
            get: mocks.mockGet,
        });
        mocks.mockCollection.mockReturnValue({
            doc: mocks.mockDoc,
        });
    });

    afterAll(() => {
        cleanup();
    });

    it('should retry with a random move if the first AI move is invalid', async () => {
        const gameId = 'test-recovery-game';
        const userId = 'user-123';
        const gameData = {
            creatorId: userId,
            opponentId: 'computer',
            opponentType: 'computer',
            difficulty: 'easy',
            status: 'active',
            currentTurn: 'computer',
            gameState: { fen: 'start' },
        };

        mocks.mockGet.mockResolvedValueOnce({ exists: true, data: () => ({ status: 'active' }) });

        // First attempt: AI returns 'e7->e6' (via Worker mock above)
        // We make game.move FAIL for this specific move
        
        // Mock chain:
        // 1. First move (from AI) -> returns null (simulate invalid)
        // 2. Second move (random) -> returns object (simulate valid)
        mockGameInstance.move
            .mockReturnValueOnce(null)
            .mockReturnValueOnce({});

        // Mock validateMove to act consistently with game.move
        // 1. First call doesn't happen because game.move throws first?
        // Wait, logic is: moveResult = game.move(); if (!moveResult) throw...
        // So validateMove is NOT called if game.move fails.
        // But if game.move succeeds, then validateMove is called.
        // For the successful 2nd attempt, we need validateMove to return true.
        mockValidateMove.mockReturnValue({ valid: true });

        await gameRoutes.makeComputerMoveHelper(gameId, gameData);

        // Verify that game.move was called twice
        expect(mockGameInstance.move).toHaveBeenCalledTimes(2);
        
        // First call should be the "Smart" move (from worker mock: e7->e6)
        expect(mockGameInstance.move).toHaveBeenNthCalledWith(1, expect.objectContaining({
            from: 'e7',
            to: 'e6'
        }));
        
        // Second call should be a random move from our mocked moves list (d7->d6)
        expect(mockGameInstance.move).toHaveBeenNthCalledWith(2, expect.objectContaining({
            from: 'd7',
            to: 'd6'
        }));

        // Verify that the game update happened eventually
        expect(mocks.mockDoc().update).toHaveBeenCalled();
    });
});
