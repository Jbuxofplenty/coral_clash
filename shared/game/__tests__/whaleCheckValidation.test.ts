/**
 * Tests for whale check validation bug
 *
 * This test suite covers a bug where a whale can move into a position
 * that would put it in check from the opponent's whale.
 *
 * The issue: When a whale moves, it should not be able to move to a position
 * where it would be in check from the opponent's whale.
 */

import whaleCheck2 from '../__fixtures__/whale-check-2.json';
import whaleCheck4 from '../__fixtures__/whale-check-4.json';
import whaleCheck5 from '../__fixtures__/whale-check-5.json';
import whaleCheck from '../__fixtures__/whale-check.json';
import { CoralClash, applyFixture } from '../index';

describe('Whale Check Validation Bug', () => {
    test('whale-check.json: understand the board state', () => {
        const game = new CoralClash();
        applyFixture(game, whaleCheck);

        console.log('\n=== Initial Board State ===');
        console.log('White whale:', game.whalePositions().w);
        console.log('Black whale:', game.whalePositions().b);
        console.log('Turn:', game.turn());

        // Check coral positions relevant to the whales
        console.log('\n=== Coral at whale positions ===');
        console.log('Coral at b4:', game.getCoral('b4'));
        console.log('Coral at c4:', game.getCoral('c4'));
        console.log('Coral at e2:', game.getCoral('e2'));
        console.log('Coral at e3:', game.getCoral('e3'));
        console.log('Coral at e4:', game.getCoral('e4'));
        console.log('Coral at d3:', game.getCoral('d3'));
        console.log('Coral at d4:', game.getCoral('d4'));

        // Check what white whale can attack from its current position
        console.log('\n=== What can white whale (at b4,c4) attack? ===');
        const adjacentToC4 = ['c3', 'c5', 'd4', 'b4', 'd3', 'd5', 'b3', 'b5'];

        adjacentToC4.forEach((sq) => {
            console.log(`Can white attack ${sq}? ${game.isAttacked(sq as any, 'w')}`);
        });
    });

    test('whale-check.json: test whale check validation', () => {
        const game = new CoralClash();
        applyFixture(game, whaleCheck);

        const allMoves = game.moves({ verbose: true, piece: 'h' });

        // Black whale at e3,e2 cannot move to e4,e3 because white whale at b4,c4
        // can slide to d4,e4 which would put black in check
        const moveToE4 = allMoves.filter(
            (m: any) => m.from === 'e2' && m.to === 'e4' && m.whaleSecondSquare === 'e3',
        );

        expect(moveToE4.length).toBe(0);

        // Verify that attempting the move fails
        const game2 = new CoralClash();
        applyFixture(game2, whaleCheck);

        let result = null;
        try {
            result = game2.move({ from: 'e2', to: 'e4', whaleSecondSquare: 'e3' });
        } catch (_error) {
            result = null; // Expected - illegal move
        }

        expect(result).toBeNull();
    });

    test('whale-check-2.json: black whale cannot move into check from white whale', () => {
        const game = new CoralClash();
        applyFixture(game, whaleCheck2);

        console.log('\n=== whale-check-2.json Initial Board State ===');
        console.log('White whale:', game.whalePositions().w);
        console.log('Black whale:', game.whalePositions().b);
        console.log('Turn:', game.turn());

        // Get all black whale moves
        const blackWhaleMoves = game.moves({ verbose: true, piece: 'h' });
        console.log('\nTotal black whale moves:', blackWhaleMoves.length);

        // Check for the invalid move e7,e6 -> e5,e4
        const invalidMoves = blackWhaleMoves.filter(
            (m: any) =>
                (m.from === 'e7' || m.from === 'e6') &&
                ((m.to === 'e5' && m.whaleSecondSquare === 'e4') ||
                    (m.to === 'e4' && m.whaleSecondSquare === 'e5')),
        );

        console.log('\nMoves to e5,e4:', invalidMoves.length);
        if (invalidMoves.length > 0) {
            console.log('Found moves:', invalidMoves);
        }

        // The move should NOT be present because it would put black whale in check
        expect(invalidMoves.length).toBe(0);

        // Let's also verify: if we try to make this move manually, it should either:
        // 1. Return null/throw (move is illegal)
        // 2. Return a different move (the illegal one was rejected and another was chosen)
        let result = null;
        try {
            result = game.move({
                from: 'e7',
                to: 'e5',
                whaleSecondSquare: 'e4',
            });
        } catch (_error) {
            // Expected - move is illegal
            result = null;
        }

        // The specific move we requested should not be made
        // Either result is null, or whaleSecondSquare is not 'e4'
        expect(result === null || result.whaleSecondSquare !== 'e4').toBe(true);

        // Verify white whale could attack e5 or e4 if black whale moves there
        // This requires checking if white whale can reach those squares
        console.log('\n=== Checking if white whale can attack e5,e4 ===');

        // Temporarily place black whale at e5,e4 and check
        const testGame = new CoralClash();
        applyFixture(testGame, whaleCheck2);

        // Force the move for testing purposes (using internal state)
        // We'll check manually if white can attack these squares
        const whiteMoves = testGame.moves({ verbose: true, color: 'w', piece: 'h' });
        console.log('White whale moves available:', whiteMoves.length);

        // Check if white can reach positions that would attack e5 or e4
        const threateningMoves = whiteMoves.filter((m: any) => {
            const targetSquares = [m.to, m.whaleSecondSquare];
            // Check if white whale position would attack e5 or e4
            return (
                targetSquares.includes('d5') ||
                targetSquares.includes('d4') ||
                targetSquares.includes('e5') ||
                targetSquares.includes('e4')
            );
        });

        console.log('White moves that could threaten e5,e4:', threateningMoves.length);
        if (threateningMoves.length > 0) {
            console.log('Sample threatening moves:', threateningMoves.slice(0, 5));
        }
    });

    test('whale-check-4.json: white whale cannot move into check from black whale', () => {
        const game = new CoralClash();
        applyFixture(game, whaleCheck4);

        console.log('\n=== whale-check-4.json: White whale at d2,e2 trying to move to d3,e3 ===');
        console.log('White whale position:', game.whalePositions().w);
        console.log('Black whale position:', game.whalePositions().b);

        // Get all white whale moves
        const whiteWhaleMoves = game.moves({ verbose: true, piece: 'h' });
        console.log('Total white whale moves:', whiteWhaleMoves.length);

        // Check if the invalid move (d3,e3) is present
        const invalidMoves = whiteWhaleMoves.filter(
            (m: any) =>
                (m.to === 'd3' && m.whaleSecondSquare === 'e3') ||
                (m.to === 'e3' && m.whaleSecondSquare === 'd3'),
        );

        console.log('Moves to d3,e3:', invalidMoves.length);
        if (invalidMoves.length > 0) {
            console.log('Invalid moves found:', invalidMoves);
        }

        // The move should NOT be present because it would put white whale in check
        expect(invalidMoves.length).toBe(0);

        // Also verify: if we try to make this move manually, it should be rejected
        let result = null;
        try {
            result = game.move({
                from: 'd2',
                to: 'd3',
                whaleSecondSquare: 'e3',
            });
        } catch (_error) {
            result = null;
        }

        // The specific move we requested should not be made
        // Either result is null, or whaleSecondSquare is not 'e3'
        expect(result === null || result.whaleSecondSquare !== 'e3').toBe(true);
    });

    test('whale-check-5.json: white whale cannot rotate to c3,d3 (black whale can attack)', () => {
        const game = new CoralClash();
        applyFixture(game, whaleCheck5);

        // Verify initial positions
        expect(game.whalePositions().w).toEqual(['d3', 'd2']);
        expect(game.whalePositions().b).toEqual(['e6', 'e5']);
        expect(game.turn()).toBe('w');

        // Get all legal white whale moves
        const whiteWhaleMoves = game.moves({ verbose: true, piece: 'h' });

        // Check if the move to c3,d3 is present
        const movesToC3D3 = whiteWhaleMoves.filter(
            (m: any) =>
                (m.to === 'c3' && m.whaleSecondSquare === 'd3') ||
                (m.to === 'd3' && m.whaleSecondSquare === 'c3'),
        );

        // The move should NOT be present because black whale at e6,e5 can attack c3
        // via diagonal parallel slide: e6,e5 -> c4,c3 (offset 15, 2 steps)
        expect(movesToC3D3.length).toBe(0);

        // Verify attempting the move directly also fails
        let result = null;
        try {
            result = game.move({
                from: 'd2',
                to: 'c3',
                whaleSecondSquare: 'd3',
            });
        } catch (_error) {
            result = null;
        }

        expect(result).toBeNull();
    });

    test('whale-check-5.json: verify black whale can attack c3 (explaining why white cannot move there)', () => {
        const game = new CoralClash();
        applyFixture(game, whaleCheck5);

        // Verify black whale position
        expect(game.whalePositions().b).toEqual(['e6', 'e5']);

        // The key: black whale can ATTACK c3 via diagonal parallel slide
        // Path: e6,e5 -> d5,d4 -> c4,c3 (2 steps diagonally)
        // This is why white whale cannot move to c3,d3 - it would be under attack

        // Note: Black whale might not be able to LEGALLY MOVE to c4,c3 in the current
        // position (due to obstacles or leaving itself in check), but it CAN ATTACK c3.
        // The _whaleAttacked function correctly identifies this attack path.

        // We can verify this by checking if c3 is attacked by black (which uses _whaleAttacked)
        // However, isAttacked checks from the current position, not after a hypothetical move
        // So we verify the concept by ensuring white can't move to c3,d3

        const whiteMoves = game.moves({ verbose: true, piece: 'h' });
        const movesToC3D3 = whiteMoves.filter(
            (m: any) =>
                (m.to === 'c3' && m.whaleSecondSquare === 'd3') ||
                (m.to === 'd3' && m.whaleSecondSquare === 'c3'),
        );

        // This verifies that the attack path is being considered
        expect(movesToC3D3.length).toBe(0);
    });
});
