/**
 * Regression test for whale capture validation bug
 *
 * Bug: When a whale move triggers validation (checking if opponent whale can capture),
 * the _undoMove method was incorrectly restoring the captured whale to captureSquare
 * instead of to the whale's first square. This caused whale pieces to accumulate at
 * incorrect board positions, corrupting game state.
 *
 * Scenario: Black whale at f6,g6 moving to g6,h6 caused white whale at d3,e3 to lose
 * its piece at d3, leaving it only at e3.
 */

import whaleAttack from '../__fixtures__/whale-attack.json';
import { CoralClash, applyFixture } from '../index';

describe('Whale Capture Validation Bug (Regression)', () => {
    test('whale move validation should not corrupt opponent whale position', () => {
        const game = new CoralClash();
        applyFixture(game, whaleAttack);

        // Verify initial state
        expect(game.turn()).toBe('b');
        expect(game.whalePositions().w).toEqual(['d3', 'e3']);
        expect(game.whalePositions().b).toEqual(['f6', 'g6']);

        // Verify the move to g6,h6 is legal
        const blackWhaleMoves = game.moves({ verbose: true, piece: 'h' });
        const moveToH6 = blackWhaleMoves.find(
            (m: any) =>
                (m.to === 'g6' && m.whaleSecondSquare === 'h6') ||
                (m.to === 'h6' && m.whaleSecondSquare === 'g6'),
        );
        expect(moveToH6).toBeDefined();

        // Make the move - this triggers validation that tests if white whale can be captured
        const result = game.move({ from: 'f6', to: 'g6', whaleSecondSquare: 'h6' });
        expect(result).not.toBeNull();

        // CRITICAL: White whale should NOT have moved or been corrupted
        expect(game.whalePositions().w).toEqual(['d3', 'e3']);

        // Black whale should be at new position
        expect(game.whalePositions().b).toEqual(['g6', 'h6']);

        // Turn should have switched
        expect(game.turn()).toBe('w');

        // Verify board state is consistent (no duplicate whale pieces)
        const board = game.board();
        const allWhales = board.flat().filter((sq) => sq && sq.type === 'h');
        expect(allWhales.length).toBe(4); // 2 squares for white whale + 2 for black whale
    });

    test('_undoMove should restore captured whale to first square only', () => {
        const game = new CoralClash();
        applyFixture(game, whaleAttack);

        // Make the black whale move and verify no whale piece accumulation
        const result = game.move({ from: 'f6', to: 'g6', whaleSecondSquare: 'h6' });
        expect(result).not.toBeNull();
        expect(game.whalePositions().w).toEqual(['d3', 'e3']);
        expect(game.whalePositions().b).toEqual(['g6', 'h6']);

        // Verify no whale piece duplication on board after move
        const board = game.board();
        const allWhales = board.flat().filter((sq) => sq && sq.type === 'h');
        expect(allWhales.length).toBe(4); // Always exactly 4 whale squares (2 per whale)

        // Count how many times each whale square appears (should be exactly once each)
        const whaleSquares = allWhales.map((sq) => sq!.square).sort();
        const uniqueSquares = [...new Set(whaleSquares)];
        expect(whaleSquares.length).toBe(uniqueSquares.length); // No duplicate squares
    });
});
