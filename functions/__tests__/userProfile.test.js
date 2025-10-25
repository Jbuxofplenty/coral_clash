// Mock the shared game library before requiring anything
jest.mock('../shared/dist/game');

const test = require('firebase-functions-test')();

// Mock Firestore with support for subcollections
const mockGet = jest.fn();
const mockUpdate = jest.fn();

const createMockDocRef = () => ({
    get: mockGet,
    update: mockUpdate,
    collection: jest.fn((collectionName) => ({
        doc: createMockDocRef,
    })),
});

const mockDoc = jest.fn(createMockDocRef);
const mockCollection = jest.fn(() => ({
    doc: mockDoc,
}));

jest.mock('firebase-admin', () => ({
    initializeApp: jest.fn(),
    firestore: jest.fn(() => ({
        collection: mockCollection,
    })),
}));

const userProfile = require('../routes/userProfile');

describe('User Profile Functions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterAll(() => {
        test.cleanup();
    });

    describe('getUserProfile', () => {
        it('should return own profile successfully', async () => {
            const userId = 'test-user-123';
            const profileData = {
                displayName: 'TestUser',
                photoURL: 'https://example.com/photo.jpg',
                discriminator: '1234',
            };

            mockGet.mockResolvedValue({
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
            mockGet
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
            mockGet.mockResolvedValueOnce({
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
            mockGet.mockResolvedValue({
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

            mockUpdate.mockResolvedValue();

            const result = await userProfile.updateUserProfileHandler({
                data: updateData,
                auth: { uid: 'test-user-123' },
            });

            expect(result.success).toBe(true);
            expect(result.message).toBe('Profile updated successfully');
            expect(mockUpdate).toHaveBeenCalledWith(
                expect.objectContaining({
                    displayName: 'NewDisplayName',
                }),
            );
        });

        it('should update profile with photoURL', async () => {
            const updateData = {
                photoURL: 'https://example.com/new-photo.jpg',
            };

            mockUpdate.mockResolvedValue();

            const result = await userProfile.updateUserProfileHandler({
                data: updateData,
                auth: { uid: 'test-user-123' },
            });

            expect(result.success).toBe(true);
            expect(mockUpdate).toHaveBeenCalledWith(
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

            mockUpdate.mockResolvedValue();

            const result = await userProfile.updateUserProfileHandler({
                data: updateData,
                auth: { uid: 'test-user-123' },
            });

            expect(result.success).toBe(true);
            expect(mockUpdate).toHaveBeenCalledWith(
                expect.objectContaining({
                    displayName: 'UpdatedName',
                    photoURL: 'https://example.com/updated.jpg',
                    preferences: { theme: 'dark' },
                }),
            );
        });

        it('should include updatedAt timestamp', async () => {
            mockUpdate.mockResolvedValue();

            await userProfile.updateUserProfileHandler({
                data: { displayName: 'Test' },
                auth: { uid: 'test-user-123' },
            });

            expect(mockUpdate).toHaveBeenCalledWith(
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
