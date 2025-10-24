// Mock the shared game library before requiring anything
jest.mock('../../shared/game');

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
            const wrapped = test.wrap(matchmakingRoutes.joinMatchmaking);

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

            const result = await wrapped({ timeControl: null }, { auth: { uid: userId } });

            expect(result.success).toBe(true);
            expect(result.message).toBe('Joined matchmaking queue');
            expect(mockSet).toHaveBeenCalledWith({
                userId,
                displayName: 'TestUser',
                discriminator: '1234',
                avatarKey: 'dolphin',
                joinedAt: expect.any(Object),
                status: 'searching',
                timeControl: { type: 'unlimited' },
            });
        });

        it('should return already in queue if user exists in queue', async () => {
            const wrapped = test.wrap(matchmakingRoutes.joinMatchmaking);

            // Mock user already in queue
            mockGet.mockResolvedValueOnce({
                exists: true,
            });

            const result = await wrapped({}, { auth: { uid: userId } });

            expect(result.success).toBe(true);
            expect(result.message).toBe('Already in matchmaking queue');
            expect(result.alreadyInQueue).toBe(true);
        });

        it('should reject if user has active game', async () => {
            const wrapped = test.wrap(matchmakingRoutes.joinMatchmaking);

            // Mock user not in queue
            mockGet.mockResolvedValueOnce({
                exists: false,
            });

            // Mock active game exists
            mockGet
                .mockResolvedValueOnce({ empty: false }) // Has active game as creator
                .mockResolvedValueOnce({ empty: true });

            await expect(wrapped({}, { auth: { uid: userId } })).rejects.toThrow(
                'You already have an active game',
            );
        });

        it('should reject if user not authenticated', async () => {
            const wrapped = test.wrap(matchmakingRoutes.joinMatchmaking);

            await expect(wrapped({}, {})).rejects.toThrow('User must be authenticated');
        });

        it('should reject if user profile not found', async () => {
            const wrapped = test.wrap(matchmakingRoutes.joinMatchmaking);

            // Mock user not in queue
            mockGet.mockResolvedValueOnce({
                exists: false,
            });

            // Mock no active games
            mockGet.mockResolvedValueOnce({ empty: true }).mockResolvedValueOnce({ empty: true });

            // Mock user profile does not exist
            mockGet.mockResolvedValueOnce({
                exists: false,
            });

            await expect(wrapped({}, { auth: { uid: userId } })).rejects.toThrow(
                'User profile not found',
            );
        });
    });

    describe('leaveMatchmaking', () => {
        const userId = 'user-123';

        it('should successfully leave matchmaking queue', async () => {
            const wrapped = test.wrap(matchmakingRoutes.leaveMatchmaking);

            mockDelete.mockResolvedValue(undefined);

            const result = await wrapped({}, { auth: { uid: userId } });

            expect(result.success).toBe(true);
            expect(result.message).toBe('Left matchmaking queue');
            expect(mockDelete).toHaveBeenCalled();
        });

        it('should reject if user not authenticated', async () => {
            const wrapped = test.wrap(matchmakingRoutes.leaveMatchmaking);

            await expect(wrapped({}, {})).rejects.toThrow('User must be authenticated');
        });
    });

    describe('getMatchmakingStatus', () => {
        const userId = 'user-123';

        it('should return queue status with user in queue', async () => {
            const wrapped = test.wrap(matchmakingRoutes.getMatchmakingStatus);

            // Mock queue has 3 players
            mockGet.mockResolvedValueOnce({
                size: 3,
            });

            // Mock user is in queue
            mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({
                    status: 'searching',
                }),
            });

            const result = await wrapped({}, { auth: { uid: userId } });

            expect(result.success).toBe(true);
            expect(result.queueCount).toBe(3);
            expect(result.inQueue).toBe(true);
            expect(result.status).toBe('searching');
        });

        it('should return queue status with user not in queue', async () => {
            const wrapped = test.wrap(matchmakingRoutes.getMatchmakingStatus);

            // Mock queue has 5 players
            mockGet.mockResolvedValueOnce({
                size: 5,
            });

            // Mock user is not in queue
            mockGet.mockResolvedValueOnce({
                exists: false,
            });

            const result = await wrapped({}, { auth: { uid: userId } });

            expect(result.success).toBe(true);
            expect(result.queueCount).toBe(5);
            expect(result.inQueue).toBe(false);
            expect(result.status).toBe(null);
        });

        it('should reject if user not authenticated', async () => {
            const wrapped = test.wrap(matchmakingRoutes.getMatchmakingStatus);

            await expect(wrapped({}, {})).rejects.toThrow('User must be authenticated');
        });
    });

    describe('onPlayerJoinQueue trigger', () => {
        it('should trigger matching when player joins queue', async () => {
            const wrapped = test.wrap(matchmakingRoutes.onPlayerJoinQueue);

            const snap = {
                data: () => ({
                    userId: 'user-123',
                    status: 'searching',
                }),
            };

            const context = {
                params: {
                    userId: 'user-123',
                },
            };

            // Mock empty queue (no matches)
            mockGet.mockResolvedValueOnce({
                empty: true,
                docs: [],
            });

            const result = await wrapped(snap, context);

            expect(result).toBe(null);
        });

        it('should not trigger matching if status is not searching', async () => {
            const wrapped = test.wrap(matchmakingRoutes.onPlayerJoinQueue);

            const snap = {
                data: () => ({
                    userId: 'user-123',
                    status: 'matched',
                }),
            };

            const context = {
                params: {
                    userId: 'user-123',
                },
            };

            const result = await wrapped(snap, context);

            expect(result).toBe(null);
            expect(mockGet).not.toHaveBeenCalled();
        });
    });

    describe('cleanupStaleMatchmakingEntries trigger', () => {
        it('should clean up stale entries', async () => {
            const wrapped = test.wrap(matchmakingRoutes.cleanupStaleMatchmakingEntries);

            const mockBatchInstance = createMockBatch();
            mockBatch.mockReturnValue(mockBatchInstance);

            // Mock stale entries exist
            const mockDoc1 = { ref: 'ref1' };
            const mockDoc2 = { ref: 'ref2' };

            mockGet.mockResolvedValueOnce({
                empty: false,
                size: 2,
                docs: [mockDoc1, mockDoc2],
            });

            const result = await wrapped({});

            expect(result).toBe(null);
            expect(mockBatchInstance.delete).toHaveBeenCalledTimes(2);
            expect(mockBatchInstance.commit).toHaveBeenCalled();
        });

        it('should return early if no stale entries', async () => {
            const wrapped = test.wrap(matchmakingRoutes.cleanupStaleMatchmakingEntries);

            // Mock no stale entries
            mockGet.mockResolvedValueOnce({
                empty: true,
                docs: [],
            });

            const result = await wrapped({});

            expect(result).toBe(null);
            expect(mockBatch).not.toHaveBeenCalled();
        });
    });

    describe('Edge Cases', () => {
        it('should handle database errors gracefully', async () => {
            const wrapped = test.wrap(matchmakingRoutes.joinMatchmaking);

            mockGet.mockRejectedValueOnce(new Error('Database connection failed'));

            await expect(wrapped({}, { auth: { uid: 'user-123' } })).rejects.toThrow();
        });
    });
});
