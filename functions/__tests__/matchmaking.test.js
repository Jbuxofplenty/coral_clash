// Mock the shared game library before requiring anything
jest.mock('../shared/dist/game');

const test = require('firebase-functions-test')();

// Mock Firestore
const mockGet = jest.fn();
const mockAdd = jest.fn();
const mockSet = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();
const mockWhere = jest.fn();
const mockOrderBy = jest.fn();
const mockLimit = jest.fn();
const mockServerTimestamp = jest.fn(() => ({ _methodName: 'serverTimestamp' }));

const createMockBatch = () => ({
    update: jest.fn(),
    delete: jest.fn(),
    commit: jest.fn().mockResolvedValue(undefined),
});

const mockBatch = jest.fn(() => createMockBatch());

const createMockDocRef = () => ({
    get: mockGet,
    update: mockUpdate,
    set: mockSet,
    delete: mockDelete,
});

const createMockCollectionRef = () => ({
    doc: jest.fn(() => createMockDocRef()),
    add: mockAdd,
    where: mockWhere,
    orderBy: mockOrderBy,
    limit: mockLimit,
    get: mockGet,
});

const mockCollection = jest.fn(() => createMockCollectionRef());

jest.mock('firebase-admin', () => {
    const mockFirestoreFunc = jest.fn(() => ({
        collection: mockCollection,
        batch: mockBatch,
        FieldValue: {
            serverTimestamp: mockServerTimestamp,
        },
    }));

    // Add Timestamp as a static property
    mockFirestoreFunc.Timestamp = {
        fromDate: jest.fn((date) => ({ seconds: Math.floor(date.getTime() / 1000) })),
    };

    return {
        initializeApp: jest.fn(),
        firestore: mockFirestoreFunc,
    };
});

const matchmakingRoutes = require('../routes/matchmaking');
const { onPlayerJoinQueue } = require('../triggers/onPlayerJoinQueue');
const { cleanupStaleMatchmakingEntries } = require('../scheduled/cleanupStaleMatchmakingEntries');

describe('Matchmaking Functions', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Setup default mock chains
        mockWhere.mockReturnValue({
            where: mockWhere,
            orderBy: mockOrderBy,
            limit: mockLimit,
            get: mockGet,
        });

        mockOrderBy.mockReturnValue({
            orderBy: mockOrderBy,
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

    describe('joinMatchmaking', () => {
        const userId = 'user-123';

        it('should successfully join matchmaking queue', async () => {
            // Call handler directly (v2 compatible)

            // Mock user not already in queue
            mockGet.mockResolvedValueOnce({
                exists: false,
            });

            // Mock no active games (2 queries)
            mockGet
                .mockResolvedValueOnce({ empty: true }) // creatorId query
                .mockResolvedValueOnce({ empty: true }); // opponentId query

            // Mock user profile exists
            mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({
                    displayName: 'TestUser',
                    discriminator: '1234',
                    settings: { avatarKey: 'dolphin' },
                }),
            });

            // Mock queue is empty (no matches)
            mockGet.mockResolvedValueOnce({
                empty: true,
                docs: [],
            });

            mockSet.mockResolvedValue(undefined);

            const result = await matchmakingRoutes.joinMatchmakingHandler({
                data: { timeControl: null },
                auth: { uid: userId },
            });

            expect(result.success).toBe(true);
            expect(result.message).toBe('Joined matchmaking queue');
            expect(mockSet).toHaveBeenCalledWith({
                userId,
                displayName: 'TestUser',
                discriminator: '1234',
                avatarKey: 'dolphin',
                joinedAt: expect.any(Object),
                lastHeartbeat: expect.any(Object),
                status: 'searching',
                timeControl: { type: 'unlimited' },
            });
        });

        it('should reject if user has active game', async () => {
            // Call handler directly (v2 compatible)

            // Mock user not in queue
            mockGet.mockResolvedValueOnce({
                exists: false,
            });

            // Mock active game exists
            mockGet
                .mockResolvedValueOnce({ empty: false }) // Has active game as creator
                .mockResolvedValueOnce({ empty: true });

            await expect(
                matchmakingRoutes.joinMatchmakingHandler({
                    data: {},
                    auth: { uid: userId },
                }),
            ).rejects.toThrow('You already have an active game');
        });

        it('should reject if user not authenticated', async () => {
            await expect(
                matchmakingRoutes.joinMatchmakingHandler({
                    data: {},
                    auth: null,
                }),
            ).rejects.toThrow('User must be authenticated');
        });
    });

    describe('leaveMatchmaking', () => {
        const userId = 'user-123';

        it('should successfully leave matchmaking queue', async () => {
            mockDelete.mockResolvedValue(undefined);

            const result = await matchmakingRoutes.leaveMatchmakingHandler({
                data: {},
                auth: { uid: userId },
            });

            expect(result.success).toBe(true);
            expect(result.message).toBe('Left matchmaking queue');
            expect(mockDelete).toHaveBeenCalled();
        });

        it('should reject if user not authenticated', async () => {
            await expect(
                matchmakingRoutes.leaveMatchmakingHandler({
                    data: {},
                    auth: null,
                }),
            ).rejects.toThrow('User must be authenticated');
        });
    });

    describe('getMatchmakingStatus', () => {
        const userId = 'user-123';

        it('should reject if user not authenticated', async () => {
            await expect(
                matchmakingRoutes.getMatchmakingStatusHandler({
                    data: {},
                    auth: null,
                }),
            ).rejects.toThrow('User must be authenticated');
        });
    });

    describe('Edge Cases', () => {
        it('should handle database errors gracefully', async () => {
            mockGet.mockRejectedValueOnce(new Error('Database connection failed'));

            await expect(
                matchmakingRoutes.joinMatchmakingHandler({
                    data: {},
                    auth: { uid: 'user-123' },
                }),
            ).rejects.toThrow();
        });
    });
});
