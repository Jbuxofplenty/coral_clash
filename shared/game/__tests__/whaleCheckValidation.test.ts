/**
 * Tests for whale check validation bug
 *
 * This test suite covers a bug where a whale can move into a position
 * that would put it in check from the opponent's whale.
 *
 * The issue: When a whale moves, it should not be able to move to a position
 * where it would be in check from the opponent's whale.
 */

import whaleCheck10 from '../__fixtures__/whale-check-10.json';
import whaleCheck11 from '../__fixtures__/whale-check-11.json';
import whaleCheck12 from '../__fixtures__/whale-check-12.json';
import whaleCheck13 from '../__fixtures__/whale-check-13.json';
import whaleCheck2 from '../__fixtures__/whale-check-2.json';
import whaleCheck4 from '../__fixtures__/whale-check-4.json';
import whaleCheck5 from '../__fixtures__/whale-check-5.json';
import whaleCheck6 from '../__fixtures__/whale-check-6.json';
import whaleCheck7 from '../__fixtures__/whale-check-7.json';
import whaleCheck8 from '../__fixtures__/whale-check-8.json';
import whaleCheck9 from '../__fixtures__/whale-check-9.json';
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

        // Check for moves that end at e3,e4 (regardless of which square is 'to' vs 'whaleSecondSquare')
        const movesToE3E4 = blackWhaleMoves.filter(
            (m: any) =>
                (m.from === 'e7' || m.from === 'e6') &&
                ((m.to === 'e3' && m.whaleSecondSquare === 'e4') ||
                    (m.to === 'e4' && m.whaleSecondSquare === 'e3')),
        );

        console.log('\nMoves to e3,e4 position:', movesToE3E4.length);
        if (movesToE3E4.length > 0) {
            console.log('Found moves:');
            movesToE3E4.forEach((m: any) => {
                console.log(
                    `  from: ${m.from}, to: ${m.to}, whaleSecondSquare: ${m.whaleSecondSquare}`,
                );
            });
        }

        // Check if e3 or e4 is protected by black pieces
        console.log('\n=== Protection check for e3,e4 ===');
        console.log('Can black attack e3?', game.isAttacked('e3', 'b'));
        console.log('Can black attack e4?', game.isAttacked('e4', 'b'));
        console.log('Can white attack e3?', game.isAttacked('e3', 'w'));
        console.log('Can white attack e4?', game.isAttacked('e4', 'w'));

        // With protection rule: if either e3 or e4 is protected by black pieces,
        // then black CAN move there (white whale can't capture)
        expect(movesToE3E4.length).toBeGreaterThan(0); // Should be valid with protection

        // Verify the move can be made successfully
        // Use the correct format from the generated moves (to: e4, whaleSecondSquare: e3)
        const result = game.move({
            from: 'e7',
            to: 'e4',
            whaleSecondSquare: 'e3',
        });

        expect(result).not.toBeNull();
        // Note: whale position is normalized and could be in either order
        const whalePositions = game.whalePositions();
        const whalePos = whalePositions.b?.sort() || [];
        expect(whalePos).toEqual(['e3', 'e4']);

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

    test('whale-check-2.json: verify white whale moves are also validated', () => {
        const game = new CoralClash();
        applyFixture(game, whaleCheck2);

        console.log('\n=== whale-check-2.json: White Whale Move Validation ===');
        console.log('White whale:', game.whalePositions().w); // b4, c4
        console.log('Black whale:', game.whalePositions().b); // e7, e6
        console.log('Turn:', game.turn()); // b (black's turn)

        // Get white whale moves (even though it's black's turn)
        const whiteWhaleMoves = game.moves({ verbose: true, color: 'w', piece: 'h' });
        console.log('\nWhite whale has', whiteWhaleMoves.length, 'moves');

        // Check if white can move to e4,d4 or e4,f4
        const moveToE4D4 = whiteWhaleMoves.filter(
            (m: any) =>
                (m.to === 'e4' && m.whaleSecondSquare === 'd4') ||
                (m.to === 'd4' && m.whaleSecondSquare === 'e4'),
        );
        const moveToE4F4 = whiteWhaleMoves.filter(
            (m: any) =>
                (m.to === 'e4' && m.whaleSecondSquare === 'f4') ||
                (m.to === 'f4' && m.whaleSecondSquare === 'e4'),
        );

        console.log('\nMoves to e4,d4:', moveToE4D4.length);
        console.log('Moves to e4,f4:', moveToE4F4.length);

        // Check if these squares are protected by white pieces
        console.log('\n=== Protection Analysis ===');

        // Debug: what white pieces can attack each square?
        const whiteAttackersE4 = game
            .moves({ verbose: true, color: 'w' })
            .filter((m: any) => m.to === 'e4' || m.captured?.square === 'e4');
        const whiteAttackersD4 = game
            .moves({ verbose: true, color: 'w' })
            .filter((m: any) => m.to === 'd4' || m.captured?.square === 'd4');
        const whiteAttackersF4 = game
            .moves({ verbose: true, color: 'w' })
            .filter((m: any) => m.to === 'f4' || m.captured?.square === 'f4');

        console.log(
            'White pieces that can attack e4:',
            whiteAttackersE4.map((m: any) => `${m.piece} from ${m.from}`),
        );
        console.log(
            'White pieces that can attack d4:',
            whiteAttackersD4.map((m: any) => `${m.piece} from ${m.from}`),
        );
        console.log(
            'White pieces that can attack f4:',
            whiteAttackersF4.map((m: any) => `${m.piece} from ${m.from}`),
        );

        console.log('\nCan white attack e4?', game.isAttacked('e4', 'w'));
        console.log('Can white attack d4?', game.isAttacked('d4', 'w'));
        console.log('Can white attack f4?', game.isAttacked('f4', 'w'));

        // Check if black whale can attack these positions
        console.log('\nCan black attack e4?', game.isAttacked('e4', 'b'));
        console.log('Can black attack d4?', game.isAttacked('d4', 'b'));
        console.log('Can black attack f4?', game.isAttacked('f4', 'b'));

        // Check what's on the board at f8, f7, f6, f5, f4
        console.log('\n=== Board squares f8-f4 ===');
        console.log('f8:', game.get('f8'));
        console.log('f7:', game.get('f7'));
        console.log('f6:', game.get('f6'));
        console.log('f5:', game.get('f5'));
        console.log('f4:', game.get('f4'));

        // Expected behavior with protection rule:
        // - e4,d4: BLOCKED because black whale can attack e4, and BOTH e4 and d4 are unprotected
        // - e4,f4: ALLOWED because f4 is protected by white turtle at f8 (protection rule applies)
        console.log('\n=== Expected Behavior ===');
        console.log('e4,d4 should be blocked (both squares unprotected)');
        console.log('e4,f4 should be allowed (f4 protected by white turtle at f8)');

        expect(moveToE4D4.length).toBe(0); // Blocked - both unprotected
        expect(moveToE4F4.length).toBeGreaterThan(0); // Allowed - f4 protected
    });

    test('whale-check-4.json: white whale can move to protected squares (d3,e3, c3,d3, e3,f3)', () => {
        const game = new CoralClash();
        applyFixture(game, whaleCheck4);

        console.log('\n=== whale-check-4.json: White whale at d2,e2 with protection ===');
        console.log('White whale position:', game.whalePositions().w);
        console.log('Black whale position:', game.whalePositions().b);

        // Get all white whale moves
        const whiteWhaleMoves = game.moves({ verbose: true, piece: 'h' });
        console.log('Total white whale moves:', whiteWhaleMoves.length);

        // Check for moves to d3,e3
        const movesToD3E3 = whiteWhaleMoves.filter(
            (m: any) =>
                (m.to === 'd3' && m.whaleSecondSquare === 'e3') ||
                (m.to === 'e3' && m.whaleSecondSquare === 'd3'),
        );

        // Check for moves to c3,d3
        const movesToC3D3 = whiteWhaleMoves.filter(
            (m: any) =>
                (m.to === 'c3' && m.whaleSecondSquare === 'd3') ||
                (m.to === 'd3' && m.whaleSecondSquare === 'c3'),
        );

        // Check for moves to e3,f3
        const movesToE3F3 = whiteWhaleMoves.filter(
            (m: any) =>
                (m.to === 'e3' && m.whaleSecondSquare === 'f3') ||
                (m.to === 'f3' && m.whaleSecondSquare === 'e3'),
        );

        console.log('Moves to d3,e3:', movesToD3E3.length);
        console.log('Moves to c3,d3:', movesToC3D3.length);
        console.log('Moves to e3,f3:', movesToE3F3.length);

        // Check protection
        console.log('\n=== Protection Analysis ===');
        console.log('Can white attack c3?', game.isAttacked('c3', 'w'));
        console.log('Can white attack d3?', game.isAttacked('d3', 'w'));
        console.log('Can white attack e3?', game.isAttacked('e3', 'w'));
        console.log('Can white attack f3?', game.isAttacked('f3', 'w'));

        // With protection rule: white can move to these positions because
        // they are protected by white octopus and/or crab, even though black whale can attack
        expect(movesToD3E3.length).toBeGreaterThan(0); // Protected
        expect(movesToC3D3.length).toBeGreaterThan(0); // Protected
        expect(movesToE3F3.length).toBeGreaterThan(0); // Protected

        // Verify one of the moves can be made successfully
        const result = game.move({
            from: 'd2',
            to: 'd3',
            whaleSecondSquare: 'e3',
        });

        expect(result).not.toBeNull();
        const whalePos = game.whalePositions().w?.sort() || [];
        expect(whalePos).toEqual(['d3', 'e3']);
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
        // Skip FEN validation since this fixture has crabs on edge rows (from real game)
        applyFixture(game, whaleCheck7, { skipFenValidation: true });

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

    test('whale-check-8.json: black whale can move to e6,f6 and e7,f7 (protected by pieces)', () => {
        const game = new CoralClash();
        applyFixture(game, whaleCheck8, { skipFenValidation: true });

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

        // FINDINGS WITH PROTECTION RULE (enabled for this test):
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
        // ✅ f7,g7 IS NOW available:
        //    - White whale CAN physically reach g7
        //    - BUT with protection rule: f7 is protected by black turtle at f8 and/or crab at c7
        //    - Since at least one square is protected, black CAN move to f7,g7
        //
        // This implements "mutual check validation" with protection rule - a whale can only
        // be captured if BOTH of its squares are unprotected by friendly pieces.
        expect(e6f6Move).toBeDefined(); // Should be available
        expect(e7f7Move).toBeDefined(); // Should be available
        expect(f7g7Move).toBeDefined(); // Also available with protection rule
    });

    test('whale-check-9.json: white whale cannot move to d6,e6 (black whale can attack)', () => {
        const game = new CoralClash();
        applyFixture(game, whaleCheck9);

        console.log('\n=== whale-check-9.json: White whale at d3,e3 trying to move to d6,e6 ===');
        console.log('White whale position:', game.whalePositions().w);
        console.log('Black whale position:', game.whalePositions().b);
        console.log('Turn:', game.turn());

        // Check coral positions
        console.log('\nCoral at d6:', game.getCoral('d6'));
        console.log('Coral at e6:', game.getCoral('e6'));

        // Get all white whale moves
        const whiteWhaleMoves = game.moves({ verbose: true, piece: 'h' });
        console.log('\nTotal white whale moves:', whiteWhaleMoves.length);

        // Check if the invalid move (d6,e6) is present
        const invalidMoves = whiteWhaleMoves.filter(
            (m: any) =>
                (m.to === 'd6' && m.whaleSecondSquare === 'e6') ||
                (m.to === 'e6' && m.whaleSecondSquare === 'd6'),
        );

        console.log('Moves to d6,e6:', invalidMoves.length);
        if (invalidMoves.length > 0) {
            console.log('Found moves (should be 0):', invalidMoves.length);
        }

        // Check protection
        console.log('\n=== Protection check for d6,e6 ===');
        console.log('Can white attack d6?', game.isAttacked('d6', 'w'));
        console.log('Can white attack e6?', game.isAttacked('e6', 'w'));
        console.log('Can black attack d6?', game.isAttacked('d6', 'b'));
        console.log('Can black attack e6?', game.isAttacked('e6', 'b'));

        // The move should NOT be present because it would put white whale in check
        // Black whale at d8,e8 can parallel slide to d6,e6 (capturing white whale)
        // Even though there is black coral at d6 and e6, the whale can capture while sliding
        // If BOTH d6 and e6 are unprotected by white, the move should be blocked
        expect(invalidMoves.length).toBe(0);

        // Also verify: if we try to make this move manually, it should be rejected
        let result = null;
        try {
            result = game.move({
                from: 'd3',
                to: 'd6',
                whaleSecondSquare: 'e6',
            });
        } catch (_error) {
            result = null;
        }

        // The specific move we requested should not be made
        expect(result).toBeNull();
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

    test('whale-check-10.json: analyze why black whale is in check (adjacent whales)', () => {
        const game = new CoralClash();
        applyFixture(game, whaleCheck10);

        console.log('\n=== whale-check-10.json: Adjacent Whales Analysis ===');
        console.log('White whale position:', game.whalePositions().w);
        console.log('Black whale position:', game.whalePositions().b);
        console.log('Turn:', game.turn());
        console.log('Black in check:', game.inCheck());

        // The whales are directly adjacent:
        // White whale: e4, f4
        // Black whale: e5, f5
        // e5 is directly north of e4, f5 is directly north of f4

        // Check coral positions at whale squares
        console.log('\n=== Coral at Whale Positions ===');
        console.log('Coral at e4 (white whale):', game.getCoral('e4'));
        console.log('Coral at f4 (white whale):', game.getCoral('f4'));
        console.log('Coral at e5 (black whale):', game.getCoral('e5'));
        console.log('Coral at f5 (black whale):', game.getCoral('f5'));

        // Verify white whale can attack black whale's squares
        console.log('\n=== Can White Whale Attack Black Whale? ===');
        console.log('Can white attack e5?', game.isAttacked('e5', 'w'));
        console.log('Can white attack f5?', game.isAttacked('f5', 'w'));

        // Check if white whale can legally attack (considering mutual check)
        console.log('\n=== Legal Attack Analysis ===');
        const whiteWhaleMoves = game.moves({ verbose: true, color: 'w', piece: 'h' });
        console.log('White whale has', whiteWhaleMoves.length, 'legal moves');

        // Can white whale attack e5 or f5 without putting itself in check?
        const attacksOnBlackWhale = whiteWhaleMoves.filter((m: any) => {
            return (
                m.to === 'e5' ||
                m.to === 'f5' ||
                m.whaleSecondSquare === 'e5' ||
                m.whaleSecondSquare === 'f5'
            );
        });

        console.log(
            'White moves that would attack black whale squares:',
            attacksOnBlackWhale.length,
        );
        if (attacksOnBlackWhale.length > 0) {
            console.log('Sample attacks:', attacksOnBlackWhale.slice(0, 3));
        }

        // Get all available moves for black whale
        console.log('\n=== Black Whale Available Moves ===');
        const blackWhaleMoves = game.moves({ verbose: true, piece: 'h' });
        console.log('Black whale has', blackWhaleMoves.length, 'legal moves');

        if (blackWhaleMoves.length > 0) {
            console.log('\nSample black whale moves:');
            blackWhaleMoves.slice(0, 5).forEach((m: any) => {
                console.log(`  - ${m.from} -> ${m.to} (other half: ${m.whaleSecondSquare})`);
            });
        } else {
            console.log('⚠️  BLACK WHALE HAS NO LEGAL MOVES!');
        }

        // Check if black can escape check
        console.log('\n=== Can Black Escape Check? ===');

        // Get all legal moves for black (any piece)
        const allBlackMoves = game.moves({ verbose: true });
        console.log('Total legal moves for black:', allBlackMoves.length);

        const movesGroupedByPiece: any = {};
        allBlackMoves.forEach((m: any) => {
            if (!movesGroupedByPiece[m.piece]) {
                movesGroupedByPiece[m.piece] = [];
            }
            movesGroupedByPiece[m.piece].push(m);
        });

        console.log('\nMoves by piece type:');
        Object.keys(movesGroupedByPiece).forEach((pieceType) => {
            console.log(`  ${pieceType}: ${movesGroupedByPiece[pieceType].length} moves`);
        });

        // Check if this is checkmate or stalemate
        console.log('\n=== Game State ===');
        console.log('Is checkmate:', game.isCheckmate());
        console.log('Is stalemate:', game.isStalemate());
        console.log('Is game over:', game.isGameOver());

        // VALIDATION: Is this check state valid?
        console.log('\n=== CHECK VALIDITY ANALYSIS ===');

        // The check is valid if:
        // 1. White whale can physically reach e5 or f5 (yes - they're adjacent)
        // 2. White whale can LEGALLY attack those squares (without putting white in check)

        // If white CAN legally attack, then black IS in valid check
        // If white CANNOT legally attack (would put white in check), then this is INVALID

        const canWhiteLegallyAttackE5 = game.isAttacked('e5', 'w');
        const canWhiteLegallyAttackF5 = game.isAttacked('f5', 'w');

        console.log('White can legally attack e5:', canWhiteLegallyAttackE5);
        console.log('White can legally attack f5:', canWhiteLegallyAttackF5);

        if (canWhiteLegallyAttackE5 || canWhiteLegallyAttackF5) {
            console.log('\n✅ CHECK IS VALID: White whale can legally attack black whale');
            console.log('   Black must move to escape check or block the attack');
        } else {
            console.log('\n❌ CHECK IS INVALID: White whale cannot legally attack black whale');
            console.log('   This would be a mutual check situation (invalid game state)');
        }

        // Assertions
        expect(game.inCheck()).toBe(true);
        expect(game.whalePositions().w).toEqual(['e4', 'f4']);
        expect(game.whalePositions().b).toEqual(['e5', 'f5']);

        // The check should be valid - white can attack black's position
        expect(canWhiteLegallyAttackE5 || canWhiteLegallyAttackF5).toBe(true);

        // Black should have some legal moves to escape (otherwise it's checkmate)
        if (game.isCheckmate()) {
            expect(allBlackMoves.length).toBe(0);
            console.log('\n🏁 This is CHECKMATE - Black has no legal moves');
        } else {
            expect(allBlackMoves.length).toBeGreaterThan(0);
            console.log('\n↔️  Black can escape - this is just check, not checkmate');
        }
    });

    test('whale-check-11.json: white whale in check with one square protected', () => {
        const game = new CoralClash();
        applyFixture(game, whaleCheck11);

        console.log('\n=== whale-check-11.json: Partial Whale Protection Analysis ===');
        console.log('White whale position:', game.whalePositions().w);
        console.log('Black whale position:', game.whalePositions().b);
        console.log('Turn:', game.turn());
        console.log('White in check:', game.inCheck());

        // White whale: c4, c3 (vertical)
        // Black whale: d6, d5 (vertical)
        // Black threatens c4, but c3 is protected by white crab

        // Check coral positions at whale squares
        console.log('\n=== Coral at Whale Positions ===');
        console.log('Coral at c4 (white whale):', game.getCoral('c4'));
        console.log('Coral at c3 (white whale):', game.getCoral('c3'));
        console.log('Coral at d6 (black whale):', game.getCoral('d6'));
        console.log('Coral at d5 (black whale):', game.getCoral('d5'));

        // Verify black whale can attack white whale's squares
        console.log('\n=== Can Black Whale Attack White Whale? ===');
        console.log('Can black attack c4?', game.isAttacked('c4', 'b'));
        console.log('Can black attack c3?', game.isAttacked('c3', 'b'));

        // Check if white crab protects c3
        console.log('\n=== Protection Analysis ===');
        const whitePieces = game
            .board()
            .flat()
            .filter((p) => p?.color === 'w');
        console.log('White pieces on board:', whitePieces.length);

        // Find the crab that might be protecting c3
        const protectingCrab = whitePieces.find((p) => p?.type === 'c');
        if (protectingCrab) {
            console.log('White crab found at:', protectingCrab.square);
        }

        // Check if black whale can legally attack (considering mutual check)
        console.log('\n=== Legal Attack Analysis ===');
        const blackWhaleMoves = game.moves({ verbose: true, color: 'b', piece: 'h' });
        console.log('Black whale has', blackWhaleMoves.length, 'legal moves');

        // Can black whale attack c4 or c3 without putting itself in check?
        const attacksOnWhiteWhale = blackWhaleMoves.filter((m: any) => {
            return (
                m.to === 'c4' ||
                m.to === 'c3' ||
                m.whaleSecondSquare === 'c4' ||
                m.whaleSecondSquare === 'c3'
            );
        });

        console.log(
            'Black moves that would attack white whale squares:',
            attacksOnWhiteWhale.length,
        );

        // Get all available moves for white whale
        console.log('\n=== White Whale Available Moves ===');
        const whiteWhaleMoves = game.moves({ verbose: true, piece: 'h' });
        console.log('White whale has', whiteWhaleMoves.length, 'legal moves');

        if (whiteWhaleMoves.length > 0) {
            console.log('\nSample white whale moves:');
            whiteWhaleMoves.slice(0, 5).forEach((m: any) => {
                console.log(`  - ${m.from} -> ${m.to} (other half: ${m.whaleSecondSquare})`);
            });
        } else {
            console.log('⚠️  WHITE WHALE HAS NO LEGAL MOVES!');
        }

        // Check if white can escape check
        console.log('\n=== Can White Escape Check? ===');

        // Get all legal moves for white (any piece)
        const allWhiteMoves = game.moves({ verbose: true });
        console.log('Total legal moves for white:', allWhiteMoves.length);

        const movesGroupedByPiece: any = {};
        allWhiteMoves.forEach((m: any) => {
            if (!movesGroupedByPiece[m.piece]) {
                movesGroupedByPiece[m.piece] = [];
            }
            movesGroupedByPiece[m.piece].push(m);
        });

        console.log('\nMoves by piece type:');
        Object.keys(movesGroupedByPiece).forEach((pieceType) => {
            console.log(`  ${pieceType}: ${movesGroupedByPiece[pieceType].length} moves`);
        });

        // Check if this is checkmate or stalemate
        console.log('\n=== Game State ===');
        console.log('Is checkmate:', game.isCheckmate());
        console.log('Is stalemate:', game.isStalemate());
        console.log('Is game over:', game.isGameOver());

        // VALIDATION: Is this check state valid?
        console.log('\n=== CHECK VALIDITY ANALYSIS ===');

        const canBlackLegallyAttackC4 = game.isAttacked('c4', 'b');
        const canBlackLegallyAttackC3 = game.isAttacked('c3', 'b');

        console.log('Black can legally attack c4:', canBlackLegallyAttackC4);
        console.log('Black can legally attack c3:', canBlackLegallyAttackC3);

        if (canBlackLegallyAttackC4 || canBlackLegallyAttackC3) {
            console.log('\n✅ CHECK IS VALID: Black whale can legally attack white whale');
            console.log('   White must move to escape check or block the attack');
            if (canBlackLegallyAttackC4 && !canBlackLegallyAttackC3) {
                console.log('   Note: c3 is protected, but c4 is still under attack');
            }
        } else {
            console.log('\n❌ CHECK IS INVALID: Black whale cannot legally attack white whale');
            console.log('   This would be a mutual check situation (invalid game state)');
        }

        // Assertions
        expect(game.inCheck()).toBe(true);
        expect(game.whalePositions().w).toEqual(['c4', 'c3']);
        expect(game.whalePositions().b).toEqual(['d6', 'd5']);

        // The check should be valid - black can attack white's position
        expect(canBlackLegallyAttackC4 || canBlackLegallyAttackC3).toBe(true);

        // White should have some legal moves to escape (otherwise it's checkmate)
        if (game.isCheckmate()) {
            expect(allWhiteMoves.length).toBe(0);
            console.log('\n🏁 This is CHECKMATE - White has no legal moves');
        } else {
            expect(allWhiteMoves.length).toBeGreaterThan(0);
            console.log('\n↔️  White can escape - this is just check, not checkmate');
        }
    });

    test('whale-check-12.json: white whale should be able to capture at d6,e6', () => {
        const game = new CoralClash();
        applyFixture(game, whaleCheck12);

        console.log('\n=== whale-check-12.json: White Whale Capture Analysis ===');
        console.log('White whale position:', game.whalePositions().w);
        console.log('Black whale position:', game.whalePositions().b);
        console.log('Turn:', game.turn());

        // Check what pieces are at d6 and e6
        console.log('\n=== Target Squares ===');
        const d6Piece = game.get('d6');
        const e6Piece = game.get('e6');
        console.log('Piece at d6:', d6Piece ? `${d6Piece.color} ${d6Piece.type}` : 'empty');
        console.log('Piece at e6:', e6Piece ? `${e6Piece.color} ${e6Piece.type}` : 'empty');
        console.log('Coral at d6:', game.getCoral('d6'));
        console.log('Coral at e6:', game.getCoral('e6'));

        // The fixture shows:
        // - White whale at d3, e3
        // - Black octopus at d6 (role: hunter)
        // - Black crab at e6 (role: gatherer)
        // - Black coral at both d6 and e6
        // - Turn is black (b)

        // Wait, if turn is black, we need to switch to white's turn to test white's moves
        // But actually, let's check if this is about black's turn and what moves they have

        if (game.turn() === 'b') {
            console.log('\n=== Current Turn: Black ===');
            console.log(
                'Black whale can move, but we want to test if white whale COULD capture d6,e6',
            );

            // Get black whale moves first
            const blackWhaleMoves = game.moves({ verbose: true, piece: 'h' });
            console.log('Black whale has', blackWhaleMoves.length, 'legal moves');

            // Now let's check what white could do if it was their turn
            // We'll need to make a black move first, then check white's options
            console.log('\n=== Testing White Whale Capture Capability ===');

            // Get white whale moves (even though it's black's turn, we can query them)
            const whiteWhaleMoves = game.moves({ verbose: true, color: 'w', piece: 'h' });
            console.log('White whale would have', whiteWhaleMoves.length, 'legal moves');

            // Check if white can move to d6,e6
            const captureMoves = whiteWhaleMoves.filter(
                (m: any) =>
                    (m.to === 'd6' && m.whaleSecondSquare === 'e6') ||
                    (m.to === 'e6' && m.whaleSecondSquare === 'd6'),
            );

            console.log('\nMoves to d6,e6:', captureMoves.length);
            if (captureMoves.length > 0) {
                console.log('✅ Found capture moves:', captureMoves);
                captureMoves.forEach((m: any) => {
                    console.log(`  - ${m.from} -> ${m.to} (other half: ${m.whaleSecondSquare})`);
                    console.log(`    Captures: ${m.captured || 'none'}`);
                });
            } else {
                console.log('❌ No capture moves to d6,e6 found');
            }

            // Check if white whale can physically attack those squares
            console.log('\n=== Attack Analysis ===');
            console.log('Can white attack d6?', game.isAttacked('d6', 'w'));
            console.log('Can white attack e6?', game.isAttacked('e6', 'w'));

            // Check if black whale can attack d6,e6 (which would prevent white from moving there)
            console.log('\n=== Counter-Attack Analysis ===');
            console.log('Can black attack d6?', game.isAttacked('d6', 'b'));
            console.log('Can black attack e6?', game.isAttacked('e6', 'b'));

            // The expected behavior: white whale SHOULD be able to move to d6,e6
            // capturing BOTH the octopus at d6 AND the crab at e6 simultaneously
            // Neither black whale nor any other black piece can attack these squares
            console.log('\n✓ White can capture both pieces at d6,e6 simultaneously!');
            expect(captureMoves.length).toBeGreaterThan(0);
        } else {
            // If it's white's turn, test directly
            console.log('\n=== Current Turn: White ===');

            const whiteWhaleMoves = game.moves({ verbose: true, piece: 'h' });
            console.log('White whale has', whiteWhaleMoves.length, 'legal moves');

            const captureMoves = whiteWhaleMoves.filter(
                (m: any) =>
                    (m.to === 'd6' && m.whaleSecondSquare === 'e6') ||
                    (m.to === 'e6' && m.whaleSecondSquare === 'd6'),
            );

            console.log('\nMoves to d6,e6:', captureMoves.length);
            if (captureMoves.length > 0) {
                console.log('✅ Found capture moves:', captureMoves);
            } else {
                console.log('❌ No capture moves to d6,e6 found');
            }

            // The expected behavior: white whale SHOULD be able to move to d6,e6
            expect(captureMoves.length).toBeGreaterThan(0);

            // Try to make the move
            const result = game.move({ from: 'd3', to: 'd6', whaleSecondSquare: 'e6' });
            expect(result).not.toBeNull();
            expect(game.whalePositions().w).toEqual(['d6', 'e6']);
        }
    });

    test('whale-check-13.json: black whale can move to protected positions e7,e8 and e7,d7', () => {
        const game = new CoralClash();
        applyFixture(game, whaleCheck13);

        console.log('\n=== whale-check-13.json: Protected Whale Moves ===');
        console.log('White whale position:', game.whalePositions().w);
        console.log('Black whale position:', game.whalePositions().b);
        console.log('Turn:', game.turn());

        // Initial state:
        // - White whale: d6, e6
        // - Black whale: d8, d7
        // - Turn: white (w)
        expect(game.whalePositions().w).toEqual(['d6', 'e6']);
        expect(game.whalePositions().b).toEqual(['d8', 'd7']);
        expect(game.turn()).toBe('w');

        // Make a white move to switch to black's turn
        // White should have some legal moves
        const whiteMoves = game.moves({ verbose: true });
        console.log('\nWhite has', whiteMoves.length, 'legal moves');
        expect(whiteMoves.length).toBeGreaterThan(0);

        // Make a simple white move (any non-whale move to pass turn)
        const simpleWhiteMove = whiteMoves.find((m: any) => m.piece !== 'h');
        if (simpleWhiteMove) {
            game.move(simpleWhiteMove);
            console.log('Made white move:', simpleWhiteMove);
        } else {
            // If no non-whale moves, make a whale move
            game.move(whiteMoves[0]);
            console.log('Made white whale move:', whiteMoves[0]);
        }

        console.log("\nNow it is black's turn");
        console.log('Black whale position:', game.whalePositions().b);
        expect(game.turn()).toBe('b');

        // Get all black whale moves
        const blackWhaleMoves = game.moves({ verbose: true, piece: 'h' });
        console.log('\nBlack whale has', blackWhaleMoves.length, 'legal moves');

        // Check for move to e7,e8 (protected by turtles at f8 or c8)
        const moveToE7E8 = blackWhaleMoves.filter(
            (m: any) =>
                (m.to === 'e7' && m.whaleSecondSquare === 'e8') ||
                (m.to === 'e8' && m.whaleSecondSquare === 'e7'),
        );

        // Check for move to e7,d7 (protected by black crab at c7)
        const moveToE7D7 = blackWhaleMoves.filter(
            (m: any) =>
                (m.to === 'e7' && m.whaleSecondSquare === 'd7') ||
                (m.to === 'd7' && m.whaleSecondSquare === 'e7'),
        );

        console.log('\nMoves to e7,e8:', moveToE7E8.length);
        if (moveToE7E8.length > 0) {
            console.log('✅ Found moves to e7,e8:', moveToE7E8);
        } else {
            console.log('❌ No moves to e7,e8 found');
        }

        console.log('Moves to e7,d7:', moveToE7D7.length);
        if (moveToE7D7.length > 0) {
            console.log('✅ Found moves to e7,d7:', moveToE7D7);
        } else {
            console.log('❌ No moves to e7,d7 found');
        }

        // Check if white whale can physically attack these squares
        console.log('\n=== White Whale Attack Analysis ===');
        console.log('Can white attack e7?', game.isAttacked('e7', 'w'));
        console.log('Can white attack e8?', game.isAttacked('e8', 'w'));
        console.log('Can white attack d7?', game.isAttacked('d7', 'w'));

        // Check what pieces are protecting these squares
        console.log('\n=== Black Defenders ===');
        console.log('Piece at f8:', game.get('f8')); // Should be black turtle
        console.log('Piece at c8:', game.get('c8')); // Should be black turtle
        console.log('Piece at c7:', game.get('c7')); // Should be black crab

        // EXPECTED BEHAVIOR:
        // 1. e7,e8 should be LEGAL:
        //    - e8 is protected by black turtle at f8 (gatherer)
        //    - e8 is protected by black turtle at c8 (gatherer)
        //    - White whale can attack e7, but if black whale is at e7,e8
        //      the attack on e7 would require white to also attack e8
        //    - Since e8 is defended, white cannot legally attack e7,e8 position
        //
        // 2. e7,d7 should be LEGAL:
        //    - d7 is protected by black crab at c7 (hunter)
        //    - White whale can only attack e7, not both e7 and d7 simultaneously
        //    - The move is legal because even though e7 might be attacked,
        //      the whale position as a whole (e7,d7) is defendable

        // BUG: Currently these moves are NOT available because the check validation
        // doesn't properly account for piece protection on whale squares

        // These assertions will FAIL with the current bug, confirming the issue
        expect(moveToE7E8.length).toBeGreaterThan(0); // SHOULD PASS but currently FAILS
        expect(moveToE7D7.length).toBeGreaterThan(0); // SHOULD PASS but currently FAILS

        console.log(
            '\n✅ Test confirms bug: Black whale SHOULD be able to move to protected positions',
        );
    });
});
