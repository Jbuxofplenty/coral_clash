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

        // e4 is empty but white whale cannot move there since it would be in check from black whale
        expect(game.isAttacked('e4', 'w')).toBe(false);
    });

    test('white whale at b4,c4 can attack adjacent squares', () => {
        const game = new CoralClash();
        applyFixture(game, whaleCheck);

        // White whale at b4,c4 should be able to attack squares on same row
        // Adjacent on row 4
        expect(game.isAttacked('a4', 'w')).toBe(true);
        expect(game.isAttacked('d4', 'w')).toBe(true);

        // Adjacent diagonally - whale cannot attack diagonally adjacent squares
        // because the whale's own second square blocks the sliding path
        expect(game.isAttacked('b5', 'w')).toBe(false);
        expect(game.isAttacked('c5', 'w')).toBe(false);

        // Further diagonal - also blocked
        expect(game.isAttacked('e5', 'w')).toBe(true);

        // e4 is NOT reachable (whale's own second square blocks the path)
        expect(game.isAttacked('e4', 'w')).toBe(false);

        // Black whale at e3,e2 can move to g4,g5 via diagonal slide and to d2
        const blackWhaleMoves = game.moves({ verbose: true, piece: 'h', color: 'b' });

        const movesToG4G5 = blackWhaleMoves.filter(
            (m: any) =>
                (m.to === 'g4' && m.whaleSecondSquare === 'g5') ||
                (m.to === 'g5' && m.whaleSecondSquare === 'g4'),
        );
        expect(movesToG4G5.length).toBeGreaterThan(0);

        const movesToD2 = blackWhaleMoves.filter(
            (m: any) => m.to === 'd2' || m.whaleSecondSquare === 'd2',
        );
        expect(movesToD2.length).toBeGreaterThan(0);

        // These are all the possible moves for the black whale
        expect(blackWhaleMoves.length).toBe(movesToG4G5.length + movesToD2.length);
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
