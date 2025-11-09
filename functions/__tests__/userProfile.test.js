import { cleanup, setupStandardMocks } from './testHelpers.js';

// Setup mocks
const mocks = setupStandardMocks();

// Mock the shared game library before importing anything
jest.mock('../shared/dist/game/index.js');

// Create mock for admin.auth()
const mockDeleteUser = jest.fn();

// Mock firebase-admin with standard setup
// Note: Must inline the factory due to Jest hoisting restrictions
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
        deleteUser: mockDeleteUser,
    })),
}));

import * as userProfile from '../routes/userProfile.js';

describe('User Profile Functions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterAll(() => {
        cleanup();
    });

    describe('getUserProfile', () => {
        it('should return own profile successfully', async () => {
            const userId = 'test-user-123';
            const profileData = {
                displayName: 'TestUser',
                photoURL: 'https://example.com/photo.jpg',
                discriminator: '1234',
            };

            mocks.mockGet.mockResolvedValue({
                exists: true,
                data: () => profileData,
            });

            const result = await userProfile.getUserProfileHandler({
                data: { userId },
                auth: { uid: userId },
            });

            expect(result.success).toBe(true);
            expect(result.profile).toEqual(profileData);
        });

        it('should return friend profile if users are friends', async () => {
            const friendUserId = 'friend-456';

            // Mock friend check - they are friends
            mocks.mockGet
                .mockResolvedValueOnce({
                    exists: true, // Friend document exists
                })
                .mockResolvedValueOnce({
                    exists: true,
                    data: () => ({
                        displayName: 'FriendUser',
                        discriminator: '5678',
                    }),
                });

            const result = await userProfile.getUserProfileHandler({
                data: { userId: friendUserId },
                auth: { uid: 'user-123' },
            });

            expect(result.success).toBe(true);
            expect(result.profile.displayName).toBe('FriendUser');
        });

        it('should throw permission error if trying to view non-friend profile', async () => {
            const strangerUserId = 'stranger-789';

            // Mock friend check - they are NOT friends
            mocks.mockGet.mockResolvedValueOnce({
                exists: false, // Friend document doesn't exist
            });

            await expect(
                userProfile.getUserProfileHandler({
                    data: { userId: strangerUserId },
                    auth: { uid: 'user-123' },
                }),
            ).rejects.toThrow('Can only view friends profiles');
        });

        it('should throw not-found error if user does not exist', async () => {
            mocks.mockGet.mockResolvedValue({
                exists: false,
                data: () => null,
            });

            await expect(
                userProfile.getUserProfileHandler({
                    data: { userId: 'user-123' },
                    auth: { uid: 'user-123' },
                }),
            ).rejects.toThrow('User not found');
        });

        it('should throw error if user not authenticated', async () => {
            await expect(
                userProfile.getUserProfileHandler({
                    data: { userId: 'user-123' },
                    auth: null,
                }),
            ).rejects.toThrow('User must be authenticated');
        });
    });

    describe('updateUserProfile', () => {
        it('should update profile with displayName', async () => {
            const updateData = {
                displayName: 'NewDisplayName',
            };

            mocks.mockUpdate.mockResolvedValue();

            const result = await userProfile.updateUserProfileHandler({
                data: updateData,
                auth: { uid: 'test-user-123' },
            });

            expect(result.success).toBe(true);
            expect(result.message).toBe('Profile updated successfully');
            expect(mocks.mockUpdate).toHaveBeenCalledWith(
                expect.objectContaining({
                    displayName: 'NewDisplayName',
                }),
            );
        });

        it('should update profile with photoURL', async () => {
            const updateData = {
                photoURL: 'https://example.com/new-photo.jpg',
            };

            mocks.mockUpdate.mockResolvedValue();

            const result = await userProfile.updateUserProfileHandler({
                data: updateData,
                auth: { uid: 'test-user-123' },
            });

            expect(result.success).toBe(true);
            expect(mocks.mockUpdate).toHaveBeenCalledWith(
                expect.objectContaining({
                    photoURL: 'https://example.com/new-photo.jpg',
                }),
            );
        });

        it('should update profile with multiple fields', async () => {
            const updateData = {
                displayName: 'UpdatedName',
                photoURL: 'https://example.com/updated.jpg',
                preferences: { theme: 'dark' },
            };

            mocks.mockUpdate.mockResolvedValue();

            const result = await userProfile.updateUserProfileHandler({
                data: updateData,
                auth: { uid: 'test-user-123' },
            });

            expect(result.success).toBe(true);
            expect(mocks.mockUpdate).toHaveBeenCalledWith(
                expect.objectContaining({
                    displayName: 'UpdatedName',
                    photoURL: 'https://example.com/updated.jpg',
                    preferences: { theme: 'dark' },
                }),
            );
        });

        it('should include updatedAt timestamp', async () => {
            mocks.mockUpdate.mockResolvedValue();

            await userProfile.updateUserProfileHandler({
                data: { displayName: 'Test' },
                auth: { uid: 'test-user-123' },
            });

            expect(mocks.mockUpdate).toHaveBeenCalledWith(
                expect.objectContaining({
                    updatedAt: expect.anything(),
                }),
            );
        });

        it('should throw error if user not authenticated', async () => {
            await expect(
                userProfile.updateUserProfileHandler({
                    data: { displayName: 'Test' },
                    auth: null,
                }),
            ).rejects.toThrow('User must be authenticated');
        });
    });

    describe('deleteAccount', () => {
        beforeEach(() => {
            mockDeleteUser.mockClear();
        });

        it('should delete account with no games or friends', async () => {
            const userId = 'test-user-123';

            // Mock where queries that return empty results
            const mockWhere = jest.fn().mockReturnValue({
                get: jest.fn().mockResolvedValue({
                    empty: true,
                    docs: [],
                }),
            });

            // Mock collection that returns where queries
            mocks.mockCollection.mockReturnValue({
                where: mockWhere,
                doc: jest.fn(() => ({
                    get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
                    collection: jest.fn(() => ({
                        get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
                    })),
                })),
            });

            // Mock batch commit
            const mockBatchCommit = jest.fn().mockResolvedValue();
            mocks.mockBatch.mockReturnValue({
                set: jest.fn(),
                update: jest.fn(),
                delete: jest.fn(),
                commit: mockBatchCommit,
            });

            mockDeleteUser.mockResolvedValue();

            const result = await userProfile.deleteAccountHandler({
                data: {},
                auth: { uid: userId },
            });

            expect(result.success).toBe(true);
            expect(result.message).toBe('Account deleted successfully');
            expect(mockDeleteUser).toHaveBeenCalledWith(userId);
            expect(mockBatchCommit).toHaveBeenCalled();
        });

        it('should anonymize games where user is creator', async () => {
            const userId = 'test-user-123';
            const opponentId = 'opponent-456';

            // Mock game as creator
            const mockGameDoc = {
                id: 'game-1',
                ref: { update: jest.fn() },
                data: () => ({
                    creatorId: userId,
                    opponentId: opponentId,
                    status: 'completed',
                    creatorDisplayName: 'TestUser#1234',
                    opponentDisplayName: 'Opponent#5678',
                }),
            };

            // Mock where queries for games
            const mockWhere = jest.fn();
            let callCount = 0;
            mockWhere.mockImplementation(() => {
                callCount++;
                // First call: creatorId query - return game
                if (callCount === 1) {
                    return {
                        get: jest.fn().mockResolvedValue({
                            empty: false,
                            docs: [mockGameDoc],
                        }),
                    };
                }
                // Second call: opponentId query - return empty
                if (callCount === 2) {
                    return {
                        get: jest.fn().mockResolvedValue({
                            empty: true,
                            docs: [],
                        }),
                    };
                }
                // All other calls - return empty
                return {
                    get: jest.fn().mockResolvedValue({
                        empty: true,
                        docs: [],
                    }),
                };
            });

            mocks.mockCollection.mockReturnValue({
                where: mockWhere,
                doc: jest.fn(() => ({
                    get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
                    collection: jest.fn(() => ({
                        get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
                    })),
                })),
            });

            // Mock batch
            const mockBatchUpdate = jest.fn();
            const mockBatchDelete = jest.fn();
            const mockBatchCommit = jest.fn().mockResolvedValue();
            mocks.mockBatch.mockReturnValue({
                update: mockBatchUpdate,
                delete: mockBatchDelete,
                commit: mockBatchCommit,
            });

            mockDeleteUser.mockResolvedValue();

            await userProfile.deleteAccountHandler({
                data: {},
                auth: { uid: userId },
            });

            // Verify game was anonymized
            expect(mockBatchUpdate).toHaveBeenCalledWith(
                mockGameDoc.ref,
                expect.objectContaining({
                    creatorDisplayName: 'Anonymous',
                    creatorAvatarKey: 'dolphin',
                }),
            );
        });

        it('should cancel pending games', async () => {
            const userId = 'test-user-123';

            const mockPendingGame = {
                id: 'game-pending',
                ref: { update: jest.fn() },
                data: () => ({
                    creatorId: userId,
                    opponentId: 'opponent-456',
                    status: 'pending',
                    creatorDisplayName: 'TestUser#1234',
                }),
            };

            let callCount = 0;
            const mockWhere = jest.fn().mockImplementation(() => {
                callCount++;
                if (callCount === 1) {
                    return {
                        get: jest.fn().mockResolvedValue({
                            empty: false,
                            docs: [mockPendingGame],
                        }),
                    };
                }
                return {
                    get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
                };
            });

            mocks.mockCollection.mockReturnValue({
                where: mockWhere,
                doc: jest.fn(() => ({
                    get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
                    collection: jest.fn(() => ({
                        get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
                    })),
                })),
            });

            const mockBatchUpdate = jest.fn();
            const mockBatchCommit = jest.fn().mockResolvedValue();
            mocks.mockBatch.mockReturnValue({
                update: mockBatchUpdate,
                delete: jest.fn(),
                commit: mockBatchCommit,
            });

            mockDeleteUser.mockResolvedValue();

            await userProfile.deleteAccountHandler({
                data: {},
                auth: { uid: userId },
            });

            expect(mockBatchUpdate).toHaveBeenCalledWith(
                mockPendingGame.ref,
                expect.objectContaining({
                    status: 'cancelled',
                    cancelReason: 'account_deleted',
                }),
            );
        });

        it('should forfeit active games and update opponent stats', async () => {
            const userId = 'test-user-123';
            const opponentId = 'opponent-456';

            const mockActiveGame = {
                id: 'game-active',
                ref: { update: jest.fn() },
                data: () => ({
                    creatorId: userId,
                    opponentId: opponentId,
                    status: 'active',
                    creatorDisplayName: 'TestUser#1234',
                }),
            };

            const mockOpponentData = {
                stats: {
                    gamesPlayed: 5,
                    gamesWon: 3,
                    gamesLost: 1,
                    gamesDraw: 1,
                },
            };

            let whereCallCount = 0;
            const mockWhere = jest.fn().mockImplementation(() => {
                whereCallCount++;
                if (whereCallCount === 1) {
                    return {
                        get: jest.fn().mockResolvedValue({
                            empty: false,
                            docs: [mockActiveGame],
                        }),
                    };
                }
                return {
                    get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
                };
            });

            let docCallCount = 0;
            mocks.mockCollection.mockReturnValue({
                where: mockWhere,
                doc: jest.fn((id) => {
                    docCallCount++;
                    if (id === opponentId && docCallCount === 1) {
                        return {
                            get: jest.fn().mockResolvedValue({
                                exists: true,
                                data: () => mockOpponentData,
                            }),
                        };
                    }
                    return {
                        get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
                        collection: jest.fn(() => ({
                            get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
                        })),
                    };
                }),
            });

            const mockBatchUpdate = jest.fn();
            const mockBatchCommit = jest.fn().mockResolvedValue();
            mocks.mockBatch.mockReturnValue({
                update: mockBatchUpdate,
                delete: jest.fn(),
                commit: mockBatchCommit,
            });

            mockDeleteUser.mockResolvedValue();

            await userProfile.deleteAccountHandler({
                data: {},
                auth: { uid: userId },
            });

            // Verify game was forfeited
            expect(mockBatchUpdate).toHaveBeenCalledWith(
                mockActiveGame.ref,
                expect.objectContaining({
                    status: 'completed',
                    result: 'forfeit',
                    winner: opponentId,
                }),
            );

            // Verify opponent stats were updated
            expect(mockBatchUpdate).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    'stats.gamesWon': 4,
                    'stats.gamesPlayed': 6,
                }),
            );
        });

        it('should remove friends from both sides', async () => {
            const userId = 'test-user-123';
            const friendId = 'friend-456';

            const mockFriendDoc = {
                id: friendId,
                ref: { delete: jest.fn() },
            };

            // Mock games queries - empty
            let whereCallCount = 0;
            const mockWhere = jest.fn().mockImplementation(() => {
                whereCallCount++;
                if (whereCallCount <= 2) {
                    // Games queries
                    return {
                        get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
                    };
                }
                // Friend requests and notifications - empty
                return {
                    get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
                };
            });

            mocks.mockCollection.mockReturnValue({
                where: mockWhere,
                doc: jest.fn((id) => {
                    if (id === userId) {
                        return {
                            collection: jest.fn((name) => {
                                if (name === 'friends') {
                                    return {
                                        get: jest.fn().mockResolvedValue({
                                            empty: false,
                                            docs: [mockFriendDoc],
                                        }),
                                    };
                                }
                                if (name === 'settings') {
                                    return {
                                        get: jest.fn().mockResolvedValue({
                                            empty: true,
                                            docs: [],
                                        }),
                                    };
                                }
                            }),
                        };
                    }
                    if (id === friendId) {
                        return {
                            collection: jest.fn(() => ({
                                doc: jest.fn(() => ({
                                    // Friend's friend entry for this user
                                })),
                            })),
                        };
                    }
                    return {
                        get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
                        collection: jest.fn(() => ({
                            get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
                        })),
                    };
                }),
            });

            const mockBatchDelete = jest.fn();
            const mockBatchCommit = jest.fn().mockResolvedValue();
            mocks.mockBatch.mockReturnValue({
                update: jest.fn(),
                delete: mockBatchDelete,
                commit: mockBatchCommit,
            });

            mockDeleteUser.mockResolvedValue();

            await userProfile.deleteAccountHandler({
                data: {},
                auth: { uid: userId },
            });

            // Should delete friend entry from both sides
            expect(mockBatchDelete).toHaveBeenCalled();
        });

        it('should delete friend requests sent and received', async () => {
            const userId = 'test-user-123';

            const mockSentRequest = {
                id: 'request-sent',
                ref: { delete: jest.fn() },
            };

            const mockReceivedRequest = {
                id: 'request-received',
                ref: { delete: jest.fn() },
            };

            let whereCallCount = 0;
            const mockWhere = jest.fn().mockImplementation((field, _op, _value) => {
                whereCallCount++;
                // Games queries - empty
                if (whereCallCount <= 2) {
                    return {
                        get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
                    };
                }
                // Friend requests from user
                if (whereCallCount === 3 && field === 'from') {
                    return {
                        get: jest.fn().mockResolvedValue({
                            empty: false,
                            docs: [mockSentRequest],
                        }),
                    };
                }
                // Friend requests to user
                if (whereCallCount === 4 && field === 'to') {
                    return {
                        get: jest.fn().mockResolvedValue({
                            empty: false,
                            docs: [mockReceivedRequest],
                        }),
                    };
                }
                // All other queries - empty
                return {
                    get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
                };
            });

            mocks.mockCollection.mockReturnValue({
                where: mockWhere,
                doc: jest.fn(() => ({
                    get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
                    collection: jest.fn(() => ({
                        get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
                    })),
                })),
            });

            const mockBatchDelete = jest.fn();
            const mockBatchCommit = jest.fn().mockResolvedValue();
            mocks.mockBatch.mockReturnValue({
                update: jest.fn(),
                delete: mockBatchDelete,
                commit: mockBatchCommit,
            });

            mockDeleteUser.mockResolvedValue();

            await userProfile.deleteAccountHandler({
                data: {},
                auth: { uid: userId },
            });

            // Should delete both sent and received requests
            expect(mockBatchDelete).toHaveBeenCalledWith(mockSentRequest.ref);
            expect(mockBatchDelete).toHaveBeenCalledWith(mockReceivedRequest.ref);
        });

        it('should delete all notifications', async () => {
            const userId = 'test-user-123';

            const mockUserNotification = {
                id: 'notif-1',
                ref: { delete: jest.fn() },
            };

            const mockSentNotification = {
                id: 'notif-2',
                ref: { delete: jest.fn() },
            };

            let whereCallCount = 0;
            const mockWhere = jest.fn().mockImplementation((field, _op, _value) => {
                whereCallCount++;
                // Games queries - empty
                if (whereCallCount <= 2) {
                    return {
                        get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
                    };
                }
                // Friend requests - empty
                if (whereCallCount <= 4) {
                    return {
                        get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
                    };
                }
                // User's notifications
                if (whereCallCount === 5 && field === 'userId') {
                    return {
                        get: jest.fn().mockResolvedValue({
                            empty: false,
                            docs: [mockUserNotification],
                        }),
                    };
                }
                // Sent notifications
                if (whereCallCount === 6 && field === 'from') {
                    return {
                        get: jest.fn().mockResolvedValue({
                            empty: false,
                            docs: [mockSentNotification],
                        }),
                    };
                }
                return {
                    get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
                };
            });

            mocks.mockCollection.mockReturnValue({
                where: mockWhere,
                doc: jest.fn(() => ({
                    get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
                    collection: jest.fn(() => ({
                        get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
                    })),
                })),
            });

            const mockBatchDelete = jest.fn();
            const mockBatchCommit = jest.fn().mockResolvedValue();
            mocks.mockBatch.mockReturnValue({
                update: jest.fn(),
                delete: mockBatchDelete,
                commit: mockBatchCommit,
            });

            mockDeleteUser.mockResolvedValue();

            await userProfile.deleteAccountHandler({
                data: {},
                auth: { uid: userId },
            });

            expect(mockBatchDelete).toHaveBeenCalledWith(mockUserNotification.ref);
            expect(mockBatchDelete).toHaveBeenCalledWith(mockSentNotification.ref);
        });

        it('should throw error if user not authenticated', async () => {
            await expect(
                userProfile.deleteAccountHandler({
                    data: {},
                    auth: null,
                }),
            ).rejects.toThrow('User must be authenticated');
        });

        it('should handle errors during deletion', async () => {
            const userId = 'test-user-123';

            // Mock error during games query
            mocks.mockCollection.mockReturnValue({
                where: jest.fn().mockReturnValue({
                    get: jest.fn().mockRejectedValue(new Error('Database error')),
                }),
            });

            await expect(
                userProfile.deleteAccountHandler({
                    data: {},
                    auth: { uid: userId },
                }),
            ).rejects.toThrow('Failed to delete account');
        });
    });
});
