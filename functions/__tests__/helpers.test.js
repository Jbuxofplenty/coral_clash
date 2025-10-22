const {
    initializeGameState,
    getDefaultSettings,
    serverTimestamp,
    increment,
} = require('../utils/helpers');

describe('Helpers', () => {
    describe('initializeGameState', () => {
        it('should return a valid game state object', () => {
            const gameState = initializeGameState();

            expect(gameState).toBeDefined();
            expect(gameState.fen).toBeDefined();
            expect(gameState.turn).toBe('w'); // White starts
            expect(gameState.coralRemaining).toEqual({ w: 15, b: 14 });
            // Snapshot doesn't include moveHistory (it's in FEN)
        });

        it('should create a game state that matches DEFAULT_POSITION', () => {
            const gameState = initializeGameState();
            const { CoralClash, DEFAULT_POSITION } = require('../../shared/dist/game');
            const game = new CoralClash(DEFAULT_POSITION);

            expect(gameState.fen).toBe(game.fen());
        });
    });

    describe('getDefaultSettings', () => {
        it('should return default settings object', () => {
            const settings = getDefaultSettings();

            expect(settings).toEqual({
                theme: 'auto',
                avatarKey: 'dolphin',
            });
        });

        it('should have valid theme value', () => {
            const settings = getDefaultSettings();

            expect(['light', 'dark', 'auto']).toContain(settings.theme);
        });

        it('should have valid avatarKey', () => {
            const settings = getDefaultSettings();
            const validAvatars = ['dolphin', 'octopus', 'whale', 'turtle', 'crab', 'puffer'];

            expect(validAvatars).toContain(settings.avatarKey);
        });
    });

    describe('serverTimestamp', () => {
        it('should return a FieldValue object', () => {
            const timestamp = serverTimestamp();

            expect(timestamp).toBeDefined();
            // Check that it's a FieldValue type (constructor name varies by implementation)
            expect(timestamp.constructor.name).toContain('Transform');
        });
    });

    describe('increment', () => {
        it('should return a FieldValue increment object', () => {
            const inc = increment(5);

            expect(inc).toBeDefined();
            // Check that it's a FieldValue type (constructor name varies by implementation)
            expect(inc.constructor.name).toContain('Transform');
        });

        it('should work with negative values', () => {
            const dec = increment(-3);

            expect(dec).toBeDefined();
            // Check that it's a FieldValue type (constructor name varies by implementation)
            expect(dec.constructor.name).toContain('Transform');
        });
    });
});
