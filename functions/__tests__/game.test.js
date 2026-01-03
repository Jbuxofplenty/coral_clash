import { cleanup, setupStandardMocks } from './testHelpers.js';

const mocks = setupStandardMocks();

jest.mock('../shared/dist/game/index.js');

jest.mock('firebase-admin', () => ({
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
}));

jest.mock('../utils/notifications.js', () => ({
    sendGameRequestNotification: jest.fn(() => Promise.resolve()),
    sendGameAcceptedNotification: jest.fn(() => Promise.resolve()),
    sendOpponentMoveNotification: jest.fn(() => Promise.resolve()),
}));

jest.mock('@google-cloud/tasks');

// Mock AI functions from shared package
jest.mock('@jbuxofplenty/coral-clash', () => ({
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

jest.mock('../utils/helpers.js', () => ({
    formatDisplayName: jest.fn((name, discriminator) => `${name}#${discriminator}`),
    increment: jest.fn((value) => `increment(${value})`),
    initializeGameState: jest.fn(() => ({
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        turn: 'w',
        coralRemaining: { w: 15, b: 14 },
    })),
    serverTimestamp: jest.fn(() => 'MOCK_TIMESTAMP'),
}));

import * as gameRoutes from '../routes/game.js';

describe('Game Creation Functions', () => {
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
            // Call handler directly (v2 compatible)

            // Mock opponent exists
            mocks.mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({
                    displayName: 'Opponent',
                    discriminator: '1234',
                }),
            });

            // Mock no existing pending games (both queries return empty)
            mocks.mockGet
                .mockResolvedValueOnce({ empty: true }) // Query 1: creator->opponent
                .mockResolvedValueOnce({ empty: true }); // Query 2: opponent->creator

            // Mock creator data
            mocks.mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({
                    displayName: 'Creator',
                    discriminator: '5678',
                }),
            });

            // Mock creator settings (subcollection)
            mocks.mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({
                    avatarKey: 'dolphin',
                }),
            });

            // Mock opponent settings (subcollection)
            mocks.mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({
                    avatarKey: 'whale',
                }),
            });

            mocks.mockAdd.mockResolvedValue({ id: 'new-game-id-123' });

            const result = await gameRoutes.createGameHandler({
                data: {
                    opponentId,
                    timeControl: { type: 'unlimited' },
                },
                auth: { uid: creatorId },
            });

            expect(result.success).toBe(true);
            expect(result.gameId).toBe('new-game-id-123');
            expect(mocks.mockAdd).toHaveBeenCalledTimes(2); // Game + notification
        });

        it('should prevent duplicate game creation when pending request exists (creator->opponent)', async () => {
            // Call handler directly (v2 compatible)

            // Mock opponent exists
            mocks.mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({
                    displayName: 'Opponent',
                    discriminator: '1234',
                }),
            });

            // Mock existing pending game (creator->opponent direction)
            mocks.mockGet
                .mockResolvedValueOnce({
                    empty: false, // Query 1: Found pending game
                    docs: [{ id: 'existing-game-id' }],
                })
                .mockResolvedValueOnce({ empty: true }); // Query 2: opponent->creator

            await expect(
                gameRoutes.createGameHandler({
                    data: {
                        opponentId,
                        timeControl: { type: 'unlimited' },
                    },
                    auth: { uid: creatorId },
                }),
            ).rejects.toThrow('A pending game request already exists between these players');

            expect(mocks.mockAdd).not.toHaveBeenCalled();
        });

        it('should prevent duplicate game creation when pending request exists (opponent->creator)', async () => {
            // Call handler directly (v2 compatible)

            // Mock opponent exists
            mocks.mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({
                    displayName: 'Opponent',
                    discriminator: '1234',
                }),
            });

            // Mock existing pending game (opponent->creator direction)
            mocks.mockGet
                .mockResolvedValueOnce({ empty: true }) // Query 1: creator->opponent
                .mockResolvedValueOnce({
                    empty: false, // Query 2: Found pending game in reverse direction
                    docs: [{ id: 'existing-game-id' }],
                });

            await expect(
                gameRoutes.createGameHandler({
                    data: {
                        opponentId,
                        timeControl: { type: 'unlimited' },
                    },
                    auth: { uid: creatorId },
                }),
            ).rejects.toThrow('A pending game request already exists between these players');

            expect(mocks.mockAdd).not.toHaveBeenCalled();
        });

        it('should throw error if opponent does not exist', async () => {
            // Call handler directly (v2 compatible)

            // Mock opponent doesn't exist
            mocks.mockGet.mockResolvedValueOnce({
                exists: false,
            });

            await expect(
                gameRoutes.createGameHandler({
                    data: {
                        opponentId: 'non-existent-user',
                        timeControl: { type: 'unlimited' },
                    },
                    auth: { uid: creatorId },
                }),
            ).rejects.toThrow('Opponent not found');

            expect(mocks.mockAdd).not.toHaveBeenCalled();
        });

        it('should throw error if user is not authenticated', async () => {
            await expect(
                gameRoutes.createGameHandler({
                    data: {
                        opponentId,
                        timeControl: { type: 'unlimited' },
                    },
                    auth: null,
                }),
            ).rejects.toThrow('User must be authenticated');

            expect(mocks.mockAdd).not.toHaveBeenCalled();
        });

        it('should allow new game creation if previous game between players is active (not pending)', async () => {
            // Call handler directly (v2 compatible)

            // Mock opponent exists
            mocks.mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({
                    displayName: 'Opponent',
                    discriminator: '1234',
                }),
            });

            // Mock no PENDING games (even though there may be active/completed games)
            mocks.mockGet
                .mockResolvedValueOnce({ empty: true }) // Query 1: No pending creator->opponent
                .mockResolvedValueOnce({ empty: true }); // Query 2: No pending opponent->creator

            // Mock creator data
            mocks.mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({
                    displayName: 'Creator',
                    discriminator: '5678',
                }),
            });

            // Mock creator settings (subcollection)
            mocks.mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({
                    avatarKey: 'dolphin',
                }),
            });

            // Mock opponent settings (subcollection)
            mocks.mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({
                    avatarKey: 'whale',
                }),
            });

            mocks.mockAdd.mockResolvedValue({ id: 'new-game-id-789' });

            const result = await gameRoutes.createGameHandler({
                data: {
                    opponentId,
                    timeControl: { type: 'unlimited' },
                },
                auth: { uid: creatorId },
            });

            expect(result.success).toBe(true);
            expect(result.gameId).toBe('new-game-id-789');
            expect(mocks.mockAdd).toHaveBeenCalledTimes(2); // Game + notification
        });
    });

    describe('determineCurrentTurn', () => {
        const { determineCurrentTurn } = gameRoutes;

        describe('Computer games', () => {
            it('should return creatorId when turn is white', () => {
                const gameData = {
                    creatorId: 'user-123',
                    opponentId: 'computer',
                };

                const result = determineCurrentTurn(gameData, 'w');

                expect(result).toBe('user-123');
            });

            it('should return "computer" when turn is black', () => {
                const gameData = {
                    creatorId: 'user-123',
                    opponentId: 'computer',
                };

                const result = determineCurrentTurn(gameData, 'b');

                expect(result).toBe('computer');
            });
        });

        describe('PvP games', () => {
            it('should return whitePlayerId when turn is white', () => {
                const gameData = {
                    creatorId: 'user-123',
                    opponentId: 'user-456',
                    whitePlayerId: 'user-456',
                    blackPlayerId: 'user-123',
                };

                const result = determineCurrentTurn(gameData, 'w');

                expect(result).toBe('user-456');
            });

            it('should return blackPlayerId when turn is black', () => {
                const gameData = {
                    creatorId: 'user-123',
                    opponentId: 'user-456',
                    whitePlayerId: 'user-456',
                    blackPlayerId: 'user-123',
                };

                const result = determineCurrentTurn(gameData, 'b');

                expect(result).toBe('user-123');
            });
        });

        describe('Fallback (missing player IDs)', () => {
            it('should return creatorId when turn is white and player IDs are missing', () => {
                const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

                const gameData = {
                    creatorId: 'user-123',
                    opponentId: 'user-456',
                };

                const result = determineCurrentTurn(gameData, 'w');

                expect(result).toBe('user-123');
                expect(consoleWarnSpy).toHaveBeenCalledWith(
                    'Unable to determine currentTurn, missing player ID fields',
                );

                consoleWarnSpy.mockRestore();
            });

            it('should return opponentId when turn is black and player IDs are missing', () => {
                const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

                const gameData = {
                    creatorId: 'user-123',
                    opponentId: 'user-456',
                };

                const result = determineCurrentTurn(gameData, 'b');

                expect(result).toBe('user-456');
                expect(consoleWarnSpy).toHaveBeenCalledWith(
                    'Unable to determine currentTurn, missing player ID fields',
                );

            consoleWarnSpy.mockRestore();
        });
    });

    describe('createComputerGame', () => {
        const creatorId = 'creator-user-123';

        beforeEach(() => {
            // Mock game engine for initialization
            const { CoralClash } = require('@jbuxofplenty/coral-clash');
            CoralClash.mockImplementation(() => ({
                fen: jest.fn(() => 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'),
            }));
        });

        it('should create a computer game with random difficulty', async () => {
            mocks.mockAdd.mockResolvedValue({ id: 'computer-game-random' });

            const result = await gameRoutes.createComputerGameHandler({
                data: {
                    timeControl: { type: 'unlimited' },
                    difficulty: 'random',
                },
                auth: { uid: creatorId },
            });

            expect(result.success).toBe(true);
            expect(result.gameId).toBe('computer-game-random');

            // Verify game document was created with correct difficulty
            expect(mocks.mockAdd).toHaveBeenCalledWith(
                expect.objectContaining({
                    difficulty: 'random',
                    opponentId: 'computer',
                    opponentType: 'computer',
                    creatorId: creatorId,
                    status: 'active',
                }),
            );
        });

        it('should create a computer game with easy difficulty', async () => {
            mocks.mockAdd.mockResolvedValue({ id: 'computer-game-easy' });

            const result = await gameRoutes.createComputerGameHandler({
                data: {
                    timeControl: { type: 'unlimited' },
                    difficulty: 'easy',
                },
                auth: { uid: creatorId },
            });

            expect(result.success).toBe(true);
            expect(result.gameId).toBe('computer-game-easy');

            // Verify game document was created with correct difficulty
            expect(mocks.mockAdd).toHaveBeenCalledWith(
                expect.objectContaining({
                    difficulty: 'easy',
                    opponentId: 'computer',
                    opponentType: 'computer',
                }),
            );
        });

        it('should create a computer game with medium difficulty', async () => {
            mocks.mockAdd.mockResolvedValue({ id: 'computer-game-medium' });

            const result = await gameRoutes.createComputerGameHandler({
                data: {
                    timeControl: { type: 'unlimited' },
                    difficulty: 'medium',
                },
                auth: { uid: creatorId },
            });

            expect(result.success).toBe(true);
            expect(result.gameId).toBe('computer-game-medium');

            // Verify game document was created with correct difficulty
            expect(mocks.mockAdd).toHaveBeenCalledWith(
                expect.objectContaining({
                    difficulty: 'medium',
                    opponentId: 'computer',
                    opponentType: 'computer',
                }),
            );
        });

        it('should create a computer game with hard difficulty', async () => {
            mocks.mockAdd.mockResolvedValue({ id: 'computer-game-hard' });

            const result = await gameRoutes.createComputerGameHandler({
                data: {
                    timeControl: { type: 'unlimited' },
                    difficulty: 'hard',
                },
                auth: { uid: creatorId },
            });

            expect(result.success).toBe(true);
            expect(result.gameId).toBe('computer-game-hard');

            // Verify game document was created with correct difficulty
            expect(mocks.mockAdd).toHaveBeenCalledWith(
                expect.objectContaining({
                    difficulty: 'hard',
                    opponentId: 'computer',
                    opponentType: 'computer',
                }),
            );
        });

        it('should default to random difficulty when difficulty is not provided', async () => {
            mocks.mockAdd.mockResolvedValue({ id: 'computer-game-default' });

            const result = await gameRoutes.createComputerGameHandler({
                data: {
                    timeControl: { type: 'unlimited' },
                },
                auth: { uid: creatorId },
            });

            expect(result.success).toBe(true);
            expect(result.gameId).toBe('computer-game-default');

            // Verify game document defaults to random difficulty
            expect(mocks.mockAdd).toHaveBeenCalledWith(
                expect.objectContaining({
                    difficulty: 'random',
                }),
            );
        });

        it('should throw error if user is not authenticated', async () => {
            await expect(
                gameRoutes.createComputerGameHandler({
                    data: {
                        timeControl: { type: 'unlimited' },
                        difficulty: 'easy',
                    },
                    auth: null,
                }),
            ).rejects.toThrow('User must be authenticated');
        });
    });

    describe('makeComputerMove - Difficulty Handling', () => {
        const gameId = 'test-computer-game';
        const userId = 'user-123';

        beforeEach(() => {
            const {
                CoralClash,
                restoreGameFromSnapshot,
                createGameSnapshot,
                findBestMove,
                findBestMoveIterativeDeepening,
            } = require('@jbuxofplenty/coral-clash');

            // Mock game instance
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

            CoralClash.mockImplementation(() => mockGame);
            restoreGameFromSnapshot.mockImplementation(() => {});
            createGameSnapshot.mockReturnValue({
                fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
            });

            // Mock findBestMove to return a move
            findBestMove.mockReturnValue({
                move: { from: 'e7', to: 'e6' },
                score: 100,
                nodesEvaluated: 50,
            });

            // Mock findBestMoveIterativeDeepening to return a move
            findBestMoveIterativeDeepening.mockReturnValue({
                move: { from: 'e7', to: 'e6' },
                score: 100,
                nodesEvaluated: 50,
                depth: 3,
                elapsedMs: 500,
            });

            // Mock game document update and get (for freshness check)
            mocks.mockDoc.mockReturnValue({
                update: jest.fn(() => Promise.resolve()),
                get: mocks.mockGet,
            });
            mocks.mockCollection.mockReturnValue({
                doc: mocks.mockDoc,
            });
        });

        it('should use easy difficulty (depth 3) for easy mode', async () => {
            const { findBestMoveIterativeDeepening, SEARCH_DEPTH, calculateOptimalMoveTime } = require('@jbuxofplenty/coral-clash');
            findBestMoveIterativeDeepening.mockClear();
            calculateOptimalMoveTime.mockClear();

            // Mock freshness check to return active game
            mocks.mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({ status: 'active' }),
            });

            // Test the helper directly with gameData
            await gameRoutes.makeComputerMoveHelper(gameId, {
                creatorId: userId,
                opponentId: 'computer',
                opponentType: 'computer',
                difficulty: 'easy',
                status: 'active',
                currentTurn: 'computer',
                timeControl: { totalSeconds: 300 },
                timeRemaining: { computer: 290 },
                gameState: {
                    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
                },
            });

            // Verify findBestMoveIterativeDeepening was called with easy depth (3)
            expect(calculateOptimalMoveTime).toHaveBeenCalledWith('easy', expect.anything());
            expect(findBestMoveIterativeDeepening).toHaveBeenCalledWith(
                expect.any(Object),
                SEARCH_DEPTH.easy, // Should be 3
                'b',
                3000, // Should use the mocked return value of calculateOptimalMoveTime
                null, // progressCallback
                null, // lastComputerMove
                'easy', // difficulty
            );
        });

        it('should use medium difficulty (depth 5) for medium mode', async () => {
            const { findBestMoveIterativeDeepening, SEARCH_DEPTH } = require('@jbuxofplenty/coral-clash');
            findBestMoveIterativeDeepening.mockClear();

            // Mock freshness check to return active game
            mocks.mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({ status: 'active' }),
            });

            // Test the helper directly with gameData
            await gameRoutes.makeComputerMoveHelper(gameId, {
                creatorId: userId,
                opponentId: 'computer',
                opponentType: 'computer',
                difficulty: 'medium',
                status: 'active',
                currentTurn: 'computer',
                gameState: {
                    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
                },
            });

            // Verify findBestMoveIterativeDeepening was called with medium depth (5)
            expect(findBestMoveIterativeDeepening).toHaveBeenCalledWith(
                expect.any(Object),
                SEARCH_DEPTH.medium, // Should be 5
                'b',
                expect.any(Number), // maxTimeMs
                null, // progressCallback
                null, // lastComputerMove
                'medium', // difficulty
            );
        });

        it('should use hard difficulty (depth 7) for hard mode', async () => {
            const { findBestMoveIterativeDeepening, SEARCH_DEPTH } = require('@jbuxofplenty/coral-clash');
            findBestMoveIterativeDeepening.mockClear();

            // Mock freshness check to return active game
            mocks.mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({ status: 'active' }),
            });

            // Test the helper directly with gameData
            await gameRoutes.makeComputerMoveHelper(gameId, {
                creatorId: userId,
                opponentId: 'computer',
                opponentType: 'computer',
                difficulty: 'hard',
                status: 'active',
                currentTurn: 'computer',
                gameState: {
                    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
                },
            });

            // Verify findBestMoveIterativeDeepening was called with hard depth (7)
            expect(findBestMoveIterativeDeepening).toHaveBeenCalledWith(
                expect.any(Object),
                SEARCH_DEPTH.hard, // Should be 7
                'b',
                expect.any(Number), // maxTimeMs
                null, // progressCallback
                null, // lastComputerMove
                'hard', // difficulty
            );
        });

        it('should use random moves for random difficulty', async () => {
            const { findBestMoveIterativeDeepening } = require('@jbuxofplenty/coral-clash');
            findBestMoveIterativeDeepening.mockClear();

            // Mock freshness check to return active game
            mocks.mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({ status: 'active' }),
            });

            // Test the helper directly with gameData
            await gameRoutes.makeComputerMoveHelper(gameId, {
                creatorId: userId,
                opponentId: 'computer',
                opponentType: 'computer',
                difficulty: 'random',
                status: 'active',
                currentTurn: 'computer',
                gameState: {
                    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
                },
            });

            // Verify findBestMoveIterativeDeepening was NOT called for random difficulty
            expect(findBestMoveIterativeDeepening).not.toHaveBeenCalled();
        });
        it('should abort move if game status changes to completed during calculation (freshness check)', async () => {
            const { findBestMoveIterativeDeepening } = require('@jbuxofplenty/coral-clash');
            
            // Mock findBestMoveIterativeDeepening to return a move
            findBestMoveIterativeDeepening.mockReturnValue({
                move: { from: 'e7', to: 'e6' },
                score: 100,
                nodesEvaluated: 50,
                depth: 3,
                elapsedMs: 500,
            });

            // Mock get() to return active game FIRST (implicitly via gameData argument or if fetched inside), 
            // but return COMPLETED game when the freshness check calls it.
            // Since we pass gameData to the helper, the helper skips the first fetch.
            // So the NEXT fetch inside helper is the freshness check.
            mocks.mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({
                    status: 'completed', // Simulator: User resigned
                    result: 'creator_wins',
                }),
            });

            const result = await gameRoutes.makeComputerMoveHelper(gameId, {
                creatorId: userId,
                opponentId: 'computer',
                opponentType: 'computer',
                difficulty: 'easy',
                status: 'active', // Passed as active initially
                currentTurn: 'computer',
                gameState: {
                    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
                },
            });

            // Verify result indicates aborted
            expect(result.aborted).toBe(true);
            expect(result.message).toBe('Game no longer active');
            
            // Verify NO update was called
            expect(mocks.mockDoc().update).not.toHaveBeenCalled();
        });
    });
});
});