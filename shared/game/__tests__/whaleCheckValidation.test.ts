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
import whaleCheck6 from '../__fixtures__/whale-check-6.json';
import whaleCheck7 from '../__fixtures__/whale-check-7.json';
import whaleCheck8 from '../__fixtures__/whale-check-8.json';
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

        console.log('\n=== whale-check.json: Black whale at e3,e2 ===');
        console.log('White whale at:', game.whalePositions().w);
        console.log('Black whale at:', game.whalePositions().b);

        const allMoves = game.moves({ verbose: true, piece: 'h' });
        console.log('Total black whale moves:', allMoves.length);

        // Black whale at e3,e2 cannot move to e4,e3 because white whale at b4,c4
        // can slide to d4,e4 which would put black in check
        const moveToE4 = allMoves.filter(
            (m: any) => m.from === 'e2' && m.to === 'e4' && m.whaleSecondSquare === 'e3',
        );

        console.log('Moves to e4,e3:', moveToE4.length);
        if (moveToE4.length > 0) {
            console.log('Found moves:', moveToE4);
        }

        // Check if white can attack e4
        console.log('\nCan white whale legally attack e4?', game.isAttacked('e4', 'w'));
        console.log('Can white whale legally attack e3?', game.isAttacked('e3', 'w'));

        // Black CANNOT move to e4,e3 because white CAN physically attack e4
        // White can slide from b4,c4 to d4,e4, attacking the e4 square
        expect(moveToE4.length).toBe(0);

        // TODO: Investigate g4,g5 move - should it be available?
        // const moveToG4 = allMoves.filter(
        //     (m: any) => m.from === 'e3' && m.to === 'g4' && m.whaleSecondSquare === 'g5',
        // );
        // expect(moveToG4.length).toBe(2);

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

    test('whale-check-5.json: white whale can rotate to c3,d3 (white crab at c2 defends c3)', () => {
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

        // The move should be present because white crab at c2 defends c3,
        // but this doesn't prevent the white whale from moving there
        expect(movesToC3D3.length).toBe(2);

        // Verify the move can be made successfully
        const result = game.move({
            from: 'd2',
            to: 'c3',
            whaleSecondSquare: 'd3',
        });

        expect(result).not.toBeNull();
        expect(game.whalePositions().w).toEqual(['c3', 'd3']);
    });

    test('whale-check-6.json: black whale can rotate to e6,e7 (coral blocks white parallel slide)', () => {
        const game = new CoralClash();
        applyFixture(game, whaleCheck6);

        // Verify initial state
        expect(game.turn()).toBe('b');
        expect(game.whalePositions().b).toEqual(['e7', 'f7']);
        expect(game.whalePositions().w).toEqual(['g4', 'h4']);
        expect(game.inCheck()).toBe(true); // Black is in check from white octopus at e6

        // White octopus at e6 is threatening black whale at f7
        expect(game.get('e6')).toMatchObject({ type: 'o', color: 'w' });

        // Black coral at g5 is critical - it blocks white whale parallel slide
        expect(game.getCoral('g5')).toBe('b');

        // Black whale should be able to rotate f7 -> e6 (capturing white octopus)
        // This would create position e6,e7
        const blackMoves = game.moves({ verbose: true, piece: 'h' });
        const rotationToE6 = blackMoves.filter(
            (m: any) => m.from === 'f7' && m.to === 'e6' && m.whaleSecondSquare === 'e7',
        );

        expect(rotationToE6.length).toBeGreaterThan(0);

        // Verify the move can be made
        const move = rotationToE6[0];
        expect(move).toMatchObject({
            from: 'f7',
            to: 'e6',
            piece: 'h',
            captured: 'o',
            whaleSecondSquare: 'e7',
        });

        // Make the move and verify it's legal
        const result = game.move({ from: 'f7', to: 'e6', whaleSecondSquare: 'e7' });
        expect(result).toBeTruthy();
        expect(game.whalePositions().b).toEqual(['e7', 'e6']);
        expect(game.get('e6')).toMatchObject({ type: 'h', color: 'b' });
    });

    test('whale-check-7.json: white whale can move to h7,h6 (black puffer blocks black whale attack)', () => {
        const game = new CoralClash();
        // Skip validation since this fixture has crabs on edge rows (from real game)
        applyFixture(game, whaleCheck7, { skipValidation: true });

        // Verify initial state
        expect(game.turn()).toBe('w');
        expect(game.whalePositions().w).toEqual(['f5', 'f4']);
        expect(game.whalePositions().b).toEqual(['d8', 'd7']);
        expect(game.inCheck()).toBe(true); // White is in check

        // Black puffer at h8 should block black whale from attacking h7,h6
        expect(game.get('h8')).toMatchObject({ type: 'f', color: 'b', role: 'gatherer' });

        // White whale should be able to move to h7,h6
        const whiteMoves = game.moves({ verbose: true, piece: 'h' });
        const moveToH7H6 = whiteMoves.filter(
            (m: any) =>
                (m.to === 'h7' && m.whaleSecondSquare === 'h6') ||
                (m.to === 'h6' && m.whaleSecondSquare === 'h7'),
        );

        // The move should be available because black whale cannot attack h7
        // Even though black whale at d7 could parallel slide to h7, it would need
        // to also move d8->h8, but h8 is occupied by black's own puffer
        expect(moveToH7H6.length).toBeGreaterThan(0);

        // Verify the move can be made
        const result = game.move({ from: 'f5', to: 'h7', whaleSecondSquare: 'h6' });
        expect(result).toBeTruthy();
        expect(game.whalePositions().w).toEqual(['h7', 'h6']);
    });

    test('whale-check-8.json: black whale can move to e6,f6 and e7,f7 (protected by pieces) - TODO: Requires legal-only validation mode', () => {
        const game = new CoralClash();
        applyFixture(game, whaleCheck8, { skipValidation: true });

        // Verify initial state
        expect(game.turn()).toBe('b');
        expect(game.whalePositions().b).toEqual(['d7', 'e7']);
        expect(game.whalePositions().w).toEqual(['h6', 'h5']);

        // Black turtle at f8 should protect the whale
        expect(game.get('f8')).toMatchObject({ type: 't', color: 'b', role: 'gatherer' });

        // Black crab at c7 should protect the whale
        expect(game.get('c7')).toMatchObject({ type: 'c', color: 'b', role: 'hunter' });

        console.log('\n=== ANALYZING BLACK WHALE MOVES ===');
        console.log('Black whale at:', game.whalePositions().b);
        console.log('White whale at:', game.whalePositions().w);
        console.log('Black turtle at f8 (role: gatherer)');
        console.log('Black crab at c7 (role: hunter)\n');

        // Get all legal moves for black whale
        const whaleMoves = game.moves({ verbose: true, piece: 'h' });
        console.log(`Whale moves available: ${whaleMoves.length}`);
        whaleMoves.forEach((m: any) => {
            console.log(`  - ${m.from} -> ${m.to} (other half: ${m.whaleSecondSquare})`);
        });

        // Check if e6,f6 move exists
        const e6f6Move = whaleMoves.find(
            (m: any) =>
                (m.to === 'e6' && m.whaleSecondSquare === 'f6') ||
                (m.to === 'f6' && m.whaleSecondSquare === 'e6'),
        );

        // Check if e7,f7 move exists
        const e7f7Move = whaleMoves.find(
            (m: any) =>
                (m.to === 'e7' && m.whaleSecondSquare === 'f7') ||
                (m.to === 'f7' && m.whaleSecondSquare === 'e7'),
        );

        // Check if f7,g7 move exists
        const f7g7Move = whaleMoves.find(
            (m: any) =>
                (m.to === 'f7' && m.whaleSecondSquare === 'g7') ||
                (m.to === 'g7' && m.whaleSecondSquare === 'f7'),
        );

        console.log('\nChecking white whale attacks:');
        console.log('Can white attack e6?', game.isAttacked('e6', 'w'));
        console.log('Can white attack f6?', game.isAttacked('f6', 'w'));
        console.log('Can white attack e7?', game.isAttacked('e7', 'w'));
        console.log('Can white attack f7?', game.isAttacked('f7', 'w'));
        console.log('Can white attack g7?', game.isAttacked('g7', 'w'));

        if (!e6f6Move) {
            console.log('\n❌ Move to e6,f6 is NOT available');
        } else {
            console.log('\n✅ Move to e6,f6 IS available');
        }

        if (!e7f7Move) {
            console.log('❌ Move to e7,f7 is NOT available');
        } else {
            console.log('✅ Move to e7,f7 IS available');
        }

        if (!f7g7Move) {
            console.log('❌ Move to f7,g7 is NOT available');
        } else {
            console.log('✅ Move to f7,g7 IS available');
        }

        // FINDINGS WITH LEGAL VALIDATION (enabled for this test):
        //
        // ✅ e6,f6 IS available:
        //    - White whale CAN physically reach e6 and f6
        //    - BUT if white attacks e6 or f6, it would leave white in check
        //    - Black's turtle at f8 protects these squares
        //    - Therefore, black CAN legally move to e6,f6
        //
        // ✅ e7,f7 IS available:
        //    - White whale CAN physically reach e7 and f7
        //    - BUT if white attacks these squares, it would leave white in check
        //    - Black's turtle at f8 and crab at c7 protect these squares
        //    - Therefore, black CAN legally move to e7,f7
        //
        // ❌ f7,g7 is NOT available:
        //    - White whale CAN physically reach g7
        //    - White CAN legally attack g7 (wouldn't leave white in check)
        //    - Therefore, black CANNOT move to f7,g7 (would be in check)
        //
        // This implements "mutual check validation" - a whale is only in check if
        // the opponent whale can LEGALLY (not just physically) attack that square.
        expect(e6f6Move).toBeDefined(); // Should be available with legal validation
        expect(e7f7Move).toBeDefined(); // Should be available with legal validation
        expect(f7g7Move).toBeUndefined(); // Still blocked (white can legally attack g7)
    });

    it('performance benchmark: measure optimization impact', () => {
        const game = new CoralClash();
        applyFixture(game, whaleCheck2);

        // Reset perf stats
        game.getPerfStats();

        // Generate moves multiple times to amplify performance differences
        const iterations = 100;
        const startTime = Date.now();
        let totalMoves = 0;

        for (let i = 0; i < iterations; i++) {
            const moves = game.moves({ verbose: true });
            totalMoves += moves.length;
        }

        const endTime = Date.now();
        const totalTime = endTime - startTime;

        const stats = game.getPerfStats();

        console.log('\n=== PERFORMANCE STATS (100 iterations) ===');
        console.log(`Total time: ${totalTime}ms`);
        console.log(`Average time per iteration: ${(totalTime / iterations).toFixed(2)}ms`);
        console.log(`Total moves generated: ${totalMoves}`);
        console.log(`canWhaleLegallyAttack calls: ${stats.canWhaleLegallyAttackCalls}`);
        console.log(`Cache hits: ${stats.cacheHits}`);
        console.log(`Cache misses: ${stats.cacheMisses}`);
        console.log(
            `Cache hit rate: ${stats.cacheHits > 0 ? ((stats.cacheHits / (stats.cacheHits + stats.cacheMisses)) * 100).toFixed(1) : 0}%`,
        );
        console.log(`Moves generated for validation: ${stats.movesGenerated}`);
        console.log(`Make/undo cycles: ${stats.makeUndoCycles}`);
        console.log('\n=== OPTIMIZATION SUMMARY ===');
        console.log('✓ Removed 3 algebraic() conversions per loop iteration');
        console.log('✓ Direct numeric comparison (move.to === targetSquare)');
        console.log('✓ Calculated opponent color once (eliminated duplicate swapColor call)');
        console.log('✓ Reduced string allocations in hot path');
        console.log('==========================================\n');

        expect(totalMoves).toBeGreaterThan(0);
    });
});
