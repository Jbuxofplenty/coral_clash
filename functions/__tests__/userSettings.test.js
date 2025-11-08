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
}));

import * as userSettings from '../routes/userSettings.js';

describe('User Settings Functions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterAll(() => {
        cleanup();
    });

    describe('getUserSettings', () => {
        it('should return default settings if none exist', async () => {
            mocks.mockGet.mockResolvedValue({
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

            mocks.mockGet.mockResolvedValue({
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

            mocks.mockSet.mockResolvedValue();
            mocks.mockUpdate.mockResolvedValue();

            const result = await userSettings.updateUserSettingsHandler({
                data: { settings: newSettings },
                auth: { uid: 'test-user-123' },
            });

            expect(result.success).toBe(true);
            expect(result.message).toBe('Settings updated successfully');
            expect(mocks.mockSet).toHaveBeenCalled();
        });

        it('should update settings with avatarKey', async () => {
            const newSettings = {
                avatarKey: 'crab',
            };

            mocks.mockSet.mockResolvedValue();

            const result = await userSettings.updateUserSettingsHandler({
                data: { settings: newSettings },
                auth: { uid: 'test-user-123' },
            });

            expect(result.success).toBe(true);
            expect(mocks.mockSet).toHaveBeenCalled();
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
            mocks.mockSet.mockResolvedValue();
            mocks.mockUpdate.mockResolvedValue();

            const result = await userSettings.resetUserSettingsHandler({
                data: {},
                auth: { uid: 'test-user-123' },
            });

            expect(result.success).toBe(true);
            expect(result.message).toBe('Settings reset to defaults');
            expect(result.settings.theme).toBe('auto');
            expect(result.settings.avatarKey).toBe('dolphin');
            expect(mocks.mockSet).toHaveBeenCalled();
        });

        it('should reset avatarKey to default', async () => {
            mocks.mockSet.mockResolvedValue();

            const result = await userSettings.resetUserSettingsHandler({
                data: {},
                auth: { uid: 'test-user-123' },
            });

            expect(result.success).toBe(true);
            expect(result.settings.avatarKey).toBe('dolphin');
            expect(mocks.mockSet).toHaveBeenCalled();
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
