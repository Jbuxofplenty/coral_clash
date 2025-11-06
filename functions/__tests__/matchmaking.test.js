import { cleanup, setupStandardMocks } from './testHelpers.js';

const mocks = setupStandardMocks();

jest.mock('../shared/dist/game/index.js');

jest.mock('firebase-admin', () => {
    const mockFirestoreFunc = jest.fn(() => ({
        collection: (...args) => mocks.mockCollection(...args),
        batch: (...args) => mocks.mockBatch(...args),
        FieldValue: {
            serverTimestamp: (...args) => mocks.mockServerTimestamp(...args),
            increment: (...args) => mocks.mockIncrement(...args),
            arrayUnion: (...args) => mocks.mockArrayUnion(...args),
            arrayRemove: (...args) => mocks.mockArrayRemove(...args),
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

import * as matchmakingRoutes from '../routes/matchmaking.js';

describe('Matchmaking Functions', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Setup default mock chains
        mocks.mockWhere.mockReturnValue({
            where: mocks.mockWhere,
            orderBy: mocks.mockOrderBy,
            limit: mocks.mockLimit,
            get: mocks.mockGet,
        });

        mocks.mockOrderBy.mockReturnValue({
            orderBy: mocks.mockOrderBy,
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

    describe('joinMatchmaking', () => {
        const userId = 'user-123';

        it('should successfully join matchmaking queue', async () => {
            // Call handler directly (v2 compatible)

            // Mock user not already in queue
            mocks.mockGet.mockResolvedValueOnce({
                exists: false,
            });

            // Mock user profile exists
            mocks.mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({
                    displayName: 'TestUser',
                    discriminator: '1234',
                    settings: { avatarKey: 'dolphin' },
                }),
            });

            // Mock queue is empty (no matches)
            mocks.mockGet.mockResolvedValueOnce({
                empty: true,
                docs: [],
            });

            mocks.mockSet.mockResolvedValue(undefined);

            const result = await matchmakingRoutes.joinMatchmakingHandler({
                data: { timeControl: null },
                auth: { uid: userId },
            });

            expect(result.success).toBe(true);
            expect(result.message).toBe('Joined matchmaking queue');
            expect(mocks.mockSet).toHaveBeenCalledWith({
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
            mocks.mockDelete.mockResolvedValue(undefined);

            const result = await matchmakingRoutes.leaveMatchmakingHandler({
                data: {},
                auth: { uid: userId },
            });

            expect(result.success).toBe(true);
            expect(result.message).toBe('Left matchmaking queue');
            expect(mocks.mockDelete).toHaveBeenCalled();
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
            mocks.mockGet.mockRejectedValueOnce(new Error('Database connection failed'));

            await expect(
                matchmakingRoutes.joinMatchmakingHandler({
                    data: {},
                    auth: { uid: 'user-123' },
                }),
            ).rejects.toThrow();
        });
    });
});
