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

jest.mock('../utils/notifications.js', () => ({
    sendGameRequestNotification: jest.fn(() => Promise.resolve()),
    sendGameAcceptedNotification: jest.fn(() => Promise.resolve()),
    sendOpponentMoveNotification: jest.fn(() => Promise.resolve()),
}));

jest.mock('@google-cloud/tasks');

import * as gameRoutes from '../routes/game.js';

describe('Game Creation Functions', () => {
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

    describe('createGame', () => {
        const creatorId = 'creator-user-123';
        const opponentId = 'opponent-user-456';

        it('should create a new PvP game successfully', async () => {
            // Call handler directly (v2 compatible)

            // Mock opponent exists
            mocks.mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({
                    displayName: 'Opponent',
                    discriminator: '1234',
                }),
            });

            // Mock no existing pending games (both queries return empty)
            mocks.mockGet
                .mockResolvedValueOnce({ empty: true }) // Query 1: creator->opponent
                .mockResolvedValueOnce({ empty: true }); // Query 2: opponent->creator

            // Mock creator data
            mocks.mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({
                    displayName: 'Creator',
                    discriminator: '5678',
                }),
            });

            // Mock creator settings (subcollection)
            mocks.mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({
                    avatarKey: 'dolphin',
                }),
            });

            // Mock opponent settings (subcollection)
            mocks.mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({
                    avatarKey: 'whale',
                }),
            });

            mocks.mockAdd.mockResolvedValue({ id: 'new-game-id-123' });

            const result = await gameRoutes.createGameHandler({
                data: {
                    opponentId,
                    timeControl: { type: 'unlimited' },
                },
                auth: { uid: creatorId },
            });

            expect(result.success).toBe(true);
            expect(result.gameId).toBe('new-game-id-123');
            expect(mocks.mockAdd).toHaveBeenCalledTimes(2); // Game + notification
        });

        it('should prevent duplicate game creation when pending request exists (creator->opponent)', async () => {
            // Call handler directly (v2 compatible)

            // Mock opponent exists
            mocks.mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({
                    displayName: 'Opponent',
                    discriminator: '1234',
                }),
            });

            // Mock existing pending game (creator->opponent direction)
            mocks.mockGet
                .mockResolvedValueOnce({
                    empty: false, // Query 1: Found pending game
                    docs: [{ id: 'existing-game-id' }],
                })
                .mockResolvedValueOnce({ empty: true }); // Query 2: opponent->creator

            await expect(
                gameRoutes.createGameHandler({
                    data: {
                        opponentId,
                        timeControl: { type: 'unlimited' },
                    },
                    auth: { uid: creatorId },
                }),
            ).rejects.toThrow('A pending game request already exists between these players');

            expect(mocks.mockAdd).not.toHaveBeenCalled();
        });

        it('should prevent duplicate game creation when pending request exists (opponent->creator)', async () => {
            // Call handler directly (v2 compatible)

            // Mock opponent exists
            mocks.mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({
                    displayName: 'Opponent',
                    discriminator: '1234',
                }),
            });

            // Mock existing pending game (opponent->creator direction)
            mocks.mockGet
                .mockResolvedValueOnce({ empty: true }) // Query 1: creator->opponent
                .mockResolvedValueOnce({
                    empty: false, // Query 2: Found pending game in reverse direction
                    docs: [{ id: 'existing-game-id' }],
                });

            await expect(
                gameRoutes.createGameHandler({
                    data: {
                        opponentId,
                        timeControl: { type: 'unlimited' },
                    },
                    auth: { uid: creatorId },
                }),
            ).rejects.toThrow('A pending game request already exists between these players');

            expect(mocks.mockAdd).not.toHaveBeenCalled();
        });

        it('should throw error if opponent does not exist', async () => {
            // Call handler directly (v2 compatible)

            // Mock opponent doesn't exist
            mocks.mockGet.mockResolvedValueOnce({
                exists: false,
            });

            await expect(
                gameRoutes.createGameHandler({
                    data: {
                        opponentId: 'non-existent-user',
                        timeControl: { type: 'unlimited' },
                    },
                    auth: { uid: creatorId },
                }),
            ).rejects.toThrow('Opponent not found');

            expect(mocks.mockAdd).not.toHaveBeenCalled();
        });

        it('should throw error if user is not authenticated', async () => {
            await expect(
                gameRoutes.createGameHandler({
                    data: {
                        opponentId,
                        timeControl: { type: 'unlimited' },
                    },
                    auth: null,
                }),
            ).rejects.toThrow('User must be authenticated');

            expect(mocks.mockAdd).not.toHaveBeenCalled();
        });

        it('should allow new game creation if previous game between players is active (not pending)', async () => {
            // Call handler directly (v2 compatible)

            // Mock opponent exists
            mocks.mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({
                    displayName: 'Opponent',
                    discriminator: '1234',
                }),
            });

            // Mock no PENDING games (even though there may be active/completed games)
            mocks.mockGet
                .mockResolvedValueOnce({ empty: true }) // Query 1: No pending creator->opponent
                .mockResolvedValueOnce({ empty: true }); // Query 2: No pending opponent->creator

            // Mock creator data
            mocks.mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({
                    displayName: 'Creator',
                    discriminator: '5678',
                }),
            });

            // Mock creator settings (subcollection)
            mocks.mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({
                    avatarKey: 'dolphin',
                }),
            });

            // Mock opponent settings (subcollection)
            mocks.mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({
                    avatarKey: 'whale',
                }),
            });

            mocks.mockAdd.mockResolvedValue({ id: 'new-game-id-789' });

            const result = await gameRoutes.createGameHandler({
                data: {
                    opponentId,
                    timeControl: { type: 'unlimited' },
                },
                auth: { uid: creatorId },
            });

            expect(result.success).toBe(true);
            expect(result.gameId).toBe('new-game-id-789');
            expect(mocks.mockAdd).toHaveBeenCalledTimes(2); // Game + notification
        });
    });

    describe('determineCurrentTurn', () => {
        const { determineCurrentTurn } = gameRoutes;

        describe('Computer games', () => {
            it('should return creatorId when turn is white', () => {
                const gameData = {
                    creatorId: 'user-123',
                    opponentId: 'computer',
                };

                const result = determineCurrentTurn(gameData, 'w');

                expect(result).toBe('user-123');
            });

            it('should return "computer" when turn is black', () => {
                const gameData = {
                    creatorId: 'user-123',
                    opponentId: 'computer',
                };

                const result = determineCurrentTurn(gameData, 'b');

                expect(result).toBe('computer');
            });
        });

        describe('PvP games', () => {
            it('should return whitePlayerId when turn is white', () => {
                const gameData = {
                    creatorId: 'user-123',
                    opponentId: 'user-456',
                    whitePlayerId: 'user-456',
                    blackPlayerId: 'user-123',
                };

                const result = determineCurrentTurn(gameData, 'w');

                expect(result).toBe('user-456');
            });

            it('should return blackPlayerId when turn is black', () => {
                const gameData = {
                    creatorId: 'user-123',
                    opponentId: 'user-456',
                    whitePlayerId: 'user-456',
                    blackPlayerId: 'user-123',
                };

                const result = determineCurrentTurn(gameData, 'b');

                expect(result).toBe('user-123');
            });
        });

        describe('Fallback (missing player IDs)', () => {
            it('should return creatorId when turn is white and player IDs are missing', () => {
                const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

                const gameData = {
                    creatorId: 'user-123',
                    opponentId: 'user-456',
                };

                const result = determineCurrentTurn(gameData, 'w');

                expect(result).toBe('user-123');
                expect(consoleWarnSpy).toHaveBeenCalledWith(
                    'Unable to determine currentTurn, missing player ID fields',
                );

                consoleWarnSpy.mockRestore();
            });

            it('should return opponentId when turn is black and player IDs are missing', () => {
                const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

                const gameData = {
                    creatorId: 'user-123',
                    opponentId: 'user-456',
                };

                const result = determineCurrentTurn(gameData, 'b');

                expect(result).toBe('user-456');
                expect(consoleWarnSpy).toHaveBeenCalledWith(
                    'Unable to determine currentTurn, missing player ID fields',
                );

                consoleWarnSpy.mockRestore();
            });
        });
    });
});
