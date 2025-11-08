import { cleanup, setupStandardMocks } from './testHelpers.js';

const mocks = setupStandardMocks();

jest.mock('../shared/dist/game/index.js');
jest.mock('@jbuxofplenty/coral-clash');

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
    auth: jest.fn(() => ({
        getUserByEmail: jest.fn(),
    })),
}));

jest.mock('../utils/notifications.js', () => ({
    sendGameRequestNotification: jest.fn(() => Promise.resolve()),
    sendGameAcceptedNotification: jest.fn(() => Promise.resolve()),
    sendOpponentMoveNotification: jest.fn(() => Promise.resolve()),
}));

import * as friendsRoutes from '../routes/friends.js';

describe('Friends Functions', () => {
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

    describe('getFriends', () => {
        const userId = 'user-123';
        const friendId1 = 'friend-456';
        const friendId2 = 'friend-789';

        it('should return friends list with avatarKeys from settings subcollection', async () => {
            // Mock friends subcollection query
            mocks.mockGet.mockResolvedValueOnce({
                docs: [{ id: friendId1 }, { id: friendId2 }],
            });

            // Mock friend 1 user data
            mocks.mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({
                    displayName: 'Friend One',
                    discriminator: '1111',
                }),
            });

            // Mock friend 1 settings subcollection
            mocks.mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({
                    avatarKey: 'whale',
                }),
            });

            // Mock friend 2 user data
            mocks.mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({
                    displayName: 'Friend Two',
                    discriminator: '2222',
                }),
            });

            // Mock friend 2 settings subcollection (doesn't exist, should default to dolphin)
            mocks.mockGet.mockResolvedValueOnce({
                exists: false,
            });

            // Mock incoming requests (empty)
            mocks.mockGet.mockResolvedValueOnce({
                docs: [],
            });

            // Mock outgoing requests (empty)
            mocks.mockGet.mockResolvedValueOnce({
                docs: [],
            });

            const result = await friendsRoutes.getFriendsHandler({
                data: {},
                auth: { uid: userId },
            });

            expect(result.success).toBe(true);
            expect(result.friends).toHaveLength(2);
            expect(result.friends[0]).toEqual({
                id: friendId1,
                displayName: 'Friend One #1111',
                avatarKey: 'whale',
            });
            expect(result.friends[1]).toEqual({
                id: friendId2,
                displayName: 'Friend Two #2222',
                avatarKey: 'dolphin', // Default when settings don't exist
            });
        });

        it('should return incoming requests with avatarKeys from settings', async () => {
            const requesterId = 'requester-111';

            // Mock friends subcollection query (empty)
            mocks.mockGet.mockResolvedValueOnce({
                docs: [],
            });

            // Mock incoming requests
            mocks.mockGet.mockResolvedValueOnce({
                docs: [
                    {
                        id: 'request-1',
                        data: () => ({
                            from: requesterId,
                            to: userId,
                            status: 'pending',
                            createdAt: new Date(),
                        }),
                    },
                ],
            });

            // Mock requester user data
            mocks.mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({
                    displayName: 'Requester',
                    discriminator: '9999',
                }),
            });

            // Mock requester settings
            mocks.mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({
                    avatarKey: 'octopus',
                }),
            });

            // Mock outgoing requests (empty)
            mocks.mockGet.mockResolvedValueOnce({
                docs: [],
            });

            const result = await friendsRoutes.getFriendsHandler({
                data: {},
                auth: { uid: userId },
            });

            expect(result.success).toBe(true);
            expect(result.incomingRequests).toHaveLength(1);
            expect(result.incomingRequests[0].avatarKey).toBe('octopus');
            expect(result.incomingRequests[0].displayName).toBe('Requester #9999');
        });

        it('should return outgoing requests with avatarKeys from settings', async () => {
            const targetId = 'target-222';

            // Mock friends subcollection query (empty)
            mocks.mockGet.mockResolvedValueOnce({
                docs: [],
            });

            // Mock incoming requests (empty)
            mocks.mockGet.mockResolvedValueOnce({
                docs: [],
            });

            // Mock outgoing requests
            mocks.mockGet.mockResolvedValueOnce({
                docs: [
                    {
                        id: 'request-2',
                        data: () => ({
                            from: userId,
                            to: targetId,
                            status: 'pending',
                            createdAt: new Date(),
                        }),
                    },
                ],
            });

            // Mock target user data
            mocks.mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({
                    displayName: 'Target',
                    discriminator: '8888',
                }),
            });

            // Mock target settings
            mocks.mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({
                    avatarKey: 'turtle',
                }),
            });

            const result = await friendsRoutes.getFriendsHandler({
                data: {},
                auth: { uid: userId },
            });

            expect(result.success).toBe(true);
            expect(result.outgoingRequests).toHaveLength(1);
            expect(result.outgoingRequests[0].avatarKey).toBe('turtle');
            expect(result.outgoingRequests[0].displayName).toBe('Target #8888');
        });

        it('should throw error if user not authenticated', async () => {
            await expect(
                friendsRoutes.getFriendsHandler({
                    data: {},
                    auth: null,
                }),
            ).rejects.toThrow('User must be authenticated');
        });
    });

    describe('searchUsers', () => {
        const userId = 'user-123';
        const searchQuery = 'test';

        it('should return search results with avatarKeys from settings', async () => {
            const foundUserId = 'found-456';

            // Mock user search query
            mocks.mockGet.mockResolvedValueOnce({
                docs: [
                    {
                        id: foundUserId,
                        data: () => ({
                            displayName: 'TestUser',
                            discriminator: '5555',
                            email: 'test@example.com',
                        }),
                    },
                ],
            });

            // Mock friend check (not friends)
            mocks.mockGet.mockResolvedValueOnce({
                exists: false,
            });

            // Mock sent request check (no sent request)
            mocks.mockGet.mockResolvedValueOnce({
                empty: true,
            });

            // Mock received request check (no received request)
            mocks.mockGet.mockResolvedValueOnce({
                empty: true,
            });

            // Mock found user settings
            mocks.mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({
                    avatarKey: 'crab',
                }),
            });

            const result = await friendsRoutes.searchUsersHandler({
                data: { query: searchQuery },
                auth: { uid: userId },
            });

            expect(result.success).toBe(true);
            expect(result.users).toHaveLength(1);
            expect(result.users[0].avatarKey).toBe('crab');
            expect(result.users[0].displayName).toBe('TestUser #5555');
        });

        it('should use default dolphin avatar when settings do not exist', async () => {
            const foundUserId = 'found-789';

            // Mock user search query
            mocks.mockGet.mockResolvedValueOnce({
                docs: [
                    {
                        id: foundUserId,
                        data: () => ({
                            displayName: 'TestNoSettings',
                            discriminator: '6666',
                            email: 'testnosettings@example.com',
                        }),
                    },
                ],
            });

            // Mock friend check (not friends)
            mocks.mockGet.mockResolvedValueOnce({
                exists: false,
            });

            // Mock sent request check
            mocks.mockGet.mockResolvedValueOnce({
                empty: true,
            });

            // Mock received request check
            mocks.mockGet.mockResolvedValueOnce({
                empty: true,
            });

            // Mock settings don't exist
            mocks.mockGet.mockResolvedValueOnce({
                exists: false,
            });

            const result = await friendsRoutes.searchUsersHandler({
                data: { query: searchQuery },
                auth: { uid: userId },
            });

            expect(result.success).toBe(true);
            expect(result.users).toHaveLength(1);
            expect(result.users[0].avatarKey).toBe('dolphin'); // Default
        });

        it('should throw error if query is too short', async () => {
            await expect(
                friendsRoutes.searchUsersHandler({
                    data: { query: 'a' },
                    auth: { uid: userId },
                }),
            ).rejects.toThrow('Search query must be at least 2 characters');
        });

        it('should throw error if user not authenticated', async () => {
            await expect(
                friendsRoutes.searchUsersHandler({
                    data: { query: searchQuery },
                    auth: null,
                }),
            ).rejects.toThrow('User must be authenticated');
        });
    });
});
