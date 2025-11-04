/**
 * Test square control and attack detection
 * Uses whale-check.json fixture with white whale at b4,c4 and black whale at e3,e2
 */

import whaleCheck from '../__fixtures__/whale-check.json';
import { CoralClash, applyFixture } from '../index';

describe('Square Control and Attack Detection', () => {
    test('white whale at b4,c4 cannot attack e4', () => {
        const game = new CoralClash();
        applyFixture(game, whaleCheck);

        // Verify whale positions
        const whalePos = game.whalePositions();
        expect(whalePos.w).toEqual(['b4', 'c4']); // White whale horizontal at b4,c4
        expect(whalePos.b).toEqual(['e3', 'e2']); // Black whale vertical at e3,e2

        // e4 is empty and white whale cannot reach it from b4,c4
        expect(game.isAttacked('e4', 'w')).toBe(false);
    });

    test('white whale at b4,c4 can attack adjacent squares', () => {
        const game = new CoralClash();
        applyFixture(game, whaleCheck);

        // White whale at b4,c4 should be able to attack squares on same row and diagonals
        // Adjacent on row 4
        expect(game.isAttacked('a4', 'w')).toBe(true);
        expect(game.isAttacked('d4', 'w')).toBe(true);

        // Adjacent diagonally
        expect(game.isAttacked('b5', 'w')).toBe(true);
        expect(game.isAttacked('c5', 'w')).toBe(true);

        // Further diagonal
        expect(game.isAttacked('e5', 'w')).toBe(true);

        // But NOT e4 (it's not on a valid attack line from b4,c4)
        expect(game.isAttacked('e4', 'w')).toBe(false);
    });

    test('isAttacked works correctly for empty and occupied squares', () => {
        const game = new CoralClash();
        applyFixture(game, whaleCheck);

        // e4 is empty (get returns false for empty squares)
        expect(game.get('e4')).toBe(false);
        expect(game.isAttacked('e4', 'w')).toBe(false);

        // e3 is occupied by black whale
        const e3Piece = game.get('e3');
        expect(e3Piece).toBeTruthy();
        if (e3Piece && typeof e3Piece !== 'boolean') {
            expect(e3Piece.color).toBe('b');
        }

        // White cannot attack e3 either (not on attack line from b4,c4)
        expect(game.isAttacked('e3', 'w')).toBe(false);

        // d4 is empty but CAN be attacked by white whale
        expect(game.get('d4')).toBe(false);
        expect(game.isAttacked('d4', 'w')).toBe(true);
    });
});
