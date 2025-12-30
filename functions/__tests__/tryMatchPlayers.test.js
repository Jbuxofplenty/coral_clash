import { cleanup, setupStandardMocks } from './testHelpers.js';

const mocks = setupStandardMocks();

jest.mock('../shared/dist/game/index.js');
jest.mock('../utils/notifications.js', () => ({
    sendMatchFoundNotification: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../routes/game.js', () => ({
    makeComputerMoveHelper: jest.fn().mockResolvedValue(undefined),
}));

// Mock computer users utilities
jest.mock('../utils/computerUsers.js', () => ({
    isComputerUser: jest.fn((userId) => userId.startsWith('computer_user_')),
    getRandomComputerUser: jest.fn(() => ({
        id: 'computer_user_1',
        displayName: 'Alex',
        discriminator: '2847',
        difficulty: 'easy',
        avatarKey: 'dolphin',
    })),
}));

// Mock Timestamp.now() - we'll control this in tests
let mockNowTimestamp = { seconds: Math.floor(Date.now() / 1000) };
let mockTimestampNow = jest.fn(() => mockNowTimestamp);

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

    // Add Timestamp with now() method that we can control
    // We'll update this in beforeEach
    mockFirestoreFunc.Timestamp = {
        fromDate: jest.fn((date) => ({ seconds: Math.floor(date.getTime() / 1000) })),
        now: jest.fn(() => mockNowTimestamp),
    };

    const mockAdmin = {
        initializeApp: jest.fn(),
        firestore: mockFirestoreFunc,
    };

    return mockAdmin;
});

jest.mock('../init.js', () => {
    const admin = require('firebase-admin');
    return { admin };
});

import { tryMatchPlayers } from '../triggers/onPlayerJoinQueue.js';

describe('tryMatchPlayers - Computer User Matching Delay (10 seconds)', () => {
    const realUserId = 'user-123';
    const computerUserId = 'computer_user_1';
    const baseTime = Math.floor(Date.now() / 1000); // Current time in seconds

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Reset Timestamp.now() mock
        const admin = require('firebase-admin');
        admin.firestore.Timestamp.now = jest.fn(() => mockNowTimestamp);

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

        // Mock batch operations
        const mockBatchUpdate = jest.fn();
        const mockBatchCommit = jest.fn().mockResolvedValue(undefined);
        const mockBatchDelete = jest.fn();
        mocks.mockBatch.mockReturnValue({
            update: mockBatchUpdate,
            commit: mockBatchCommit,
            delete: mockBatchDelete,
        });

        // Mock add for notifications and games
        mocks.mockAdd.mockResolvedValue({ id: 'game-123' });
    });

    afterAll(() => {
        cleanup();
    });

    it('should NOT match with computer user if user has waited less than 10 seconds', async () => {
        const joinedAtSeconds = baseTime - 5; // User joined 5 seconds ago
        const nowSeconds = baseTime; // Current time

        // Mock Timestamp.now() to return current time
        mockNowTimestamp = { seconds: nowSeconds };
        mockTimestampNow.mockReturnValue(mockNowTimestamp);

        // Mock user's queue entry
        mocks.mockGet.mockResolvedValueOnce({
            exists: true,
            data: () => ({
                userId: realUserId,
                timeControl: { type: 'unlimited' },
                joinedAt: { seconds: joinedAtSeconds },
                status: 'searching',
            }),
        });

        // Mock queue query - no real users available
        mocks.mockGet.mockResolvedValueOnce({
            empty: false,
            docs: [], // No real users in queue
        });

        // Function should return early without matching
        await tryMatchPlayers(realUserId);

        // Verify no game was created (mockAdd should not be called)
        expect(mocks.mockAdd).not.toHaveBeenCalled();
    });

    it('should match with computer user if user has waited 10+ seconds', async () => {
        const joinedAtSeconds = baseTime - 15; // User joined 15 seconds ago
        const nowSeconds = baseTime; // Current time

        // Mock Timestamp.now() to return current time
        mockNowTimestamp = { seconds: nowSeconds };
        mockTimestampNow.mockReturnValue(mockNowTimestamp);

        // Mock user's queue entry
        mocks.mockGet.mockResolvedValueOnce({
            exists: true,
            data: () => ({
                userId: realUserId,
                timeControl: { type: 'unlimited' },
                joinedAt: { seconds: joinedAtSeconds },
                status: 'searching',
            }),
        });

        // Mock queue query - no real users available
        mocks.mockGet.mockResolvedValueOnce({
            empty: false,
            docs: [], // No real users in queue
        });

        // Mock computer user's queue entry (needs id property for opponentDoc.id)
        const mockComputerQueueDoc = {
            id: computerUserId,
            exists: true,
            data: () => ({
                userId: computerUserId,
                status: 'searching',
            }),
        };
        mocks.mockGet.mockResolvedValueOnce(mockComputerQueueDoc);

        // Mock both players' queue entries for verification
        mocks.mockGet.mockResolvedValueOnce({
            exists: true,
            data: () => ({
                userId: realUserId,
                timeControl: { type: 'unlimited' },
                joinedAt: { seconds: joinedAtSeconds },
                status: 'searching',
            }),
        });
        mocks.mockGet.mockResolvedValueOnce({
            exists: true,
            data: () => ({
                userId: computerUserId,
                status: 'searching',
            }),
        });

        // Mock user profiles for game creation
        mocks.mockGet.mockResolvedValueOnce({
            exists: true,
            data: () => ({
                displayName: 'TestUser',
                discriminator: '1234',
            }),
        });
        mocks.mockGet.mockResolvedValueOnce({
            exists: true,
            data: () => ({
                displayName: 'Alex',
                discriminator: '2847',
                difficulty: 'easy',
            }),
        });

        // Mock user settings
        mocks.mockGet.mockResolvedValueOnce({
            exists: true,
            data: () => ({ avatarKey: 'dolphin' }),
        });
        mocks.mockGet.mockResolvedValueOnce({
            exists: true,
            data: () => ({ avatarKey: 'dolphin' }),
        });

        // Mock queue data for time control
        mocks.mockGet.mockResolvedValueOnce({
            exists: true,
            data: () => ({ timeControl: { type: 'unlimited' } }),
        });
        mocks.mockGet.mockResolvedValueOnce({
            exists: true,
            data: () => ({ timeControl: { type: 'unlimited' } }),
        });

        await tryMatchPlayers(realUserId);

        // Verify game was created
        expect(mocks.mockAdd).toHaveBeenCalled();
    });

    it('should match with real user immediately regardless of wait time', async () => {
        const joinedAtSeconds = baseTime - 5; // User joined 5 seconds ago (less than 10)
        const nowSeconds = baseTime;
        const opponentUserId = 'user-456';

        // Mock Timestamp.now() to return current time
        mockNowTimestamp = { seconds: nowSeconds };
        mockTimestampNow.mockReturnValue(mockNowTimestamp);

        // Mock user's queue entry
        mocks.mockGet.mockResolvedValueOnce({
            exists: true,
            data: () => ({
                userId: realUserId,
                timeControl: { type: 'unlimited' },
                joinedAt: { seconds: joinedAtSeconds },
                status: 'searching',
            }),
        });

        // Mock queue query - real user available
        mocks.mockGet.mockResolvedValueOnce({
            empty: false,
            docs: [
                {
                    id: opponentUserId,
                    data: () => ({
                        userId: opponentUserId,
                        timeControl: { type: 'unlimited' },
                        status: 'searching',
                    }),
                },
            ],
        });

        // Mock both players' queue entries for verification
        mocks.mockGet.mockResolvedValueOnce({
            exists: true,
            data: () => ({
                userId: realUserId,
                timeControl: { type: 'unlimited' },
                joinedAt: { seconds: joinedAtSeconds },
                status: 'searching',
            }),
        });
        mocks.mockGet.mockResolvedValueOnce({
            exists: true,
            data: () => ({
                userId: opponentUserId,
                timeControl: { type: 'unlimited' },
                status: 'searching',
            }),
        });

        // Mock user profiles for game creation
        mocks.mockGet.mockResolvedValueOnce({
            exists: true,
            data: () => ({
                displayName: 'TestUser',
                discriminator: '1234',
            }),
        });
        mocks.mockGet.mockResolvedValueOnce({
            exists: true,
            data: () => ({
                displayName: 'OpponentUser',
                discriminator: '5678',
            }),
        });

        // Mock user settings
        mocks.mockGet.mockResolvedValueOnce({
            exists: true,
            data: () => ({ avatarKey: 'dolphin' }),
        });
        mocks.mockGet.mockResolvedValueOnce({
            exists: true,
            data: () => ({ avatarKey: 'whale' }),
        });

        // Mock queue data for time control
        mocks.mockGet.mockResolvedValueOnce({
            exists: true,
            data: () => ({ timeControl: { type: 'unlimited' } }),
        });
        mocks.mockGet.mockResolvedValueOnce({
            exists: true,
            data: () => ({ timeControl: { type: 'unlimited' } }),
        });

        await tryMatchPlayers(realUserId);

        // Verify game was created even though wait time was less than 15 seconds
        expect(mocks.mockAdd).toHaveBeenCalled();
    });

    it('should handle edge case of exactly 10 seconds wait time', async () => {
        const joinedAtSeconds = baseTime - 10; // User joined exactly 10 seconds ago
        const nowSeconds = baseTime;

        // Mock Timestamp.now() to return current time
        mockNowTimestamp = { seconds: nowSeconds };
        mockTimestampNow.mockReturnValue(mockNowTimestamp);

        // Mock user's queue entry
        mocks.mockGet.mockResolvedValueOnce({
            exists: true,
            data: () => ({
                userId: realUserId,
                timeControl: { type: 'unlimited' },
                joinedAt: { seconds: joinedAtSeconds },
                status: 'searching',
            }),
        });

        // Mock queue query - no real users available
        mocks.mockGet.mockResolvedValueOnce({
            empty: false,
            docs: [],
        });

        // Mock computer user's queue entry (needs id property for opponentDoc.id)
        const mockComputerQueueDoc = {
            id: computerUserId,
            exists: true,
            data: () => ({
                userId: computerUserId,
                status: 'searching',
            }),
        };
        mocks.mockGet.mockResolvedValueOnce(mockComputerQueueDoc);

        // Mock both players' queue entries for verification
        mocks.mockGet.mockResolvedValueOnce({
            exists: true,
            data: () => ({
                userId: realUserId,
                timeControl: { type: 'unlimited' },
                joinedAt: { seconds: joinedAtSeconds },
                status: 'searching',
            }),
        });
        mocks.mockGet.mockResolvedValueOnce({
            exists: true,
            data: () => ({
                userId: computerUserId,
                status: 'searching',
            }),
        });

        // Mock user profiles for game creation
        mocks.mockGet.mockResolvedValueOnce({
            exists: true,
            data: () => ({
                displayName: 'TestUser',
                discriminator: '1234',
            }),
        });
        mocks.mockGet.mockResolvedValueOnce({
            exists: true,
            data: () => ({
                displayName: 'Alex',
                discriminator: '2847',
                difficulty: 'easy',
            }),
        });

        // Mock user settings
        mocks.mockGet.mockResolvedValueOnce({
            exists: true,
            data: () => ({ avatarKey: 'dolphin' }),
        });
        mocks.mockGet.mockResolvedValueOnce({
            exists: true,
            data: () => ({ avatarKey: 'dolphin' }),
        });

        // Mock queue data for time control
        mocks.mockGet.mockResolvedValueOnce({
            exists: true,
            data: () => ({ timeControl: { type: 'unlimited' } }),
        });
        mocks.mockGet.mockResolvedValueOnce({
            exists: true,
            data: () => ({ timeControl: { type: 'unlimited' } }),
        });

        await tryMatchPlayers(realUserId);

        // Verify game was created at exactly 10 seconds
        expect(mocks.mockAdd).toHaveBeenCalled();
    });

    it('should NOT create game if user is removed from queue during process (race condition)', async () => {
        const nowSeconds = baseTime;
        const opponentUserId = 'user-456';

        // Mock Timestamp.now()
        mockNowTimestamp = { seconds: nowSeconds };
        mockTimestampNow.mockReturnValue(mockNowTimestamp);

        // 1. Initial user queue check
        mocks.mockGet.mockResolvedValueOnce({
            exists: true,
            data: () => ({
                userId: realUserId,
                timeControl: { type: 'unlimited' },
                status: 'searching',
            }),
        });

        // 2. Queue query (finds opponent)
        mocks.mockGet.mockResolvedValueOnce({
            empty: false,
            docs: [
                {
                    id: opponentUserId,
                    data: () => ({
                        userId: opponentUserId,
                        timeControl: { type: 'unlimited' },
                        status: 'searching',
                    }),
                },
            ],
        });

        // 3. Pre-create check: Player 1 (Exists)
        mocks.mockGet.mockResolvedValueOnce({ exists: true });
        // 4. Pre-create check: Player 2 (Exists)
        mocks.mockGet.mockResolvedValueOnce({ exists: true });

        // 5. Inside createMatchedGame: Promise.all
        // Order: P1 User(ok), P2 User(ok), P1 Settings(ok), P2 Settings(ok), P1 Queue(MISSING!), P2 Queue(ok)
        
        // P1 User Doc
        mocks.mockGet.mockResolvedValueOnce({
            exists: true,
            data: () => ({ displayName: 'P1', discriminator: '0000' })
        });
        // P2 User Doc
        mocks.mockGet.mockResolvedValueOnce({
            exists: true,
            data: () => ({ displayName: 'P2', discriminator: '1111' })
        });
        // P1 Settings
        mocks.mockGet.mockResolvedValueOnce({ exists: false });
        // P2 Settings
        mocks.mockGet.mockResolvedValueOnce({ exists: false });
        // P1 Queue Doc -> RETURNS FALSE (Simulating race condition deletion)
        mocks.mockGet.mockResolvedValueOnce({ exists: false });
        // P2 Queue Doc
        mocks.mockGet.mockResolvedValueOnce({ exists: true, data: () => ({ timeControl: {} }) });

        await tryMatchPlayers(realUserId);

        // Verify NO game was created
        expect(mocks.mockAdd).not.toHaveBeenCalled();
    });
});

