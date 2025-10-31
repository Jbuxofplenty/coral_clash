/**
 * Tests for whale movement when whale is already on coral
 *
 * Rule: "Whales that are already on Coral with half of the piece are not stopped
 * when the other half of the piece moves onto the same Coral."
 *
 * This means:
 * 1. When generating moves, a whale on coral should not be blocked by that coral
 * 2. When checking attacks, a whale on coral can attack through that coral
 */

import whaleDoubleJeopardy2 from '../__fixtures__/whale-double-jeopardy-2.json';
import whaleDoubleJeopardy from '../__fixtures__/whale-double-jeopardy.json';
import { CoralClash, applyFixture } from '../index';

describe('Whale Movement on Coral', () => {
    test('whale on coral can move through its own coral - simple case', () => {
        // Simple case: white whale at e5,f5 with coral at f5, black whale at e8,f8
        const game = new CoralClash();
        game.load('4h3/8/8/4H3/8/8/8/8 w - - 0 1');

        // Manually place coral at f5 (where white whale's second square is)
        game.placeCoral('f5', 'w');

        // White whale should be able to move diagonally even though there's coral at f5
        const moves = game.moves({ verbose: true, piece: 'h', color: 'w' });

        // Look for diagonal moves (e5,f5 -> d4,e4 or f6,g6 etc)
        const diagonalMoves = moves.filter((m: any) => {
            // Check if this is a diagonal parallel slide
            const fromRank = parseInt(m.from[1]);
            const fromFile = m.from.charCodeAt(0);
            const toRank = parseInt(m.to[1]);
            const toFile = m.to.charCodeAt(0);
            const rankDiff = Math.abs(toRank - fromRank);
            const fileDiff = Math.abs(toFile - fromFile);
            return rankDiff === fileDiff && rankDiff > 0; // diagonal
        });

        expect(diagonalMoves.length).toBeGreaterThan(0);
    });

    test('whale-double-jeopardy fixture - diagonal moves blocked by white turtle', () => {
        const game = new CoralClash();
        applyFixture(game, whaleDoubleJeopardy);

        // Verify game state
        expect(game.turn()).toBe('b');
        const whalePos = game.whalePositions();
        expect(whalePos.b).toEqual(['e7', 'f7']);

        // Verify coral at f7 (one of the whale's squares)
        expect(game.getCoral('f7')).toBe('b');

        // Get all black whale moves
        const whaleMoves = game.moves({ verbose: true, piece: 'h', color: 'b' });

        // Currently there are 12 whale moves total
        expect(whaleMoves.length).toBe(12);

        // ========================================
        // LEARNING: Diagonal moves f6,g6 and g5,h5 are NOT in the legal moves
        // because they would leave the black whale in check by the white turtle at g1.
        // ========================================
        // The white turtle at g1 can attack g6 and g5 vertically, making these moves illegal:

        // Verify white turtle at g1 exists
        const turtleAtG1 = game.get('g1');
        expect(turtleAtG1).toBeTruthy();
        if (turtleAtG1) {
            expect(turtleAtG1.type).toBe('t');
            expect(turtleAtG1.color).toBe('w');
        }

        // These diagonal moves WOULD be generated, but are filtered out as illegal:
        const moveToF6G6 = whaleMoves.find(
            (m: any) =>
                (m.from === 'e7' && m.to === 'f6' && m.whaleSecondSquare === 'g6') ||
                (m.from === 'f7' && m.to === 'g6' && m.whaleSecondSquare === 'f6'),
        );

        const moveToG5H5 = whaleMoves.find(
            (m: any) =>
                (m.from === 'e7' && m.to === 'g5' && m.whaleSecondSquare === 'h5') ||
                (m.from === 'f7' && m.to === 'h5' && m.whaleSecondSquare === 'g5'),
        );

        // These moves should NOT exist because they leave the whale in check
        expect(moveToF6G6).toBeUndefined();
        expect(moveToG5H5).toBeUndefined();
    });

    test('FIXED: whale can parallel slide across entire row with coral at starting position', () => {
        // Load the whale-double-jeopardy-2 fixture
        // This has: white whale at c2,d2 with coral at d2, black whale at c7,d7
        const game = new CoralClash();
        applyFixture(game, whaleDoubleJeopardy2);

        // Verify setup
        expect(game.turn()).toBe('w');
        const whalePos = game.whalePositions();
        expect(whalePos.w).toEqual(['c2', 'd2']);
        expect(game.getCoral('d2')).toBe('w');

        // Get all white whale moves
        const whaleMoves = game.moves({ verbose: true, piece: 'h', color: 'w' });

        // FIXED: Whale should be able to parallel slide to ALL positions along row 2
        // The whale is NOT blocked by coral at d2 since that's where it currently sits

        // Test parallel slide right to e2,f2 (dist=2)
        const slideToE2F2 = whaleMoves.find(
            (m: any) =>
                (m.from === 'c2' && m.to === 'e2' && m.whaleSecondSquare === 'f2') ||
                (m.from === 'd2' && m.to === 'f2' && m.whaleSecondSquare === 'e2'),
        );
        expect(slideToE2F2).toBeDefined();

        // Test parallel slide right to f2,g2 (dist=3)
        const slideToF2G2 = whaleMoves.find(
            (m: any) =>
                (m.from === 'c2' && m.to === 'f2' && m.whaleSecondSquare === 'g2') ||
                (m.from === 'd2' && m.to === 'g2' && m.whaleSecondSquare === 'f2'),
        );
        expect(slideToF2G2).toBeDefined();

        // Test parallel slide right to g2,h2 (dist=4)
        const slideToG2H2 = whaleMoves.find(
            (m: any) =>
                (m.from === 'c2' && m.to === 'g2' && m.whaleSecondSquare === 'h2') ||
                (m.from === 'd2' && m.to === 'h2' && m.whaleSecondSquare === 'g2'),
        );
        expect(slideToG2H2).toBeDefined();

        // Test parallel slide left to a2,b2 (dist=2)
        const slideToA2B2 = whaleMoves.find(
            (m: any) =>
                (m.from === 'c2' && m.to === 'a2' && m.whaleSecondSquare === 'b2') ||
                (m.from === 'd2' && m.to === 'b2' && m.whaleSecondSquare === 'a2'),
        );
        expect(slideToA2B2).toBeDefined();
    });
});
