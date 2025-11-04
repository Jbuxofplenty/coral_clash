/**
 * Test square control and attack detection
 * Uses whale-check.json fixture with white whale at b4,c4 and black whale at e3,e2
 */

import whaleCheck from '../__fixtures__/whale-check.json';
import { CoralClash, applyFixture } from '../index';

describe('Square Control and Attack Detection', () => {
    test('white whale at b4,c4 can attack e4 (but cannot move there safely)', () => {
        const game = new CoralClash();
        applyFixture(game, whaleCheck);

        // Verify whale positions
        const whalePos = game.whalePositions();
        expect(whalePos.w).toEqual(['b4', 'c4']); // White whale horizontal at b4,c4
        expect(whalePos.b).toEqual(['e3', 'e2']); // Black whale vertical at e3,e2

        // White whale CAN physically attack e4 (via parallel slide b4,c4 -> d4,e4)
        // Note: This doesn't mean white can SAFELY move there (would be in check)
        expect(game.isAttacked('e4', 'w')).toBe(true);

        // Verify that the move d4,e4 is NOT in the legal moves (would leave white in check)
        const legalMoves = game.moves({ verbose: true, color: 'w', piece: 'h' });
        const movesToE4 = legalMoves.filter(
            (m: any) =>
                (m.to === 'e4' && m.whaleSecondSquare === 'd4') ||
                (m.to === 'd4' && m.whaleSecondSquare === 'e4'),
        );
        expect(movesToE4.length).toBe(0); // Move is illegal (would be in check)
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

        // Further diagonal - white can attack e5
        expect(game.isAttacked('e5', 'w')).toBe(true);

        // White CAN attack e4 via parallel slide (b4,c4 -> d4,e4)
        expect(game.isAttacked('e4', 'w')).toBe(true);

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
        // White whale CAN attack e4 (even though it's empty)
        expect(game.isAttacked('e4', 'w')).toBe(true);

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
