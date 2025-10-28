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
    limit: mockLimit,
    get: mockGet,
});

const mockCollection = jest.fn((collectionName) => createMockCollectionRef());

jest.mock('firebase-admin', () => ({
    initializeApp: jest.fn(),
    firestore: jest.fn(() => ({
        collection: mockCollection,
        FieldValue: {
            serverTimestamp: mockServerTimestamp,
        },
    })),
    auth: jest.fn(() => ({
        getUserByEmail: jest.fn(),
    })),
}));

// Mock the notifications utility
jest.mock('../utils/notifications', () => ({
    sendFriendRequestNotification: jest.fn().mockResolvedValue(undefined),
    sendFriendAcceptedNotification: jest.fn().mockResolvedValue(undefined),
}));

const friendsRoutes = require('../routes/friends');

describe('Friends Functions', () => {
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

    describe('getFriends', () => {
        const userId = 'user-123';
        const friendId1 = 'friend-456';
        const friendId2 = 'friend-789';

        it('should return friends list with avatarKeys from settings subcollection', async () => {
            // Mock friends subcollection query
            mockGet.mockResolvedValueOnce({
                docs: [{ id: friendId1 }, { id: friendId2 }],
            });

            // Mock friend 1 user data
            mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({
                    displayName: 'Friend One',
                    discriminator: '1111',
                }),
            });

            // Mock friend 1 settings subcollection
            mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({
                    avatarKey: 'whale',
                }),
            });

            // Mock friend 2 user data
            mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({
                    displayName: 'Friend Two',
                    discriminator: '2222',
                }),
            });

            // Mock friend 2 settings subcollection (doesn't exist, should default to dolphin)
            mockGet.mockResolvedValueOnce({
                exists: false,
            });

            // Mock incoming requests (empty)
            mockGet.mockResolvedValueOnce({
                docs: [],
            });

            // Mock outgoing requests (empty)
            mockGet.mockResolvedValueOnce({
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
            mockGet.mockResolvedValueOnce({
                docs: [],
            });

            // Mock incoming requests
            mockGet.mockResolvedValueOnce({
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
            mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({
                    displayName: 'Requester',
                    discriminator: '9999',
                }),
            });

            // Mock requester settings
            mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({
                    avatarKey: 'octopus',
                }),
            });

            // Mock outgoing requests (empty)
            mockGet.mockResolvedValueOnce({
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
            mockGet.mockResolvedValueOnce({
                docs: [],
            });

            // Mock incoming requests (empty)
            mockGet.mockResolvedValueOnce({
                docs: [],
            });

            // Mock outgoing requests
            mockGet.mockResolvedValueOnce({
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
            mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({
                    displayName: 'Target',
                    discriminator: '8888',
                }),
            });

            // Mock target settings
            mockGet.mockResolvedValueOnce({
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
            mockGet.mockResolvedValueOnce({
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
            mockGet.mockResolvedValueOnce({
                exists: false,
            });

            // Mock sent request check (no sent request)
            mockGet.mockResolvedValueOnce({
                empty: true,
            });

            // Mock received request check (no received request)
            mockGet.mockResolvedValueOnce({
                empty: true,
            });

            // Mock found user settings
            mockGet.mockResolvedValueOnce({
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
            mockGet.mockResolvedValueOnce({
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
            mockGet.mockResolvedValueOnce({
                exists: false,
            });

            // Mock sent request check
            mockGet.mockResolvedValueOnce({
                empty: true,
            });

            // Mock received request check
            mockGet.mockResolvedValueOnce({
                empty: true,
            });

            // Mock settings don't exist
            mockGet.mockResolvedValueOnce({
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
