// Mock the shared game library before requiring anything
jest.mock('../../shared/game');

const test = require('firebase-functions-test')();

// Mock Firestore
const mockGet = jest.fn();
const mockAdd = jest.fn();
const mockUpdate = jest.fn();
const mockSet = jest.fn();
const mockWhere = jest.fn();
const mockLimit = jest.fn();
const mockServerTimestamp = jest.fn(() => ({ _methodName: 'serverTimestamp' }));
const mockIncrement = jest.fn((value) => ({ _methodName: 'increment', value }));

const createMockQueryRef = () => ({
    where: mockWhere,
    limit: mockLimit,
    get: mockGet,
});

const createMockCollectionRef = () => ({
    doc: jest.fn(() => ({
        get: mockGet,
        update: mockUpdate,
        set: mockSet,
    })),
    add: mockAdd,
    where: mockWhere,
});

const mockCollection = jest.fn((collectionName) => createMockCollectionRef());

jest.mock('firebase-admin', () => ({
    initializeApp: jest.fn(),
    firestore: jest.fn(() => ({
        collection: mockCollection,
        FieldValue: {
            serverTimestamp: mockServerTimestamp,
            increment: mockIncrement,
        },
    })),
}));

// Mock the notifications utility
jest.mock('../utils/notifications', () => ({
    sendGameRequestNotification: jest.fn().mockResolvedValue(undefined),
}));

// Mock Cloud Tasks
const mockDeleteTask = jest.fn();
const mockCloudTasksClient = jest.fn(() => ({
    deleteTask: mockDeleteTask,
}));

jest.mock('@google-cloud/tasks', () => ({
    CloudTasksClient: mockCloudTasksClient,
}));

const gameRoutes = require('../routes/game');

describe('Game Creation Functions', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Setup default mock chain for where().limit().get()
        mockWhere.mockReturnValue({
            where: mockWhere,
            limit: mockLimit,
            get: mockGet,
        });

        mockLimit.mockReturnValue({
            get: mockGet,
        });
    });

    afterAll(() => {
        test.cleanup();
    });

    describe('createGame', () => {
        const creatorId = 'creator-user-123';
        const opponentId = 'opponent-user-456';

        it('should create a new PvP game successfully', async () => {
            const wrapped = test.wrap(gameRoutes.createGame);

            // Mock opponent exists
            mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({
                    displayName: 'Opponent',
                    discriminator: '1234',
                }),
            });

            // Mock no existing pending games (both queries return empty)
            mockGet
                .mockResolvedValueOnce({ empty: true }) // Query 1: creator->opponent
                .mockResolvedValueOnce({ empty: true }); // Query 2: opponent->creator

            // Mock creator data
            mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({
                    displayName: 'Creator',
                    discriminator: '5678',
                    settings: { avatarKey: 'dolphin' },
                }),
            });

            mockAdd.mockResolvedValue({ id: 'new-game-id-123' });

            const result = await wrapped(
                {
                    opponentId,
                    timeControl: { type: 'unlimited' },
                },
                { auth: { uid: creatorId } },
            );

            expect(result.success).toBe(true);
            expect(result.gameId).toBe('new-game-id-123');
            expect(mockAdd).toHaveBeenCalledTimes(2); // Game + notification
        });

        it('should prevent duplicate game creation when pending request exists (creator->opponent)', async () => {
            const wrapped = test.wrap(gameRoutes.createGame);

            // Mock opponent exists
            mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({
                    displayName: 'Opponent',
                    discriminator: '1234',
                }),
            });

            // Mock existing pending game (creator->opponent direction)
            mockGet
                .mockResolvedValueOnce({
                    empty: false, // Query 1: Found pending game
                    docs: [{ id: 'existing-game-id' }],
                })
                .mockResolvedValueOnce({ empty: true }); // Query 2: opponent->creator

            await expect(
                wrapped(
                    {
                        opponentId,
                        timeControl: { type: 'unlimited' },
                    },
                    { auth: { uid: creatorId } },
                ),
            ).rejects.toThrow('A pending game request already exists between these players');

            expect(mockAdd).not.toHaveBeenCalled();
        });

        it('should prevent duplicate game creation when pending request exists (opponent->creator)', async () => {
            const wrapped = test.wrap(gameRoutes.createGame);

            // Mock opponent exists
            mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({
                    displayName: 'Opponent',
                    discriminator: '1234',
                }),
            });

            // Mock existing pending game (opponent->creator direction)
            mockGet
                .mockResolvedValueOnce({ empty: true }) // Query 1: creator->opponent
                .mockResolvedValueOnce({
                    empty: false, // Query 2: Found pending game in reverse direction
                    docs: [{ id: 'existing-game-id' }],
                });

            await expect(
                wrapped(
                    {
                        opponentId,
                        timeControl: { type: 'unlimited' },
                    },
                    { auth: { uid: creatorId } },
                ),
            ).rejects.toThrow('A pending game request already exists between these players');

            expect(mockAdd).not.toHaveBeenCalled();
        });

        it('should throw error if opponent does not exist', async () => {
            const wrapped = test.wrap(gameRoutes.createGame);

            // Mock opponent doesn't exist
            mockGet.mockResolvedValueOnce({
                exists: false,
            });

            await expect(
                wrapped(
                    {
                        opponentId: 'non-existent-user',
                        timeControl: { type: 'unlimited' },
                    },
                    { auth: { uid: creatorId } },
                ),
            ).rejects.toThrow('Opponent not found');

            expect(mockAdd).not.toHaveBeenCalled();
        });

        it('should throw error if user is not authenticated', async () => {
            const wrapped = test.wrap(gameRoutes.createGame);

            await expect(
                wrapped(
                    {
                        opponentId,
                        timeControl: { type: 'unlimited' },
                    },
                    {}, // No auth context
                ),
            ).rejects.toThrow('User must be authenticated');

            expect(mockAdd).not.toHaveBeenCalled();
        });

        it('should allow new game creation if previous game between players is active (not pending)', async () => {
            const wrapped = test.wrap(gameRoutes.createGame);

            // Mock opponent exists
            mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({
                    displayName: 'Opponent',
                    discriminator: '1234',
                }),
            });

            // Mock no PENDING games (even though there may be active/completed games)
            mockGet
                .mockResolvedValueOnce({ empty: true }) // Query 1: No pending creator->opponent
                .mockResolvedValueOnce({ empty: true }); // Query 2: No pending opponent->creator

            // Mock creator data
            mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({
                    displayName: 'Creator',
                    discriminator: '5678',
                    settings: { avatarKey: 'dolphin' },
                }),
            });

            mockAdd.mockResolvedValue({ id: 'new-game-id-789' });

            const result = await wrapped(
                {
                    opponentId,
                    timeControl: { type: 'unlimited' },
                },
                { auth: { uid: creatorId } },
            );

            expect(result.success).toBe(true);
            expect(result.gameId).toBe('new-game-id-789');
            expect(mockAdd).toHaveBeenCalledTimes(2); // Game + notification
        });
    });

    describe('Timeout Task Management', () => {
        beforeEach(() => {
            // Clear all mocks including mockDeleteTask
            jest.clearAllMocks();
            mockDeleteTask.mockClear();

            // Set emulator flag
            process.env.FUNCTIONS_EMULATOR = 'false';
        });

        afterEach(() => {
            delete process.env.FUNCTIONS_EMULATOR;
        });

        it('should skip task cancellation in emulator mode', async () => {
            process.env.FUNCTIONS_EMULATOR = 'true';

            const wrapped = test.wrap(gameRoutes.resignGame);
            const userId = 'user-123';
            const gameId = 'game-456';
            const opponentId = 'opponent-789';

            // Mock game exists and is active
            mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({
                    creatorId: userId,
                    opponentId: opponentId,
                    status: 'active',
                    whitePlayerId: userId,
                    blackPlayerId: opponentId,
                    gameState: { fen: 'starting-fen' },
                    pendingTimeoutTask: 'some-task-name',
                }),
            });

            // Mock user documents for stats updates (winner)
            mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({ stats: { gamesPlayed: 0, gamesWon: 0, gamesLost: 0 } }),
            });

            // Mock user documents for stats updates (loser)
            mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({ stats: { gamesPlayed: 0, gamesWon: 0, gamesLost: 0 } }),
            });

            mockUpdate.mockResolvedValue(undefined);
            mockSet.mockResolvedValue(undefined);

            await wrapped({ gameId }, { auth: { uid: userId } });

            // Should not attempt to delete task in emulator
            expect(mockDeleteTask).not.toHaveBeenCalled();
        });

        // TODO: Fix mock setup for Cloud Tasks integration tests
        it.skip('should cancel timeout task when game ends via resignation (computer game)', async () => {
            const wrapped = test.wrap(gameRoutes.resignGame);
            const userId = 'user-123';
            const gameId = 'game-456';
            const taskName =
                'projects/test/locations/us-central1/queues/default/tasks/timeout-game-456-123';

            // Mock game exists with pending timeout task (computer game)
            mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({
                    creatorId: userId,
                    opponentId: 'computer',
                    status: 'active',
                    whitePlayerId: userId,
                    blackPlayerId: 'computer',
                    gameState: { fen: 'starting-fen' },
                    pendingTimeoutTask: taskName,
                }),
            });

            // Mock user document for stats update (only user, not computer)
            mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({ stats: { gamesPlayed: 0, gamesWon: 0, gamesLost: 0 } }),
            });

            mockDeleteTask.mockResolvedValue(undefined);
            mockUpdate.mockResolvedValue(undefined);
            mockSet.mockResolvedValue(undefined);

            await wrapped({ gameId }, { auth: { uid: userId } });

            // Should update game status to completed
            expect(mockUpdate).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: 'completed',
                    pendingTimeoutTask: null,
                }),
            );
        });

        // TODO: Fix mock setup for Cloud Tasks integration tests
        it.skip('should handle task cancellation errors gracefully (computer game)', async () => {
            const wrapped = test.wrap(gameRoutes.resignGame);
            const userId = 'user-123';
            const gameId = 'game-456';
            const taskName =
                'projects/test/locations/us-central1/queues/default/tasks/timeout-game-456-123';

            // Mock game exists with pending timeout task (computer game)
            mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({
                    creatorId: userId,
                    opponentId: 'computer',
                    status: 'active',
                    whitePlayerId: userId,
                    blackPlayerId: 'computer',
                    gameState: { fen: 'starting-fen' },
                    pendingTimeoutTask: taskName,
                }),
            });

            // Mock user document for stats update
            mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({ stats: { gamesPlayed: 0, gamesWon: 0, gamesLost: 0 } }),
            });

            // Mock task deletion failure (task already executed)
            mockDeleteTask.mockRejectedValue(new Error('Task not found'));
            mockUpdate.mockResolvedValue(undefined);
            mockSet.mockResolvedValue(undefined);

            // Should not throw - error should be caught and logged
            await expect(wrapped({ gameId }, { auth: { uid: userId } })).resolves.not.toThrow();

            // Game should still be updated to completed
            expect(mockUpdate).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: 'completed',
                }),
            );
        });

        // TODO: Fix mock setup for Cloud Tasks integration tests
        it.skip('should not cancel task if game has no pending timeout task (computer game)', async () => {
            const wrapped = test.wrap(gameRoutes.resignGame);
            const userId = 'user-123';
            const gameId = 'game-456';

            // Mock game exists WITHOUT pending timeout task (computer game)
            mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({
                    creatorId: userId,
                    opponentId: 'computer',
                    status: 'active',
                    whitePlayerId: userId,
                    blackPlayerId: 'computer',
                    gameState: { fen: 'starting-fen' },
                    // No pendingTimeoutTask field
                }),
            });

            // Mock user document for stats update
            mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({ stats: { gamesPlayed: 0, gamesWon: 0, gamesLost: 0 } }),
            });

            mockUpdate.mockResolvedValue(undefined);
            mockSet.mockResolvedValue(undefined);

            await wrapped({ gameId }, { auth: { uid: userId } });

            // Should not attempt to delete task
            expect(mockDeleteTask).not.toHaveBeenCalled();

            // Game should still be updated to completed
            expect(mockUpdate).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: 'completed',
                    pendingTimeoutTask: null,
                }),
            );
        });
    });
});
