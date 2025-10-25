// Mock the shared game library before requiring anything
jest.mock('../shared/dist/game');

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

const createMockDocRef = () => ({
    get: mockGet,
    update: mockUpdate,
    set: mockSet,
    collection: jest.fn(() => createMockCollectionRef()),
});

const createMockCollectionRef = () => ({
    doc: jest.fn(() => createMockDocRef()),
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
            // Call handler directly (v2 compatible)

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
                }),
            });

            // Mock creator settings (subcollection)
            mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({
                    avatarKey: 'dolphin',
                }),
            });

            // Mock opponent settings (subcollection)
            mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({
                    avatarKey: 'whale',
                }),
            });

            mockAdd.mockResolvedValue({ id: 'new-game-id-123' });

            const result = await gameRoutes.createGameHandler({
                data: {
                    opponentId,
                    timeControl: { type: 'unlimited' },
                },
                auth: { uid: creatorId },
            });

            expect(result.success).toBe(true);
            expect(result.gameId).toBe('new-game-id-123');
            expect(mockAdd).toHaveBeenCalledTimes(2); // Game + notification
        });

        it('should prevent duplicate game creation when pending request exists (creator->opponent)', async () => {
            // Call handler directly (v2 compatible)

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
                gameRoutes.createGameHandler({
                    data: {
                        opponentId,
                        timeControl: { type: 'unlimited' },
                    },
                    auth: { uid: creatorId },
                }),
            ).rejects.toThrow('A pending game request already exists between these players');

            expect(mockAdd).not.toHaveBeenCalled();
        });

        it('should prevent duplicate game creation when pending request exists (opponent->creator)', async () => {
            // Call handler directly (v2 compatible)

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
                gameRoutes.createGameHandler({
                    data: {
                        opponentId,
                        timeControl: { type: 'unlimited' },
                    },
                    auth: { uid: creatorId },
                }),
            ).rejects.toThrow('A pending game request already exists between these players');

            expect(mockAdd).not.toHaveBeenCalled();
        });

        it('should throw error if opponent does not exist', async () => {
            // Call handler directly (v2 compatible)

            // Mock opponent doesn't exist
            mockGet.mockResolvedValueOnce({
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

            expect(mockAdd).not.toHaveBeenCalled();
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

            expect(mockAdd).not.toHaveBeenCalled();
        });

        it('should allow new game creation if previous game between players is active (not pending)', async () => {
            // Call handler directly (v2 compatible)

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
                }),
            });

            // Mock creator settings (subcollection)
            mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({
                    avatarKey: 'dolphin',
                }),
            });

            // Mock opponent settings (subcollection)
            mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({
                    avatarKey: 'whale',
                }),
            });

            mockAdd.mockResolvedValue({ id: 'new-game-id-789' });

            const result = await gameRoutes.createGameHandler({
                data: {
                    opponentId,
                    timeControl: { type: 'unlimited' },
                },
                auth: { uid: creatorId },
            });

            expect(result.success).toBe(true);
            expect(result.gameId).toBe('new-game-id-789');
            expect(mockAdd).toHaveBeenCalledTimes(2); // Game + notification
        });
    });
});
