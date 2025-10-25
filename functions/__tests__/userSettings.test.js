// Mock the shared game library before requiring anything
jest.mock('../../shared/game');

const test = require('firebase-functions-test')();

// Mock Firestore with support for subcollections
const mockGet = jest.fn();
const mockSet = jest.fn();
const mockUpdate = jest.fn();

const createMockDocRef = () => ({
    get: mockGet,
    set: mockSet,
    update: mockUpdate,
    collection: jest.fn((collectionName) => ({
        doc: createMockDocRef,
    })),
});

const mockDoc = jest.fn(createMockDocRef);
const mockCollection = jest.fn(() => ({
    doc: mockDoc,
}));

// Mock admin before requiring routes
jest.mock('firebase-admin', () => {
    return {
        initializeApp: jest.fn(),
        firestore: jest.fn(() => ({
            collection: mockCollection,
        })),
    };
});

// Now require the module
const userSettings = require('../routes/userSettings');

describe('User Settings Functions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterAll(() => {
        test.cleanup();
    });

    describe('getUserSettings', () => {
        it('should return default settings if none exist', async () => {
            mockGet.mockResolvedValue({
                exists: false,
            });

            const result = await userSettings.getUserSettingsHandler({
                data: {},
                auth: { uid: 'test-user-123' },
            });

            expect(result.success).toBe(true);
            expect(result.settings.theme).toBe('auto');
            expect(result.settings.avatarKey).toBe('dolphin');
        });

        it('should return existing settings', async () => {
            const existingSettings = {
                theme: 'dark',
                avatarKey: 'whale',
                updatedAt: '2024-01-01T00:00:00.000Z',
            };

            mockGet.mockResolvedValue({
                exists: true,
                data: () => existingSettings,
            });

            const result = await userSettings.getUserSettingsHandler({
                data: {},
                auth: { uid: 'test-user-123' },
            });

            expect(result.success).toBe(true);
            expect(result.settings).toEqual(existingSettings);
        });

        it('should throw error if user not authenticated', async () => {
            await expect(
                userSettings.getUserSettingsHandler({
                    data: {},
                    auth: null,
                }),
            ).rejects.toThrow('User must be authenticated');
        });
    });

    describe('updateUserSettings', () => {
        it('should update settings successfully', async () => {
            const newSettings = {
                theme: 'light',
                avatarKey: 'octopus',
            };

            mockSet.mockResolvedValue();
            mockUpdate.mockResolvedValue();

            const result = await userSettings.updateUserSettingsHandler({
                data: { settings: newSettings },
                auth: { uid: 'test-user-123' },
            });

            expect(result.success).toBe(true);
            expect(result.message).toBe('Settings updated successfully');
            expect(mockSet).toHaveBeenCalled();
        });

        it('should update settings with avatarKey', async () => {
            const newSettings = {
                avatarKey: 'crab',
            };

            mockSet.mockResolvedValue();

            const result = await userSettings.updateUserSettingsHandler({
                data: { settings: newSettings },
                auth: { uid: 'test-user-123' },
            });

            expect(result.success).toBe(true);
            expect(mockSet).toHaveBeenCalled();
        });

        it('should throw error if settings data is missing', async () => {
            await expect(
                userSettings.updateUserSettingsHandler({
                    data: {},
                    auth: { uid: 'test-user-123' },
                }),
            ).rejects.toThrow('Settings data is required');
        });

        it('should throw error if user not authenticated', async () => {
            await expect(
                userSettings.updateUserSettingsHandler({
                    data: { settings: { theme: 'dark' } },
                    auth: null,
                }),
            ).rejects.toThrow('User must be authenticated');
        });
    });

    describe('resetUserSettings', () => {
        it('should reset settings to defaults', async () => {
            mockSet.mockResolvedValue();
            mockUpdate.mockResolvedValue();

            const result = await userSettings.resetUserSettingsHandler({
                data: {},
                auth: { uid: 'test-user-123' },
            });

            expect(result.success).toBe(true);
            expect(result.message).toBe('Settings reset to defaults');
            expect(result.settings.theme).toBe('auto');
            expect(result.settings.avatarKey).toBe('dolphin');
            expect(mockSet).toHaveBeenCalled();
        });

        it('should reset avatarKey to default', async () => {
            mockSet.mockResolvedValue();

            const result = await userSettings.resetUserSettingsHandler({
                data: {},
                auth: { uid: 'test-user-123' },
            });

            expect(result.success).toBe(true);
            expect(result.settings.avatarKey).toBe('dolphin');
            expect(mockSet).toHaveBeenCalled();
        });

        it('should throw error if user not authenticated', async () => {
            await expect(
                userSettings.resetUserSettingsHandler({
                    data: {},
                    auth: null,
                }),
            ).rejects.toThrow('User must be authenticated');
        });
    });
});
