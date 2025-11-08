import { cleanup, setupStandardMocks } from './testHelpers.js';

// Setup mocks
const mocks = setupStandardMocks();

// Mock the shared game library before importing anything
jest.mock('../shared/dist/game/index.js');
jest.mock('@jbuxofplenty/coral-clash');

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
});
