
import { jest } from '@jest/globals';
import { cleanup, setupStandardMocks } from './testHelpers.js';

const mocks = setupStandardMocks();

// Define mocks using unstable_mockModule BEFORE importing the module under test

// Mock game engine
jest.doMock('../shared/dist/game/index.js', () => ({}));

// Mock firebase-admin
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

// Mock notifications
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


// Mock google cloud tasks
jest.doMock('@google-cloud/tasks', () => ({
    CloudTasksClient: jest.fn().mockImplementation(() => ({
        createTask: jest.fn().mockResolvedValue([{ name: 'mock-task' }]),
    })),
}));


// Mock shared package
jest.doMock('@jbuxofplenty/coral-clash', () => ({
    CoralClash: jest.fn(),
    GAME_VERSION: '1.0.0',
    createGameSnapshot: jest.fn(),
    restoreGameFromSnapshot: jest.fn(),
    calculateUndoMoveCount: jest.fn(),
    findBestMove: jest.fn(),
    findBestMoveIterativeDeepening: jest.fn(),
    calculateOptimalMoveTime: jest.fn(() => 3000),
    getTimeControlForDifficulty: jest.fn((difficulty) => {
        const timeControls = {
            easy: {
                maxTimeMs: 2000,
                minTimeMs: 100,
                progressIntervalMs: 200,
            },
            medium: {
                maxTimeMs: 5000,
                minTimeMs: 100,
                progressIntervalMs: 200,
            },
            hard: {
                maxTimeMs: 10000,
                minTimeMs: 100,
                progressIntervalMs: 200,
            },
        };
        return timeControls[difficulty];
    }),
    SEARCH_DEPTH: {
        random: 0,
        easy: 3,
        medium: 5,
        hard: 7,
    },
    TIME_CONTROL: {
        maxTimeMs: 5000,
    },
}));

// Mock helpers
jest.doMock('../utils/helpers.js', () => ({
    formatDisplayName: jest.fn((name, discriminator) => `${name}#${discriminator}`),
    increment: jest.fn((value) => `increment(${value})`),
    initializeGameState: jest.fn(() => ({
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        turn: 'w',
        coralRemaining: { w: 15, b: 14 },
    })),
    serverTimestamp: jest.fn(() => 'MOCK_TIMESTAMP'),
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

// Define variables to hold imported modules
let gameRoutes;
let CoralClashModule;

// Import the module under test dynamically after mocks are set up
// DO NOT use top-level await here as it causes syntax errors in some Jest environments

describe('Game Creation Functions', () => {
    beforeAll(async () => {
        gameRoutes = await import('../routes/game.js');
        CoralClashModule = await import('@jbuxofplenty/coral-clash');
    });


    beforeEach(() => {
        jest.clearAllMocks();

        // Setup default mock chain for where().limit().get()
        mocks.mockWhere.mockReturnValue({
            where: mocks.mockWhere,
            limit: mocks.mockLimit,
            get: mocks.mockGet,
        });

        mocks.mockLimit.mockReturnValue({
            get: mocks.mockGet,
        });
    });

    afterAll(() => {
        cleanup();
    });

    describe('createGame', () => {
        const creatorId = 'creator-user-123';
        const opponentId = 'opponent-user-456';

        it('should create a new PvP game successfully', async () => {
            mocks.mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({ displayName: 'Opponent', discriminator: '1234' }),
            });

            mocks.mockGet
                .mockResolvedValueOnce({ empty: true })
                .mockResolvedValueOnce({ empty: true });

            mocks.mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({ displayName: 'Creator', discriminator: '5678' }),
            });

            mocks.mockGet.mockResolvedValueOnce({ exists: true, data: () => ({ avatarKey: 'dolphin' }) });
            mocks.mockGet.mockResolvedValueOnce({ exists: true, data: () => ({ avatarKey: 'whale' }) });
            mocks.mockAdd.mockResolvedValue({ id: 'new-game-id-123' });

            const result = await gameRoutes.createGameHandler({
                data: { opponentId, timeControl: { type: 'unlimited' } },
                auth: { uid: creatorId },
            });

            expect(result.success).toBe(true);
            expect(result.gameId).toBe('new-game-id-123');
            expect(mocks.mockAdd).toHaveBeenCalledTimes(2);
        });

        it('should prevent duplicate game creation when pending request exists (creator->opponent)', async () => {
            mocks.mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({ displayName: 'Opponent', discriminator: '1234' }),
            });

            mocks.mockGet
                .mockResolvedValueOnce({
                    empty: false,
                    docs: [{ id: 'existing-game-id' }],
                })
                .mockResolvedValueOnce({ empty: true });

            await expect(
                gameRoutes.createGameHandler({
                    data: { opponentId, timeControl: { type: 'unlimited' } },
                    auth: { uid: creatorId },
                }),
            ).rejects.toThrow('A pending game request already exists between these players');

            expect(mocks.mockAdd).not.toHaveBeenCalled();
        });

        it('should prevent duplicate game creation when pending request exists (opponent->creator)', async () => {
            mocks.mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({ displayName: 'Opponent', discriminator: '1234' }),
            });

            mocks.mockGet
                .mockResolvedValueOnce({ empty: true })
                .mockResolvedValueOnce({
                    empty: false,
                    docs: [{ id: 'existing-game-id' }],
                });

            await expect(
                gameRoutes.createGameHandler({
                    data: { opponentId, timeControl: { type: 'unlimited' } },
                    auth: { uid: creatorId },
                }),
            ).rejects.toThrow('A pending game request already exists between these players');

            expect(mocks.mockAdd).not.toHaveBeenCalled();
        });

        it('should throw error if opponent does not exist', async () => {
            mocks.mockGet.mockResolvedValueOnce({ exists: false });

            await expect(
                gameRoutes.createGameHandler({
                    data: { opponentId: 'non-existent-user', timeControl: { type: 'unlimited' } },
                    auth: { uid: creatorId },
                }),
            ).rejects.toThrow('Opponent not found');

            expect(mocks.mockAdd).not.toHaveBeenCalled();
        });

        it('should throw error if user is not authenticated', async () => {
            await expect(
                gameRoutes.createGameHandler({
                    data: { opponentId, timeControl: { type: 'unlimited' } },
                    auth: null,
                }),
            ).rejects.toThrow('User must be authenticated');

            expect(mocks.mockAdd).not.toHaveBeenCalled();
        });

        it('should allow new game creation if previous game between players is active (not pending)', async () => {
            mocks.mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({ displayName: 'Opponent', discriminator: '1234' }),
            });

            mocks.mockGet
                .mockResolvedValueOnce({ empty: true })
                .mockResolvedValueOnce({ empty: true });

            mocks.mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({ displayName: 'Creator', discriminator: '5678' }),
            });

            mocks.mockGet.mockResolvedValueOnce({ exists: true, data: () => ({ avatarKey: 'dolphin' }) });
            mocks.mockGet.mockResolvedValueOnce({ exists: true, data: () => ({ avatarKey: 'whale' }) });
            mocks.mockAdd.mockResolvedValue({ id: 'new-game-id-789' });

            const result = await gameRoutes.createGameHandler({
                data: { opponentId, timeControl: { type: 'unlimited' } },
                auth: { uid: creatorId },
            });

            expect(result.success).toBe(true);
            expect(result.gameId).toBe('new-game-id-789');
            expect(mocks.mockAdd).toHaveBeenCalledTimes(2);
        });
    });

    describe('determineCurrentTurn', () => {
        // Access gameRoutes.determineCurrentTurn inside tests because gameRoutes is initialized in beforeAll


        describe('Computer games', () => {
            it('should return creatorId when turn is white', () => {
                const gameData = { creatorId: 'user-123', opponentId: 'computer' };
                expect(gameRoutes.determineCurrentTurn(gameData, 'w')).toBe('user-123');
            });

            it('should return "computer" when turn is black', () => {
                const gameData = { creatorId: 'user-123', opponentId: 'computer' };
                expect(gameRoutes.determineCurrentTurn(gameData, 'b')).toBe('computer');
            });
        });

        describe('PvP games', () => {
            it('should return whitePlayerId when turn is white', () => {
                const gameData = { creatorId: 'user-123', opponentId: 'user-456', whitePlayerId: 'user-456', blackPlayerId: 'user-123' };
                expect(gameRoutes.determineCurrentTurn(gameData, 'w')).toBe('user-456');
            });

            it('should return blackPlayerId when turn is black', () => {
                const gameData = { creatorId: 'user-123', opponentId: 'user-456', whitePlayerId: 'user-456', blackPlayerId: 'user-123' };
                expect(gameRoutes.determineCurrentTurn(gameData, 'b')).toBe('user-123');
            });
        });

        describe('Fallback (missing player IDs)', () => {
            it('should return creatorId when turn is white and player IDs are missing', () => {
                const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
                const gameData = { creatorId: 'user-123', opponentId: 'user-456' };
                expect(gameRoutes.determineCurrentTurn(gameData, 'w')).toBe('user-123');
                expect(consoleWarnSpy).toHaveBeenCalledWith('Unable to determine currentTurn, missing player ID fields');
                consoleWarnSpy.mockRestore();
            });

            it('should return opponentId when turn is black and player IDs are missing', () => {
                const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
                const gameData = { creatorId: 'user-123', opponentId: 'user-456' };
                expect(gameRoutes.determineCurrentTurn(gameData, 'b')).toBe('user-456');
                expect(consoleWarnSpy).toHaveBeenCalledWith('Unable to determine currentTurn, missing player ID fields');
                consoleWarnSpy.mockRestore();
            });
        });
    });

    describe('createComputerGame', () => {
        const creatorId = 'creator-user-123';

        beforeEach(() => {
            CoralClashModule.CoralClash.mockImplementation(() => ({
                fen: jest.fn(() => 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'),
            }));
        });

        it('should create a computer game with random difficulty', async () => {
            mocks.mockAdd.mockResolvedValue({ id: 'computer-game-random' });

            const result = await gameRoutes.createComputerGameHandler({
                data: { timeControl: { type: 'unlimited' }, difficulty: 'random' },
                auth: { uid: creatorId },
            });

            expect(result.success).toBe(true);
            expect(result.gameId).toBe('computer-game-random');
            expect(mocks.mockAdd).toHaveBeenCalledWith(expect.objectContaining({ difficulty: 'random', opponentId: 'computer' }));
        });

        it('should create a computer game with easy difficulty', async () => {
            mocks.mockAdd.mockResolvedValue({ id: 'computer-game-easy' });

            const result = await gameRoutes.createComputerGameHandler({
                data: { timeControl: { type: 'unlimited' }, difficulty: 'easy' },
                auth: { uid: creatorId },
            });

            expect(result.success).toBe(true);
            expect(result.gameId).toBe('computer-game-easy');
            expect(mocks.mockAdd).toHaveBeenCalledWith(expect.objectContaining({ difficulty: 'easy', opponentId: 'computer' }));
        });

        it('should create a computer game with medium difficulty', async () => {
            mocks.mockAdd.mockResolvedValue({ id: 'computer-game-medium' });

            const result = await gameRoutes.createComputerGameHandler({
                data: { timeControl: { type: 'unlimited' }, difficulty: 'medium' },
                auth: { uid: creatorId },
            });

            expect(result.success).toBe(true);
            expect(result.gameId).toBe('computer-game-medium');
            expect(mocks.mockAdd).toHaveBeenCalledWith(expect.objectContaining({ difficulty: 'medium', opponentId: 'computer' }));
        });

        it('should create a computer game with hard difficulty', async () => {
            mocks.mockAdd.mockResolvedValue({ id: 'computer-game-hard' });

            const result = await gameRoutes.createComputerGameHandler({
                data: { timeControl: { type: 'unlimited' }, difficulty: 'hard' },
                auth: { uid: creatorId },
            });

            expect(result.success).toBe(true);
            expect(result.gameId).toBe('computer-game-hard');
            expect(mocks.mockAdd).toHaveBeenCalledWith(expect.objectContaining({ difficulty: 'hard', opponentId: 'computer' }));
        });

        it('should default to random difficulty when difficulty is not provided', async () => {
            mocks.mockAdd.mockResolvedValue({ id: 'computer-game-default' });

            const result = await gameRoutes.createComputerGameHandler({
                data: { timeControl: { type: 'unlimited' } },
                auth: { uid: creatorId },
            });

            expect(result.success).toBe(true);
            expect(result.gameId).toBe('computer-game-default');
            expect(mocks.mockAdd).toHaveBeenCalledWith(expect.objectContaining({ difficulty: 'random' }));
        });

        it('should throw error if user is not authenticated', async () => {
            await expect(
                gameRoutes.createComputerGameHandler({
                    data: { timeControl: { type: 'unlimited' }, difficulty: 'easy' },
                    auth: null,
                }),
            ).rejects.toThrow('User must be authenticated');
        });
    });

    describe('makeComputerMove - Difficulty Handling', () => {
        const gameId = 'test-computer-game';
        const userId = 'user-123';

        beforeEach(() => {
            const mockGame = {
                moves: jest.fn(() => [
                    { from: 'e7', to: 'e6', verbose: true },
                    { from: 'd7', to: 'd6', verbose: true },
                ]),
                move: jest.fn(() => ({})),
                fen: jest.fn(() => 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'),
                isGameOver: jest.fn(() => false),
                turn: jest.fn(() => 'b'),
                undo: jest.fn(),
            };

            CoralClashModule.CoralClash.mockImplementation(() => mockGame);
            CoralClashModule.restoreGameFromSnapshot.mockImplementation(() => {});
            CoralClashModule.createGameSnapshot.mockReturnValue({
                fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
            });

            mocks.mockDoc.mockReturnValue({
                update: jest.fn(() => Promise.resolve()),
                get: mocks.mockGet,
            });
            mocks.mockCollection.mockReturnValue({
                doc: mocks.mockDoc,
            });
        });

        it('should use easy difficulty configuration for easy mode', async () => {
            CoralClashModule.calculateOptimalMoveTime.mockClear();
            mocks.mockGet.mockResolvedValueOnce({ exists: true, data: () => ({ status: 'active' }) });

            await gameRoutes.makeComputerMoveHelper(gameId, {
                creatorId: userId,
                opponentId: 'computer',
                opponentType: 'computer',
                difficulty: 'easy',
                status: 'active',
                currentTurn: 'computer',
                timeControl: { totalSeconds: 300 },
                timeRemaining: { computer: 290 },
                gameState: { fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' },
            });

            expect(CoralClashModule.calculateOptimalMoveTime).toHaveBeenCalledWith('easy', expect.anything());
        });

        it('should use medium difficulty configuration for medium mode', async () => {
            CoralClashModule.calculateOptimalMoveTime.mockClear();
            mocks.mockGet.mockResolvedValueOnce({ exists: true, data: () => ({ status: 'active' }) });

            await gameRoutes.makeComputerMoveHelper(gameId, {
                creatorId: userId,
                opponentId: 'computer',
                opponentType: 'computer',
                difficulty: 'medium',
                status: 'active',
                currentTurn: 'computer',
                timeControl: { totalSeconds: 300 },
                timeRemaining: { computer: 290 },
                gameState: { fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' },
            });
             
             expect(CoralClashModule.calculateOptimalMoveTime).toHaveBeenCalledWith('medium', expect.anything());
        });

        it('should use hard difficulty configuration for hard mode', async () => {
            CoralClashModule.calculateOptimalMoveTime.mockClear();
            mocks.mockGet.mockResolvedValueOnce({ exists: true, data: () => ({ status: 'active' }) });

            await gameRoutes.makeComputerMoveHelper(gameId, {
                creatorId: userId,
                opponentId: 'computer',
                opponentType: 'computer',
                difficulty: 'hard',
                status: 'active',
                currentTurn: 'computer',
                timeControl: { totalSeconds: 300 },
                timeRemaining: { computer: 290 },
                gameState: { fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' },
            });
            
            expect(CoralClashModule.calculateOptimalMoveTime).toHaveBeenCalledWith('hard', expect.anything());
        });

        it('should use random moves for random difficulty', async () => {
            mocks.mockGet.mockResolvedValueOnce({ exists: true, data: () => ({ status: 'active' }) });

            await gameRoutes.makeComputerMoveHelper(gameId, {
                creatorId: userId,
                opponentId: 'computer',
                opponentType: 'computer',
                difficulty: 'random',
                status: 'active',
                currentTurn: 'computer',
                gameState: { fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' },
            });

            expect(CoralClashModule.findBestMoveIterativeDeepening).not.toHaveBeenCalled();
        });

        it('should abort move if game status changes to completed during calculation (freshness check)', async () => {
            mocks.mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({ status: 'completed', result: 'creator_wins' }),
            });

            const result = await gameRoutes.makeComputerMoveHelper(gameId, {
                creatorId: userId,
                opponentId: 'computer',
                opponentType: 'computer',
                difficulty: 'easy',
                status: 'active',
                currentTurn: 'computer',
                gameState: { fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' },
            });

            expect(result.aborted).toBe(true);
            expect(result.message).toBe('Game no longer active');
            expect(mocks.mockDoc().update).not.toHaveBeenCalled();
        });
    });
});